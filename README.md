# Digital Twin AI – Personal Life Simulation & Decision Assistant

An intelligent full-stack system that builds a "digital twin" of a user from their finance, study, and habit/fitness data, predicts future trajectory outcomes with Machine Learning, simulates counterfactual what-if scenarios with Monte Carlo modeling, and provides a conversational AI assistant with tool calling.

> **Data Disclosure & Privacy Note**:
> Global pre-trained models are trained strictly on public benchmark datasets (Kaggle) and synthetic data. No user data is ever shared or used for global model training. All personal models and inferences run in complete isolation per authenticated user.

---

## Architecture Overview

- **Frontend**: Next.js 14+ (App Router, TypeScript) + Tailwind CSS + Lucide Icons + Recharts
- **Backend**: Python FastAPI, SQLAlchemy 2.0 (async), Alembic migrations, Pydantic v2
- **Database**: PostgreSQL with composite indexes on `(user_id, date)` across time-series entities
- **ML Engine**: pandas, scikit-learn, joblib, Monte Carlo simulation engine (500+ iterations)
- **Chatbot**: Google Gemini API (`google-genai` SDK) wrapped in an abstract provider with function/tool calling and server-side JWT user injection
- **Security**: Argon2/bcrypt password hashing, JWT authentication, per-user isolation, restricted CORS, rate limiting, and GDPR export/delete endpoints

---

## Directory Structure

```
├── frontend/             # Next.js App Router frontend application
├── backend/              # FastAPI application, SQLAlchemy models, API routes
├── ml/                   # ML training, inference, synthetic data, and simulation engine
├── data/
│   ├── raw/              # Kaggle CSVs (Finance, Student Performance, Sleep/Habits)
│   └── processed/        # Cleaned datasets
├── docker-compose.yml    # Full-stack Docker orchestration
├── .env.example          # Environment variables template
└── README.md
```

---

## Quickstart

### 1. Environment Configuration
Copy the template to `.env`:
```bash
cp .env.example .env
```
Add your `GEMINI_API_KEY` and set `GEMINI_MODEL=gemini-2.5-flash` (or your preferred current Flash model).

### 2. Run with Docker Compose
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

### 3. Local Development (Without Docker)

#### Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Demo Account & Quickstart

The repository includes a ready-to-use synthetic demo account for rapid evaluation and local testing:

- **Email**: `demo@digitaltwin.ai`
- **Password (Development only)**: `DemoPassword2026!`
- **Profile**: USD currency, 12 finance entries, 12 study sessions, 12 habit logs forming a 3-week trajectory with realistic stressors (sleep deprivation spells, exam score drops, and savings runway near emergency thresholds).
- **Environment Toggle**: Set `ENABLE_DEMO_LOGIN=true` in `backend/.env` to enable 1-click login on the web UI.
- **One-Click Web Login**: Visit `http://localhost:3000/login` and click **"Try the demo account"**.
- **One-Command Reset**:
  ```bash
  # Via npm (from repo root)
  npm run demo:reset

  # Or directly via Python
  py -3.14 scripts/seed_demo_account.py --reset
  ```
All demo records are tagged with `source="synthetic"` and excluded from genuine user ML training pipelines.

---

## Dataset Mappings (Kaggle & Database Schemas)

The ingestion pipeline ([`ml/ingest.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/ml/ingest.py)) maps raw Kaggle datasets located in `data/raw/` to normalized database tables scoped to a demo user:

### 1. Personal Finance (`data/raw/data.csv`)
- **Source Structure**: Monthly cross-sectional budget headers (`Income`, `Rent`, `Utilities`, `Groceries`, `Travel`, `Savings`, `Remaining`).
- **Target Table**: `finance_entries`
- **Mapping & Transformations**:
  - `Rent` $\rightarrow$ `category="Rent"`, `type="expense"`, `amount=Rent`
  - `Utilities` $\rightarrow$ `category="Utilities"`, `type="expense"`, `amount=Utilities`
  - `Groceries` $\rightarrow$ `category="Groceries"`, `type="expense"`, `amount=Groceries`
  - `Travel` $\rightarrow$ `category="Travel"`, `type="expense"`, `amount=Travel`
  - `Savings` $\rightarrow$ `category="Savings"`, `type="expense"`, `amount=Savings`
  - `Income` $\rightarrow$ `category="Salary"`, `type="income"`, `amount=Income`
- **Data Gap & Mitigation**: The raw CSV lacks chronological dates. Ingestion expands entries across the prior 6 months on the 1st of each month to generate a realistic financial time-series.

### 2. Sleep & Habits (`data/raw/sleep_cycle_productivity.csv`)
- **Source Structure**: Continuous sleep tracker logs (`User_ID`, `Timestamp`, `Total_Sleep_Hours`, `Physical_Activity_Hours`, `Sleep_Quality_Score`, etc.).
- **Target Table**: `habit_logs`
- **Mapping & Transformations**:
  - `Timestamp` $\rightarrow$ `date=Timestamp.date()`
  - `Total_Sleep_Hours` $\rightarrow$ `sleep_hours` (bounded 0–24)
  - `Physical_Activity_Hours` $\rightarrow$ `exercise_minutes = round(hours * 60)`
  - `Sleep_Quality_Score` $\rightarrow$ `mood = clamp(round(score / 2), 1, 5)` (scales 1–10 to 1–5 stars)
  - Default habit: `"Night Routine"` (`done = True` if `sleep_hours >= 7.0`)
- **Idempotency**: Existing dates for the demo user are updated or skipped, preventing duplicate rows.

### 3. Study & Academic Performance (`data/raw/student_lifestyle_dataset.csv`)
- **Source Structure**: Aggregated student lifestyle snapshots (`Study_Hours_Per_Day`, `Current_GPA`, `Extracurricular_Hours_Per_Day`, etc.).
- **Target Table**: `study_sessions`
- **Mapping & Transformations**:
  - `Study_Hours_Per_Day` $\rightarrow$ `hours`
  - `Current_GPA` $\rightarrow$ `score = clamp(round(GPA * 25.0, 1), 0.0, 100.0)`
  - Topics: Distributed across core subjects (`Mathematics`, `Computer Science`, `Physics`, `Economics`)
- **Data Gap & Mitigation**: The raw CSV provides cross-sectional aggregates without timestamps. Ingestion simulates a 60-day historical study calendar leading up to examination milestones.

---

## Data Ingestion & Synthetic Generation

### How to Run Ingestion

You can run `ml/ingest.py` either **on your local machine** or **inside the Docker container**:

#### Option A: Running on Local Machine
```powershell
# Ensure PostgreSQL is running and SYNC_DATABASE_URL is set
$env:SYNC_DATABASE_URL="postgresql+psycopg2://postgres:postgrespassword@localhost:5432/digital_twin"
python ml/ingest.py
```

#### Option B: Running Inside Docker
The `data/` directory is mounted into the backend container at `/app/data` (defined in `docker-compose.yml` under volumes: `- ./data:/app/data`).
To run ingestion inside Docker:
```bash
docker compose exec backend python ml/ingest.py
```

### Synthetic Data Generator
To generate 90 days of reproducible, cross-domain correlated time-series data for 3 distinct persona profiles (Alex [USD], Maya [EUR], Sam [GBP]):
```bash
# Locally:
python ml/synthetic.py

# Inside Docker:
docker compose exec backend python ml/synthetic.py
```

---

## Phase 4: Machine Learning Predictions & Forecasts

### 1. Architectural Overview & Feature Engineering

The feature engineering pipeline ([`ml/features.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/ml/features.py)) transforms raw chronological database entries into model-ready feature vectors:
- **Finance (`extract_finance_features`)**: Calculates rolling 30-day and 60-day income and expense volumes, category distribution ratios (Housing, Groceries, Dining Out, Utilities, Discretionary), net cash flow, and tracks the explicit record origin (`source: user | synthetic | kaggle`) to prevent unvalidated data contamination.
- **Study (`extract_study_features`)**: Aggregates rolling 7-day and 14-day study hours, calculates study regularity/consistency ($1 - \text{std} / (\text{mean} + 1)$), and joins cross-domain rolling sleep hours, physical activity minutes, and vitality mood scores.
- **Habit Streak & Burnout (`extract_habit_burnout_features`)**: Constructs a multi-factor recovery matrix per persona: rolling sleep debt ($\max(0, \text{target} - \text{sleep})$), exercise frequency, mood trend slope, and cognitive workload pressure (study hours/day).

---

### 2. Time-Based Holdout Split Methodology

To eliminate temporal lookahead bias and data leakage, all models are evaluated using a strict **chronological time-based split** rather than a random shuffle split:
- Data is sorted chronologically by entity date.
- The earliest 80% serves as the training horizon ($T_{\text{train}}$).
- The subsequent 20% serves as the holdout test horizon ($T_{\text{test}}$).

> **Important Global Model Attribution**:
> All global baseline models (`finance_v1.joblib`, `study_v1.joblib`, `habits_v1.joblib`) are trained strictly on public Kaggle datasets and synthetic multi-persona benchmarks. Personal user history is never commingled into global model weights.

---

### 3. Model Architecture & Evaluation Performance

> [!WARNING]
> **Model Validity & Synthetic Pattern Disclaimer**:
> **"High accuracy reflects learned patterns from synthetic data generation rules, not validated real-world prediction."**
> While synthetic data cohorts ensure stable training and clear scenario separation, models demonstrate significantly lower error on synthetic inputs than on genuine, noisy real-world benchmark data.

#### A. Comprehensive Source Breakdown on Time-Based Holdout Sets

| Domain / Target | Model Algorithm | Evaluation Subset | Samples (% of Test) | MAE | RMSE | $R^2$ / Accuracy | Brier Loss |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Finance (Next Month Exp)** | Ridge Regression | **Overall Holdout** | 3,000 (100%) | **$1,686.46** | **$4,115.90** | **0.9663** | — |
| | | ↳ **Kaggle Benchmark** | 1,500 (50.0%) | **$3,109.94** | **$5,812.49** | **0.9560** | — |
| | | ↳ **Synthetic Personas** | 1,500 (50.0%) | **$262.99** | **$310.09** | **0.8892** | — |
| **Study (Exam Score 0–100)** | RandomForest (100 trees) | **Overall Holdout** | 400 (100%) | **4.66 pts** | **6.11 pts** | **0.5979** | — |
| | | ↳ **Kaggle Students** | 304 (76.0%) | **5.59 pts** | **6.91 pts** | **0.3658** | — |
| | | ↳ **Synthetic Students** | 96 (24.0%) | **1.71 pts** | **2.09 pts** | **0.9546** | — |
| **Habits (Streak Continuation)** | Calibrated Logistic | **Overall Holdout** | 1,724 (100%) | — | — | **83.87%** | **0.1017** |
| | | ↳ **Kaggle Sleep Cohort** | 1,025 (59.45%) | — | — | **89.27%** | **0.0715** |
| | | ↳ **Synthetic Personas** | 669 (38.81%) | — | — | **75.34%** | **0.1475** |
| | | ↳ **Genuine User Logs** | 30 (1.74%) | — | — | **90.00%** | **0.1118** |
| **Habits (Burnout Vulnerability)** | Calibrated Logistic | **Overall Holdout** | 1,724 (100%) | — | — | **86.37%** | **0.1020** |
| | | ↳ **Kaggle Sleep Cohort** | 1,025 (59.45%) | — | — | **84.88%** | **0.1102** |
| | | ↳ **Synthetic Personas** | 669 (38.81%) | — | — | **90.73%** | **0.0744** |
| | | ↳ **Genuine User Logs** | 30 (1.74%) | — | — | **40.00%** | **0.4367** |

#### B. Dataset Composition Fractions (Synthetic vs. Real Kaggle Rows vs. Genuine User Data)

| Model | Horizon | Total Samples | Real Kaggle Rows | Synthetic Rows | Genuine User History Rows |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Finance Forecaster** | Training Set | 8,000 | 4,000 (**50.0%**) | 4,000 (**50.0%**) | 0 (**0.0%**) |
| | Holdout Test | 3,000 | 1,500 (**50.0%**) | 1,500 (**50.0%**) | 0 (**0.0%**) |
| **Study Predictor** | Training Set | 1,600 | 1,196 (**74.75%**) | 404 (**25.25%**) | 0 (**0.0%**) |
| | Holdout Test | 400 | 304 (**76.0%**) | 96 (**24.0%**) | 0 (**0.0%**) |
| **Habits & Burnout** | Training Set | 6,896 | 3,975 (**57.64%**) | 2,921 (**42.36%**) | 0 (**0.0%**) |
| | Holdout Test | 1,724 | 1,025 (**59.45%**) | 669 (**38.81%**) | 30 (**1.74%**) |

#### C. Study Feature Importance Breakdown
- `rolling_study_hours`: **88.64%**
- `rolling_exercise_minutes`: **3.48%**
- `study_consistency`: **3.41%**
- `rolling_sleep_hours`: **3.40%**
- `rolling_mood`: **1.08%**

---

### 4. Dynamic Cold-Start Blending

Rather than a hard step-function switch from global benchmarks to personal models, the system dynamically weights predictions based on authenticated user volume:

$$w_{\text{personal}} = \min\left(1.0, \frac{N_{\text{user}}}{30.0}\right)$$

$$\hat{y}_{\text{final}} = w_{\text{personal}} \cdot \hat{y}_{\text{personal}} + (1 - w_{\text{personal}}) \cdot \hat{y}_{\text{global}}$$

- **Zero-History Users ($N_{\text{user}} = 0$)**: $w_{\text{personal}} = 0.0$. Predictions gracefully fallback to the global benchmark model with `data_source: "global"`, bounded confidence intervals, and explanatory notes.
- **Developing Users ($1 \le N_{\text{user}} < 30$)**: Smoothly interpolates personal trajectory with global benchmarks (`data_source: "blended"`).
- **Mature Users ($N_{\text{user}} \ge 30$)**: Fully personal model inference (`data_source: "personal"`).

> [!NOTE]
> **Statistical Significance & Burnout Caveat ($N \approx 30$)**:
> With only 30 genuine user entries, evaluating a standalone holdout metric (e.g. 40% burnout accuracy on test subsets) is not statistically significant. Consequently, **burnout vulnerability risk is computed directly from the global calibrated logistic regression model** (trained on 5,000+ Kaggle survey records), passing the user's rolling 7-day vitals (sleep debt, exercise, mood trend, workload) as inputs. The system deliberately does not fit separate regression weights to noisy, micro-sample user logs, ensuring stability and grounding in verified behavioral baselines.

---

### 5. API Endpoints & Asynchronous Offloading

Synchronous ML inference runs in a Python worker thread pool via `asyncio.to_thread` to guarantee FastAPI's async event loop remains non-blocking:

- `GET /api/v1/predictions/finance?horizon_months=N`: Generates monthly expected expenses, expected monthly savings, and cumulative savings fan charts with 80% confidence intervals $[\hat{y} - 1.28 \cdot \sigma_m, \hat{y} + 1.28 \cdot \sigma_m]$ where $\sigma_m = \sigma_{\text{res}} \sqrt{1 + m/6}$.
- `GET /api/v1/predictions/study`: Generates projected exam score with ensemble tree bounds, feature importance rankings, and interactive study hour scenarios (5h to 25h/week).
- `GET /api/v1/predictions/habits?horizon_days=N`: Generates calibrated streak continuation probability, multi-factor burnout vulnerability score (Low / Moderate / High), and health risk factors (sleep debt, exercise, mood trend, cognitive workload).
- `GET /api/v1/predictions/overview?horizon_months=N`: Aggregated multi-domain predictive payload.

---

### 6. Training Pipeline Execution

To retrain and version all model artifacts:
```bash
# Locally:
python ml/train.py

# Inside Docker:
docker compose exec backend python ml/train.py
```
Model artifacts are serialized to `ml/models/`:
- `finance_v1.joblib`
- `study_v1.joblib`
- `habits_v1.joblib`
- `models_metadata.json`

---

## Phase 5: Counterfactual What-If Simulation Engine (Monte Carlo)

### 1. Architectural Overview & Stochastic Sampling

The simulation engine ([`ml/simulator.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/ml/simulator.py)) executes **500+ stochastic iterations** over a 1 to 12 month user-defined horizon. It models future trajectories under counterfactual decision interventions:
- **Financial Levers**: `salary_change_pct` (e.g. +15% raise or -10% drop), `one_time_expense` (e.g. $1,200 laptop purchase) at a designated target month.
- **Academic Levers**: `study_hours_delta` (e.g. +5 hrs/week).
- **Wellbeing Levers**: `sleep_target_delta` (e.g. -1.5h/day) and `exercise_minutes_delta` (e.g. +20 mins/day).

---

### 2. Centralized Cross-Domain Coupling Assumptions

Life domains are not modeled as independent silos. All heuristic parameters and feedback dynamics are centralized in [`backend/app/core/simulation_config.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/backend/app/core/simulation_config.py) and surfaced transparently in the UI:

1. **Sleep $\rightarrow$ Study Retention Penalty**:
   - Threshold: **6.5 hours/day**.
   - Penalty: Each hour of sleep below 6.5h introduces an **8% penalty per hour of deficit** on simulated study score retention:
     $$\text{Score} = \text{Score}_{\text{raw}} \times \left(1.0 - 0.08 \times \max(0, 6.5 - \text{sleep})\right)$$
2. **Exercise $\rightarrow$ Resilience & Cognitive Bonus**:
   - Threshold: **$\ge 30$ mins/day**.
   - Benefit: Yields a **15% reduction in burnout vulnerability** and a **6% cognitive focus retention bonus**.
3. **Financial Runway $\rightarrow$ Habit Anxiety**:
   - Threshold: **2.0 months of emergency expenses**.
   - Penalty: Having liquid runway $< 2$ months induces baseline financial anxiety, depressing daily habit adherence by up to **12%**.
4. **Severe Burnout Penalty**:
   - If burnout vulnerability exceeds **60%**, secondary cognitive degradation depresses exam performance by up to **10%**.

---

### 3. Percentile Distributions (P10 / P50 / P90)

Each monthly step across the horizon computes:
- **P10 (Risk / Stress Case)**: 10th percentile conservative boundary.
- **P50 (Expected / Median Case)**: Median probable trajectory.
- **P90 (Best Case / Optimistic)**: 90th percentile upside potential.

> [!WARNING]
> **Probabilistic Simulation Disclaimer**:
> **"Monte Carlo simulations provide stochastic probabilistic projections based on historical distributions and cross-domain behavioral assumptions, not deterministic guarantees."**

---

### 4. API Endpoints

Synchronous Monte Carlo simulation runs off the main FastAPI async loop using `asyncio.to_thread`:

- `POST /api/v1/simulations/run`: Accepts `SimulationScenarioParams`, calculates baseline vs scenario paired runs across 500+ iterations, saves the run to the `simulations` table, and returns `SimulationRunResponse`.
- `GET /api/v1/simulations/latest`: Retrieves the user's latest saved simulation run or executes a baseline run.
- `GET /api/v1/simulations/assumptions`: Delivers the centralized cross-domain behavioral rules and heuristic parameters.

---

### 5. Frontend What-If Simulator Interface

Located at [`/simulator`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/frontend/src/app/(dashboard)/simulator/page.tsx):
- **Scenario Controls**: Interactive sliders and quick-preset chips for salary, expenses, study hours, sleep targets, and exercise.
- **Summary Cards**: P50 deltas with baseline vs scenario comparison and cross-domain insight banners.
- **Multi-Domain Comparison Fan Charts**: Recharts composed charts rendering shaded ribbons for P10–P90 uncertainty and dashed baseline vs solid scenario trajectory lines across Savings, Study Score, Burnout Risk, and Habit Consistency.
- **Assumptions Panel**: Transparently explains the cross-domain coupling rules.

---

## Phase 6: Actionable Recommendation Engine (Rule-Based & Metrics Grounded)

### 1. Deterministic Detection Rules
Recommendations are generated via deterministic, explainable rules using the centralized thresholds defined in [`backend/app/core/simulation_config.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/backend/app/core/simulation_config.py) rather than hardcoded heuristics:

1. **Emergency Fund Depletion (`EMERGENCY_FUND_MONTHS_THRESHOLD = 3.0` months)**:
   - Evaluates liquid cash / savings divided by average monthly expense outflow.
   - Flags **High Priority** when runway $< 3.0$ months.
   - Explicitly cites the user's exact liquid runway in months and dollars required to reach the 3-month benchmark.
2. **Sleep Deficit Correlating with Falling Academic Performance (`SLEEP_THRESHOLD_HOURS = 6.5` hrs)**:
   - Evaluates whether rolling 7-day average sleep $< 6.5$ hours while recent study scores exhibit a downward slope ($\Delta < -3\%$).
   - Flags **High Priority** citing exact sleep hours, hours of sleep debt, and score decline points.
3. **Habit Streak Drop-Off (`HABIT_STREAK_DROP_DAYS_THRESHOLD = 3` days)**:
   - Compares the user's historical maximum streak to their current streak when inactive for $\ge 3$ consecutive days.
   - Flags **Medium Priority** noting streak momentum loss and suggesting low-friction restarts.
4. **Savings Pace Behind Goal (`SAVINGS_PACE_BEHIND_PCT_THRESHOLD = 0.85` or 85%)**:
   - Compares actual cumulative savings pace to target savings trajectory across the rolling window.
   - Flags **Medium Priority** citing current savings pace percentage versus target benchmark and exact monthly gap.
5. **Positive Reinforcement for Healthy Users**:
   - When no risk thresholds are breached, the engine generates zero alarms and provides positive reinforcement recognizing strong habits and solid financial runway.

### 2. Grounded User Explanations
Every recommendation includes grounded data attributes (`user_metric_name`, `user_metric_value`, `threshold_value`) so explanations cite the user's authentic logged metrics (e.g. *"Your savings runway is 1.8 months, which is below the 3.0-month emergency reserve threshold"*), avoiding generic non-contextual advice.

### 3. Clear Automated Heuristic Disclaimer
All recommendations are strictly labeled with the mandatory disclaimer:
> **"Automated Life Simulation Heuristics: These recommendations are algorithmically generated based on your logged habits, academic metrics, and financial records. They do not constitute certified financial, legal, or medical advice. Consult qualified professionals before making significant lifestyle, medical, or investment changes."**

### 4. Backend Endpoints
- `GET /api/v1/recommendations`: Returns prioritized recommendations (`high`, `medium`, `low`), metrics citation metadata, and domain tags.

### 5. Frontend UI
- **Dashboard Overview (`/overview`)**: Dismissible recommendation cards embedded between ML forecasts and visual charts, with priority badges and metric comparison chips.
- **Dedicated View (`/recommendations`)**: Dedicated page with domain category filtering (Finance, Study, Habits, All), local storage persistence for dismissals, and visible educational disclaimer banner.

---

## Phase 7: Conversational AI Chatbot with Tool Calling & Grounded Action Plans

### 1. Abstract Provider Architecture
The conversational assistant implements an abstract provider interface ([`backend/app/llm/base.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/backend/app/llm/base.py)) with an official Google Gemini implementation ([`backend/app/llm/gemini_provider.py`](file:///d:/AI-Based-Virtual-Risk-and-Compliance/backend/app/llm/gemini_provider.py)) utilizing the `google-genai` SDK:
- **Zero Hardcoded Secrets**: `GEMINI_API_KEY` and `GEMINI_MODEL` are read exclusively from `.env` via Pydantic settings.
- **Pluggable Architecture**: Easily swap or mock LLM providers for offline testing and continuous integration without live API calls.

### 2. Strict Security Context Injection (Anti-Spoofing)
- **Model Cannot Provide `user_id`**: Tool functions declared to the model NEVER accept a `user_id` argument.
- **Server-Side Injection**: Before executing any tool, the backend strips any attempted `user_id` injection from the model arguments and binds the authenticated user ID extracted directly from the verified JWT.
- **Cross-User Protection**: Automated unit tests prove that an attacker cannot inspect or mutate another user's personal records or simulation results by injecting arbitrary UUIDs.

### 3. Seven Grounded Tools
All chat assistant data responses are grounded in authenticated user logs:
1. `get_user_summary`: Aggregates income, expenses, runway, study hours, scores, sleep, exercise, and streaks over 7d/30d/90d.
2. `run_prediction`: Executes ML inference models for finance, study, habits, or multi-domain overview.
3. `run_simulation`: Triggers the 500+ iteration stochastic Monte Carlo counterfactual engine for what-if scenarios.
4. `get_recommendations`: Retrieves deterministic rule-based prioritized recommendations and cited metrics.
5. `create_plan`: Intercepted by the backend to return a **provisional proposal card** without writing directly to the database.
6. `list_plans`: Lists existing confirmed action plans with status filters.
7. `update_plan`: Returns a proposed modification for user confirmation before persistence.

### 4. Guardrails & Safety
- **Grounding Guardrail**: The system prompt enforces that all numbers, percentages, and performance scores must come directly from tool outputs, not hallucinated estimates. Tool outputs are logged alongside model turns.
- **5-Iteration Loop Cap**: Prevents recursive tool-calling runaways by capping tool execution to 5 calls per user turn.
- **Mandatory Disclaimers**: Automatically appends legal/health disclaimers to any response discussing investments, debt/credit, savings targets, or sleep/health.
- **Confirmation-First Action Plans**: Proposals do NOT mutate the database until the user explicitly clicks "Approve & Save Plan" on the frontend confirmation card.

### 5. API Endpoints
- `POST /api/v1/chat/send`: Sends user message, executes tool calling loop, extracts proposals, persists turn to `chat_messages`, and returns assistant response.
- `GET /api/v1/chat/history`: Returns chronologically ordered, user-scoped conversational messages.
- `DELETE /api/v1/chat/history`: Clears the authenticated user's chat history.
- `GET /api/v1/plans`: Lists saved action plans.
- `POST /api/v1/plans`: Confirms and creates a new action plan.
- `PUT /api/v1/plans/{plan_id}`: Updates a plan's status or details.
- `DELETE /api/v1/plans/{plan_id}`: Deletes an action plan.

### 6. Frontend UI
- **Chat (`/chat`)**: Real-time conversational interface featuring live tool activity badges (e.g. `⚡ Executed: run_simulation`), proposed plan confirmation cards with one-click approval, typing state indicators, quick prompt shortcuts, and chat history management.
- **Action Plans Tracker (`/plans`)**: Dedicated action tracker allowing users to monitor approved milestones, filter by life domain (Finance, Study, Habit, General), update task status (`pending`, `in_progress`, `completed`), and manually create new plans.

---

## Phase 8: Polish, Plans Tracker & Full System Acceptance

### 1. Clean Acceptance Run (from scratch)

```bash
# 1. Tear down everything (volumes, containers)
docker compose down -v

# 2. Rebuild and start all services
docker compose up --build -d

# 3. Wait for the health check to pass, then run Alembic migrations
docker compose exec backend alembic upgrade head

# 4. Ingest public Kaggle benchmark data into the demo user
docker compose exec backend python ml/ingest.py

# 5. Generate synthetic multi-persona training data
docker compose exec backend python ml/synthetic.py

# 6. (Optional) Retrain ML models
docker compose exec backend python ml/train.py

# 7. Register a new user via the API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@twin.ai","password":"DemoPass123!","full_name":"Demo User","currency":"USD"}'

# Frontend: http://localhost:3000
# API Docs:  http://localhost:8000/docs
```

### 2. Rate Limiting

| Endpoint Group          | Limit                            | Source               |
| :--- | :--- | :--- |
| `POST /auth/register`   | `RATE_LIMIT_AUTH_PER_MINUTE` / IP | `core/config.py` env var |
| `POST /auth/login`      | `RATE_LIMIT_AUTH_PER_MINUTE` / IP | `core/config.py` env var |
| `POST /chat/send`       | `RATE_LIMIT_CHAT_PER_MINUTE` / IP | `core/config.py` env var |

Rate limits are configurable via `.env` (default: 15 auth / min, 25 chat / min). The in-memory sliding window rate limiter lives in `app/core/security.py`.

### 3. Security Checklist

| Control | Status | Details |
| :--- | :--- | :--- |
| Passwords | ✅ bcrypt hashed | Salt per user, no plaintext ever stored |
| JWT secrets | ✅ `.env` only | Never hardcoded; `JWT_SECRET` must be 32+ chars |
| CORS | ✅ Whitelist-only | Configured via `CORS_ORIGINS` env var |
| User data isolation | ✅ All queries scoped to `current_user.id` from JWT | No user-supplied `user_id` accepted |
| Gemini tool calling | ✅ Server-side ID injection | Model cannot supply or override `user_id` |
| Rate limiting | ✅ Auth + Chat endpoints | In-memory sliding window per client IP |
| GDPR/CCPA export | ✅ All 10 tables | `GET /api/v1/user/export-data` |
| GDPR/CCPA delete | ✅ Cascade delete | `DELETE /api/v1/user/delete-data` removes user + all linked records |
| Secrets in `.env.example` | ✅ No real secrets | All values are clear placeholders |

### 4. Demo Credentials (for Local Dev / Testing)

The ingestion scripts automatically create a demo user with email `demo@ingest.test` and password `ingest_secret_1234`. Do **not** use these credentials in production.

### 5. Dark Mode & Responsive Layout

- **Dark Mode Toggle**: Available in the top-right header of every authenticated page. State is persisted to `localStorage` and synced with the `dark` class on `<html>`.
- **Mobile Layout**: The sidebar is hidden on mobile/tablet (`< lg`) and accessed via a hamburger button that opens a full-height slide-in drawer with a backdrop overlay.
- **Breakpoints**: Sidebar is static on `lg+`, overlay-only on `< lg`. Main content padding scales from `p-4` (mobile) to `p-8` (desktop).

### 6. Loading, Empty & Error States

All dashboard pages implement:
- **Loading spinner**: Animated ring while fetching data.
- **Empty state**: Illustrated prompt with an action button when no data exists.
- **Error state**: Red alert banner with the error message and a retry button.

### 7. Known Limitations & Caveats

> [!WARNING]
> **Simulation Config Assumptions**
> Cross-domain coupling parameters (sleep→study, exercise→mood, savings-runway→habits) are heuristic estimates grounded in behavioral research but have not been validated against a controlled longitudinal user cohort. They are configurable in `backend/app/core/simulation_config.py` and surfaced transparently via `/api/v1/simulations/assumptions`.

> [!NOTE]
> **Cold-Start Blending**
> With fewer than 30 personal data points, the blending weight `w_personal = N/30` means predictions lean heavily on the global Kaggle model. Predictions for new users are labeled `data_source: "global"` and should be interpreted as category-level baselines, not personal projections.

> [!CAUTION]
> **Medical & Financial Disclaimer**
> All predictions, simulations, recommendations, and chat outputs are **automated algorithmic estimates only**. They do **not** constitute certified financial, legal, investment, or medical advice. **Consult qualified professionals** before making significant financial, health, or career decisions.

### 8. Test Suite

Run all 49 tests locally:
```bash
# Set PYTHONPATH to resolve backend and ml imports
$env:PYTHONPATH = "backend;ml"
python -m pytest backend/tests/ -v --tb=short
```

Run inside Docker (Python 3.12):
```bash
docker compose exec backend python -m pytest /app/backend/tests/ -v --tb=short --no-header
```

| Module | Tests | Coverage |
| :--- | :--- | :--- |
| `test_auth.py` | Auth register, login, duplicate, rate limit | Full happy + edge paths |
| `test_crud.py` | Finance, Study, Habit CRUD + pagination | Create, list, update, delete |
| `test_dashboard.py` | Analytics API: Finance, Study, Habits | Empty state + populated |
| `test_features.py` | ML feature extraction | Smoke test per domain |
| `test_isolation.py` | Cross-user isolation + tool call spoofing | Security regression |
| `test_predictions.py` | ML inference endpoints | Response shape + value ranges |
| `test_simulation.py` | Monte Carlo engine + coupling effects | Salary raises savings, sleep reduction lowers study |
| `test_recommendations.py` | Rule triggers + data grounding | Threshold breach detection |
| `test_chat.py` | Tool loop, grounding guardrail, plan proposals | Full tool-call integration |
| `test_data_management.py` | Export all tables, cascade delete, scoping | GDPR compliance |

