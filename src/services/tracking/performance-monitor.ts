/**
 * Performance Monitoring Service
 *
 * Tracks and analyzes performance metrics for agents, tools,
 * and system resources. Provides insights for optimization.
 */

import { structuredLogger } from '../logging/structured-logger.js';

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    agents: AgentPerformanceMetrics;
    tools: ToolPerformanceMetrics;
    system: SystemMetrics;
  };
}

export interface AgentPerformanceMetrics {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokensUsed: number;
  byAgentType: Record<string, {
    requests: number;
    averageLatency: number;
    errorRate: number;
  }>;
}

export interface ToolPerformanceMetrics {
  totalCalls: number;
  successRate: number;
  averageLatency: number;
  byTool: Record<string, {
    calls: number;
    successRate: number;
    averageLatency: number;
  }>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  activeSessions: number;
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private agentLatencies: Map<string, number[]> = new Map();
  private toolLatencies: Map<string, number[]> = new Map();
  private agentCounts: Map<string, { success: number; error: number }> = new Map();
  private toolCounts: Map<string, { success: number; error: number }> = new Map();
  private tokenUsage: number[] = [];
  private startTime: Date = new Date();

  /**
   * Track agent execution
   */
  trackAgentExecution(params: {
    agentType: string;
    latencyMs: number;
    success: boolean;
    tokensUsed?: number;
  }): void {
    const { agentType, latencyMs, success, tokensUsed } = params;

    // Track latency
    const latencies = this.agentLatencies.get(agentType) || [];
    latencies.push(latencyMs);
    this.agentLatencies.set(agentType, latencies);

    // Track counts
    const counts = this.agentCounts.get(agentType) || { success: 0, error: 0 };
    if (success) {
      counts.success++;
    } else {
      counts.error++;
    }
    this.agentCounts.set(agentType, counts);

    // Track tokens
    if (tokensUsed) {
      this.tokenUsage.push(tokensUsed);
    }

    // Log to structured logger
    structuredLogger.logMetric({
      metric: 'agent_execution',
      value: latencyMs,
      unit: 'ms',
      tags: {
        agentType,
        success: success.toString(),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Track tool execution
   */
  trackToolExecution(params: {
    toolName: string;
    latencyMs: number;
    success: boolean;
  }): void {
    const { toolName, latencyMs, success } = params;

    // Track latency
    const latencies = this.toolLatencies.get(toolName) || [];
    latencies.push(latencyMs);
    this.toolLatencies.set(toolName, latencies);

    // Track counts
    const counts = this.toolCounts.get(toolName) || { success: 0, error: 0 };
    if (success) {
      counts.success++;
    } else {
      counts.error++;
    }
    this.toolCounts.set(toolName, counts);

    // Log to structured logger
    structuredLogger.logMetric({
      metric: 'tool_execution',
      value: latencyMs,
      unit: 'ms',
      tags: {
        toolName,
        success: success.toString(),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Get current performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      timestamp: new Date(),
      metrics: {
        agents: this.getAgentMetrics(),
        tools: this.getToolMetrics(),
        system: this.getSystemMetrics(),
      },
    };
  }

  /**
   * Get agent performance metrics
   */
  private getAgentMetrics(): AgentPerformanceMetrics {
    let totalRequests = 0;
    let totalSuccess = 0;
    const allLatencies: number[] = [];
    const byAgentType: Record<string, any> = {};

    this.agentCounts.forEach((counts, agentType) => {
      const requests = counts.success + counts.error;
      totalRequests += requests;
      totalSuccess += counts.success;

      const latencies = this.agentLatencies.get(agentType) || [];
      allLatencies.push(...latencies);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      byAgentType[agentType] = {
        requests,
        averageLatency: Math.round(avgLatency),
        errorRate: requests > 0 ? (counts.error / requests) * 100 : 0,
      };
    });

    const sortedLatencies = [...allLatencies].sort((a, b) => a - b);

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0,
      averageLatency: allLatencies.length > 0
        ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
        : 0,
      p95Latency: sortedLatencies.length > 0
        ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
        : 0,
      p99Latency: sortedLatencies.length > 0
        ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
        : 0,
      totalTokensUsed: this.tokenUsage.reduce((a, b) => a + b, 0),
      byAgentType,
    };
  }

  /**
   * Get tool performance metrics
   */
  private getToolMetrics(): ToolPerformanceMetrics {
    let totalCalls = 0;
    let totalSuccess = 0;
    const allLatencies: number[] = [];
    const byTool: Record<string, any> = {};

    this.toolCounts.forEach((counts, toolName) => {
      const calls = counts.success + counts.error;
      totalCalls += calls;
      totalSuccess += counts.success;

      const latencies = this.toolLatencies.get(toolName) || [];
      allLatencies.push(...latencies);

      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

      byTool[toolName] = {
        calls,
        successRate: calls > 0 ? (counts.success / calls) * 100 : 100,
        averageLatency: Math.round(avgLatency),
      };
    });

    return {
      totalCalls,
      successRate: totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100,
      averageLatency: allLatencies.length > 0
        ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
        : 0,
      byTool,
    };
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      memoryUsage: process.memoryUsage(),
      activeConnections: 0, // Will be updated by WebSocket server
      activeSessions: 0, // Will be updated by WebSocket server
    };
  }

  /**
   * Update system metrics (called by external services)
   */
  updateSystemMetrics(params: {
    activeConnections?: number;
    activeSessions?: number;
  }): void {
    // This will be used by WebSocket server to update connection counts
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.agentLatencies.clear();
    this.toolLatencies.clear();
    this.agentCounts.clear();
    this.toolCounts.clear();
    this.tokenUsage = [];
    this.startTime = new Date();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const snapshot = this.getSnapshot();
    const { agents, tools, system } = snapshot.metrics;

    let report = `
═══════════════════════════════════════════════════════
           PERFORMANCE REPORT
═══════════════════════════════════════════════════════
Generated: ${snapshot.timestamp.toISOString()}

📊 AGENT PERFORMANCE
───────────────────────────────────────────────────────
Total Requests:     ${agents.totalRequests}
Success Rate:       ${agents.successRate.toFixed(2)}%
Average Latency:    ${agents.averageLatency}ms
P95 Latency:        ${agents.p95Latency}ms
P99 Latency:        ${agents.p99Latency}ms
Total Tokens Used:  ${agents.totalTokensUsed}

By Agent Type:
`;

    Object.entries(agents.byAgentType).forEach(([type, metrics]) => {
      report += `  ${type}:\n`;
      report += `    Requests: ${metrics.requests}\n`;
      report += `    Avg Latency: ${metrics.averageLatency}ms\n`;
      report += `    Error Rate: ${metrics.errorRate.toFixed(2)}%\n`;
    });

    report += `
🔧 TOOL PERFORMANCE
───────────────────────────────────────────────────────
Total Calls:        ${tools.totalCalls}
Success Rate:       ${tools.successRate.toFixed(2)}%
Average Latency:    ${tools.averageLatency}ms

By Tool:
`;

    Object.entries(tools.byTool).forEach(([name, metrics]) => {
      report += `  ${name}:\n`;
      report += `    Calls: ${metrics.calls}\n`;
      report += `    Success Rate: ${metrics.successRate.toFixed(2)}%\n`;
      report += `    Avg Latency: ${metrics.averageLatency}ms\n`;
    });

    report += `
💻 SYSTEM METRICS
───────────────────────────────────────────────────────
Uptime:             ${Math.floor(system.uptime / 60)}m ${system.uptime % 60}s
Memory (RSS):       ${Math.round(system.memoryUsage.rss / 1024 / 1024)}MB
Memory (Heap):      ${Math.round(system.memoryUsage.heapUsed / 1024 / 1024)}MB
Active Connections: ${system.activeConnections}
Active Sessions:    ${system.activeSessions}

═══════════════════════════════════════════════════════
`;

    return report;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-report every 10 minutes
setInterval(() => {
  const report = performanceMonitor.generateReport();
  console.log(report);
}, 10 * 60 * 1000);
