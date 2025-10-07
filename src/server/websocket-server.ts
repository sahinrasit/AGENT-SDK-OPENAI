import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { run, hostedMcpTool, MCPServerStreamableHttp, getAllMcpTools } from '@openai/agents';
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
  private mcpToolRegistry: Map<string, any[]> = new Map();
  private mcpConfigPath: string = path.resolve(process.cwd(), 'mcp.json');

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
      // Load from mcp.json if present
      const configs = await this.readMcpConfig();
      if (configs.length > 0) {
        for (const cfg of configs) {
          try {
            if (cfg.type === 'http') {
              const httpServer = new MCPServerStreamableHttp({ url: cfg.url!, name: cfg.name });
              await httpServer.connect();
              this.mcpServers.push(httpServer);
              logger.info(`✅ MCP(HTTP) initialized: ${cfg.name}`);
            } else if (cfg.type === 'hosted') {
              const hosted = hostedMcpTool({ serverLabel: cfg.serverLabel || cfg.name, serverUrl: cfg.serverUrl || cfg.url! });
              this.mcpTools.push(hosted);
              logger.info(`✅ MCP(Hosted) initialized: ${cfg.name}`);
            } else {
              logger.warn(`⚠️ Unsupported MCP type in mcp.json: ${cfg.type}`);
            }
          } catch (e) {
            logger.warn(`⚠️ MCP init failed for ${cfg.name}:`, e);
          }
        }
        return;
      }

      // Fallback: Odeabank via env
      if (env.ODEABANK_MCP_URL) {
        const odeabankHttp = new MCPServerStreamableHttp({
          url: env.ODEABANK_MCP_URL,
          name: 'odeabank'
        });
        await odeabankHttp.connect();
        this.mcpServers.push(odeabankHttp);
        logger.info(`✅ Odeabank MCP Server initialized (HTTP)`);
        logger.info(`   URL: ${env.ODEABANK_MCP_URL}`);
      }

    } catch (error) {
      logger.warn('⚠️ Odeabank MCP (HTTP) initialization failed:', error);
      logger.info('   Continuing without Odeabank HTTP MCP');
    }

    return Promise.resolve();
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sessions: this.chatSessions.size,
        clients: this.connectedClients.size
      });
    });

    // Get session info
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

    // MCP tools (cached from agent runs)
    this.app.get('/api/mcp/tools', (req, res) => {
      const server = String(req.query.server || '');
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
      }) => {
        try {
          const sessionId = uuidv4();
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

          const session: ChatSession = {
            id: sessionId,
            agentType: data.agentType,
            userId,
            conversationId,
            messages: [],
            isActive: true,
            startTime: new Date(),
            lastActivity: new Date(),
            contextAware
          };

          this.chatSessions.set(sessionId, session);

          // Update client info
          const client = this.connectedClients.get(clientId);
          if (client) {
            client.sessionId = sessionId;
            client.agentType = data.agentType;
          }

          socket.emit('session:created', session);
          logger.info(`📝 Session created: ${sessionId} for agent: ${data.agentType} (context-aware: ${contextAware})`);

        } catch (error) {
          logger.error('Failed to create session:', error);
          socket.emit('error', { message: 'Failed to create session' });
        }
      });

      // Handle session joining
      socket.on('session:join', (data: { sessionId: string }) => {
        const session = this.chatSessions.get(data.sessionId);
        if (session) {
          // Update client info
          const client = this.connectedClients.get(clientId);
          if (client) {
            client.sessionId = data.sessionId;
            client.agentType = session.agentType;
          }

          socket.emit('session:created', session);
          logger.info(`🔗 Client joined session: ${data.sessionId}`);
        } else {
          socket.emit('error', { message: 'Session not found' });
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

          logger.agent(data.agentType, `Processing message: "${data.message}"`);

          let agentResponse: any;
          let accumulatedContent = '';
          const responseMessageId = uuidv4();

          if (session.contextAware) {
            // Use context-aware agent with MCP tools
            const contextAgent = this.getContextAwareAgent(
              data.agentType, 
              session.userId, 
              session.conversationId,
              this.mcpServers,
              this.mcpTools
            );

            if (data.stream) {
              // Stream context-aware response
              socket.emit('message:streaming', {
                messageId: responseMessageId,
                chunk: '',
                isComplete: false
              });

              // Note: Context-aware agent streaming would be implemented here
              // For now, process without streaming
              agentResponse = await contextAgent.processInput(data.message, {
                stream: false,
                includeMemory: true
              });

              // Extract text content from agent response
              if (typeof agentResponse.content === 'string') {
                accumulatedContent = agentResponse.content;
              } else if (typeof agentResponse.content === 'object' && agentResponse.content !== null) {
                // Try to extract text from nested object
                accumulatedContent = agentResponse.content.text || 
                                   agentResponse.content.content || 
                                   agentResponse.content.output ||
                                   JSON.stringify(agentResponse.content);
              } else {
                accumulatedContent = String(agentResponse.content || agentResponse);
              }

              // Simulate streaming for now
              const words = accumulatedContent.split(' ');
              for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                socket.emit('message:streaming', {
                  messageId: responseMessageId,
                  chunk,
                  isComplete: false
                });
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } else {
              agentResponse = await contextAgent.processInput(data.message, {
                stream: false,
                includeMemory: true
              });
              
              // agentResponse.content should already be a string from context-aware-agent
              // But double-check and extract if needed
              accumulatedContent = typeof agentResponse === 'string' 
                ? agentResponse 
                : (typeof agentResponse.content === 'string' 
                    ? agentResponse.content 
                    : String(agentResponse.content || agentResponse));
            }
          } else {
            // Use traditional agent
            const agent = this.getAgentByType(data.agentType);
            if (!agent) {
              socket.emit('error', { message: 'Agent not found' });
              return;
            }

            // Run agent with streaming if requested
            const result = await run(agent, data.message, { stream: data.stream || false } as any);

            if (data.stream) {
              const textStream = (result as any).toTextStream();

              for await (const chunk of textStream) {
                accumulatedContent += chunk;

                socket.emit('message:streaming', {
                  messageId: responseMessageId,
                  chunk,
                  isComplete: false
                });

                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } else {
              accumulatedContent = (result as any).content || result;
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
                const label = tc.parameters?.serverLabel || 'odeabank';
                this.mcpToolRegistry.set(String(label), tc.result);
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

          // Emit completion
          if (data.stream) {
            socket.emit('message:streaming', {
              messageId: responseMessageId,
              chunk: '',
              isComplete: true
            });
          }

          socket.emit('message:received', agentMessage);

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
      // Try to build a minimal agent with hosted tool if present
      const hosted = this.mcpTools.find((t: any) => (t as any).serverLabel === serverLabel || (t as any).name === serverLabel);
      const servers = this.mcpServers;
      const tools: any[] = [];
      if (hosted) tools.push(hosted);

      // Use getAllMcpTools helper if available (will call list_tools under the hood)
      const result = await getAllMcpTools({ servers, tools } as any);
      const items = Array.isArray(result) ? result : (Array.isArray((result as any)?.tools) ? (result as any).tools : []);
      this.mcpToolRegistry.set(serverLabel, items);
      return items.length;
    } catch (e) {
      // Fallback: no-op
      return 0;
    }
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

  public async start(port: number = env.PORT) {
    // Initialize MCP servers before starting
    await this.initializeMcpServers();
    
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