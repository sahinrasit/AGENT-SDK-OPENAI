/**
 * SessionList Component
 * Sidebar showing all user sessions
 */

import React, { useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { ChatSession } from '../api/sessions';

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void;
  activeSessionId?: string;
}

export default function SessionList({ onSessionSelect, activeSessionId }: SessionListProps) {
  const { sessions, loading, createSession, deleteSession, pinSession, searchSessions } =
    useSessions();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = async () => {
    try {
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

  const pinnedSessions = sessions.filter((s) => s.is_pinned);
  const regularSessions = sessions.filter((s) => !s.is_pinned);

  if (loading && sessions.length === 0) {
    return (
      <div className="flex flex-col h-full w-64 border-r border-gray-200 bg-gray-50">
        <div className="p-4">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-64 border-r border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>Yeni Sohbet</span>
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ara..."
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="flex-1 overflow-y-auto">
        {/* Pinned Sessions */}
        {pinnedSessions.length > 0 && (
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 px-2 py-1">SABİTLENEN</div>
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
        <div className="p-2">
          {regularSessions.length === 0 && pinnedSessions.length === 0 && (
            <div className="text-center text-gray-500 py-8">Henüz sohbet yok</div>
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
      className={`group relative p-3 mb-1 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-100'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {session.is_pinned && <span className="text-xs">📌</span>}
            <h3 className="text-sm font-medium text-gray-900 truncate">{session.title}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{formatDate(session.created_at)}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{session.message_count} mesaj</span>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
        >
          ⋮
        </button>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          className="absolute right-2 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[150px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            {session.is_pinned ? '📌 Sabitlemeyi Kaldır' : '📌 Sabitle'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
          >
            🗑️ Sil
          </button>
        </div>
      )}
    </div>
  );
}
