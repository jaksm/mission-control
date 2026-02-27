# Mission Control — Deployment Guide

## Cloudflare Setup (Manual Steps)

### 1. DNS Records
In Cloudflare Dashboard → jaksm.dev → DNS:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | jaksa-mc | 51fbb986-1095-4c1d-9f1c-c44fa835675a.cfargotunnel.com | ✅ Proxied |
| CNAME | aleksa-mc | 51fbb986-1095-4c1d-9f1c-c44fa835675a.cfargotunnel.com | ✅ Proxied |

### 2. Cloudflare Access Policies
In Cloudflare Zero Trust → Access → Applications:

**Application: Mission Control — Jakša**
- Type: Self-hosted
- Application domain: `jaksa-mc.jaksm.dev`
- Session duration: 24h
- Policy: Allow
  - Include: Email = jaksa's email
  - (Add more emails as needed)

**Application: Mission Control — Aleksa**
- Type: Self-hosted
- Application domain: `aleksa-mc.jaksm.dev`
- Session duration: 24h
- Policy: Allow
  - Include: Email = aleksa's email

### 3. Tunnel Config
Already configured in `~/.cloudflared/config.yml`:
```yaml
- hostname: jaksa-mc.jaksm.dev
  service: http://localhost:4001
- hostname: aleksa-mc.jaksm.dev
  service: http://localhost:4002
```

### 4. Restart Tunnel
```bash
# If running as service:
sudo cloudflared service restart

# If running manually:
cloudflared tunnel run
```

## Docker Deployment

### Prerequisites
- Docker + Docker Compose installed
- `.env` file created from `.env.docker.example`

### Start
```bash
cd ~/Projects/jaksa/mission-control
cp .env.docker.example .env
# Fill in gateway tokens and MC API tokens
docker compose up -d --build
```

### Verify
```bash
curl http://localhost:4001/api/openclaw/status  # Jakša
curl http://localhost:4002/api/openclaw/status  # Aleksa
```

## Local Development (No Docker)

```bash
cd ~/Projects/jaksa/mission-control
npm install
npm run db:seed
npm run build
npx next start -p 4001
```

Note: `npm run dev` consumes 7GB+ RAM on cold compile. Use production build.
