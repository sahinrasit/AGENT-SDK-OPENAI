-- IBTech Agent Platform - Database Schema
-- PostgreSQL 16+
-- Created: 2025-01-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp extension
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'developer')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- CHAT SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    agent_type VARCHAR(100),
    context JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for chat_sessions
CREATE INDEX idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_sessions_status ON chat_sessions(status);
CREATE INDEX idx_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_sessions_last_message ON chat_sessions(last_message_at DESC NULLS LAST);
CREATE INDEX idx_sessions_agent_type ON chat_sessions(agent_type);
CREATE INDEX idx_sessions_pinned ON chat_sessions(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_sessions_user_status ON chat_sessions(user_id, status);

-- Full-text search on title and description
CREATE INDEX idx_sessions_title_search ON chat_sessions USING gin(to_tsvector('english', title));
CREATE INDEX idx_sessions_desc_search ON chat_sessions USING gin(to_tsvector('english', description));

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'json', 'markdown', 'code')),
    agent_type VARCHAR(100),
    tool_calls JSONB,
    tool_results JSONB,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER,
    model VARCHAR(100),
    is_error BOOLEAN DEFAULT FALSE,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for messages
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);

-- Full-text search on content
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- ============================================================================
-- TOOL EXECUTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tool_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_type VARCHAR(50),
    input_parameters JSONB NOT NULL,
    output_result JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    success BOOLEAN,
    error_message TEXT,
    error_stack TEXT,
    execution_time_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for tool_executions
CREATE INDEX idx_tools_session_id ON tool_executions(session_id);
CREATE INDEX idx_tools_message_id ON tool_executions(message_id);
CREATE INDEX idx_tools_tool_name ON tool_executions(tool_name);
CREATE INDEX idx_tools_status ON tool_executions(status);
CREATE INDEX idx_tools_started_at ON tool_executions(started_at DESC);
CREATE INDEX idx_tools_success ON tool_executions(success);

-- ============================================================================
-- AGENT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    request_id VARCHAR(100),
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
    log_type VARCHAR(50) NOT NULL CHECK (log_type IN ('agent_request', 'agent_response', 'tool_execution', 'error', 'metric', 'trace')),
    agent_type VARCHAR(100),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for agent_logs
CREATE INDEX idx_logs_session_id ON agent_logs(session_id);
CREATE INDEX idx_logs_message_id ON agent_logs(message_id);
CREATE INDEX idx_logs_request_id ON agent_logs(request_id);
CREATE INDEX idx_logs_level ON agent_logs(log_level);
CREATE INDEX idx_logs_type ON agent_logs(log_type);
CREATE INDEX idx_logs_timestamp ON agent_logs(timestamp DESC);
CREATE INDEX idx_logs_agent_type ON agent_logs(agent_type);

-- Partitioning by month for logs (optional, for high volume)
-- CREATE TABLE agent_logs_y2025m01 PARTITION OF agent_logs
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    value NUMERIC NOT NULL,
    unit VARCHAR(50),
    tags JSONB DEFAULT '{}'::jsonb,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance_metrics
CREATE INDEX idx_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_metrics_session_id ON performance_metrics(session_id);

-- Hypertable for TimescaleDB (if using TimescaleDB extension)
-- SELECT create_hypertable('performance_metrics', 'timestamp', if_not_exists => TRUE);

-- ============================================================================
-- USER SESSIONS TABLE (Authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Auto-cleanup expired sessions
CREATE INDEX idx_user_sessions_cleanup ON user_sessions(expires_at) WHERE expires_at < CURRENT_TIMESTAMP;

-- ============================================================================
-- ATTACHMENTS TABLE (for file uploads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 hash
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for attachments
CREATE INDEX idx_attachments_session_id ON attachments(session_id);
CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_hash ON attachments(file_hash);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update message count and last_message_at on chat_sessions
CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at,
        total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0)
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_message_count AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_session_on_message();

-- Update session on tool execution completion
CREATE OR REPLACE FUNCTION update_session_on_tool_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
        UPDATE chat_sessions
        SET total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0)
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tokens_on_tool AFTER UPDATE ON tool_executions
    FOR EACH ROW EXECUTE FUNCTION update_session_on_tool_completion();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active sessions with latest message
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT
    s.id,
    s.user_id,
    s.title,
    s.agent_type,
    s.message_count,
    s.total_tokens_used,
    s.last_message_at,
    s.created_at,
    s.is_pinned,
    u.username,
    u.email,
    m.content as last_message_content,
    m.role as last_message_role
FROM chat_sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN LATERAL (
    SELECT content, role
    FROM messages
    WHERE session_id = s.id
    ORDER BY created_at DESC
    LIMIT 1
) m ON TRUE
WHERE s.status = 'active'
ORDER BY s.last_message_at DESC NULLS LAST;

-- Tool execution statistics
CREATE OR REPLACE VIEW tool_execution_stats AS
SELECT
    tool_name,
    COUNT(*) as total_executions,
    SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful_executions,
    SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed_executions,
    AVG(execution_time_ms) as avg_execution_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time_ms,
    SUM(tokens_used) as total_tokens_used
FROM tool_executions
WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY tool_name
ORDER BY total_executions DESC;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.id,
    u.username,
    u.email,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
    SUM(s.message_count) as total_messages,
    SUM(s.total_tokens_used) as total_tokens_used,
    MAX(s.last_message_at) as last_activity_at
FROM users u
LEFT JOIN chat_sessions s ON u.id = s.user_id
GROUP BY u.id, u.username, u.email
ORDER BY last_activity_at DESC NULLS LAST;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Search sessions by title and description
CREATE OR REPLACE FUNCTION search_sessions(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    session_id UUID,
    title VARCHAR(255),
    description TEXT,
    message_count INTEGER,
    last_message_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.description,
        s.message_count,
        s.last_message_at,
        ts_rank(
            to_tsvector('english', s.title || ' ' || COALESCE(s.description, '')),
            plainto_tsquery('english', p_query)
        ) as rank
    FROM chat_sessions s
    WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND (
            to_tsvector('english', s.title || ' ' || COALESCE(s.description, ''))
            @@ plainto_tsquery('english', p_query)
        )
    ORDER BY rank DESC, s.last_message_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Archive old sessions
CREATE OR REPLACE FUNCTION archive_old_sessions(
    p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE chat_sessions
    SET status = 'archived',
        archived_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
        AND last_message_at < CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs(
    p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM agent_logs
    WHERE timestamp < CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (for development only)
-- ============================================================================

-- Insert default admin user (password: admin123)
-- Hash generated with bcrypt rounds=12
INSERT INTO users (email, username, password_hash, full_name, role, email_verified)
VALUES (
    'admin@ibtech.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyxnJkrqO9Z6', -- admin123
    'System Administrator',
    'admin',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- GRANTS (adjust based on your user)
-- ============================================================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ibtech_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ibtech_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ibtech_app;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts and authentication information';
COMMENT ON TABLE chat_sessions IS 'Chat sessions with conversation metadata';
COMMENT ON TABLE messages IS 'Individual messages within chat sessions';
COMMENT ON TABLE tool_executions IS 'Execution logs for agent tools';
COMMENT ON TABLE agent_logs IS 'Detailed logging for agent operations';
COMMENT ON TABLE performance_metrics IS 'Time-series performance metrics';
COMMENT ON TABLE user_sessions IS 'Active user authentication sessions';
COMMENT ON TABLE attachments IS 'File attachments in conversations';

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Create scheduled job for cleanup (using pg_cron if available)
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_logs(30)');
-- SELECT cron.schedule('archive-old-sessions', '0 3 * * 0', 'SELECT archive_old_sessions(90)');

COMMENT ON DATABASE ibtech_agent IS 'IBTech Agent Platform Database - Version 1.0';
