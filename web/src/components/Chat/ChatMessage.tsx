import React from 'react';
import { Bot, User, Clock, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import { Message, AgentType } from '../../types/agent';
import { clsx } from 'clsx';
import { ToolCallDisplay } from './ToolCallDisplay';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

const getAgentIcon = (agentType?: AgentType) => {
  return (
    <img
      src="/aicoe.jpeg"
      alt="AiCoE"
      className="w-5 h-5 object-contain"
    />
  );
};

const getAgentStyles = (agentType?: AgentType) => {
  switch (agentType) {
    case 'planner':
      return 'agent-planner';
    case 'search':
      return 'agent-search';
    case 'writer':
      return 'agent-writer';
    case 'triage':
      return 'agent-handoff';
    default:
      return '';
  }
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2 text-gray-500">
    <div className="typing-indicator">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
    <span className="text-sm">Agent is thinking...</span>
  </div>
);

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isThinking = message.type === 'thinking';
  const isTool = message.type === 'tool';

  // Get tool calls from message (new structure)
  // Filter out internal tool calls that shouldn't be shown to users
  const internalTools = ['mcp_list_tools', 'unknown_tool'];
  const toolCalls = (message.toolCalls || []).filter(
    tc => !internalTools.includes(tc.toolName)
  );
  const hasTools = toolCalls.length > 0;

  // Get thinking steps
  const thinkingSteps = message.thinkingSteps || [];
  const isThinkingActive = isThinking || (isStreaming && thinkingSteps.length > 0);

  // Safely format timestamp
  const formatTime = (timestamp: Date | string | number) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return 'Invalid time';
    }
  };

  // If this is just a thinking message, show thinking indicator
  if (isThinking) {
    return (
      <div className="max-w-4xl mr-auto mb-6">
        <ThinkingIndicator steps={thinkingSteps} isActive={isStreaming} />
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {typeof message.content === 'string' 
            ? message.content 
            : JSON.stringify(message.content)}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'flex gap-3 mb-4 max-w-4xl',
      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
    )}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm',
        isUser
          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
          : 'bg-white border-2 border-gray-200 text-gray-700'
      )}>
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          getAgentIcon(message.agentType)
        )}
      </div>

      {/* Message content */}
      <div className={clsx(
        'flex-1 max-w-[75%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        {/* Agent name and timestamp */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-800">
              {message.agentName || 'Assistant'}
            </span>
            {message.agentType && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                {message.agentType === 'triage' ? 'AiCoE' : message.agentType}
              </span>
            )}
            {hasTools && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-md flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {toolCalls.length} araç
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className={clsx(
          'inline-block rounded-2xl px-4 py-3 shadow-md max-w-full',
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800',
          isStreaming && 'shadow-lg'
        )}>
          {isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="mb-0 whitespace-pre-wrap leading-relaxed" style={{
                color: isUser ? 'white' : '#1f2937'
              }}>
                {typeof message.content === 'string'
                  ? message.content
                  : JSON.stringify(message.content, null, 2)}
              </p>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && message.content && (
            <div className={clsx(
              "flex items-center mt-2 text-xs",
              isUser ? "text-white/70" : "text-gray-500"
            )}>
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse mr-2"></div>
              Yazıyor...
            </div>
          )}

          {/* Completion indicator */}
          {!isStreaming && !isUser && message.content && (
            <div className="flex items-center mt-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Tamamlandı
            </div>
          )}
        </div>

        {/* User timestamp */}
        {isUser && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Thinking steps if present */}
        {thinkingSteps.length > 0 && (
          <div className="mt-3">
            <ThinkingIndicator steps={thinkingSteps} isActive={false} />
          </div>
        )}

        {/* Tool calls (new collapsible display) */}
        {hasTools && (
          <div className="mt-3 space-y-2">
            {toolCalls.map((toolCall) => (
              <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};