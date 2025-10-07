import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import express, { Request, Response } from 'express';

export function createHealthCheckServer() {
  const app = express();

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };

    logger.info('Health check requested', { healthCheck });
    res.status(200).json(healthCheck);
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', (req: Request, res: Response) => {
    const metrics = {
      http_requests_total: 0,
      http_request_duration_seconds: 0,
      nodejs_heap_size_total_bytes: process.memoryUsage().heapTotal,
      nodejs_heap_size_used_bytes: process.memoryUsage().heapUsed,
      nodejs_external_memory_bytes: process.memoryUsage().external,
      nodejs_heap_space_size_total_bytes: process.memoryUsage().heapTotal,
      nodejs_heap_space_size_used_bytes: process.memoryUsage().heapUsed,
      nodejs_heap_space_size_available_bytes: process.memoryUsage().heapTotal - process.memoryUsage().heapUsed,
      nodejs_version_info: process.version,
      process_start_time_seconds: Math.floor(process.uptime()),
      process_cpu_user_seconds_total: process.cpuUsage().user / 1000000,
      process_cpu_system_seconds_total: process.cpuUsage().system / 1000000,
    };

    const prometheusFormat = Object.entries(metrics)
      .map(([key, value]) => `${key} ${value}`)
      .join('\n');

    res.set('Content-Type', 'text/plain');
    res.send(prometheusFormat);
  });

  // Readiness probe
  app.get('/ready', (req: Request, res: Response) => {
    // Add your readiness checks here
    const isReady = true; // Replace with actual readiness logic
    
    if (isReady) {
      res.status(200).json({ status: 'Ready' });
    } else {
      res.status(503).json({ status: 'Not Ready' });
    }
  });

  // Liveness probe
  app.get('/live', (req: Request, res: Response) => {
    // Add your liveness checks here
    const isAlive = true; // Replace with actual liveness logic
    
    if (isAlive) {
      res.status(200).json({ status: 'Alive' });
    } else {
      res.status(503).json({ status: 'Not Alive' });
    }
  });

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Health check server running on port ${env.PORT}`);
  });

  return server;
}
