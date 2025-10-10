import React, { useState } from 'react';
import { Bot, User, Clock, CheckCircle, AlertCircle, Wrench, Copy, Check } from 'lucide-react';
import { Message, AgentType } from '../../types/agent';
import { clsx } from 'clsx';
import { ToolCallDisplay } from './ToolCallDisplay';
import { ThinkingIndicator } from './ThinkingIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

const CodeBlock: React.FC<{ code: string; language?: string; isUser: boolean }> = ({ code, language, isUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      <div className="absolute right-2 top-2 z-50">
        <button
          onClick={handleCopy}
          className={clsx(
            "p-2 rounded transition-all",
            copied
              ? "bg-green-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-white opacity-80 hover:opacity-100"
          )}
          title={copied ? "Kopyalandı!" : "Kodu kopyala"}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          padding: '1rem',
          paddingRight: '3.5rem',
        }}
        showLineNumbers={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

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
            <div className={clsx(
              "prose prose-sm max-w-none markdown-content",
              isUser ? "prose-invert" : ""
            )}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // Custom renderers for better styling
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline) {
                      return <CodeBlock code={codeString} language={match?.[1]} isUser={isUser} />;
                    }

                    return (
                      <code className={clsx(
                        "px-1.5 py-0.5 rounded text-sm font-mono",
                        isUser ? "bg-white/20" : "bg-gray-100 text-pink-600"
                      )} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        "underline hover:no-underline",
                        isUser ? "text-white" : "text-blue-600"
                      )}
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className={clsx(
                      "border-l-4 pl-4 italic my-2",
                      isUser ? "border-white/30" : "border-gray-300"
                    )}>
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border-collapse border border-gray-300">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 px-3 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {typeof message.content === 'string'
                  ? message.content
                  : JSON.stringify(message.content, null, 2)}
              </ReactMarkdown>
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