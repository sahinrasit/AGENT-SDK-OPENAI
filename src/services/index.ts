/**
 * Services Index
 * Centralized export of all services
 */

// Logging Services
export { structuredLogger, StructuredLogger } from './logging/structured-logger.js';
export type {
  AgentRequestLog,
  AgentResponseLog,
  ToolExecutionLog,
  ErrorLog,
  PerformanceMetric,
} from './logging/structured-logger.js';

// Tracking Services
export { performanceMonitor, PerformanceMonitor } from './tracking/performance-monitor.js';
export type {
  PerformanceSnapshot,
  AgentPerformanceMetrics,
  ToolPerformanceMetrics,
  SystemMetrics,
} from './tracking/performance-monitor.js';

export { openaiTracer, OpenAITracer, enableTracing, disableTracing, getTracingConfig, shouldTrace } from './tracking/openai-tracer.js';
export type { TracingConfig } from './tracking/openai-tracer.js';

// Middleware
export { requestTracker, RequestTracker } from '../middleware/request-tracker.js';
export type { TrackedRequest, TrackedResponse } from '../middleware/request-tracker.js';
