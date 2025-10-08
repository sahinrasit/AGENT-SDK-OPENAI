/**
 * Request Tracking Middleware
 *
 * Tracks all incoming requests/responses with unique IDs for debugging,
 * monitoring, and analytics. Integrates with StructuredLogger.
 */

import { v4 as uuidv4 } from 'uuid';
import { structuredLogger } from '../services/logging/structured-logger.js';

export interface TrackedRequest {
  id: string;
  sessionId?: string;
  userId?: string;
  type: 'websocket' | 'http';
  event?: string;
  data?: any;
  startTime: Date;
  clientId?: string;
  ip?: string;
}

export interface TrackedResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  latencyMs: number;
  endTime: Date;
}

/**
 * Request Tracker Class
 * Manages request/response lifecycle tracking
 */
export class RequestTracker {
  private activeRequests: Map<string, TrackedRequest> = new Map();
  private requestHistory: TrackedRequest[] = [];
  private readonly MAX_HISTORY = 1000;

  /**
   * Start tracking a new request
   */
  startRequest(params: {
    sessionId?: string;
    userId?: string;
    type: 'websocket' | 'http';
    event?: string;
    data?: any;
    clientId?: string;
    ip?: string;
  }): string {
    const requestId = uuidv4();
    const request: TrackedRequest = {
      id: requestId,
      ...params,
      startTime: new Date(),
    };

    this.activeRequests.set(requestId, request);

    // Log request start
    structuredLogger.logMetric({
      metric: 'requests_started',
      value: 1,
      unit: 'count',
      tags: {
        type: params.type,
        event: params.event || 'unknown',
      },
      timestamp: request.startTime,
    });

    return requestId;
  }

  /**
   * Complete request tracking
   */
  completeRequest(params: {
    requestId: string;
    success: boolean;
    data?: any;
    error?: string;
  }): TrackedResponse {
    const request = this.activeRequests.get(params.requestId);
    if (!request) {
      console.warn(`Request ${params.requestId} not found in tracker`);
      return {
        requestId: params.requestId,
        success: params.success,
        data: params.data,
        error: params.error,
        latencyMs: 0,
        endTime: new Date(),
      };
    }

    const endTime = new Date();
    const latencyMs = endTime.getTime() - request.startTime.getTime();

    const response: TrackedResponse = {
      requestId: params.requestId,
      success: params.success,
      data: params.data,
      error: params.error,
      latencyMs,
      endTime,
    };

    // Remove from active requests
    this.activeRequests.delete(params.requestId);

    // Add to history (with rotation)
    this.addToHistory(request);

    // Log completion
    structuredLogger.logMetric({
      metric: params.success ? 'requests_completed' : 'requests_failed',
      value: 1,
      unit: 'count',
      tags: {
        type: request.type,
        event: request.event || 'unknown',
      },
      timestamp: endTime,
    });

    structuredLogger.logMetric({
      metric: 'request_latency',
      value: latencyMs,
      unit: 'ms',
      tags: {
        type: request.type,
        event: request.event || 'unknown',
      },
      timestamp: endTime,
    });

    return response;
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): TrackedRequest | undefined {
    return this.activeRequests.get(requestId);
  }

  /**
   * Get all active requests
   */
  getActiveRequests(): TrackedRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get request history
   */
  getHistory(limit?: number): TrackedRequest[] {
    return limit
      ? this.requestHistory.slice(0, limit)
      : [...this.requestHistory];
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeRequests: number;
    totalHistorySize: number;
    oldestActiveRequest?: Date;
    averageLatency?: number;
  } {
    const active = this.getActiveRequests();
    const oldest = active.length > 0
      ? active.reduce((min, req) =>
          req.startTime < min ? req.startTime : min,
        active[0].startTime)
      : undefined;

    return {
      activeRequests: active.length,
      totalHistorySize: this.requestHistory.length,
      oldestActiveRequest: oldest,
    };
  }

  /**
   * Clean up old active requests (prevent memory leak)
   */
  cleanupStaleRequests(timeoutMs: number = 300000): number {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [id, request] of this.activeRequests.entries()) {
      const age = now - request.startTime.getTime();
      if (age > timeoutMs) {
        this.activeRequests.delete(id);
        cleaned++;

        structuredLogger.logError({
          requestId: id,
          sessionId: request.sessionId,
          error: new Error('Request timeout'),
          context: {
            requestType: request.type,
            event: request.event,
            ageMs: age,
          },
          severity: 'medium',
          timestamp: new Date(),
        });
      }
    }

    return cleaned;
  }

  // Private methods

  private addToHistory(request: TrackedRequest): void {
    this.requestHistory.unshift(request);

    // Rotate history if too large
    if (this.requestHistory.length > this.MAX_HISTORY) {
      this.requestHistory = this.requestHistory.slice(0, this.MAX_HISTORY);
    }
  }
}

// Singleton instance
export const requestTracker = new RequestTracker();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = requestTracker.cleanupStaleRequests();
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} stale requests`);
  }
}, 5 * 60 * 1000);
