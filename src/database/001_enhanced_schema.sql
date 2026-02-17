-- MemoryMesh Enhanced - Complete Database Schema
-- Multi-AI Provider Support with Advanced Features

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'pro_monthly', 'lifetime');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'grace_period', 'trial');
CREATE TYPE memory_source_type AS ENUM ('voice', 'text', 'image', 'code', 'import', 'screenshot');
CREATE TYPE ai_provider AS ENUM ('claude', 'kimi', 'openai', 'ensemble');
CREATE TYPE notification_trigger_type AS ENUM ('time', 'location', 'context', 'ai_suggestion', 'pattern', 'streak');
CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral', 'mixed');

-- ============================================================================
-- USERS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Security
    encrypted_master_key TEXT NOT NULL,
    encryption_salt VARCHAR(64) NOT NULL,
    biometric_enabled BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    
    -- Subscription
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_status subscription_status DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    
    -- Preferences (Enhanced with AI settings)
    preferences JSONB DEFAULT '{
        "theme": "holographic",
        "ai_personality": "friendly",
        "preferred_ai_provider": "ensemble",
        "notifications_enabled": true,
        "biometric_auth": false,
        "auto_transcribe": true,
        "language": "en",
        "proactive_frequency": "medium",
        "ai_providers": {
            "claude_enabled": true,
            "kimi_enabled": true,
            "openai_enabled": true,
            "use_ensemble": true
        },
        "voice_settings": {
            "auto_punctuation": true,
            "speaker_diarization": false,
            "noise_reduction": true
        },
        "privacy": {
            "analytics_enabled": true,
            "share_anonymous_data": false,
            "encrypt_transcriptions": false
        }
    }'::jsonb,
    
    -- Usage tracking
    memory_count INTEGER DEFAULT 0,
    monthly_memory_count INTEGER DEFAULT 0,
    last_memory_reset_at TIMESTAMPTZ DEFAULT NOW(),
    total_ai_requests INTEGER DEFAULT 0,
    
    -- AI Provider usage stats
    ai_usage_stats JSONB DEFAULT '{
        "claude": {"requests": 0, "tokens": 0},
        "kimi": {"requests": 0, "tokens": 0},
        "openai": {"requests": 0, "tokens": 0}
    }'::jsonb,
    
    -- Expo push token for notifications
    expo_push_token TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_status) WHERE subscription_tier != 'free';
CREATE INDEX idx_users_active ON users(last_active_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_trial ON users(trial_ends_at) WHERE subscription_status = 'trial';

-- ============================================================================
-- MEMORIES TABLE (Enhanced with Multi-AI Support)
-- ============================================================================

CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content (encrypted client-side)
    content_encrypted TEXT NOT NULL,
    encryption_iv VARCHAR(64) NOT NULL,
    encryption_auth_tag VARCHAR(64),
    
    -- AI Processing Results (from multiple providers)
    transcription TEXT,
    transcription_language VARCHAR(10) DEFAULT 'en',
    transcription_confidence DECIMAL(3,2) DEFAULT 0.95,
    
    -- AI-generated metadata (ensemble or single provider)
    ai_summary TEXT,
    ai_title VARCHAR(255),
    ai_provider ai_provider DEFAULT 'ensemble',
    ai_confidence DECIMAL(3,2) DEFAULT 0.90,
    
    -- Context extraction (can be from multiple AIs)
    context_tags TEXT[] DEFAULT '{}',
    people TEXT[] DEFAULT '{}',
    places TEXT[] DEFAULT '{}',
    dates TEXT[] DEFAULT '{}',
    tasks TEXT[] DEFAULT '{}',
    emotions TEXT[] DEFAULT '{}',
    
    -- Advanced AI analysis
    category VARCHAR(50), -- work|personal|ideas|learning|health|finance|social|code
    sentiment sentiment_type DEFAULT 'neutral',
    priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 5),
    emotion_intensity DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Code-specific fields (from Kimi)
    code_language VARCHAR(50),
    code_purpose TEXT,
    code_documentation TEXT,
    
    -- Translation support (from Kimi)
    translations JSONB DEFAULT '{}'::jsonb, -- {"es": "Spanish text", "fr": "French text"}
    
    -- Rich media
    media_type memory_source_type DEFAULT 'text',
    audio_url TEXT,
    audio_duration INTEGER,
    image_urls TEXT[] DEFAULT '{}',
    
    -- Location data (PostGIS)
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    location_accuracy DECIMAL(10,2),
    
    -- Reminders
    reminder_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_type notification_trigger_type,
    
    -- Vector embeddings (from multiple providers)
    embedding_openai vector(1536), -- OpenAI ada-002
    embedding_claude vector(1024), -- Claude embeddings (if available)
    embedding_kimi vector(768), -- Kimi embeddings
    
    -- Pinecone sync
    synced_to_pinecone BOOLEAN DEFAULT false,
    pinecone_id TEXT UNIQUE,
    pinecone_namespace VARCHAR(100),
    
    -- User organization
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    color_tag VARCHAR(7),
    custom_tags TEXT[] DEFAULT '{}',
    
    -- Collaboration
    is_shared BOOLEAN DEFAULT false,
    share_count INTEGER DEFAULT 0,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    edit_count INTEGER DEFAULT 0,
    
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(ai_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(transcription, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(ai_summary, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(context_tags, ' ')), 'D')
    ) STORED,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_memories_user_created ON memories(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_user_updated ON memories(user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_context_tags ON memories USING GIN(context_tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_people ON memories USING GIN(people) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_places ON memories USING GIN(places) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_custom_tags ON memories USING GIN(custom_tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_reminder ON memories(reminder_at) WHERE reminder_at IS NOT NULL AND reminder_sent = FALSE;
CREATE INDEX idx_memories_location ON memories USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX idx_memories_category ON memories(user_id, category, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_sentiment ON memories(user_id, sentiment, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_priority ON memories(user_id, priority DESC, created_at DESC) WHERE priority > 0;
CREATE INDEX idx_memories_archived ON memories(user_id, is_archived, created_at DESC);
CREATE INDEX idx_memories_favorites ON memories(user_id, is_favorite DESC, created_at DESC) WHERE is_favorite = TRUE;
CREATE INDEX idx_memories_search_vector ON memories USING GIN(search_vector);
CREATE INDEX idx_memories_search_trigram ON memories USING GIN(transcription gin_trgm_ops); -- Fuzzy search

-- Vector similarity indexes
CREATE INDEX idx_memories_embedding_openai ON memories USING ivfflat (embedding_openai vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memories_embedding_claude ON memories USING ivfflat (embedding_claude vector_cosine_ops) WITH (lists = 100) WHERE embedding_claude IS NOT NULL;
CREATE INDEX idx_memories_embedding_kimi ON memories USING ivfflat (embedding_kimi vector_cosine_ops) WITH (lists = 100) WHERE embedding_kimi IS NOT NULL;

-- ============================================================================
-- AI PROCESSING LOG (Track AI usage per memory)
-- ============================================================================

CREATE TABLE ai_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    provider ai_provider NOT NULL,
    operation VARCHAR(50) NOT NULL, -- transcription|context_extraction|embedding|translation|code_analysis
    
    -- Cost tracking
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    
    -- Performance metrics
    duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Request/Response
    request_payload JSONB,
    response_payload JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_log_memory ON ai_processing_log(memory_id, created_at DESC);
CREATE INDEX idx_ai_log_user ON ai_processing_log(user_id, created_at DESC);
CREATE INDEX idx_ai_log_provider ON ai_processing_log(provider, created_at DESC);

-- ============================================================================
-- CONTEXTS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'brain',
    color VARCHAR(7) DEFAULT '#00F5FF',
    
    -- AI-detected patterns
    pattern_type VARCHAR(50), -- location|time|person|activity|code_language
    pattern_data JSONB DEFAULT '{}'::jsonb,
    auto_detected BOOLEAN DEFAULT true,
    
    -- Statistics
    memory_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_contexts_user ON contexts(user_id, created_at DESC);
CREATE INDEX idx_contexts_pattern_type ON contexts(pattern_type) WHERE auto_detected = TRUE;

-- ============================================================================
-- NOTIFICATIONS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,
    
    -- Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Trigger info
    trigger_type notification_trigger_type NOT NULL,
    trigger_data JSONB DEFAULT '{}'::jsonb,
    ai_provider ai_provider, -- Which AI generated this notification
    
    -- Delivery
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Engagement
    interacted BOOLEAN DEFAULT false,
    interaction_type VARCHAR(50), -- opened|dismissed|snoozed|acted
    effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 5),
    
    -- A/B testing
    variant VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_scheduled ON notifications(user_id, scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_notifications_user_delivered ON notifications(user_id, delivered_at DESC);
CREATE INDEX idx_notifications_pending ON notifications(scheduled_for) WHERE sent_at IS NULL AND scheduled_for <= NOW();
CREATE INDEX idx_notifications_effectiveness ON notifications(user_id, effectiveness_score DESC) WHERE effectiveness_score IS NOT NULL;

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    plan subscription_tier NOT NULL,
    status subscription_status NOT NULL,
    
    -- RevenueCat integration
    revenue_cat_id VARCHAR(100) UNIQUE,
    product_id VARCHAR(100),
    store VARCHAR(20), -- app_store|play_store|stripe
    
    -- Dates
    started_at TIMESTAMPTZ NOT NULL,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    
    -- Pricing
    price_usd DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Metadata
    auto_renew BOOLEAN DEFAULT true,
    cancel_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status, current_period_end);
CREATE INDEX idx_subscriptions_trial ON subscriptions(trial_ends_at) WHERE status = 'trial';
CREATE INDEX idx_subscriptions_revenue_cat ON subscriptions(revenue_cat_id);

-- ============================================================================
-- ANALYTICS EVENTS TABLE (Partitioned by month)
-- ============================================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    
    properties JSONB DEFAULT '{}'::jsonb,
    
    session_id UUID,
    device_info JSONB DEFAULT '{}'::jsonb,
    app_version VARCHAR(20),
    
    duration_ms INTEGER,
    error_message TEXT,
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create partitions for current and next 3 months
CREATE TABLE analytics_events_2025_02 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE analytics_events_2025_03 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE analytics_events_2025_04 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE INDEX idx_analytics_user_time ON analytics_events(user_id, timestamp DESC);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name, timestamp DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id, timestamp);

-- ============================================================================
-- MEMORY SHARES TABLE
-- ============================================================================

CREATE TABLE memory_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    share_type VARCHAR(20) CHECK (share_type IN ('link', 'email', 'user')),
    
    -- Link sharing
    share_token VARCHAR(64) UNIQUE,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    max_views INTEGER,
    
    -- Direct user sharing
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permissions
    can_edit BOOLEAN DEFAULT false,
    can_reshare BOOLEAN DEFAULT false,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_shares_memory ON memory_shares(memory_id, created_at DESC);
CREATE INDEX idx_memory_shares_token ON memory_shares(share_token) WHERE expires_at > NOW();
CREATE INDEX idx_memory_shares_recipient ON memory_shares(shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contexts_updated_at BEFORE UPDATE ON contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update memory count
CREATE OR REPLACE FUNCTION update_memory_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET memory_count = memory_count + 1,
            monthly_memory_count = monthly_memory_count + 1,
            last_active_at = NOW()
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET memory_count = memory_count - 1
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_memory_count
AFTER INSERT OR DELETE ON memories
FOR EACH ROW EXECUTE FUNCTION update_memory_count();

-- Reset monthly counts (cron job function)
CREATE OR REPLACE FUNCTION reset_monthly_memory_counts()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET monthly_memory_count = 0, 
        last_memory_reset_at = NOW()
    WHERE last_memory_reset_at < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Memories policies
CREATE POLICY "Users can CRUD own memories" ON memories
    FOR ALL USING (auth.uid() = user_id);

-- Contexts policies
CREATE POLICY "Users can CRUD own contexts" ON contexts
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can create own analytics" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI processing log policies
CREATE POLICY "Users can view own AI logs" ON ai_processing_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- User engagement metrics
CREATE OR REPLACE VIEW user_engagement_stats AS
SELECT 
    u.id,
    u.email,
    u.subscription_tier,
    u.memory_count,
    u.monthly_memory_count,
    COUNT(DISTINCT DATE(m.created_at)) as active_days,
    COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as memories_last_7_days,
    COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as memories_last_30_days,
    MAX(m.created_at) as last_memory_at,
    u.last_active_at
FROM users u
LEFT JOIN memories m ON u.id = m.user_id AND m.deleted_at IS NULL
GROUP BY u.id;

-- AI provider usage stats
CREATE OR REPLACE VIEW ai_provider_usage AS
SELECT 
    provider,
    operation,
    COUNT(*) as request_count,
    SUM(tokens_used) as total_tokens,
    SUM(cost_usd) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as success_rate
FROM ai_processing_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY provider, operation;

-- ============================================================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================================================

CREATE INDEX idx_memories_created_date ON memories(user_id, DATE(created_at));
CREATE INDEX idx_ai_log_stats ON ai_processing_log(provider, operation, created_at DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with multi-AI preferences and encryption settings';
COMMENT ON TABLE memories IS 'Core memory storage with multi-AI provider support and vector embeddings';
COMMENT ON TABLE ai_processing_log IS 'Tracks all AI provider usage for cost monitoring and analytics';
COMMENT ON TABLE contexts IS 'User-defined and AI-detected contextual patterns';
COMMENT ON TABLE notifications IS 'Proactive notification system with AI-generated suggestions';
COMMENT ON TABLE subscriptions IS 'RevenueCat integrated subscription management';
COMMENT ON TABLE analytics_events IS 'User behavior analytics (partitioned by month)';
COMMENT ON TABLE memory_shares IS 'Collaborative memory sharing with encryption-aware links';
