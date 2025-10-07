import { Agent, run } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

async function helloWorldExample() {
  logger.info('🚀 Starting Hello World Agent Example');

  // Create a basic agent that writes haiku about programming
  const agent = new Agent({
    name: 'Haiku Poet',
    instructions: `You are a creative AI assistant that writes beautiful haiku about programming and technology.
    Always respond with exactly one haiku (5-7-5 syllable pattern).
    Make your haiku inspiring and thoughtful about the world of code.`,
    model: env.OPENAI_MODEL,
  });

  try {
    // Test with a simple request
    logger.agent('Haiku Poet', 'Requesting haiku about recursion...');

    const result = await run(
      agent,
      'Write a haiku about recursion in programming.'
    );

    logger.info('📝 Generated Haiku:');
    console.log('\n' + '='.repeat(40));
    console.log(result.finalOutput);
    console.log('='.repeat(40) + '\n');

    // Test with another topic
    logger.agent('Haiku Poet', 'Requesting haiku about debugging...');

    const result2 = await run(
      agent,
      'Write a haiku about the joy of fixing a difficult bug.'
    );

    logger.info('📝 Generated Haiku:');
    console.log('\n' + '='.repeat(40));
    console.log(result2.finalOutput);
    console.log('='.repeat(40) + '\n');

    logger.info('✅ Hello World example completed successfully!');

  } catch (error) {
    logger.error('❌ Hello World example failed:', error);
    throw error;
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  helloWorldExample().catch(console.error);
}

export { helloWorldExample };