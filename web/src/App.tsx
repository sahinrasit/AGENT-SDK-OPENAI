import React, { useEffect, useState } from 'react';
import { ChatInterface } from './components/Chat/ChatInterface';
import { MCPDashboard } from './components/Dashboard/MCPDashboard';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { AnalyticsPanel } from './components/Analytics/AnalyticsPanel';
import { useChat } from './hooks/useChat';
import { AgentType, MCPServer } from './types/agent';
import { useMcp } from './hooks/useMcp';
import SessionList from './components/SessionList';
import { Clock } from './components/common/Clock';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import {
  MessageSquare,
  Database,
  Users,
  Activity,
  Settings,
  Menu,
  X,
  Bot,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { clsx } from 'clsx';

type ViewType = 'chat' | 'mcp' | 'agents' | 'analytics' | 'settings';

// No more mock data; managed via useMcp

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('triage');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [sessionsExpanded, setSessionsExpanded] = useState(true); // Sessions section expand/collapse
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const { servers: mcpServers, addServer, disconnectServer, toggleTool } = useMcp();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  // Simple SPA routing without external deps
  const mapViewToPath = (view: ViewType): string => {
    switch (view) {
      case 'mcp':
        return '/mcpserver';
      case 'agents':
        return '/agents';
      case 'analytics':
        return '/analytics';
      case 'settings':
        return '/settings';
      case 'chat':
      default:
        return '/';
    }
  };

  const mapPathToView = (path: string): ViewType => {
    if (path.startsWith('/mcpserver')) return 'mcp';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/settings')) return 'settings';
    return 'chat';
  };

  const navigateTo = (view: ViewType) => {
    const path = mapViewToPath(view);
    if (window.location.pathname !== path) {
      window.history.pushState({ view }, '', path);
    }
    setCurrentView(view);
  };

  // Initialize view from URL on first load
  useEffect(() => {
    const initialView = mapPathToView(window.location.pathname);
    setCurrentView(initialView);
    const onPopState = () => setCurrentView(mapPathToView(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);


  const chat = useChat({
    agentType: selectedAgentType,
    sessionId: activeSessionId,
    autoConnect: !!activeSessionId
  });

  const navigation = [
    { id: 'mcp', name: t('nav.mcp'), icon: Database, view: 'mcp' as ViewType },
    { id: 'agents', name: language === 'tr' ? 'Ajanlar' : 'Agents', icon: Users, view: 'agents' as ViewType },
    { id: 'analytics', name: t('nav.analytics'), icon: Activity, view: 'analytics' as ViewType },
    { id: 'settings', name: t('nav.settings'), icon: Settings, view: 'settings' as ViewType },
  ];

  const agentTypes: { type: AgentType; name: string; description: string }[] = [
    { type: 'triage', name: 'AiCoE Asistan', description: 'Yapay zeka destekli akıllı asistan' },
    { type: 'planner', name: 'AiCoE Planlayıcı', description: 'Araştırma ve planlama uzmanı' },
    { type: 'search', name: 'AiCoE Arama', description: 'Bilgi toplama uzmanı' },
    { type: 'writer', name: 'AiCoE Yazar', description: 'İçerik oluşturma uzmanı' },
    { type: 'customer-service', name: 'AiCoE Destek', description: 'Müşteri hizmetleri uzmanı' },
  ];

  const handleMCPServerAction = (action: string, ...args: any[]) => {
    switch (action) {
      case 'add': {
        const config = args[0];
        if (config) addServer(config);
        break;
      }
      case 'delete': {
        const serverId = args[0] as string | undefined;
        if (serverId) disconnectServer(serverId);
        break;
      }
      case 'toggleTool': {
        const [serverId, toolName] = args as [string, string];
        if (serverId && toolName) toggleTool(serverId, toolName);
        break;
      }
      default:
        break;
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'chat':
        // Show chat interface if session is active
        if (chat.session) {
          return (
            <ChatInterface
              session={chat.session}
              onSendMessage={chat.sendMessage}
              onStopGeneration={chat.stopGeneration}
              isConnected={chat.isConnected}
              isLoading={chat.isLoading}
              streamingMessageId={chat.streamingMessageId}
              pendingApprovals={chat.pendingApprovals}
              onApproveToolCall={chat.approveToolCall}
              onRejectToolCall={chat.rejectToolCall}
            />
          );
        }

        // Show welcome screen if no session selected
        if (!activeSessionId) {
          return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
              <div className="text-center max-w-2xl px-8">
                <Bot className="w-20 h-20 text-blue-500 dark:text-blue-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  IBTech AI Agent Platform'a Hoş Geldiniz
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  Başlamak için sol taraftan bir sohbet seçin veya yeni bir sohbet başlatın
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    OpenAI Agents SDK
                  </span>
                  <span>•</span>
                  <span>Multi-Agent Orchestration</span>
                  <span>•</span>
                  <span>Context-Aware</span>
                </div>
              </div>
            </div>
          );
        }

        // Show loading if session is being loaded
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sohbet Yükleniyor
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {chat.isConnected ? 'Konuşmanız hazırlanıyor...' : 'Sunucuya bağlanılıyor...'}
              </p>
            </div>
          </div>
        );

      case 'mcp':
        return (
          <MCPDashboard
            servers={mcpServers}
            onAddServer={() => handleMCPServerAction('add')}
            onToggleServer={(id) => handleMCPServerAction('toggle', id)}
            onDeleteServer={(id) => handleMCPServerAction('delete', id)}
            onRefreshServer={(id) => handleMCPServerAction('refresh', id)}
            onRefreshAll={() => handleMCPServerAction('refreshAll')}
            onToggleTool={(serverId, toolName) => handleMCPServerAction('toggleTool', serverId, toolName)}
            onConfigureServer={(id) => handleMCPServerAction('configure', id)}
            onExportConfig={() => handleMCPServerAction('export')}
            onImportConfig={(file: File) => handleMCPServerAction('import', file.name)}
          />
        );

      case 'agents':
        return (
          <div className="p-6 bg-gray-50 dark:bg-gray-900 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yapay Zeka Ajanları</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Farklı görevler için özelleştirilmiş ajanları seçin</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {agentTypes.map((agent) => (
                  <div
                    key={agent.type}
                    className={clsx(
                      'bg-white dark:bg-gray-800 rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                      selectedAgentType === agent.type
                        ? 'border-blue-500 shadow-lg scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    )}
                    onClick={() => setSelectedAgentType(agent.type)}
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        selectedAgentType === agent.type
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                          : 'bg-gray-100 dark:bg-gray-700'
                      )}>
                        <img
                          src="/aicoe.jpeg"
                          alt="AiCoE"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{agent.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{agent.description}</p>
                      </div>
                      {selectedAgentType === agent.type && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Aktif
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return <AnalyticsPanel />;

      case 'settings':
        return <SettingsPanel />;

      default:
        return null;
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const getAgentInfo = (agentType: AgentType) => {
    switch (agentType) {
      case 'planner':
        return {
          name: 'AiCoE Planlayıcı',
          description: 'Yapay zeka destekli araştırma ve planlama uzmanı',
        };
      case 'search':
        return {
          name: 'AiCoE Arama',
          description: 'Akıllı bilgi toplama uzmanı',
        };
      case 'writer':
        return {
          name: 'AiCoE Yazar',
          description: 'Gelişmiş içerik oluşturma uzmanı',
        };
      case 'triage':
        return {
          name: 'AiCoE Asistan',
          description: 'IBTech yapay zeka destekli akıllı asistan',
        };
      case 'customer-service':
        return {
          name: 'AiCoE Destek',
          description: 'Yapay zeka destekli müşteri hizmetleri uzmanı',
        };
      default:
        return {
          name: 'AiCoE Ajan',
          description: 'AI Center of Excellence - IBTech',
        };
    }
  };

  const agentInfo = getAgentInfo(selectedAgentType);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Fixed Header - Above everything */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-gray-800 dark:to-gray-900 border-b border-blue-700 dark:border-gray-700 px-6 py-4 shadow-lg z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logos */}
            <div className="flex items-center gap-3 pr-6 border-r border-white/20">
              <div className="bg-white rounded-lg p-2 shadow-md">
                <img
                  src="/aicoe.jpeg"
                  alt="AiCoE"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="text-white">
                <div className="text-sm font-bold">AiCoE</div>
                <div className="text-xs opacity-90">IBTech</div>
              </div>
            </div>

            {/* Page Title */}
            <div>
              {currentView === 'chat' ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    {agentInfo.name}
                  </h2>
                  <p className="text-sm text-white/80">
                    {agentInfo.description}
                  </p>
                </>
              ) : currentView === 'mcp' ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    MCP Sunucu Yönetimi
                  </h2>
                  <p className="text-sm text-white/80">
                    Model Context Protocol sunucularını ve araçlarını yönetin
                  </p>
                </>
              ) : currentView === 'agents' ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    Ajan Yönetimi
                  </h2>
                  <p className="text-sm text-white/80">
                    Yapay zeka ajanlarınızı yönetin ve yapılandırın
                  </p>
                </>
              ) : currentView === 'analytics' ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    Analitik Panel
                  </h2>
                  <p className="text-sm text-white/80">
                    Performans metrikleri ve kullanım istatistikleri
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    Ayarlar
                  </h2>
                  <p className="text-sm text-white/80">
                    Sistem yapılandırması ve tercihler
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Clock */}
            <Clock className="text-white" showDate={false} />

            {/* Language Selector */}
            <button
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              title="Change Language / Dil Değiştir"
            >
              <Globe className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-medium">{language.toUpperCase()}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                console.log('[App] Dark mode button clicked, current theme:', theme);
                toggleTheme();
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-300" />
              ) : (
                <Moon className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                chat.isConnected ? 'bg-green-400' : 'bg-red-400'
              )}></div>
              <span className="text-sm text-white">
                {chat.isConnected ? 'Bağlı' : 'Bağlantı Kesildi'}
              </span>
            </div>

            {/* MCP Server Button - Only show when not on MCP page */}
            {currentView !== 'mcp' && (
              <button
                onClick={() => navigateTo('mcp')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 border border-white/20"
              >
                <Boxes className="w-4 h-4" />
                <span className="text-sm font-medium">MCP Sunucular</span>
              </button>
            )}

            {/* Action buttons */}
            <button
              onClick={() => navigateTo('analytics')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                currentView === 'analytics'
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
              title="Analitik"
            >
              <Activity className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateTo('settings')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                currentView === 'settings'
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
              title="Ayarlar"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area with unified sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unified Sidebar - Always visible unless collapsed */}
        {!sidebarCollapsed && (
          <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 flex-shrink-0 flex flex-col">
            {/* Collapse Button */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-2">
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">{language === 'tr' ? 'Daralt' : 'Collapse'}</span>
              </button>
            </div>

            {/* Sessions Section - Collapsible */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSessionsExpanded(!sessionsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-semibold">{language === 'tr' ? 'Sohbetler' : 'Chats'}</span>
                {sessionsExpanded ? (
                  <ChevronLeft className="w-4 h-4 rotate-90" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {sessionsExpanded && (
                <div className="max-h-96 overflow-y-auto">
                  <SessionList
                    onSessionSelect={handleSessionSelect}
                    activeSessionId={activeSessionId}
                    onNavigateToChat={() => navigateTo('chat')}
                  />
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-2">{language === 'tr' ? 'MENÜ' : 'MENU'}</div>
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => navigateTo(item.view)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200',
                          currentView === item.view
                            ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/ibtech.jpeg"
                  alt="IBTech"
                  className="h-6 object-contain"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  OpenAI Agents SDK v0.1.9
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed Sidebar - Show expand button */}
        {sidebarCollapsed && (
          <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-12 flex-shrink-0 flex flex-col items-center py-2">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={language === 'tr' ? 'Genişlet' : 'Expand'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
