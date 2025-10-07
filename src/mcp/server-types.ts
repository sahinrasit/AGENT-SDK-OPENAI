import { MCPServerStdio, MCPServerStreamableHttp, hostedMcpTool } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import path from 'path';

// Configuration schemas for different MCP server types
const stdioServerConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  workingDirectory: z.string().optional(),
  env: z.record(z.string()).optional(),
  tools: z.array(z.string()).optional(), // Tool filtering
});

const httpServerConfigSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().positive().default(30000),
  retries: z.number().min(0).default(3),
  tools: z.array(z.string()).optional(), // Tool filtering
});

const hostedServerConfigSchema = z.object({
  name: z.string(),
  serverLabel: z.string(),
  serverUrl: z.string().url(),
  requiresHumanApproval: z.boolean().default(false),
  authToken: z.string().optional(),
  tools: z.array(z.string()).optional(), // Tool filtering
});

// Type definitions
export type StdioServerConfig = z.infer<typeof stdioServerConfigSchema>;
export type HttpServerConfig = z.infer<typeof httpServerConfigSchema>;
export type HostedServerConfig = z.infer<typeof hostedServerConfigSchema>;

// MCP Server Manager Class
export class MCPServerManager {
  private stdioServers: Map<string, MCPServerStdio> = new Map();
  private httpServers: Map<string, MCPServerStreamableHttp> = new Map();
  private hostedServers: Map<string, any> = new Map();
  private serverConfigs: Map<string, any> = new Map();

  constructor() {
    logger.mcp('Manager', 'MCP Server Manager initialized');
  }

  /**
   * Create and register a Stdio MCP Server
   */
  createStdioServer(config: StdioServerConfig): MCPServerStdio {
    const validatedConfig = stdioServerConfigSchema.parse(config);
    logger.mcp('Stdio', `Creating server: ${validatedConfig.name}`);

    try {
      const serverConfig: any = {
        name: validatedConfig.name,
        fullCommand: validatedConfig.command,
      };

      // Add optional configurations
      if (validatedConfig.args.length > 0) {
        serverConfig.args = validatedConfig.args;
      }

      if (validatedConfig.workingDirectory) {
        serverConfig.cwd = validatedConfig.workingDirectory;
      }

      if (validatedConfig.env) {
        serverConfig.env = validatedConfig.env;
      }

      if (validatedConfig.tools) {
        serverConfig.tools = validatedConfig.tools;
      }

      const server = new MCPServerStdio(serverConfig);

      this.stdioServers.set(validatedConfig.name, server);
      this.serverConfigs.set(validatedConfig.name, validatedConfig);

      logger.mcp('Stdio', `Server created successfully: ${validatedConfig.name}`);
      return server;

    } catch (error) {
      logger.error(`Failed to create Stdio MCP server: ${validatedConfig.name}`, error);
      throw error;
    }
  }

  /**
   * Create and register an HTTP MCP Server
   */
  createHttpServer(config: HttpServerConfig): MCPServerStreamableHttp {
    const validatedConfig = httpServerConfigSchema.parse(config);
    logger.mcp('HTTP', `Creating server: ${validatedConfig.name}`);

    try {
      const serverConfig: any = {
        name: validatedConfig.name,
        url: validatedConfig.url,
      };

      // Add optional configurations
      if (validatedConfig.headers) {
        serverConfig.headers = validatedConfig.headers;
      }

      if (validatedConfig.timeout !== 30000) {
        serverConfig.timeout = validatedConfig.timeout;
      }

      if (validatedConfig.tools) {
        serverConfig.tools = validatedConfig.tools;
      }

      const server = new MCPServerStreamableHttp(serverConfig);

      this.httpServers.set(validatedConfig.name, server);
      this.serverConfigs.set(validatedConfig.name, validatedConfig);

      logger.mcp('HTTP', `Server created successfully: ${validatedConfig.name}`);
      return server;

    } catch (error) {
      logger.error(`Failed to create HTTP MCP server: ${validatedConfig.name}`, error);
      throw error;
    }
  }

  /**
   * Create and register a Hosted MCP Tool
   */
  createHostedServer(config: HostedServerConfig): any {
    const validatedConfig = hostedServerConfigSchema.parse(config);
    logger.mcp('Hosted', `Creating server: ${validatedConfig.name}`);

    try {
      const toolConfig: any = {
        serverLabel: validatedConfig.serverLabel,
        serverUrl: validatedConfig.serverUrl,
      };

      // Add optional configurations
      if (validatedConfig.requiresHumanApproval) {
        toolConfig.humanApproval = true;
      }

      if (validatedConfig.authToken) {
        toolConfig.authToken = validatedConfig.authToken;
      }

      if (validatedConfig.tools) {
        toolConfig.tools = validatedConfig.tools;
      }

      const server = hostedMcpTool(toolConfig);

      this.hostedServers.set(validatedConfig.name, server);
      this.serverConfigs.set(validatedConfig.name, validatedConfig);

      logger.mcp('Hosted', `Server created successfully: ${validatedConfig.name}`);
      return server;

    } catch (error) {
      logger.error(`Failed to create Hosted MCP server: ${validatedConfig.name}`, error);
      throw error;
    }
  }

  /**
   * Get all servers for use in Agent configuration
   */
  getAllServers(): any[] {
    const allServers: any[] = [];

    // Add Stdio servers
    this.stdioServers.forEach(server => allServers.push(server));

    // Add HTTP servers
    this.httpServers.forEach(server => allServers.push(server));

    // Note: Hosted servers are typically added as tools, not mcpServers
    return allServers;
  }

  /**
   * Get all hosted tools for use in Agent tools configuration
   */
  getAllHostedTools(): any[] {
    return Array.from(this.hostedServers.values());
  }

  /**
   * Get server by name
   */
  getServer(name: string): any {
    return this.stdioServers.get(name) ||
           this.httpServers.get(name) ||
           this.hostedServers.get(name);
  }

  /**
   * Get server configuration
   */
  getServerConfig(name: string): any {
    return this.serverConfigs.get(name);
  }

  /**
   * List all registered servers
   */
  listServers(): Array<{name: string, type: string, status: string, url?: string, serverLabel?: string}> {
    const servers: Array<{name: string, type: string, status: string, url?: string, serverLabel?: string}> = [];

    this.stdioServers.forEach((_, name) => {
      const cfg = this.serverConfigs.get(name);
      servers.push({ name, type: 'stdio', status: 'active' });
    });

    this.httpServers.forEach((_, name) => {
      const cfg = this.serverConfigs.get(name);
      servers.push({ name, type: 'http', status: 'active', url: cfg?.url });
    });

    this.hostedServers.forEach((_, name) => {
      const cfg = this.serverConfigs.get(name);
      servers.push({ name, type: 'hosted', status: 'active', url: cfg?.serverUrl, serverLabel: cfg?.serverLabel });
    });

    return servers;
  }

  /**
   * Remove a server
   */
  removeServer(name: string): boolean {
    logger.mcp('Manager', `Removing server: ${name}`);

    const removed = this.stdioServers.delete(name) ||
                   this.httpServers.delete(name) ||
                   this.hostedServers.delete(name);

    if (removed) {
      this.serverConfigs.delete(name);
      logger.mcp('Manager', `Server removed: ${name}`);
    } else {
      logger.warn(`Server not found: ${name}`);
    }

    return removed;
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    // For now, we'll just mark all servers as healthy
    // In a real implementation, you would ping each server
    this.serverConfigs.forEach((_, name) => {
      health[name] = true;
    });

    logger.mcp('Manager', `Health check completed: ${Object.keys(health).length} servers checked`);
    return health;
  }
}

// Pre-configured server factory functions
export class MCPServerFactory {
  static createFilesystemServer(basePath: string = './sample_files'): StdioServerConfig {
    return {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', path.resolve(basePath)],
    };
  }

  static createGitServer(repoPath: string = '.'): StdioServerConfig {
    return {
      name: 'git',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git', path.resolve(repoPath)],
    };
  }

  static createWebSearchServer(apiKey?: string): HostedServerConfig {
    return {
      name: 'web-search',
      serverLabel: 'web-search',
      serverUrl: 'https://api.example.com/search',
      authToken: apiKey,
      requiresHumanApproval: false,
    };
  }

  static createDatabaseServer(connectionUrl: string): HttpServerConfig {
    return {
      name: 'database',
      url: connectionUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
      retries: 2,
    };
  }

  static createSlackServer(botToken: string): HostedServerConfig {
    return {
      name: 'slack',
      serverLabel: 'slack-integration',
      serverUrl: 'https://slack.com/api',
      authToken: botToken,
      requiresHumanApproval: true,
    };
  }
}

// Export singleton instance
export const mcpServerManager = new MCPServerManager();