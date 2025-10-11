import React, { useState } from 'react';
import {
  Server,
  Globe,
  Terminal,
  Circle,
  Settings,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { MCPServer, MCPTool } from '../../types/agent';
import { clsx } from 'clsx';

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
      return 'text-green-600 bg-green-100';
    case 'disconnected':
      return 'text-gray-600 bg-gray-100';
    case 'error':
      return 'text-red-600 bg-red-100';
    case 'connecting':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
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
  onToggleServer,
  onDeleteServer,
  onRefreshServer,
  onToggleTool,
  onConfigureServer
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={clsx('p-1.5 rounded', getStatusColor(server.status))}>
            {getServerIcon(server.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 truncate">{server.name}</h3>
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
              <span className="text-xs text-gray-500 truncate block">
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
                  ? 'bg-blue-100 text-blue-600 cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
              title="MCP araçlarını keşfet"
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
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="Yenile"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>

          <button
            onClick={() => onDeleteServer?.(server.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1">
          <Wrench className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">{server.tools.length}</span>
          <span className="text-gray-600">araç</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          <span className="font-semibold text-green-600">{connectedTools.length}</span>
          <span className="text-gray-600">aktif</span>
        </div>
      </div>

      {/* Tools List - Always Expanded, Compact Design */}
      {server.tools.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
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
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300 line-through',
                  !isConnected && 'opacity-50 cursor-not-allowed'
                )}
                title={tool.description || tool.name}
              >
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  tool.enabled ? 'bg-green-500' : 'bg-gray-400'
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

interface ToolItemProps {
  tool: MCPTool;
  serverId: string;
  isServerConnected: boolean;
  onToggleTool?: (serverId: string, toolName: string) => void;
}

const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  serverId,
  isServerConnected,
  onToggleTool
}) => {
  return (
    <div className={clsx(
      'flex items-center justify-between p-2 rounded border text-xs',
      tool.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
    )}>
      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center gap-1.5">
          <h4 className="font-medium text-gray-900 truncate">
            {tool.name}
          </h4>
        </div>
        {tool.description && (
          <p className="text-xs text-gray-600 truncate">
            {tool.description}
          </p>
        )}
      </div>

      <button
        onClick={() => onToggleTool?.(serverId, tool.name)}
        disabled={!isServerConnected}
        className={clsx(
          'w-8 h-5 rounded-full relative transition-colors flex-shrink-0',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          tool.enabled ? 'bg-green-600' : 'bg-gray-300',
          !isServerConnected && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className={clsx(
          'w-3 h-3 bg-white rounded-full absolute top-1 transition-transform duration-200',
          tool.enabled ? 'translate-x-4' : 'translate-x-1'
        )} />
      </button>
    </div>
  );
};