/**
 * useSessions Hook
 * Manages session list state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { sessionsApi, ChatSession, SessionFilters } from '../api/sessions';

export function useSessions(initialFilters?: SessionFilters) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<SessionFilters>(initialFilters || { status: 'active' });

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionsApi.list(filters);
      setSessions(response.data);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const createSession = async (data: { title?: string; agent_type?: string }) => {
    try {
      const response = await sessionsApi.create(data);
      await loadSessions(); // Reload list
      return response.data;
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await sessionsApi.delete(id);
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  };

  const archiveSession = async (id: string) => {
    try {
      await sessionsApi.archive(id);
      await loadSessions();
    } catch (err) {
      console.error('Failed to archive session:', err);
      throw err;
    }
  };

  const unarchiveSession = async (id: string) => {
    try {
      await sessionsApi.unarchive(id);
      await loadSessions();
    } catch (err) {
      console.error('Failed to unarchive session:', err);
      throw err;
    }
  };

  const pinSession = async (id: string, pinned: boolean) => {
    try {
      await sessionsApi.pin(id, pinned);
      await loadSessions();
    } catch (err) {
      console.error('Failed to pin session:', err);
      throw err;
    }
  };

  const updateFilters = (newFilters: Partial<SessionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const searchSessions = async (query: string) => {
    try {
      setLoading(true);
      const response = await sessionsApi.search(query);
      setSessions(response.data);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to search sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    loading,
    error,
    filters,
    loadSessions,
    createSession,
    deleteSession,
    archiveSession,
    unarchiveSession,
    pinSession,
    updateFilters,
    searchSessions,
  };
}
