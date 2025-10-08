/**
 * MCP Server Manager
 * Handles MCP server initialization and management
 */

import { MCPServerStreamableHttp, hostedMcpTool, getAllMcpTools } from '@openai/agents';
import { MCPServerConfig } from './types.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export class MCPManager {
  private mcpServers: any[] = [];
  private mcpTools: any[] = [];
  private mcpToolRegistry: Map<string, any[]> = new Map();
  private mcpConfigPath: string;

  constructor(configPath?: string) {
    this.mcpConfigPath = configPath || path.resolve(process.cwd(), 'mcp.json');
  }

  /**
   * Read MCP configuration from mcp.json
   */
  async readMcpConfig(): Promise<MCPServerConfig[]> {
    try {
      if (!fs.existsSync(this.mcpConfigPath)) {
        logger.info('📋 No mcp.json found, creating empty config');
        const emptyConfig = { servers: [] };
        fs.writeFileSync(this.mcpConfigPath, JSON.stringify(emptyConfig, null, 2));
        return [];
      }

      const configContent = fs.readFileSync(this.mcpConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      return config.servers || [];
    } catch (error) {
      logger.error('Failed to read MCP config:', error);
      return [];
    }
  }

  /**
   * Initialize MCP servers
   */
  async initialize(): Promise<void> {
    try {
      const configs = await this.readMcpConfig();

      if (configs.length === 0) {
        logger.info('📋 No MCP servers configured in mcp.json');
        logger.info('   Add MCP servers via the web UI or by editing mcp.json');
        return;
      }

      logger.info(`📋 Loading ${configs.length} MCP server(s) from mcp.json...`);

      for (const cfg of configs) {
        try {
          if (cfg.type === 'http') {
            await this.initializeHttpServer(cfg);
          } else if (cfg.type === 'hosted') {
            await this.initializeHostedTool(cfg);
          } else if (cfg.type === 'stdio') {
            logger.warn(`⚠️ STDIO MCP servers not yet implemented: ${cfg.name}`);
          } else {
            logger.warn(`⚠️ Unknown MCP type: ${cfg.type} for ${cfg.name}`);
          }
        } catch (e) {
          logger.error(`❌ Failed to initialize MCP server ${cfg.name}:`, e);
        }
      }

      logger.info(
        `✅ MCP initialization complete: ${this.mcpServers.length} HTTP, ${this.mcpTools.length} hosted`
      );
    } catch (error) {
      logger.error('❌ MCP server initialization failed:', error);
    }
  }

  /**
   * Initialize HTTP MCP server
   */
  private async initializeHttpServer(cfg: MCPServerConfig): Promise<void> {
    if (!cfg.url) {
      logger.error(`Missing URL for HTTP server: ${cfg.name}`);
      return;
    }

    const httpServer = new MCPServerStreamableHttp({
      url: cfg.url,
      name: cfg.name,
    });

    await httpServer.connect();
    this.mcpServers.push(httpServer);
    logger.info(`✅ MCP HTTP Server initialized: ${cfg.name}`);
  }

  /**
   * Initialize hosted MCP tool
   */
  private async initializeHostedTool(cfg: MCPServerConfig): Promise<void> {
    const hosted = hostedMcpTool({
      serverLabel: cfg.serverLabel || cfg.name,
      serverUrl: cfg.serverUrl || cfg.url!,
    });

    this.mcpTools.push(hosted);
    logger.info(`✅ MCP Hosted Tool initialized: ${cfg.name}`);
  }

  /**
   * Discover tools for hosted MCP servers
   */
  async discoverHostedTools(): Promise<void> {
    try {
      logger.info('🔍 Discovering tools for hosted MCP servers...');

      for (const tool of this.mcpTools) {
        try {
          const mcpLabel = tool.mcpServerLabel;
          const tools = await getAllMcpTools(mcpLabel);

          if (tools && tools.length > 0) {
            this.mcpToolRegistry.set(mcpLabel, tools);
            logger.info(`✅ Discovered ${tools.length} tools for ${mcpLabel}`);
          } else {
            logger.warn(`⚠️ No tools discovered for ${mcpLabel}`);
          }
        } catch (e: any) {
          if (e.message?.includes('424')) {
            logger.warn(`⚠️ Error 424 for tool discovery (may be temporary):`, e.message);
          } else {
            logger.error('Tool discovery error:', e);
          }
        }
      }

      logger.info(
        `🎯 Tool discovery complete. Registry has ${this.mcpToolRegistry.size} server(s)`
      );
    } catch (e) {
      logger.warn('⚠️ Hosted MCP tools discovery failed:', e);
    }
  }

  /**
   * Get all MCP servers
   */
  getServers(): any[] {
    return this.mcpServers;
  }

  /**
   * Get all MCP tools
   */
  getTools(): any[] {
    return this.mcpTools;
  }

  /**
   * Get tool registry
   */
  getToolRegistry(): Map<string, any[]> {
    return this.mcpToolRegistry;
  }

  /**
   * Get MCP config path
   */
  getConfigPath(): string {
    return this.mcpConfigPath;
  }

  /**
   * Write MCP configuration
   */
  async writeMcpConfig(servers: MCPServerConfig[]): Promise<void> {
    try {
      const config = { servers };
      fs.writeFileSync(this.mcpConfigPath, JSON.stringify(config, null, 2));
      logger.info('✅ MCP configuration saved');
    } catch (error) {
      logger.error('Failed to write MCP config:', error);
      throw error;
    }
  }

  /**
   * Reload MCP configuration
   */
  async reload(): Promise<void> {
    // Clear existing servers and tools
    this.mcpServers = [];
    this.mcpTools = [];
    this.mcpToolRegistry.clear();

    // Reinitialize
    await this.initialize();
  }
}

// Singleton instance
export const mcpManager = new MCPManager();
