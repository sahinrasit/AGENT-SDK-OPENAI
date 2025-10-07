import { ResearchManager, type ResearchRequest } from '../research/manager.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import * as readline from 'readline';

async function researchBotExample() {
  logger.info('🚀 Starting Research Bot Example');

  const researchManager = new ResearchManager();

  // Example 1: Basic research
  logger.info('📊 Example 1: Basic research on TypeScript');

  const basicRequest: ResearchRequest = {
    topic: 'TypeScript best practices for large applications',
    depth: 'comprehensive',
    maxSearchQueries: 4,
    includeAnalysis: true,
    urgency: 'medium',
  };

  try {
    const result = await researchManager.conductResearch(basicRequest);

    console.log('\n' + '='.repeat(80));
    console.log('🔬 RESEARCH REPORT: TypeScript Best Practices');
    console.log('='.repeat(80));
    console.log(result.finalReport);
    console.log('='.repeat(80));

    logger.info(`📈 Research Statistics:`, {
      status: result.status,
      executionTime: result.metadata.executionTime,
      searchQueries: result.metadata.searchQueriesUsed,
      agentExecutions: result.metadata.agentExecutions,
    });

  } catch (error) {
    logger.error('❌ Basic research example failed:', error);
  }

  // Example 2: Technical comparison research
  logger.info('📊 Example 2: Technical comparison research');

  const comparisonRequest: ResearchRequest = {
    topic: 'React vs Vue.js vs Angular for enterprise development',
    depth: 'expert',
    maxSearchQueries: 5,
    includeAnalysis: true,
    urgency: 'high',
  };

  try {
    const result = await researchManager.conductResearch(comparisonRequest);

    console.log('\n' + '='.repeat(80));
    console.log('🔬 RESEARCH REPORT: Frontend Framework Comparison');
    console.log('='.repeat(80));
    console.log(result.finalReport);
    console.log('='.repeat(80));

    logger.info(`📈 Research Statistics:`, {
      status: result.status,
      executionTime: result.metadata.executionTime,
      searchQueries: result.metadata.searchQueriesUsed,
    });

  } catch (error) {
    logger.error('❌ Comparison research example failed:', error);
  }
}

async function interactiveResearchBot() {
  logger.info('🚀 Starting Interactive Research Bot');

  const researchManager = new ResearchManager();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🔬 Interactive Research Bot');
  console.log('Ask me to research any topic and I\'ll provide a comprehensive report!');
  console.log('Type "exit" to quit, "help" for commands\n');

  function getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      rl.question('🔍 What would you like me to research? ', (input) => {
        resolve(input.trim());
      });
    });
  }

  function getResearchDepth(): Promise<'basic' | 'comprehensive' | 'expert'> {
    return new Promise((resolve) => {
      rl.question('📊 Research depth (basic/comprehensive/expert) [comprehensive]: ', (input) => {
        const depth = input.trim().toLowerCase();
        if (depth === 'basic' || depth === 'expert') {
          resolve(depth as 'basic' | 'expert');
        } else {
          resolve('comprehensive');
        }
      });
    });
  }

  try {
    while (true) {
      const userInput = await getUserInput();

      if (userInput.toLowerCase() === 'exit') {
        logger.info('👋 Research bot session ended by user');
        break;
      }

      if (userInput.toLowerCase() === 'help') {
        console.log('\n📚 Available commands:');
        console.log('  • Type any topic to research (e.g., "Machine Learning in Healthcare")');
        console.log('  • "exit" - Quit the research bot');
        console.log('  • "help" - Show this help message');
        console.log('  • "status" - Show current research status\n');
        continue;
      }

      if (userInput.toLowerCase() === 'status') {
        const status = researchManager.getCurrentStatus();
        console.log('\n📊 Research Status:', status);
        continue;
      }

      if (userInput.length === 0) {
        continue;
      }

      logger.info(`🔍 Starting research on: "${userInput}"`);

      const depth = await getResearchDepth();

      const request: ResearchRequest = {
        topic: userInput,
        depth,
        maxSearchQueries: depth === 'basic' ? 3 : depth === 'expert' ? 6 : 4,
        includeAnalysis: true,
        urgency: 'medium',
      };

      console.log('\n⏳ Conducting research... This may take a moment.\n');

      try {
        const startTime = Date.now();
        const result = await researchManager.conductResearch(request);

        console.log('\n' + '='.repeat(80));
        console.log(`🔬 RESEARCH REPORT: ${userInput}`);
        console.log('='.repeat(80));
        console.log(result.finalReport);
        console.log('='.repeat(80));

        const executionTime = Date.now() - startTime;
        console.log(`\n📈 Research completed in ${(executionTime / 1000).toFixed(2)} seconds`);
        console.log(`📊 Statistics: ${result.metadata.searchQueriesUsed} searches, ${result.metadata.agentExecutions} agent executions\n`);

      } catch (error) {
        logger.error('❌ Research failed:', error);
        console.log('❌ Sorry, the research failed. Please try again with a different topic.\n');
      }
    }
  } catch (error) {
    logger.error('❌ Interactive research bot error:', error);
  } finally {
    rl.close();
    logger.info('✅ Interactive research bot session completed');
  }
}

// Demo showcasing agent handoffs and coordination
async function agentCoordinationDemo() {
  logger.info('🚀 Starting Agent Coordination Demo');

  const researchManager = new ResearchManager();

  console.log('\n🤖 Agent Coordination Demo');
  console.log('This demo shows how multiple specialized agents work together:');
  console.log('1. Planner Agent - Creates research strategy');
  console.log('2. Search Agent - Gathers information');
  console.log('3. Writer Agent - Synthesizes final report\n');

  const request: ResearchRequest = {
    topic: 'Microservices architecture patterns and best practices',
    depth: 'comprehensive',
    maxSearchQueries: 4,
    includeAnalysis: true,
    urgency: 'medium',
  };

  try {
    console.log('🔄 Demonstrating multi-agent coordination...\n');

    const result = await researchManager.conductResearch(request);

    // Show execution log to demonstrate agent handoffs
    const executionLog = researchManager.getExecutionLog();

    console.log('📋 Agent Execution Timeline:');
    console.log('-'.repeat(50));

    executionLog.forEach((execution, index) => {
      console.log(`${index + 1}. ${execution.agentName.toUpperCase()} - ${execution.timestamp.toLocaleTimeString()}`);
      console.log(`   Phase: ${execution.metadata?.phase || 'unknown'}`);
      console.log(`   Success: ${execution.success ? '✅' : '❌'}`);
      if (execution.metadata?.query) {
        console.log(`   Query: "${execution.metadata.query}"`);
      }
      console.log();
    });

    console.log('\n' + '='.repeat(80));
    console.log('🔬 FINAL RESEARCH REPORT');
    console.log('='.repeat(80));
    console.log(result.finalReport);
    console.log('='.repeat(80));

    logger.info('✅ Agent coordination demo completed successfully');

  } catch (error) {
    logger.error('❌ Agent coordination demo failed:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'demo';

  switch (mode) {
    case 'interactive':
      interactiveResearchBot().catch(console.error);
      break;
    case 'coordination':
      agentCoordinationDemo().catch(console.error);
      break;
    case 'demo':
    default:
      researchBotExample().catch(console.error);
      break;
  }
}

export { researchBotExample, interactiveResearchBot, agentCoordinationDemo };