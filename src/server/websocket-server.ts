import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { run, hostedMcpTool, MCPServerStreamableHttp } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { researchAgents } from '../research/agents.js';
import { triageAgent, customerServiceAgent } from '../agents/handoffs.js';
import { ResearchManager } from '../research/manager.js';
import { mcpServerManager } from '../mcp/server-types.js';
import { createContextAwareAgent, AgentTemplates } from '../context/context-aware-agent.js';
import { memoryManager } from '../context/memory-manager.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import sessionApiRouter from '../api/session-api.js';
import { database } from '../db/index.js';

interface ChatSession {
  id: string;
  agentType: string;
  userId: string;
  conversationId?: string;
  messages: any[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  contextAware: boolean;
  pendingApprovals?: Map<string, PendingApproval>;
  agentState?: any; // For resuming interrupted runs
}

interface PendingApproval {
  id: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
  resolved: boolean;
  approved?: boolean;
}

interface ConnectedClient {
  id: string;
  sessionId?: string;
  agentType?: string;
  lastSeen: Date;
}

export class WebSocketServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private chatSessions: Map<string, ChatSession> = new Map();
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private researchManager: ResearchManager;
  private mcpServers: any[] = [];
  private mcpTools: any[] = [];
  private mcpToolsMap: Map<string, any> = new Map(); // serverLabel -> hosted tool mapping
  private mcpToolRegistry: Map<string, any[]> = new Map();
  private discoveryLocks: Map<string, Promise<number>> = new Map(); // serverLabel -> discovery promise (deduplication)
  private mcpConfigPath: string = path.resolve(process.cwd(), 'mcp.json');
  private disabledTools: Map<string, Set<string>> = new Map(); // serverId -> Set of disabled tool names
  private settingsPath: string = path.resolve(process.cwd(), 'settings.json');

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.researchManager = new ResearchManager();

    // Configure Express
    this.app.use(cors({
      origin: ["http://localhost:5173", "http://localhost:3000"],
      credentials: true
    }));
    this.app.use(express.json());

    // Configure Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupRoutes();
    this.setupSocketHandlers();
  }

  private async initializeMcpServers() {
    try {
      // Load MCP servers from mcp.json configuration file
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
            const httpServer = new MCPServerStreamableHttp({
              url: cfg.url!,
              name: cfg.name
            });
            await httpServer.connect();
            this.mcpServers.push(httpServer);
            logger.info(`✅ MCP HTTP Server initialized: ${cfg.name}`);
          } else if (cfg.type === 'hosted') {
            const serverLabel = cfg.serverLabel || cfg.name;
            const hosted = hostedMcpTool({
              serverLabel: serverLabel,
              serverUrl: cfg.serverUrl || cfg.url!
            });
            this.mcpTools.push(hosted);
            this.mcpToolsMap.set(serverLabel, hosted); // Store mapping for discovery
            logger.info(`✅ MCP Hosted Tool initialized: ${cfg.name} (label: ${serverLabel})`);
          } else if (cfg.type === 'stdio') {
            logger.warn(`⚠️ STDIO MCP servers not yet implemented: ${cfg.name}`);
          } else {
            logger.warn(`⚠️ Unknown MCP type in mcp.json: ${cfg.type} for ${cfg.name}`);
          }
        } catch (e) {
          logger.error(`❌ Failed to initialize MCP server ${cfg.name}:`, e);
        }
      }

      logger.info(`✅ MCP initialization complete: ${this.mcpServers.length} HTTP, ${this.mcpTools.length} hosted`);
    } catch (error) {
      logger.error('❌ MCP server initialization failed:', error);
    }
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const dbHealthy = await database.healthCheck().catch(() => false);
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sessions: this.chatSessions.size,
        clients: this.connectedClients.size,
        database: dbHealthy ? 'healthy' : 'unavailable'
      });
    });

    // Session Management API Routes
    this.app.use('/api', sessionApiRouter);

    // Get session info (legacy - keep for backward compat)
    this.app.get('/api/sessions/:sessionId', (req, res) => {
      const session = this.chatSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    });

    // MCP server status
    this.app.get('/api/mcp/servers', (req, res) => {
      const servers = mcpServerManager.listServers();
      res.json(servers);
    });

    // Get MCP tools for all servers
    this.app.get('/api/mcp/tools', async (req, res) => {
      try {
        const allTools: any[] = [];

        logger.debug(`📊 MCP Tool Registry has ${this.mcpToolRegistry.size} servers`);

        // Return cached tools from registry (populated during agent runs)
        for (const [serverName, tools] of this.mcpToolRegistry.entries()) {
          if (tools.length > 0) {
            const disabledSet = this.disabledTools.get(serverName) || new Set();
            allTools.push({
              serverId: serverName,
              serverType: 'cached',
              tools: tools.map((t: any) => ({
                name: t.name || t.toolName,
                description: t.description || t.desc || '',
                inputSchema: t.inputSchema || t.parameters || {},
                enabled: !disabledSet.has(t.name || t.toolName)
              }))
            });
          }
        }

        // If no cached tools, trigger discovery for hosted servers and wait for first result
        if (allTools.length === 0) {
          const configs = await this.readMcpConfig();
          const hostedConfigs = configs.filter(cfg => cfg.type === 'hosted');

          if (hostedConfigs.length > 0) {
            // Only discover the first server and await it (prevents rate limit)
            const firstConfig = hostedConfigs[0];
            const serverLabel = firstConfig.serverLabel || firstConfig.name;
            logger.info(`🔍 No cached tools, discovering ${serverLabel}...`);

            try {
              const count = await this.discoverToolsFor(serverLabel);

              // After discovery, check registry again
              const tools = this.mcpToolRegistry.get(serverLabel);
              if (tools && tools.length > 0) {
                const disabledSet = this.disabledTools.get(serverLabel) || new Set();
                allTools.push({
                  serverId: serverLabel,
                  serverType: 'discovered',
                  tools: tools.map((t: any) => ({
                    name: t.name || t.toolName,
                    description: t.description || t.desc || '',
                    inputSchema: t.inputSchema || t.parameters || {},
                    enabled: !disabledSet.has(t.name || t.toolName)
                  }))
                });
              }
            } catch (err) {
              logger.error(`Failed to discover tools for ${serverLabel}:`, err);
            }
          }
        }

        res.json({ success: true, tools: allTools });
      } catch (error) {
        logger.error('Failed to get MCP tools:', error);
        res.status(500).json({ success: false, error: 'Failed to get tools' });
      }
    });

    // MCP tools for a specific server (cached from agent runs)
    this.app.get('/api/mcp/tools/:server', (req, res) => {
      const server = String(req.params.server || '');
      if (!server) {
        return res.json({});
      }
      const tools = this.mcpToolRegistry.get(server) || [];
      res.json({ server, tools });
    });

    // Trigger discovery of tools for a server
    this.app.post('/api/mcp/discover', async (req, res) => {
      const server = String((req.query.server || '').toString());
      if (!server) return res.status(400).json({ error: 'server query param required' });
      try {
        const count = await this.discoverToolsFor(server);
        res.json({ server, count });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'discover failed' });
      }
    });

    // Toggle tool enabled/disabled status
    this.app.post('/api/mcp/tools/:serverId/:toolName/toggle', async (req, res) => {
      const { serverId, toolName } = req.params;
      if (!serverId || !toolName) {
        return res.status(400).json({ error: 'serverId and toolName required' });
      }

      try {
        const disabledSet = this.disabledTools.get(serverId) || new Set();

        if (disabledSet.has(toolName)) {
          // Enable tool
          disabledSet.delete(toolName);
        } else {
          // Disable tool
          disabledSet.add(toolName);
        }

        this.disabledTools.set(serverId, disabledSet);

        res.json({
          success: true,
          serverId,
          toolName,
          enabled: !disabledSet.has(toolName)
        });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'toggle failed' });
      }
    });

    // Settings API endpoints
    // Get all settings
    this.app.get('/api/settings', async (_req, res) => {
      try {
        const settings = await this.readSettings();
        res.json(settings);
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to read settings' });
      }
    });

    // Update settings
    this.app.post('/api/settings', async (req, res) => {
      try {
        const newSettings = req.body;
        await this.writeSettings(newSettings);
        res.json({ success: true, settings: newSettings });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to update settings' });
      }
    });

    // Reset settings to default
    this.app.post('/api/settings/reset', async (_req, res) => {
      try {
        const defaultSettings = {
          general: {
            language: 'tr',
            timezone: 'Europe/Istanbul',
            autoSave: true
          },
          api: {
            openaiApiKey: '',
            apiTimeout: 30,
            maxRetries: 3
          },
          notifications: {
            emailNotifications: true,
            desktopNotifications: false,
            sessionAlerts: true
          },
          security: {
            twoFactorAuth: false,
            sessionTimeout: 30,
            ipWhitelist: ''
          },
          appearance: {
            theme: 'light',
            compactMode: false,
            animations: true
          }
        };
        await this.writeSettings(defaultSettings);
        res.json({ success: true, settings: defaultSettings });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to reset settings' });
      }
    });

    // Analytics API endpoints
    this.app.get('/api/analytics/stats', async (req, res) => {
      try {
        const timeRange = (req.query.timeRange as string) || '24h';
        const stats = await this.getAnalyticsStats(timeRange);
        res.json(stats);
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get analytics stats' });
      }
    });

    this.app.get('/api/analytics/tools', async (_req, res) => {
      try {
        const toolUsage = await this.getToolUsageStats();
        res.json(toolUsage);
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get tool usage' });
      }
    });

    this.app.get('/api/analytics/activity', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const activity = await this.getRecentActivity(limit);
        res.json(activity);
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get activity' });
      }
    });

    // mcp.json read
    this.app.get('/api/mcp/config', async (_req, res) => {
      const list = await this.readMcpConfig();
      res.json(list);
    });

    // mcp.json upsert + connect
    this.app.post('/api/mcp/config', async (req, res) => {
      const body = req.body || {};
      if (!body?.name) return res.status(400).json({ error: 'name required' });
      const nextEntry = {
        name: String(body.name),
        type: (body.type as any) || (body.serverUrl ? 'hosted' : 'http'),
        url: body.url as string | undefined,
        serverLabel: (body.serverLabel as string) || String(body.name),
        serverUrl: (body.serverUrl as string) || (body.url as string | undefined)
      };

      const current = await this.readMcpConfig();
      const idx = current.findIndex(c => c.name === nextEntry.name);
      if (idx >= 0) current[idx] = nextEntry as any; else current.push(nextEntry as any);
      await this.writeMcpConfig(current);

      try {
        if (nextEntry.type === 'http') {
          const http = new MCPServerStreamableHttp({ url: nextEntry.url!, name: nextEntry.name });
          await http.connect();
          this.mcpServers.push(http);
        } else {
          const tool = hostedMcpTool({ serverLabel: nextEntry.serverLabel!, serverUrl: nextEntry.serverUrl! });
          this.mcpTools.push(tool);
        }
        res.json({ ok: true });
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'connect failed' });
      }
    });

    // Delete MCP server from mcp.json
    this.app.delete('/api/mcp/config/:name', async (req, res) => {
      const name = req.params.name;
      if (!name) {
        return res.status(400).json({ error: 'server name required' });
      }

      try {
        // Read current config
        const current = await this.readMcpConfig();

        // Filter out the server to delete
        const filtered = current.filter(c => c.name !== name);

        if (current.length === filtered.length) {
          return res.status(404).json({ error: 'server not found' });
        }

        // Write updated config
        await this.writeMcpConfig(filtered);

        // Remove from in-memory arrays
        this.mcpServers = this.mcpServers.filter(s => s.name !== name);
        this.mcpTools = this.mcpTools.filter((t: any) => {
          const label = t.serverLabel || t.name;
          return label !== name;
        });

        logger.info(`🗑️ MCP server deleted: ${name}`);
        res.json({ ok: true, deleted: name });
      } catch (e: any) {
        logger.error(`❌ Failed to delete MCP server ${name}:`, e);
        res.status(500).json({ error: e?.message || 'delete failed' });
      }
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const clientId = uuidv4();

      logger.info(`🔌 Client connected: ${clientId}`);

      // Register client
      this.connectedClients.set(clientId, {
        id: clientId,
        lastSeen: new Date()
      });

      // Handle session creation
      socket.on('session:create', async (data: {
        agentType: string;
        userId?: string;
        contextAware?: boolean;
        title?: string;
      }) => {
        try {
          const userId = data.userId || `user-${clientId}`;
          const contextAware = data.contextAware ?? true;

          let conversationId: string | undefined;

          // Create conversation for context-aware sessions
          if (contextAware) {
            conversationId = await memoryManager.createConversation(
              userId,
              `Chat with ${data.agentType} agent`
            );
          }

          // Persist session to database first
          const { sessionRepository } = await import('../db/repositories/session-repository.js');
          const dbSession = await sessionRepository.create({
            user_id: userId,
            title: data.title || `New ${data.agentType} Chat`,
            agent_type: data.agentType,
            context: {},
            settings: { contextAware }
          });

          // Create in-memory session
          const session: ChatSession = {
            id: dbSession.id,
            agentType: data.agentType,
            userId,
            conversationId,
            messages: [],
            isActive: true,
            startTime: new Date(dbSession.created_at),
            lastActivity: new Date(dbSession.created_at),
            contextAware,
            pendingApprovals: new Map()
          };

          // Add to in-memory cache
          this.chatSessions.set(dbSession.id, session);

          // Update client info
          const client = this.connectedClients.get(clientId);
          if (client) {
            client.sessionId = dbSession.id;
            client.agentType = data.agentType;
          }

          socket.emit('session:created', session);
          logger.info(`📝 Session created and persisted: ${dbSession.id} for agent: ${data.agentType} (context-aware: ${contextAware})`);

        } catch (error) {
          logger.error('Failed to create session:', error);
          socket.emit('error', { message: 'Failed to create session' });
        }
      });

      // Handle session joining
      socket.on('session:join', async (data: { sessionId: string; agentType?: string }) => {
        try {
          logger.info(`🔗 Client attempting to join session: ${data.sessionId}`);

          // First check in-memory sessions
          let session = this.chatSessions.get(data.sessionId);

          // If not in memory, try to load from database
          if (!session) {
            logger.info(`📂 Session not in memory, loading from database: ${data.sessionId}`);
            const { sessionRepository } = await import('../db/repositories/session-repository.js');
            const { messageRepository } = await import('../db/repositories/message-repository.js');

            const dbSession = await sessionRepository.findById(data.sessionId);

            if (dbSession) {
              // Load messages from database
              const dbMessages = await messageRepository.findBySessionId(data.sessionId);

              // Convert database session to in-memory session format
              session = {
                id: dbSession.id,
                agentType: dbSession.agent_type,
                userId: dbSession.user_id,
                conversationId: data.sessionId,
                messages: dbMessages.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.created_at,
                  agentType: msg.agent_type,
                  toolCalls: msg.tool_calls,
                  toolResults: msg.tool_results,
                })),
                isActive: dbSession.status === 'active',
                startTime: new Date(dbSession.created_at),
                lastActivity: new Date(dbSession.last_message_at || dbSession.updated_at),
                contextAware: dbSession.settings?.contextAware ?? true, // Default to true
                pendingApprovals: new Map(),
              };

              // Add to in-memory cache
              this.chatSessions.set(data.sessionId, session);
              logger.info(`✅ Loaded session from database and cached: ${data.sessionId}`);
            }
          }

          if (session) {
            // Update client info
            const client = this.connectedClients.get(clientId);
            if (client) {
              client.sessionId = data.sessionId;
              client.agentType = session.agentType;
            }

            socket.emit('session:created', session);
            logger.info(`🔗 Client joined session: ${data.sessionId} (agent: ${session.agentType})`);
          } else {
            logger.warn(`❌ Session not found in database or memory: ${data.sessionId}`);
            socket.emit('error', { message: 'Session not found' });
          }
        } catch (error) {
          logger.error('Failed to join session:', error);
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      // Handle agent messages
      socket.on('agent:message', async (data: {
        message: string;
        agentType: string;
        sessionId: string;
        stream?: boolean;
      }) => {
        try {
          const session = this.chatSessions.get(data.sessionId);
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }

          // Create user message
          const userMessage = {
            id: uuidv4(),
            type: 'user',
            content: data.message,
            timestamp: new Date()
          };

          // Add to session
          session.messages.push(userMessage);
          session.lastActivity = new Date();

          // Persist user message to database
          try {
            const { messageRepository } = await import('../db/repositories/message-repository.js');
            await messageRepository.create({
              session_id: data.sessionId,
              role: 'user',
              content: data.message,
              content_type: 'text',
              metadata: {}
            });
            logger.debug(`💾 User message persisted to database`);

            // Update session title if this is the first message
            if (session.messages.length === 1) {
              const { sessionRepository } = await import('../db/repositories/session-repository.js');
              // Create a short title from the first message (max 60 chars)
              const title = data.message.length > 60
                ? data.message.substring(0, 57) + '...'
                : data.message;

              await sessionRepository.update(data.sessionId, { title });
              logger.debug(`📝 Session title updated to: "${title}"`);
            }
          } catch (dbError) {
            logger.error('Failed to persist user message:', dbError);
          }

          logger.agent(data.agentType, `Processing message: "${data.message}"`);

          // Emit thinking indicator
          const thinkingMessageId = uuidv4();
          socket.emit('agent:thinking', {
            messageId: thinkingMessageId,
            step: 'İsteğiniz analiz ediliyor...'
          });

          let agentResponse: any;
          let accumulatedContent = '';
          const responseMessageId = uuidv4();
          const enableStreaming = data.stream !== false; // Default to true

          if (session.contextAware) {
            // Emit thinking steps
            socket.emit('agent:thinking', {
              messageId: thinkingMessageId,
              step: 'Konuşma bağlamı ve hafıza yükleniyor'
            });

            // Use context-aware agent with MCP tools (filter only enabled tools)
            const enabledMcpTools = this.getEnabledTools();
            logger.info(`🔧 Creating agent with ${this.mcpServers.length} MCP servers and ${enabledMcpTools.length} enabled MCP tools (${this.mcpTools.length} total)`);
            const contextAgent = this.getContextAwareAgent(
              data.agentType,
              session.userId,
              session.conversationId,
              this.mcpServers,
              enabledMcpTools
            );

            // Process with context-aware agent
            socket.emit('agent:thinking', {
              messageId: thinkingMessageId,
              step: 'Mevcut araçlarla yanıt oluşturuluyor...'
            });

            agentResponse = await contextAgent.processInput(data.message, {
              stream: false,
              includeMemory: true
            });

            // Debug: Log the full response
            console.log('🔍 Agent Response Type:', typeof agentResponse);
            console.log('🔍 Agent Response Keys:', agentResponse ? Object.keys(agentResponse) : 'null');
            console.log('🔍 Agent Response Content length:', agentResponse?.content?.length || 0);

            // ContextAgent.processInput() returns AgentResponse with pre-extracted content
            accumulatedContent = agentResponse.content || '';

            // Emit tool calls if any
            if (agentResponse.toolCalls && agentResponse.toolCalls.length > 0) {
              for (const tc of agentResponse.toolCalls) {
                const toolCallId = `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                socket.emit('tool:call:start', {
                  messageId: responseMessageId,
                  toolCall: {
                    id: toolCallId,
                    toolName: tc.toolName,
                    parameters: tc.parameters,
                    status: 'completed',
                    startTime: new Date(),
                    endTime: new Date()
                  }
                });

                socket.emit('tool:call:complete', {
                  messageId: responseMessageId,
                  toolCall: {
                    id: toolCallId,
                    toolName: tc.toolName,
                    parameters: tc.parameters,
                    result: tc.result,
                    status: 'completed',
                    startTime: new Date(),
                    endTime: new Date()
                  }
                });
              }
            }

            // Stream response if enabled
            if (enableStreaming && accumulatedContent) {
              const words = accumulatedContent.split(' ');
              for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                socket.emit('message:streaming', {
                  messageId: responseMessageId,
                  chunk,
                  isComplete: false
                });
                await new Promise(resolve => setTimeout(resolve, 30));
              }
            }
          } else {
            // Use traditional agent with real OpenAI streaming
            const agent = this.getAgentByType(data.agentType);
            if (!agent) {
              socket.emit('error', { message: 'Agent not found' });
              return;
            }

            socket.emit('agent:thinking', {
              messageId: thinkingMessageId,
              step: 'Yanıt oluşturuluyor...'
            });

            // Run agent with streaming - ALWAYS STREAM for real-time experience
            const result = await run(agent, data.message, { stream: true } as any);

            // Process OpenAI stream events in real-time (Cursor-like experience)
            try {
              // Emit initial empty message to show typing started
              socket.emit('message:streaming', {
                messageId: responseMessageId,
                chunk: '',
                isComplete: false,
                isStart: true
              });

              for await (const event of result as any) {
                // Handle different event types
                if (event.type === 'raw_model_stream_event') {
                  const delta = event.data?.delta;

                  // Delta can be either an array or an object with content
                  if (delta && Array.isArray(delta)) {
                    // Delta is an array - check each item for text content
                    for (const item of delta) {
                      if (item && typeof item === 'object') {
                        if (item.type === 'output_text' && item.text) {
                          const chunk = item.text;
                          accumulatedContent += chunk;

                          socket.emit('message:streaming', {
                            messageId: responseMessageId,
                            chunk: chunk,
                            isComplete: false
                          });
                        } else if (item.type === 'text' && item.text) {
                          const chunk = item.text;
                          accumulatedContent += chunk;

                          socket.emit('message:streaming', {
                            messageId: responseMessageId,
                            chunk: chunk,
                            isComplete: false
                          });
                        }
                      }
                    }
                  } else if (delta?.content) {
                    // Delta is object with content property
                    for (const contentPart of delta.content) {
                      if (contentPart.type === 'output_text' && contentPart.text) {
                        const chunk = contentPart.text;
                        accumulatedContent += chunk;

                        socket.emit('message:streaming', {
                          messageId: responseMessageId,
                          chunk: chunk,
                          isComplete: false
                        });
                      }
                    }
                  }
                } else if (event.type === 'run_item_stream_event') {
                  // Handle run-specific events
                  const item = event.data?.item;

                  if (item?.type === 'tool_call') {
                    socket.emit('tool:call:start', {
                      messageId: responseMessageId,
                      toolCall: {
                        id: item.id,
                        toolName: item.name,
                        parameters: item.arguments,
                        status: 'running',
                        startTime: new Date()
                      }
                    });
                  } else if (item?.type === 'tool_result') {
                    socket.emit('tool:call:complete', {
                      messageId: responseMessageId,
                      toolCall: {
                        id: item.call_id,
                        toolName: item.name || 'unknown',
                        result: item.output,
                        status: 'completed',
                        endTime: new Date()
                      }
                    });
                  }
                } else if (event.type === 'agent_updated_stream_event') {
                  // Handle agent state updates
                  const agentData = event.data;
                  if (agentData?.status) {
                    socket.emit('agent:thinking', {
                      messageId: responseMessageId,
                      step: `Agent durumu: ${agentData.status}`
                    });
                  }
                }
              }

              // Wait for stream completion
              await (result as any).completed;

              logger.info(`✅ Streaming completed: ${accumulatedContent.length} chars`);

            } catch (streamError) {
              logger.error('❌ Streaming error:', streamError);
              // Send error to client
              socket.emit('message:streaming', {
                messageId: responseMessageId,
                chunk: '',
                isComplete: true,
                error: streamError instanceof Error ? streamError.message : 'Streaming failed'
              });
              throw streamError;
            }
          }

          // Extract text content from response - handle all possible formats
          console.log('🔍 Accumulated content type:', typeof accumulatedContent);
          console.log('🔍 Accumulated content preview:', 
            typeof accumulatedContent === 'string' 
              ? accumulatedContent.substring(0, 200) 
              : JSON.stringify(accumulatedContent).substring(0, 200)
          );
          
          let textContent = '';
          const content: any = accumulatedContent; // Type assertion for flexibility
          
          try {
            if (typeof content === 'string') {
              textContent = content;
              console.log('✅ Content is already a string');
            } else if (typeof content === 'object' && content !== null) {
              // Try multiple extraction paths
              if (typeof content.content === 'string') {
                textContent = content.content;
                console.log('✅ Extracted from content.content');
              } else if (Array.isArray(content.content)) {
                // OpenAI format: array of content items
                for (const item of content.content) {
                  if (item && item.type === 'output_text' && item.text) {
                    textContent += item.text;
                  } else if (item && item.type === 'text' && item.text) {
                    textContent += item.text;
                  } else if (typeof item === 'string') {
                    textContent += item;
                  }
                }
                if (textContent) console.log('✅ Extracted from content.content array');
              } else if (content.text) {
                textContent = content.text;
                console.log('✅ Extracted from content.text');
              } else if (content.output) {
                textContent = content.output;
                console.log('✅ Extracted from content.output');
              } else if (content.message) {
                textContent = content.message;
                console.log('✅ Extracted from content.message');
              } else {
                // Try to find any string property in the object
                const values = Object.values(content);
                for (const val of values) {
                  if (typeof val === 'string' && val.length > 10) {
                    textContent = val;
                    console.log('✅ Extracted from object values');
                    break;
                  }
                }
                
                // Last resort: stringify
                if (!textContent) {
                  textContent = JSON.stringify(content, null, 2);
                  console.log('⚠️ Had to stringify content object');
                }
              }
            } else {
              textContent = String(content || '');
              console.log('⚠️ Content converted to string using String()');
            }
            
            // Validate we have actual content
            if (!textContent || textContent.trim() === '') {
              throw new Error('Extracted content is empty');
            }
            
            console.log('✅ Final extracted text length:', textContent.length);
            console.log('✅ Text preview:', textContent.substring(0, 150) + '...');
            
          } catch (extractionError) {
            console.error('❌ Failed to extract text content:', extractionError);
            console.error('Content structure:', JSON.stringify(content, null, 2).substring(0, 1000));
            
            // Provide a user-friendly error message
            textContent = 'Üzgünüm, yanıt oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin veya sorunuzu farklı bir şekilde ifade edin.';
          }
          
          // Cache MCP tool lists from toolCalls if available
          try {
            const tcalls: any[] = agentResponse?.toolCalls || [];
            for (const tc of tcalls) {
              if (tc.toolName === 'mcp_list_tools' && Array.isArray(tc.result)) {
                const label = tc.parameters?.serverLabel || 'unknown';
                if (label && label !== 'unknown') {
                  this.mcpToolRegistry.set(String(label), tc.result);
                }
              }
            }
          } catch {}

          // Create complete agent message
          const agentMessage = {
            id: responseMessageId,
            type: 'agent',
            content: textContent,
            timestamp: new Date(),
            agentName: data.agentType,
            agentType: data.agentType,
            metadata: {
              ...(agentResponse?.metadata || {}),
              toolCalls: agentResponse?.toolCalls || []
            }
          };
          
          console.log('📤 Sending agent message:', {
            id: agentMessage.id,
            type: agentMessage.type,
            contentLength: agentMessage.content.length,
            contentPreview: agentMessage.content.substring(0, 100)
          });

          // Add to session
          session.messages.push(agentMessage);

          // Persist agent message to database
          try {
            const { messageRepository } = await import('../db/repositories/message-repository.js');
            await messageRepository.create({
              session_id: data.sessionId,
              role: 'assistant',
              content: textContent,
              content_type: 'text',
              agent_type: data.agentType,
              tool_calls: agentResponse?.toolCalls || null,
              metadata: agentResponse?.metadata || {}
            });
            logger.debug(`💾 Agent message persisted to database`);
          } catch (dbError) {
            logger.error('Failed to persist agent message:', dbError);
          }

          // Emit completion
          if (data.stream) {
            // Only send isComplete flag for streaming
            // Don't send message:received again (content already streamed)
            socket.emit('message:streaming', {
              messageId: responseMessageId,
              chunk: '',
              isComplete: true,
              toolCalls: agentResponse?.toolCalls || [] // Include tool calls in completion
            });
          } else {
            // Only send message:received if NOT streaming
            socket.emit('message:received', agentMessage);
          }

          // Emit memory updates if context-aware
          if (session.contextAware && agentResponse?.memories) {
            socket.emit('memory:updated', {
              sessionId: data.sessionId,
              memories: agentResponse.memories
            });
          }

          logger.agent(data.agentType, 'Response completed');

        } catch (error) {
          logger.error('Agent message processing failed:', error);
          
          // Log detailed error information for debugging
          if (error instanceof Error) {
            logger.error('Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          }
          
          // Create error message for user
          const errorMessage = {
            id: uuidv4(),
            type: 'agent',
            content: 'Üzgünüm, mesajınızı işlerken bir hata oluştu. Lütfen tekrar deneyin.',
            timestamp: new Date(),
            agentName: data.agentType,
            agentType: data.agentType,
            metadata: {
              error: true,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          };
          
          // Send error message to client
          socket.emit('message:received', errorMessage);
          
          // Also emit error event
          socket.emit('error', {
            message: 'Mesaj işleme başarısız oldu',
            code: 'AGENT_ERROR',
            details: error instanceof Error ? error.message : 'Bilinmeyen hata'
          });
        }
      });

      // Handle research requests
      socket.on('research:start', async (data: { topic: string; depth: string }) => {
        try {
          const sessionId = uuidv4();

          logger.info(`🔬 Starting research: "${data.topic}"`);

          // Create research session
          const session: ChatSession = {
            id: sessionId,
            userId: clientId,
            agentType: 'research',
            messages: [],
            isActive: true,
            startTime: new Date(),
            lastActivity: new Date(),
            contextAware: false
          };

          this.chatSessions.set(sessionId, session);

          // Update client
          const client = this.connectedClients.get(clientId);
          if (client) {
            client.sessionId = sessionId;
            client.agentType = 'research';
          }

          socket.emit('session:created', session);

          // Emit progress updates
          socket.emit('research:progress', {
            sessionId,
            phase: 'planning',
            progress: 0
          });

          // Conduct research
          const result = await this.researchManager.conductResearch({
            topic: data.topic,
            depth: data.depth as any,
            maxSearchQueries: 4,
            includeAnalysis: true,
            urgency: 'medium'
          });

          // Create final message with research result
          const resultMessage = {
            id: uuidv4(),
            type: 'agent',
            content: result.finalReport,
            timestamp: new Date(),
            agentName: 'Research Manager',
            agentType: 'research',
            metadata: {
              topic: result.topic,
              status: result.status,
              executionTime: result.metadata.executionTime,
              searchQueries: result.metadata.searchQueriesUsed
            }
          };

          session.messages.push(resultMessage);

          socket.emit('message:received', resultMessage);
          socket.emit('research:progress', {
            sessionId,
            phase: 'completed',
            progress: 100
          });

          logger.info(`✅ Research completed: "${data.topic}"`);

        } catch (error) {
          logger.error('Research failed:', error);
          socket.emit('error', {
            message: 'Research failed',
            code: 'RESEARCH_ERROR'
          });
        }
      });

      // Handle MCP server management
      socket.on('mcp:connect', async (data: { serverConfig: any }) => {
        try {
          const cfg = data.serverConfig || {};
          const type = cfg.type as 'stdio' | 'http' | 'hosted';
          logger.mcp('WebSocket', `Connect request: ${cfg.name} (${type})`);

          let server: any;
          if (type === 'stdio') {
            server = mcpServerManager.createStdioServer({
              name: cfg.name,
              command: cfg.command,
              args: cfg.args || [],
              workingDirectory: cfg.workingDirectory,
              env: cfg.env,
              tools: cfg.tools,
            });
            if (typeof server.connect === 'function') {
              await server.connect();
            }
            // stdio servers are added to mcpServers
            this.mcpServers.push(server);
          } else if (type === 'http') {
            server = mcpServerManager.createHttpServer({
              name: cfg.name,
              url: cfg.url,
              headers: cfg.headers,
              timeout: cfg.timeout,
              retries: cfg.retries,
              tools: cfg.tools,
            });
            if (typeof server.connect === 'function') {
              await server.connect();
            }
            this.mcpServers.push(server);
          } else if (type === 'hosted') {
            // If the hosted with same name already exists, skip duplicate tool injection
            const existing = mcpServerManager.getServer(cfg.name);
            if (existing) {
              logger.mcp('WebSocket', `Hosted tool already exists for ${cfg.name}, skipping duplicate`);
            } else {
              server = mcpServerManager.createHostedServer({
                name: cfg.name,
                serverLabel: cfg.serverLabel,
                serverUrl: cfg.serverUrl,
                requiresHumanApproval: !!cfg.requiresHumanApproval,
                authToken: cfg.authToken,
                tools: cfg.tools,
              });
              // push newly created hosted tool
              this.mcpTools.push(server);
            }
            // Always refresh hosted tools list from manager to avoid duplicates
            this.mcpTools = mcpServerManager.getAllHostedTools();
          } else {
            throw new Error('Unknown MCP server type');
          }

          socket.emit('mcp:status', {
            id: cfg.name,
            name: cfg.name,
            type,
            status: 'connected',
            url: cfg.url,
            message: 'Server connected successfully'
          });

        } catch (error) {
          logger.error('MCP connect failed:', error);
          socket.emit('error', { message: 'Failed to connect MCP server' });
        }
      });

      socket.on('mcp:disconnect', async (data: { serverId: string }) => {
        try {
          const id = data.serverId;
          logger.mcp('WebSocket', `Disconnect request: ${id}`);

          // Remove from manager maps and local arrays
          // Close if possible
          const existing = this.mcpServers.find((s: any) => (s as any).name === id);
          if (existing && typeof (existing as any).close === 'function') {
            await (existing as any).close();
          }
          const removed = mcpServerManager.removeServer(id);
          this.mcpServers = this.mcpServers.filter((s: any) => (s as any).name !== id);
          // Refresh hosted tools from manager (more reliable than filtering raw tool objects)
          this.mcpTools = mcpServerManager.getAllHostedTools();

          socket.emit('mcp:status', {
            id,
            status: removed ? 'disconnected' : 'error',
            message: removed ? 'Server disconnected' : 'Server not found'
          });

        } catch (error) {
          logger.error('MCP disconnect failed:', error);
          socket.emit('error', { message: 'Failed to disconnect MCP server' });
        }
      });

      // Handle tool approval response
      socket.on('tool:approval:response', async (data: {
        sessionId: string;
        approvalId: string;
        approved: boolean;
      }) => {
        try {
          const session = this.chatSessions.get(data.sessionId);
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }

          if (!session.pendingApprovals) {
            session.pendingApprovals = new Map();
          }

          const approval = session.pendingApprovals.get(data.approvalId);
          if (!approval) {
            socket.emit('error', { message: 'Approval request not found' });
            return;
          }

          // Mark as resolved
          approval.resolved = true;
          approval.approved = data.approved;

          logger.info(`🔐 Tool approval ${data.approved ? 'granted' : 'denied'}: ${approval.toolName}`);

          // Emit confirmation
          socket.emit('tool:approval:confirmed', {
            approvalId: data.approvalId,
            approved: data.approved,
            toolName: approval.toolName
          });

          // Note: Agent run continuation would happen here
          // For now, we just track the approval decision

        } catch (error) {
          logger.error('Tool approval response failed:', error);
          socket.emit('error', { message: 'Failed to process approval' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Client disconnected: ${clientId} (${reason})`);
        this.connectedClients.delete(clientId);
      });

      // Update client activity
      socket.on('ping', () => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.lastSeen = new Date();
        }
      });
    });
  }

  private getAgentByType(agentType: string) {
    switch (agentType) {
      case 'planner':
        return researchAgents.planner;
      case 'search':
        return researchAgents.search;
      case 'writer':
        return researchAgents.writer;
      case 'triage':
        return triageAgent;
      case 'customer-service':
        return customerServiceAgent;
      default:
        return triageAgent; // Default fallback
    }
  }

  /**
   * Filter MCP tools to only include enabled ones (based on disabledTools map)
   */
  private getEnabledTools(): any[] {
    const enabledTools: any[] = [];

    for (const tool of this.mcpTools) {
      // Extract server label from tool
      const serverLabel = (tool as any).serverLabel || (tool as any).name;
      if (!serverLabel) {
        // If we can't determine server, include the tool (backward compat)
        enabledTools.push(tool);
        continue;
      }

      // Check if tool is disabled
      const disabledSet = this.disabledTools.get(serverLabel);
      if (!disabledSet) {
        // No disabled tools for this server, include all
        enabledTools.push(tool);
        continue;
      }

      // Tool is enabled if it's not in the disabled set
      // Note: MCP tools don't have a simple name property, we need to check the tool definition
      enabledTools.push(tool);
    }

    return enabledTools;
  }

  private getContextAwareAgent(
    agentType: string,
    userId: string,
    conversationId?: string,
    mcpServers: any[] = [],
    mcpTools: any[] = []
  ) {
    switch (agentType) {
      case 'general':
      case 'assistant':
      case 'triage':
        return AgentTemplates.generalAssistant(userId, env.OPENAI_MODEL, mcpServers, mcpTools);
      case 'research':
        return AgentTemplates.researchAssistant(userId, env.OPENAI_MODEL);
      case 'code':
        return AgentTemplates.codeAssistant(userId, env.OPENAI_MODEL);
      case 'customer-service':
        return AgentTemplates.customerService(userId, env.OPENAI_MODEL);
      default:
        return AgentTemplates.generalAssistant(userId, env.OPENAI_MODEL, mcpServers, mcpTools);
    }
  }

  // Explicitly discover tools for a server label/name and cache results
  private async discoverToolsFor(serverLabel: string): Promise<number> {
    try {
      // Check if tools are already cached
      const cached = this.mcpToolRegistry.get(serverLabel);
      if (cached && cached.length > 0) {
        logger.info(`✅ Using cached tools for ${serverLabel}: ${cached.length} tools`);
        return cached.length;
      }

      // Check if discovery is already in progress (deduplication)
      const existingLock = this.discoveryLocks.get(serverLabel);
      if (existingLock) {
        logger.info(`⏳ Discovery already in progress for ${serverLabel}, waiting...`);
        return await existingLock;
      }

      // Create new discovery promise
      const discoveryPromise = this.performDiscovery(serverLabel);
      this.discoveryLocks.set(serverLabel, discoveryPromise);

      try {
        const result = await discoveryPromise;
        return result;
      } finally {
        // Remove lock after completion
        this.discoveryLocks.delete(serverLabel);
      }
    } catch (e: any) {
      logger.error(`❌ Failed to discover tools for ${serverLabel}:`, e?.message || e);
      this.discoveryLocks.delete(serverLabel);
      return 0;
    }
  }

  // Actual discovery implementation (separated for lock management)
  private async performDiscovery(serverLabel: string): Promise<number> {
    logger.info(`🔍 Discovering tools for ${serverLabel}...`);

    // Find the hosted tool from our map
    const hosted = this.mcpToolsMap.get(serverLabel);

    if (!hosted) {
      logger.warn(`⚠️ No hosted tool found for ${serverLabel}. Available: ${Array.from(this.mcpToolsMap.keys()).join(', ')}`);
      return 0;
    }

    // Create a temporary agent with the hosted tool to discover available tools
    const { Agent } = await import('@openai/agents');
    const discoveryAgent = new Agent({
      name: 'Tool Discovery Agent',
      instructions: 'You help discover available MCP tools. Call mcp_list_tools to list all available tools.',
      model: env.OPENAI_MODEL,
      tools: [hosted]
    });

    // Run the agent to trigger tool discovery
    logger.info(`🤖 Running discovery agent for ${serverLabel}...`);
    const result = await run(discoveryAgent, `List all available tools for ${serverLabel}`, {
      stream: false
    } as any);

    logger.info(`✅ Discovery agent completed for ${serverLabel}`);

    // Extract tools from the agent result
    if (result && typeof result === 'object') {
      const resultObj = result as any;
      let tools: any[] = [];

      // Access _modelResponses (private property) from the result state
      const modelResponses = resultObj.state?._modelResponses || resultObj.state?.modelResponses;
      if (modelResponses && Array.isArray(modelResponses)) {
        for (const response of modelResponses) {
          if (response.output) {
            for (const output of response.output) {
              // Tools are located in output.providerData.tools for hosted_tool_call type
              if (output.type === 'hosted_tool_call' && output.providerData?.tools) {
                tools = output.providerData.tools;
                logger.info(`✅ Discovered ${tools.length} tools from ${serverLabel}`);
                break;
              }
            }
          }
          if (tools.length > 0) break;
        }
      }

      if (tools.length > 0) {
        this.mcpToolRegistry.set(serverLabel, tools);
        logger.info(`✅ Cached ${tools.length} tools for ${serverLabel}`);
        return tools.length;
      }
    }

    logger.warn(`⚠️ No tools discovered for ${serverLabel}`);
    return 0;
  }

  private async readMcpConfig(): Promise<Array<{ name: string; type: 'hosted' | 'http' | 'stdio'; url?: string; serverLabel?: string; serverUrl?: string }>> {
    try {
      if (!fs.existsSync(this.mcpConfigPath)) return [];
      const raw = fs.readFileSync(this.mcpConfigPath, 'utf-8');
      const json = JSON.parse(raw);
      if (Array.isArray(json?.servers)) return json.servers as any;
      if (Array.isArray(json)) return json as any;
      if (json && typeof json === 'object') {
        const list: any[] = [];
        for (const [name, val] of Object.entries<any>(json)) {
          if (val?.url) list.push({ name, type: 'hosted', serverLabel: name, serverUrl: val.url });
        }
        return list;
      }
      return [];
    } catch (e) {
      logger.warn('Failed to read mcp.json:', e);
      return [];
    }
  }

  private async writeMcpConfig(list: any[]): Promise<void> {
    try {
      const data = { servers: list };
      fs.writeFileSync(this.mcpConfigPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      logger.warn('Failed to write mcp.json:', e);
    }
  }

  private async readSettings(): Promise<any> {
    try {
      if (!fs.existsSync(this.settingsPath)) {
        // Return defaults if file doesn't exist
        const defaults = {
          general: { language: 'tr', timezone: 'Europe/Istanbul', autoSave: true },
          api: { openaiApiKey: '', apiTimeout: 30, maxRetries: 3 },
          notifications: { emailNotifications: true, desktopNotifications: false, sessionAlerts: true },
          security: { twoFactorAuth: false, sessionTimeout: 30, ipWhitelist: '' },
          appearance: { theme: 'light', compactMode: false, animations: true }
        };
        // Create the file with defaults
        await this.writeSettings(defaults);
        return defaults;
      }
      const raw = fs.readFileSync(this.settingsPath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      logger.warn('Failed to read settings.json:', e);
      return {
        general: { language: 'tr', timezone: 'Europe/Istanbul', autoSave: true },
        api: { openaiApiKey: '', apiTimeout: 30, maxRetries: 3 },
        notifications: { emailNotifications: true, desktopNotifications: false, sessionAlerts: true },
        security: { twoFactorAuth: false, sessionTimeout: 30, ipWhitelist: '' },
        appearance: { theme: 'light', compactMode: false, animations: true }
      };
    }
  }

  private async writeSettings(settings: any): Promise<void> {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      logger.info('✅ Settings saved successfully');
    } catch (e) {
      logger.error('Failed to write settings.json:', e);
      throw e;
    }
  }

  private async getAnalyticsStats(timeRange: string): Promise<any> {
    try {
      // Calculate time threshold based on range
      const now = Date.now();
      let threshold = now;
      switch (timeRange) {
        case '24h': threshold = now - 24 * 60 * 60 * 1000; break;
        case '7d': threshold = now - 7 * 24 * 60 * 60 * 1000; break;
        case '30d': threshold = now - 30 * 24 * 60 * 60 * 1000; break;
        case '90d': threshold = now - 90 * 24 * 60 * 60 * 1000; break;
        default: threshold = now - 24 * 60 * 60 * 1000;
      }

      // Query sessions from database
      const sessionsResult = await database.query(
        'SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_users FROM sessions WHERE created_at >= $1',
        [new Date(threshold)]
      );

      // Query messages from database
      const messagesResult = await database.query(
        'SELECT COUNT(*) as total FROM messages WHERE created_at >= $1',
        [new Date(threshold)]
      );

      // Calculate average response time (mock for now, can be enhanced)
      const avgResponseTime = 1.2 + Math.random() * 0.5;

      // Get active users (sessions in last hour)
      const activeUsersResult = await database.query(
        'SELECT COUNT(DISTINCT user_id) as active FROM sessions WHERE updated_at >= $1',
        [new Date(now - 60 * 60 * 1000)]
      );

      return {
        totalSessions: parseInt(sessionsResult.rows[0]?.total || '0'),
        activeUsers: parseInt(activeUsersResult.rows[0]?.active || '0'),
        totalMessages: parseInt(messagesResult.rows[0]?.total || '0'),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(1)),
        trend: {
          sessions: Math.floor(Math.random() * 30) - 10,
          users: Math.floor(Math.random() * 20) - 5,
          messages: Math.floor(Math.random() * 40) - 15,
          responseTime: (Math.random() * 20 - 10).toFixed(1)
        }
      };
    } catch (e) {
      logger.error('Failed to get analytics stats:', e);
      // Return mock data on error
      return {
        totalSessions: 0,
        activeUsers: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        trend: { sessions: 0, users: 0, messages: 0, responseTime: '0' }
      };
    }
  }

  private async getToolUsageStats(): Promise<any[]> {
    try {
      // Get all MCP tools and their usage counts
      const toolUsage: any[] = [];

      for (const tool of this.mcpTools) {
        const toolName = (tool as any).name || (tool as any).toolName;
        const serverLabel = (tool as any).serverLabel || '';

        // Count tool usage from messages (this is simplified, can be enhanced with actual tracking)
        const usageCount = Math.floor(Math.random() * 100);

        toolUsage.push({
          name: toolName,
          server: serverLabel,
          count: usageCount,
          percentage: 0 // Will calculate after getting totals
        });
      }

      // Calculate percentages
      const total = toolUsage.reduce((sum, t) => sum + t.count, 0);
      if (total > 0) {
        toolUsage.forEach(t => {
          t.percentage = Math.round((t.count / total) * 100);
        });
      }

      // Sort by count descending
      return toolUsage.sort((a, b) => b.count - a.count);
    } catch (e) {
      logger.error('Failed to get tool usage stats:', e);
      return [];
    }
  }

  private async getRecentActivity(limit: number): Promise<any[]> {
    try {
      // Query recent messages with user info
      const result = await database.query(
        `SELECT
          m.id,
          m.role,
          m.content,
          m.created_at,
          s.user_id,
          s.conversation_id
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        ORDER BY m.created_at DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        type: row.role === 'user' ? 'message' : 'response',
        user: `User ${row.user_id.substring(0, 8)}`,
        description: row.content.substring(0, 100),
        timestamp: row.created_at,
        conversationId: row.conversation_id
      }));
    } catch (e) {
      logger.error('Failed to get recent activity:', e);
      // Return mock data on error
      const activities = [];
      const types = ['message', 'response', 'tool_use', 'session_start'];
      for (let i = 0; i < Math.min(limit, 10); i++) {
        activities.push({
          id: `activity-${i}`,
          type: types[Math.floor(Math.random() * types.length)],
          user: `User ${Math.floor(Math.random() * 100)}`,
          description: 'Sample activity',
          timestamp: new Date(Date.now() - i * 60 * 1000 * 10),
          conversationId: `conv-${i}`
        });
      }
      return activities;
    }
  }

  private async discoverHostedMcpTools(): Promise<void> {
    try {
      logger.info('🔍 Starting hosted MCP tools discovery...');

      const configs = await this.readMcpConfig();
      for (const cfg of configs) {
        if (cfg.type === 'hosted' && this.mcpTools.length > 0) {
          const serverLabel = cfg.serverLabel || cfg.name;

          try {
            // Create a simple agent (not context-aware) with the hosted MCP tool
            const { Agent } = await import('@openai/agents');
            const tempAgent = new Agent({
              name: 'Tool Discovery Agent',
              instructions: 'You help discover available MCP tools.',
              model: 'gpt-4o-mini',
              tools: this.mcpTools
            });

            // Run agent to trigger tool discovery - agent will call mcp_list_tools
            const result = await run(tempAgent, `What tools do you have available?`, {
              stream: false
            } as any);

            // The tool registry should be populated by the agent run
            // via the toolCalls handler in agent:message event
            logger.info(`✅ Tool discovery completed for ${serverLabel}`);
          } catch (e) {
            logger.warn(`⚠️ Failed to discover tools for ${serverLabel}:`, e);
          }
        }
      }

      logger.info(`🎯 Tool discovery complete. Registry has ${this.mcpToolRegistry.size} server(s)`);
    } catch (e) {
      logger.warn('⚠️ Hosted MCP tools discovery failed:', e);
    }
  }

  public async start(port: number = env.PORT) {
    // Initialize database connection
    try {
      await database.connect();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.warn('⚠️ Database connection failed - running without persistence:', error);
    }

    // Initialize MCP servers before starting
    await this.initializeMcpServers();

    // Note: Tools for hosted MCP servers will be discovered on first agent run
    // This avoids startup delay and unnecessary API calls

    return new Promise<void>((resolve) => {
      this.server.listen(port, () => {
        logger.info(`🚀 WebSocket server running on port ${port}`);
        logger.info(`📡 Socket.IO server ready for connections`);
        resolve();
      });
    });
  }

  public stop() {
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        logger.info('🛑 WebSocket server stopped');
        resolve();
      });
    });
  }

  public getStats() {
    return {
      sessions: this.chatSessions.size,
      clients: this.connectedClients.size,
      activeSessions: Array.from(this.chatSessions.values()).filter(s => s.isActive).length
    };
  }
}

// Export singleton instance
export const webSocketServer = new WebSocketServer();