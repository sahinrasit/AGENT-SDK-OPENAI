import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

// Approval request schema
const approvalRequestSchema = z.object({
  id: z.string(),
  type: z.enum(['tool_execution', 'data_access', 'external_api', 'sensitive_operation']),
  agentName: z.string(),
  operation: z.string(),
  description: z.string(),
  context: z.record(z.any()),
  sensitivity: z.enum(['low', 'medium', 'high', 'critical']),
  timeout: z.number().default(300000), // 5 minutes default
  requiredApprovers: z.number().default(1),
  metadata: z.record(z.any()).optional(),
});

export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

export interface ApprovalDecision {
  requestId: string;
  approved: boolean;
  approverId: string;
  reason?: string;
  timestamp: Date;
  conditions?: string[];
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    agentTypes?: string[];
    operations?: string[];
    sensitivity?: ('low' | 'medium' | 'high' | 'critical')[];
    keywords?: string[];
  };
  action: 'approve' | 'reject' | 'require_approval';
  requiredApprovers?: number;
  timeout?: number;
  enabled: boolean;
}

export class HumanApprovalWorkflow extends EventEmitter {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalHistory: Map<string, ApprovalDecision[]> = new Map();
  private approvalRules: ApprovalRule[] = [];
  private approvers: Map<string, { name: string; role: string; isActive: boolean }> = new Map();

  constructor() {
    super();
    this.setupDefaultRules();
    logger.info('🔐 Human Approval Workflow initialized');
  }

  private setupDefaultRules() {
    const defaultRules: ApprovalRule[] = [
      {
        id: 'high-sensitivity-ops',
        name: 'High Sensitivity Operations',
        description: 'Require approval for high sensitivity operations',
        conditions: {
          sensitivity: ['high', 'critical']
        },
        action: 'require_approval',
        requiredApprovers: 2,
        timeout: 600000, // 10 minutes
        enabled: true
      },
      {
        id: 'external-api-calls',
        name: 'External API Calls',
        description: 'Require approval for external API access',
        conditions: {
          operations: ['external_api_call', 'web_request', 'database_write']
        },
        action: 'require_approval',
        requiredApprovers: 1,
        enabled: true
      },
      {
        id: 'data-deletion',
        name: 'Data Deletion Operations',
        description: 'Always require approval for data deletion',
        conditions: {
          keywords: ['delete', 'remove', 'drop', 'truncate']
        },
        action: 'require_approval',
        requiredApprovers: 2,
        timeout: 1800000, // 30 minutes
        enabled: true
      },
      {
        id: 'auto-approve-low',
        name: 'Auto Approve Low Sensitivity',
        description: 'Automatically approve low sensitivity read operations',
        conditions: {
          sensitivity: ['low'],
          keywords: ['read', 'get', 'list', 'search']
        },
        action: 'approve',
        enabled: true
      }
    ];

    this.approvalRules = defaultRules;
    logger.info(`📋 Loaded ${defaultRules.length} default approval rules`);
  }

  /**
   * Request approval for an operation
   */
  async requestApproval(request: Omit<ApprovalRequest, 'id'>): Promise<ApprovalDecision> {
    const approvalRequest: ApprovalRequest = {
      ...approvalRequestSchema.parse({
        ...request,
        id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    };

    logger.info(`🔐 Approval requested: ${approvalRequest.operation} by ${approvalRequest.agentName}`);

    // Check if this operation should be auto-approved/rejected
    const rule = this.findMatchingRule(approvalRequest);
    if (rule) {
      if (rule.action === 'approve') {
        const decision: ApprovalDecision = {
          requestId: approvalRequest.id,
          approved: true,
          approverId: 'system',
          reason: `Auto-approved by rule: ${rule.name}`,
          timestamp: new Date()
        };

        this.recordDecision(decision);
        logger.info(`✅ Auto-approved: ${approvalRequest.operation}`);
        return decision;
      }

      if (rule.action === 'reject') {
        const decision: ApprovalDecision = {
          requestId: approvalRequest.id,
          approved: false,
          approverId: 'system',
          reason: `Auto-rejected by rule: ${rule.name}`,
          timestamp: new Date()
        };

        this.recordDecision(decision);
        logger.warn(`❌ Auto-rejected: ${approvalRequest.operation}`);
        return decision;
      }

      // Update request with rule settings
      if (rule.requiredApprovers) {
        approvalRequest.requiredApprovers = rule.requiredApprovers;
      }
      if (rule.timeout) {
        approvalRequest.timeout = rule.timeout;
      }
    }

    // Add to pending approvals
    this.pendingApprovals.set(approvalRequest.id, approvalRequest);

    // Emit approval request event
    this.emit('approvalRequested', approvalRequest);

    // Return promise that resolves when approval is received
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(approvalRequest.id);
        const timeoutDecision: ApprovalDecision = {
          requestId: approvalRequest.id,
          approved: false,
          approverId: 'system',
          reason: 'Approval request timed out',
          timestamp: new Date()
        };
        this.recordDecision(timeoutDecision);
        resolve(timeoutDecision);
      }, approvalRequest.timeout);

      const handleApproval = (decision: ApprovalDecision) => {
        if (decision.requestId === approvalRequest.id) {
          clearTimeout(timeout);
          this.off('approvalDecision', handleApproval);
          resolve(decision);
        }
      };

      this.on('approvalDecision', handleApproval);
    });
  }

  /**
   * Submit an approval decision
   */
  async submitApproval(
    requestId: string,
    approverId: string,
    approved: boolean,
    reason?: string,
    conditions?: string[]
  ): Promise<boolean> {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      logger.warn(`⚠️ Approval request not found: ${requestId}`);
      return false;
    }

    const decision: ApprovalDecision = {
      requestId,
      approved,
      approverId,
      reason,
      conditions,
      timestamp: new Date()
    };

    // Check if we have enough approvals
    const existingDecisions = this.approvalHistory.get(requestId) || [];
    const approvals = existingDecisions.filter(d => d.approved);

    if (approved && approvals.length + 1 >= request.requiredApprovers) {
      // Enough approvals received
      this.pendingApprovals.delete(requestId);
      this.recordDecision(decision);
      this.emit('approvalDecision', decision);

      logger.info(`✅ Operation approved: ${request.operation} by ${approverId}`);
      return true;
    } else if (!approved) {
      // Rejection - immediately deny
      this.pendingApprovals.delete(requestId);
      this.recordDecision(decision);
      this.emit('approvalDecision', decision);

      logger.warn(`❌ Operation rejected: ${request.operation} by ${approverId}`);
      return true;
    } else {
      // Need more approvals
      this.recordDecision(decision);
      this.emit('approvalProgress', {
        requestId,
        approvalsReceived: approvals.length + 1,
        approvalsRequired: request.requiredApprovers
      });

      logger.info(`⏳ Partial approval: ${request.operation} (${approvals.length + 1}/${request.requiredApprovers})`);
      return true;
    }
  }

  private findMatchingRule(request: ApprovalRequest): ApprovalRule | null {
    for (const rule of this.approvalRules) {
      if (!rule.enabled) continue;

      const { conditions } = rule;
      let matches = true;

      // Check agent types
      if (conditions.agentTypes && !conditions.agentTypes.includes(request.agentName)) {
        matches = false;
      }

      // Check operations
      if (conditions.operations && !conditions.operations.includes(request.operation)) {
        matches = false;
      }

      // Check sensitivity
      if (conditions.sensitivity && !conditions.sensitivity.includes(request.sensitivity)) {
        matches = false;
      }

      // Check keywords
      if (conditions.keywords) {
        const hasKeyword = conditions.keywords.some(keyword =>
          request.operation.toLowerCase().includes(keyword.toLowerCase()) ||
          request.description.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          matches = false;
        }
      }

      if (matches) {
        return rule;
      }
    }

    return null;
  }

  private recordDecision(decision: ApprovalDecision) {
    const existing = this.approvalHistory.get(decision.requestId) || [];
    existing.push(decision);
    this.approvalHistory.set(decision.requestId, existing);
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Get approval history
   */
  getApprovalHistory(limit = 100): ApprovalDecision[] {
    const allDecisions: ApprovalDecision[] = [];
    for (const decisions of this.approvalHistory.values()) {
      allDecisions.push(...decisions);
    }
    return allDecisions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Add approval rule
   */
  addApprovalRule(rule: Omit<ApprovalRule, 'id'>): string {
    const newRule: ApprovalRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.approvalRules.push(newRule);
    logger.info(`📋 Added approval rule: ${newRule.name}`);
    return newRule.id;
  }

  /**
   * Remove approval rule
   */
  removeApprovalRule(ruleId: string): boolean {
    const index = this.approvalRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      const rule = this.approvalRules[index];
      this.approvalRules.splice(index, 1);
      logger.info(`🗑️ Removed approval rule: ${rule.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get approval rules
   */
  getApprovalRules(): ApprovalRule[] {
    return [...this.approvalRules];
  }

  /**
   * Register approver
   */
  registerApprover(id: string, name: string, role: string): void {
    this.approvers.set(id, { name, role, isActive: true });
    logger.info(`👤 Registered approver: ${name} (${role})`);
  }

  /**
   * Get active approvers
   */
  getApprovers(): Array<{ id: string; name: string; role: string; isActive: boolean }> {
    return Array.from(this.approvers.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  /**
   * Get approval statistics
   */
  getApprovalStats(days = 30): {
    totalRequests: number;
    approved: number;
    rejected: number;
    timedOut: number;
    averageApprovalTime: number;
  } {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const decisions: ApprovalDecision[] = [];

    for (const requestDecisions of this.approvalHistory.values()) {
      const finalDecision = requestDecisions[requestDecisions.length - 1];
      if (finalDecision.timestamp >= cutoff) {
        decisions.push(finalDecision);
      }
    }

    const approved = decisions.filter(d => d.approved && d.approverId !== 'system').length;
    const rejected = decisions.filter(d => !d.approved && d.reason !== 'Approval request timed out').length;
    const timedOut = decisions.filter(d => d.reason === 'Approval request timed out').length;

    // Calculate average approval time (excluding auto-approvals and timeouts)
    const manualDecisions = decisions.filter(d => d.approverId !== 'system' && d.reason !== 'Approval request timed out');
    const averageApprovalTime = manualDecisions.length > 0
      ? manualDecisions.reduce((sum, d) => sum + d.timestamp.getTime(), 0) / manualDecisions.length
      : 0;

    return {
      totalRequests: decisions.length,
      approved,
      rejected,
      timedOut,
      averageApprovalTime
    };
  }
}

// Export singleton instance
export const humanApprovalWorkflow = new HumanApprovalWorkflow();