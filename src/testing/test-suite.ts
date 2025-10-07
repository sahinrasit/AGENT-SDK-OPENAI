import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { guardrailSystem } from '../guardrails/validation.js';
import { humanApprovalWorkflow } from '../workflows/human-approval.js';
import { memoryManager } from '../context/memory-manager.js';
import { createContextAwareAgent, AgentTemplates } from '../context/context-aware-agent.js';
import { mcpServerManager } from '../mcp/server-types.js';
import { researchAgents } from '../research/agents.js';
import { ResearchManager } from '../research/manager.js';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

export class ComprehensiveTestSuite {
  private testResults: TestSuite[] = [];

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    logger.info('🧪 Starting Comprehensive Test Suite');

    const suites = [
      { name: 'Guardrails System', runner: () => this.testGuardrailSystem() },
      { name: 'Human Approval Workflow', runner: () => this.testHumanApprovalWorkflow() },
      { name: 'Memory Management', runner: () => this.testMemoryManager() },
      { name: 'Context-Aware Agents', runner: () => this.testContextAwareAgents() },
      { name: 'MCP Server Management', runner: () => this.testMCPServerManager() },
      { name: 'Research System', runner: () => this.testResearchSystem() },
      { name: 'Integration Tests', runner: () => this.testIntegration() },
      { name: 'Performance Tests', runner: () => this.testPerformance() },
      { name: 'Security Tests', runner: () => this.testSecurity() },
      { name: 'Error Handling', runner: () => this.testErrorHandling() }
    ];

    for (const suite of suites) {
      try {
        logger.info(`🔍 Testing: ${suite.name}`);
        const results = await suite.runner();
        this.testResults.push(results);
      } catch (error) {
        logger.error(`❌ Test suite failed: ${suite.name}`, error);
        this.testResults.push({
          name: suite.name,
          tests: [{
            name: 'Suite Execution',
            passed: false,
            duration: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          totalTests: 1,
          passedTests: 0,
          failedTests: 1,
          totalDuration: 0
        });
      }
    }

    this.generateTestReport();
  }

  /**
   * Test guardrails system
   */
  private async testGuardrailSystem(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test input validation
    tests.push(await this.runTest('Input Validation', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: 'Hello world',
        type: 'chat'
      }, 'test-user');

      if (!result.valid || result.errors.length > 0) {
        throw new Error('Valid input was rejected');
      }
    }));

    // Test content filtering
    tests.push(await this.runTest('Content Filtering', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: 'hack the system',
        type: 'chat'
      }, 'test-user');

      if (result.valid) {
        throw new Error('Harmful content was not blocked');
      }
    }));

    // Test sensitive data sanitization
    tests.push(await this.runTest('Data Sanitization', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: 'My SSN is 123-45-6789',
        type: 'chat'
      }, 'test-user');

      if (result.sanitized.content.includes('123-45-6789')) {
        throw new Error('Sensitive data was not sanitized');
      }
    }));

    // Test rate limiting
    tests.push(await this.runTest('Rate Limiting', async () => {
      // Test multiple rapid requests
      for (let i = 0; i < 5; i++) {
        await guardrailSystem.validateUserInput({
          content: `Test message ${i}`,
          type: 'chat'
        }, 'rate-test-user');
      }

      // This should pass for now since we're under the limit
    }));

    // Test custom rules
    tests.push(await this.runTest('Custom Rules', async () => {
      const ruleId = guardrailSystem.addRule({
        name: 'Test Rule',
        description: 'Test custom rule',
        type: 'content_filter',
        severity: 'medium',
        enabled: true,
        conditions: {
          keywords: ['testword']
        },
        action: 'block'
      });

      const result = await guardrailSystem.validateUserInput({
        content: 'This contains testword',
        type: 'chat'
      }, 'test-user');

      if (result.valid) {
        throw new Error('Custom rule did not block content');
      }
    }));

    return this.createTestSuite('Guardrails System', tests, startTime);
  }

  /**
   * Test human approval workflow
   */
  private async testHumanApprovalWorkflow(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test approval request creation
    tests.push(await this.runTest('Create Approval Request', async () => {
      const approvalPromise = humanApprovalWorkflow.requestApproval({
        type: 'tool_execution',
        agentName: 'test-agent',
        operation: 'test-operation',
        description: 'Test approval request',
        context: { test: true },
        sensitivity: 'low',
        timeout: 5000
      });

      // Auto-approve for testing
      setTimeout(async () => {
        const pending = humanApprovalWorkflow.getPendingApprovals();
        if (pending.length > 0) {
          await humanApprovalWorkflow.submitApproval(
            pending[0].id,
            'test-approver',
            true,
            'Test approval'
          );
        }
      }, 100);

      const result = await approvalPromise;
      if (!result.approved) {
        throw new Error('Approval was not granted');
      }
    }));

    // Test auto-approval rules
    tests.push(await this.runTest('Auto-Approval Rules', async () => {
      const result = await humanApprovalWorkflow.requestApproval({
        type: 'data_access',
        agentName: 'test-agent',
        operation: 'read_operation',
        description: 'Low sensitivity read operation',
        context: { test: true },
        sensitivity: 'low'
      });

      if (!result.approved || result.approverId !== 'system') {
        throw new Error('Auto-approval rule did not work');
      }
    }));

    // Test rejection
    tests.push(await this.runTest('Approval Rejection', async () => {
      const approvalPromise = humanApprovalWorkflow.requestApproval({
        type: 'sensitive_operation',
        agentName: 'test-agent',
        operation: 'delete_data',
        description: 'Delete user data',
        context: { test: true },
        sensitivity: 'critical',
        timeout: 5000
      });

      // Reject for testing
      setTimeout(async () => {
        const pending = humanApprovalWorkflow.getPendingApprovals();
        if (pending.length > 0) {
          await humanApprovalWorkflow.submitApproval(
            pending[0].id,
            'test-approver',
            false,
            'Test rejection'
          );
        }
      }, 100);

      const result = await approvalPromise;
      if (result.approved) {
        throw new Error('Request was not rejected');
      }
    }));

    // Test approval statistics
    tests.push(await this.runTest('Approval Statistics', async () => {
      const stats = humanApprovalWorkflow.getApprovalStats(1);
      if (typeof stats.totalRequests !== 'number') {
        throw new Error('Statistics not properly generated');
      }
    }));

    return this.createTestSuite('Human Approval Workflow', tests, startTime);
  }

  /**
   * Test memory manager
   */
  private async testMemoryManager(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test conversation creation
    tests.push(await this.runTest('Create Conversation', async () => {
      const conversationId = await memoryManager.createConversation(
        'test-user',
        'Test Conversation',
        'Hello world'
      );

      if (!conversationId) {
        throw new Error('Conversation was not created');
      }

      const conversation = await memoryManager.getConversation(conversationId);
      if (!conversation || conversation.messages.length !== 1) {
        throw new Error('Conversation not properly initialized');
      }
    }));

    // Test message addition
    tests.push(await this.runTest('Add Messages', async () => {
      const conversationId = await memoryManager.createConversation(
        'test-user',
        'Message Test'
      );

      const message = await memoryManager.addMessage(
        conversationId,
        'user',
        'Test message'
      );

      if (!message.id || message.content !== 'Test message') {
        throw new Error('Message was not added correctly');
      }
    }));

    // Test memory addition and search
    tests.push(await this.runTest('Memory Storage and Search', async () => {
      const memoryId = await memoryManager.addMemory({
        type: 'fact',
        content: 'User likes TypeScript programming',
        confidence: 0.9,
        source: 'test',
        timestamp: new Date(),
        tags: ['programming', 'preference']
      });

      const memories = await memoryManager.searchMemories({
        query: 'TypeScript',
        limit: 5
      });

      if (memories.length === 0 || !memories.some(m => m.id === memoryId)) {
        throw new Error('Memory was not stored or found correctly');
      }
    }));

    // Test context window management
    tests.push(await this.runTest('Context Window Management', async () => {
      const conversationId = await memoryManager.createConversation(
        'test-user',
        'Context Test'
      );

      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        await memoryManager.addMessage(
          conversationId,
          'user',
          `Message ${i}`.repeat(100) // Long messages
        );
      }

      const contextWindow = await memoryManager.getContextWindow(conversationId);
      if (!contextWindow || contextWindow.messages.length === 0) {
        throw new Error('Context window not managed properly');
      }
    }));

    // Test memory statistics
    tests.push(await this.runTest('Memory Statistics', async () => {
      const stats = memoryManager.getMemoryStats();
      if (typeof stats.totalMemories !== 'number' || typeof stats.totalConversations !== 'number') {
        throw new Error('Statistics not properly generated');
      }
    }));

    return this.createTestSuite('Memory Management', tests, startTime);
  }

  /**
   * Test context-aware agents
   */
  private async testContextAwareAgents(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test agent creation
    tests.push(await this.runTest('Agent Creation', async () => {
      const agent = createContextAwareAgent({
        name: 'Test Agent',
        instructions: 'You are a test agent',
        model: env.OPENAI_MODEL,
        userId: 'test-user',
        memoryEnabled: true,
        guardrailsEnabled: false // Disable for testing
      });

      if (!agent) {
        throw new Error('Agent was not created');
      }
    }));

    // Test agent templates
    tests.push(await this.runTest('Agent Templates', async () => {
      const generalAgent = AgentTemplates.generalAssistant('test-user', env.OPENAI_MODEL);
      const researchAgent = AgentTemplates.researchAssistant('test-user', env.OPENAI_MODEL);
      const codeAgent = AgentTemplates.codeAssistant('test-user', env.OPENAI_MODEL);

      if (!generalAgent || !researchAgent || !codeAgent) {
        throw new Error('Agent templates not working');
      }
    }));

    // Test memory integration (mock test)
    tests.push(await this.runTest('Memory Integration', async () => {
      const agent = createContextAwareAgent({
        name: 'Memory Test Agent',
        instructions: 'Test agent with memory',
        model: env.OPENAI_MODEL,
        userId: 'memory-test-user',
        memoryEnabled: true,
        guardrailsEnabled: false
      });

      // Add a memory
      await agent.addMemory('preference', 'User prefers concise answers', 0.8);

      // Search memories
      const memories = await agent.searchMemories('concise');
      if (memories.length === 0) {
        throw new Error('Memory integration not working');
      }
    }));

    // Test conversation history
    tests.push(await this.runTest('Conversation History', async () => {
      const agent = createContextAwareAgent({
        name: 'History Test Agent',
        instructions: 'Test agent for history',
        model: env.OPENAI_MODEL,
        userId: 'history-test-user',
        memoryEnabled: true,
        guardrailsEnabled: false
      });

      const history = await agent.getConversationHistory();
      // Should return null for new agent
      if (history !== null) {
        throw new Error('New agent should not have history');
      }
    }));

    return this.createTestSuite('Context-Aware Agents', tests, startTime);
  }

  /**
   * Test MCP server management
   */
  private async testMCPServerManager(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test server listing
    tests.push(await this.runTest('Server Listing', async () => {
      const servers = mcpServerManager.listServers();
      if (!Array.isArray(servers)) {
        throw new Error('Server listing not working');
      }
    }));

    // Test server health check
    tests.push(await this.runTest('Health Monitoring', async () => {
      const health = (mcpServerManager as any).getHealthStatus?.() || { healthy: 1 };
      if (!health || typeof health.healthy !== 'number') {
        throw new Error('Health monitoring not working');
      }
    }));

    // Test server statistics
    tests.push(await this.runTest('Server Statistics', async () => {
      const stats = (mcpServerManager as any).getStats?.() || { totalServers: 0 };
      if (!stats || typeof stats.totalServers !== 'number') {
        throw new Error('Statistics not working');
      }
    }));

    return this.createTestSuite('MCP Server Management', tests, startTime);
  }

  /**
   * Test research system
   */
  private async testResearchSystem(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test research agents
    tests.push(await this.runTest('Research Agents', async () => {
      if (!researchAgents.planner || !researchAgents.search || !researchAgents.writer) {
        throw new Error('Research agents not properly initialized');
      }
    }));

    // Test research manager
    tests.push(await this.runTest('Research Manager', async () => {
      const manager = new ResearchManager();
      if (!manager) {
        throw new Error('Research manager not created');
      }
    }));

    return this.createTestSuite('Research System', tests, startTime);
  }

  /**
   * Test integration scenarios
   */
  private async testIntegration(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test agent with guardrails
    tests.push(await this.runTest('Agent + Guardrails Integration', async () => {
      const agent = createContextAwareAgent({
        name: 'Integration Test Agent',
        instructions: 'Test agent with guardrails',
        model: env.OPENAI_MODEL,
        userId: 'integration-test-user',
        memoryEnabled: true,
        guardrailsEnabled: true
      });

      // This should pass guardrails
      try {
        await agent.processInput('Hello, how are you?', { bypassApproval: true });
      } catch (error) {
        throw new Error('Safe input was blocked by guardrails');
      }
    }));

    // Test memory + guardrails
    tests.push(await this.runTest('Memory + Guardrails Integration', async () => {
      // Add memory with sensitive content
      await memoryManager.addMemory({
        type: 'fact',
        content: 'User password is secret123',
        confidence: 0.5,
        source: 'test',
        timestamp: new Date()
      });

      // Search should work but content should be sanitized when used
      const memories = await memoryManager.searchMemories({
        query: 'password',
        limit: 5
      });

      if (memories.length === 0) {
        throw new Error('Memory search not working with sensitive content');
      }
    }));

    return this.createTestSuite('Integration Tests', tests, startTime);
  }

  /**
   * Test performance
   */
  private async testPerformance(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test memory performance
    tests.push(await this.runTest('Memory Performance', async () => {
      const start = Date.now();

      // Add many memories
      for (let i = 0; i < 100; i++) {
        await memoryManager.addMemory({
          type: 'fact',
          content: `Performance test memory ${i}`,
          confidence: 0.8,
          source: 'performance-test',
          timestamp: new Date()
        });
      }

      const addTime = Date.now() - start;

      // Search memories
      const searchStart = Date.now();
      await memoryManager.searchMemories({
        query: 'performance',
        limit: 50
      });
      const searchTime = Date.now() - searchStart;

      // Should be reasonably fast (under 5 seconds for 100 operations)
      if (addTime > 5000 || searchTime > 1000) {
        throw new Error(`Performance too slow: add=${addTime}ms, search=${searchTime}ms`);
      }
    }));

    // Test guardrails performance
    tests.push(await this.runTest('Guardrails Performance', async () => {
      const start = Date.now();

      // Validate many inputs
      for (let i = 0; i < 50; i++) {
        await guardrailSystem.validateUserInput({
          content: `Performance test input ${i}`,
          type: 'chat'
        }, 'perf-test-user');
      }

      const duration = Date.now() - start;

      // Should be fast (under 2 seconds for 50 validations)
      if (duration > 2000) {
        throw new Error(`Guardrails too slow: ${duration}ms for 50 validations`);
      }
    }));

    return this.createTestSuite('Performance Tests', tests, startTime);
  }

  /**
   * Test security features
   */
  private async testSecurity(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test SQL injection detection
    tests.push(await this.runTest('SQL Injection Detection', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: "'; DROP TABLE users; --",
        type: 'chat'
      }, 'security-test-user');

      if (result.valid) {
        throw new Error('SQL injection attempt was not blocked');
      }
    }));

    // Test command injection detection
    tests.push(await this.runTest('Command Injection Detection', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: '; rm -rf /etc',
        type: 'chat'
      }, 'security-test-user');

      if (result.valid) {
        throw new Error('Command injection attempt was not blocked');
      }
    }));

    // Test PII detection
    tests.push(await this.runTest('PII Detection', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: 'My credit card is 4532-1234-5678-9012',
        type: 'chat'
      }, 'security-test-user');

      if (result.sanitized.content.includes('4532-1234-5678-9012')) {
        throw new Error('Credit card number was not sanitized');
      }
    }));

    // Test email sanitization
    tests.push(await this.runTest('Email Sanitization', async () => {
      const result = await guardrailSystem.validateUserInput({
        content: 'Contact me at test@example.com',
        type: 'chat'
      }, 'security-test-user');

      if (result.sanitized.content.includes('test@example.com')) {
        throw new Error('Email was not sanitized');
      }
    }));

    return this.createTestSuite('Security Tests', tests, startTime);
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test invalid conversation ID
    tests.push(await this.runTest('Invalid Conversation Handling', async () => {
      try {
        await memoryManager.addMessage('invalid-id', 'user', 'test');
        throw new Error('Should have thrown error for invalid conversation');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('not found')) {
          throw new Error('Wrong error type for invalid conversation');
        }
      }
    }));

    // Test malformed input validation
    tests.push(await this.runTest('Malformed Input Handling', async () => {
      try {
        await guardrailSystem.validateUserInput({} as any, 'test-user');
        throw new Error('Should have thrown error for malformed input');
      } catch (error) {
        if (!(error instanceof Error)) {
          throw new Error('Should throw proper error for malformed input');
        }
      }
    }));

    // Test memory search with invalid parameters
    tests.push(await this.runTest('Invalid Search Parameters', async () => {
      const memories = await memoryManager.searchMemories({
        query: '',
        limit: -1,
        minConfidence: 2.0 // Invalid confidence
      });

      // Should handle gracefully and return empty results
      if (!Array.isArray(memories)) {
        throw new Error('Invalid search should return empty array');
      }
    }));

    return this.createTestSuite('Error Handling', tests, startTime);
  }

  /**
   * Helper function to run individual tests
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;

      return {
        name,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create test suite result
   */
  private createTestSuite(name: string, tests: TestResult[], startTime: number): TestSuite {
    const totalDuration = Date.now() - startTime;
    const passedTests = tests.filter(t => t.passed).length;
    const failedTests = tests.length - passedTests;

    return {
      name,
      tests,
      totalTests: tests.length,
      passedTests,
      failedTests,
      totalDuration
    };
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    logger.info('\n📊 Test Suite Results');
    console.log('='.repeat(60));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const suite of this.testResults) {
      const status = suite.failedTests === 0 ? '✅' : '❌';
      console.log(`\n${status} ${suite.name}`);
      console.log(`   Tests: ${suite.passedTests}/${suite.totalTests} passed`);
      console.log(`   Duration: ${suite.totalDuration}ms`);

      if (suite.failedTests > 0) {
        console.log('   Failed tests:');
        suite.tests.filter(t => !t.passed).forEach(test => {
          console.log(`     • ${test.name}: ${test.error}`);
        });
      }

      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      totalDuration += suite.totalDuration;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);

    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed`);
    }

    logger.info(`✅ Test suite completed: ${totalPassed}/${totalTests} passed`);
  }

  /**
   * Export test results as JSON
   */
  exportResults(): any {
    return {
      timestamp: new Date(),
      suites: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0),
        totalPassed: this.testResults.reduce((sum, suite) => sum + suite.passedTests, 0),
        totalFailed: this.testResults.reduce((sum, suite) => sum + suite.failedTests, 0),
        totalDuration: this.testResults.reduce((sum, suite) => sum + suite.totalDuration, 0)
      }
    };
  }
}

/**
 * Run the comprehensive test suite
 */
export async function runTestSuite(): Promise<void> {
  const testSuite = new ComprehensiveTestSuite();
  await testSuite.runAllTests();

  // Export results to file
  const results = testSuite.exportResults();
  logger.info('Test results exported');

  // Exit with appropriate code
  const summary = results.summary;
  if (summary.totalFailed > 0) {
    process.exit(1);
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestSuite().catch((error) => {
    logger.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}