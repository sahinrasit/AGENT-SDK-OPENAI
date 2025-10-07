import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, AgentType, ChatSession } from '../../types/agent';
import { Bot, Users, Settings, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface ChatInterfaceProps {
  session: ChatSession;
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isConnected?: boolean;
  isLoading?: boolean;
  streamingMessageId?: string;
}

const getAgentInfo = (agentType: AgentType) => {
  switch (agentType) {
    case 'planner':
      return {
        name: 'Research Planner',
        description: 'Creates research strategies and search plans',
        color: 'purple'
      };
    case 'search':
      return {
        name: 'Search Specialist',
        description: 'Gathers and synthesizes information',
        color: 'cyan'
      };
    case 'writer':
      return {
        name: 'Report Writer',
        description: 'Creates comprehensive reports and documentation',
        color: 'green'
      };
    case 'triage':
      return {
        name: 'Triage Agent',
        description: 'Routes requests to specialized agents',
        color: 'blue'
      };
    case 'customer-service':
      return {
        name: 'Customer Service',
        description: 'Handles customer inquiries and support',
        color: 'indigo'
      };
    default:
      return {
        name: 'Assistant',
        description: 'General purpose AI assistant',
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
  streamingMessageId
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
                {isConnected ? 'Connected' : 'Disconnected'}
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
              Start a conversation with {agentInfo.name}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {agentInfo.description}. Ask me anything and I'll help you get started.
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
        "Help me create a research plan for artificial intelligence trends",
        "What's the best approach to research competitive analysis?",
        "Plan a comprehensive study on renewable energy technologies"
      ];
    case 'search':
      return [
        "Search for the latest developments in quantum computing",
        "Find information about sustainable business practices",
        "Research current trends in remote work technology"
      ];
    case 'writer':
      return [
        "Write a comprehensive report on digital transformation",
        "Create an executive summary of market research findings",
        "Draft a technical documentation for our new API"
      ];
    case 'triage':
      return [
        "I need help with a complex research project",
        "Can you analyze some business data for me?",
        "I want to create a detailed report on market trends"
      ];
    case 'customer-service':
      return [
        "I have a question about my billing",
        "I'm experiencing technical issues",
        "Can you help me understand your services?"
      ];
    default:
      return [
        "How can you help me today?",
        "What are your capabilities?",
        "Tell me about your features"
      ];
  }
}