import { Agent, run, MCPServerStdio } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import path from 'path';

async function mcpFilesystemExample() {
  logger.info('🚀 Starting MCP Filesystem Server Example');

  try {
    // Create MCP server for filesystem access
    const mcpServer = new MCPServerStdio({
      name: 'Filesystem MCP Server',
      fullCommand: 'npx -y @modelcontextprotocol/server-filesystem',
      args: [path.resolve(env.MCP_FILESYSTEM_PATH)],
    });

    logger.mcp('Filesystem', 'Starting MCP filesystem server...');

    // Create agent with MCP tools
    const agent = new Agent({
      name: 'File Assistant',
      instructions: `You are a helpful assistant that can read and analyze files.
      You have access to a filesystem through MCP tools.
      When asked about files, use the available tools to read and provide information about the content.
      Be helpful and provide detailed responses about what you find in the files.`,
      model: env.OPENAI_MODEL,
      mcpServers: [mcpServer],
    });

    logger.agent('File Assistant', 'Agent created with MCP filesystem access');

    // Test 1: List available files
    logger.info('📂 Test 1: Discovering available files...');

    const listResult = await run(
      agent,
      'What files are available in the sample_files directory? Please list them and briefly describe what each might contain based on their names.'
    );

    console.log('\n🔍 Available Files:');
    console.log('='.repeat(50));
    console.log(listResult.finalOutput);
    console.log('='.repeat(50) + '\n');

    // Test 2: Read and analyze books file
    logger.info('📖 Test 2: Analyzing books file...');

    const booksResult = await run(
      agent,
      'Please read the books.txt file and tell me about the programming books listed there. Which book would you recommend for a beginner?'
    );

    console.log('\n📚 Books Analysis:');
    console.log('='.repeat(50));
    console.log(booksResult.finalOutput);
    console.log('='.repeat(50) + '\n');

    // Test 3: Read and analyze music file
    logger.info('🎵 Test 3: Analyzing music file...');

    const musicResult = await run(
      agent,
      'Read the favorite_songs.txt file and create a summary of the different music categories for coding. Which type of music would be best for focused programming work?'
    );

    console.log('\n🎶 Music Analysis:');
    console.log('='.repeat(50));
    console.log(musicResult.finalOutput);
    console.log('='.repeat(50) + '\n');

    // Test 4: Cross-file analysis
    logger.info('🔄 Test 4: Cross-file analysis...');

    const analysisResult = await run(
      agent,
      'Based on all the files you can access, create a personalized recommendation for someone who wants to start learning programming. Include book recommendations and music suggestions for study sessions.'
    );

    console.log('\n💡 Personalized Recommendations:');
    console.log('='.repeat(60));
    console.log(analysisResult.finalOutput);
    console.log('='.repeat(60) + '\n');

    logger.info('✅ MCP Filesystem example completed successfully!');

  } catch (error) {
    logger.error('❌ MCP Filesystem example failed:', error);
    throw error;
  }
}

// Tool filtering example
async function mcpToolFilterExample() {
  logger.info('🚀 Starting MCP Tool Filter Example');

  try {
    // Create MCP server with specific tool filtering
    const mcpServer = new MCPServerStdio({
      name: 'Filtered Filesystem MCP Server',
      fullCommand: 'npx -y @modelcontextprotocol/server-filesystem',
      args: [path.resolve(env.MCP_FILESYSTEM_PATH)],
    });

    logger.mcp('Filtered Filesystem', 'Starting MCP server with tool filtering...');

    const agent = new Agent({
      name: 'Read-Only Assistant',
      instructions: `You are a read-only file assistant.
      You can only read files, not list directories or write files.
      Help users by reading and analyzing file contents when they provide specific file names.`,
      model: env.OPENAI_MODEL,
      mcpServers: [mcpServer],
    });

    logger.agent('Read-Only Assistant', 'Agent created with filtered MCP tools');

    // Test with filtered tools
    const result = await run(
      agent,
      'Please read the books.txt file and tell me about the first book mentioned in the list.'
    );

    console.log('\n📖 Filtered Tool Result:');
    console.log('='.repeat(50));
    console.log(result.finalOutput);
    console.log('='.repeat(50) + '\n');

    logger.info('✅ MCP Tool Filter example completed successfully!');

  } catch (error) {
    logger.error('❌ MCP Tool Filter example failed:', error);
    throw error;
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'full';

  if (mode === 'filter') {
    mcpToolFilterExample().catch(console.error);
  } else {
    mcpFilesystemExample().catch(console.error);
  }
}

export { mcpFilesystemExample, mcpToolFilterExample };