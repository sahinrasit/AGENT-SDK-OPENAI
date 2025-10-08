/**
 * Structured Logger Service
 *
 * Enterprise-grade logging with structured data, request tracking,
 * and comprehensive event logging for debugging and monitoring.
 *
 * Features:
 * - Request/Response tracking with unique IDs
 * - Agent execution logging
 * - Tool execution logging
 * - Error tracking with context
 * - Performance metrics
 * - JSON structured output
 */

import { logger as baseLogger } from '../../utils/logger.js';

export interface AgentRequestLog {
  requestId: string;
  userId: string;
  sessionId: string;
  agentType: string;
  agentName?: string;
  input: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface AgentResponseLog {
  requestId: string;
  sessionId: string;
  output: string;
  tokensUsed?: number;
  latencyMs: number;
  toolCallsCount: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ToolExecutionLog {
  requestId: string;
  sessionId: string;
  toolName: string;
  parameters: any;
  result?: any;
  success: boolean;
  error?: string;
  latencyMs: number;
  timestamp: Date;
}

export interface ErrorLog {
  requestId: string;
  sessionId?: string;
  error: Error;
  stack?: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes';
  tags?: Record<string, string>;
  timestamp: Date;
}

/**
 * Structured Logger Class
 * Provides comprehensive logging capabilities with structured data
 */
export class StructuredLogger {
  private metrics: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  /**
   * Log agent request with full context
   */
  logAgentRequest(params: AgentRequestLog): void {
    const logData = {
      type: 'agent_request',
      ...params,
      timestamp: params.timestamp.toISOString(),
    };

    baseLogger.info('📨 Agent Request', logData);

    // Store for metrics
    this.incrementMetric('agent_requests_total');
    this.incrementMetric(`agent_requests_${params.agentType}`);
  }

  /**
   * Log agent response with performance data
   */
  logAgentResponse(params: AgentResponseLog): void {
    const logData = {
      type: 'agent_response',
      ...params,
      timestamp: params.timestamp.toISOString(),
    };

    if (params.success) {
      baseLogger.info('✅ Agent Response', logData);
    } else {
      baseLogger.error('❌ Agent Response Failed', logData);
      this.incrementMetric('agent_errors_total');
    }

    // Store latency metrics
    this.recordMetric('agent_latency_ms', params.latencyMs);

    if (params.tokensUsed) {
      this.recordMetric('tokens_used', params.tokensUsed);
    }
  }

  /**
   * Log tool execution with detailed parameters and results
   */
  logToolExecution(params: ToolExecutionLog): void {
    const logData = {
      type: 'tool_execution',
      ...params,
      // Truncate large parameters/results for logging
      parameters: this.truncateForLog(params.parameters),
      result: params.result ? this.truncateForLog(params.result) : undefined,
      timestamp: params.timestamp.toISOString(),
    };

    if (params.success) {
      baseLogger.info(`🔧 Tool: ${params.toolName}`, logData);
    } else {
      baseLogger.error(`❌ Tool Failed: ${params.toolName}`, logData);
      this.incrementMetric(`tool_errors_${params.toolName}`);
    }

    // Store tool metrics
    this.incrementMetric(`tool_calls_${params.toolName}`);
    this.recordMetric(`tool_latency_${params.toolName}`, params.latencyMs);
  }

  /**
   * Log errors with full context and stack traces
   */
  logError(params: ErrorLog): void {
    const logData = {
      type: 'error',
      requestId: params.requestId,
      sessionId: params.sessionId,
      errorName: params.error.name,
      errorMessage: params.error.message,
      stack: params.stack || params.error.stack,
      context: params.context,
      severity: params.severity,
      timestamp: params.timestamp.toISOString(),
    };

    switch (params.severity) {
      case 'critical':
        baseLogger.error('🚨 CRITICAL ERROR', logData);
        break;
      case 'high':
        baseLogger.error('⚠️ High Severity Error', logData);
        break;
      case 'medium':
        baseLogger.warn('⚡ Medium Severity Error', logData);
        break;
      case 'low':
        baseLogger.info('ℹ️ Low Severity Error', logData);
        break;
    }

    // Track error counts
    const errorKey = `${params.error.name}_${params.severity}`;
    this.incrementErrorCount(errorKey);
  }

  /**
   * Log performance metrics
   */
  logMetric(params: PerformanceMetric): void {
    const logData = {
      type: 'metric',
      ...params,
      timestamp: params.timestamp.toISOString(),
    };

    baseLogger.info(`📊 Metric: ${params.metric}`, logData);
    this.recordMetric(params.metric, params.value);
  }

  /**
   * Log WebSocket events
   */
  logWebSocketEvent(event: 'connect' | 'disconnect' | 'error', data: Record<string, any>): void {
    const logData = {
      type: 'websocket_event',
      event,
      ...data,
      timestamp: new Date().toISOString(),
    };

    switch (event) {
      case 'connect':
        baseLogger.info('🔌 WebSocket Connected', logData);
        this.incrementMetric('websocket_connections');
        break;
      case 'disconnect':
        baseLogger.info('🔌 WebSocket Disconnected', logData);
        this.incrementMetric('websocket_disconnections');
        break;
      case 'error':
        baseLogger.error('❌ WebSocket Error', logData);
        this.incrementMetric('websocket_errors');
        break;
    }
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): Record<string, any> {
    const aggregated: Record<string, any> = {};

    // Convert Map to object with stats
    this.metrics.forEach((values, key) => {
      if (values.length === 0) return;

      const sorted = [...values].sort((a, b) => a - b);
      aggregated[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    });

    return {
      metrics: aggregated,
      errorCounts: Object.fromEntries(this.errorCounts),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics (useful for periodic reporting)
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.errorCounts.clear();
  }

  /**
   * Export logs as JSON (for external systems)
   */
  exportLogs(filters?: { startTime?: Date; endTime?: Date; type?: string }): string {
    // This would integrate with a log storage system
    // For now, return current metrics
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  // Private helper methods

  private incrementMetric(key: string): void {
    const current = this.metrics.get(key) || [];
    current.push(1);
    this.metrics.set(key, current);
  }

  private recordMetric(key: string, value: number): void {
    const current = this.metrics.get(key) || [];
    current.push(value);
    this.metrics.set(key, current);
  }

  private incrementErrorCount(key: string): void {
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private truncateForLog(data: any, maxLength: number = 500): any {
    const str = JSON.stringify(data);
    if (str.length <= maxLength) {
      return data;
    }

    return {
      _truncated: true,
      _originalLength: str.length,
      preview: str.substring(0, maxLength) + '...',
    };
  }
}

// Singleton instance
export const structuredLogger = new StructuredLogger();
