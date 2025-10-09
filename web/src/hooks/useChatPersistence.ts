import { useEffect, useCallback } from 'react';
import { ChatSession, Message } from '../types/agent';

const STORAGE_KEY = 'ibtech-agent-chat-sessions';
const MAX_SESSIONS = 50; // Limit stored sessions

interface StoredSession {
  id: string;
  title: string;
  agentType: string;
  messages: any[]; // Serialized messages
  lastActivity: string;
  metadata?: any;
}

export const useChatPersistence = () => {
  /**
   * Load all sessions from localStorage
   */
  const loadSessions = useCallback((): ChatSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const sessions: StoredSession[] = JSON.parse(stored);

      // Convert stored sessions back to ChatSession format
      return sessions.map(session => ({
        ...session,
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        startTime: new Date(session.lastActivity), // Approximate
        lastActivity: new Date(session.lastActivity),
        isActive: false
      }));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }, []);

  /**
   * Save a session to localStorage
   */
  const saveSession = useCallback((session: ChatSession) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let sessions: StoredSession[] = stored ? JSON.parse(stored) : [];

      // Convert to storable format
      const storableSession: StoredSession = {
        id: session.id,
        title: session.title,
        agentType: session.agentType,
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        lastActivity: session.lastActivity instanceof Date ? session.lastActivity.toISOString() : session.lastActivity,
        metadata: session.metadata
      };

      // Update or add session
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = storableSession;
      } else {
        sessions.push(storableSession);
      }

      // Keep only recent sessions
      sessions = sessions
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        .slice(0, MAX_SESSIONS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }, []);

  /**
   * Load a specific session
   */
  const loadSession = useCallback((sessionId: string): ChatSession | null => {
    const sessions = loadSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }, [loadSessions]);

  /**
   * Delete a session
   */
  const deleteSession = useCallback((sessionId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      let sessions: StoredSession[] = JSON.parse(stored);
      sessions = sessions.filter(s => s.id !== sessionId);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, []);

  /**
   * Clear all sessions
   */
  const clearAllSessions = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }
  }, []);

  /**
   * Get session count
   */
  const getSessionCount = useCallback((): number => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return 0;
      const sessions: StoredSession[] = JSON.parse(stored);
      return sessions.length;
    } catch (error) {
      return 0;
    }
  }, []);

  /**
   * Export sessions as JSON
   */
  const exportSessions = useCallback((): string => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || '[]';
  }, []);

  /**
   * Import sessions from JSON
   */
  const importSessions = useCallback((jsonData: string) => {
    try {
      const sessions: StoredSession[] = JSON.parse(jsonData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error('Failed to import sessions:', error);
      return false;
    }
  }, []);

  return {
    loadSessions,
    loadSession,
    saveSession,
    deleteSession,
    clearAllSessions,
    getSessionCount,
    exportSessions,
    importSessions
  };
};
