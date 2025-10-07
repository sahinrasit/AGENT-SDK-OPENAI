import { Agent, run } from '@openai/agents';
import { logger } from '../utils/logger.js';
import { memoryManager, type Conversation, type MemoryEntry } from './memory-manager.js';
import { guardrailSystem } from '../guardrails/validation.js';
import { humanApprovalWorkflow } from '../workflows/human-approval.js';

export interface ContextAwareAgentConfig {
  name: string;
  instructions: string;
  model: string;
  userId: string;
  conversationId?: string;
  maxContextTokens?: number;
  memoryEnabled?: boolean;
  guardrailsEnabled?: boolean;
  approvalRequired?: boolean;
  mcpServers?: any[]; // MCP servers to attach
  tools?: any[]; // Additional tools
}

export interface AgentResponse {
  content: string;
  conversationId: string;
  messageId: string;
  toolCalls?: Array<{
    toolName: string;
    parameters: any;
    result?: any;
  }>;
  memories?: MemoryEntry[];
  guardrailWarnings?: string[];
  approvalRequired?: boolean;
  metadata?: Record<string, any>;
}

export class ContextAwareAgent {
  private agent: Agent;
  private config: ContextAwareAgentConfig;
  private conversationId: string;

  constructor(config: ContextAwareAgentConfig) {
    this.config = config;
    this.conversationId = config.conversationId || '';

    // Build context-aware instructions
    const enhancedInstructions = this.buildContextAwareInstructions(config.instructions);

    this.agent = new Agent({
      name: config.name,
      instructions: enhancedInstructions,
      model: config.model,
      mcpServers: config.mcpServers || [],
      tools: config.tools || [],
    });

    logger.info(`🤖 Created context-aware agent: ${config.name} for user: ${config.userId}`);
  }

  /**
   * Process user input with full context awareness
   */
  async processInput(
    input: string,
    options: {
      stream?: boolean;
      includeMemory?: boolean;
      bypassApproval?: boolean;
    } = {}
  ): Promise<AgentResponse> {
    const {
      stream = false,
      includeMemory = true,
      bypassApproval = false
    } = options;

    try {
      // Validate input with guardrails
      if (this.config.guardrailsEnabled) {
        const validation = await guardrailSystem.validateUserInput(input, this.config.userId);
        if (!validation.valid) {
          throw new Error(`Input blocked by guardrails: ${validation.reason}`);
        }
        if (validation.sanitized) {
          // Extract content from sanitized object if it's an object
          const sanitizedInput = typeof validation.sanitized === 'object' && 'content' in validation.sanitized
            ? validation.sanitized.content
            : validation.sanitized;
          if (sanitizedInput !== input) {
            input = sanitizedInput;
            logger.warn(`🛡️ Input sanitized for user: ${this.config.userId}`);
          }
        }
      }

      // Initialize conversation if needed
      if (!this.conversationId) {
        this.conversationId = await memoryManager.createConversation(
          this.config.userId,
          `Chat with ${this.config.name}`,
          input
        );
      }

      // Get conversation context
      const conversation = await memoryManager.getConversation(this.conversationId, includeMemory);
      if (!conversation) {
        throw new Error('Failed to retrieve conversation context');
      }

      // Build context-enhanced prompt
      const contextEnhancedInput = await this.buildContextEnhancedPrompt(input, conversation);

      // Check if approval is required
      if (this.config.approvalRequired && !bypassApproval) {
        const approvalResult = await humanApprovalWorkflow.requestApproval({
          type: 'tool_execution',
          agentName: this.config.name,
          operation: 'process_user_input',
          description: `Process user input: ${input.substring(0, 100)}...`,
          context: { input, userId: this.config.userId },
          sensitivity: 'medium',
          timeout: 30000,
          requiredApprovers: 1
        });

        if (!approvalResult.approved) {
          throw new Error(`Operation not approved: ${approvalResult.reason}`);
        }
      }

      // Execute agent with context
      const result = await run(this.agent, contextEnhancedInput, { stream: stream as any });

      // Extract tool calls if any
      const toolCalls = this.extractToolCalls(result);

      // Extract text content from result - improved extraction logic
      console.log('🔍 [Context Agent] Result type:', typeof result);
      console.log('🔍 [Context Agent] Result keys:', result ? Object.keys(result) : 'null');
      
      let textContent = '';
      
      // IMPORTANT: Convert to plain object via JSON to handle Proxy/getter objects
      let resultObj: any;
      try {
        resultObj = JSON.parse(JSON.stringify(result));
        console.log('✅ [Context Agent] Converted result to plain object via JSON');
      } catch (e) {
        resultObj = result;
        console.log('⚠️ [Context Agent] Could not stringify result, using as-is');
      }
      
      try {
        if (typeof result === 'string') {
          textContent = result;
          console.log('✅ [Context Agent] Found as string');
        } 
        // Try to extract from various possible locations
        else if (resultObj) {
          // Log full structure for debugging (limited to 3000 chars to see more)
          console.log('🔍 [Context Agent] Full Result structure:', JSON.stringify(resultObj, null, 2).substring(0, 3000));
          
          // DEBUG: Check what we have
          console.log('🔍 [Context Agent] DEBUG - Has state?:', !!resultObj.state);
          console.log('🔍 [Context Agent] DEBUG - Has modelResponses?:', !!resultObj.state?.modelResponses);
          console.log('🔍 [Context Agent] DEBUG - Is array?:', Array.isArray(resultObj.state?.modelResponses));
          
          // Method 1: state.modelResponses[].output[].content[] (OpenAI Agents SDK newest format)
          if (resultObj.state?.modelResponses && Array.isArray(resultObj.state.modelResponses)) {
            console.log('✅ [Context Agent] Checking state.modelResponses...');
            for (const response of resultObj.state.modelResponses) {
              if (response.output && Array.isArray(response.output)) {
                for (const outputItem of response.output) {
                  console.log('🔍 [Context Agent] Output item type:', outputItem.type);
                  if (outputItem.type === 'message' && Array.isArray(outputItem.content)) {
                    // Message type with content array
                    for (const contentItem of outputItem.content) {
                      console.log('🔍 [Context Agent] Content item type:', contentItem.type);
                      if (contentItem.type === 'output_text' && contentItem.text) {
                        textContent += contentItem.text;
                      } else if (contentItem.type === 'text' && contentItem.text) {
                        textContent += contentItem.text;
                      } else if (typeof contentItem === 'string') {
                        textContent += contentItem;
                      }
                    }
                  } else if (outputItem.type === 'text' && outputItem.text) {
                    textContent += outputItem.text;
                  } else if (outputItem.text) {
                    textContent += String(outputItem.text);
                  }
                }
              }
            }
            if (textContent) {
              console.log('✅ [Context Agent] Found in state.modelResponses[].output[].content[]');
            }
          }
          
          // Method 2: state.currentStep.output (OpenAI Agents SDK v1 format)
          if (!textContent && resultObj.state?.currentStep?.output) {
            textContent = String(resultObj.state.currentStep.output);
            console.log('✅ [Context Agent] Found in state.currentStep.output');
          }
          // Method 3: currentStep.output
          if (!textContent && resultObj.currentStep?.output) {
            textContent = String(resultObj.currentStep.output);
            console.log('✅ [Context Agent] Found in currentStep.output');
          }
          // Method 4: lastProcessedResponse.newItems (Agent response format)
          if (!textContent && resultObj.lastProcessedResponse?.newItems) {
            const items = resultObj.lastProcessedResponse.newItems;
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item?.rawItem?.content && Array.isArray(item.rawItem.content)) {
                  for (const contentItem of item.rawItem.content) {
                    if (contentItem?.type === 'output_text' && contentItem?.text) {
                      textContent += contentItem.text;
                    } else if (contentItem?.type === 'text' && contentItem?.text) {
                      textContent += contentItem.text;
                    }
                  }
                }
              }
            }
            if (textContent) console.log('✅ [Context Agent] Found in lastProcessedResponse.newItems');
          }
          // Method 5: content array
          if (!textContent && Array.isArray(resultObj.content)) {
            for (const item of resultObj.content) {
              if (item?.type === 'output_text' && item?.text) {
                textContent += item.text;
              } else if (item?.type === 'text' && item?.text) {
                textContent += item.text;
              } else if (typeof item === 'string') {
                textContent += item;
              } else if (item?.text) {
                textContent += String(item.text);
              }
            }
            if (textContent) console.log('✅ [Context Agent] Found in content array');
          }
          // Method 6: Simple properties
          if (!textContent && resultObj.content && typeof resultObj.content === 'string') {
            textContent = resultObj.content;
            console.log('✅ [Context Agent] Found in content string');
          }
          if (!textContent && resultObj.text && typeof resultObj.text === 'string') {
            textContent = resultObj.text;
            console.log('✅ [Context Agent] Found in text');
          }
          if (!textContent && resultObj.output && typeof resultObj.output === 'string') {
            textContent = resultObj.output;
            console.log('✅ [Context Agent] Found in output');
          }
          if (!textContent && resultObj.message && typeof resultObj.message === 'string') {
            textContent = resultObj.message;
            console.log('✅ [Context Agent] Found in message');
          }
          // Method 7: Check if result itself can be stringified meaningfully
          if (!textContent && Object.keys(resultObj).length > 0) {
            // Try to find any text-like property
            const allValues = Object.values(resultObj);
            for (const value of allValues) {
              if (typeof value === 'string' && value.length > 10) {
                textContent = value;
                console.log('✅ [Context Agent] Found text in object values');
                break;
              }
            }
          }
        }
        
        // If still empty, provide a more helpful error
        if (!textContent || textContent.trim() === '') {
          console.error('❌ [Context Agent] Could not extract text content from result');
          console.error('Full result structure:', JSON.stringify(resultObj, null, 2).substring(0, 2000));
          
          // Instead of error text, throw an error to be caught by the outer try-catch
          throw new Error('Agent returned empty or unparseable response. Please check agent configuration and model availability.');
        }
        
        console.log('✅ [Context Agent] Final extracted text length:', textContent.length);
        console.log('✅ [Context Agent] Text preview:', textContent.substring(0, 150) + '...');
        
      } catch (extractionError) {
        console.error('❌ [Context Agent] Extraction error:', extractionError);
        throw new Error(`Failed to extract agent response: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`);
      }

      // Process and store the response
      const response = await this.processAgentResponse(
        textContent,
        input,
        toolCalls,
        conversation
      );

      logger.info(`✅ Processed input for ${this.config.name}: ${input.substring(0, 50)}...`);
      return response;

    } catch (error) {
      logger.error(`❌ Error processing input for ${this.config.name}:`, error);

      // Store error in conversation
      if (this.conversationId) {
        await memoryManager.addMessage(
          this.conversationId,
          'system',
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          this.config.name
        );
      }

      throw error;
    }
  }

  /**
   * Get conversation history with context
   */
  async getConversationHistory(limit = 50): Promise<Conversation | null> {
    if (!this.conversationId) {
      return null;
    }

    return await memoryManager.getConversation(this.conversationId, true);
  }

  /**
   * Search relevant memories
   */
  async searchMemories(query: string, options: {
    type?: MemoryEntry['type'];
    limit?: number;
    minConfidence?: number;
  } = {}): Promise<MemoryEntry[]> {
    return await memoryManager.searchMemories({
      query,
      ...options
    });
  }

  /**
   * Add explicit memory
   */
  async addMemory(
    type: MemoryEntry['type'],
    content: string,
    confidence = 0.8,
    tags?: string[]
  ): Promise<string> {
    return await memoryManager.addMemory({
      type,
      content,
      confidence,
      source: `agent-${this.config.name}`,
      timestamp: new Date(),
      tags,
      metadata: {
        userId: this.config.userId,
        agentName: this.config.name
      }
    });
  }

  /**
   * Reset conversation context
   */
  async resetConversation(): Promise<string> {
    this.conversationId = await memoryManager.createConversation(
      this.config.userId,
      `New chat with ${this.config.name}`
    );

    logger.info(`🔄 Reset conversation for ${this.config.name}: ${this.conversationId}`);
    return this.conversationId;
  }

  /**
   * Export conversation data
   */
  async exportConversation(): Promise<any> {
    if (!this.conversationId) {
      return null;
    }

    return await memoryManager.exportConversation(this.conversationId);
  }

  /**
   * Build context-aware instructions
   */
  private buildContextAwareInstructions(baseInstructions: string): string {
    return `${baseInstructions}

CONTEXT AWARENESS GUIDELINES:
- You have access to conversation history and user memories
- Use relevant context from previous interactions to provide personalized responses
- Remember user preferences and adapt your communication style accordingly
- If you reference past conversations or memories, be explicit about what you remember
- Maintain conversation continuity while being helpful and accurate
- When using tools, consider the user's previous tool usage patterns and preferences

MEMORY SYSTEM:
- You can access facts, preferences, relationships, and context from previous interactions
- Use this information to provide more relevant and personalized responses
- If you're unsure about a memory, ask for clarification rather than assuming

SAFETY AND PRIVACY:
- Respect user privacy and don't share memories between different users
- Be transparent about what information you remember and use
- If sensitive information appears in memories, handle it appropriately`;
  }

  /**
   * Build context-enhanced prompt with memories and conversation history
   */
  private async buildContextEnhancedPrompt(
    input: string,
    conversation: Conversation
  ): Promise<string> {
    if (!this.config.memoryEnabled) {
      return input;
    }

    // Get relevant memories
    const relevantMemories = await memoryManager.searchMemories({
      query: input,
      limit: 5,
      minConfidence: 0.6
    });

    // Get recent conversation context
    const recentMessages = conversation.messages.slice(-10);

    // Build enhanced prompt
    let enhancedPrompt = input;

    if (relevantMemories.length > 0) {
      const memoryContext = relevantMemories
        .map(memory => `- ${memory.type}: ${memory.content}`)
        .join('\n');

      enhancedPrompt = `RELEVANT MEMORIES:
${memoryContext}

RECENT CONVERSATION:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT REQUEST:
${input}`;
    } else if (recentMessages.length > 0) {
      enhancedPrompt = `RECENT CONVERSATION:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT REQUEST:
${input}`;
    }

    return enhancedPrompt;
  }

  /**
   * Extract tool calls from agent result
   */
  private extractToolCalls(result: any): Array<{
    toolName: string;
    parameters: any;
    result?: any;
  }> {
    const toolCalls: Array<{ toolName: string; parameters: any; result?: any }> = [];

    try {
      const safeObj = typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : {};
      const responses = safeObj?.state?.modelResponses;
      if (!Array.isArray(responses)) return toolCalls;

      // Track calls by id to merge results
      const callById: Record<string, { toolName: string; parameters: any; result?: any }> = {};

      for (const response of responses) {
        const outputItems = Array.isArray(response?.output) ? response.output : [];
        for (const item of outputItems) {
          const itemType = String(item?.type || '');
          const providerData = item?.providerData || item?.rawItem || item?.data || {};
          const id: string = String(item?.id || providerData?.id || '');

          // 1) Hosted/HTTP tool calls (arguments phase)
          if (/tool_call/i.test(itemType)) {
            const name = providerData?.tool?.name || providerData?.name || providerData?.tool_name || 'unknown_tool';
            const args = providerData?.arguments || providerData?.params || providerData?.payload || {};
            callById[id || `${name}-${toolCalls.length}`] = { toolName: String(name), parameters: args };
          }

          // 2) Tool results
          if (/tool_result|tool_call_result|hosted_tool_result/i.test(itemType)) {
            const res = providerData?.result || providerData?.output || providerData?.data || item?.content || item?.text;
            const target = (id && callById[id]) ? callById[id] : undefined;
            if (target) {
              target.result = res;
            } else {
              // Result without a tracked call; still surface it
              toolCalls.push({ toolName: providerData?.tool?.name || providerData?.name || 'tool_result', parameters: {}, result: res });
            }
          }

          // 3) MCP list tools (useful to show raw tool list)
          if (providerData?.type === 'mcp_list_tools' && Array.isArray(providerData?.tools)) {
            toolCalls.push({ toolName: 'mcp_list_tools', parameters: { serverLabel: providerData?.server_label }, result: providerData.tools });
          }
        }
      }

      // Flush tracked calls
      for (const entry of Object.values(callById)) {
        toolCalls.push(entry);
      }
    } catch {
      // ignore
    }

    return toolCalls;
  }

  /**
   * Process agent response and update context
   */
  private async processAgentResponse(
    content: string,
    originalInput: string,
    toolCalls: any[],
    conversation: Conversation
  ): Promise<AgentResponse> {
    // Store user message
    const userMessage = await memoryManager.addMessage(
      this.conversationId,
      'user',
      originalInput
    );

    // Store agent response
    const agentMessage = await memoryManager.addMessage(
      this.conversationId,
      'agent',
      content,
      this.config.name,
      toolCalls
    );

    // Extract any new memories from the interaction
    const extractedMemories = await this.extractMemoriesFromResponse(
      content,
      originalInput,
      toolCalls
    );

    return {
      content,
      conversationId: this.conversationId,
      messageId: agentMessage.id,
      toolCalls,
      memories: extractedMemories,
      metadata: {
        timestamp: new Date(),
        agentName: this.config.name,
        userId: this.config.userId
      }
    };
  }

  /**
   * Extract memories from agent response
   */
  private async extractMemoriesFromResponse(
    response: string,
    userInput: string,
    toolCalls: any[]
  ): Promise<MemoryEntry[]> {
    const memories: MemoryEntry[] = [];

    // Extract successful tool usage patterns
    if (toolCalls.length > 0) {
      const toolNames = toolCalls.map(tc => tc.toolName);
      await this.addMemory(
        'context',
        `User successfully used tools: ${toolNames.join(', ')} in response to: ${userInput}`,
        0.9,
        ['tool-usage', 'success-pattern']
      );
    }

    // Extract preferences mentioned in response
    const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
    const responseLower = responseStr.toLowerCase();
    if (responseLower.includes('you prefer') || responseLower.includes('you like')) {
      await this.addMemory(
        'preference',
        `Identified user preference: ${responseStr}`,
        0.7,
        ['preference', 'identified']
      );
    }

    // Extract facts mentioned about the user
    if (responseLower.includes('you are') || responseLower.includes('you work')) {
      await this.addMemory(
        'fact',
        `User fact: ${responseStr}`,
        0.6,
        ['fact', 'user-info']
      );
    }

    return memories;
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    conversationId: string;
    totalMessages: number;
    memoryCount: number;
    lastActivity?: Date;
  } {
    return {
      conversationId: this.conversationId,
      totalMessages: 0, // Would get from memory manager
      memoryCount: 0, // Would get from memory manager
      lastActivity: new Date()
    };
  }
}

/**
 * Factory function for creating context-aware agents
 */
export function createContextAwareAgent(config: ContextAwareAgentConfig): ContextAwareAgent {
  return new ContextAwareAgent(config);
}

/**
 * Helper function to create specialized agents with predefined configs
 */
export const AgentTemplates = {
  /**
   * General assistant with full context awareness and MCP tools
   */
  generalAssistant: (userId: string, model = 'gpt-4o-mini', mcpServers: any[] = [], tools: any[] = []) => createContextAwareAgent({
    name: 'General Assistant',
    instructions: `You are a helpful Turkish-speaking AI assistant with access to conversation history, user memories, and various tools including financial services from Odeabank.

When user asks about:
- Currency rates (döviz kurları, dolar, euro) → Use available currency tools
- Credit calculations (kredi hesaplama) → Use credit calculation tools
- Market data (borsa, BIST, hisse) → Use market data tools
- Bank branches (şube) → Use branch lookup tools

Always respond in Turkish and provide clear, user-friendly explanations of tool results.`,
    model,
    userId,
    memoryEnabled: true,
    guardrailsEnabled: true,
    mcpServers,
    tools
  }),

  /**
   * Research assistant with specialized capabilities
   */
  researchAssistant: (userId: string, model = 'gpt-4o-mini') => createContextAwareAgent({
    name: 'Research Assistant',
    instructions: 'You are a research assistant specializing in information gathering and analysis. Use your memory to track research topics and user interests.',
    model,
    userId,
    memoryEnabled: true,
    guardrailsEnabled: true,
    approvalRequired: false
  }),

  /**
   * Code assistant with development context
   */
  codeAssistant: (userId: string, model = 'gpt-4o-mini') => createContextAwareAgent({
    name: 'Code Assistant',
    instructions: 'You are a coding assistant that helps with programming tasks. Remember user coding preferences, project contexts, and technical discussions.',
    model,
    userId,
    memoryEnabled: true,
    guardrailsEnabled: true,
    approvalRequired: true // Code execution may need approval
  }),

  /**
   * Customer service agent with ticket context
   */
  customerService: (userId: string, model = 'gpt-4o-mini') => createContextAwareAgent({
    name: 'Customer Service',
    instructions: 'You are a customer service representative. Remember customer history, preferences, and previous issues to provide personalized support.',
    model,
    userId,
    memoryEnabled: true,
    guardrailsEnabled: true,
    approvalRequired: false
  })
};