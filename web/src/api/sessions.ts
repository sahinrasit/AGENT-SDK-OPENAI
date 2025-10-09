/**
 * Sessions API
 * API calls for session management
 */

import { apiClient } from './client';

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
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  metadata: Record<string, any>;
}

export interface CreateSessionInput {
  title?: string;
  description?: string;
  agent_type?: string;
  context?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface SessionFilters {
  status?: 'active' | 'archived' | 'deleted';
  agent_type?: string;
  is_pinned?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export const sessionsApi = {
  /**
   * List all sessions
   */
  list: async (filters?: SessionFilters) => {
    const response = await apiClient.get<{ success: boolean; data: ChatSession[]; count: number }>(
      '/api/sessions',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get session summaries (with last message)
   */
  getSummaries: async (limit = 20) => {
    const response = await apiClient.get('/api/sessions/summaries', { params: { limit } });
    return response.data;
  },

  /**
   * Create new session
   */
  create: async (data: CreateSessionInput) => {
    const response = await apiClient.post<{ success: boolean; data: ChatSession }>(
      '/api/sessions',
      data
    );
    return response.data;
  },

  /**
   * Get session by ID
   */
  get: async (id: string) => {
    const response = await apiClient.get<{ success: boolean; data: ChatSession }>(
      `/api/sessions/${id}`
    );
    return response.data;
  },

  /**
   * Update session
   */
  update: async (id: string, data: Partial<ChatSession>) => {
    const response = await apiClient.put<{ success: boolean; data: ChatSession }>(
      `/api/sessions/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete session
   */
  delete: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/sessions/${id}`
    );
    return response.data;
  },

  /**
   * Archive session
   */
  archive: async (id: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/sessions/${id}/archive`
    );
    return response.data;
  },

  /**
   * Unarchive session
   */
  unarchive: async (id: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/sessions/${id}/unarchive`
    );
    return response.data;
  },

  /**
   * Pin/unpin session
   */
  pin: async (id: string, pinned: boolean) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/sessions/${id}/pin`,
      { pinned }
    );
    return response.data;
  },

  /**
   * Search sessions
   */
  search: async (query: string, limit = 20) => {
    const response = await apiClient.get<{ success: boolean; data: ChatSession[]; count: number }>(
      '/api/sessions/search',
      { params: { q: query, limit } }
    );
    return response.data;
  },

  /**
   * Get session messages
   */
  getMessages: async (id: string, limit = 100) => {
    const response = await apiClient.get(`/api/sessions/${id}/messages`, { params: { limit } });
    return response.data;
  },

  /**
   * Get conversation history (OpenAI format)
   */
  getHistory: async (id: string, limit = 50) => {
    const response = await apiClient.get(`/api/sessions/${id}/history`, { params: { limit } });
    return response.data;
  },
};
