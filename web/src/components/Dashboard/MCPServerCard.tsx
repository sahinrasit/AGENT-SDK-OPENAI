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
    <div className="card hover:shadow-md transition-shadow duration-200">
      {/* Server Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'p-2 rounded-lg',
            getStatusColor(server.status)
          )}>
            {getServerIcon(server.type)}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{server.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx(
                'badge text-xs',
                server.type === 'stdio' && 'badge-info',
                server.type === 'http' && 'badge-warning',
                server.type === 'hosted' && 'badge-success'
              )}>
                {server.type.toUpperCase()}
              </span>
              {server.url && (
                <span className="text-xs text-gray-500 truncate max-w-xs">
                  {server.url}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
            getStatusColor(server.status)
          )}>
            {getStatusIcon(server.status)}
            <span className="font-medium capitalize">
              {server.status}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isHosted && hasDefaultTools && (
              <button
                onClick={handleDiscoverTools}
                disabled={isDiscovering}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  isDiscovering 
                    ? 'bg-blue-100 text-blue-600 cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
                title="Discover real MCP tools"
              >
                {isDiscovering ? (
                  <>
                    <RefreshCw className="w-3 h-3 inline animate-spin mr-1" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Wrench className="w-3 h-3 inline mr-1" />
                    Discover Tools
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Refresh server"
            >
              <RefreshCw className={clsx(
                'w-4 h-4',
                isRefreshing && 'animate-spin'
              )} />
            </button>

            <button
              onClick={() => onConfigureServer?.(server.id)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Configure server"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDeleteServer?.(server.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="Delete server"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Server Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {server.tools.length}
          </div>
          <div className="text-sm text-gray-600">Total Tools</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {connectedTools.length}
          </div>
          <div className="text-sm text-gray-600">Active Tools</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(server.lastHealthCheck).toLocaleTimeString()}
          </div>
          <div className="text-xs text-gray-500">Last Check</div>
        </div>
      </div>

      {/* Tools Section */}
      {server.tools.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-left hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">
                Tools ({server.tools.length})
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {server.tools.map((tool) => (
                <ToolItem
                  key={tool.name}
                  tool={tool}
                  serverId={server.id}
                  isServerConnected={isConnected}
                  onToggleTool={onToggleTool}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* No tools message */}
      {server.tools.length === 0 && isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center text-gray-500">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tools available</p>
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
      'flex items-center justify-between p-3 rounded-lg border',
      tool.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
    )}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-gray-900">
            {tool.name}
          </h4>
          <span className={clsx(
            'badge text-xs',
            tool.enabled ? 'badge-success' : 'badge-error'
          )}>
            {tool.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {tool.description}
        </p>
      </div>

      <button
        onClick={() => onToggleTool?.(serverId, tool.name)}
        disabled={!isServerConnected}
        className={clsx(
          'ml-3 w-10 h-6 rounded-full relative transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          tool.enabled ? 'bg-green-600' : 'bg-gray-300',
          !isServerConnected && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className={clsx(
          'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200',
          tool.enabled ? 'translate-x-5' : 'translate-x-1'
        )} />
      </button>
    </div>
  );
};