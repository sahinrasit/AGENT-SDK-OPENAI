import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Input validation schemas
const userInputSchema = z.object({
  content: z.string().min(1).max(10000),
  type: z.enum(['chat', 'command', 'query']).default('chat'),
  metadata: z.record(z.any()).optional(),
});

const toolInputSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  agentName: z.string(),
  context: z.record(z.any()).optional(),
});

export type UserInput = z.infer<typeof userInputSchema>;
export type ToolInput = z.infer<typeof toolInputSchema>;

export interface ValidationResult {
  valid: boolean;
  sanitized?: any;
  errors: string[];
  warnings: string[];
  blocked?: boolean;
  reason?: string;
}

export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  type: 'content_filter' | 'rate_limit' | 'permission_check' | 'data_validation' | 'security_check';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  conditions: {
    patterns?: string[];
    keywords?: string[];
    agentTypes?: string[];
    toolNames?: string[];
    userRoles?: string[];
  };
  action: 'warn' | 'sanitize' | 'block' | 'require_approval';
  config?: Record<string, any>;
}

export class GuardrailSystem {
  private rules: GuardrailRule[] = [];
  private violationHistory: Map<string, Array<{ timestamp: Date; rule: string; input: any }>> = new Map();
  private rateLimits: Map<string, Array<Date>> = new Map();

  // Content filters
  private readonly SENSITIVE_PATTERNS = [
    // Personal data patterns
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email (less strict)

    // Security patterns
    /password\s*[:=]\s*[^\s]+/gi,
    /api[_-]?key\s*[:=]\s*[^\s]+/gi,
    /secret\s*[:=]\s*[^\s]+/gi,
    /token\s*[:=]\s*[^\s]+/gi,

    // Potentially harmful commands
    /rm\s+-rf\s+[^\s]+/gi,
    /DROP\s+TABLE\s+/gi,
    /DELETE\s+FROM\s+/gi,
    /TRUNCATE\s+/gi,
  ];

  private readonly BLOCKED_KEYWORDS = [
    'hack', 'exploit', 'vulnerability', 'backdoor', 'malware',
    'phishing', 'spam', 'fraud', 'illegal', 'piracy',
    'violence', 'hate', 'discrimination', 'harassment',
  ];

  constructor() {
    this.setupDefaultRules();
    logger.info('🛡️ Guardrail system initialized');
  }

  private setupDefaultRules() {
    const defaultRules: GuardrailRule[] = [
      {
        id: 'sensitive-data-filter',
        name: 'Sensitive Data Filter',
        description: 'Detect and sanitize sensitive personal data',
        type: 'content_filter',
        severity: 'high',
        enabled: true,
        conditions: {},
        action: 'sanitize',
        config: {
          replacement: '[REDACTED]'
        }
      },
      {
        id: 'harmful-content-blocker',
        name: 'Harmful Content Blocker',
        description: 'Block requests containing harmful or inappropriate content',
        type: 'content_filter',
        severity: 'critical',
        enabled: true,
        conditions: {
          keywords: this.BLOCKED_KEYWORDS
        },
        action: 'block'
      },
      {
        id: 'sql-injection-detector',
        name: 'SQL Injection Detector',
        description: 'Detect potential SQL injection attempts',
        type: 'security_check',
        severity: 'critical',
        enabled: true,
        conditions: {
          patterns: [
            "'; DROP TABLE",
            "1' OR '1'='1",
            "UNION SELECT",
            "'; --",
            "' OR 1=1 --"
          ]
        },
        action: 'block'
      },
      {
        id: 'rate-limiter',
        name: 'Rate Limiter',
        description: 'Limit request rate per user',
        type: 'rate_limit',
        severity: 'medium',
        enabled: true,
        conditions: {},
        action: 'block',
        config: {
          maxRequests: 100,
          windowMs: 60000 // 1 minute
        }
      },
      {
        id: 'command-injection-detector',
        name: 'Command Injection Detector',
        description: 'Detect potential command injection attempts',
        type: 'security_check',
        severity: 'critical',
        enabled: true,
        conditions: {
          patterns: [
            '; rm -rf',
            '&& rm -rf',
            '\\| rm -rf',
            '; cat /etc/passwd',
            '&& wget',
            '\\| curl'
          ]
        },
        action: 'block'
      },
      {
        id: 'large-input-validator',
        name: 'Large Input Validator',
        description: 'Validate input size limits',
        type: 'data_validation',
        severity: 'medium',
        enabled: true,
        conditions: {},
        action: 'warn',
        config: {
          maxLength: 10000,
          warnLength: 5000
        }
      }
    ];

    this.rules = defaultRules;
    logger.info(`🛡️ Loaded ${defaultRules.length} default guardrail rules`);
  }

  /**
   * Validate user input
   */
  async validateUserInput(input: any, userId?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };

    try {
      // Convert string input to object format if needed
      const inputObj = typeof input === 'string' 
        ? { content: input, type: 'chat' as const }
        : input;
      
      // Schema validation
      const validatedInput = userInputSchema.parse(inputObj);
      result.sanitized = validatedInput;

      // Rate limiting check
      if (userId) {
        const rateLimitResult = this.checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
          result.valid = false;
          result.blocked = true;
          result.reason = 'Rate limit exceeded';
          result.errors.push('Too many requests. Please slow down.');
          return result;
        }
      }

      // Apply guardrail rules
      for (const rule of this.rules.filter(r => r.enabled)) {
        const ruleResult = await this.applyRule(rule, validatedInput, 'user_input');

        if (ruleResult.blocked) {
          result.valid = false;
          result.blocked = true;
          result.reason = ruleResult.reason;
          result.errors.push(...ruleResult.errors);

          // Log violation
          this.logViolation(userId || 'anonymous', rule.id, input);
          return result;
        }

        if (ruleResult.sanitized) {
          result.sanitized = ruleResult.sanitized;
        }

        result.warnings.push(...ruleResult.warnings);
      }

      logger.debug(`✅ Input validation passed for user: ${userId}`);

    } catch (error) {
      result.valid = false;
      result.errors.push(`Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.warn(`❌ Input validation failed:`, error);
    }

    return result;
  }

  /**
   * Validate tool execution
   */
  async validateToolExecution(input: ToolInput, userId?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };

    try {
      // Schema validation
      const validatedInput = toolInputSchema.parse(input);
      result.sanitized = validatedInput;

      // Apply tool-specific guardrail rules
      const toolRules = this.rules.filter(r =>
        r.enabled &&
        (r.conditions.toolNames?.includes(validatedInput.toolName) ||
         r.conditions.agentTypes?.includes(validatedInput.agentName) ||
         (!r.conditions.toolNames && !r.conditions.agentTypes))
      );

      for (const rule of toolRules) {
        const ruleResult = await this.applyRule(rule, validatedInput, 'tool_execution');

        if (ruleResult.blocked) {
          result.valid = false;
          result.blocked = true;
          result.reason = ruleResult.reason;
          result.errors.push(...ruleResult.errors);

          // Log violation
          this.logViolation(userId || 'system', rule.id, input);
          return result;
        }

        if (ruleResult.sanitized) {
          result.sanitized = ruleResult.sanitized;
        }

        result.warnings.push(...ruleResult.warnings);
      }

      logger.debug(`✅ Tool validation passed: ${validatedInput.toolName}`);

    } catch (error) {
      result.valid = false;
      result.errors.push(`Tool validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.warn(`❌ Tool validation failed:`, error);
    }

    return result;
  }

  private async applyRule(rule: GuardrailRule, input: any, context: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };

    try {
      switch (rule.type) {
        case 'content_filter':
          return this.applyContentFilter(rule, input);

        case 'security_check':
          return this.applySecurityCheck(rule, input);

        case 'data_validation':
          return this.applyDataValidation(rule, input);

        case 'permission_check':
          return this.applyPermissionCheck(rule, input);

        default:
          logger.warn(`Unknown rule type: ${rule.type}`);
      }
    } catch (error) {
      logger.error(`Error applying rule ${rule.name}:`, error);
      result.warnings.push(`Rule ${rule.name} failed to execute`);
    }

    return result;
  }

  private applyContentFilter(rule: GuardrailRule, input: any): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: { ...input }
    };

    // Extract content from input object if it has a content field
    let content: string;
    if (typeof input === 'string') {
      content = input;
    } else if (input && typeof input === 'object' && 'content' in input) {
      content = String(input.content);
    } else {
      content = JSON.stringify(input);
    }

    // Check keywords
    if (rule.conditions.keywords) {
      for (const keyword of rule.conditions.keywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          if (rule.action === 'block') {
            result.valid = false;
            result.blocked = true;
            result.reason = `Blocked by content filter: ${rule.name}`;
            result.errors.push(`Content contains prohibited keyword: ${keyword}`);
            return result;
          } else if (rule.action === 'warn') {
            result.warnings.push(`Content contains flagged keyword: ${keyword}`);
          }
        }
      }
    }

    // Apply sensitive data patterns
    if (rule.action === 'sanitize') {
      let sanitizedContent = content;
      const replacement = rule.config?.replacement || '[REDACTED]';

      for (const pattern of this.SENSITIVE_PATTERNS) {
        sanitizedContent = sanitizedContent.replace(pattern, replacement);
      }

      if (sanitizedContent !== content) {
        result.sanitized = typeof input === 'string' ? sanitizedContent : { ...input, content: sanitizedContent };
        result.warnings.push('Sensitive data was sanitized');
      }
    }

    return result;
  }

  private applySecurityCheck(rule: GuardrailRule, input: any): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };

    // Extract content from input object if it has a content field
    let content: string;
    if (typeof input === 'string') {
      content = input;
    } else if (input && typeof input === 'object' && 'content' in input) {
      content = String(input.content);
    } else {
      content = JSON.stringify(input);
    }

    // Check security patterns
    if (rule.conditions.patterns) {
      for (const pattern of rule.conditions.patterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(content)) {
          logger.warn(`🚨 Security pattern matched: "${pattern}" in content: "${content}"`);
          result.valid = false;
          result.blocked = true;
          result.reason = `Security violation detected: ${rule.name}`;
          result.errors.push(`Content matches security pattern: ${pattern}`);
          return result;
        }
      }
    }

    return result;
  }

  private applyDataValidation(rule: GuardrailRule, input: any): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };

    const content = typeof input === 'string' ? input : JSON.stringify(input);

    // Check size limits
    if (rule.config?.maxLength && content.length > rule.config.maxLength) {
      if (rule.action === 'block') {
        result.valid = false;
        result.blocked = true;
        result.reason = 'Input too large';
        result.errors.push(`Input exceeds maximum length of ${rule.config.maxLength} characters`);
        return result;
      }
    }

    if (rule.config?.warnLength && content.length > rule.config.warnLength) {
      result.warnings.push(`Input is large (${content.length} characters)`);
    }

    return result;
  }

  private applyPermissionCheck(rule: GuardrailRule, input: any): ValidationResult {
    // TODO: Implement permission checking logic
    return {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: input
    };
  }

  private checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const rule = this.rules.find(r => r.type === 'rate_limit' && r.enabled);
    if (!rule) {
      return { allowed: true, remaining: -1 };
    }

    const maxRequests = rule.config?.maxRequests || 100;
    const windowMs = rule.config?.windowMs || 60000;

    const now = new Date();
    const cutoff = new Date(now.getTime() - windowMs);

    // Get existing requests for this user
    const userRequests = this.rateLimits.get(userId) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter(req => req > cutoff);

    // Add current request
    recentRequests.push(now);

    // Update storage
    this.rateLimits.set(userId, recentRequests);

    const allowed = recentRequests.length <= maxRequests;
    const remaining = Math.max(0, maxRequests - recentRequests.length);

    return { allowed, remaining };
  }

  private logViolation(userId: string, ruleId: string, input: any) {
    const violations = this.violationHistory.get(userId) || [];
    violations.push({
      timestamp: new Date(),
      rule: ruleId,
      input
    });

    // Keep only recent violations (last 1000)
    if (violations.length > 1000) {
      violations.splice(0, violations.length - 1000);
    }

    this.violationHistory.set(userId, violations);
    logger.warn(`🚨 Guardrail violation: User ${userId}, Rule ${ruleId}`);
  }

  /**
   * Add custom guardrail rule
   */
  addRule(rule: Omit<GuardrailRule, 'id'>): string {
    const newRule: GuardrailRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.rules.push(newRule);
    logger.info(`📋 Added guardrail rule: ${newRule.name}`);
    return newRule.id;
  }

  /**
   * Get all rules
   */
  getRules(): GuardrailRule[] {
    return [...this.rules];
  }

  /**
   * Get violation history
   */
  getViolationHistory(userId?: string): Array<{ userId: string; violations: any[] }> {
    if (userId) {
      const violations = this.violationHistory.get(userId) || [];
      return [{ userId, violations }];
    }

    return Array.from(this.violationHistory.entries()).map(([userId, violations]) => ({
      userId,
      violations
    }));
  }

  /**
   * Get guardrail statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
  } {
    const activeRules = this.rules.filter(r => r.enabled).length;
    let totalViolations = 0;
    const violationsByType: Record<string, number> = {};

    for (const violations of this.violationHistory.values()) {
      totalViolations += violations.length;

      for (const violation of violations) {
        const rule = this.rules.find(r => r.id === violation.rule);
        if (rule) {
          violationsByType[rule.type] = (violationsByType[rule.type] || 0) + 1;
        }
      }
    }

    return {
      totalRules: this.rules.length,
      activeRules,
      totalViolations,
      violationsByType
    };
  }
}

// Export singleton instance
export const guardrailSystem = new GuardrailSystem();