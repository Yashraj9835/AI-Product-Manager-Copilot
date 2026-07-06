# AI Product Manager Copilot — Full Architecture & Implementation Plan
### From Absolute Zero → Production-Ready System

---

## 0. High-Level System Overview

**Core idea:** Ingest messy multi-source product data (tickets, feedback, analytics, transcripts) → normalize it → run it through an AI pipeline (classification, clustering, prioritization, generation) → surface it through a dashboard + conversational assistant → output structured artifacts (PRDs, user stories, roadmaps).

**Tech Stack (confirmed from your current setup + extensions needed):**

| Layer | Technology | Why |
|---|---|---|
| Backend API | FastAPI (Python 3.11+) | Async, auto OpenAPI docs, Pydantic validation |
| Database | PostgreSQL 15+ | Relational integrity for workspaces/users/docs + `pgvector` extension for embeddings |
| Task Queue | Celery + Redis | Async ingestion/classification jobs, scheduled analytics pulls |
| Cache/Broker | Redis | Celery broker + result backend + rate limiting + session cache |
| ORM | SQLAlchemy 2.0 (async) + Alembic | Migrations, type-safe models |
| Auth | JWT (access + refresh) via `fastapi-users` or custom, OAuth2 for integrations | Multi-tenant workspace auth |
| LLM Layer | Anthropic Claude API (Sonnet for generation, Haiku for cheap classification) | Core GenAI reasoning |
| Embeddings | `voyage-3` (Anthropic-recommended) or `text-embedding-3-small` stored in `pgvector` | Semantic search, theme clustering, RAG |
| Vector Search | pgvector (start) → Qdrant/Weaviate (scale later) | Similarity search over feedback |
| Frontend | React 18 + TypeScript + Tailwind + shadcn/ui + Zustand | Matches your existing stack preference |
| Charts | Recharts / Tremor | Dashboard visualizations |
| File/Doc export | `python-docx`, `weasyprint` (PDF) | PRD/user story export |
| Real-time | WebSockets (FastAPI native) or Server-Sent Events | Streaming assistant responses, live ingestion status |
| Deployment | Docker Compose (dev) → Kubernetes or Railway/Render (prod) | Portability |
| Observability | Prometheus + Grafana (later), structured logging with `structlog` | Debuggability |
| Object storage | S3-compatible (MinIO for local dev, AWS S3 prod) | Transcripts, attachments, exported docs |

---

## 1. System Architecture Diagram (textual)

```
                              ┌─────────────────────────┐
                              │      React Frontend      │
                              │ (Dashboard, Assistant UI,│
                              │  Roadmap board, PRD view)│
                              └────────────┬─────────────┘
                                           │ REST + WS
                              ┌────────────▼─────────────┐
                              │       FastAPI Gateway     │
                              │  (Auth, routing, validation)
                              └──┬───────┬───────┬────────┘
             ┌───────────────────┘       │       └───────────────────┐
             │                           │                           │
  ┌──────────▼─────────┐    ┌────────────▼────────────┐   ┌──────────▼─────────┐
  │  Ingestion Service   │    │   AI Orchestration Layer │   │  Reporting Service  │
  │ (tickets, feedback,  │    │ (classification, cluster-│   │ (dashboards, exports│
  │  analytics, meetings)│    │  ing, prioritization,    │   │  scheduled digests) │
  └──────────┬────────────┘   │  PRD/story generation,   │   └──────────┬─────────┘
             │                │  conversational RAG)     │              │
             │                └────────────┬─────────────┘              │
             │                             │                            │
      ┌──────▼─────────────────────────────▼────────────────────────────▼──────┐
      │                          Celery Workers (Redis broker)                   │
      │   ingestion_tasks | classification_tasks | embedding_tasks |             │
      │   prioritization_tasks | generation_tasks | analytics_sync_tasks         │
      └──────────────────────────────┬──────────────────────────────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │           PostgreSQL 15              │
                    │  (core tables + pgvector embeddings) │
                    └─────────────────┬──────────────────┘
                                      │
                    ┌─────────────────▼──────────────────┐
                    │        S3 / MinIO Object Storage     │
                    │ (raw transcripts, exported docs, PDFs)│
                    └───────────────────────────────────────┘

External integrations (via connector adapters): Zendesk, Intercom, Jira,
Slack, Google Analytics/Mixpanel/Amplitude, Zoom/Otter (transcripts),
App Store/Play Store review scrapers.
```

---

## 2. Database Schema (PostgreSQL)

Core tables — this is the backbone. Build this first; every module hangs off it.

```sql
-- ===== Workspace & Auth =====
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    plan VARCHAR(50) DEFAULT 'free'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('owner','admin','pm','viewer')) DEFAULT 'pm',
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- ===== Data Sources & Ingestion =====
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type VARCHAR(50) CHECK (source_type IN
        ('zendesk','intercom','jira','csv_upload','api_generic',
         'analytics_ga','analytics_mixpanel','meeting_transcript','app_review')),
    config JSONB,             -- API keys/tokens (encrypted at rest), sync settings
    last_synced_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE raw_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    external_id VARCHAR(255),         -- id in source system, for dedup
    item_type VARCHAR(50),            -- ticket, review, feedback, transcript_chunk
    raw_content TEXT NOT NULL,
    raw_metadata JSONB,                -- author, timestamp, channel, rating etc
    ingested_at TIMESTAMPTZ DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    UNIQUE(data_source_id, external_id)
);

-- ===== Feedback / Theme Extraction =====
CREATE TABLE feedback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    raw_item_id UUID REFERENCES raw_items(id) ON DELETE CASCADE,
    cleaned_text TEXT,
    sentiment VARCHAR(20),             -- positive/negative/neutral/mixed
    sentiment_score FLOAT,
    category VARCHAR(100),             -- bug, feature_request, praise, question, churn_risk
    embedding VECTOR(1536),            -- pgvector column
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    representative_embedding VECTOR(1536),
    item_count INT DEFAULT 0,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    trend_direction VARCHAR(20)         -- rising/falling/stable
);

CREATE TABLE feedback_theme_map (
    feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
    relevance_score FLOAT,
    PRIMARY KEY (feedback_id, theme_id)
);

-- ===== Feature Requests & Prioritization =====
CREATE TABLE feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(500),
    description TEXT,
    status VARCHAR(50) DEFAULT 'new',  -- new, under_review, planned, in_progress, shipped, rejected
    source_theme_id UUID REFERENCES themes(id),
    request_count INT DEFAULT 1,       -- how many raw items map to this
    impact_score FLOAT,                -- computed: reach x severity x business value
    effort_estimate VARCHAR(20),       -- S/M/L/XL (or story points)
    rice_reach INT,
    rice_impact FLOAT,
    rice_confidence FLOAT,
    rice_effort FLOAT,
    rice_score FLOAT,                  -- computed RICE
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feature_request_sources (
    feature_request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE,
    feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE,
    PRIMARY KEY (feature_request_id, feedback_id)
);

-- ===== Analytics Integration =====
CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id),
    metric_name VARCHAR(100),          -- dau, retention_d7, feature_adoption_x
    metric_value FLOAT,
    dimension JSONB,                    -- e.g. {"feature": "export_csv", "cohort": "enterprise"}
    recorded_at TIMESTAMPTZ
);

-- ===== PRD & User Stories =====
CREATE TABLE prds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    feature_request_id UUID REFERENCES feature_requests(id),
    title VARCHAR(500),
    content_markdown TEXT,             -- full generated PRD
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_review, approved
    generated_by_model VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    version INT DEFAULT 1
);

CREATE TABLE user_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prd_id UUID REFERENCES prds(id) ON DELETE CASCADE,
    story_text TEXT,                   -- "As a ... I want ... so that ..."
    acceptance_criteria JSONB,         -- array of criteria strings
    priority VARCHAR(20),
    story_points INT,
    order_index INT
);

-- ===== Roadmap =====
CREATE TABLE roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    feature_request_id UUID REFERENCES feature_requests(id),
    quarter VARCHAR(20),               -- "2026-Q3"
    lane VARCHAR(100),                 -- "Growth", "Platform", "Core"
    status VARCHAR(50) DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    order_index INT
);

-- ===== Conversational Assistant =====
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20),                  -- user/assistant
    content TEXT,
    retrieved_context JSONB,           -- which feedback/theme ids were used (RAG trace)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedback_embedding ON feedback_items USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_raw_items_workspace ON raw_items(workspace_id, processed);
CREATE INDEX idx_feature_requests_workspace ON feature_requests(workspace_id, status);
```

---

## 3. Module-by-Module Breakdown

### Module 1 — User Authentication & Workspace Management
- **Endpoints:** `/auth/signup`, `/auth/login`, `/auth/refresh`, `/workspaces`, `/workspaces/{id}/members`, `/workspaces/{id}/invite`
- **Design:** JWT access token (15 min) + refresh token (7 days, httpOnly cookie). Role-based access control middleware checks `workspace_members.role` on every request via a dependency injection `get_current_workspace_role()`.
- **Multi-tenancy:** every query filtered by `workspace_id` — enforce via a SQLAlchemy session-level filter or a `require_workspace` FastAPI dependency, never trust `workspace_id` from the client body alone.

### Module 2 — Customer Feedback & Support Ticket Ingestion
- **Adapters pattern:** one adapter class per source (`ZendeskAdapter`, `IntercomAdapter`, `CSVAdapter`, `AppReviewAdapter`) implementing a common `fetch_since(timestamp) -> list[RawItem]` interface.
- **Celery beat schedule:** periodic sync task per `data_source` (e.g. every 30 min for tickets, daily for reviews).
- **Dedup:** `UNIQUE(data_source_id, external_id)` on `raw_items` — upsert on conflict.
- **CSV/manual upload:** direct FastAPI upload endpoint → stream-parsed → inserted as `raw_items` with `item_type='feedback'`.

### Module 3 — Product Analytics Data Integration
- **Adapters:** `MixpanelAdapter`, `AmplitudeAdapter`, `GA4Adapter` — pull aggregate metrics (DAU/WAU/MAU, feature adoption, funnel drop-off, retention cohorts) into `analytics_metrics`.
- **Use case:** feed into impact scoring (Module 6) — e.g. "how many users touched the feature area this pain point relates to."
- **Read-only, scheduled Celery task, daily granularity is enough for v1.**

### Module 4 — Feedback Classification & Theme Extraction Engine
This is the first real AI module. Pipeline (Celery task chain per batch of unprocessed `raw_items`):
1. **Clean & normalize** text (strip HTML, dedupe boilerplate signatures).
2. **Classify** via Claude Haiku (cheap, fast) with structured JSON output: `{sentiment, category, urgency}`.
3. **Embed** cleaned text via embedding model → store in `feedback_items.embedding`.
4. **Cluster into themes:**
   - v1 (fast): nearest-neighbor cosine similarity against existing `themes.representative_embedding`; if similarity > threshold (e.g. 0.82), assign; else create new theme.
   - v2 (better): periodic batch re-clustering (HDBSCAN or KMeans over all embeddings) to merge/split themes, then use Claude to name/describe each cluster.
5. Store theme trend by comparing `item_count` week-over-week → `trend_direction`.

**Example classification prompt (Haiku, structured JSON output):**
```
System: You classify product feedback. Respond ONLY with JSON:
{"sentiment": "positive|negative|neutral|mixed",
 "category": "bug|feature_request|praise|question|churn_risk|other",
 "urgency": "low|medium|high"}

User feedback: "{{cleaned_text}}"
```

### Module 5 — Feature Request Aggregation
- Groups `feedback_items` tagged `category='feature_request'` under `themes` into a single `feature_requests` row.
- **Dedup logic:** when new feedback maps to an existing theme that already has a `feature_request`, increment `request_count` and append to `feature_request_sources` instead of creating a duplicate.
- Manual merge/split UI in frontend for PM override (AI suggests, human confirms — critical for trust).

### Module 6 — AI-Based Prioritization & Impact Analysis Engine
- **Framework: RICE scoring**, computed with AI assistance + human-editable overrides:
  - **Reach** = count of unique users/customers referencing this (from `request_count` + analytics reach if available)
  - **Impact** = Claude-estimated (1-3 scale) based on severity language + churn-risk tagging + revenue-tier of affected customers (if CRM data available)
  - **Confidence** = based on data volume/quality (more sources = higher confidence)
  - **Effort** = PM-entered (S/M/L/XL) or engineering-estimated
  - `rice_score = (reach * impact * confidence) / effort`
- Claude generates a **written rationale** per score (stored alongside) so PMs can sanity-check, not blindly trust the number.
- Output ranked list feeding directly into Module 8 (Roadmap).

### Module 7 — PRD and User Story Generation Module
- **Trigger:** PM selects a `feature_request` → clicks "Generate PRD."
- **RAG context assembly:** pull top-N most relevant `feedback_items` (via embedding similarity to the feature request) + related `analytics_metrics` + theme description → inject into prompt.
- **Generation (Claude Sonnet, longer context):**
  - PRD sections: Problem Statement, Goals/Non-Goals, User Personas Affected, Proposed Solution, Success Metrics, Risks, Open Questions.
  - Then a second call generates **user stories** in `As a [persona], I want [capability], so that [benefit]` format with **acceptance criteria** as Gherkin-style bullet points, stored in `user_stories`.
- **Versioning:** every regeneration bumps `prds.version`, old versions retained (append-only, don't overwrite) for audit trail.
- **Export:** `python-docx` for Word, `weasyprint`/`reportlab` for PDF, or push directly to Jira/Confluence via their APIs (stretch goal).

### Module 8 — Roadmap Planning and Visualization Module
- `roadmap_items` maps `feature_requests` → quarters/lanes.
- Frontend: drag-and-drop Kanban-by-quarter view (or Gantt-style timeline) — React DnD or `@dnd-kit`.
- **AI assist:** "auto-suggest roadmap" endpoint takes top-N RICE-ranked items + team capacity (rough story-point budget per quarter) and proposes an initial quarter assignment — PM can drag to adjust.

### Module 9 — Conversational Product Intelligence Assistant
- Chat interface backed by **RAG over the whole workspace**: user asks "what are our top 3 complaints about onboarding this month?" → embed query → vector search `feedback_items` (filtered by date + workspace) → assemble context → Claude answers with citations back to source tickets.
- Store full trace in `chat_messages.retrieved_context` for transparency/debugging.
- Support tool-calling within the assistant itself: it can call internal functions like `get_theme_trend(theme_id)`, `get_feature_request(id)`, `generate_prd(feature_request_id)` — so it's not just Q&A, it can trigger actions.
- Stream responses via SSE/WebSocket for good UX.

### Module 10 — Reporting and Insights Dashboard
- Weekly auto-generated digest (Celery beat, Sunday night): top rising themes, new high-RICE feature requests, sentiment trend chart, "what changed this week" AI-written summary.
- Dashboard widgets: sentiment over time, theme volume heatmap, RICE-ranked backlog table, roadmap Gantt snapshot.
- Export dashboard as PDF report (stakeholder-shareable).

---

## 4. Backend Folder Structure

```
ai-pm-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app entrypoint
│   │   ├── core/
│   │   │   ├── config.py               # env settings (pydantic-settings)
│   │   │   ├── security.py             # JWT, password hashing
│   │   │   └── celery_app.py           # Celery instance + config
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── models/                 # SQLAlchemy models, 1 file per domain
│   │   │       ├── workspace.py
│   │   │       ├── user.py
│   │   │       ├── ingestion.py
│   │   │       ├── feedback.py
│   │   │       ├── feature_request.py
│   │   │       ├── prd.py
│   │   │       ├── roadmap.py
│   │   │       └── chat.py
│   │   ├── schemas/                    # Pydantic request/response models
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── workspaces.py
│   │   │       ├── ingestion.py
│   │   │       ├── feedback.py
│   │   │       ├── feature_requests.py
│   │   │       ├── prds.py
│   │   │       ├── roadmap.py
│   │   │       ├── chat.py
│   │   │       └── dashboard.py
│   │   ├── adapters/                   # source-specific ingestion adapters
│   │   │   ├── base.py
│   │   │   ├── zendesk.py
│   │   │   ├── intercom.py
│   │   │   ├── csv_upload.py
│   │   │   ├── mixpanel.py
│   │   │   └── app_reviews.py
│   │   ├── ai/
│   │   │   ├── client.py               # Anthropic client wrapper
│   │   │   ├── classification.py       # Module 4 prompts/logic
│   │   │   ├── theming.py              # clustering logic
│   │   │   ├── prioritization.py       # Module 6 RICE + rationale
│   │   │   ├── prd_generation.py       # Module 7
│   │   │   ├── rag.py                  # retrieval logic for Module 9
│   │   │   └── embeddings.py
│   │   ├── tasks/                      # Celery task definitions
│   │   │   ├── ingestion_tasks.py
│   │   │   ├── classification_tasks.py
│   │   │   ├── analytics_tasks.py
│   │   │   └── reporting_tasks.py
│   │   └── deps.py                     # shared FastAPI dependencies (auth, workspace scoping)
│   ├── alembic/                        # migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                      # Dashboard, Feedback, Roadmap, PRD, Chat
│   │   ├── components/
│   │   ├── store/                      # Zustand slices
│   │   ├── api/                        # typed API client
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml                  # postgres, redis, backend, celery worker, celery beat, frontend
└── README.md
```

---

## 5. Phased Implementation Plan (Build Order)

### Phase 0 — Foundation (Week 0-1)
- Docker Compose skeleton: Postgres + Redis + FastAPI + Celery worker/beat + React shell, all talking to each other.
- Alembic migrations from the schema in Section 2 (start with workspaces/users/data_sources/raw_items only — grow schema incrementally).
- Module 1: Auth + workspace CRUD + role middleware. This unblocks everything else.

### Phase 1 — Ingestion Backbone (Week 1-2) — *this is roughly where you are now*
- Module 2: CSV upload adapter first (fastest to test end-to-end), then one real integration (Zendesk or Intercom).
- Module 3: one analytics adapter (start with a mock/generic one if you don't have live credentials yet).
- Celery pipeline: ingest → store `raw_items` → mark `processed=false`. Confirm the async plumbing works before adding AI.

### Phase 2 — Core AI Pipeline (Week 3-4)
- Module 4: classification + embeddings + theme assignment. This is the highest-value module — get it solid before moving on.
- Build a simple "themes" view in frontend just to visually confirm clustering makes sense before trusting downstream modules.

### Phase 3 — Feature Intelligence (Week 5-6)
- Module 5: feature request aggregation off themes.
- Module 6: RICE scoring engine + rationale generation.
- Frontend: prioritized backlog table (sortable by RICE score).

### Phase 4 — Generation & Planning (Week 7-8)
- Module 7: PRD + user story generation (this is your "wow" demo feature — prioritize getting one clean end-to-end generation working over breadth).
- Module 8: roadmap board with drag-and-drop + AI auto-suggest.

### Phase 5 — Assistant & Reporting (Week 9-10)
- Module 9: conversational RAG assistant with streaming + citations.
- Module 10: dashboard widgets + weekly digest automation.

### Phase 6 — Polish & Hardening (Week 11+)
- Rate limiting, error handling/retries on Celery tasks, encrypted credential storage for `data_sources.config` (use `cryptography.fernet` or a secrets manager), test coverage on AI outputs (golden-set evals for classification accuracy), deployment to a real environment.

---

## 6. Key Design Decisions Worth Locking In Early

1. **Encrypt integration credentials** (`data_sources.config`) at the application layer before writing to Postgres — don't rely on DB-level encryption alone.
2. **Always keep raw data** (`raw_items`) even after processing — never mutate/delete source-of-truth; derived tables (`feedback_items`, `themes`) can be rebuilt/reprocessed if your classification logic improves later.
3. **Human-in-the-loop everywhere AI outputs feed decisions** — theme merges, RICE scores, PRD drafts should all be editable/overridable, never auto-applied silently. This is what makes it a "copilot" not an autopilot, and it's what stakeholders will trust.
4. **Cost control:** use Haiku for high-volume classification (cheap, fast), reserve Sonnet for PRD/story generation and the conversational assistant (higher quality reasoning needed). Batch classification calls where possible.
5. **Idempotent ingestion:** every adapter sync must be safely re-runnable without creating duplicates (the `UNIQUE(data_source_id, external_id)` constraint handles this).

---

## 7. Immediate Next Steps From Where You Are

Since Milestone 1 already covers ingestion/preprocessing/categorization scaffolding on FastAPI + PostgreSQL + Celery/Redis, the next concrete actions are:

1. Confirm your `raw_items` and `data_sources` tables match (or extend) the schema above.
2. Get one CSV/manual upload adapter fully working end-to-end (upload → raw_items → Celery task fires → mark processed) before touching real API integrations — this validates the whole async plumbing cheaply.
3. Stub Module 4's classification task with a hardcoded/mock response first, wire the pipeline, then swap in the real Claude call — decouples "is my pipeline correct" from "is my prompt good."

If you want, I can generate the actual FastAPI project skeleton (models, first migration, one working ingestion endpoint + Celery task) as real code next.
