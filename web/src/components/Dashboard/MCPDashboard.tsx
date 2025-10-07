import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Server
} from 'lucide-react';
import { MCPServerCard } from './MCPServerCard';
import { MCPServer } from '../../types/agent';
import { clsx } from 'clsx';
import { MCPServerForm, McpFormValues } from './MCPServerForm';

interface MCPDashboardProps {
  servers: MCPServer[];
  onAddServer?: () => void;
  onToggleServer?: (serverId: string) => void;
  onDeleteServer?: (serverId: string) => void;
  onRefreshServer?: (serverId: string) => void;
  onRefreshAll?: () => void;
  onToggleTool?: (serverId: string, toolName: string) => void;
  onConfigureServer?: (serverId: string) => void;
  onExportConfig?: () => void;
  onImportConfig?: (file: File) => void;
}

type ServerFilter = 'all' | 'connected' | 'disconnected' | 'error';

export const MCPDashboard: React.FC<MCPDashboardProps> = ({
  servers,
  onAddServer,
  onToggleServer,
  onDeleteServer,
  onRefreshServer,
  onRefreshAll,
  onToggleTool,
  onConfigureServer,
  onExportConfig,
  onImportConfig
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ServerFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Filter servers based on search and filter criteria
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (server.url && server.url.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filter === 'all' || server.status === filter;

    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const stats = {
    total: servers.length,
    connected: servers.filter(s => s.status === 'connected').length,
    disconnected: servers.filter(s => s.status === 'disconnected').length,
    error: servers.filter(s => s.status === 'error').length,
    totalTools: servers.reduce((acc, s) => acc + s.tools.length, 0),
    activeTools: servers.reduce((acc, s) => acc + s.tools.filter(t => t.enabled).length, 0)
  };

  const handleRefreshAll = async () => {
    if (onRefreshAll && !isRefreshing) {
      setIsRefreshing(true);
      await onRefreshAll();
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportConfig) {
      onImportConfig(file);
    }
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MCP Server Management</h1>
            <p className="text-gray-600">Manage Model Context Protocol servers and tools</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
              Refresh All
            </button>

            <button
              onClick={onExportConfig}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setFormOpen(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Servers</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
            <div className="text-sm text-gray-600">Connected</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.disconnected}</div>
            <div className="text-sm text-gray-600">Disconnected</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalTools}</div>
            <div className="text-sm text-gray-600">Total Tools</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeTools}</div>
            <div className="text-sm text-gray-600">Active Tools</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ServerFilter)}
              className="input w-auto"
            >
              <option value="all">All Servers</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {servers.length === 0 ? (
              <>
                <Server className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No MCP Servers
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Get started by adding your first Model Context Protocol server.
                  Servers provide tools and capabilities for your agents.
                </p>
                <button
                  onClick={() => setFormOpen(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Server
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No Servers Found
                </h3>
                <p className="text-gray-600 mb-6">
                  No servers match your current search and filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="btn btn-secondary"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 max-w-6xl mx-auto">
            {filteredServers.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                onToggleServer={onToggleServer}
                onDeleteServer={onDeleteServer}
                onRefreshServer={onRefreshServer}
                onToggleTool={onToggleTool}
                onConfigureServer={onConfigureServer}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      <MCPServerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={async (vals: McpFormValues) => {
          await fetch('/api/mcp/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
          });
          onAddServer?.();
          setFormOpen(false);
        }}
      />

      {/* Health Status Banner */}
      {stats.error > 0 && (
        <div className="bg-red-50 border-t border-red-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <span className="text-red-800 font-medium">
                {stats.error} server{stats.error > 1 ? 's' : ''} experiencing issues
              </span>
              <span className="text-red-700 ml-2">
                Check server configurations and network connectivity.
              </span>
            </div>
            <button
              onClick={handleRefreshAll}
              className="text-red-700 hover:text-red-800 underline text-sm"
            >
              Refresh All
            </button>
          </div>
        </div>
      )}

      {stats.connected === stats.total && stats.total > 0 && (
        <div className="bg-green-50 border-t border-green-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              All servers are running smoothly
            </span>
          </div>
        </div>
      )}
    </div>
  );
};