# Bayan — Complete Setup & Developer Guide

End-to-end guide covering environment setup, database, ingestion, running the API, running the frontend, and testing every endpoint.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Database — Docker + pgvector](#3-database--docker--pgvector)
4. [Schema Migration — Alembic](#4-schema-migration--alembic)
5. [Ingestion Pipeline](#5-ingestion-pipeline)
6. [Running the Backend](#6-running-the-backend)
7. [Running the Frontend](#7-running-the-frontend)
8. [Testing the API](#8-testing-the-api)
9. [Running Everything Together](#9-running-everything-together)
10. [Production Deployment](#10-production-deployment)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Docker + Docker Compose | v24+ | Postgres + pgvector |
| Python | 3.12+ | Backend |
| Bun | 1.x | Frontend |
| `quran-data/` folder | — | Source data for ingestion |

API keys needed (add to `.env`):
- **OpenAI** — for generating embeddings (`text-embedding-3-large`)
- **Anthropic** — for Claude RAG (outline + verify)

---

## 2. Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
POSTGRES_PASSWORD=choose_a_strong_password
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://tibyan:your_password@localhost:5432/tibyan
```

> `DATABASE_URL` uses `localhost` when running Python directly outside Docker.
> Inside Docker Compose it uses `db` as the host — that's already set in `docker-compose.yml`.

---

## 3. Database — Docker + pgvector

### Start Postgres

```bash
docker compose up db -d
```

This starts a `pgvector/pgvector:pg16` container and automatically runs `backend/init.sql` on first boot, which installs:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Verify extensions are installed

```bash
docker compose exec db psql -U tibyan -d tibyan -c "\dx"
```

Expected output includes `pg_trgm` and `vector` in the list.

---

## 4. Schema Migration — Alembic

Run once after the DB is up. This creates all tables, indexes (HNSW for vector search, GIN for full-text), and constraints.

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### Verify tables were created

```bash
docker compose exec db psql -U tibyan -d tibyan -c "\dt"
```

You should see: `surahs`, `verses`, `translations`, `tafsirs`, `topics`, `verse_topics`, `themes`, `verse_themes`, `verse_embeddings`, `tafsir_embeddings`, `verse_similarities`, `mutashabihat_phrases`, `mutashabihat_occurrences`.

---

## 5. Ingestion Pipeline

The ingestion pipeline loads all Quran data from `quran-data/` into Postgres. It runs **once**. Scripts are numbered and must run in order.

### What each script does

| Script | Source | Loads |
|---|---|---|
| `01_load_surahs.py` | `quran-metadata-surah-name.json` | 114 surah rows (name, Arabic, revelation place, ayah count) |
| `02_load_verses.py` | `Quran metadata/` | 6,236 verses with juz, hizb, ruku, sajda, stripped Arabic text |
| `03_fetch_translations.py` | quran.com API v4 (Translation ID 20) | Saheeh International English translations |
| `04_load_tafsirs.py` | `Tafsirs/` | Ibn Kathir (EN), Ibn Uthaymeen (AR), al-Sa'di (AR + Albanian) |
| `05_load_topics_sqlite.py` | `Topics and Concepts in Quran/topics.db` | Topics + verse-topic mappings (adaptive SQLite schema) |
| `06_load_themes_sqlite.py` | `Ayah Theme/ayah-themes.db` | Themes + verse-theme mappings |
| `07_load_similar_ayah.py` | `Similar Ayah/matching-ayah.json` | Verse similarity pairs |
| `08_load_mutashabihat.py` | `Mutashabihat ul Quran/phrases.json` | Similar-wording phrase groups |
| `09_load_surah_info.py` | `Surah Info/` | Extended surah HTML descriptions |
| `10_generate_embeddings.py` | OpenAI API | 3 embedding types per verse + tafsir chunks (~$1.50 total) |

### Option A — Run all at once via Docker

```bash
docker compose --profile ingestion up ingestion
```

Logs stream to the terminal. The container exits when done.

### Option B — Run scripts individually (recommended for debugging)

```bash
cd backend
export DATABASE_URL=postgresql://tibyan:your_password@localhost:5432/tibyan

python ingestion/01_load_surahs.py
python ingestion/02_load_verses.py
python ingestion/03_fetch_translations.py
python ingestion/04_load_tafsirs.py
python ingestion/05_load_topics_sqlite.py
python ingestion/06_load_themes_sqlite.py
python ingestion/07_load_similar_ayah.py
python ingestion/08_load_mutashabihat.py
python ingestion/09_load_surah_info.py
python ingestion/10_generate_embeddings.py   # slowest — calls OpenAI
```

### Notes on script 10 (embeddings)

- Calls OpenAI `text-embedding-3-large` at 3072 dimensions
- Generates 3 types per verse: `composite` (Arabic + translation + tafsir excerpt), `arabic_only`, `translation`
- Also chunks Ibn Kathir tafsir into 400-token chunks with 50-token overlap
- **Resumable** — re-running skips already-embedded verses
- Estimated cost: ~$1.50 for the full corpus

### Verify ingestion

```bash
docker compose exec db psql -U tibyan -d tibyan -c "
  SELECT 'surahs' AS table, COUNT(*) FROM surahs
  UNION ALL SELECT 'verses', COUNT(*) FROM verses
  UNION ALL SELECT 'translations', COUNT(*) FROM translations
  UNION ALL SELECT 'embeddings', COUNT(*) FROM verse_embeddings;
"
```

Expected counts: 114 surahs · 6,236 verses · 6,236 translations · ~18,700 embeddings (3 per verse).

---

## 6. Running the Backend

### Directly (recommended for development)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Via Docker Compose

```bash
docker compose up api
```

### Health check

```bash
curl http://localhost:8000/health
# → {"status": "ok"}
```

Interactive API docs: `http://localhost:8000/docs`

---

## 7. Running the Frontend

```bash
cd frontend
bun install      # first time only
bun run dev
# → http://localhost:5173
```

The Vite dev server proxies `/search`, `/verify`, `/outline` to `localhost:8000` automatically — no CORS config needed in development.

---

## 8. Testing the API

### `/health`

```bash
curl http://localhost:8000/health
```

```json
{"status": "ok"}
```

---

### `POST /search` — Semantic + keyword hybrid search

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "patience during hardship",
    "top_k": 5,
    "filters": {},
    "include_tafsir": true,
    "tafsir_slug": "ibn-kathir"
  }'
```

**With filters:**

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gratitude and thankfulness",
    "top_k": 3,
    "filters": {
      "revelation_place": "makkah",
      "juz": 30
    }
  }'
```

**Expected response shape:**

```json
{
  "query": "patience during hardship",
  "results": [
    {
      "verse_key": "2:155",
      "surah_name": "Al-Baqarah",
      "surah_name_arabic": "البقرة",
      "text_arabic": "وَلَنَبْلُوَنَّكُم...",
      "translation": {"text": "And We will surely test you...", "translator": "Sahih International"},
      "scores": {"semantic": 0.821, "keyword": 0.043, "hybrid": 0.577},
      "topics": ["Trials", "Patience"],
      "similar_verses": ["3:200", "39:10"]
    }
  ],
  "total": 5,
  "search_time_ms": 142
}
```

---

### `POST /verify` — Citation verification

**Arabic input:**

```bash
curl -X POST http://localhost:8000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    "language": "ar"
  }'
```

**English input:**

```bash
curl -X POST http://localhost:8000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Indeed with hardship comes ease",
    "language": "en"
  }'
```

**Expected response shape:**

```json
{
  "input_text": "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
  "verification_status": "verified_exact",
  "confidence": 0.97,
  "matches": [
    {
      "verse_key": "94:6",
      "surah_name": "Ash-Sharh",
      "text_arabic": "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      "translation": "Indeed, with hardship will be ease.",
      "match_type": "exact",
      "similarity_score": 0.961
    }
  ],
  "claude_analysis": "This is a verbatim match to Surah Ash-Sharh 94:6...",
  "warning": null
}
```

**Status values:**
- `verified_exact` — close/exact wording match
- `verified_paraphrase` — similar meaning, reworded
- `not_found` — no match in corpus

---

### `POST /outline` — Khutbah outline generation

```bash
curl -X POST http://localhost:8000/outline \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "The importance of brotherhood in Islam",
    "khutbah_style": "friday",
    "target_duration_minutes": 20,
    "include_tafsir_depth": "brief"
  }'
```

**Options:**
- `khutbah_style`: `"friday"` or `"eid"`
- `target_duration_minutes`: 10–45
- `include_tafsir_depth`: `"none"` · `"brief"` · `"full"`

**Expected response shape:**

```json
{
  "topic": "The importance of brotherhood in Islam",
  "outline": {
    "title": "Bonds of Brotherhood: Unity in the Ummah",
    "opening_verse": {
      "verse_key": "49:10",
      "text_arabic": "إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ...",
      "translation": "The believers are but brothers...",
      "tafsir_note": "Ibn Kathir notes this verse establishes...",
      "rationale": "Opens with the Quranic foundation of brotherhood"
    },
    "sections": [
      {
        "title": "The Nature of Islamic Brotherhood",
        "talking_points": ["Brotherhood transcends blood...", "..."],
        "supporting_verses": [...]
      }
    ],
    "closing_dua_verse": {...}
  },
  "verses_cited": ["49:10", "3:103", "9:71"],
  "claude_model": "claude-sonnet-4-6",
  "corpus_retrieval_count": 4,
  "warning": null
}
```

> **Note:** The outline endpoint calls Claude with tool use (up to 5 agentic iterations). It takes 15–40 seconds depending on topic complexity — this is expected.

---

### Using the interactive docs

FastAPI auto-generates a full UI at:

```
http://localhost:8000/docs
```

All three endpoints are there with request/response schemas. You can test directly in the browser without writing any curl.

---

## 9. Running Everything Together

Open three terminals:

**Terminal 1 — Database**
```bash
docker compose up db
```

**Terminal 2 — Backend**
```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3 — Frontend**
```bash
cd frontend && bun run dev
```

Then open `http://localhost:5173` (or the Gitpod forwarded URL for port 5173).

---

## 10. Production Deployment

### Recommended stack

| Layer | Service | Notes |
|---|---|---|
| **Database** | [Supabase](https://supabase.com) | Managed Postgres with pgvector built-in, free tier |
| **Backend** | [Railway](https://railway.app) | Docker-native, set env vars in dashboard |
| **Frontend** | [Vercel](https://vercel.com) | Deploy from GitHub, auto HTTPS, global CDN |

### Database (Supabase)

1. Create a project at supabase.com
2. Go to **Settings → Database** and copy the connection string
3. Update `DATABASE_URL` to the Supabase URI
4. Run `alembic upgrade head` pointing at Supabase
5. Run the ingestion scripts pointing at Supabase

### Backend (Railway)

1. Push your repo to GitHub
2. New project → Deploy from GitHub repo → select `backend/` as root
3. Set environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
4. Railway auto-detects the Dockerfile and builds

### Frontend (Vercel)

1. Create `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-app.railway.app
   ```
2. Push to GitHub
3. New Vercel project → import repo → set root directory to `frontend/`
4. Vercel builds with `bun run build` automatically

### Embedding cost at scale

| Scope | Tokens | Cost |
|---|---|---|
| Full corpus (one-time) | ~12M | ~$1.50 |
| Per search query | ~1K | ~$0.00013 |
| Per outline generation | ~2K | ~$0.00026 |

---

## Common Issues

**`pgvector` extension not found**
Run `docker compose down -v && docker compose up db` to wipe the volume and re-run `init.sql`.

**Translation script returns no results**
Make sure you're using Translation ID `20` (Saheeh International) in `03_fetch_translations.py`. ID `131` no longer works.

**Embeddings script crashes midway**
It's resumable — just re-run it. It skips verses that already have embeddings.

**`asyncpg` can't connect**
Check `DATABASE_URL` — it must use `postgresql://` not `postgres://`.

**Claude outline times out**
The agentic loop runs up to 5 tool calls. Increase `--timeout` on uvicorn if running behind a reverse proxy. The 30s default is usually sufficient.
