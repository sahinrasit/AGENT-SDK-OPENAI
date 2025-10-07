# Multi-stage Docker build for IBM Tech Agent Platform

# Stage 1: Base Node.js environment
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Install pnpm globally
RUN npm install -g pnpm@10.16.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Stage 2: Dependencies installation
FROM base AS dependencies

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Stage 3: Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Stage 4: Production dependencies
FROM base AS production-deps

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Stage 5: Production image
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ibtech -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=production-deps --chown=ibtech:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=ibtech:nodejs /app/dist ./dist
COPY --from=build --chown=ibtech:nodejs /app/package.json ./package.json

# Copy sample files
COPY --chown=ibtech:nodejs ./sample_files ./sample_files

# Create logs directory
RUN mkdir -p /app/logs && chown ibtech:nodejs /app/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER ibtech

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server/websocket-server.js"]

# Stage 6: Development image
FROM dependencies AS development

# Install development tools
RUN apk add --no-cache \
    bash \
    vim \
    && rm -rf /var/cache/apk/*

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose ports for development
EXPOSE 3000 9229

# Start in development mode with debugging
CMD ["pnpm", "dev"]