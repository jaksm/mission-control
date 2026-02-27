# Mission Control — Adaptation Decisions

**Date:** 2026-02-27
**Context:** Adapting crshdn/mission-control into our agent monitoring dashboard.

---

## Core Philosophy

**Read-only kanban. Agents mutate, humans observe.**

Mission Control is NOT a project management tool. It's a monitoring dashboard. The kanban board reflects what agents are doing — humans don't drag cards, create tasks from the UI, or manually assign work. Agents (primarily Jarvis) create tasks via API, assign them, move them through statuses, and mark them done.

The human opens Mission Control to see: what's happening, what's stuck, what shipped.

---

## Structural Changes

### Workspaces → Projects
- Rename "workspaces" to "projects" throughout (DB, API, UI)
- Each project maps to a directory in `~/Projects/jaksa/`
- Projects are created via API by Jarvis when a new project starts

### No Teams
- Remove the team concept entirely
- All agents belong to the same pool
- Jarvis assigns tasks to any available agent

### Simplified Task Model
| Field | Keep? | Notes |
|---|---|---|
| title | ✅ | |
| description | ✅ | |
| status | ✅ | Simplified statuses (see below) |
| priority | ❌ | Remove — agents handle prioritization |
| assigned_agent_id | ✅ | |
| created_by_agent_id | ✅ | |
| workspace_id → project_id | ✅ | Renamed |
| due_date | ❌ | Remove — agents work async, no deadlines |
| planning_* fields | ❌ | Remove entire planning system |
| business_id | ❌ | Remove legacy field |

### Configurable Kanban Phases
Default pipeline (sensible for most projects):
```
backlog → assigned → in_progress → review → done
```

Per-project customization via project settings:
```
// Example: design-heavy project
concept → design → development → qa → review → done

// Example: research project  
queued → researching → synthesizing → done
```

Phases are stored per-project in the DB. The kanban board renders columns dynamically.

### Read-Only Kanban
- **Remove:** `@hello-pangea/dnd` (drag-drop library)
- **Remove:** Manual task creation buttons in UI
- **Remove:** Inline task editing from kanban cards
- **Remove:** Status change dropdowns in task detail modal
- **Keep:** Task detail modal (read-only — shows activities, deliverables, sessions)
- **Keep:** Click-to-view task details
- **Add:** Visual indicators for stale tasks (no activity in >X hours)

### Deliverables Concept — Kept
Deliverables (files, URLs, artifacts) are a great fit:
- Developer agent completes a PR → deliverable: PR URL
- Designer produces mockups → deliverable: Figma link
- QA finds bugs → deliverable: bug report file
- All visible in the task detail panel

---

## What Gets Stripped

### Planning System (Phase 3)
Remove entirely:
- `PlanningTab.tsx` (692 LOC)
- `/api/tasks/[id]/planning/*` (5 route files)
- `planning_questions` table
- `planning_specs` table
- `planning_*` fields from tasks table
- `planning-utils.ts`

### Conversations/Messages
Remove entirely (we use Telegram for agent communication):
- `conversations` table
- `conversation_participants` table
- `messages` table
- Related API routes if any exist for direct messaging

### Demo Mode
- Remove `DemoBanner.tsx`
- Remove `DEMO_MODE` logic from middleware
- Remove `/api/demo` route

### Auto-Dispatch from UI
- Remove dispatch buttons from UI
- Keep `/api/tasks/[id]/dispatch` route (agents use it)
- Remove `auto-dispatch.ts` client-side trigger

---

## What Gets Added (Later Phases)

### Agent REST API (Phase 4)
Pull-based task system for agents:
```
GET  /api/tasks?agent=developer&status=assigned   → "what do I work on?"
PATCH /api/tasks/:id                                → update progress
PATCH /api/tasks/:id/complete                       → mark done + deliverables
POST /api/webhooks/agent-completion                 → webhook callback
```

Agent identity via headers: `X-Agent-Name`, `X-Agent-Emoji`

### Dev-Tools Integration (Phase 5-7)
- Plan viewer (read from `~/.dev-tools/{slug}/plans/`)
- Tool call log viewer (stream from `~/.dev-tools/{slug}/logs/`)
- Token usage dashboard (parse session JSONL)
- Error log viewer (read `error-log.md`)

### Mobile-Responsive (Phase 8)
- Swipeable kanban columns
- Bottom nav for mobile
- Touch-friendly controls

---

## Deployment

### Docker (Two Instances)
```yaml
services:
  jaksa:
    port: 4001
    gateway: ws://host.docker.internal:18789  # Jakša's gateway
    volume: ./data/jaksa/mission-control.db
    
  aleksa:
    port: 4002
    gateway: ws://host.docker.internal:18839  # Aleksa's gateway
    volume: ./data/aleksa/mission-control.db
```

### Cloudflare Tunnels
- `jaksa.mc.jaksm.dev` → localhost:4001
- `aleksa.mc.jaksm.dev` → localhost:4002
- Cloudflare Access: email-based auth wall per instance

---

## Migration Strategy

**Incremental, not big-bang.**

1. Strip planning system + simplify task model (Phase 3)
2. Make kanban read-only (Phase 3)  
3. Build agent REST API (Phase 4)
4. Add dev-tools viewers (Phase 5-7)
5. Each phase: build → verify → commit → next

The app stays functional after each phase. No "tear it all down and rebuild" — surgical removals and additions.
