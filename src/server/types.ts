/**
 * WebSocket Server Type Definitions
 */

export interface ChatSession {
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

export interface PendingApproval {
  id: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
  resolved: boolean;
  approved?: boolean;
}

export interface ConnectedClient {
  id: string;
  sessionId?: string;
  agentType?: string;
  lastSeen: Date;
}

export interface MCPServerConfig {
  name: string;
  type: 'http' | 'hosted' | 'stdio';
  url?: string;
  serverLabel?: string;
  serverUrl?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MessageEvent {
  sessionId: string;
  message: string;
  agentType?: string;
  userId?: string;
  contextAware?: boolean;
  conversationId?: string;
}

export interface ToolApprovalEvent {
  sessionId: string;
  approvalId: string;
  approved: boolean;
}

export interface AgentStreamEvent {
  type: 'message' | 'tool' | 'error' | 'complete';
  data: any;
  sessionId: string;
}
