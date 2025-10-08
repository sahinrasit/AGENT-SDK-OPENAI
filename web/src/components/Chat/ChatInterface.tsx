import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ToolApprovalCard } from './ToolApprovalCard';
import { Message, AgentType, ChatSession } from '../../types/agent';
import { Bot, Users, Settings, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface PendingApproval {
  id: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
}

interface ChatInterfaceProps {
  session: ChatSession;
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isConnected?: boolean;
  isLoading?: boolean;
  streamingMessageId?: string;
  pendingApprovals?: PendingApproval[];
  onApproveToolCall?: (approvalId: string) => void;
  onRejectToolCall?: (approvalId: string) => void;
}

const getAgentInfo = (agentType: AgentType) => {
  switch (agentType) {
    case 'planner':
      return {
        name: 'AiCoE Planlayıcı',
        description: 'Yapay zeka destekli araştırma ve planlama uzmanı',
        color: 'purple'
      };
    case 'search':
      return {
        name: 'AiCoE Arama',
        description: 'Akıllı bilgi toplama uzmanı',
        color: 'cyan'
      };
    case 'writer':
      return {
        name: 'AiCoE Yazar',
        description: 'Gelişmiş içerik oluşturma uzmanı',
        color: 'green'
      };
    case 'triage':
      return {
        name: 'AiCoE Asistan',
        description: 'IBTech yapay zeka destekli akıllı asistan',
        color: 'blue'
      };
    case 'customer-service':
      return {
        name: 'AiCoE Destek',
        description: 'Yapay zeka destekli müşteri hizmetleri uzmanı',
        color: 'indigo'
      };
    default:
      return {
        name: 'AiCoE Ajan',
        description: 'AI Center of Excellence - IBTech',
        color: 'gray'
      };
  }
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  onSendMessage,
  onStopGeneration,
  isConnected = false,
  isLoading = false,
  streamingMessageId,
  pendingApprovals = [],
  onApproveToolCall,
  onRejectToolCall
}) => {
  const [messages, setMessages] = useState<Message[]>(session.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const agentInfo = getAgentInfo(session.agentType);

  // Update messages when session changes
  useEffect(() => {
    setMessages(session.messages);
  }, [session.messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessageId]);

  const handleSendMessage = (content: string) => {
    onSendMessage(content);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center',
              `bg-${agentInfo.color}-100 text-${agentInfo.color}-600`
            )}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {agentInfo.name}
              </h2>
              <p className="text-sm text-gray-600">
                {agentInfo.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-400' : 'bg-red-400'
              )}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Bağlı' : 'Bağlantı Kesildi'}
              </span>
            </div>

            {/* Action buttons */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Users className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Activity className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={clsx(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4',
              `bg-${agentInfo.color}-100 text-${agentInfo.color}-600`
            )}>
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {agentInfo.name} ile sohbete başlayın
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {agentInfo.description}. Size yardımcı olmak için buradayım.
            </p>

            {/* Suggested prompts */}
            <div className="grid gap-3 max-w-lg w-full">
              {getSuggestedPrompts(session.agentType).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200"
                >
                  <span className="text-sm text-gray-700">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={streamingMessageId === message.id}
              />
            ))}

            {/* Tool Approval Cards */}
            {pendingApprovals.length > 0 && onApproveToolCall && onRejectToolCall && (
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <ToolApprovalCard
                    key={approval.id}
                    approvalId={approval.id}
                    toolName={approval.toolName}
                    parameters={approval.parameters}
                    timestamp={approval.timestamp}
                    onApprove={onApproveToolCall}
                    onReject={onRejectToolCall}
                  />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onStopGeneration={onStopGeneration}
        isLoading={isLoading}
        disabled={!isConnected}
        placeholder={`Message ${agentInfo.name}...`}
      />
    </div>
  );
};

function getSuggestedPrompts(agentType: AgentType): string[] {
  switch (agentType) {
    case 'planner':
      return [
        "Yapay zeka trendleri için bir araştırma planı oluşturmama yardım et",
        "Rekabet analizi yapmak için en iyi yaklaşım nedir?",
        "Yenilenebilir enerji teknolojileri hakkında kapsamlı bir çalışma planla"
      ];
    case 'search':
      return [
        "Kuantum bilişimdeki son gelişmeleri ara",
        "Sürdürülebilir iş uygulamaları hakkında bilgi bul",
        "Uzaktan çalışma teknolojilerindeki güncel trendleri araştır"
      ];
    case 'writer':
      return [
        "Dijital dönüşüm hakkında kapsamlı bir rapor yaz",
        "Pazar araştırması bulgularının yönetici özeti oluştur",
        "Yeni API'miz için teknik dokümantasyon hazırla"
      ];
    case 'triage':
      return [
        "Karmaşık bir araştırma projesinde yardıma ihtiyacım var",
        "Bazı iş verilerini analiz edebilir misin?",
        "Pazar trendleri hakkında detaylı bir rapor oluşturmak istiyorum"
      ];
    case 'customer-service':
      return [
        "Faturalandırma hakkında bir sorum var",
        "Teknik sorunlar yaşıyorum",
        "Hizmetlerinizi anlamama yardımcı olabilir misiniz?"
      ];
    default:
      return [
        "Bugün size nasıl yardımcı olabilirim?",
        "Yetenekleriniz nelerdir?",
        "Özelliklerinizden bahseder misiniz?"
      ];
  }
}