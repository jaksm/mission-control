# Mission Control

AI agent monitoring dashboard for [OpenClaw](https://openclaw.ai). Read-only kanban board where agents mutate state via REST API and humans observe in real-time.

## Features

- **Kanban Board** — Task pipeline: Backlog → Assigned → In Progress → Review → Done
- **Agent Sidebar** — Connected agents with status, OpenClaw session linking
- **Live Feed** — Real-time activity stream via SSE
- **Dev-Tools Plan Viewer** — Browse task plans from `~/.dev-tools/*/plans/`
- **Tool Call Logs** — Stream JSONL tool call entries (stub, awaiting data)
- **Token Usage** — Cost tracking and cache performance (stub, awaiting data)
- **Mobile Responsive** — Swipeable kanban, bottom nav, slide-up drawers

## Architecture

- **Next.js 14** (App Router) + **SQLite** (better-sqlite3) + **Tailwind CSS**
- **SSE** for real-time updates (in-memory broadcast)
- **OpenClaw WebSocket** client with challenge-response auth
- Agents interact via REST API; UI is read-only

## Setup

### Prerequisites

- Node.js 20+
- An OpenClaw gateway running locally

### Install & Run

```bash
git clone https://github.com/jaksm/mission-control.git
cd mission-control
npm install

# Configure
cp .env.example .env.local
# Edit .env.local:
#   OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
#   OPENCLAW_GATEWAY_TOKEN=<your-gateway-token>
#   MC_API_TOKEN=<random-secret-for-agent-api>

# Build & start (production mode recommended — dev mode uses 7GB+ RAM)
npx next build
npx next start -p 4001
```

### Multi-Profile Setup

Run separate instances per user:

```bash
# Jakša's instance
PORT=4001 OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789 npx next start -p 4001

# Aleksa's instance  
PORT=4002 OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18839 npx next start -p 4002
```

### Remote Access (Cloudflare Tunnel)

Add ingress rules to your `~/.cloudflared/config.yml`:

```yaml
- hostname: jaksa-mc.yourdomain.dev
  service: http://localhost:4001
- hostname: aleksa-mc.yourdomain.dev
  service: http://localhost:4002
```

Protect with Cloudflare Access (email-based auth).

## Agent REST API

Agents interact with Mission Control via these endpoints:

```
GET    /api/tasks?agent=developer&status=assigned   # Poll for assigned tasks
PATCH  /api/tasks/:id                                # Update task status
PATCH  /api/tasks/:id/complete                       # One-call completion
POST   /api/webhooks/agent-completion                # Webhook callback
```

### Complete a task (agent call):

```bash
curl -X PATCH http://localhost:4001/api/tasks/<id>/complete \
  -H "Content-Type: application/json" \
  -H "X-Agent-Name: developer" \
  -d '{"status": "done", "summary": "Implemented feature X"}'
```

## Dev-Tools Integration

Reads plan data from `~/.dev-tools/{project}/plans/` (active + completed).
Reads tool logs from `~/.dev-tools/{project}/logs/*.jsonl`.

## License

MIT
