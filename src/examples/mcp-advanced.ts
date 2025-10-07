import { Agent, run } from '@openai/agents';
import { MCPServerManager, MCPServerFactory, mcpServerManager } from '../mcp/server-types.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import * as readline from 'readline';

async function mcpServerTypesDemo() {
  logger.info('🚀 Starting Advanced MCP Server Types Demo');

  console.log('\n🔌 Advanced MCP Server Integration Demo');
  console.log('This demo showcases all three types of MCP servers:\n');

  // Example 1: Stdio MCP Server (Filesystem)
  logger.info('📁 Example 1: Stdio MCP Server (Filesystem)');

  try {
    // Create filesystem server using factory
    const filesystemConfig = MCPServerFactory.createFilesystemServer(env.MCP_FILESYSTEM_PATH);
    const filesystemServer = mcpServerManager.createStdioServer(filesystemConfig);

    // Create agent with filesystem access
    const filesystemAgent = new Agent({
      name: 'Filesystem Agent',
      instructions: `You are a filesystem assistant with access to files through MCP.
      You can read files, analyze content, and provide insights about the available data.
      Always be helpful and provide detailed responses about file contents.`,
      model: env.OPENAI_MODEL,
      mcpServers: [filesystemServer],
    });

    console.log('📁 Testing Stdio MCP Server (Filesystem)...\n');

    const result = await run(
      filesystemAgent,
      'Please analyze all the files in the directory and create a summary of the available content. What types of information are stored here?'
    );

    console.log('🤖 Filesystem Agent Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Stdio MCP server demo failed:', error);
    console.log('❌ Stdio MCP server demo failed - check your filesystem access\n');
  }

  // Example 2: HTTP MCP Server (Mock Database)
  logger.info('🌐 Example 2: HTTP MCP Server (Mock Database)');

  try {
    // Create mock database server
    const dbConfig = MCPServerFactory.createDatabaseServer('http://localhost:3001/api');

    // Note: This would normally connect to a real HTTP MCP server
    // For demo purposes, we'll show the configuration
    console.log('🌐 HTTP MCP Server Configuration:');
    console.log(`  Name: ${dbConfig.name}`);
    console.log(`  URL: ${dbConfig.url}`);
    console.log(`  Timeout: ${dbConfig.timeout}ms`);
    console.log(`  Headers: ${JSON.stringify(dbConfig.headers, null, 2)}`);
    console.log('\n✅ HTTP MCP server would be created in production environment\n');

  } catch (error) {
    logger.error('❌ HTTP MCP server demo failed:', error);
  }

  // Example 3: Hosted MCP Tool (Mock Web Search)
  logger.info('🔍 Example 3: Hosted MCP Tool (Mock Web Search)');

  try {
    // Create hosted web search tool
    const searchConfig = MCPServerFactory.createWebSearchServer('mock-api-key');

    console.log('🔍 Hosted MCP Tool Configuration:');
    console.log(`  Name: ${searchConfig.name}`);
    console.log(`  Server Label: ${searchConfig.serverLabel}`);
    console.log(`  Server URL: ${searchConfig.serverUrl}`);
    console.log(`  Requires Human Approval: ${searchConfig.requiresHumanApproval}`);
    console.log('\n✅ Hosted MCP tool configured successfully\n');

  } catch (error) {
    logger.error('❌ Hosted MCP tool demo failed:', error);
  }

  // Server management demo
  logger.info('⚙️ Server Management Demo');

  console.log('📊 MCP Server Status:');
  const servers = mcpServerManager.listServers();
  servers.forEach(server => {
    console.log(`  • ${server.name} (${server.type}) - ${server.status}`);
  });

  const healthStatus = await mcpServerManager.healthCheck();
  console.log('\n💚 Server Health Status:');
  Object.entries(healthStatus).forEach(([name, healthy]) => {
    console.log(`  • ${name}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  });

  logger.info('✅ Advanced MCP server types demo completed');
}

async function mcpToolFilteringDemo() {
  logger.info('🚀 Starting MCP Tool Filtering Demo');

  console.log('\n🎯 MCP Tool Filtering Demo');
  console.log('This demo shows how to selectively expose MCP tools\n');

  try {
    // Create filesystem server with tool filtering
    const filteredConfig = {
      ...MCPServerFactory.createFilesystemServer(env.MCP_FILESYSTEM_PATH),
      tools: ['read_file'], // Only expose read_file tool, not list_directory or write_file
    };

    const filteredServer = mcpServerManager.createStdioServer(filteredConfig);

    const restrictedAgent = new Agent({
      name: 'Restricted File Agent',
      instructions: `You are a read-only file assistant with limited capabilities.
      You can only read specific files when provided with exact file names.
      You cannot list directories or write files.
      Be helpful within your constraints.`,
      model: env.OPENAI_MODEL,
      mcpServers: [filteredServer],
    });

    console.log('🎯 Testing Tool Filtering (read-only access)...\n');

    const result = await run(
      restrictedAgent,
      'Please read the books.txt file and tell me about the first programming book mentioned.'
    );

    console.log('🤖 Restricted Agent Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

    console.log('🔒 Note: This agent can only read files, not list directories or write files\n');

  } catch (error) {
    logger.error('❌ Tool filtering demo failed:', error);
  }

  logger.info('✅ MCP tool filtering demo completed');
}

async function mcpMultiServerDemo() {
  logger.info('🚀 Starting Multi-Server MCP Demo');

  console.log('\n🔗 Multi-Server MCP Integration Demo');
  console.log('This demo shows how agents can use multiple MCP servers simultaneously\n');

  try {
    // Create multiple servers
    const filesystemServer = mcpServerManager.createStdioServer(
      MCPServerFactory.createFilesystemServer(env.MCP_FILESYSTEM_PATH)
    );

    // Create an agent with multiple MCP servers
    const multiServerAgent = new Agent({
      name: 'Multi-Server Agent',
      instructions: `You are an advanced assistant with access to multiple data sources through MCP servers.
      You can access filesystem data and potentially other services.
      Use all available tools to provide comprehensive and helpful responses.
      Combine information from different sources when relevant.`,
      model: env.OPENAI_MODEL,
      mcpServers: [filesystemServer], // In production, you'd add more servers here
    });

    console.log('🔗 Testing Multi-Server Integration...\n');

    const result = await run(
      multiServerAgent,
      'Based on all available data sources, create a learning plan for someone who wants to become a full-stack developer. Include book recommendations, project ideas, and study music suggestions.'
    );

    console.log('🤖 Multi-Server Agent Response:');
    console.log('='.repeat(60));
    console.log(result.finalOutput);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    logger.error('❌ Multi-server demo failed:', error);
  }

  logger.info('✅ Multi-server MCP demo completed');
}

async function interactiveMcpDemo() {
  logger.info('🚀 Starting Interactive MCP Demo');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🎮 Interactive MCP Server Management');
  console.log('Available commands:');
  console.log('  list - List all MCP servers');
  console.log('  create - Create a new MCP server');
  console.log('  remove - Remove an MCP server');
  console.log('  health - Check server health');
  console.log('  query - Query an agent with MCP access');
  console.log('  exit - Exit the demo\n');

  function getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, (input) => {
        resolve(input.trim());
      });
    });
  }

  try {
    while (true) {
      const command = await getUserInput('🔌 Enter command: ');

      switch (command.toLowerCase()) {
        case 'exit':
          logger.info('👋 Interactive MCP demo ended by user');
          return;

        case 'list':
          const servers = mcpServerManager.listServers();
          console.log('\n📋 Registered MCP Servers:');
          if (servers.length === 0) {
            console.log('  No servers registered\n');
          } else {
            servers.forEach(server => {
              console.log(`  • ${server.name} (${server.type}) - ${server.status}`);
            });
            console.log();
          }
          break;

        case 'create':
          const serverType = await getUserInput('Server type (filesystem/database/websearch): ');
          const serverName = await getUserInput('Server name: ');

          try {
            switch (serverType.toLowerCase()) {
              case 'filesystem':
                const basePath = await getUserInput('Base path [./sample_files]: ') || './sample_files';
                const config = { ...MCPServerFactory.createFilesystemServer(basePath), name: serverName };
                mcpServerManager.createStdioServer(config);
                console.log(`✅ Filesystem server '${serverName}' created\n`);
                break;

              default:
                console.log('❌ Unsupported server type for this demo\n');
            }
          } catch (error) {
            console.log(`❌ Failed to create server: ${error}\n`);
          }
          break;

        case 'remove':
          const removeServerName = await getUserInput('Server name to remove: ');
          const removed = mcpServerManager.removeServer(removeServerName);
          console.log(removed ? `✅ Server '${removeServerName}' removed\n` : `❌ Server '${removeServerName}' not found\n`);
          break;

        case 'health':
          console.log('🔍 Checking server health...');
          const health = await mcpServerManager.healthCheck();
          console.log('\n💚 Server Health Status:');
          Object.entries(health).forEach(([name, healthy]) => {
            console.log(`  • ${name}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          });
          console.log();
          break;

        case 'query':
          const availableServers = mcpServerManager.listServers();
          if (availableServers.length === 0) {
            console.log('❌ No MCP servers available. Create some servers first.\n');
            break;
          }

          const query = await getUserInput('Enter your query: ');
          if (query.length === 0) break;

          try {
            console.log('⏳ Processing query with MCP agent...\n');

            // Create a temporary agent with all available servers
            const queryAgent = new Agent({
              name: 'Query Agent',
              instructions: 'You are a helpful assistant with access to various data sources through MCP servers. Provide comprehensive and accurate responses.',
              model: env.OPENAI_MODEL,
              mcpServers: mcpServerManager.getAllServers(),
            });

            const result = await run(queryAgent, query);

            console.log('🤖 Agent Response:');
            console.log('='.repeat(50));
            console.log(result.finalOutput);
            console.log('='.repeat(50) + '\n');

          } catch (error) {
            console.log(`❌ Query failed: ${error}\n`);
          }
          break;

        default:
          console.log('❌ Unknown command. Type "exit" to quit.\n');
      }
    }
  } catch (error) {
    logger.error('❌ Interactive MCP demo error:', error);
  } finally {
    rl.close();
    logger.info('✅ Interactive MCP demo completed');
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'types';

  switch (mode) {
    case 'filtering':
      mcpToolFilteringDemo().catch(console.error);
      break;
    case 'multi':
      mcpMultiServerDemo().catch(console.error);
      break;
    case 'interactive':
      interactiveMcpDemo().catch(console.error);
      break;
    case 'types':
    default:
      mcpServerTypesDemo().catch(console.error);
      break;
  }
}

export { mcpServerTypesDemo, mcpToolFilteringDemo, mcpMultiServerDemo, interactiveMcpDemo };