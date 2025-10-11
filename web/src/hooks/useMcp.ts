import { useEffect, useState, useCallback, useRef } from 'react';
import { MCPServer } from '../types/agent';
import { useSocket } from './useSocket';

export type McpServerConfig =
  | { type: 'hosted'; name: string; serverLabel: string; serverUrl: string; requiresHumanApproval?: boolean; authToken?: string; }
  | { type: 'http'; name: string; url: string; headers?: Record<string, string>; timeout?: number; retries?: number; }
  | { type: 'stdio'; name: string; command: string; args?: string[]; workingDirectory?: string; env?: Record<string, string>; };

export const useMcp = () => {
  const { isConnected, emit, on, off } = useSocket({ autoConnect: true });

  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const discoveryTriggeredRef = useRef(false); // Track if discovery has been triggered

  const loadServersAndTools = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent concurrent requests

    isLoadingRef.current = true;
    try {
      // 1. Fetch server list from mcp.json config - SHOW IMMEDIATELY
      const serversRes = await fetch('/api/mcp/config');
      const serversList = await serversRes.json();

      if (!Array.isArray(serversList)) return;

      // 2. Map config entries to MCPServer format WITHOUT TOOLS (show empty)
      const serversWithoutTools = serversList.map((s: any) => ({
        id: s.name,
        name: s.name,
        type: s.type,
        status: 'connected' as const,
        url: s.serverUrl || s.url || '',
        tools: [], // Start with empty tools
        lastHealthCheck: new Date(),
        metadata: { serverLabel: s.serverLabel || s.name }
      }));

      // Remove duplicates
      const uniqueServers = serversWithoutTools.filter((server, index, self) =>
        index === self.findIndex((s) => s.id === server.id)
      );

      // 3. SET SERVERS IMMEDIATELY (show on screen without tools)
      setServers(uniqueServers);

      // 4. Try to fetch tools (might be empty)
      const toolsRes = await fetch('/api/mcp/tools');
      const toolsData = await toolsRes.json();

      const hasTools = toolsData.success && Array.isArray(toolsData.tools) && toolsData.tools.length > 0;

      // 5. If we have tools, update servers with tools
      if (hasTools) {
        const serversWithTools = serversList.map((s: any) => {
          const serverTools = toolsData.tools.find((t: any) =>
            t.serverId === s.name || t.serverId === s.serverLabel
          );

          return {
            id: s.name,
            name: s.name,
            type: s.type,
            status: 'connected' as const,
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
        });

        setServers(serversWithTools.filter((server, index, self) =>
          index === self.findIndex((s) => s.id === server.id)
        ));

        // Reset discovery flag when tools are found
        discoveryTriggeredRef.current = false;
      } else {
        // 6. No tools, trigger background discovery ONLY ONCE
        const needsDiscovery = serversList.filter(s => s.type === 'hosted');
        if (needsDiscovery.length > 0 && !discoveryTriggeredRef.current) {
          console.log('🔍 No tools found, triggering background discovery...');
          discoveryTriggeredRef.current = true; // Mark as triggered

          needsDiscovery.forEach((s: any) => {
            const serverLabel = s.serverLabel || s.name;
            fetch(`/api/mcp/discover?server=${encodeURIComponent(serverLabel)}`, {
              method: 'POST'
            })
              .then(() => {
                console.log(`✅ Discovery completed for ${serverLabel}, refreshing...`);
                // Wait a bit then reload tools ONCE
                setTimeout(() => {
                  isLoadingRef.current = false; // Reset loading flag before refresh
                  loadServersAndTools();
                }, 1500);
              })
              .catch(err => {
                console.error(`Failed to discover tools for ${serverLabel}:`, err);
                discoveryTriggeredRef.current = false; // Reset on error
              });
          });
        }
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      setError('Failed to load MCP servers');
    } finally {
      // Only reset if no discovery is pending
      if (!discoveryTriggeredRef.current) {
        isLoadingRef.current = false;
      }
    }
  }, []);

  // Load servers and tools only once when component mounts and is connected
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isConnected) return;

    const handleStatus = (server: any) => {
      setServers(prev => {
        const serverId = server.id || server.name;
        const idx = prev.findIndex(s => s.id === serverId);

        const base: MCPServer = {
          id: serverId,
          name: server.name || serverId,
          type: server.type || 'hosted',
          status: server.status || 'connected',
          url: server.url,
          tools: server.tools || [],
          lastHealthCheck: new Date(),
          metadata: server.metadata || {}
        };

        if (idx >= 0) {
          // Update existing server
          const next = [...prev];
          next[idx] = { ...next[idx], ...base };
          return next;
        } else {
          // Add new server only if it doesn't exist
          const exists = prev.some(s => s.id === serverId);
          if (exists) return prev; // Prevent duplicate
          return [...prev, base];
        }
      });
    };

    on('mcp:status', handleStatus);

    // Load servers ONLY ONCE when first connected
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadServersAndTools();
    }

    return () => {
      off('mcp:status', handleStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]) // Only isConnected - other deps would cause infinite loop

  const connectServer = useCallback((config: McpServerConfig) => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    emit('mcp:connect', { serverConfig: config });
    setTimeout(() => setLoading(false), 400);
  }, [isConnected, emit]);

  const disconnectServer = useCallback(async (serverId: string) => {
    if (!isConnected) return;

    // Confirm before deleting
    if (!confirm(`"${serverId}" sunucusunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from mcp.json via API
      const response = await fetch(`/api/mcp/config/${encodeURIComponent(serverId)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Sunucu silinirken hata oluştu: ${response.statusText}`);
      }

      // Emit disconnect event
      emit('mcp:disconnect', { serverId });

      // Reload servers to reflect the changes
      await loadServersAndTools();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'MCP sunucusu silinemedi');
      setLoading(false);
    }
  }, [isConnected, emit, loadServersAndTools]);

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

  const toggleTool = useCallback(async (serverId: string, toolName: string) => {
    try {
      // Call backend to toggle tool
      const response = await fetch(`/api/mcp/tools/${encodeURIComponent(serverId)}/${encodeURIComponent(toolName)}/toggle`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle tool');
      }

      // Update local state
      setServers(prev => prev.map(server => {
        if (server.id === serverId) {
          return {
            ...server,
            tools: server.tools.map(tool =>
              tool.name === toolName
                ? { ...tool, enabled: !tool.enabled }
                : tool
            )
          };
        }
        return server;
      }));
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  }, []);

  return {
    servers,
    loading,
    error,
    isConnected,
    connectServer,
    disconnectServer,
    addServer,
    setServers,
    toggleTool,
    refresh: loadServersAndTools
  };
};


