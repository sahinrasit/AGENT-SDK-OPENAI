# 🎯 PHASE 3: Multi-Session UI - Implementation Plan

**Status**: 🚧 In Progress
**Date**: 2025-01-09
**Phase**: Multi-Session Tab-Based Interface (Claude AI Style)

---

## 📋 Overview

Implementing Claude AI-style multi-session chat interface with:
- ✅ Backend REST API for session management
- ✅ Database integration with WebSocket server
- 🚧 Frontend session management hooks
- 🚧 Session list sidebar component
- 🚧 Tab-based chat interface
- 🚧 Keyboard shortcuts (Cmd+K, Cmd+T)
- 🚧 Real-time sync via WebSocket

---

## ✅ Backend - COMPLETE

### REST API Endpoints (`src/api/session-api.ts`)

All endpoints ready and integrated:

```typescript
GET    /api/sessions                 // List user sessions
GET    /api/sessions/summaries       // Active sessions with last message
POST   /api/sessions                 // Create new session
GET    /api/sessions/:id             // Get session details
PUT    /api/sessions/:id             // Update session
DELETE /api/sessions/:id             // Soft delete session
POST   /api/sessions/:id/archive     // Archive session
POST   /api/sessions/:id/unarchive   // Restore archived session
POST   /api/sessions/:id/pin         // Pin/unpin session
GET    /api/sessions/search?q=query  // Full-text search

GET    /api/sessions/:id/messages    // Get session messages
GET    /api/sessions/:id/history     // Conversation history (OpenAI format)
POST   /api/sessions/:id/messages    // Create message
GET    /api/stats                     // User statistics
```

**Features**:
- Pagination and filtering
- Full-text search
- Sorting options
- Error handling
- Health check integration

---

## 🚧 Frontend - IN PROGRESS

### Architecture

```
web/src/
├── api/
│   ├── client.ts              // Axios HTTP client
│   └── sessions.ts            // Session API calls
├── hooks/
│   ├── useSessions.ts         // Session list management
│   ├── useCurrentSession.ts   // Active session state
│   └── useSessionMessages.ts  // Message loading
├── components/
│   ├── SessionList/
│   │   ├── SessionList.tsx
│   │   ├── SessionItem.tsx
│   │   └── SessionSearch.tsx
│   ├── ChatTabs/
│   │   ├── ChatTabs.tsx
│   │   └── ChatTab.tsx
│   └── ChatInterface/
│       └── ChatInterface.tsx  // Enhanced with session support
├── context/
│   └── SessionContext.tsx     // Global session state
└── types/
    └── session.ts             // TypeScript types
```

---

## 📦 Implementation Tasks

### 1. ✅ API Client Setup

**File**: `web/src/api/client.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'default-user-id', // TODO: Replace with auth
  },
});
```

**File**: `web/src/api/sessions.ts`

```typescript
import { apiClient } from './client';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  agent_type?: string;
  is_pinned: boolean;
  message_count: number;
  total_tokens_used: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export const sessionsApi = {
  list: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get<{ success: boolean; data: ChatSession[] }>('/api/sessions', { params }),

  getSummaries: (limit = 20) =>
    apiClient.get('/api/sessions/summaries', { params: { limit } }),

  create: (data: {
    title?: string;
    description?: string;
    agent_type?: string;
  }) => apiClient.post('/api/sessions', data),

  get: (id: string) => apiClient.get(`/api/sessions/${id}`),

  update: (id: string, data: Partial<ChatSession>) =>
    apiClient.put(`/api/sessions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/sessions/${id}`),

  archive: (id: string) => apiClient.post(`/api/sessions/${id}/archive`),

  unarchive: (id: string) => apiClient.post(`/api/sessions/${id}/unarchive`),

  pin: (id: string, pinned: boolean) =>
    apiClient.post(`/api/sessions/${id}/pin`, { pinned }),

  search: (query: string, limit = 20) =>
    apiClient.get('/api/sessions/search', { params: { q: query, limit } }),

  getMessages: (id: string, limit = 100) =>
    apiClient.get(`/api/sessions/${id}/messages`, { params: { limit } }),

  getHistory: (id: string, limit = 50) =>
    apiClient.get(`/api/sessions/${id}/history`, { params: { limit } }),
};
```

---

### 2. 🚧 React Hooks

**File**: `web/src/hooks/useSessions.ts`

```typescript
import { useState, useEffect } from 'react';
import { sessionsApi, ChatSession } from '../api/sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionsApi.list({ status: 'active' });
      setSessions(response.data.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const createSession = async (data: { title?: string; agent_type?: string }) => {
    const response = await sessionsApi.create(data);
    await loadSessions(); // Reload list
    return response.data.data;
  };

  const deleteSession = async (id: string) => {
    await sessionsApi.delete(id);
    await loadSessions();
  };

  const archiveSession = async (id: string) => {
    await sessionsApi.archive(id);
    await loadSessions();
  };

  const pinSession = async (id: string, pinned: boolean) => {
    await sessionsApi.pin(id, pinned);
    await loadSessions();
  };

  return {
    sessions,
    loading,
    error,
    loadSessions,
    createSession,
    deleteSession,
    archiveSession,
    pinSession,
  };
}
```

---

### 3. 🚧 Session List Component

**File**: `web/src/components/SessionList/SessionList.tsx`

```tsx
import React from 'react';
import { useSessions } from '../../hooks/useSessions';
import SessionItem from './SessionItem';
import SessionSearch from './SessionSearch';

export default function SessionList() {
  const { sessions, loading, createSession, deleteSession, pinSession } = useSessions();

  const handleNewChat = async () => {
    await createSession({ title: 'New Chat' });
  };

  if (loading) {
    return <div className="p-4">Loading sessions...</div>;
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-gray-50 w-64">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          + New Chat
        </button>
      </div>

      {/* Search */}
      <SessionSearch />

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onDelete={() => deleteSession(session.id)}
            onPin={(pinned) => pinSession(session.id, pinned)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 4. 🚧 Tab-Based Interface

**File**: `web/src/components/ChatTabs/ChatTabs.tsx`

```tsx
import React, { useState } from 'react';

interface ChatTab {
  id: string;
  title: string;
  sessionId: string;
}

export default function ChatTabs() {
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = (sessionId: string, title: string) => {
    const existingTab = tabs.find((t) => t.sessionId === sessionId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTab = {
      id: `tab-${Date.now()}`,
      title,
      sessionId,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
            activeTabId === tab.id ? 'bg-white border-b-2 border-blue-500' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTabId(tab.id)}
        >
          <span className="truncate max-w-[150px]">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 5. 🚧 Keyboard Shortcuts

**File**: `web/src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: {
  onNewChat?: () => void;
  onSearch?: () => void;
  onCloseTab?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + T = New Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handlers.onNewChat?.();
      }

      // Cmd/Ctrl + K = Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      }

      // Cmd/Ctrl + W = Close Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        handlers.onCloseTab?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

---

## 🎨 UI Design (Claude AI Style)

```
┌─────────────────────────────────────────────────────────────┐
│ IBTech Agent Platform                                  [⚙️]  │
├─────────────┬───────────────────────────────────────────────┤
│             │ ┌─ Tab 1 ─┬─ Tab 2 ─┬─ Tab 3 ─┐              │
│  [+ New]    │ │ Chat 1  │ Chat 2  │ Chat 3  │              │
│             │ └─────────┴─────────┴─────────┘              │
│  [🔍 Search]│                                              │
│             │  ┌──────────────────────────────────────┐   │
│  📌 Pinned  │  │                                      │   │
│  • Chat 1   │  │     Messages                         │   │
│             │  │                                      │   │
│  Recent     │  │                                      │   │
│  • Chat 2   │  │                                      │   │
│  • Chat 3   │  └──────────────────────────────────────┘   │
│  • Chat 4   │                                              │
│             │  ┌──────────────────────────────────────┐   │
│  Today      │  │ Type a message...              [Send]│   │
│  • Chat 5   │  └──────────────────────────────────────┘   │
│  • Chat 6   │                                              │
│             │                                              │
│  Yesterday  │                                              │
│  • Chat 7   │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

---

## 🔄 Real-Time Sync

### WebSocket Events

```typescript
// Listen for session updates
socket.on('session:created', (session) => {
  // Add to session list
});

socket.on('session:updated', (session) => {
  // Update in session list
});

socket.on('session:deleted', (sessionId) => {
  // Remove from session list
});

// Emit session events
socket.emit('session:open', { sessionId });
socket.emit('session:close', { sessionId });
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + T` | New chat session |
| `Cmd/Ctrl + K` | Search sessions |
| `Cmd/Ctrl + W` | Close current tab |
| `Cmd/Ctrl + [1-9]` | Switch to tab 1-9 |
| `Cmd/Ctrl + ,` | Open settings |
| `/` | Focus search |
| `Esc` | Close search/modal |

---

## 🎯 Next Steps

1. ✅ Backend API - COMPLETE
2. 🚧 Frontend API client - IN PROGRESS
3. 🚧 Session hooks - PLANNED
4. 🚧 SessionList component - PLANNED
5. 🚧 ChatTabs component - PLANNED
6. 🚧 Keyboard shortcuts - PLANNED
7. 🚧 Real-time WebSocket sync - PLANNED

---

## 📁 Files to Create

### Backend (✅ Complete)
- ✅ `src/api/session-api.ts` - REST API endpoints
- ✅ Database integration in websocket-server.ts

### Frontend (🚧 To Do)
- [ ] `web/src/api/client.ts` - Axios client
- [ ] `web/src/api/sessions.ts` - Session API calls
- [ ] `web/src/hooks/useSessions.ts` - Session management hook
- [ ] `web/src/hooks/useCurrentSession.ts` - Active session hook
- [ ] `web/src/hooks/useKeyboardShortcuts.ts` - Keyboard shortcuts
- [ ] `web/src/components/SessionList/SessionList.tsx` - Session sidebar
- [ ] `web/src/components/SessionList/SessionItem.tsx` - Session list item
- [ ] `web/src/components/SessionList/SessionSearch.tsx` - Search component
- [ ] `web/src/components/ChatTabs/ChatTabs.tsx` - Tab container
- [ ] `web/src/components/ChatTabs/ChatTab.tsx` - Individual tab
- [ ] `web/src/context/SessionContext.tsx` - Global session state
- [ ] `web/src/types/session.ts` - TypeScript types

---

**Status**: Backend complete, Frontend implementation ready to start!
