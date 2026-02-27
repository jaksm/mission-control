# Mission Control — Architecture Audit

**Date:** 2026-02-27
**Base:** crshdn/mission-control v1.2.0 (fork: jaksm/mission-control)
**Stack:** Next.js 14.2.21, TypeScript, SQLite (better-sqlite3), Tailwind CSS, Zustand

---

## Pages / Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Static (client) | Home — renders `WorkspaceDashboard` (lists all workspaces) |
| `/workspace/[slug]` | Dynamic (client) | Workspace detail — kanban board, agents sidebar, live feed |
| `/settings` | Static (client) | Config panel (workspace paths, gateway URL) |

## API Routes

### Agents
| Route | Methods | Purpose |
|---|---|---|
| `/api/agents` | GET, POST | List/create agents (filterable by `workspace_id`) |
| `/api/agents/[id]` | GET, PUT, DELETE | CRUD single agent |
| `/api/agents/[id]/openclaw` | POST | Start/manage OpenClaw session for agent |
| `/api/agents/discover` | GET | Discover agents from OpenClaw gateway |
| `/api/agents/import` | POST | Import discovered gateway agent into local DB |

### Tasks
| Route | Methods | Purpose |
|---|---|---|
| `/api/tasks` | GET, POST | List/create tasks (filterable by `workspace_id`, `status`, `assigned_agent_id`) |
| `/api/tasks/[id]` | GET, PUT, DELETE | CRUD single task |
| `/api/tasks/[id]/activities` | GET, POST | Task activity log (timeline of what happened) |
| `/api/tasks/[id]/deliverables` | GET, POST | Task deliverables (files, URLs, artifacts) |
| `/api/tasks/[id]/dispatch` | POST | Dispatch task to assigned agent via OpenClaw |
| `/api/tasks/[id]/subagent` | GET, POST | Manage sub-agent sessions for a task |
| `/api/tasks/[id]/test` | POST | Test/verify task completion |

### Planning (AI-driven Q&A flow)
| Route | Methods | Purpose |
|---|---|---|
| `/api/tasks/[id]/planning` | GET, POST | Get/start planning session |
| `/api/tasks/[id]/planning/answer` | POST | Answer a planning question |
| `/api/tasks/[id]/planning/approve` | POST | Approve planning spec, lock it |
| `/api/tasks/[id]/planning/poll` | GET | Poll for new planning questions |
| `/api/tasks/[id]/planning/retry-dispatch` | POST | Retry failed dispatch |

### Workspaces
| Route | Methods | Purpose |
|---|---|---|
| `/api/workspaces` | GET, POST | List/create workspaces |
| `/api/workspaces/[id]` | GET, PUT, DELETE | CRUD single workspace |

### OpenClaw Integration
| Route | Methods | Purpose |
|---|---|---|
| `/api/openclaw/status` | GET | Gateway connection status + session list |
| `/api/openclaw/sessions` | GET | List OpenClaw sessions |
| `/api/openclaw/sessions/[id]` | GET | Session details |
| `/api/openclaw/sessions/[id]/history` | GET | Session message history |
| `/api/openclaw/models` | GET | Available models from gateway |
| `/api/openclaw/orchestra` | GET | Orchestra status |

### Other
| Route | Methods | Purpose |
|---|---|---|
| `/api/events` | GET | Recent events (live feed data) |
| `/api/events/stream` | GET | SSE stream for real-time UI updates |
| `/api/files/*` | Various | File upload/download/preview/reveal |
| `/api/demo` | GET | Demo data endpoint |
| `/api/webhooks/agent-completion` | POST | Webhook for agent task completion |

---

## Component Tree

```
Layout (layout.tsx)
├── HomePage (page.tsx)
│   └── WorkspaceDashboard — workspace grid, stats, create workspace
│
├── WorkspacePage (/workspace/[slug])
│   ├── Header — logo, workspace name, connection status, settings link
│   ├── AgentsSidebar — agent list, status indicators, discover button
│   │   └── DiscoverAgentsModal — import agents from gateway
│   ├── MissionQueue — kanban board (drag-drop columns by status)
│   │   └── TaskModal — task detail (description, activities, deliverables, planning)
│   │       ├── ActivityLog — timeline of task events
│   │       ├── DeliverablesList — files/URLs produced
│   │       ├── PlanningTab — AI Q&A flow for task planning
│   │       └── SessionsList — OpenClaw sessions linked to task
│   ├── LiveFeed — real-time event stream
│   ├── SSEDebugPanel — debug overlay for SSE events
│   └── DemoBanner — demo mode indicator
│
└── SettingsPage (/settings)
    └── Config form (workspace path, gateway URL)
```

---

## SQLite Schema (10 tables)

| Table | Purpose | Key Fields |
|---|---|---|
| `workspaces` | Project grouping | id, name, slug, icon |
| `agents` | AI agents (local or gateway) | id, name, role, status, is_master, source, gateway_agent_id |
| `tasks` | Mission queue items | id, title, status, priority, assigned_agent_id, workspace_id, planning_* |
| `planning_questions` | AI planning Q&A | task_id, category, question, question_type, options, answer |
| `planning_specs` | Locked planning specs | task_id, spec_markdown, locked_at |
| `conversations` | Agent-to-agent chat | id, type (direct/group/task), task_id |
| `conversation_participants` | M2M agents↔conversations | conversation_id, agent_id |
| `messages` | Chat messages | conversation_id, sender_agent_id, content, message_type |
| `events` | Live feed events | type, agent_id, task_id, message |
| `task_activities` | Task timeline | task_id, agent_id, activity_type, message |
| `task_deliverables` | Task artifacts | task_id, deliverable_type, title, path |
| `openclaw_sessions` | Session tracking | agent_id, openclaw_session_id, task_id, status |
| `businesses` | Legacy (kept for compat) | id, name |

**Task statuses:** `pending_dispatch` → `planning` → `inbox` → `assigned` → `in_progress` → `testing` → `review` → `done`

---

## Real-Time Architecture

1. **SSE (Server-Sent Events)** — `/api/events/stream`
   - In-memory client set (`events.ts` — `broadcast()`)
   - Events: task_created, task_updated, activity_logged, deliverable_added, agent_spawned, agent_completed
   - Client hook: `useSSE()` — auto-reconnect with 5s backoff

2. **OpenClaw WebSocket** — server-side only (`lib/openclaw/client.ts`)
   - Connects to gateway at startup
   - Challenge-response auth with device identity (`device-identity.ts`)
   - Used for: agent discovery, session management, task dispatch
   - NOT exposed to browser — proxied through API routes

---

## State Management

- **Zustand store** (`store.ts`) — single global store
  - agents, tasks, conversations, events, messages
  - OpenClaw session mapping (agent → session)
  - UI state (selected agent/task, loading, online status)
  - All mutations through store actions

---

## Auth / Security

- **Middleware** (`middleware.ts`) — protects `/api/*`
  - No token set → auth disabled (dev mode) ← **current state**
  - `MC_API_TOKEN` env → Bearer token required for external API calls
  - Same-origin browser requests pass through (checks Origin/Referer)
  - SSE stream accepts token as query param
  - Demo mode: blocks all non-GET requests

---

## Key Libraries

| Package | Purpose |
|---|---|
| `better-sqlite3` | SQLite database |
| `zustand` | Client state management |
| `@hello-pangea/dnd` | Drag-and-drop (kanban) |
| `lucide-react` | Icons |
| `date-fns` | Date formatting |
| `clsx` | Class name utility |
| `playwright` | Testing (in deps, likely unused in production) |

---

## What We're Keeping vs Stripping

### ✅ Keep & Adapt
- Workspace concept → rename to "Projects"
- Agent management + gateway discovery
- Task model (strip planning, simplify statuses)
- SSE real-time updates
- Activity log + deliverables
- Session tracking
- Event system / live feed
- Auth middleware
- Docker support

### ❌ Strip
- AI Planning Q&A flow (PlanningTab, planning_questions, planning_specs, planning API routes)
- Task priority + due date
- Drag-drop task movement (read-only kanban)
- Manual task create/edit from UI
- Auto-dispatch from UI
- Demo mode/banner
- Conversations/messages (agent chat — we use Telegram)
- "businesses" legacy table

### 🔄 Add (later phases)
- Dev-tools plan viewer
- Tool call log viewer
- Token usage dashboard
- Error log viewer
- Configurable kanban phases per project
- Agent REST API for pull-based tasks
