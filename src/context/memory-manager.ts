import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Context schemas
const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'agent', 'system']),
  content: z.string(),
  timestamp: z.date(),
  agentName: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  toolCalls: z.array(z.object({
    toolName: z.string(),
    parameters: z.record(z.any()),
    result: z.any().optional()
  })).optional()
});

const conversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  startTime: z.date(),
  lastActivity: z.date(),
  messages: z.array(conversationMessageSchema),
  context: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional()
});

const memoryEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['fact', 'preference', 'relationship', 'context', 'skill']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type MemoryEntry = z.infer<typeof memoryEntrySchema>;

export interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  messages: ConversationMessage[];
  priorityScore: number;
}

export interface MemorySearchOptions {
  query: string;
  type?: MemoryEntry['type'];
  limit?: number;
  minConfidence?: number;
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export class MemoryManager {
  private conversations: Map<string, Conversation> = new Map();
  private memories: Map<string, MemoryEntry> = new Map();
  private contextWindows: Map<string, ContextWindow> = new Map();

  // Memory management settings
  private readonly MAX_CONVERSATIONS = 1000;
  private readonly MAX_MEMORIES = 10000;
  private readonly MAX_CONTEXT_TOKENS = 32000;
  private readonly MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  // Conversation summarization thresholds
  private readonly SUMMARIZE_AFTER_MESSAGES = 50;
  private readonly COMPRESS_AFTER_TOKENS = 16000;

  constructor() {
    this.startMemoryCleanup();
    logger.info('🧠 Memory Manager initialized');
  }

  /**
   * Create or update conversation
   */
  async createConversation(
    userId: string,
    title?: string,
    initialMessage?: string
  ): Promise<string> {
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const conversation: Conversation = {
      id: conversationId,
      userId,
      title: title || 'New Conversation',
      startTime: new Date(),
      lastActivity: new Date(),
      messages: [],
      context: {},
      tags: []
    };

    if (initialMessage) {
      conversation.messages.push({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      });
    }

    this.conversations.set(conversationId, conversation);

    // Initialize context window
    this.contextWindows.set(conversationId, {
      maxTokens: this.MAX_CONTEXT_TOKENS,
      currentTokens: 0,
      messages: [],
      priorityScore: 1.0
    });

    logger.info(`💬 Created conversation: ${conversationId} for user: ${userId}`);
    return conversationId;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: ConversationMessage['role'],
    content: string,
    agentName?: string,
    toolCalls?: ConversationMessage['toolCalls'],
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      agentName,
      toolCalls,
      metadata
    };

    conversation.messages.push(message);
    conversation.lastActivity = new Date();

    // Update context window
    await this.updateContextWindow(conversationId, message);

    // Check if conversation needs summarization
    if (conversation.messages.length >= this.SUMMARIZE_AFTER_MESSAGES) {
      await this.summarizeConversation(conversationId);
    }

    // Extract and store memories from message
    await this.extractMemories(message, conversation.userId);

    logger.debug(`📝 Added message to conversation: ${conversationId}`);
    return message;
  }

  /**
   * Get conversation with context management
   */
  async getConversation(
    conversationId: string,
    includeContext = true
  ): Promise<Conversation | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    if (includeContext) {
      // Add relevant context from memories
      const contextMemories = await this.searchMemories({
        query: conversation.title || 'general',
        limit: 10,
        minConfidence: 0.7
      });

      conversation.context = {
        ...conversation.context,
        relevantMemories: contextMemories,
        lastUpdated: new Date()
      };
    }

    return { ...conversation };
  }

  /**
   * Get optimized context window for agent
   */
  async getContextWindow(conversationId: string): Promise<ContextWindow | null> {
    const contextWindow = this.contextWindows.get(conversationId);
    if (!contextWindow) {
      return null;
    }

    return { ...contextWindow };
  }

  /**
   * Update context window with token management
   */
  private async updateContextWindow(
    conversationId: string,
    newMessage: ConversationMessage
  ): Promise<void> {
    const contextWindow = this.contextWindows.get(conversationId);
    if (!contextWindow) {
      return;
    }

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const messageTokens = Math.ceil(newMessage.content.length / 4);

    contextWindow.messages.push(newMessage);
    contextWindow.currentTokens += messageTokens;

    // Compress context if needed
    if (contextWindow.currentTokens > this.COMPRESS_AFTER_TOKENS) {
      await this.compressContextWindow(conversationId);
    }

    this.contextWindows.set(conversationId, contextWindow);
  }

  /**
   * Compress context window by removing older, less relevant messages
   */
  private async compressContextWindow(conversationId: string): Promise<void> {
    const contextWindow = this.contextWindows.get(conversationId);
    if (!contextWindow) {
      return;
    }

    // Keep recent messages and high-priority messages
    const recentMessages = contextWindow.messages.slice(-20); // Last 20 messages
    const priorityMessages = contextWindow.messages.filter(msg =>
      msg.toolCalls?.length ||
      msg.role === 'system' ||
      msg.content.length > 500 // Longer messages often contain important info
    );

    // Combine and deduplicate
    const keptMessages = [...new Set([...priorityMessages, ...recentMessages])];

    // Recalculate tokens
    const newTokenCount = keptMessages.reduce((total, msg) =>
      total + Math.ceil(msg.content.length / 4), 0
    );

    contextWindow.messages = keptMessages;
    contextWindow.currentTokens = newTokenCount;

    logger.info(`🗜️ Compressed context window for ${conversationId}: ${keptMessages.length} messages, ${newTokenCount} tokens`);
  }

  /**
   * Summarize conversation for long-term storage
   */
  private async summarizeConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.summary) {
      return; // Already summarized
    }

    // Create summary from messages
    const recentMessages = conversation.messages.slice(-20);
    const messageTexts = recentMessages.map(msg =>
      `${msg.role}: ${msg.content.substring(0, 200)}...`
    ).join('\n');

    // Simple extractive summary (in production, use LLM)
    const summary = `Conversation started ${conversation.startTime.toLocaleDateString()}. Recent topics: ${messageTexts.substring(0, 500)}...`;

    conversation.summary = summary;

    logger.info(`📋 Summarized conversation: ${conversationId}`);
  }

  /**
   * Extract memories from conversation messages
   */
  private async extractMemories(
    message: ConversationMessage,
    userId: string
  ): Promise<void> {
    // Extract facts, preferences, and context from messages
    const memories: Omit<MemoryEntry, 'id'>[] = [];

    // Ensure content is a string
    const contentStr = typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content);
    
    // Simple keyword-based extraction (in production, use NLP/LLM)
    const content = contentStr.toLowerCase();

    // Extract preferences
    if (content.includes('like') || content.includes('prefer') || content.includes('favorite')) {
      memories.push({
        type: 'preference',
        content: contentStr,
        confidence: 0.8,
        source: `conversation-${message.id}`,
        timestamp: message.timestamp,
        tags: ['user-preference'],
        metadata: { userId, messageId: message.id }
      });
    }

    // Extract facts
    if (content.includes('is') || content.includes('are') || content.includes('was')) {
      memories.push({
        type: 'fact',
        content: contentStr,
        confidence: 0.6,
        source: `conversation-${message.id}`,
        timestamp: message.timestamp,
        tags: ['fact'],
        metadata: { userId, messageId: message.id }
      });
    }

    // Extract context about tools used
    if (message.toolCalls?.length) {
      memories.push({
        type: 'context',
        content: `User successfully used tools: ${message.toolCalls.map(tc => tc.toolName).join(', ')}`,
        confidence: 0.9,
        source: `tool-usage-${message.id}`,
        timestamp: message.timestamp,
        tags: ['tool-usage', 'context'],
        metadata: { userId, messageId: message.id, toolCalls: message.toolCalls }
      });
    }

    // Store memories
    for (const memory of memories) {
      await this.addMemory(memory);
    }
  }

  /**
   * Add memory entry
   */
  async addMemory(memory: Omit<MemoryEntry, 'id'>): Promise<string> {
    const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const memoryEntry: MemoryEntry = {
      ...memory,
      id: memoryId
    };

    this.memories.set(memoryId, memoryEntry);

    // Cleanup old memories if needed
    if (this.memories.size > this.MAX_MEMORIES) {
      await this.cleanupOldMemories();
    }

    logger.debug(`🧠 Added memory: ${memory.type} - ${memory.content.substring(0, 50)}...`);
    return memoryId;
  }

  /**
   * Search memories
   */
  async searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const {
      query,
      type,
      limit = 10,
      minConfidence = 0.5,
      tags,
      timeRange
    } = options;

    let results = Array.from(this.memories.values());

    // Filter by type
    if (type) {
      results = results.filter(memory => memory.type === type);
    }

    // Filter by confidence
    results = results.filter(memory => memory.confidence >= minConfidence);

    // Filter by tags
    if (tags?.length) {
      results = results.filter(memory =>
        tags.some(tag => memory.tags?.includes(tag))
      );
    }

    // Filter by time range
    if (timeRange) {
      results = results.filter(memory =>
        memory.timestamp >= timeRange.start && memory.timestamp <= timeRange.end
      );
    }

    // Simple text matching (in production, use vector search)
    const queryLower = query.toLowerCase();
    results = results.filter(memory =>
      memory.content.toLowerCase().includes(queryLower) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))
    );

    // Sort by confidence and recency
    results.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + (a.timestamp.getTime() / Date.now()) * 0.3;
      const scoreB = b.confidence * 0.7 + (b.timestamp.getTime() / Date.now()) * 0.3;
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * Get user conversations
   */
  async getUserConversations(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Conversation[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(offset, offset + limit);

    return userConversations;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const deleted = this.conversations.delete(conversationId);
    this.contextWindows.delete(conversationId);

    if (deleted) {
      logger.info(`🗑️ Deleted conversation: ${conversationId}`);
    }

    return deleted;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalConversations: number;
    totalMemories: number;
    memoryByType: Record<string, number>;
    averageConfidence: number;
    contextWindowsActive: number;
  } {
    const memoryByType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const memory of this.memories.values()) {
      memoryByType[memory.type] = (memoryByType[memory.type] || 0) + 1;
      totalConfidence += memory.confidence;
    }

    return {
      totalConversations: this.conversations.size,
      totalMemories: this.memories.size,
      memoryByType,
      averageConfidence: this.memories.size > 0 ? totalConfidence / this.memories.size : 0,
      contextWindowsActive: this.contextWindows.size
    };
  }

  /**
   * Cleanup expired memories and old conversations
   */
  private async cleanupOldMemories(): Promise<void> {
    const now = new Date();
    let deletedMemories = 0;
    let deletedConversations = 0;

    // Remove expired memories
    for (const [id, memory] of this.memories.entries()) {
      if (memory.expiresAt && memory.expiresAt < now) {
        this.memories.delete(id);
        deletedMemories++;
      }
    }

    // Remove old conversations if over limit
    if (this.conversations.size > this.MAX_CONVERSATIONS) {
      const conversationArray = Array.from(this.conversations.entries())
        .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());

      const toDelete = conversationArray.slice(0, this.conversations.size - this.MAX_CONVERSATIONS);

      for (const [id] of toDelete) {
        this.conversations.delete(id);
        this.contextWindows.delete(id);
        deletedConversations++;
      }
    }

    if (deletedMemories > 0 || deletedConversations > 0) {
      logger.info(`🧹 Memory cleanup: ${deletedMemories} memories, ${deletedConversations} conversations deleted`);
    }
  }

  /**
   * Start periodic memory cleanup
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanupOldMemories();
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  /**
   * Export conversation data
   */
  async exportConversation(conversationId: string): Promise<any> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    return {
      conversation,
      contextWindow: this.contextWindows.get(conversationId),
      relatedMemories: await this.searchMemories({
        query: conversation.title || 'general',
        limit: 50
      })
    };
  }

  /**
   * Import conversation data
   */
  async importConversation(data: any): Promise<string | null> {
    try {
      const conversation = conversationSchema.parse(data.conversation);
      this.conversations.set(conversation.id, conversation);

      if (data.contextWindow) {
        this.contextWindows.set(conversation.id, data.contextWindow);
      }

      if (data.relatedMemories) {
        for (const memory of data.relatedMemories) {
          this.memories.set(memory.id, memory);
        }
      }

      logger.info(`📥 Imported conversation: ${conversation.id}`);
      return conversation.id;
    } catch (error) {
      logger.error('Failed to import conversation:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();