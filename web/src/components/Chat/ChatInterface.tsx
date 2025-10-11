import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ToolApprovalCard } from './ToolApprovalCard';
import { Message, AgentType, ChatSession } from '../../types/agent';
import { Bot } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(session.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Gradient Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 opacity-50"></div>

            <div className="relative z-10 max-w-3xl">
              {/* Logo and Title */}
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  AiCoE Asistan
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                  {t('chat.subtitle')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('chat.ready')}
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {getSuggestedPrompts(session.agentType, t).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    className="group p-4 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-2xl mb-1">🚀</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('chat.feature.fast')}</div>
                </div>
                <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('chat.feature.smart')}</div>
                </div>
                <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-2xl mb-1">🔒</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('chat.feature.secure')}</div>
                </div>
              </div>
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

            {/* Thinking Indicator - shown when loading and no streaming message yet */}
            {isLoading && !streamingMessageId && (
              <div className="flex gap-3 mb-4 max-w-4xl mr-auto">
                {/* Avatar */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <img
                    src="/aicoe.jpeg"
                    alt="AiCoE"
                    className="w-5 h-5 object-contain"
                  />
                </div>

                {/* Thinking bubble */}
                <div className="flex-1 max-w-[75%]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm text-gray-800 dark:text-white">AiCoE</span>
                  </div>
                  <div className="inline-block rounded-2xl px-4 py-3 shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                      <span className="text-sm">{t('chat.thinking')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
        placeholder={t('chat.placeholder')}
      />
    </div>
  );
};

function getSuggestedPrompts(agentType: AgentType, t: (key: string) => string): string[] {
  switch (agentType) {
    case 'planner':
      return [
        t('chat.prompt.planner.1'),
        t('chat.prompt.planner.2'),
        t('chat.prompt.planner.3')
      ];
    case 'search':
      return [
        t('chat.prompt.search.1'),
        t('chat.prompt.search.2'),
        t('chat.prompt.search.3')
      ];
    case 'writer':
      return [
        t('chat.prompt.writer.1'),
        t('chat.prompt.writer.2'),
        t('chat.prompt.writer.3')
      ];
    case 'triage':
      return [
        t('chat.prompt.triage.1'),
        t('chat.prompt.triage.2'),
        t('chat.prompt.triage.3')
      ];
    case 'customer-service':
      return [
        t('chat.prompt.cs.1'),
        t('chat.prompt.cs.2'),
        t('chat.prompt.cs.3')
      ];
    default:
      return [
        t('chat.prompt.help'),
        t('chat.prompt.capabilities'),
        t('chat.prompt.features')
      ];
  }
}
