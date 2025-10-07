import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { Message, ChatSession, AgentType, AgentResponse, ToolCall } from '../types/agent';
import { useChatPersistence } from './useChatPersistence';

interface UseChatOptions {
  sessionId?: string;
  agentType: AgentType;
  autoConnect?: boolean;
}

export const useChat = (options: UseChatOptions) => {
  const { sessionId: initialSessionId, agentType, autoConnect = true } = options;

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat persistence hook
  const { saveSession, loadSession } = useChatPersistence();

  const {
    isConnected,
    connectionError,
    emit,
    on,
    off
  } = useSocket({
    autoConnect,
    onConnect: () => {
      console.log('Socket connected');
      setError(null);
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
      setIsLoading(false);
      setStreamingMessageId(null);
    },
    onError: (error) => {
      console.error('Socket error:', error);
      setError('Connection error');
      setIsLoading(false);
    }
  });

  // Initialize or join session
  useEffect(() => {
    if (!isConnected) return;

    if (initialSessionId) {
      // Join existing session
      emit('session:join', { sessionId: initialSessionId });
    } else {
      // Create new session
      emit('session:create', { agentType });
    }
  }, [isConnected, initialSessionId, agentType]);

  // Load session from localStorage on mount
  useEffect(() => {
    if (initialSessionId) {
      const loaded = loadSession(initialSessionId);
      if (loaded) {
        setSession(loaded);
        setMessages(loaded.messages);
      }
    }
  }, [initialSessionId, loadSession]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session && messages.length > 0) {
      const updatedSession = {
        ...session,
        messages,
        lastActivity: new Date()
      };
      saveSession(updatedSession);
    }
  }, [session, messages, saveSession]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleSessionCreated = (newSession: ChatSession) => {
      setSession(newSession);
      setMessages(newSession.messages);
    };

    const handleMessageReceived = (message: Message) => {
      // Console log for debugging
      console.log('📨 Received message:', message);
      console.log('Content type:', typeof message.content);
      console.log('Content value:', message.content);
      
      // Ensure timestamp is a Date object and content is a string
      let contentText = '';
      if (typeof message.content === 'string') {
        contentText = message.content;
      } else if (typeof message.content === 'object' && message.content !== null) {
        // Try to extract text from object
        const contentObj = message.content as any;
        contentText = contentObj.text || contentObj.content || contentObj.output || JSON.stringify(message.content, null, 2);
      } else {
        contentText = String(message.content || '');
      }
      
      const processedMessage = {
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
        content: contentText
      };
      
      console.log('✅ Processed message content:', processedMessage.content);
      
      setMessages(prev => [...prev, processedMessage]);
      setIsLoading(false);
      setStreamingMessageId(null);
    };

    const handleMessageStreaming = (data: {
      messageId: string;
      chunk: string;
      isComplete: boolean;
    }) => {
      const { messageId, chunk, isComplete } = data;

      console.log('🌊 Streaming chunk:', { messageId, chunk: chunk.substring(0, 50), isComplete });

      // Ensure chunk is a string
      const chunkText = typeof chunk === 'string' ? chunk : String(chunk || '');

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);

        if (existingIndex >= 0) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: updated[existingIndex].content + chunkText,
            isStreaming: !isComplete
          };
          return updated;
        } else {
          // Create new streaming message
          const newMessage: Message = {
            id: messageId,
            type: 'agent',
            content: chunkText,
            timestamp: new Date(),
            agentType,
            isStreaming: !isComplete
          };
          return [...prev, newMessage];
        }
      });

      if (isComplete) {
        setStreamingMessageId(null);
        setIsLoading(false);
      } else {
        setStreamingMessageId(messageId);
      }
    };

    const handleAgentThinking = (data: { messageId: string; step: string }) => {
      const { messageId, step } = data;

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);

        if (existingIndex >= 0) {
          // Add thinking step to existing thinking message
          const updated = [...prev];
          const thinkingSteps = updated[existingIndex].thinkingSteps || [];
          updated[existingIndex] = {
            ...updated[existingIndex],
            thinkingSteps: [...thinkingSteps, step]
          };
          return updated;
        } else {
          // Create new thinking message
          const thinkingMessage: Message = {
            id: messageId,
            type: 'thinking',
            content: '',
            timestamp: new Date(),
            agentType,
            thinkingSteps: [step],
            isStreaming: true
          };
          return [...prev, thinkingMessage];
        }
      });
    };

    const handleToolCallStart = (data: { messageId: string; toolCall: ToolCall }) => {
      const { messageId, toolCall } = data;

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);

        if (existingIndex >= 0) {
          // Add tool call to existing message
          const updated = [...prev];
          const toolCalls = updated[existingIndex].toolCalls || [];
          updated[existingIndex] = {
            ...updated[existingIndex],
            toolCalls: [...toolCalls, toolCall]
          };
          return updated;
        } else {
          // Create message with tool call
          const newMessage: Message = {
            id: messageId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            agentType,
            toolCalls: [toolCall],
            isStreaming: true
          };
          return [...prev, newMessage];
        }
      });
    };

    const handleToolCallComplete = (data: { messageId: string; toolCall: ToolCall }) => {
      const { messageId, toolCall } = data;

      setMessages(prev => {
        const updated = [...prev];
        const messageIndex = updated.findIndex(m => m.id === messageId);

        if (messageIndex >= 0) {
          const toolCalls = updated[messageIndex].toolCalls || [];
          const toolCallIndex = toolCalls.findIndex(tc => tc.id === toolCall.id);

          if (toolCallIndex >= 0) {
            // Update existing tool call
            toolCalls[toolCallIndex] = toolCall;
            updated[messageIndex] = {
              ...updated[messageIndex],
              toolCalls: [...toolCalls]
            };
          }
        }

        return updated;
      });
    };

    const handleError = (error: { message: string; code?: string }) => {
      setError(error.message);
      setIsLoading(false);
      setStreamingMessageId(null);
    };

    // Register event listeners
    on('session:created', handleSessionCreated);
    on('message:received', handleMessageReceived);
    on('message:streaming', handleMessageStreaming);
    on('agent:thinking', handleAgentThinking);
    on('tool:call:start', handleToolCallStart);
    on('tool:call:complete', handleToolCallComplete);
    on('error', handleError);

    // Cleanup
    return () => {
      off('session:created', handleSessionCreated);
      off('message:received', handleMessageReceived);
      off('message:streaming', handleMessageStreaming);
      off('agent:thinking', handleAgentThinking);
      off('tool:call:start', handleToolCallStart);
      off('tool:call:complete', handleToolCallComplete);
      off('error', handleError);
    };
  }, [isConnected, agentType, on, off]);

  const sendMessage = useCallback((content: string) => {
    if (!isConnected || !session || isLoading) {
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Send to server
    emit('agent:message', {
      message: content,
      agentType,
      sessionId: session.id
    });
  }, [isConnected, session, isLoading, agentType, emit]);

  const stopGeneration = useCallback(() => {
    if (streamingMessageId) {
      // TODO: Implement stop generation
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  }, [streamingMessageId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setStreamingMessageId(null);
  }, []);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages
      .filter(m => m.type === 'user')
      .pop();

    if (lastUserMessage) {
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  return {
    // Session state
    session: session ? { ...session, messages } : null,
    messages,
    isLoading,
    streamingMessageId,
    error: error || connectionError,
    isConnected,

    // Actions
    sendMessage,
    stopGeneration,
    clearMessages,
    retryLastMessage
  };
};