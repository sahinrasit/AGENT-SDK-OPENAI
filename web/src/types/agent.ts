// Types for the agent interface

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
  agentType?: AgentType;
  metadata?: Record<string, any>;
  isStreaming?: boolean;
}

export interface StreamingMessage extends Message {
  isComplete: boolean;
  chunks: string[];
}

export type AgentType =
  | 'planner'
  | 'search'
  | 'writer'
  | 'triage'
  | 'customer-service'
  | 'billing'
  | 'technical-support'
  | 'research-specialist'
  | 'analysis-specialist'
  | 'writing-specialist';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'working' | 'offline';
  description: string;
  capabilities: string[];
  isActive: boolean;
}

export interface AgentExecution {
  id: string;
  agentName: string;
  agentType: AgentType;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  input: string;
  output?: string;
  metadata?: Record<string, any>;
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: 'planning' | 'searching' | 'writing' | 'completed' | 'failed';
  agents: AgentExecution[];
  messages: Message[];
  startTime: Date;
  endTime?: Date;
  result?: string;
}

export interface HandoffEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  context: Record<string, any>;
  timestamp: Date;
  reason: string;
}

export interface MCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'http' | 'hosted';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  url?: string;
  tools: MCPTool[];
  lastHealthCheck: Date;
  metadata?: Record<string, any>;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  enabled: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  agentType: AgentType;
  messages: Message[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

// Socket.io event types
export interface SocketEvents {
  // Client to server
  'agent:message': (data: { message: string; agentType: AgentType; sessionId: string }) => void;
  'research:start': (data: { topic: string; depth: string }) => void;
  'handoff:request': (data: { fromAgent: string; toAgent: string; context: any }) => void;
  'mcp:connect': (data: { serverConfig: any }) => void;
  'mcp:disconnect': (data: { serverId: string }) => void;
  'session:create': (data: { agentType: AgentType }) => void;
  'session:join': (data: { sessionId: string }) => void;

  // Server to client
  'message:received': (message: Message) => void;
  'message:streaming': (data: { messageId: string; chunk: string; isComplete: boolean }) => void;
  'agent:status': (data: { agentId: string; status: string }) => void;
  'research:progress': (data: { sessionId: string; phase: string; progress: number }) => void;
  'handoff:completed': (handoff: HandoffEvent) => void;
  'mcp:status': (server: MCPServer) => void;
  'session:created': (session: ChatSession) => void;
  'error': (error: { message: string; code?: string }) => void;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentResponse {
  messageId: string;
  content: string;
  agentName: string;
  agentType: AgentType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ResearchResult {
  sessionId: string;
  topic: string;
  status: string;
  plan: string;
  searchResults: any[];
  finalReport: string;
  executionLog: AgentExecution[];
  metadata: Record<string, any>;
}