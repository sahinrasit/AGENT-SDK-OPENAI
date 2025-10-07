import { run } from '@openai/agents';
import { triageAgent, customerServiceAgent, specialistAgents } from '../agents/handoffs.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import * as readline from 'readline';

async function handoffDemoExample() {
  logger.info('🚀 Starting Agent Handoff Demo');

  console.log('\n🤖 Agent Handoff System Demo');
  console.log('This demo shows how agents can delegate tasks to specialized agents\n');

  // Example 1: Research handoff
  logger.info('📊 Example 1: Research task with handoff');

  try {
    const researchQuery = 'I need comprehensive research on the latest trends in artificial intelligence and machine learning for enterprise applications';

    console.log(`👤 User: ${researchQuery}\n`);

    const result = await run(triageAgent, researchQuery);

    console.log('🤖 Triage Agent Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Research handoff demo failed:', error);
  }

  // Example 2: Analysis handoff
  logger.info('📈 Example 2: Analysis task with handoff');

  try {
    const analysisQuery = `I have data from our last quarter's performance metrics and need a technical analysis to identify bottlenecks and optimization opportunities. The data shows response times, error rates, and user engagement metrics.`;

    console.log(`👤 User: ${analysisQuery}\n`);

    const result = await run(triageAgent, analysisQuery);

    console.log('🤖 Triage Agent Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Analysis handoff demo failed:', error);
  }

  // Example 3: Writing handoff
  logger.info('📝 Example 3: Writing task with handoff');

  try {
    const writingQuery = 'I need a comprehensive technical report about our microservices migration project for presentation to the executive team. It should include challenges, solutions, and business impact.';

    console.log(`👤 User: ${writingQuery}\n`);

    const result = await run(triageAgent, writingQuery);

    console.log('🤖 Triage Agent Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Writing handoff demo failed:', error);
  }

  logger.info('✅ Agent handoff demo completed');
}

async function customerServiceDemo() {
  logger.info('🚀 Starting Customer Service Handoff Demo');

  console.log('\n🎧 Customer Service Agent Demo');
  console.log('This demo shows how customer service agents route specialized requests\n');

  // Example 1: Billing inquiry
  logger.info('💳 Example 1: Billing inquiry');

  try {
    const billingQuery = 'I was charged twice this month for my subscription and I need a refund for the duplicate charge. Can you help me?';

    console.log(`👤 Customer: ${billingQuery}\n`);

    const result = await run(customerServiceAgent, billingQuery);

    console.log('🎧 Customer Service Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Billing handoff demo failed:', error);
  }

  // Example 2: Technical support
  logger.info('🔧 Example 2: Technical support inquiry');

  try {
    const techQuery = 'Our API integration is returning 500 errors intermittently and our production system is affected. I need help debugging this issue.';

    console.log(`👤 Customer: ${techQuery}\n`);

    const result = await run(customerServiceAgent, techQuery);

    console.log('🎧 Customer Service Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Technical support handoff demo failed:', error);
  }

  // Example 3: General inquiry
  logger.info('❓ Example 3: General inquiry (no handoff needed)');

  try {
    const generalQuery = 'What are your business hours and how can I contact support during weekends?';

    console.log(`👤 Customer: ${generalQuery}\n`);

    const result = await run(customerServiceAgent, generalQuery);

    console.log('🎧 Customer Service Response:');
    console.log(result.finalOutput);
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ General inquiry demo failed:', error);
  }

  logger.info('✅ Customer service handoff demo completed');
}

async function interactiveHandoffDemo() {
  logger.info('🚀 Starting Interactive Handoff Demo');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🔄 Interactive Agent Handoff System');
  console.log('Choose an agent to interact with:');
  console.log('1. Triage Agent (routes to Research/Analysis/Writing specialists)');
  console.log('2. Customer Service Agent (routes to Billing/Technical Support)');
  console.log('Type "exit" to quit\n');

  function getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, (input) => {
        resolve(input.trim());
      });
    });
  }

  try {
    while (true) {
      const agentChoice = await getUserInput('🤖 Choose agent (1/2) or "exit": ');

      if (agentChoice.toLowerCase() === 'exit') {
        logger.info('👋 Interactive demo ended by user');
        break;
      }

      let selectedAgent;
      let agentName;

      switch (agentChoice) {
        case '1':
          selectedAgent = triageAgent;
          agentName = 'Triage Agent';
          console.log('\n📋 You selected the Triage Agent');
          console.log('This agent can route your request to:');
          console.log('• Research Specialist (information gathering)');
          console.log('• Analysis Specialist (data analysis and insights)');
          console.log('• Writing Specialist (document creation)\n');
          break;

        case '2':
          selectedAgent = customerServiceAgent;
          agentName = 'Customer Service Agent';
          console.log('\n🎧 You selected the Customer Service Agent');
          console.log('This agent can route your request to:');
          console.log('• Billing Specialist (payment and subscription issues)');
          console.log('• Technical Support (technical problems)\n');
          break;

        default:
          console.log('❌ Invalid choice. Please select 1 or 2.\n');
          continue;
      }

      const userQuery = await getUserInput(`💬 What would you like to ask the ${agentName}? `);

      if (userQuery.length === 0) {
        continue;
      }

      console.log(`\n⏳ Processing request with ${agentName}...\n`);

      try {
        const result = await run(selectedAgent, userQuery);

        console.log(`🤖 ${agentName} Response:`);
        console.log('='.repeat(50));
        console.log(result.finalOutput);
        console.log('='.repeat(50) + '\n');

      } catch (error) {
        logger.error(`❌ ${agentName} interaction failed:`, error);
        console.log('❌ Sorry, there was an error processing your request. Please try again.\n');
      }
    }
  } catch (error) {
    logger.error('❌ Interactive handoff demo error:', error);
  } finally {
    rl.close();
    logger.info('✅ Interactive handoff demo completed');
  }
}

async function specialistAgentDemo() {
  logger.info('🚀 Starting Specialist Agent Demo');

  console.log('\n🎯 Direct Specialist Agent Testing');
  console.log('This demo tests individual specialist agents directly\n');

  // Test Research Specialist
  logger.info('🔍 Testing Research Specialist');

  try {
    const researchQuery = 'Research the latest developments in quantum computing applications for cybersecurity';

    console.log(`📋 Research Task: ${researchQuery}\n`);

    const result = await run(specialistAgents.research, researchQuery);

    console.log('🔬 Research Specialist Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Research specialist test failed:', error);
  }

  // Test Analysis Specialist
  logger.info('📊 Testing Analysis Specialist');

  try {
    const analysisData = `
Performance Data:
- API Response Time: 250ms (target: 200ms)
- Error Rate: 2.5% (target: 1%)
- CPU Usage: 75% (threshold: 80%)
- Memory Usage: 60% (threshold: 70%)
- Database Connection Pool: 85% utilized
- Cache Hit Rate: 92%

Please analyze this performance data and provide recommendations.
`;

    console.log(`📈 Analysis Task: Performance metrics analysis\n`);

    const result = await run(specialistAgents.analysis, analysisData);

    console.log('📊 Analysis Specialist Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Analysis specialist test failed:', error);
  }

  // Test Writing Specialist
  logger.info('📝 Testing Writing Specialist');

  try {
    const writingTask = `
Please create an executive summary for our Q4 digital transformation project.

Key points to include:
- Migrated 15 legacy systems to cloud infrastructure
- Reduced operational costs by 30%
- Improved system reliability by 99.9% uptime
- Enhanced security with zero-trust architecture
- Team completed training on new technologies

Target audience: Executive leadership
Format: Executive summary
Length: Brief but comprehensive
`;

    console.log(`📄 Writing Task: Executive summary creation\n`);

    const result = await run(specialistAgents.writing, writingTask);

    console.log('📝 Writing Specialist Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Writing specialist test failed:', error);
  }

  logger.info('✅ Specialist agent demo completed');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'demo';

  switch (mode) {
    case 'interactive':
      interactiveHandoffDemo().catch(console.error);
      break;
    case 'customer':
      customerServiceDemo().catch(console.error);
      break;
    case 'specialists':
      specialistAgentDemo().catch(console.error);
      break;
    case 'demo':
    default:
      handoffDemoExample().catch(console.error);
      break;
  }
}

export { handoffDemoExample, customerServiceDemo, interactiveHandoffDemo, specialistAgentDemo };