import { useEffect, useState, useCallback } from 'react';
import { MCPServer } from '../types/agent';
import { useSocket } from './useSocket';

export type McpServerConfig =
  | { type: 'hosted'; name: string; serverLabel: string; serverUrl: string; requiresHumanApproval?: boolean; authToken?: string; tools?: string[] }
  | { type: 'http'; name: string; url: string; headers?: Record<string, string>; timeout?: number; retries?: number; tools?: string[] }
  | { type: 'stdio'; name: string; command: string; args?: string[]; workingDirectory?: string; env?: Record<string, string>; tools?: string[] };

export const useMcp = () => {
  const { isConnected, emit, on, off } = useSocket({ autoConnect: true });
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServersAndTools = useCallback(() => {
    // Initial fetch of server list
    return fetch('/api/mcp/servers')
      .then(r => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          setServers(list.map((s: any) => ({
            id: s.name,
            name: s.name,
            type: s.type,
            status: s.status === 'active' ? 'connected' : s.status,
            url: s.url,
            tools: [],
            lastHealthCheck: new Date(),
            metadata: { serverLabel: s.serverLabel }
          })));

          // Fetch tools for each server (best-effort)
          list.forEach((s: any) => {
            fetch(`/api/mcp/tools?server=${encodeURIComponent(s.serverLabel || s.name)}`)
              .then(r => r.json())
              .then((data) => {
                if (Array.isArray(data?.tools)) {
                  setServers(prev => prev.map(p => (p.id === s.name ? {
                    ...p,
                    tools: data.tools.map((t: any) => ({ name: t.name, description: t.description || '', enabled: true }))
                  } : p)));
                } else {
                  // If not cached, trigger discovery and then refetch
                  fetch(`/api/mcp/discover?server=${encodeURIComponent(s.serverLabel || s.name)}`, { method: 'POST' })
                    .then(() => fetch(`/api/mcp/tools?server=${encodeURIComponent(s.serverLabel || s.name)}`))
                    .then(r => r.json())
                    .then((d2) => {
                      if (Array.isArray(d2?.tools)) {
                        setServers(prev => prev.map(p => (p.id === s.name ? {
                          ...p,
                          tools: d2.tools.map((t: any) => ({ name: t.name, description: t.description || '', enabled: true }))
                        } : p)));
                      }
                    })
                    .catch(() => {});
                }
              })
              .catch(() => {});
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const handleStatus = (server: any) => {
      setServers(prev => {
        const idx = prev.findIndex(s => s.id === server.id || s.name === server.name);
        const base: MCPServer = {
          id: server.id || server.name,
          name: server.name || server.id,
          type: server.type || 'hosted',
          status: server.status || 'connected',
          url: server.url,
          tools: server.tools || [],
          lastHealthCheck: new Date(),
          metadata: server.metadata || {}
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...base };
          return next;
        }
        return [...prev, base];
      });
    };

    on('mcp:status', handleStatus);
    loadServersAndTools();

    return () => {
      off('mcp:status', handleStatus);
    };
  }, [isConnected, on, off, loadServersAndTools]);

  const connectServer = useCallback((config: McpServerConfig) => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    emit('mcp:connect', { serverConfig: config });
    setTimeout(() => setLoading(false), 400);
  }, [isConnected, emit]);

  const disconnectServer = useCallback((serverId: string) => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    emit('mcp:disconnect', { serverId });
    // optimistic update
    setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'disconnected' } : s));
    setTimeout(() => setLoading(false), 300);
  }, [isConnected, emit]);

  const addHostedOdeabank = useCallback(() => {
    // Duplicate guard: skip if already exists
    if (servers.some(s => s.id === 'odeabank' || s.name === 'odeabank')) {
      return;
    }
    // Hosted MCP (model tarafında çağrılan) - config’e de yaz
    fetch('/api/mcp/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'odeabank',
        type: 'hosted',
        serverLabel: 'odeabank',
        serverUrl: 'https://mcp.cloud.odeabank.com.tr/mcp/sse'
      })
    }).then(() => {
      connectServer({
        type: 'hosted',
        name: 'odeabank',
        serverLabel: 'odeabank',
        serverUrl: 'https://mcp.cloud.odeabank.com.tr/mcp/sse'
      } as any);
    }).catch(() => {
      connectServer({
        type: 'hosted',
        name: 'odeabank',
        serverLabel: 'odeabank',
        serverUrl: 'https://mcp.cloud.odeabank.com.tr/mcp/sse'
      } as any);
    });
  }, [connectServer, servers]);

  return {
    servers,
    loading,
    error,
    isConnected,
    connectServer,
    disconnectServer,
    addHostedOdeabank,
    setServers,
    refresh: loadServersAndTools
  };
};


