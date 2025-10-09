# 🚀 IBTech Agent Platform - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [PM2 Deployment](#pm2-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: 20+ (LTS recommended)
- **pnpm**: 10.16.1 or higher
- **Docker**: 24+ (for containerized deployment)
- **PostgreSQL**: 16+ (for production)
- **Redis**: 7+ (for caching and sessions)

### Optional Tools
- **PM2**: Process manager for Node.js
- **Nginx**: Reverse proxy and load balancer
- **Prometheus + Grafana**: Monitoring and visualization

---

## Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd ibtech-agent
pnpm install
```

### 2. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your OpenAI API key
nano .env
```

### 3. Start Development Servers

```bash
# Start backend only
pnpm start:websocket-server

# Start frontend only
pnpm start:web

# Start both (recommended)
pnpm start:fullstack
```

### 4. Access the Application

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## Production Deployment

### Step 1: Prepare Environment

```bash
# Create production environment file
cp .env.example .env.production

# Edit production settings
nano .env.production
```

**Critical Environment Variables:**
```env
NODE_ENV=production
OPENAI_API_KEY=sk-proj-...your-key
OPENAI_MODEL=gpt-4o
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/ibtech_agent
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>
```

### Step 2: Build Application

```bash
# Install production dependencies
pnpm install --prod=false

# Build TypeScript
pnpm build

# Verify build
ls -la dist/
```

### Step 3: Database Setup

```bash
# Create PostgreSQL database
createdb ibtech_agent

# Run migrations (if applicable)
# pnpm migrate:prod
```

### Step 4: Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Step 5: Configure Nginx

```nginx
# /etc/nginx/sites-available/ibtech-agent

upstream ibtech_backend {
    least_conn;
    server localhost:3000 weight=10 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location / {
        proxy_pass http://ibtech_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://ibtech_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://ibtech_backend/health;
        access_log off;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/ibtech-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Docker Deployment

### Quick Start

```bash
# Copy and configure environment
cp .env.example .env.production

# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f ibtech-agent

# Stop all services
docker-compose down
```

### Production Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps

# View specific service logs
docker-compose logs -f ibtech-agent
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Docker Commands

```bash
# Rebuild specific service
docker-compose build ibtech-agent

# Restart service
docker-compose restart ibtech-agent

# Scale backend (multiple instances)
docker-compose up -d --scale ibtech-agent=3

# Execute command in container
docker-compose exec ibtech-agent sh

# View resource usage
docker stats
```

---

## PM2 Deployment

### Local PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs ibtech-agent-server

# Restart application
pm2 restart ibtech-agent-server

# Stop application
pm2 stop ibtech-agent-server

# Delete from PM2
pm2 delete ibtech-agent-server
```

### Remote Deployment with PM2

```bash
# Setup deployment (first time)
pm2 deploy ecosystem.config.js production setup

# Deploy updates
pm2 deploy ecosystem.config.js production

# Revert deployment
pm2 deploy ecosystem.config.js production revert 1

# Execute commands on remote
pm2 deploy ecosystem.config.js production exec "pm2 reload all"
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 web

# Generate startup script
pm2 startup
pm2 save
```

---

## Monitoring Setup

### Prometheus + Grafana Stack

```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana
# URL: http://localhost:3001
# Default credentials: admin / admin123

# Access Prometheus
# URL: http://localhost:9090
```

### Application Metrics

The application exposes metrics at:
```
http://localhost:9464/metrics
```

**Available Metrics:**
- `ibtech_agent_requests_total` - Total requests
- `ibtech_agent_requests_duration_seconds` - Request duration
- `ibtech_agent_active_sessions` - Active WebSocket sessions
- `ibtech_tool_executions_total` - Tool execution count
- `ibtech_tool_errors_total` - Tool error count

### Log Aggregation with Loki

```bash
# View logs in Grafana
# Add Loki datasource: http://loki:3100

# Query examples:
# {job="ibtech-agent"} |= "error"
# {job="ibtech-agent"} | json | level="error"
# {job="ibtech-agent",agentType="triage"}
```

---

## Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/staging/production) | development | Yes |
| `PORT` | HTTP server port | 3000 | Yes |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `OPENAI_MODEL` | Model name | gpt-4o-mini | No |

### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes (prod) |
| `DATABASE_POOL_MIN` | Min pool connections | 2 | No |
| `DATABASE_POOL_MAX` | Max pool connections | 10 | No |

### Redis

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection string | redis://localhost:6379 | Yes (prod) |
| `REDIS_PASSWORD` | Redis password | - | No |
| `REDIS_TTL` | Cache TTL in seconds | 3600 | No |

### Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret | - | Yes (prod) |
| `SESSION_SECRET` | Session encryption secret | - | Yes (prod) |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 | No |

### Monitoring

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENABLE_TRACING` | Enable OpenAI tracing | true | No |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | info | No |
| `METRICS_ENABLED` | Enable Prometheus metrics | true | No |

---

## Health Checks

### Application Health

```bash
# Basic health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-09T...",
  "uptime": 12345,
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Service Monitoring

```bash
# Check WebSocket connection
wscat -c ws://localhost:3000

# Check Prometheus metrics
curl http://localhost:9464/metrics

# Check PM2 status
pm2 status

# Check Docker containers
docker-compose ps
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use pnpm script
pnpm stop:all
```

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d ibtech_agent

# Check environment variable
echo $DATABASE_URL
```

#### High Memory Usage
```bash
# Check PM2 memory
pm2 list

# Restart with max memory limit
pm2 restart ibtech-agent-server --max-memory-restart 1G

# Monitor in real-time
pm2 monit
```

#### WebSocket Connection Issues
```bash
# Check nginx WebSocket proxy
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Test direct WebSocket connection
wscat -c ws://localhost:3000

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp
```

### Logs

```bash
# Application logs
pm2 logs ibtech-agent-server

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f --tail=100 ibtech-agent

# System logs
journalctl -u ibtech-agent -f
```

### Performance Debugging

```bash
# Generate flame graph
pm2 start ecosystem.config.js --node-args="--prof"

# Heap snapshot
node --inspect dist/server/websocket-server.js

# Check event loop lag
pm2 install pm2-server-monit
```

---

## Security Checklist

- [ ] Change default passwords in `.env.production`
- [ ] Generate strong JWT and session secrets
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable firewall (ufw/iptables)
- [ ] Keep dependencies updated
- [ ] Regular security audits (`pnpm audit`)
- [ ] Implement backup strategy
- [ ] Monitor logs for suspicious activity

---

## Backup & Recovery

### Database Backup

```bash
# Manual backup
pg_dump -U postgres ibtech_agent > backup_$(date +%Y%m%d).sql

# Automated backup (cron)
0 2 * * * /usr/bin/pg_dump -U postgres ibtech_agent > /backups/db_$(date +\%Y\%m\%d).sql
```

### Restore Database

```bash
# Restore from backup
psql -U postgres ibtech_agent < backup_20250109.sql
```

---

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@yourdomain.com

---

**Last Updated**: 2025-01-09
**Version**: 1.0.0
