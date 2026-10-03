import { z } from 'zod';
import { HeuristicPlanner, PlanOutput } from './heuristicPlanner.js';
import { DeterministicConstraintEngine } from '../engine/constraintEngine.js';
import { DispatchStore } from '../data/store.js';
import { ScheduleValidationResult, ProposedAssignment } from '../types/index.js';

// Zod Schema to strictly validate untrusted AI JSON output
export const ProposedAssignmentSchema = z.object({
  serviceRequestId: z.string(),
  technicianId: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().positive(),
  reasoning: z.string(),
  isLocked: z.boolean().optional(),
});

export const ScheduleProposalSchema = z.object({
  planSummary: z.string(),
  assignments: z.array(ProposedAssignmentSchema),
  unassignedRequests: z.array(
    z.object({
      serviceRequestId: z.string(),
      reason: z.string(),
      recommendedAction: z.string(),
    })
  ),
  risks: z.array(
    z.object({
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      description: z.string(),
      affectedTechnicianId: z.string().optional(),
      affectedRequestId: z.string().optional(),
    })
  ),
  tradeOffs: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
  replanningRationale: z.string().optional(),
});

export interface ProposalResponse {
  plan: PlanOutput;
  validation: ScheduleValidationResult;
  provider: 'HEURISTIC_MOCK' | 'GOOGLE_GEMINI';
}

export class PlanningService {
  /**
   * Generates and deterministically validates a proposed schedule
   */
  public static async generatePlan(triggerReason: string = 'INITIAL_PLAN'): Promise<ProposalResponse> {
    const store = DispatchStore.getInstance();
    const technicians = store.getTechnicians();
    const requests = store.getRequests();
    const currentAssignments = store.getCurrentAssignments();

    const providerEnv = process.env.AI_PROVIDER || 'mock';
    const geminiKey = process.env.GEMINI_API_KEY;

    let rawPlan: PlanOutput;
    let providerUsed: 'HEURISTIC_MOCK' | 'GOOGLE_GEMINI' = 'HEURISTIC_MOCK';

    if (providerEnv === 'gemini' && geminiKey) {
      try {
        // Attempt cloud Gemini call with structured JSON prompt
        rawPlan = await this.callGeminiApi(geminiKey, technicians, requests, currentAssignments, triggerReason);
        providerUsed = 'GOOGLE_GEMINI';
      } catch (err) {
        console.warn('Gemini API call failed or timed out. Gracefully falling back to local heuristic solver:', err);
        rawPlan = HeuristicPlanner.generatePlan(technicians, requests, currentAssignments, triggerReason);
      }
    } else {
      // 100% Free, local zero-token heuristic solver
      rawPlan = HeuristicPlanner.generatePlan(technicians, requests, currentAssignments, triggerReason);
    }

    // Step 2: Validate AI proposal output against Zod schema
    const validatedPlan = ScheduleProposalSchema.parse(rawPlan);

    // Step 3: Run Deterministic Hard Constraint Engine
    const techMap = new Map(technicians.map(t => [t.id, t]));
    const reqMap = new Map(requests.map(r => [r.id, r]));
    const lockedMap = new Map(
      currentAssignments
        .filter(a => a.lockState === 'LOCKED_COMPLETED' || a.status === 'COMPLETED')
        .map(a => [a.serviceRequestId, a])
    );

    const validation = DeterministicConstraintEngine.validateSchedule(
      validatedPlan.assignments as ProposedAssignment[],
      techMap,
      reqMap,
      lockedMap
    );

    // Save as draft in store for dispatcher review
    store.setDraftProposal({
      ...validatedPlan,
      validation,
      provider: providerUsed,
      triggerReason,
      createdAt: new Date().toISOString(),
    });

    return {
      plan: validatedPlan,
      validation,
      provider: providerUsed,
    };
  }

  /**
   * Calls Google Gemini API using native structured JSON response format
   */
  private static async callGeminiApi(
    apiKey: string,
    technicians: any[],
    requests: any[],
    currentAssignments: any[],
    triggerReason: string
  ): Promise<PlanOutput> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
You are the Field Service Dispatch & Replanning Agent.
Operating Day: 2026-10-15.
Technicians: ${JSON.stringify(technicians)}
Requests: ${JSON.stringify(requests)}
Existing Locked Assignments: ${JSON.stringify(currentAssignments.filter(a => a.status === 'COMPLETED'))}
Trigger: ${triggerReason}

HARD CONSTRAINTS:
1. Skills must match exactly.
2. Region must match exactly.
3. Assignment must be within technician shift and customer window.
4. No double booking / overlaps.
5. Workload <= maxWorkloadMinutes.
6. COMPLETED tasks are IMMUTABLY LOCKED.

Output valid JSON strictly matching the plan schema:
{
  "planSummary": string,
  "assignments": [{"serviceRequestId": string, "technicianId": string, "startTime": "HH:mm", "endTime": "HH:mm", "durationMinutes": number, "reasoning": string}],
  "unassignedRequests": [{"serviceRequestId": string, "reason": string, "recommendedAction": string}],
  "risks": [{"severity": "LOW"|"MEDIUM"|"HIGH", "description": string}],
  "tradeOffs": [string],
  "suggestedQuestions": [string]
}
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Empty response from Gemini');

    return JSON.parse(candidateText) as PlanOutput;
  }
}
