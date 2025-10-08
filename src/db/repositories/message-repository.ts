/**
 * Message Repository
 * Data access layer for chat messages
 */

import { database } from '../database.js';
import {
  Message,
  CreateMessageInput,
  UpdateMessageInput,
  MessageFilters,
} from '../models.js';
import { logger } from '../../utils/logger.js';

export class MessageRepository {
  /**
   * Create a new message
   */
  async create(input: CreateMessageInput): Promise<Message> {
    const query = `
      INSERT INTO messages (
        session_id, parent_message_id, role, content, content_type,
        agent_type, tool_calls, tool_results, tokens_used, latency_ms,
        model, is_error, error_details, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      input.session_id,
      input.parent_message_id || null,
      input.role,
      input.content,
      input.content_type || 'text',
      input.agent_type || null,
      input.tool_calls ? JSON.stringify(input.tool_calls) : null,
      input.tool_results ? JSON.stringify(input.tool_results) : null,
      input.tokens_used || 0,
      input.latency_ms || null,
      input.model || null,
      input.is_error || false,
      input.error_details ? JSON.stringify(input.error_details) : null,
      JSON.stringify(input.metadata || {}),
    ];

    try {
      const result = await database.query<Message>(query, values);
      logger.debug('Message created', {
        messageId: result.rows[0].id,
        sessionId: input.session_id,
        role: input.role,
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create message:', error);
      throw error;
    }
  }

  /**
   * Find message by ID
   */
  async findById(id: string): Promise<Message | null> {
    const query = `SELECT * FROM messages WHERE id = $1`;

    try {
      const result = await database.query<Message>(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find message:', error);
      throw error;
    }
  }

  /**
   * Find messages by session ID
   */
  async findBySessionId(sessionId: string, filters?: MessageFilters): Promise<Message[]> {
    let query = `
      SELECT * FROM messages
      WHERE session_id = $1
    `;

    const params: any[] = [sessionId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.role) {
      query += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.agent_type) {
      query += ` AND agent_type = $${paramIndex}`;
      params.push(filters.agent_type);
      paramIndex++;
    }

    if (filters?.is_error !== undefined) {
      query += ` AND is_error = $${paramIndex}`;
      params.push(filters.is_error);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(filters.search);
      paramIndex++;
    }

    // Apply sorting
    const orderBy = filters?.orderBy || 'created_at';
    const order = filters?.order || 'ASC';
    query += ` ORDER BY ${orderBy} ${order}`;

    // Apply pagination
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
      const result = await database.query<Message>(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find messages by session:', error);
      throw error;
    }
  }

  /**
   * Get conversation history with context
   * Returns messages formatted for OpenAI API
   */
  async getConversationHistory(
    sessionId: string,
    limit?: number
  ): Promise<Array<{ role: string; content: string }>> {
    const query = `
      SELECT role, content, tool_calls, tool_results
      FROM messages
      WHERE session_id = $1 AND role IN ('user', 'assistant', 'system')
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const result = await database.query(query, [sessionId, limit || 50]);

      // Reverse to get chronological order
      const messages = result.rows.reverse();

      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      logger.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  /**
   * Update message
   */
  async update(id: string, input: UpdateMessageInput): Promise<Message | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.content !== undefined) {
      fields.push(`content = $${paramIndex}`);
      values.push(input.content);
      paramIndex++;
    }

    if (input.tool_results !== undefined) {
      fields.push(`tool_results = $${paramIndex}`);
      values.push(JSON.stringify(input.tool_results));
      paramIndex++;
    }

    if (input.tokens_used !== undefined) {
      fields.push(`tokens_used = $${paramIndex}`);
      values.push(input.tokens_used);
      paramIndex++;
    }

    if (input.latency_ms !== undefined) {
      fields.push(`latency_ms = $${paramIndex}`);
      values.push(input.latency_ms);
      paramIndex++;
    }

    if (input.is_error !== undefined) {
      fields.push(`is_error = $${paramIndex}`);
      values.push(input.is_error);
      paramIndex++;
    }

    if (input.error_details !== undefined) {
      fields.push(`error_details = $${paramIndex}`);
      values.push(JSON.stringify(input.error_details));
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE messages
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    try {
      const result = await database.query<Message>(query, values);
      if (result.rows.length > 0) {
        logger.debug('Message updated', { messageId: id });
      }
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to update message:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM messages WHERE id = $1`;

    try {
      const result = await database.query(query, [id]);
      logger.debug('Message deleted', { messageId: id });
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to delete message:', error);
      throw error;
    }
  }

  /**
   * Count messages by session
   */
  async countBySessionId(sessionId: string, role?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM messages WHERE session_id = $1`;
    const params: any[] = [sessionId];

    if (role) {
      query += ` AND role = $2`;
      params.push(role);
    }

    try {
      const result = await database.query<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      logger.error('Failed to count messages:', error);
      throw error;
    }
  }

  /**
   * Get latest message in session
   */
  async getLatest(sessionId: string): Promise<Message | null> {
    const query = `
      SELECT * FROM messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await database.query<Message>(query, [sessionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get latest message:', error);
      throw error;
    }
  }

  /**
   * Search messages by content
   */
  async search(sessionId: string, query: string, limit: number = 20): Promise<Message[]> {
    const sql = `
      SELECT *,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as rank
      FROM messages
      WHERE session_id = $1
        AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC, created_at DESC
      LIMIT $3
    `;

    try {
      const result = await database.query<Message>(sql, [sessionId, query, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to search messages:', error);
      throw error;
    }
  }

  /**
   * Get messages with tool calls
   */
  async getMessagesWithTools(sessionId: string): Promise<Message[]> {
    const query = `
      SELECT * FROM messages
      WHERE session_id = $1
        AND (tool_calls IS NOT NULL OR tool_results IS NOT NULL)
      ORDER BY created_at ASC
    `;

    try {
      const result = await database.query<Message>(query, [sessionId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get messages with tools:', error);
      throw error;
    }
  }

  /**
   * Bulk create messages (for importing conversation history)
   */
  async bulkCreate(messages: CreateMessageInput[]): Promise<Message[]> {
    if (messages.length === 0) return [];

    return database.transaction(async (client) => {
      const created: Message[] = [];

      for (const input of messages) {
        const query = `
          INSERT INTO messages (
            session_id, parent_message_id, role, content, content_type,
            agent_type, tool_calls, tool_results, tokens_used, latency_ms,
            model, is_error, error_details, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        const values = [
          input.session_id,
          input.parent_message_id || null,
          input.role,
          input.content,
          input.content_type || 'text',
          input.agent_type || null,
          input.tool_calls ? JSON.stringify(input.tool_calls) : null,
          input.tool_results ? JSON.stringify(input.tool_results) : null,
          input.tokens_used || 0,
          input.latency_ms || null,
          input.model || null,
          input.is_error || false,
          input.error_details ? JSON.stringify(input.error_details) : null,
          JSON.stringify(input.metadata || {}),
        ];

        const result = await client.query<Message>(query, values);
        created.push(result.rows[0]);
      }

      logger.info(`Bulk created ${created.length} messages`);
      return created;
    });
  }
}

// Singleton instance
export const messageRepository = new MessageRepository();
