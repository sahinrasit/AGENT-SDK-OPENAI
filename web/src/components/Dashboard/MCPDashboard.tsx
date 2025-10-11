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

      // Trigger discovery for all hosted servers
      const hostedServers = servers.filter(s => s.type === 'hosted');
      for (const server of hostedServers) {
        const serverLabel = server.metadata?.serverLabel || server.name;
        try {
          await fetch(`/api/mcp/discover?server=${encodeURIComponent(serverLabel)}`, {
            method: 'POST'
          });
        } catch (error) {
          console.error(`Failed to discover tools for ${serverLabel}:`, error);
        }
      }

      // Then refresh all servers
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin')} />
              Tümünü Yenile
            </button>

            <button
              onClick={onExportConfig}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Dışa Aktar
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer">
              <Upload className="w-4 h-4" />
              İçe Aktar
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Sunucu Ekle
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Sunucu</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 text-center border border-green-200 dark:border-green-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.connected}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bağlı</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.disconnected}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bağlı Değil</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 text-center border border-red-200 dark:border-red-700">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hata</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalTools}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Araç</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.activeTools}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Aktif Araç</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Sunucu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ServerFilter)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Tüm Sunucular</option>
              <option value="connected">Bağlı</option>
              <option value="disconnected">Bağlı Değil</option>
              <option value="error">Hatalı</option>
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
                <Server className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  MCP Sunucusu Yok
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  İlk Model Context Protocol sunucunuzu ekleyerek başlayın.
                  Sunucular, ajanlarınız için araçlar ve yetenekler sağlar.
                </p>
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  İlk Sunucuyu Ekle
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Sunucu Bulunamadı
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Arama ve filtre kriterlerinize uyan sunucu bulunamadı.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                  className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Filtreleri Temizle
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
          const response = await fetch('/api/mcp/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vals)
          });

          if (response.ok) {
            // Reload servers after successful addition
            await onRefreshAll?.();
            setFormOpen(false);
          } else {
            const error = await response.json().catch(() => ({ error: 'Failed to add server' }));
            alert(error.error || 'Failed to add MCP server');
          }
        }}
      />

      {/* Health Status Banner */}
      {stats.error > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-t border-red-200 dark:border-red-700 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 rounded-full p-2">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-red-900 dark:text-red-300 font-semibold">
                {stats.error} sunucu sorun yaşıyor
              </span>
              <span className="text-red-700 dark:text-red-400 ml-2 text-sm">
                Sunucu yapılandırmalarını ve ağ bağlantısını kontrol edin.
              </span>
            </div>
            <button
              onClick={handleRefreshAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Tümünü Yenile
            </button>
          </div>
        </div>
      )}

      {stats.connected === stats.total && stats.total > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-t border-green-200 dark:border-green-700 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 rounded-full p-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-green-900 dark:text-green-300 font-semibold">
              Tüm sunucular sorunsuz çalışıyor
            </span>
          </div>
        </div>
      )}
    </div>
  );
};