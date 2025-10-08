/**
 * Chat Session Manager
 * Manages in-memory chat sessions
 */

import { ChatSession, PendingApproval } from './types.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private sessions: Map<string, ChatSession> = new Map();

  /**
   * Create a new chat session
   */
  createSession(
    agentType: string,
    userId: string,
    contextAware: boolean = false,
    conversationId?: string
  ): ChatSession {
    const sessionId = uuidv4();
    const session: ChatSession = {
      id: sessionId,
      agentType,
      userId,
      conversationId,
      messages: [],
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date(),
      contextAware,
      pendingApprovals: new Map(),
    };

    this.sessions.set(sessionId, session);
    logger.info(`Session created: ${sessionId} (${agentType})`);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, message: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      this.updateActivity(sessionId);
    }
  }

  /**
   * Add pending approval to session
   */
  addPendingApproval(
    sessionId: string,
    approvalId: string,
    toolName: string,
    parameters: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (session && session.pendingApprovals) {
      session.pendingApprovals.set(approvalId, {
        id: approvalId,
        toolName,
        parameters,
        timestamp: new Date(),
        resolved: false,
      });
    }
  }

  /**
   * Resolve pending approval
   */
  resolvePendingApproval(
    sessionId: string,
    approvalId: string,
    approved: boolean
  ): PendingApproval | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.pendingApprovals) {
      const approval = session.pendingApprovals.get(approvalId);
      if (approval) {
        approval.resolved = true;
        approval.approved = approved;
        return approval;
      }
    }
    return undefined;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Map<string, ChatSession> {
    return this.sessions;
  }

  /**
   * Get sessions by user ID
   */
  getSessionsByUserId(userId: string): ChatSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      logger.info(`Session closed: ${sessionId}`);
    }
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info(`Session deleted: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(maxAgeMinutes: number = 60): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const ageMinutes = (now.getTime() - session.lastActivity.getTime()) / 1000 / 60;
      if (!session.isActive || ageMinutes > maxAgeMinutes) {
        this.sessions.delete(id);
        cleaned++;
        logger.info(`Cleaned up inactive session: ${id}`);
      }
    }

    return cleaned;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return Array.from(this.sessions.values()).filter((s) => s.isActive).length;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Auto-cleanup every 30 minutes
setInterval(() => {
  const cleaned = sessionManager.cleanupInactiveSessions(60);
  if (cleaned > 0) {
    logger.info(`🧹 Cleaned up ${cleaned} inactive sessions`);
  }
}, 30 * 60 * 1000);
