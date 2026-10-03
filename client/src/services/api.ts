import { AppState, ScheduleValidationResult, ValidationViolation } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const api = {
  async getState(): Promise<AppState> {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Failed to fetch state');
    return res.json();
  },

  async generatePlan(): Promise<any> {
    const res = await fetch(`${API_BASE}/schedules/generate`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate plan');
    }
    return res.json();
  },

  async replan(payload: { triggerReason?: string; emergencyRequestId?: string; technicianId?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/schedules/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to replan schedule');
    }
    return res.json();
  },

  async approvePlan(): Promise<any> {
    const res = await fetch(`${API_BASE}/schedules/approve`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve schedule');
    }
    return res.json();
  },

  async rejectPlan(rejectionReason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/schedules/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason }),
    });
    if (!res.ok) throw new Error('Failed to reject proposal');
    return res.json();
  },

  async updateTechnician(id: string, updates: any): Promise<any> {
    const res = await fetch(`${API_BASE}/technicians/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update technician');
    return res.json();
  },

  async updateRequest(id: string, updates: any): Promise<any> {
    const res = await fetch(`${API_BASE}/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update request');
    return res.json();
  },

  async createRequest(payload: {
    customerName: string;
    region: string;
    requiredSkill: string;
    priority: string;
    durationMinutes: number;
    windowStart: string;
    windowEnd: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create work order');
    }
    return res.json();
  },

  async addEmergencyRequest(): Promise<any> {
    const res = await fetch(`${API_BASE}/emergency`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to ingest emergency request');
    return res.json();
  },

  async validateAssignment(payload: {
    serviceRequestId: string;
    technicianId: string;
    startTime: string;
    endTime: string;
  }): Promise<{ isValid: boolean; violations: ValidationViolation[] }> {
    const res = await fetch(`${API_BASE}/assignments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Validation call failed');
    return res.json();
  },

  async applyOverride(
    assignmentId: string,
    payload: {
      technicianId: string;
      startTime: string;
      endTime: string;
      overrideReason: string;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}/override`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to apply manual override');
    }
    return res.json();
  },

  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo dataset');
    return res.json();
  },

  async clearBacklog(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear work orders');
    return res.json();
  },

  async loadSeedDataset(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to load seed dataset');
    return res.json();
  },
};
