# digital-twin-ai

> **Personal AI Life Simulator & Cross-Domain Digital Twin**  
> Synthesizing personal finance, academic focus, and habit consistency into a unified predictive digital twin with Machine Learning forecasting, stochastic Monte Carlo counterfactual simulations, grounded rule-based recommendations, and an autonomous tool-calling AI agent.

[![CI](https://github.com/digital-twin-ai/digital-twin-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/digital-twin-ai/digital-twin-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org/)

---

## Table of Contents

1. [Problem Statement & Overview](#problem-statement--overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Visual Interface & Screenshots](#visual-interface--screenshots)
6. [Quick Start (Docker Compose)](#quick-start-docker-compose)
7. [Local Development (Without Docker)](#local-development-without-docker)
8. [Environment Variables](#environment-variables)
9. [Kaggle Datasets & Ingestion](#kaggle-datasets--ingestion)
10. [Machine Learning Training Pipeline](#machine-learning-training-pipeline)
11. [Running the Test Suites](#running-the-test-suites)
12. [Demo Account & ENABLE_DEMO_LOGIN (Dev Only)](#demo-account--enable_demo_login-dev-only)
13. [AI Provider Chain & Quota Resilience](#ai-provider-chain--quota-resilience)
14. [Data Provenance & Model Limitations](#data-provenance--model-limitations)
15. [Disclaimer: Not Financial or Medical Advice](#disclaimer-not-financial-or-medical-advice)
16. [Project Structure](#project-structure)
17. [Future Roadmap](#future-roadmap)
18. [AI Development Disclosure](#ai-development-disclosure)
19. [License](#license)

---

## Problem Statement & Overview

Modern personal tracking tools remain fundamentally siloed:
- **Banking and budgeting apps** monitor historical cash flow but ignore academic demands or sleep deprivation that trigger impulse spending.
- **Study trackers and LMS tools** measure exam performance in isolation from financial anxiety and recovery metrics.
- **Habit and health trackers** log sleep and workouts without connecting them to cognitive bandwidth or long-term financial runway.

Because human life operates as an interconnected system, decisions in one domain carry immediate ripple effects across others—such as cutting sleep to study late leading to cognitive burnout, falling exam scores, increased stress, and erratic expenses.

**digital-twin-ai** solves this fragmentation. It constructs an authentic, isolated digital twin for each user by:
1. Ingesting and unifying daily finance transactions, study sessions, and wellbeing logs.
2. Generating ML-driven forward projections with cold-start dynamic blending and explicit data provenance badges (`personal`, `blended`, `global`).
3. Running a 500+ iteration stochastic Monte Carlo counterfactual simulation engine that couples cross-domain dynamics (e.g., sleep penalties on academic retention, financial anxiety on habit adherence).
4. Generating grounded, explainable rule-based recommendations that cite the user's authentic metrics against clinical and financial thresholds.
5. Providing an interactive conversational AI assistant with server-side JWT security injection, grounded tool execution, and provisional action plan proposals.

---

## Key Features

- **Tri-Domain Synthesis & Life Path Index**:
  - Live composite synthesis score computed from authenticated metrics: 40% Habits & Sleep Vitality, 35% Academic Mastery, and 25% Financial Runway.
  - Interactive tooltip explaining the exact mathematical weighting and clinical/financial target thresholds.

- **Machine Learning Trajectory Forecasts**:
  - **Finance Forecaster (Ridge Regression)**: Monthly expense projections with 80% confidence fan intervals $[\hat{y} \pm 1.28 \cdot \sigma_m]$.
  - **Academic Predictor (RandomForest)**: Projected exam score distributions, feature importance breakdowns, and dynamic study-hour scenarios.
  - **Habits & Burnout Forecaster (Calibrated Logistic Regression)**: Streak continuation probability and 4-factor burnout vulnerability rating (sleep debt, exercise consistency, mood trend, and cognitive workload).

- **Counterfactual What-If Simulator (Monte Carlo)**:
  - 500+ stochastic iterations projecting 1 to 12 months into the future.
  - Interventions: Salary adjustments ($\pm\%$), one-time planned expenses, study hour deltas, sleep targets, and exercise regimens.
  - Realistic cross-domain coupling heuristics (sleep deficit penalizing academic retention, liquid runway $<2$ months degrading habit adherence, exercise yielding burnout protection).
  - P10 (stress case), P50 (median expected), and P90 (upside) shaded uncertainty distributions.

- **Grounded Actionable Recommendations**:
  - Deterministic risk detection rules (emergency reserve $<3.0$ months, sleep deficit $<6.5$h paired with falling test performance, broken habit streaks, savings pace behind goal).
  - Every recommendation cites authentic user metrics against system benchmarks.

- **Conversational Assistant with Guarded Tool Calling**:
  - 7 server-side tools (`get_user_summary`, `run_prediction`, `run_simulation`, `get_recommendations`, `create_plan`, `list_plans`, `update_plan`).
  - **Anti-Spoofing Context Injection**: The model cannot provide or manipulate `user_id`; user context is bound server-side from verified JWTs.
  - Multi-provider fallback chain: Google Gemini $\rightarrow$ OpenAI-compatible API (Groq/OpenAI/Ollama) $\rightarrow$ Offline deterministic provider.
  - Guardrails: 5-turn tool cap, zero hallucinated figures, confirmation-first action plans.

- **Refined User Experience & Accessibility**:
  - **Instant Clear Chat**: Immediate state and chart reset on deletion without browser reload, backed by a confirmation dialog and error toast.
  - **Collapsible Entry Panels**: One-click quick-entry on Finance, Study, and Habits with smooth expansion, `Escape` key and close button dismissal, and auto-collapse upon saving.
  - **Fixed Multi-Scroll Layout**: Sidebar fixed full-height with internal scrolling and bottom-pinned Sign Out; sticky top header; independent main content scroll.
  - **Dark / Light Theme**: High-contrast, responsive palette with persistent theme storage.

- **Security & Privacy by Design**:
  - Argon2/bcrypt password hashing with per-user salt.
  - Strict row-level tenant isolation across all endpoints.
  - GDPR/CCPA data portability (`GET /api/v1/user/export-data`) and complete cascade account wipeout (`DELETE /api/v1/user/delete-data`).

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Layer (Next.js 14 App Router)"]
        UI["Tailwind CSS + Recharts UI"]
        Forms["Collapsible Quick-Entry Panels<br/>(Finance / Study / Habits)"]
        ChatUI["Conversational Agent View<br/>(Tool Badges & Plan Cards)"]
        SimulatorUI["What-If Monte Carlo Simulator<br/>(P10/P50/P90 Fan Charts)"]
    end

    subgraph Gateway["API & Security Layer (FastAPI)"]
        Router["FastAPI REST & Async Endpoints"]
        Auth["JWT Token Auth & Password Hashing"]
        RateLimit["Sliding Window Rate Limiter"]
        TenantGuard["Server-Side User Context Injection<br/>(Anti-Spoofing Guard)"]
    end

    subgraph Logic["Domain Services & Analytics"]
        DashboardSvc["Dashboard & KPI Aggregator"]
        RecSvc["Deterministic Recommendation Engine"]
        SimEngine["Monte Carlo Simulator<br/>(500+ Stochastic Runs)"]
    end

    subgraph MLEngine["Machine Learning Pipeline"]
        FeatEng["Feature Engineering Pipeline<br/>(ml/features.py)"]
        RidgeMod["Ridge Expense Forecaster"]
        RFMod["RandomForest Exam Predictor"]
        LogMod["Calibrated Burnout Logistic Classifier"]
        Blender["Cold-Start Dynamic Blending<br/>w_personal = min(1.0, N/30)"]
    end

    subgraph LLMChain["LLM Resilience & Tool Orchestration"]
        Executor["Tool Calling Executor (7 Tools)"]
        Gemini["Primary: Google Gemini (gemini-2.5-flash)"]
        OpenAICompat["Secondary: OpenAI-Compatible / Groq"]
        Offline["Tertiary: Deterministic Offline Engine"]
    end

    subgraph Storage["Persistence Layer"]
        Postgres[(PostgreSQL 16 / SQLite<br/>Composite Index: user_id, date)]
    end

    Client -->|HTTPS / REST| Router
    Router --> Auth
    Router --> RateLimit
    Router --> TenantGuard

    TenantGuard --> DashboardSvc
    TenantGuard --> RecSvc
    TenantGuard --> SimEngine
    TenantGuard --> Executor

    SimEngine --> FeatEng
    DashboardSvc --> MLEngine
    MLEngine --> Blender

    Executor --> Gemini
    Gemini -.->|Quota / Error Fallback| OpenAICompat
    OpenAICompat -.->|Offline Fallback| Offline
    Executor --> Storage

    DashboardSvc --> Storage
    RecSvc --> Storage
    SimEngine --> Storage
```

---

## Tech Stack

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Frontend** | Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS, Recharts 2.12, Lucide React, Playwright E2E |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, python-jose, passlib, bcrypt |
| **Machine Learning** | scikit-learn, pandas, numpy, joblib, scipy |
| **AI & LLM** | `google-genai` SDK, OpenAI Python Client, Custom Tool Calling Architecture |
| **Database** | PostgreSQL 16 Alpine (Production/Docker), SQLite via `aiosqlite` (Testing/CI) |
| **DevOps & CI** | Docker, Docker Compose, GitHub Actions CI |

---

## Visual Interface & Screenshots

All high-resolution interface captures are located in [`docs/screenshots/`](docs/screenshots/):

| View | Light Theme | Dark Theme |
| :--- | :--- | :--- |
| **Twin Overview** | ![Overview Light](docs/screenshots/overview-desktop-light.png) | ![Overview Dark](docs/screenshots/overview-desktop-dark.png) |
| **Personal Finance Ledger** | ![Finance Light](docs/screenshots/finance-desktop-light.png) | ![Finance Dark](docs/screenshots/finance-desktop-dark.png) |
| **AI Assistant & Chat** | ![Chat Light](docs/screenshots/chat-desktop-light.png) | ![Chat Dark](docs/screenshots/chat-desktop-dark.png) |
| **Action Plans Tracker** | ![Plans Light](docs/screenshots/plans-desktop-light.png) | ![Plans Dark](docs/screenshots/plans-desktop-dark.png) |
| **Recommendations** | ![Recs Light](docs/screenshots/recommendations-desktop-light.png) | ![Recs Dark](docs/screenshots/recommendations-desktop-dark.png) |
| **Account & GDPR Settings** | ![Settings Light](docs/screenshots/settings-desktop-light.png) | ![Settings Dark](docs/screenshots/settings-desktop-dark.png) |

### Targeted Interaction Details

- **Life Path Index & Forecast Data Source Badges**:
  ![Overview Tooltip and Badge](docs/screenshots/overview-tooltip-badge.png)
- **Collapsible Entry Panels (Finance, Study, Habits)**:
  ![Finance Quick-Add](docs/screenshots/finance-collapsible-panel.png)
  ![Study Quick-Add](docs/screenshots/study-collapsible-panel.png)
- **Zero-Refresh Clear Chat with Confirmation Modal**:
  ![Chat Confirm Modal](docs/screenshots/chat-confirm-dialog.png)

---

## Quick Start (Docker Compose)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/digital-twin-ai.git
cd digital-twin-ai
```

### 2. Configure Environment Variables
Create your local `.env` from the provided template:
```bash
cp .env.example .env
cp .env.example backend/.env
```
*(Optionally populate `GEMINI_API_KEY` for live generative responses. If omitted, the system seamlessly falls back to the deterministic offline provider).*

### 3. Launch with Docker Compose
```bash
docker compose up --build -d
```

### 4. Apply Database Migrations
```bash
docker compose exec backend alembic upgrade head
```

### 5. Seed Synthetic Demo Data
```bash
docker compose exec backend python scripts/seed_demo_account.py
```

### 6. Access the Application
- **Frontend Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432`

---

## Local Development (Without Docker)

### Backend Setup (Python 3.11+)
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python scripts/seed_demo_account.py
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All configuration is managed via environment variables. **No secrets are ever hardcoded in the codebase.**

| Variable | Description | Sample / Placeholder | Required |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Async SQLAlchemy database connection string | `postgresql+asyncpg://postgres:postgrespassword@localhost:5432/digital_twin` | Yes |
| `SYNC_DATABASE_URL` | Sync database connection string (Alembic / Ingestion) | `postgresql+psycopg2://postgres:postgrespassword@localhost:5432/digital_twin` | Yes |
| `JWT_SECRET` | Secret key used to sign and verify session JWTs (min 32 chars) | `replace_with_a_super_secret_jwt_key_minimum_32_characters_long` | Yes |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session validity duration in minutes | `1440` (24 hours) | Yes |
| `RATE_LIMIT_AUTH_PER_MINUTE` | Max auth attempts per minute per IP | `15` | No |
| `RATE_LIMIT_CHAT_PER_MINUTE` | Max chat requests per minute per IP | `25` | No |
| `CORS_ORIGINS` | Permitted browser origins (comma-separated) | `http://localhost:3000,http://127.0.0.1:3000` | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key from Google AI Studio | `your_gemini_api_key_here` | Optional |
| `GEMINI_MODEL` | Gemini Model Identifier | `gemini-2.5-flash` | Optional |
| `GEMINI_FALLBACK_MODELS` | Comma-separated fallback Gemini model IDs | `gemini-2.0-flash,gemini-1.5-flash` | Optional |
| `LLM_PROVIDER_CHAIN` | Order of fallback LLM providers | `gemini,openai_compatible,offline` | Yes |
| `OPENAI_COMPAT_BASE_URL` | Base URL for OpenAI-compatible providers (Groq/Ollama) | `https://api.groq.com/openai/v1` | Optional |
| `OPENAI_COMPAT_API_KEY` | API Key for OpenAI-compatible provider | `your_openai_compat_key_here` | Optional |
| `OPENAI_COMPAT_MODEL` | Model ID for OpenAI-compatible provider | `llama-3.3-70b-versatile` | Optional |
| `DEMO_MODE` | Force demo mode bypass | `false` | No |
| `ENABLE_DEMO_LOGIN` | Enable 1-click demo login button on web UI (dev only) | `true` (dev) / `false` (prod) | Yes |
| `NEXT_PUBLIC_API_URL` | URL of the backend API accessible to the client browser | `http://localhost:8000` | Yes |

---

## Kaggle Datasets & Ingestion

Global baseline models are trained on three public benchmark datasets placed in `data/raw/`:

| Dataset Name | Target File Path | Kaggle / Source Reference | License to Verify |
| :--- | :--- | :--- | :--- |
| **Personal Finance & Budgeting** | `data/raw/data.csv` | [Personal Key Budget / Finance Dataset](https://www.kaggle.com/datasets) | CC0 / Public Domain / Open Database License |
| **Student Lifestyle & Performance** | `data/raw/student_lifestyle_dataset.csv` | [Student Lifestyle Dataset](https://www.kaggle.com/datasets) | CC BY 4.0 / Open Data Commons |
| **Sleep Health and Lifestyle** | `data/raw/sleep_cycle_productivity.csv` | [Sleep, Health and Lifestyle Dataset](https://www.kaggle.com/datasets) | CC0 / Public Domain |

### Running Ingestion
To ingest raw CSVs into normalized database rows for testing:
```bash
# Locally
python ml/ingest.py

# Inside Docker
docker compose exec backend python ml/ingest.py
```

---

## Machine Learning Training Pipeline

The machine learning subsystem features feature engineering, chronological holdout splitting, model training, and metadata serialization:

1. **Feature Engineering** ([`ml/features.py`](ml/features.py)):
   - Computes rolling 7d/14d/30d aggregations, ratios, and cross-domain interaction metrics.
   - Tags each vector with its data provenance (`source: user | synthetic | kaggle`).

2. **Synthetic Population Generator** ([`ml/synthetic.py`](ml/synthetic.py)):
   - Generates 90-day correlated histories across 3 persona profiles (Alex [USD], Maya [EUR], Sam [GBP]).

3. **Model Retraining** ([`ml/train.py`](ml/train.py)):
   ```bash
   python ml/train.py
   # Or inside Docker:
   docker compose exec backend python ml/train.py
   ```
   Outputs serialized joblib models into `ml/models/`:
   - `finance_v1.joblib` (Ridge Regression)
   - `study_v1.joblib` (RandomForestRegressor)
   - `habits_v1.joblib` (CalibratedClassifierCV Logistic Regression)
   - `models_metadata.json` (Evaluation metrics, feature importances, holdout splits)

---

## Running the Test Suites

### Backend Unit & Integration Tests (Pytest)
```bash
# Run complete test suite (all domains, security, isolation, simulation, chat)
python -m pytest backend/tests -v --tb=short

# Run Monte Carlo simulation verification
python -m pytest backend/tests/test_demo_simulation_verification.py -v

# Run Chatbot evaluation and question-to-chart mapping suite
python backend/tests/test_demo_chatbot_eval.py
```

### Frontend End-to-End Tests (Playwright)
```bash
cd frontend

# Run all Playwright tests
npx playwright test

# Run targeted UI fixes test suite (Clear Chat, Collapsible Panels, Layout, Tooltips)
npx playwright test tests/ui-fixes.spec.ts

# Run critical flows test suite (Auth, What-If simulation, Chat, History)
npx playwright test tests/critical-flows.spec.ts
```

---

## Demo Account & ENABLE_DEMO_LOGIN (Dev Only)

To enable rapid demonstration and code review without manual form registration:
- **Demo Email**: `demo@digitaltwin.ai`
- **Demo Password**: `DemoPassword2026!`
- **Configuration Toggle**: Set `ENABLE_DEMO_LOGIN=true` in `backend/.env`.

> [!CAUTION]
> **Production Safety Rule**: `ENABLE_DEMO_LOGIN` must strictly be set to `false` in production environments. When disabled, the `/api/v1/auth/demo-login` endpoint returns HTTP 403 Forbidden.

### Resetting the Demo Account
```bash
# Seed initial state
python scripts/seed_demo_account.py

# Wipe and reseed freshly
python scripts/seed_demo_account.py --reset
```

---

## AI Provider Chain & Quota Resilience

To prevent service degradation during live demonstrations or high traffic:
1. **Google Gemini (`gemini-2.5-flash`)**: Primary provider for complex tool calling and contextual synthesis.
2. **OpenAI-Compatible (`openai_compatible`)**: Automatic fallback to Groq, OpenAI, or local vLLM/Ollama endpoints when Gemini encounters HTTP 429 rate limits or quota exhaustion.
3. **Deterministic Offline Provider (`offline`)**: Guaranteed zero-downtime offline fallback implementing rule-based answer synthesis and grounded tool execution when all remote LLM APIs are unreachable.

---

## Data Provenance & Model Limitations

- **Cold-Start Blending Formula**:
  $$w_{\text{personal}} = \min\left(1.0, \frac{N_{\text{user}}}{30.0}\right)$$
  $$\hat{y}_{\text{final}} = w_{\text{personal}} \cdot \hat{y}_{\text{personal}} + (1 - w_{\text{personal}}) \cdot \hat{y}_{\text{global}}$$
  - $N < 30$: Predictions display a **`blended`** or **`global`** badge indicating partial reliance on public benchmark patterns.
  - $N \ge 30$: Predictions display a **`personal`** badge reflecting individual habits and trends.
- **Model Limitations**:
  - Global models capture general statistical correlations, not personal causality.
  - Cross-domain simulation parameters (e.g. sleep debt penalty on exam scores) represent behavioral research heuristics rather than randomized controlled clinical trial data.

---

## Disclaimer: Not Financial or Medical Advice

> [!IMPORTANT]
> **NO FINANCIAL, INVESTMENT, LEGAL, OR MEDICAL ADVICE**  
> All projections, Monte Carlo simulations, automated recommendations, and chatbot outputs produced by **digital-twin-ai** are computational estimates generated for educational, informational, and lifestyle-planning purposes only.  
> - Nothing within this platform constitutes certified financial advice, investment advisory services, medical diagnosis, psychiatric care, or legal counsel.  
> - Always consult a certified financial planner (CFP), qualified physician, or licensed professional before making significant financial, medical, or life-altering decisions.

---

## Project Structure

```
digital-twin-ai/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Continuous integration workflow
├── backend/
│   ├── alembic/                       # Database schema migrations
│   ├── app/
│   │   ├── api/v1/                    # REST routers (auth, user, chat, sim, etc.)
│   │   ├── core/                      # Config, security, database engine
│   │   ├── llm/                       # Provider chain, tools, executor
│   │   ├── models/                    # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/                   # Pydantic v2 validation models
│   │   └── services/                  # Business logic (chat, recommendations, sim)
│   ├── requirements.txt               # Backend Python dependencies
│   └── tests/                         # Pytest test suite
├── frontend/
│   ├── src/
│   │   ├── app/(dashboard)/           # Next.js App Router dashboard routes
│   │   ├── components/                # Reusable UI & Recharts components
│   │   └── lib/                       # API clients, formatters, type contracts
│   ├── package.json                   # Frontend npm package manifest
│   ├── playwright.config.ts           # Playwright test harness configuration
│   └── tests/                         # Playwright E2E test specs
├── ml/
│   ├── features.py                    # Feature extraction pipeline
│   ├── ingest.py                      # Kaggle CSV ingest script
│   ├── simulator.py                   # Monte Carlo stochastic simulation engine
│   ├── synthetic.py                   # Synthetic multi-persona generator
│   └── train.py                       # ML model training and evaluation script
├── docs/
│   ├── demo_verification_report.md    # Comprehensive system verification report
│   └── screenshots/                   # Application screenshots (desktop & mobile)
├── scripts/
│   └── seed_demo_account.py           # Demo account seed & reset utility
├── docker-compose.yml                 # Multi-container orchestration
├── .env.example                       # Clean environment template (no secrets)
├── .gitignore                         # Strict exclusion rules
├── LICENSE                            # MIT License
├── pyproject.toml                     # Python project metadata
└── README.md                          # Project documentation
```

---

## Future Roadmap

- [ ] **Wearable API Integrations**: Bi-directional data sync with Apple HealthKit, Google Health Connect, Oura, and Whoop.
- [ ] **Open Banking Connectivity**: Direct automated transaction synchronization via Plaid / Yapily.
- [ ] **Longitudinal Reinforcement Learning**: Contextual multi-armed bandit interventions tailored to individual adherence patterns.
- [ ] **On-Device SLM Inference**: WebAssembly / WebGPU-powered local LLM execution (e.g. Gemma 2B via WebLLM) for zero-latency private assistant turns.

---

## AI Development Disclosure

This project was architected, implemented, and verified with the collaborative assistance of agentic AI pair programming tools (**Google Antigravity**). All generated code, database models, machine learning pipelines, and user interface components have been manually reviewed, tested with automated test suites, and verified against functional acceptance criteria.

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).
