# 03 — Technology Stack & Tooling Rationale

## 1. Stack Overview

To fulfill the rigorous requirements of the **Field Service Dispatch & Replanning Agent** within a realistic 7–10 hour implementation timeframe, we select a modern, type-safe, developer-friendly full-stack TypeScript architecture. Every choice minimizes boilerplate, guarantees end-to-end type safety, and provides maximum velocity for building a polished, interactive dispatch operations control center.

```
+-----------------------------------------------------------------------------------------------+
|                                      FRONTEND (SPA)                                           |
|  React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons + TanStack Query      |
+-----------------------------------------------------------------------------------------------+
                                               │  HTTPS / JSON REST
                                               ▼
+-----------------------------------------------------------------------------------------------+
|                                     BACKEND (REST API)                                        |
|             Node.js + Express + TypeScript + Zod Runtime Validation Engine                     |
+-----------------------------------------------------------------------------------------------+
        │                                      │                                 │
        ▼                                      ▼                                 ▼
+----------------------+     +----------------------------------+     +-------|     DATA LAYER       |     |        SCHEDULING ENGINE         |     |        AI LAYER         |
|  SQLite / PostgreSQL  |     | Pure Deterministic TS Validator  |     | Google Gemini API (Free)|
|    (Prisma ORM)       |     | (Zero Dependency Hard Rules)     |     |   + Local Mock Heuristic|
+----------------------+     +----------------------------------+     +-------------------------+
```

---

## 2. Technology Choices & Detailed Rationale

### 2.1 Frontend Tier

#### React 18 + Vite + TypeScript
* **Purpose**: Single Page Application (SPA) client providing a responsive, interactive dispatcher desktop dashboard.
* **Why Appropriate**: Vite offers near-instant hot module replacement (HMR) and ultra-fast builds. React 18 provides fine-grained state management needed for high-frequency timeline interactions and real-time diff inspections. TypeScript ensures unified data types shared directly with the backend.
* **System Usage**: Complete user interface including the Dispatcher Dashboard, Interactive Gantt Timeline, AI Proposal Review Drawer, Schedule Version Comparator, and Audit Log Viewer.
* **Cost**: **100% Free & Open Source**.

#### Tailwind CSS + shadcn/ui + Lucide React
* **Purpose**: Design system and accessible UI component library.
* **Why Appropriate**: Provides a sleek, modern, enterprise dark/light theme with zero CSS bloat. Pre-built primitives (Modals, Popovers, Tabs, Badges, Alert Dialogs, Accordions) allow rapid creation of a high-density, professional command-center UI.
* **System Usage**: Visual timeline cards, status badges, diff callouts, warning alerts, and drawer navigation.
* **Cost**: **100% Free & Open Source**.

#### TanStack Query (React Query v5)
* **Purpose**: Server state management, cache invalidation, and asynchronous query handling.
* **Why Appropriate**: Handles optimistic updates, background refetching, and synchronous cache invalidation when a schedule is approved or a replan is calculated. Prevents stale schedule state from showing on screen.
* **System Usage**: Syncing technicians, requests, active schedule versions, and proposal diffs.
* **Cost**: **100% Free & Open Source**.

---

## 2.2 Backend Tier

#### Node.js & Express (TypeScript)
* **Purpose**: Headless REST API server coordinating business logic, AI orchestration, and database persistence.
* **Why Appropriate**: Node.js with TypeScript allows seamless code and type sharing between the API, the validation engine, and the frontend. Express provides a lightweight, battle-tested HTTP layer without unnecessary framework ceremony.
* **System Usage**: REST endpoints (`/api/requests`, `/api/technicians`, `/api/schedules`, `/api/audit-logs`).
* **Cost**: **100% Free & Open Source**.

#### Zod (Schema Validation)
* **Purpose**: Runtime schema validation and TypeScript type inference.
* **Why Appropriate**: Enforces strict boundary validation on incoming HTTP payloads and, crucially, validates untrusted, structured JSON emitted by the AI Planning Agent before the deterministic engine even touches it.
* **System Usage**: API request validation, AI proposal JSON validation, and environment configuration checks.
* **Cost**: **100% Free & Open Source**.

---

## 2.3 Deterministic Engine Layer

#### Pure TypeScript Algorithmic Constraint Engine
* **Purpose**: Isolated mathematical validator that checks all 7 hard operational constraints (skills, regions, shifts, windows, overlap, workload, completed lock).
* **Why Appropriate**: Kept deliberately free of database access or network I/O. As a pure function `(ScheduleProposal, MasterData) => ValidationResult`, it executes in sub-millisecond time, is 100% deterministic, and can be unit-tested exhaustively without mocks.
* **System Usage**: Invoked before any schedule can be previewed as valid, before any manual override is saved, and before any schedule version is committed.
* **Cost**: **100% Free (Pure in-process code, 0 API calls, 0 cost)**.

---

## 2.4 AI Intelligence Tier (100% Free Options)

#### Option A (Primary Cloud AI): Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash`)
* **Purpose**: Generates intelligent assignment proposals, evaluates trade-offs, identifies scheduling bottlenecks, and formulates clarification questions.
* **Why Appropriate**: Google AI Studio provides a **completely free API key** (no credit card required) with generous free tier allowances (15 Requests Per Minute, 1,500 Requests Per Day, 1M Tokens Per Minute). Gemini natively supports Structured Outputs / JSON Schema mode (`responseMimeType: "application/json"`, `responseSchema`), ensuring reliable adherence to scheduling DTOs.
* **Cost**: **100% Free (Free Tier via Google AI Studio, no billing setup required)**.

#### Option B (Built-in Zero-Token Fallback): Local Deterministic Heuristic Agent (`AI_PROVIDER=mock`)
* **Purpose**: Generates high-quality schedule proposals and trade-off rationales using an in-process greedy heuristic solver.
* **Why Appropriate**: Requires **zero API keys**, makes zero network calls, runs with zero latency, and works completely offline. Perfect for automated test suites, evaluations, and grading environments where no external credentials exist.
* **Cost**: **100% Free (Zero API keys, zero tokens, runs everywhere)**.

---

## 2.5 Data Persistence Tier (100% Free)

#### SQLite (Local Dev) & PostgreSQL / Neon (Cloud Deploy) via Prisma ORM
* **Purpose**: Relational persistence and schema migrations.
* **Why Appropriate**:
  * **Local Development**: SQLite (`file:./dev.db`) requires **zero setup, zero docker, zero cloud accounts, and 0 cost**.
  * **Cloud Deployment**: Neon / Supabase offer permanent **100% free PostgreSQL tiers** without requiring a credit card.
* **System Usage**: Persisting Technicians, Service Requests, Schedules, Versions, Assignments, Audit Logs, and Mock Notifications.
* **Cost**: **100% Free**.

---

## 2.6 Testing Suite

#### Vitest
* **Purpose**: Ultra-fast unit and integration testing runner.
* **Why Appropriate**: Native Vite and TypeScript support with Jest-compatible APIs. Runs sub-millisecond constraint checks and suite executions in parallel.
* **System Usage**: Testing deterministic constraints, AI schema parsing, and business logic.
* **Cost**: **100% Free & Open Source**.

#### Supertest
* **Purpose**: HTTP integration testing for Express endpoints.
* **Why Appropriate**: Tests full request-response lifecycles, database transactions, and error status codes without starting a live network server.
* **System Usage**: Testing `/api/schedules/generate`, approval endpoints, and override validations.
* **Cost**: **100% Free & Open Source**.

#### Playwright
* **Purpose**: End-to-end (E2E) browser automation.
* **Why Appropriate**: Verifies the complete dispatcher workflow (load requests -> trigger AI plan -> inspect timeline -> approve -> trigger emergency -> view diff -> re-approve).
* **System Usage**: Critical path regression tests.
* **Cost**: **100% Free & Open Source**.

---

## 2.7 Deployment Infrastructure (100% Free Tiers)

| Component | Target Platform | Free Tier Capability |
| :--- | :--- | :--- |
| **Frontend** | Vercel / Netlify | 100% Free tier (Unlimited personal projects, edge CDN, automated Git preview deployments). |
| **Backend API** | Render / Railway / Local | 100% Free tier on Render (free web service) or local Node.js process. |
| **Database** | SQLite (Local) / Neon / Supabase | 100% Free tier (SQLite is zero cost; Neon provides free serverless Postgres with no credit card). |

---

## 3. Technology Boundary Matrix

| Capability | Assigned Layer | Technology | Service Cost |
| :--- | :--- | :--- | :--- |
| Hard Scheduling Rules | Deterministic Engine | Pure TypeScript | **$0.00 (In-process)** |
| Assignment Optimization & Trade-offs | AI Agent Layer | Google Gemini (Free API) or Local Mock Solver | **$0.00 (Free Tier / Zero Token)** |
| Runtime Type Validation | API & Agent Boundary | Zod | **$0.00 (Open Source)** |
| Relational Storage & Versioning | Persistence Layer | Prisma ORM + SQLite / Neon Postgres | **$0.00 (Local / Free Tier)** |
| State Synchronization & Cache | Frontend Client | TanStack Query v5 | **$0.00 (Open Source)** |
| Timeline & Diff UI Rendering | Presentation Layer | React 18 + Tailwind CSS + Lucide | **$0.00 (Open Source)** |lwind CSS + Lucide |
