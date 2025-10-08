/**
 * Database Models and Types
 * TypeScript interfaces matching database schema
 */

// ============================================================================
// USER MODELS
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'developer';
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password_hash: string;
  full_name?: string;
  role?: 'user' | 'admin' | 'developer';
}

export interface UpdateUserInput {
  full_name?: string;
  avatar_url?: string;
  role?: 'user' | 'admin' | 'developer';
  is_active?: boolean;
  email_verified?: boolean;
  last_login_at?: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// CHAT SESSION MODELS
// ============================================================================

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  agent_type?: string;
  context: Record<string, any>;
  settings: Record<string, any>;
  is_pinned: boolean;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: Date;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
  metadata: Record<string, any>;
}

export interface CreateSessionInput {
  user_id: string;
  title?: string;
  description?: string;
  agent_type?: string;
  context?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  status?: 'active' | 'archived' | 'deleted';
  agent_type?: string;
  context?: Record<string, any>;
  settings?: Record<string, any>;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface SessionWithUser extends ChatSession {
  user: Pick<User, 'id' | 'username' | 'email'>;
}

// ============================================================================
// MESSAGE MODELS
// ============================================================================

export interface Message {
  id: string;
  session_id: string;
  parent_message_id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  content_type: 'text' | 'json' | 'markdown' | 'code';
  agent_type?: string;
  tool_calls?: any;
  tool_results?: any;
  tokens_used: number;
  latency_ms?: number;
  model?: string;
  is_error: boolean;
  error_details?: any;
  created_at: Date;
  metadata: Record<string, any>;
}

export interface CreateMessageInput {
  session_id: string;
  parent_message_id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  content_type?: 'text' | 'json' | 'markdown' | 'code';
  agent_type?: string;
  tool_calls?: any;
  tool_results?: any;
  tokens_used?: number;
  latency_ms?: number;
  model?: string;
  is_error?: boolean;
  error_details?: any;
  metadata?: Record<string, any>;
}

export interface UpdateMessageInput {
  content?: string;
  tool_results?: any;
  tokens_used?: number;
  latency_ms?: number;
  is_error?: boolean;
  error_details?: any;
  metadata?: Record<string, any>;
}

// ============================================================================
// TOOL EXECUTION MODELS
// ============================================================================

export interface ToolExecution {
  id: string;
  session_id: string;
  message_id?: string;
  tool_name: string;
  tool_type?: string;
  input_parameters: Record<string, any>;
  output_result?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  success?: boolean;
  error_message?: string;
  error_stack?: string;
  execution_time_ms?: number;
  tokens_used: number;
  started_at: Date;
  completed_at?: Date;
  metadata: Record<string, any>;
}

export interface CreateToolExecutionInput {
  session_id: string;
  message_id?: string;
  tool_name: string;
  tool_type?: string;
  input_parameters: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateToolExecutionInput {
  output_result?: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  success?: boolean;
  error_message?: string;
  error_stack?: string;
  execution_time_ms?: number;
  tokens_used?: number;
  completed_at?: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// AGENT LOG MODELS
// ============================================================================

export interface AgentLog {
  id: string;
  session_id?: string;
  message_id?: string;
  request_id?: string;
  log_level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  log_type: 'agent_request' | 'agent_response' | 'tool_execution' | 'error' | 'metric' | 'trace';
  agent_type?: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface CreateAgentLogInput {
  session_id?: string;
  message_id?: string;
  request_id?: string;
  log_level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  log_type: 'agent_request' | 'agent_response' | 'tool_execution' | 'error' | 'metric' | 'trace';
  agent_type?: string;
  message: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================================
// PERFORMANCE METRIC MODELS
// ============================================================================

export interface PerformanceMetric {
  id: string;
  metric_name: string;
  metric_type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  unit?: string;
  tags: Record<string, any>;
  session_id?: string;
  timestamp: Date;
}

export interface CreateMetricInput {
  metric_name: string;
  metric_type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  unit?: string;
  tags?: Record<string, any>;
  session_id?: string;
}

// ============================================================================
// USER SESSION MODELS (Authentication)
// ============================================================================

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
}

export interface CreateUserSessionInput {
  user_id: string;
  session_token: string;
  refresh_token?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
}

// ============================================================================
// ATTACHMENT MODELS
// ============================================================================

export interface Attachment {
  id: string;
  session_id: string;
  message_id?: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  file_hash?: string;
  is_processed: boolean;
  processed_at?: Date;
  created_at: Date;
  metadata: Record<string, any>;
}

export interface CreateAttachmentInput {
  session_id: string;
  message_id?: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  file_hash?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// QUERY FILTERS AND OPTIONS
// ============================================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export interface SortOptions {
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface SessionFilters extends PaginationOptions, SortOptions {
  user_id?: string;
  status?: 'active' | 'archived' | 'deleted';
  agent_type?: string;
  is_pinned?: boolean;
  search?: string;
}

export interface MessageFilters extends PaginationOptions, SortOptions {
  session_id?: string;
  role?: 'user' | 'assistant' | 'system' | 'tool';
  agent_type?: string;
  is_error?: boolean;
  search?: string;
}

export interface ToolExecutionFilters extends PaginationOptions, SortOptions {
  session_id?: string;
  message_id?: string;
  tool_name?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  success?: boolean;
}

// ============================================================================
// VIEW MODELS
// ============================================================================

export interface ActiveSessionSummary {
  id: string;
  user_id: string;
  title: string;
  agent_type?: string;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: Date;
  created_at: Date;
  is_pinned: boolean;
  username: string;
  email: string;
  last_message_content?: string;
  last_message_role?: string;
}

export interface ToolExecutionStats {
  tool_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time_ms: number;
  p95_execution_time_ms: number;
  total_tokens_used: number;
}

export interface UserActivitySummary {
  id: string;
  username: string;
  email: string;
  total_sessions: number;
  active_sessions: number;
  total_messages: number;
  total_tokens_used: number;
  last_activity_at?: Date;
}
