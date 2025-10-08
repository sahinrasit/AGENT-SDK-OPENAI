/**
 * Session Management API
 * REST endpoints for chat session management
 */

import { Router, Request, Response } from 'express';
import { database, sessionRepository, messageRepository } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Middleware to ensure database is connected
router.use(async (req, res, next) => {
  try {
    const healthy = await database.healthCheck();
    if (!healthy) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    next();
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({ error: 'Database error' });
  }
});

// Middleware to get user ID (from auth token or session)
// For now, using a default user ID - replace with actual auth
const getUserId = (req: Request): string => {
  // TODO: Implement proper authentication
  // return req.user?.id || req.headers['x-user-id'] as string;
  return req.headers['x-user-id'] as string || 'default-user-id';
};

/**
 * GET /api/sessions
 * List all sessions for the current user
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { status, agent_type, is_pinned, search, limit, offset, orderBy, order } = req.query;

    const sessions = await sessionRepository.findByUserId(userId, {
      status: status as any,
      agent_type: agent_type as string,
      is_pinned: is_pinned === 'true' ? true : is_pinned === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      orderBy: (orderBy as string) || 'last_message_at',
      order: (order as 'ASC' | 'DESC') || 'DESC',
    });

    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    logger.error('Failed to list sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * GET /api/sessions/summaries
 * Get active session summaries (with last message)
 */
router.get('/sessions/summaries', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const summaries = await sessionRepository.getActiveSummaries(userId, limit);

    res.json({
      success: true,
      data: summaries,
      count: summaries.length,
    });
  } catch (error) {
    logger.error('Failed to get session summaries:', error);
    res.status(500).json({ error: 'Failed to get session summaries' });
  }
});

/**
 * POST /api/sessions
 * Create a new chat session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, description, agent_type, context, settings } = req.body;

    const session = await sessionRepository.create({
      user_id: userId,
      title: title || 'New Chat',
      description,
      agent_type,
      context,
      settings,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Failed to create session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific session
 */
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await sessionRepository.findById(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // TODO: Verify user owns this session
    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Failed to get session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * PUT /api/sessions/:id
 * Update a session
 */
router.put('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const session = await sessionRepository.update(id, updates);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Failed to update session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session (soft delete)
 */
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await sessionRepository.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    logger.error('Failed to delete session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * POST /api/sessions/:id/archive
 * Archive a session
 */
router.post('/sessions/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await sessionRepository.archive(id);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Session archived',
    });
  } catch (error) {
    logger.error('Failed to archive session:', error);
    res.status(500).json({ error: 'Failed to archive session' });
  }
});

/**
 * POST /api/sessions/:id/unarchive
 * Unarchive a session
 */
router.post('/sessions/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await sessionRepository.unarchive(id);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Session restored',
    });
  } catch (error) {
    logger.error('Failed to unarchive session:', error);
    res.status(500).json({ error: 'Failed to unarchive session' });
  }
});

/**
 * POST /api/sessions/:id/pin
 * Pin/unpin a session
 */
router.post('/sessions/:id/pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;

    const success = await sessionRepository.setPinned(id, pinned);

    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: pinned ? 'Session pinned' : 'Session unpinned',
    });
  } catch (error) {
    logger.error('Failed to pin session:', error);
    res.status(500).json({ error: 'Failed to pin session' });
  }
});

/**
 * GET /api/sessions/search
 * Search sessions by text
 */
router.get('/sessions/search', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await sessionRepository.search(
      userId,
      q,
      limit ? parseInt(limit as string) : 20
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Failed to search sessions:', error);
    res.status(500).json({ error: 'Failed to search sessions' });
  }
});

/**
 * GET /api/sessions/:id/messages
 * Get messages for a session
 */
router.get('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, offset, role } = req.query;

    const messages = await messageRepository.findBySessionId(id, {
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
      role: role as any,
      orderBy: 'created_at',
      order: 'ASC',
    });

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Failed to get session messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * GET /api/sessions/:id/history
 * Get conversation history (formatted for OpenAI)
 */
router.get('/sessions/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const history = await messageRepository.getConversationHistory(id, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Failed to get conversation history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

/**
 * POST /api/sessions/:id/messages
 * Create a new message in session
 */
router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messageData = req.body;

    const message = await messageRepository.create({
      session_id: id,
      ...messageData,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Failed to create message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

/**
 * GET /api/stats
 * Get user statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const activeCount = await sessionRepository.countByUserId(userId, 'active');
    const archivedCount = await sessionRepository.countByUserId(userId, 'archived');
    const totalCount = activeCount + archivedCount;

    res.json({
      success: true,
      data: {
        total_sessions: totalCount,
        active_sessions: activeCount,
        archived_sessions: archivedCount,
      },
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
