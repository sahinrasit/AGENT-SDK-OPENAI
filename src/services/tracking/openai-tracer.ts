/**
 * OpenAI Tracing Integration
 *
 * Integrates with OpenAI's built-in tracing system for
 * detailed agent execution monitoring and debugging.
 *
 * @see https://openai.github.io/openai-agents-js/guides/tracing
 */

import { setTraceConfig, getTraceConfig } from '@openai/agents';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface TracingConfig {
  enabled: boolean;
  endpoint?: string;
  headers?: Record<string, string>;
  samplingRate?: number;
  includeInputs?: boolean;
  includeOutputs?: boolean;
  includeToolCalls?: boolean;
}

/**
 * OpenAI Tracer Class
 * Manages OpenAI Agents SDK tracing configuration
 */
export class OpenAITracer {
  private config: TracingConfig;

  constructor(config?: Partial<TracingConfig>) {
    this.config = {
      enabled: env.ENABLE_TRACING || false,
      endpoint: process.env.TRACE_ENDPOINT,
      samplingRate: 1.0, // 100% sampling by default
      includeInputs: true,
      includeOutputs: true,
      includeToolCalls: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize OpenAI tracing
   */
  private initialize(): void {
    if (!this.config.enabled) {
      logger.info('🔍 OpenAI tracing is disabled');
      return;
    }

    try {
      const traceConfig: any = {
        enabled: true,
      };

      // Add endpoint if configured
      if (this.config.endpoint) {
        traceConfig.endpoint = this.config.endpoint;
      }

      // Add headers if configured
      if (this.config.headers) {
        traceConfig.headers = this.config.headers;
      }

      // Configure trace settings
      setTraceConfig(traceConfig);

      logger.info('✅ OpenAI tracing initialized', {
        enabled: this.config.enabled,
        endpoint: this.config.endpoint || 'default',
        samplingRate: this.config.samplingRate,
      });
    } catch (error) {
      logger.error('❌ Failed to initialize OpenAI tracing:', error);
    }
  }

  /**
   * Get current tracing configuration
   */
  getConfig(): TracingConfig {
    return { ...this.config };
  }

  /**
   * Update tracing configuration
   */
  updateConfig(updates: Partial<TracingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.initialize();
  }

  /**
   * Enable tracing
   */
  enable(): void {
    this.config.enabled = true;
    this.initialize();
  }

  /**
   * Disable tracing
   */
  disable(): void {
    this.config.enabled = false;
    setTraceConfig({ enabled: false });
    logger.info('🔍 OpenAI tracing disabled');
  }

  /**
   * Create a trace context for a specific request
   */
  createTraceContext(params: {
    requestId: string;
    userId?: string;
    sessionId?: string;
    agentType?: string;
  }): Record<string, any> {
    return {
      requestId: params.requestId,
      userId: params.userId,
      sessionId: params.sessionId,
      agentType: params.agentType,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sample a trace based on sampling rate
   */
  shouldTrace(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < (this.config.samplingRate || 1.0);
  }

  /**
   * Log trace information
   */
  logTrace(params: {
    traceId: string;
    spanId?: string;
    operation: string;
    status: 'success' | 'error';
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.config.enabled) return;

    logger.info('🔍 Trace Event', {
      type: 'trace',
      ...params,
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton instance
export const openaiTracer = new OpenAITracer();

// Export helper functions for convenience
export const enableTracing = () => openaiTracer.enable();
export const disableTracing = () => openaiTracer.disable();
export const getTracingConfig = () => openaiTracer.getConfig();
export const shouldTrace = () => openaiTracer.shouldTrace();
