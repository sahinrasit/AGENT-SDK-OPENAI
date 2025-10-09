import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { Message, ChatSession, AgentType, AgentResponse, ToolCall } from '../types/agent';
import { useChatPersistence } from './useChatPersistence';
import { sessionsApi } from '../api/sessions';

interface UseChatOptions {
  sessionId?: string;
  agentType: AgentType;
  autoConnect?: boolean;
}

interface PendingApproval {
  id: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
}

export const useChat = (options: UseChatOptions) => {
  const { sessionId: initialSessionId, agentType, autoConnect = true } = options;

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  // Chat persistence hook
  const { saveSession, loadSession } = useChatPersistence();

  // Track which session we've joined to prevent infinite loops
  const joinedSessionRef = useRef<string | null>(null);

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

  // Join session after it's loaded from database
  useEffect(() => {
    if (!isConnected || !session || !initialSessionId) return;

    // Only join if session matches the initialSessionId AND we haven't already joined it
    if (session.id === initialSessionId && joinedSessionRef.current !== initialSessionId) {
      console.log('🔗 Joining session:', initialSessionId);
      joinedSessionRef.current = initialSessionId;
      emit('session:join', { sessionId: initialSessionId, agentType: session.agentType });
    }
  }, [isConnected, session, initialSessionId, emit]);

  // Reset joined session ref when sessionId changes
  useEffect(() => {
    joinedSessionRef.current = null;
  }, [initialSessionId]);

  // Load session and messages from database when sessionId changes
  useEffect(() => {
    if (!initialSessionId) {
      setSession(null);
      setMessages([]);
      return;
    }

    const loadSessionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load session metadata from database
        const sessionResponse = await sessionsApi.get(initialSessionId);
        const sessionData = sessionResponse.data;

        // Load messages from database
        const messagesResponse = await sessionsApi.getMessages(initialSessionId);
        const loadedMessages = messagesResponse.data;

        // Create session object
        const loadedSession: ChatSession = {
          id: sessionData.id,
          userId: sessionData.user_id,
          agentType: sessionData.agent_type as AgentType,
          title: sessionData.title,
          status: sessionData.status,
          createdAt: new Date(sessionData.created_at),
          updatedAt: new Date(sessionData.updated_at),
          lastActivity: new Date(sessionData.last_activity),
          metadata: sessionData.metadata || {},
          messages: loadedMessages
        };

        setSession(loadedSession);
        setMessages(loadedMessages);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Oturum yüklenemedi');
        setIsLoading(false);
      }
    };

    loadSessionData();
  }, [initialSessionId]);

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
      isStart?: boolean;
      error?: string;
      toolCalls?: ToolCall[];
    }) => {
      const { messageId, chunk, isComplete, isStart, error, toolCalls } = data;

      // Ensure chunk is a string
      const chunkText = typeof chunk === 'string' ? chunk : String(chunk || '');

      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === messageId);

        if (existingIndex >= 0) {
          // Update existing message with new chunk - REAL-TIME UPDATE
          const updated = [...prev];
          const currentContent = updated[existingIndex].content;

          updated[existingIndex] = {
            ...updated[existingIndex],
            content: currentContent + chunkText, // Append each chunk immediately
            isStreaming: !isComplete,
            // Add toolCalls when stream completes
            ...(isComplete && toolCalls ? { toolCalls } : {})
          };
          return updated;
        } else if (isStart || chunkText) {
          // Create new streaming message (Cursor-like: show empty message then fill)
          const newMessage: Message = {
            id: messageId,
            type: 'agent',
            content: chunkText, // Start with first chunk
            timestamp: new Date(),
            agentType,
            isStreaming: !isComplete,
            ...(isComplete && toolCalls ? { toolCalls } : {})
          };
          return [...prev, newMessage];
        }

        return prev;
      });

      if (isComplete) {
        // Remove thinking indicator
        setMessages(prev => prev.filter(m => m.type !== 'thinking' || m.id !== messageId));
        setStreamingMessageId(null);
        setIsLoading(false);

        if (error) {
          console.error('❌ Streaming error:', error);
          setError(`Streaming hatası: ${error}`);
        }
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

    const handleToolCallComplete = (data: { messageId: string; toolCall: Partial<ToolCall> }) => {
      const { messageId, toolCall } = data;

      setMessages(prev => {
        const updated = [...prev];
        const messageIndex = updated.findIndex(m => m.id === messageId);

        if (messageIndex >= 0) {
          const toolCalls = updated[messageIndex].toolCalls || [];
          const toolCallIndex = toolCalls.findIndex(tc => tc.id === toolCall.id);

          if (toolCallIndex >= 0) {
            // Merge tool call data (keep existing data, add new result)
            toolCalls[toolCallIndex] = {
              ...toolCalls[toolCallIndex],
              ...toolCall,
              status: 'completed',
              endTime: toolCall.endTime || new Date()
            };
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

    const handleToolApprovalRequest = (data: {
      approvalId: string;
      toolName: string;
      parameters: any;
    }) => {
      setPendingApprovals(prev => [
        ...prev,
        {
          id: data.approvalId,
          toolName: data.toolName,
          parameters: data.parameters,
          timestamp: new Date()
        }
      ]);
    };

    const handleToolApprovalConfirmed = (data: {
      approvalId: string;
      approved: boolean;
      toolName: string;
    }) => {
      setPendingApprovals(prev => prev.filter(a => a.id !== data.approvalId));
    };

    // Register event listeners
    on('session:created', handleSessionCreated);
    on('message:received', handleMessageReceived);
    on('message:streaming', handleMessageStreaming);
    on('agent:thinking', handleAgentThinking);
    on('tool:call:start', handleToolCallStart);
    on('tool:call:complete', handleToolCallComplete);
    on('tool:approval:request', handleToolApprovalRequest);
    on('tool:approval:confirmed', handleToolApprovalConfirmed);
    on('error', handleError);

    // Cleanup
    return () => {
      off('session:created', handleSessionCreated);
      off('message:received', handleMessageReceived);
      off('message:streaming', handleMessageStreaming);
      off('agent:thinking', handleAgentThinking);
      off('tool:call:start', handleToolCallStart);
      off('tool:call:complete', handleToolCallComplete);
      off('tool:approval:request', handleToolApprovalRequest);
      off('tool:approval:confirmed', handleToolApprovalConfirmed);
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

    // Send to server with streaming ALWAYS enabled (Cursor experience)
    emit('agent:message', {
      message: content,
      agentType,
      sessionId: session.id,
      stream: true // Always stream for real-time response
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

  const approveToolCall = useCallback((approvalId: string) => {
    if (!session) return;

    emit('tool:approval:response', {
      sessionId: session.id,
      approvalId,
      approved: true
    });
  }, [session, emit]);

  const rejectToolCall = useCallback((approvalId: string) => {
    if (!session) return;

    emit('tool:approval:response', {
      sessionId: session.id,
      approvalId,
      approved: false
    });
  }, [session, emit]);

  return {
    // Session state
    session: session ? { ...session, messages } : null,
    messages,
    isLoading,
    streamingMessageId,
    error: error || connectionError,
    isConnected,
    pendingApprovals,

    // Actions
    sendMessage,
    stopGeneration,
    clearMessages,
    retryLastMessage,
    approveToolCall,
    rejectToolCall
  };
};