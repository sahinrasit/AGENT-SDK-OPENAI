import { Agent, run } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import * as readline from 'readline';

async function chatStreamingExample() {
  logger.info('🚀 Starting Chat Streaming Agent Example');

  // Create an interactive chat agent
  const agent = new Agent({
    name: 'Interactive Assistant',
    instructions: `You are a helpful and friendly AI assistant.
    Provide clear, concise, and helpful responses to user questions.
    You can help with programming, technology, general knowledge, and creative tasks.
    Keep your responses engaging and conversational.`,
    model: env.OPENAI_MODEL,
  });

  // Set up readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logger.info('💬 Interactive Chat Started');
  console.log('Type "exit" to quit the chat\n');

  // Function to handle streaming responses
  async function handleStreamingChat(userInput: string) {
    try {
      logger.debug(`User input: ${userInput}`);

      // Run the agent with streaming enabled
      const result = await run(agent, userInput, { stream: true });

      console.log('\n🤖 Assistant: ');

      // Convert to text stream and pipe to stdout
      const textStream = result.toTextStream();

      // Handle streaming events
      for await (const chunk of textStream) {
        process.stdout.write(chunk);
      }

      console.log('\n');
      logger.debug('Streaming response completed');

    } catch (error) {
      logger.error('❌ Error in streaming chat:', error);
      console.log('Sorry, I encountered an error. Please try again.\n');
    }
  }

  // Function to get user input
  function getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      rl.question('👤 You: ', (input) => {
        resolve(input.trim());
      });
    });
  }

  // Main chat loop
  try {
    while (true) {
      const userInput = await getUserInput();

      if (userInput.toLowerCase() === 'exit') {
        logger.info('👋 Chat session ended by user');
        break;
      }

      if (userInput.length === 0) {
        continue;
      }

      await handleStreamingChat(userInput);
    }
  } catch (error) {
    logger.error('❌ Chat session error:', error);
  } finally {
    rl.close();
    logger.info('✅ Chat streaming example completed');
  }
}

// Advanced streaming example with event handling
async function advancedStreamingExample() {
  logger.info('🚀 Starting Advanced Streaming Example');

  const agent = new Agent({
    name: 'Story Teller',
    instructions: `You are a creative storyteller. When asked to tell a story,
    create an engaging narrative with vivid descriptions and interesting characters.
    Make your stories approximately 200-300 words long.`,
    model: env.OPENAI_MODEL,
  });

  try {
    logger.agent('Story Teller', 'Creating a streaming story...');

    const result = await run(
      agent,
      'Tell me a short story about a programmer who discovers their code can affect reality.',
      { stream: true }
    );

    console.log('\n📖 Streaming Story:\n');
    console.log('='.repeat(60));

    // Handle the streaming response with detailed event processing
    const textStream = result.toTextStream();
    let wordCount = 0;

    for await (const chunk of textStream) {
      process.stdout.write(chunk);

      // Count words for demonstration
      wordCount += chunk.split(/\s+/).length;

      // Add a small delay to make streaming visible
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n' + '='.repeat(60));
    logger.info(`📊 Story completed - approximately ${wordCount} words streamed`);

  } catch (error) {
    logger.error('❌ Advanced streaming example failed:', error);
    throw error;
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'chat';

  if (mode === 'advanced') {
    advancedStreamingExample().catch(console.error);
  } else {
    chatStreamingExample().catch(console.error);
  }
}

export { chatStreamingExample, advancedStreamingExample };