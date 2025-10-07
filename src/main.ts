import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import { helloWorldExample } from './examples/hello-world.js';
import { chatStreamingExample, advancedStreamingExample } from './examples/chat-streaming.js';
import { mcpFilesystemExample, mcpToolFilterExample } from './examples/mcp-filesystem.js';
import { researchBotExample, interactiveResearchBot, agentCoordinationDemo } from './examples/research-bot.js';
import { handoffDemoExample, customerServiceDemo, interactiveHandoffDemo } from './examples/handoff-demo.js';
import { mcpServerTypesDemo, mcpToolFilteringDemo, mcpMultiServerDemo } from './examples/mcp-advanced.js';
import { runContextAwareDemo, runResearchScenario, runCodeScenario } from './examples/context-aware-demo.js';
import { runTestSuite } from './testing/test-suite.js';

async function main() {
  logger.info('🚀 Starting IBM Tech Agent Platform');
  logger.info(`📋 Configuration: ${env.NODE_ENV} mode, Model: ${env.OPENAI_MODEL}`);

  try {
    // Get command line arguments to determine which example to run
    const example = process.argv[2] || 'hello';

    switch (example) {
      case 'hello':
        await helloWorldExample();
        break;

      case 'chat':
        await chatStreamingExample();
        break;

      case 'stream':
        await advancedStreamingExample();
        break;

      case 'mcp':
        await mcpFilesystemExample();
        break;

      case 'mcp-filter':
        await mcpToolFilterExample();
        break;

      case 'research':
        await researchBotExample();
        break;

      case 'research-interactive':
        await interactiveResearchBot();
        break;

      case 'research-coordination':
        await agentCoordinationDemo();
        break;

      case 'handoff':
        await handoffDemoExample();
        break;

      case 'handoff-customer':
        await customerServiceDemo();
        break;

      case 'handoff-interactive':
        await interactiveHandoffDemo();
        break;

      case 'mcp-types':
        await mcpServerTypesDemo();
        break;

      case 'mcp-filtering':
        await mcpToolFilteringDemo();
        break;

      case 'mcp-multi':
        await mcpMultiServerDemo();
        break;

      case 'context':
        await runContextAwareDemo();
        break;

      case 'context-research':
        await runResearchScenario();
        break;

      case 'context-code':
        await runCodeScenario();
        break;

      case 'test':
        await runTestSuite();
        break;

      case 'all':
        logger.info('🔄 Running all examples...');
        await helloWorldExample();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await advancedStreamingExample();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await mcpFilesystemExample();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await researchBotExample();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await handoffDemoExample();
        break;

      default:
        logger.info('📚 Available examples:');
        console.log('\n🚀 Basic Examples:');
        console.log('  tsx src/main.ts hello                - Basic hello world agent');
        console.log('  tsx src/main.ts chat                 - Interactive chat with streaming');
        console.log('  tsx src/main.ts stream               - Advanced streaming example');

        console.log('\n🔬 Research & Multi-Agent:');
        console.log('  tsx src/main.ts research             - Research bot demo');
        console.log('  tsx src/main.ts research-interactive - Interactive research bot');
        console.log('  tsx src/main.ts research-coordination - Agent coordination demo');

        console.log('\n🔄 Agent Handoffs:');
        console.log('  tsx src/main.ts handoff              - Agent handoff demo');
        console.log('  tsx src/main.ts handoff-customer     - Customer service handoffs');
        console.log('  tsx src/main.ts handoff-interactive  - Interactive handoff demo');

        console.log('\n🔌 MCP Integration:');
        console.log('  tsx src/main.ts mcp                  - Basic MCP filesystem');
        console.log('  tsx src/main.ts mcp-filter           - MCP with tool filtering');
        console.log('  tsx src/main.ts mcp-types            - All MCP server types');
        console.log('  tsx src/main.ts mcp-filtering        - Advanced tool filtering');
        console.log('  tsx src/main.ts mcp-multi            - Multi-server integration');

        console.log('\n🧠 Context Management:');
        console.log('  tsx src/main.ts context              - Interactive context-aware agent');
        console.log('  tsx src/main.ts context-research     - Research scenario with memory');
        console.log('  tsx src/main.ts context-code         - Code assistant with context');

        console.log('\n🧪 Testing:');
        console.log('  tsx src/main.ts test                 - Run comprehensive test suite');

        console.log('\n🎯 Special:');
        console.log('  tsx src/main.ts all                  - Run all examples');

        console.log('\n📦 NPM Scripts:');
        console.log('  pnpm start:hello-world    pnpm start:research-bot');
        console.log('  pnpm start:chat-streaming  pnpm start:handoff-demo');
        console.log('  pnpm start:mcp-filesystem  pnpm start:mcp-advanced');
        break;
    }

    logger.info('✅ IBM Tech Agent Platform completed successfully!');

  } catch (error) {
    logger.error('❌ IBM Tech Agent Platform failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('👋 Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Gracefully shutting down...');
  process.exit(0);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}