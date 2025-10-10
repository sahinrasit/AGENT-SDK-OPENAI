/**
 * SessionList Component
 * Sidebar showing all user sessions
 */

import React, { useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { ChatSession } from '../api/sessions';
import { clsx } from 'clsx';

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void;
  activeSessionId?: string;
  onNavigateToChat?: () => void;
}

export default function SessionList({ onSessionSelect, activeSessionId, onNavigateToChat }: SessionListProps) {
  const { sessions, loading, createSession, deleteSession, pinSession, searchSessions } =
    useSessions();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = async () => {
    try {
      // Navigate to chat view first
      if (onNavigateToChat) {
        onNavigateToChat();
      }

      // Check if current active session is empty (no messages)
      const activeSession = sessions.find(s => s.id === activeSessionId);

      if (activeSession && activeSession.message_count === 0) {
        // Don't create new session, just keep the current empty one
        return;
      }

      const newSession = await createSession({ title: 'Yeni Sohbet' });
      onSessionSelect(newSession.id);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchSessions(searchQuery);
    }
  };

  const handlePin = async (sessionId: string, currentPinned: boolean) => {
    try {
      await pinSession(sessionId, !currentPinned);
    } catch (err) {
      console.error('Failed to pin session:', err);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
      try {
        await deleteSession(sessionId);
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Filter out empty sessions (no messages) unless it's the active session
  const nonEmptySessions = sessions.filter((s) =>
    s.message_count > 0 || s.id === activeSessionId
  );

  const pinnedSessions = nonEmptySessions.filter((s) => s.is_pinned);
  const regularSessions = nonEmptySessions.filter((s) => !s.is_pinned);

  if (loading && sessions.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header - New Chat and Search */}
      <div className="px-3 pb-3 space-y-2">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="text-lg">+</span>
          <span className="text-sm font-medium">Yeni Sohbet</span>
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sohbet ara..."
            className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            🔍
          </button>
        </form>
      </div>

      {/* Session List */}
      <div>
        {/* Pinned Sessions */}
        {pinnedSessions.length > 0 && (
          <div className="px-3 pb-2">
            <div className="text-xs font-semibold text-gray-500 px-2 pb-1">SABİTLENEN</div>
            {pinnedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => onSessionSelect(session.id)}
                onPin={() => handlePin(session.id, session.is_pinned)}
                onDelete={() => handleDelete(session.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Regular Sessions */}
        <div className="px-3">
          {regularSessions.length === 0 && pinnedSessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-6">Henüz sohbet yok</div>
          )}
          {regularSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onSessionSelect(session.id)}
              onPin={() => handlePin(session.id, session.is_pinned)}
              onDelete={() => handleDelete(session.id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onPin,
  onDelete,
  formatDate,
}: SessionItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={clsx(
        'group relative p-2.5 mb-1 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-sm'
          : 'hover:bg-gray-50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {session.is_pinned && <span className="text-xs">📌</span>}
            <h3 className={clsx(
              "text-sm font-medium truncate line-clamp-1",
              session.message_count === 0 ? "text-gray-400 italic" : "text-gray-900"
            )}>
              {session.message_count === 0 ? 'Yeni sohbet...' : session.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500">{formatDate(session.created_at)}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{session.message_count}</span>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
        >
          ⋮
        </button>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          className="absolute right-2 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <span>{session.is_pinned ? '📌' : '📌'}</span>
            <span>{session.is_pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Sil</span>
          </button>
        </div>
      )}
    </div>
  );
}
