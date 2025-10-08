/**
 * Express Routes Setup
 * REST API endpoints for the WebSocket server
 */

import { Express } from 'express';
import { database } from '../db/index.js';
import sessionApiRouter from '../api/session-api.js';
import { SessionManager } from './session-manager.js';
import { MCPManager } from './mcp-manager.js';
import { logger } from '../utils/logger.js';

export function setupRoutes(
  app: Express,
  sessionManager: SessionManager,
  mcpManager: MCPManager
): void {
  /**
   * Health check endpoint
   */
  app.get('/health', async (req, res) => {
    const dbHealthy = await database.healthCheck().catch(() => false);
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessions: sessionManager.getSessionCount(),
      activeSessions: sessionManager.getActiveSessionCount(),
      database: dbHealthy ? 'healthy' : 'unavailable',
    });
  });

  /**
   * Session Management API Routes
   */
  app.use('/api', sessionApiRouter);

  /**
   * Get in-memory session info (legacy)
   */
  app.get('/api/sessions/:sessionId/memory', (req, res) => {
    const session = sessionManager.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  });

  /**
   * MCP server status
   */
  app.get('/api/mcp/servers', (req, res) => {
    const servers = mcpManager.getServers();
    const tools = mcpManager.getTools();

    res.json({
      http_servers: servers.length,
      hosted_tools: tools.length,
      servers: servers.map((s: any) => ({
        name: s.name || 'Unknown',
        type: 'http',
        connected: true,
      })),
      tools: tools.map((t: any) => ({
        label: t.mcpServerLabel || 'Unknown',
        type: 'hosted',
      })),
    });
  });

  /**
   * MCP configuration endpoints
   */
  app.get('/api/mcp/config', async (req, res) => {
    try {
      const config = await mcpManager.readMcpConfig();
      res.json({ servers: config });
    } catch (error) {
      logger.error('Failed to read MCP config:', error);
      res.status(500).json({ error: 'Failed to read configuration' });
    }
  });

  app.post('/api/mcp/config', async (req, res) => {
    try {
      const { servers } = req.body;
      await mcpManager.writeMcpConfig(servers);
      await mcpManager.reload();
      res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
      logger.error('Failed to update MCP config:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  /**
   * MCP tool registry
   */
  app.get('/api/mcp/tools', (req, res) => {
    const registry = mcpManager.getToolRegistry();
    const tools: any[] = [];

    for (const [serverLabel, serverTools] of registry.entries()) {
      for (const tool of serverTools) {
        tools.push({
          server: serverLabel,
          name: tool.name || tool.function?.name,
          description: tool.description || tool.function?.description,
        });
      }
    }

    res.json({
      count: tools.length,
      tools,
    });
  });

  /**
   * Connected clients info
   */
  app.get('/api/clients', (req, res) => {
    const sessions = sessionManager.getAllSessions();
    const clients = Array.from(sessions.values()).map((session) => ({
      sessionId: session.id,
      agentType: session.agentType,
      userId: session.userId,
      isActive: session.isActive,
      messageCount: session.messages.length,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
    }));

    res.json({
      count: clients.length,
      clients,
    });
  });

  /**
   * Server statistics
   */
  app.get('/api/stats', (req, res) => {
    const dbStats = database.getStats();
    const sessions = sessionManager.getAllSessions();

    const totalMessages = Array.from(sessions.values()).reduce(
      (sum, s) => sum + s.messages.length,
      0
    );

    res.json({
      sessions: {
        total: sessionManager.getSessionCount(),
        active: sessionManager.getActiveSessionCount(),
      },
      messages: {
        total: totalMessages,
      },
      database: dbStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });
}
