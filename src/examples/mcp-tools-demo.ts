import { MCPServerStdio, hostedMcpTool } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { AgentTemplates } from '../context/context-aware-agent.js';
import path from 'path';

/**
 * MCP Tools Demo
 * Demonstrates how to use MCP tools with context-aware agents
 */

async function mcpToolsDemo() {
  logger.info('🚀 MCP Tools Demo başlatılıyor...');

  try {
    // 1. Filesystem MCP Server oluştur
    const filesystemServer = new MCPServerStdio({
      name: 'Filesystem',
      fullCommand: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', path.resolve('./sample_files')],
    });

    logger.mcp('Filesystem', 'Filesystem MCP server oluşturuldu');

    // 2. Odeabank MCP Tool (Hosted) oluştur
    const odeabankTool = hostedMcpTool({
      serverLabel: 'odeabank',
      serverUrl: 'http://localhost:3000', // Odeabank MCP server URL'i
    });

    logger.mcp('Odeabank', 'Odeabank MCP tool oluşturuldu');

    // 3. MCP toolları ile agent oluştur
    const agent = AgentTemplates.generalAssistant(
      'demo-user',
      env.OPENAI_MODEL,
      [filesystemServer], // MCP servers
      [odeabankTool] // Hosted tools
    );

    logger.info('✅ Agent MCP toolları ile oluşturuldu');

    // 4. Filesystem tool test
    console.log('\n📂 Test 1: Filesystem - Dosyaları listele');
    console.log('='.repeat(50));
    
    const filesResponse = await agent.processInput(
      'sample_files dizinindeki dosyaları listele',
      { stream: false, includeMemory: true }
    );
    
    console.log(filesResponse.content);
    console.log('='.repeat(50) + '\n');

    // 5. Odeabank tool test (currency rates)
    console.log('\n💱 Test 2: Odeabank - Döviz kurları');
    console.log('='.repeat(50));
    
    const currencyResponse = await agent.processInput(
      'Bugünkü dolar ve euro kurları nedir?',
      { stream: false, includeMemory: true }
    );
    
    console.log(currencyResponse.content);
    console.log('='.repeat(50) + '\n');

    // 6. Odeabank tool test (branches)
    console.log('\n🏦 Test 3: Odeabank - Ankara şubeleri');
    console.log('='.repeat(50));
    
    const branchesResponse = await agent.processInput(
      'Ankara\'daki Odeabank şubelerini listele',
      { stream: false, includeMemory: true }
    );
    
    console.log(branchesResponse.content);
    console.log('='.repeat(50) + '\n');

    logger.info('✅ MCP Tools Demo tamamlandı!');

  } catch (error) {
    logger.error('❌ MCP Tools Demo hatası:', error);
    throw error;
  }
}

// Eğer doğrudan çalıştırılırsa
if (import.meta.url === `file://${process.argv[1]}`) {
  mcpToolsDemo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { mcpToolsDemo };
