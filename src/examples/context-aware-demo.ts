import { createContextAwareAgent, AgentTemplates } from '../context/context-aware-agent.js';
import { memoryManager } from '../context/memory-manager.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import * as readline from 'readline/promises';

/**
 * Interactive demo showcasing context-aware agents with memory management
 */
export async function runContextAwareDemo() {
  logger.info('🧠 Starting Context-Aware Agent Demo');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Demo user
    const userId = 'demo-user-001';

    console.log('\n🎭 Welcome to Context-Aware Agent Demo!');
    console.log('Available agent types:');
    console.log('1. general - General assistant with memory');
    console.log('2. research - Research assistant with context');
    console.log('3. code - Code assistant with development context');
    console.log('4. customer-service - Customer service with history');
    console.log('\nType "exit" to quit, "memory" to view memories, "stats" to see statistics\n');

    // Agent selection
    const agentType = await rl.question('Select agent type (general/research/code/customer-service): ');

    if (!['general', 'research', 'code', 'customer-service'].includes(agentType)) {
      console.log('Invalid agent type, using general assistant');
    }

    // Create context-aware agent
    const agent = createContextAwareAgent({
      name: `Context-Aware ${agentType} Agent`,
      instructions: `You are a ${agentType} assistant with advanced context awareness and memory capabilities.`,
      model: env.OPENAI_MODEL,
      userId,
      memoryEnabled: true,
      guardrailsEnabled: true,
      approvalRequired: agentType === 'code' // Code agent requires approval
    });

    console.log(`\n🤖 ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent initialized with context awareness!`);
    console.log('The agent will remember our conversation and your preferences.\n');

    // Add some initial memories for demonstration
    await agent.addMemory('preference', 'User prefers detailed explanations', 0.8, ['explanation-style']);
    await agent.addMemory('fact', 'User is working on a TypeScript project', 0.9, ['project-context']);

    // Interactive chat loop
    while (true) {
      const userInput = await rl.question('You: ');

      if (userInput.toLowerCase() === 'exit') {
        break;
      }

      if (userInput.toLowerCase() === 'memory') {
        await showMemories(agent, userId);
        continue;
      }

      if (userInput.toLowerCase() === 'stats') {
        await showStats();
        continue;
      }

      if (userInput.toLowerCase() === 'reset') {
        await agent.resetConversation();
        console.log('🔄 Conversation reset. Starting fresh!\n');
        continue;
      }

      if (userInput.toLowerCase() === 'export') {
        const data = await agent.exportConversation();
        console.log('📥 Conversation data exported:');
        console.log(JSON.stringify(data, null, 2));
        continue;
      }

      try {
        console.log('\n🤖 Agent: ', { toJSON: () => '' }); // Prevents logging

        // Process with context awareness
        const response = await agent.processInput(userInput, {
          stream: false,
          includeMemory: true
        });

        // Display response with streaming effect
        await simulateStreaming(response.content);

        // Show any new memories discovered
        if (response.memories && response.memories.length > 0) {
          console.log('\n💭 New memories discovered:');
          response.memories.forEach(memory => {
            console.log(`  • ${memory.type}: ${memory.content.substring(0, 60)}...`);
          });
        }

        // Show any warnings
        if (response.guardrailWarnings && response.guardrailWarnings.length > 0) {
          console.log('\n⚠️ Guardrail warnings:');
          response.guardrailWarnings.forEach(warning => {
            console.log(`  • ${warning}`);
          });
        }

        console.log('\n');

      } catch (error) {
        logger.error('Demo error:', error);
        console.log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }
    }

  } catch (error) {
    logger.error('Context-aware demo failed:', error);
    console.log('❌ Demo failed:', error);
  } finally {
    rl.close();
  }
}

/**
 * Show memories for the demo user
 */
async function showMemories(agent: any, userId: string) {
  const memories = await agent.searchMemories('', { limit: 20 });

  console.log('\n🧠 Current Memories:');

  if (memories.length === 0) {
    console.log('  No memories found');
  } else {
    const memoryByType = memories.reduce((acc, memory) => {
      acc[memory.type] = acc[memory.type] || [];
      acc[memory.type].push(memory);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(memoryByType).forEach(([type, typeMemories]) => {
      console.log(`\n  ${type.toUpperCase()}:`);
      (typeMemories as any[]).forEach((memory: any) => {
        const confidence = Math.round(memory.confidence * 100);
        console.log(`    • ${memory.content.substring(0, 80)}... (${confidence}%)`);
      });
    });
  }

  console.log('');
}

/**
 * Show system statistics
 */
async function showStats() {
  const stats = memoryManager.getMemoryStats();

  console.log('\n📊 System Statistics:');
  console.log(`  Total Conversations: ${stats.totalConversations}`);
  console.log(`  Total Memories: ${stats.totalMemories}`);
  console.log(`  Average Confidence: ${Math.round(stats.averageConfidence * 100)}%`);
  console.log(`  Active Context Windows: ${stats.contextWindowsActive}`);

  console.log('\n  Memory by Type:');
  Object.entries(stats.memoryByType).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });

  console.log('');
}

/**
 * Simulate streaming text output
 */
async function simulateStreaming(text: string, delay = 30) {
  const words = text.split(' ');

  for (let i = 0; i < words.length; i++) {
    process.stdout.write((i === 0 ? '' : ' ') + words[i]);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log(''); // New line after streaming
}

/**
 * Demo scenario: Research assistant with memory
 */
export async function runResearchScenario() {
  logger.info('🔬 Starting Research Scenario Demo');

  const userId = 'researcher-001';
  const agent = AgentTemplates.researchAssistant(userId, env.OPENAI_MODEL);

  console.log('\n🔬 Research Assistant Scenario');
  console.log('This scenario demonstrates how the agent remembers research topics and builds context.\n');

  const queries = [
    'I need to research artificial intelligence trends in 2024',
    'What are the key machine learning frameworks I should know about?',
    'Can you help me understand transformer architectures?',
    'I want to go back to AI trends - what did we discuss about that earlier?'
  ];

  for (const [index, query] of queries.entries()) {
    console.log(`\n📝 Query ${index + 1}: ${query}`);
    console.log('🤖 Research Assistant: ');

    try {
      const response = await agent.processInput(query, {
        includeMemory: true
      });

      await simulateStreaming(response.content);

      // Show context being built
      if (index > 0) {
        const relatedMemories = await agent.searchMemories(query, { limit: 3 });
        if (relatedMemories.length > 0) {
          console.log('\n💭 Using previous context:');
          relatedMemories.forEach(memory => {
            console.log(`  • ${memory.content.substring(0, 60)}...`);
          });
        }
      }

    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }

    // Add artificial delay between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Research scenario completed! The agent built context across multiple queries.');
}

/**
 * Demo scenario: Code assistant with project context
 */
export async function runCodeScenario() {
  logger.info('💻 Starting Code Assistant Scenario');

  const userId = 'developer-001';
  const agent = AgentTemplates.codeAssistant(userId, env.OPENAI_MODEL);

  console.log('\n💻 Code Assistant Scenario');
  console.log('This scenario shows how the agent maintains programming context and preferences.\n');

  // Add project context
  await agent.addMemory('context', 'Working on TypeScript project with OpenAI Agents SDK', 0.9, ['project']);
  await agent.addMemory('preference', 'Prefers async/await over promises', 0.8, ['coding-style']);
  await agent.addMemory('preference', 'Uses functional programming patterns', 0.7, ['coding-style']);

  const codeQueries = [
    'Help me write a function to validate user input',
    'How should I handle errors in my validation function?',
    'Can you refactor that validation code to be more functional?',
    'What testing approach would you recommend for these functions?'
  ];

  for (const [index, query] of codeQueries.entries()) {
    console.log(`\n⌨️  Query ${index + 1}: ${query}`);
    console.log('🤖 Code Assistant: ');

    try {
      const response = await agent.processInput(query, {
        includeMemory: true,
        bypassApproval: true // For demo purposes
      });

      await simulateStreaming(response.content);

    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Code scenario completed! The agent maintained coding context and preferences.');
}

// Run demo based on command line argument
if (process.argv[2] === 'research') {
  runResearchScenario().catch(console.error);
} else if (process.argv[2] === 'code') {
  runCodeScenario().catch(console.error);
} else {
  runContextAwareDemo().catch(console.error);
}