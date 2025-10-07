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
  switch (agentType) {
    case 'planner':
      return <Bot className="w-4 h-4 text-purple-600" />;
    case 'search':
      return <Bot className="w-4 h-4 text-cyan-600" />;
    case 'writer':
      return <Bot className="w-4 h-4 text-green-600" />;
    case 'triage':
      return <Bot className="w-4 h-4 text-blue-600" />;
    default:
      return <Bot className="w-4 h-4 text-gray-600" />;
  }
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
      'flex gap-4 mb-6 max-w-4xl',
      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
    )}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-600'
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          getAgentIcon(message.agentType)
        )}
      </div>

      {/* Message content */}
      <div className={clsx(
        'flex-1 max-w-[70%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        {/* Agent name and timestamp */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-medium text-sm text-gray-700">
              {message.agentName || 'Assistant'}
            </span>
            {message.agentType && (
              <span className={clsx(
                'badge text-xs',
                message.agentType === 'planner' && 'badge-info',
                message.agentType === 'search' && 'badge-info',
                message.agentType === 'writer' && 'badge-success',
                message.agentType === 'triage' && 'badge-warning'
              )}>
                {message.agentType}
              </span>
            )}
            {hasTools && (
              <span className="badge text-xs badge-success flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''}
              </span>
            )}
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className={clsx(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'message-user'
            : `message-agent ${getAgentStyles(message.agentType)}`,
          isStreaming && 'animate-pulse-slow'
        )}>
          {isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className={clsx(
              'prose prose-sm max-w-none',
              isUser ? 'prose-invert' : 'prose-gray'
            )}>
              <p className="mb-0 whitespace-pre-wrap">
                {typeof message.content === 'string' 
                  ? message.content 
                  : JSON.stringify(message.content, null, 2)}
              </p>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && message.content && (
            <div className="flex items-center mt-2 text-xs opacity-70">
              <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-2"></div>
              Streaming...
            </div>
          )}

          {/* Completion indicator */}
          {!isStreaming && !isUser && message.content && (
            <div className="flex items-center mt-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
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