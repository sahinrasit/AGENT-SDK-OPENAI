# IBM Tech Agent Platform - Deployment Guide

Production deployment guide for the IBM Tech Agent Platform built with OpenAI Agents SDK.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security](#security)
7. [Scaling](#scaling)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker**: 24.0+ with Docker Compose v2
- **Kubernetes**: 1.28+ (for K8s deployment)
- **kubectl**: Latest version
- **Helm**: 3.0+ (optional)
- **Node.js**: 20+ (for local development)
- **pnpm**: 10.16.1+

### Required Credentials

- OpenAI API Key (with sufficient credits)
- Domain name (for production)
- SSL certificates (can use Let's Encrypt)

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd ibtech-agent
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ENABLE_TRACING=true

# Database
POSTGRES_URL=postgresql://postgres:password@postgres:5432/ibtech_agent
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-secret-key-here

# MCP Configuration
MCP_FILESYSTEM_PATH=/app/sample_files
```

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f ibtech-agent

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Docker Compose

```bash
# Start with production configuration
docker-compose -f docker-compose.yml up -d

# Check service health
docker-compose ps

# Scale backend services
docker-compose up -d --scale ibtech-agent=3
```

### Access Services

- **Web Interface**: http://localhost (port 80)
- **Backend API**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Configure Secrets

Update `k8s/secrets.yaml` with actual values:

```bash
# Encode your OpenAI API key
echo -n "sk-proj-your-actual-key" | base64

# Apply secrets
kubectl apply -f k8s/secrets.yaml
```

### 3. Deploy Infrastructure

```bash
# Deploy ConfigMaps
kubectl apply -f k8s/configmap.yaml

# Deploy Persistent Volume Claims
kubectl apply -f k8s/pvc.yaml

# Deploy services
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/services.yaml
```

### 4. Deploy Applications

```bash
# Deploy backend and frontend
kubectl apply -f k8s/deployment.yaml

# Deploy monitoring stack
kubectl apply -f k8s/monitoring-deployments.yaml
kubectl apply -f k8s/monitoring-services.yaml
kubectl apply -f k8s/monitoring-configs.yaml
```

### 5. Configure Ingress

Update domain in `k8s/ingress.yaml`, then:

```bash
kubectl apply -f k8s/ingress.yaml
```

### 6. Verify Deployment

```bash
# Check pod status
kubectl get pods -n ibtech-agent

# Check services
kubectl get svc -n ibtech-agent

# Check ingress
kubectl get ingress -n ibtech-agent

# View logs
kubectl logs -f deployment/ibtech-agent-backend -n ibtech-agent
```

## Building Docker Images

### Backend Image

```bash
# Build production image
docker build -t ibtech-agent:latest .

# Build development image
docker build --target development -t ibtech-agent:dev .

# Push to registry
docker tag ibtech-agent:latest your-registry/ibtech-agent:latest
docker push your-registry/ibtech-agent:latest
```

### Frontend Image

```bash
cd web

# Build production image
docker build -t ibtech-agent-web:latest .

# Build development image
docker build --target development -t ibtech-agent-web:dev .

# Push to registry
docker tag ibtech-agent-web:latest your-registry/ibtech-agent-web:latest
docker push your-registry/ibtech-agent-web:latest
```

## Monitoring & Observability

### Grafana Dashboards

1. Access Grafana at http://localhost:3001
2. Login with `admin/admin123`
3. Import dashboards from `monitoring/grafana/dashboards/`

### Prometheus Metrics

Available metrics endpoints:
- Application metrics: http://localhost:3000/metrics
- System metrics: http://localhost:9100/metrics
- Nginx metrics: http://localhost:9113/metrics

### Log Aggregation with Loki

Query logs in Grafana using LogQL:

```logql
{service="ibtech-agent"} |= "error"
{service="ibtech-agent", level="info"} | json
```

### Alerting

Configure alerts in `monitoring/prometheus.yml`:

```yaml
rule_files:
  - "rules/alerts.yml"
```

## Security

### SSL/TLS Configuration

#### Self-Signed Certificate (Development)

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

#### Let's Encrypt (Production)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/cert-manager-issuer.yaml
```

### Network Security

```bash
# Create network policies
kubectl apply -f k8s/network-policy.yaml
```

### Secrets Management

```bash
# Use sealed secrets for production
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal a secret
kubeseal -f k8s/secrets.yaml -w k8s/sealed-secrets.yaml
```

## Scaling

### Horizontal Pod Autoscaling

```bash
# Create HPA
kubectl autoscale deployment ibtech-agent-backend \
  --namespace ibtech-agent \
  --cpu-percent=70 \
  --min=3 \
  --max=10
```

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment ibtech-agent-backend \
  --namespace ibtech-agent \
  --replicas=5

# Scale frontend
kubectl scale deployment ibtech-agent-frontend \
  --namespace ibtech-agent \
  --replicas=3
```

### Database Scaling

For PostgreSQL high availability:

```bash
# Deploy with Patroni or PostgreSQL Operator
kubectl apply -f k8s/postgres-ha.yaml
```

### Redis Scaling

For Redis clustering:

```bash
# Deploy Redis Cluster
kubectl apply -f k8s/redis-cluster.yaml
```

## Health Checks

### Application Health

```bash
# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost/health

# Kubernetes health probes
kubectl describe pod <pod-name> -n ibtech-agent
```

### Database Health

```bash
# PostgreSQL
kubectl exec -it deployment/postgres -n ibtech-agent -- psql -U postgres -c "SELECT 1"

# Redis
kubectl exec -it deployment/redis -n ibtech-agent -- redis-cli ping
```

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
kubectl exec deployment/postgres -n ibtech-agent -- \
  pg_dump -U postgres ibtech_agent > backup.sql

# Restore PostgreSQL
kubectl exec -i deployment/postgres -n ibtech-agent -- \
  psql -U postgres ibtech_agent < backup.sql
```

### Volume Snapshots

```bash
# Create volume snapshot
kubectl apply -f k8s/volume-snapshot.yaml
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check events
kubectl describe pod <pod-name> -n ibtech-agent

# Check logs
kubectl logs <pod-name> -n ibtech-agent --previous
```

#### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -- \
  psql postgresql://postgres:password@postgres.ibtech-agent:5432/ibtech_agent
```

#### WebSocket Issues

Check nginx configuration for WebSocket support:

```bash
kubectl logs deployment/nginx -n ibtech-agent
```

### Performance Tuning

```bash
# Check resource usage
kubectl top pods -n ibtech-agent
kubectl top nodes

# Adjust resource limits
kubectl edit deployment ibtech-agent-backend -n ibtech-agent
```

### Debug Mode

Enable debug logging:

```bash
kubectl set env deployment/ibtech-agent-backend \
  -n ibtech-agent \
  LOG_LEVEL=debug
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t ibtech-agent:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag ibtech-agent:${{ github.sha }} ${{ secrets.REGISTRY }}/ibtech-agent:latest
          docker push ${{ secrets.REGISTRY }}/ibtech-agent:latest

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/ibtech-agent-backend \
            ibtech-agent=${{ secrets.REGISTRY }}/ibtech-agent:latest \
            -n ibtech-agent
```

## Production Checklist

- [ ] Update all default passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Configure resource limits
- [ ] Set up horizontal pod autoscaling
- [ ] Configure network policies
- [ ] Set up ingress with rate limiting
- [ ] Configure database connection pooling
- [ ] Set up health checks
- [ ] Configure graceful shutdown
- [ ] Set up CI/CD pipeline
- [ ] Document runbooks
- [ ] Configure disaster recovery

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: See ROADMAP.md for feature details
- OpenAI Agents SDK: https://openai.github.io/openai-agents-js/
