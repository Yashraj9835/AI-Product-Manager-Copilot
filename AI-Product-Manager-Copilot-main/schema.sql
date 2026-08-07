-- AI Product Manager Copilot — Milestone 1 schema
-- PostgreSQL 15+, requires pgvector extension for embeddings

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- Sources: every channel feedback can come from
-- ---------------------------------------------------------------------
CREATE TABLE feedback_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,       -- e.g. 'csv_upload', 'zendesk', 'app_store_ios'
    source_type     VARCHAR(30) NOT NULL,                -- 'upload' | 'api' | 'webhook' | 'scraper'
    config          JSONB DEFAULT '{}',                  -- connector-specific settings (API keys are referenced, not stored here)
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Pipeline runs: one row per ingestion batch, for audit + monitoring
-- ---------------------------------------------------------------------
CREATE TABLE pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES feedback_sources(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
    total_items     INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items    INTEGER DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    error_log       JSONB DEFAULT '[]'
);

-- ---------------------------------------------------------------------
-- Raw feedback: untouched payload as received
-- ---------------------------------------------------------------------
CREATE TABLE raw_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES feedback_sources(id),
    pipeline_run_id UUID REFERENCES pipeline_runs(id),
    external_id     VARCHAR(255),                        -- ID from the origin system (ticket #, review ID)
    raw_text        TEXT NOT NULL,
    raw_payload     JSONB DEFAULT '{}',                   -- full original record (rating, author, timestamps, etc.)
    checksum        VARCHAR(64) NOT NULL,                 -- sha256 of normalized text, used for dedup
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, checksum)
);

CREATE INDEX idx_raw_feedback_checksum ON raw_feedback(checksum);
CREATE INDEX idx_raw_feedback_source ON raw_feedback(source_id);

-- ---------------------------------------------------------------------
-- Processed feedback: cleaned + enriched
-- ---------------------------------------------------------------------
CREATE TABLE processed_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_feedback_id     UUID NOT NULL REFERENCES raw_feedback(id) UNIQUE,
    clean_text          TEXT NOT NULL,
    language            VARCHAR(10),                      -- ISO 639-1
    pii_redacted        BOOLEAN NOT NULL DEFAULT FALSE,
    sentiment_label     VARCHAR(10),                       -- positive | neutral | negative
    sentiment_score     REAL,                              -- -1.0 to 1.0
    urgency_score       REAL,                              -- 0.0 to 1.0, derived heuristic (later: model-based)
    embedding           VECTOR(384),                       -- sentence-transformer embedding for clustering/search
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_processed_feedback_sentiment ON processed_feedback(sentiment_label);
-- ivfflat index for embedding similarity search (build after enough rows exist)
-- CREATE INDEX idx_processed_feedback_embedding ON processed_feedback USING ivfflat (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------
-- Categories: controlled vocabulary
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(50) NOT NULL UNIQUE,           -- 'bug', 'feature_request', 'ux', 'pricing', 'praise', 'other'
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT
);

INSERT INTO categories (slug, display_name, description) VALUES
    ('bug', 'Bug report', 'Something is broken or not working as expected'),
    ('feature_request', 'Feature request', 'A request for new functionality'),
    ('ux', 'UX/usability', 'Feedback about ease of use, confusion, friction'),
    ('pricing', 'Pricing/billing', 'Feedback about cost, plans, billing issues'),
    ('performance', 'Performance', 'Speed, reliability, crashes, downtime'),
    ('praise', 'Praise', 'Positive feedback with no actionable ask'),
    ('other', 'Other', 'Does not fit existing categories');

-- ---------------------------------------------------------------------
-- Many-to-many: a feedback item can have multiple categories with confidence
-- ---------------------------------------------------------------------
CREATE TABLE feedback_categories (
    processed_feedback_id  UUID NOT NULL REFERENCES processed_feedback(id) ON DELETE CASCADE,
    category_id             INTEGER NOT NULL REFERENCES categories(id),
    confidence               REAL NOT NULL DEFAULT 1.0,    -- 0.0 to 1.0
    assigned_by               VARCHAR(20) NOT NULL DEFAULT 'rule_based', -- rule_based | ml_model | human
    PRIMARY KEY (processed_feedback_id, category_id)
);

CREATE INDEX idx_feedback_categories_category ON feedback_categories(category_id);
