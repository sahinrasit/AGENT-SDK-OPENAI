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

  const loadServersAndTools = useCallback(async () => {
    try {
      // Fetch server list from mcp.json config
      const serversRes = await fetch('/api/mcp/config');
      const serversList = await serversRes.json();

      if (Array.isArray(serversList)) {
        // Fetch all tools at once
        try {
          const toolsRes = await fetch('/api/mcp/tools');
          const toolsData = await toolsRes.json();

          // Map config entries to MCPServer format with tools
          setServers(serversList.map((s: any) => {
            const serverTools = toolsData.success && Array.isArray(toolsData.tools)
              ? toolsData.tools.find((t: any) =>
                  t.serverId === s.name ||
                  t.serverId === s.serverLabel
                )
              : null;

            return {
              id: s.name,
              name: s.name,
              type: s.type,
              status: 'connected',
              url: s.serverUrl || s.url || '',
              tools: serverTools && Array.isArray(serverTools.tools)
                ? serverTools.tools.map((t: any) => ({
                    name: t.name || t.toolName || 'unknown',
                    description: t.description || t.desc || '',
                    parameters: t.inputSchema || t.parameters || {},
                    enabled: true
                  }))
                : [],
              lastHealthCheck: new Date(),
              metadata: { serverLabel: s.serverLabel || s.name }
            };
          }));
        } catch (toolsError) {
          console.error('Failed to fetch tools:', toolsError);
          // Still set servers even if tools fetch fails
          setServers(serversList.map((s: any) => ({
            id: s.name,
            name: s.name,
            type: s.type,
            status: 'connected',
            url: s.serverUrl || s.url || '',
            tools: [],
            lastHealthCheck: new Date(),
            metadata: { serverLabel: s.serverLabel || s.name }
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      setError('Failed to load MCP servers');
    }
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
    
    // Load servers only once when connected
    loadServersAndTools();
    
    // Set up periodic refresh (every 60 seconds instead of continuous)
    const refreshInterval = setInterval(() => {
      loadServersAndTools();
    }, 60000); // 60 seconds

    return () => {
      off('mcp:status', handleStatus);
      clearInterval(refreshInterval);
    };
  }, [isConnected, on, off]); // Removed loadServersAndTools from dependencies

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

  const addServer = useCallback(async (config: McpServerConfig) => {
    // Duplicate guard: skip if already exists
    if (servers.some(s => s.id === config.name || s.name === config.name)) {
      setError(`Server "${config.name}" already exists`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save to mcp.json via API
      const response = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Failed to add server: ${response.statusText}`);
      }

      // Reload servers to reflect the changes
      await loadServersAndTools();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add MCP server');
      setLoading(false);
    }
  }, [servers, loadServersAndTools]);

  return {
    servers,
    loading,
    error,
    isConnected,
    connectServer,
    disconnectServer,
    addServer,
    setServers,
    refresh: loadServersAndTools
  };
};


