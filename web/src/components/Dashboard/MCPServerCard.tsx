import React, { useState } from 'react';
import {
  Server,
  Globe,
  Terminal,
  Circle,
  Trash2,
  RefreshCw,
  Wrench,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { MCPServer } from '../../types/agent';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

interface MCPServerCardProps {
  server: MCPServer;
  onToggleServer?: (serverId: string) => void;
  onDeleteServer?: (serverId: string) => void;
  onRefreshServer?: (serverId: string) => void;
  onToggleTool?: (serverId: string, toolName: string) => void;
  onConfigureServer?: (serverId: string) => void;
}

const getServerIcon = (type: MCPServer['type']) => {
  switch (type) {
    case 'stdio':
      return <Terminal className="w-5 h-5" />;
    case 'http':
      return <Globe className="w-5 h-5" />;
    case 'hosted':
      return <Server className="w-5 h-5" />;
    default:
      return <Server className="w-5 h-5" />;
  }
};

const getStatusColor = (status: MCPServer['status']) => {
  switch (status) {
    case 'connected':
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    case 'disconnected':
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    case 'error':
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    case 'connecting':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  }
};

const getStatusIcon = (status: MCPServer['status']) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="w-4 h-4" />;
    case 'disconnected':
      return <Circle className="w-4 h-4" />;
    case 'error':
      return <XCircle className="w-4 h-4" />;
    case 'connecting':
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

export const MCPServerCard: React.FC<MCPServerCardProps> = ({
  server,
  onDeleteServer,
  onRefreshServer,
  onToggleTool
}) => {
  const { t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleRefresh = async () => {
    if (onRefreshServer && !isRefreshing) {
      setIsRefreshing(true);
      await onRefreshServer(server.id);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleDiscoverTools = async () => {
    if (isDiscovering) return;

    setIsDiscovering(true);
    try {
      const serverLabel = server.metadata?.serverLabel || server.name;
      const response = await fetch(`/api/mcp/discover?server=${encodeURIComponent(serverLabel)}`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Discovered ${data.count} tools for ${serverLabel}`);
        // Trigger refresh to get updated tools
        if (onRefreshServer) {
          await onRefreshServer(server.id);
        }
      } else {
        console.error('Failed to discover tools');
      }
    } catch (error) {
      console.error('Error discovering tools:', error);
    } finally {
      setTimeout(() => setIsDiscovering(false), 2000);
    }
  };

  const connectedTools = server.tools.filter(tool => tool.enabled);
  const isConnected = server.status === 'connected';
  const isHosted = server.type === 'hosted';
  const hasDefaultTools = server.tools.length === 2 &&
    server.tools.some(t => t.name === 'mcp_call_tool');

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={clsx('p-1.5 rounded', getStatusColor(server.status))}>
            {getServerIcon(server.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{server.name}</h3>
              <span className={clsx(
                'badge text-xs px-1.5 py-0.5 flex-shrink-0',
                server.type === 'stdio' && 'badge-info',
                server.type === 'http' && 'badge-warning',
                server.type === 'hosted' && 'badge-success'
              )}>
                {server.type}
              </span>
            </div>
            {server.url && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                {server.url}
              </span>
            )}
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {/* Status badge */}
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
            getStatusColor(server.status)
          )}>
            {getStatusIcon(server.status)}
          </div>

          {isHosted && hasDefaultTools && (
            <button
              onClick={handleDiscoverTools}
              disabled={isDiscovering}
              className={clsx(
                'p-1.5 rounded transition-colors text-xs',
                isDiscovering
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
              title={t('mcp.discover')}
            >
              {isDiscovering ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('mcp.refresh')}
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>

          <button
            onClick={() => onDeleteServer?.(server.id)}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            title={t('mcp.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
        <div className="flex items-center gap-1">
          <Wrench className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <span className="font-semibold text-gray-900 dark:text-white">{server.tools.length}</span>
          <span className="text-gray-600 dark:text-gray-400">{t('mcp.tools')}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-green-600 dark:text-green-400">{connectedTools.length}</span>
          <span className="text-gray-600 dark:text-gray-400">{t('mcp.active')}</span>
        </div>
      </div>

      {/* Tools List - Always Expanded, Compact Design */}
      {server.tools.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-1.5">
            {server.tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => onToggleTool?.(server.id, tool.name)}
                disabled={!isConnected}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  'flex items-center gap-1.5',
                  tool.enabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-300 dark:border-green-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 line-through',
                  !isConnected && 'opacity-50 cursor-not-allowed'
                )}
                title={tool.description || tool.name}
              >
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  tool.enabled ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-gray-600'
                )} />
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
