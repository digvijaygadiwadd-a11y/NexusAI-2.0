# NexusAI Production Deployment Guide

This guide details running and orchestrating NexusAI in production environments using Docker, Kubernetes, or Cloud Run.

---

## 1. Environment Variables

All configuration is managed through standard environment variables declared in `.env`:

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Application environment | `production` |
| `PORT` | Yes | External application ingress port | `3000` |
| `DATABASE_URL` | Optional | PostgreSQL connection string | Defaults to internal persistent store |
| `REDIS_URL` | Optional | Redis connection string for caching | N/A |
| `JWT_SECRET` | Yes | Secret signing key for JWT session tokens | Must be set to a strong secret |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI reasoning | Server-side only |

---

## 2. Docker Compose Deployment

NexusAI includes a multi-service `docker-compose.yml` pre-configured with PostgreSQL and Redis:

```bash
# 1. Clone repository and navigate to root
cd nexusai

# 2. Configure production secrets in .env
cat <<EOF > .env
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -hex 32)
GEMINI_API_KEY=your_gemini_key_here
EOF

# 3. Start services in detached mode
docker-compose up -d --build

# 4. Verify container health
docker-compose ps
```

The system will start:
- **`app`**: Node.js 22 alpine container running the built React 19 frontend & Express backend.
- **`postgres`**: PostgreSQL 16 database for durable storage of datasets, schemas, and audit logs.
- **`redis`**: Redis 7 instance for distributed event pub/sub.

---

## 3. Production Health Checks

The platform includes a dedicated health endpoint at `/api/health` checking database connectivity, memory utilization, and worker uptime:

```bash
curl -s http://localhost:3000/api/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "engine": "PostgreSQL",
    "isProductionReady": true
  },
  "uptimeSeconds": 1420,
  "memory": {
    "rssMb": 64.2,
    "heapUsedMb": 38.5
  }
}
```
