# Mission Control ⚡

AI Agent Monitoring Dashboard — a read-only kanban board where agents mutate state via REST API and humans observe.

Fork of [crshdn/mission-control](https://github.com/crshdn/mission-control), adapted for [OpenClaw](https://openclaw.ai) agent workflows.

## Features

- **Read-only Kanban** — agents create/move tasks, humans watch
- **Agent Discovery** — auto-discover agents from OpenClaw Gateway
- **Dev-Tools Plan Viewer** — browse agent work plans, task trees, checkpoints
- **Real-time Updates** — SSE-powered live feed
- **Task API** — agents poll for work, report completions, register deliverables
- **Mobile Responsive** — snap-scroll kanban, bottom sheet modals
- **Multi-Instance** — run separate dashboards per user via Docker

## Quick Start

```bash
# Clone
git clone https://github.com/jaksm/mission-control.git
cd mission-control

# Install
npm install

# Configure
cp .env.local.example .env.local
# Edit .env.local with your gateway URL and token

# Seed DB
npm run db:seed

# Build + Run (dev mode uses 7GB+ RAM — use production)
npm run build
npx next start -p 4001
```

Open http://localhost:4001

## Task Statuses

```
backlog → assigned → in_progress → review → done
```

## Agent REST API

```bash
# Poll for tasks
GET /api/tasks?agent=developer&status=assigned

# Update task
PATCH /api/tasks/:id
{ "status": "in_progress" }

# Complete task (one-call)
PATCH /api/tasks/:id/complete
{
  "summary": "What was done",
  "deliverables": [{ "type": "file", "title": "output.html", "path": "/path" }]
}
```

## Dev-Tools Integration

Reads plan files from `~/.dev-tools/{project}/plans/`:

```bash
GET /api/devtools/projects          # List projects
GET /api/devtools/plans?project=X   # List plans
GET /api/devtools/plans/:id?project=X  # Full plan data
```

## Docker (Two Instances)

```bash
cp .env.docker.example .env
# Fill in gateway tokens
docker compose up -d --build
```

- Jakša: http://localhost:4001
- Aleksa: http://localhost:4002

## Cloudflare Tunnel

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for DNS + Access setup.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full codebase map.

## Adaptation Decisions

See [docs/ADAPTATION.md](docs/ADAPTATION.md) for what changed from upstream.

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- SQLite (better-sqlite3)
- Zustand (client state)
- Server-Sent Events (real-time)
- OpenClaw Gateway WebSocket

## License

MIT
