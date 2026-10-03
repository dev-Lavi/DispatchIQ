# Field Service Dispatch and Replanning Agent

A single-day operational dispatch control center that assigns service requests to field technicians, enforces hard scheduling constraints using deterministic logic, leverages an AI planning agent for trade-off analysis and replanning, and requires explicit dispatcher approval before committing immutable schedule versions.

---

## Architectural Principle

> **"AI proposes. Deterministic code validates. Human approves."**

The Large Language Model (LLM) is treated as an advisor for combinatorial planning and trade-off explanations. It never possesses direct write authority to the database. Every candidate assignment is rigorously checked by an isolated, deterministic TypeScript rule engine prior to human review and approval.

---

## Core Features

* **Gantt Schedule Timeline**: Interactive visualization of technician daily assignments (08:00–17:00), shift boundaries, and workload utilization.
* **Deterministic Constraint Engine**: Mathematical enforcement of 7 hard operational rules:
  1. Required skill matching
  2. Geographic territory matching
  3. Technician shift availability
  4. Customer preferred time window
  5. Double-booking / collision prevention
  6. Maximum daily workload quota
  7. Immutability of completed/in-progress tasks
* **AI Planning Agent**: Generates candidate schedule proposals, highlights operational trade-offs, identifies unassigned bottlenecks, and surfaces proactive clarification questions.
* **Intraday Disruption Handling**:
  * Emergency work order insertion with automatic preemption of lower-priority tasks.
  * Mid-day technician cancellation redistribution.
  * Guaranteed lock on completed assignments.
* **Visual Version Comparison (Diffing)**: Clearly categorizes `UNCHANGED`, `RESCHEDULED`, `REASSIGNED`, `NEW`, and `UNASSIGNED` tasks.
* **Human-in-the-Loop Controls**: Manual assignment adjustments with real-time validation, formal approval/rejection workflows, and simulated technician notifications.
* **Immutable Version History & Audit Trail**: Chronological ledger of all schedule versions, manual overrides, and operational mutations.

---

## Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, TanStack Query v5
* **Backend**: Node.js, Express, TypeScript, Zod
* **Scheduling Engine**: Pure TypeScript (zero external runtime dependencies)
* **AI Layer**: Google Gemini API (`gemini-1.5-flash` via Free Google AI Studio API key) + Built-in Local Mock Heuristic Solver (`AI_PROVIDER=mock`, 100% free, 0 API keys required)
* **Database & Persistence**: SQLite (local zero-config, 100% free) / Neon Serverless Postgres (free tier) via Prisma ORM
* **Testing**: Vitest, Supertest, Playwright

---

## Project Structure

```text
aggroso/
├── docs/                             # Architecture & technical specification
│   ├── 01-problem-definition.md
│   ├── 02-requirements.md
│   ├── 03-tech-stack.md
│   ├── 04-system-architecture.md
│   ├── 05-data-model.md
│   ├── 06-scheduling-rules.md
│   ├── 07-ai-agent-design.md
│   ├── 08-user-flows.md
│   ├── 09-api-specification.md
│   ├── 10-ui-design.md
│   ├── 11-testing-strategy.md
│   └── 12-demo-scenario.md
├── client/                           # React frontend application
│   ├── src/
│   │   ├── components/               # Timeline, AI drawer, diff modals
│   │   ├── hooks/                    # TanStack Query data hooks
│   │   ├── types/                    # Shared TypeScript interfaces
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                           # Express backend API & engine
│   ├── src/
│   │   ├── api/                      # Route controllers & middleware
│   │   ├── engine/                   # Pure deterministic constraint engine
│   │   ├── ai/                       # AI prompt engine & mock provider
│   │   ├── services/                 # Schedule, audit, and notification services
│   │   └── index.ts
│   ├── prisma/                       # Database schema and seed scripts
│   │   └── schema.prisma
│   └── tsconfig.json
├── package.json
└── README.md
```

---

## Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (SQLite local file: zero-setup, zero-cost; or free Neon Postgres)
DATABASE_URL="file:./dev.db"

# AI Provider:
# Option 1: "mock" (100% Free, zero tokens, zero external API keys needed)
# Option 2: "gemini" (100% Free Google AI Studio API key - https://aistudio.google.com)
AI_PROVIDER=mock
GEMINI_API_KEY=your_free_gemini_api_key_here
```

---

## Getting Started

### Prerequisites
* Node.js (v18.x or v20.x)
* npm or pnpm
* PostgreSQL instance (or SQLite for development)

### 1. Database Setup
```bash
cd server
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

### 2. Running Backend API
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

### 3. Running Frontend Client
```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:5173
```

### 4. Running Tests
```bash
# Deterministic rule engine and unit tests
cd server
npm run test

# End-to-end integration tests
npm run test:e2e
```

---

## Deployment Guide (Render & Vercel)

### 1. Deploying Backend to Render
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** &rarr; **Web Service**.
3. Connect your repository.
4. Set the following settings:
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   * `NODE_ENV`: `production`
   * `PORT`: `5000` (or Render will assign `$PORT` automatically)
   * `AI_PROVIDER`: `gemini` (or `mock` if you don't want to use an external API key)
   * `GEMINI_API_KEY`: *(Your free Google AI Studio key from [https://aistudio.google.com/](https://aistudio.google.com/))*
6. Click **Create Web Service**. Note your public URL (e.g. `https://dispatchiq-api.onrender.com`).

---

### 2. Deploying Frontend to Vercel
1. In [Vercel Dashboard](https://vercel.com/), click **Add New** &rarr; **Project**.
2. Import your GitHub repository.
3. Set the following settings:
   * **Root Directory**: Click edit and choose `client`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   * `VITE_API_URL`: `https://your-backend-app.onrender.com/api` *(Point to your deployed Render URL)*
5. Click **Deploy**. Your DispatchIQ dashboard is live globally!

---

## Free Google Gemini API Key Setup

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** &rarr; **"Create API key"** (100% Free, no credit card required).
4. Copy the API key and paste it into `server/.env` (or Render environment variables):
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AIzaSy...
   ```
*(If no key is provided, DispatchIQ automatically runs in zero-token local heuristic mode with 0 errors).*

---

## Demonstration Dataset

The project includes a pre-configured seed scenario located in `docs/12-demo-scenario.md`:
* **4 Technicians**: Carlos Rivera (North, HVAC/Plumb), Maria Santos (South, Elect/HVAC), David Kim (Central, Plumb/Elect), Elena Vance (North, Elect).
* **10 Requests**: Spanning routine HVAC calls, electrical inspections, emergency leak triage, and a planned bottleneck request demonstrating unassignable analysis.
