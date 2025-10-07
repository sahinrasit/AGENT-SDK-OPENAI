import React, { useEffect, useState } from 'react';
import { ChatInterface } from './components/Chat/ChatInterface';
import { MCPDashboard } from './components/Dashboard/MCPDashboard';
import { useChat } from './hooks/useChat';
import { AgentType, MCPServer } from './types/agent';
import { useMcp } from './hooks/useMcp';
import {
  MessageSquare,
  Database,
  Users,
  Activity,
  Settings,
  Menu,
  X,
  Bot
} from 'lucide-react';
import { clsx } from 'clsx';

type ViewType = 'chat' | 'mcp' | 'agents' | 'analytics' | 'settings';

// No more mock data; managed via useMcp

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('triage');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { servers: mcpServers, addHostedOdeabank, disconnectServer } = useMcp();
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
    autoConnect: true
  });

  const navigation = [
    { id: 'chat', name: 'Chat', icon: MessageSquare, view: 'chat' as ViewType },
    { id: 'mcp', name: 'MCP Servers', icon: Database, view: 'mcp' as ViewType },
    { id: 'agents', name: 'Agents', icon: Users, view: 'agents' as ViewType },
    { id: 'analytics', name: 'Analytics', icon: Activity, view: 'analytics' as ViewType },
    { id: 'settings', name: 'Settings', icon: Settings, view: 'settings' as ViewType },
  ];

  const agentTypes: { type: AgentType; name: string; description: string }[] = [
    { type: 'triage', name: 'Triage Agent', description: 'Routes to specialists' },
    { type: 'planner', name: 'Research Planner', description: 'Creates research plans' },
    { type: 'search', name: 'Search Specialist', description: 'Gathers information' },
    { type: 'writer', name: 'Report Writer', description: 'Creates reports' },
    { type: 'customer-service', name: 'Customer Service', description: 'Handles support' },
  ];

  const handleMCPServerAction = (action: string, ...args: any[]) => {
    switch (action) {
      case 'add':
        addHostedOdeabank();
        break;
      case 'delete': {
        const serverId = args[0] as string | undefined;
        if (serverId) disconnectServer(serverId);
        break;
      }
      default:
        break;
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'chat':
        return chat.session ? (
          <ChatInterface
            session={chat.session}
            onSendMessage={chat.sendMessage}
            onStopGeneration={chat.stopGeneration}
            isConnected={chat.isConnected}
            isLoading={chat.isLoading}
            streamingMessageId={chat.streamingMessageId}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Initializing Chat Session
              </h3>
              <p className="text-gray-600">
                {chat.isConnected ? 'Setting up your conversation...' : 'Connecting to server...'}
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
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Agent Management</h2>
            <div className="grid gap-4 max-w-4xl">
              {agentTypes.map((agent) => (
                <div
                  key={agent.type}
                  className={clsx(
                    'card cursor-pointer transition-all duration-200',
                    selectedAgentType === agent.type
                      ? 'ring-2 ring-primary-500 border-primary-200'
                      : 'hover:shadow-md'
                  )}
                  onClick={() => setSelectedAgentType(agent.type)}
                >
                  <div className="flex items-center gap-4">
                    <Bot className="w-8 h-8 text-gray-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-gray-600 text-sm">{agent.description}</p>
                    </div>
                    {selectedAgentType === agent.type && (
                      <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Analytics Dashboard</h2>
            <div className="text-gray-600">
              Analytics and monitoring features coming soon...
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="text-gray-600">
              Configuration settings coming soon...
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={clsx(
        'bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'fixed inset-y-0 left-0 z-50 w-64 lg:w-64'
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="font-bold text-gray-900">Agent Platform</h1>
                <p className="text-xs text-gray-600">Multi-Agent System</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connection Status */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                chat.isConnected ? 'bg-green-400' : 'bg-red-400'
              )}></div>
              <span className={clsx(
                chat.isConnected ? 'text-green-600' : 'text-red-600'
              )}>
                {chat.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        navigateTo(item.view);
                        setSidebarOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200',
                        currentView === item.view
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              OpenAI Agents SDK v0.1.9
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary-600" />
              <span className="font-semibold text-gray-900">Agent Platform</span>
            </div>
            <div></div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
