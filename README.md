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
