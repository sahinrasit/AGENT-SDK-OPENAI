/**
 * Chat Session Repository
 * Data access layer for chat sessions
 */

import { database } from '../database.js';
import {
  ChatSession,
  CreateSessionInput,
  UpdateSessionInput,
  SessionFilters,
  ActiveSessionSummary,
} from '../models.js';
import { logger } from '../../utils/logger.js';

export class SessionRepository {
  /**
   * Create a new chat session
   */
  async create(input: CreateSessionInput): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (
        user_id, title, description, agent_type, context, settings
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      input.user_id,
      input.title || 'New Chat',
      input.description,
      input.agent_type,
      JSON.stringify(input.context || {}),
      JSON.stringify(input.settings || {}),
    ];

    try {
      const result = await database.query<ChatSession>(query, values);
      logger.info('Chat session created', { sessionId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<ChatSession | null> {
    const query = `
      SELECT * FROM chat_sessions
      WHERE id = $1 AND status != 'deleted'
    `;

    try {
      const result = await database.query<ChatSession>(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find session:', error);
      throw error;
    }
  }

  /**
   * Find sessions by user ID with filters
   */
  async findByUserId(userId: string, filters?: SessionFilters): Promise<ChatSession[]> {
    let query = `
      SELECT * FROM chat_sessions
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Apply filters
    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    } else {
      query += ` AND status != 'deleted'`;
    }

    if (filters?.agent_type) {
      query += ` AND agent_type = $${paramIndex}`;
      params.push(filters.agent_type);
      paramIndex++;
    }

    if (filters?.is_pinned !== undefined) {
      query += ` AND is_pinned = $${paramIndex}`;
      params.push(filters.is_pinned);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (
        to_tsvector('english', title || ' ' || COALESCE(description, ''))
        @@ plainto_tsquery('english', $${paramIndex})
      )`;
      params.push(filters.search);
      paramIndex++;
    }

    // Apply sorting
    const orderBy = filters?.orderBy || 'last_message_at';
    const order = filters?.order || 'DESC';
    query += ` ORDER BY ${orderBy} ${order} NULLS LAST`;

    // Apply pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
      const result = await database.query<ChatSession>(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find sessions by user:', error);
      throw error;
    }
  }

  /**
   * Update session
   */
  async update(id: string, input: UpdateSessionInput): Promise<ChatSession | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(input.title);
      paramIndex++;
    }

    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(input.description);
      paramIndex++;
    }

    if (input.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(input.status);
      paramIndex++;

      // Set archived_at if status is changing to archived
      if (input.status === 'archived') {
        fields.push(`archived_at = CURRENT_TIMESTAMP`);
      }
    }

    if (input.agent_type !== undefined) {
      fields.push(`agent_type = $${paramIndex}`);
      values.push(input.agent_type);
      paramIndex++;
    }

    if (input.context !== undefined) {
      fields.push(`context = $${paramIndex}`);
      values.push(JSON.stringify(input.context));
      paramIndex++;
    }

    if (input.settings !== undefined) {
      fields.push(`settings = $${paramIndex}`);
      values.push(JSON.stringify(input.settings));
      paramIndex++;
    }

    if (input.is_pinned !== undefined) {
      fields.push(`is_pinned = $${paramIndex}`);
      values.push(input.is_pinned);
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
      UPDATE chat_sessions
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    try {
      const result = await database.query<ChatSession>(query, values);
      if (result.rows.length > 0) {
        logger.info('Session updated', { sessionId: id });
      }
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to update session:', error);
      throw error;
    }
  }

  /**
   * Delete session (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE chat_sessions
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      const result = await database.query(query, [id]);
      logger.info('Session deleted', { sessionId: id });
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Archive session
   */
  async archive(id: string): Promise<boolean> {
    return this.update(id, { status: 'archived' }).then((session) => session !== null);
  }

  /**
   * Unarchive session
   */
  async unarchive(id: string): Promise<boolean> {
    return this.update(id, { status: 'active' }).then((session) => session !== null);
  }

  /**
   * Pin/unpin session
   */
  async setPinned(id: string, pinned: boolean): Promise<boolean> {
    return this.update(id, { is_pinned: pinned }).then((session) => session !== null);
  }

  /**
   * Get active sessions summary (using view)
   */
  async getActiveSummaries(userId: string, limit: number = 20): Promise<ActiveSessionSummary[]> {
    const query = `
      SELECT * FROM active_sessions_summary
      WHERE user_id = $1
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT $2
    `;

    try {
      const result = await database.query<ActiveSessionSummary>(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get active session summaries:', error);
      throw error;
    }
  }

  /**
   * Search sessions by text
   */
  async search(userId: string, query: string, limit: number = 20): Promise<ChatSession[]> {
    const sql = `
      SELECT * FROM search_sessions($1, $2, $3, 0)
    `;

    try {
      const result = await database.query<any>(sql, [userId, query, limit]);
      // The function returns session details with rank
      return result.rows.map((row) => ({
        id: row.session_id,
        title: row.title,
        description: row.description,
        message_count: row.message_count,
        last_message_at: row.last_message_at,
        // Other fields would need to be joined in the function
      })) as any;
    } catch (error) {
      logger.error('Failed to search sessions:', error);
      throw error;
    }
  }

  /**
   * Count sessions by user
   */
  async countByUserId(userId: string, status?: 'active' | 'archived' | 'deleted'): Promise<number> {
    let query = `
      SELECT COUNT(*) as count FROM chat_sessions
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    try {
      const result = await database.query<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      logger.error('Failed to count sessions:', error);
      throw error;
    }
  }

  /**
   * Archive old sessions (bulk operation)
   */
  async archiveOldSessions(daysOld: number = 90): Promise<number> {
    const query = `SELECT archive_old_sessions($1)`;

    try {
      const result = await database.query<{ archive_old_sessions: number }>(query, [daysOld]);
      const count = result.rows[0]?.archive_old_sessions || 0;
      logger.info(`Archived ${count} old sessions`);
      return count;
    } catch (error) {
      logger.error('Failed to archive old sessions:', error);
      throw error;
    }
  }
}

// Singleton instance
export const sessionRepository = new SessionRepository();
