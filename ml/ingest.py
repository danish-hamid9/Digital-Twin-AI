"""
Kaggle Dataset Ingestion & Schema Mapper
Cleans and maps raw CSVs into the Digital Twin PostgreSQL schema.
Idempotent: Re-running skips or updates existing seeded records without duplication.
"""

import os
import sys
import logging
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ingest")

# Add backend directory to sys.path so app models can be imported
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent
sys.path.insert(0, str(repo_root / "backend"))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, Profile
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog, Goal

RAW_DATA_DIR = repo_root / "data" / "raw"

# Determine synchronous database connection URL for bulk ingestion
db_url = os.getenv("SYNC_DATABASE_URL", settings.SYNC_DATABASE_URL)
if "asyncpg" in db_url:
    db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

def get_or_create_seed_user(session, email="demo_kaggle@digitaltwin.ai", full_name="Kaggle Benchmark Twin", currency="USD"):
    user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        logger.info(f"Creating seed user: {email}")
        user = User(
            email=email,
            hashed_password=get_password_hash("DemoTwin2026!"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(user)
        session.flush()

        profile = Profile(
            user_id=user.id,
            full_name=full_name,
            currency=currency,
            monthly_target_savings=600.0,
            target_study_hours_week=18.0,
            target_sleep_hours=7.5
        )
        session.add(profile)
        session.commit()
    else:
        logger.info(f"Using existing seed user: {email} (id={user.id})")
    return user

def ingest_personal_finance(session, user):
    csv_path = RAW_DATA_DIR / "data.csv"
    if not csv_path.exists():
        logger.warning(f"Skipping personal finance: '{csv_path}' not found.")
        return

    logger.info("=" * 60)
    logger.info("INGESTING: Personal Finance / Expenses (data.csv)")
    logger.info("Column Mappings:")
    logger.info("  - Income              -> finance_entries.amount (type='income', category='Salary')")
    logger.info("  - Rent                -> finance_entries.amount (type='expense', category='Housing/Rent')")
    logger.info("  - Groceries           -> finance_entries.amount (type='expense', category='Groceries')")
    logger.info("  - Transport           -> finance_entries.amount (type='expense', category='Transportation')")
    logger.info("  - Eating_Out          -> finance_entries.amount (type='expense', category='Dining Out')")
    logger.info("  - Entertainment       -> finance_entries.amount (type='expense', category='Entertainment')")
    logger.info("  - Utilities           -> finance_entries.amount (type='expense', category='Utilities')")
    logger.info("  - Healthcare          -> finance_entries.amount (type='expense', category='Healthcare')")
    logger.info("  - Education           -> finance_entries.amount (type='expense', category='Education')")
    logger.info("  - Miscellaneous       -> finance_entries.amount (type='expense', category='Miscellaneous')")
    logger.info("  - Desired_Savings     -> savings_goals.target_amount")
    logger.info("=" * 60)

    # Clean existing entries for this seed user to ensure idempotency
    session.execute(delete(FinanceEntry).where(FinanceEntry.user_id == user.id))
    session.execute(delete(SavingsGoal).where(SavingsGoal.user_id == user.id))

    df = pd.read_csv(csv_path)
    
    # Take representative monthly snapshots across past 6 months
    today = date.today()
    num_months = min(6, len(df))
    entries_to_add = []

    for month_idx in range(num_months):
        row = df.iloc[month_idx]
        month_date = (today.replace(day=1) - timedelta(days=month_idx * 30)).replace(day=1)

        # 1. Monthly Income
        income_amt = float(row.get("Income", 3500.0))
        entries_to_add.append(FinanceEntry(
            user_id=user.id,
            date=month_date,
            type="income",
            category="Salary",
            amount=round(income_amt, 2),
            description="Monthly Base Salary"
        ))

        # 2. Categorized Expenses
        expense_mapping = {
            "Rent": ("Housing/Rent", 5),
            "Groceries": ("Groceries", 7),
            "Transport": ("Transportation", 10),
            "Utilities": ("Utilities", 12),
            "Eating_Out": ("Dining Out", 15),
            "Entertainment": ("Entertainment", 18),
            "Healthcare": ("Healthcare", 22),
            "Education": ("Education", 25),
            "Miscellaneous": ("Miscellaneous", 28),
        }

        for col, (cat_name, day_offset) in expense_mapping.items():
            if col in row and pd.notna(row[col]) and float(row[col]) > 0:
                expense_date = month_date + timedelta(days=day_offset)
                entries_to_add.append(FinanceEntry(
                    user_id=user.id,
                    date=expense_date,
                    type="expense",
                    category=cat_name,
                    amount=round(float(row[col]), 2),
                    description=f"{cat_name} expense from Kaggle benchmark"
                ))

    session.bulk_save_objects(entries_to_add)

    # Desired savings goal
    if "Desired_Savings" in df.columns:
        desired_savings = float(df["Desired_Savings"].iloc[0])
        goal = SavingsGoal(
            user_id=user.id,
            title="Emergency Fund & Target Savings",
            target_amount=round(desired_savings, 2),
            current_amount=round(desired_savings * 0.45, 2),
            target_date=today + timedelta(days=180)
        )
        session.add(goal)

    session.commit()
    logger.info(f"Ingested {len(entries_to_add)} personal finance entries and 1 savings goal.")

def ingest_sleep_and_habits(session, user):
    csv_path = RAW_DATA_DIR / "sleep_cycle_productivity.csv"
    if not csv_path.exists():
        logger.warning(f"Skipping sleep & habits: '{csv_path}' not found.")
        return

    logger.info("=" * 60)
    logger.info("INGESTING: Sleep & Wellbeing (sleep_cycle_productivity.csv)")
    logger.info("Column Mappings:")
    logger.info("  - Date                   -> habit_logs.date")
    logger.info("  - Total Sleep Hours      -> habit_logs.sleep_hours")
    logger.info("  - Exercise (mins/day)    -> habit_logs.exercise_minutes")
    logger.info("  - Mood Score (1-10)      -> habit_logs.mood (scaled to 1-5)")
    logger.info("  - Sleep Quality & Exerc. -> habit_logs.done (boolean)")
    logger.info("=" * 60)

    session.execute(delete(HabitLog).where(HabitLog.user_id == user.id))

    df = pd.read_csv(csv_path)
    
    # Sort and take latest 90 daily logs
    if "Date" in df.columns:
        df["parsed_date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["parsed_date"]).sort_values("parsed_date")
    
    logs_to_add = []
    # Take up to 90 rows
    subset = df.tail(90) if len(df) >= 90 else df

    for _, row in subset.iterrows():
        log_date = row["parsed_date"].date() if "parsed_date" in row and pd.notna(row["parsed_date"]) else date.today()
        sleep_hours = float(row.get("Total Sleep Hours", 7.0))
        exercise_mins = int(row.get("Exercise (mins/day)", 30))
        raw_mood = float(row.get("Mood Score", 3))
        # Scale 1-10 to 1-5
        mood = max(1, min(5, round(raw_mood / 2)))
        done = bool(sleep_hours >= 6.5 and exercise_mins >= 20)

        logs_to_add.append(HabitLog(
            user_id=user.id,
            date=log_date,
            habit="Sleep & Physical Fitness",
            done=done,
            sleep_hours=round(sleep_hours, 2),
            exercise_minutes=exercise_mins,
            mood=mood
        ))

    session.bulk_save_objects(logs_to_add)
    session.commit()
    logger.info(f"Ingested {len(logs_to_add)} habit logs.")

def ingest_student_lifestyle(session, user):
    csv_path = RAW_DATA_DIR / "student_lifestyle_dataset.csv"
    if not csv_path.exists():
        logger.warning(f"Skipping student lifestyle: '{csv_path}' not found.")
        return

    logger.info("=" * 60)
    logger.info("INGESTING: Student Performance & Study (student_lifestyle_dataset.csv)")
    logger.info("Column Mappings & Gap Handling:")
    logger.info("  - Study_Hours_Per_Day -> study_sessions.hours (per subject)")
    logger.info("  - GPA (0-4.0 scale)   -> study_sessions.score (mapped to 0-100% via GPA * 25)")
    logger.info("  - Gap (no timestamps) -> Synthesized daily study timeline over 60 days across subjects")
    logger.info("=" * 60)

    session.execute(delete(StudySession).where(StudySession.user_id == user.id))

    df = pd.read_csv(csv_path)
    sessions_to_add = []
    subjects = ["Computer Science", "Mathematics", "Machine Learning", "Economics", "Statistics"]
    today = date.today()

    num_sessions = min(60, len(df))
    for i in range(num_sessions):
        row = df.iloc[i]
        study_hours = float(row.get("Study_Hours_Per_Day", 3.0))
        gpa = float(row.get("GPA", 3.2))
        score = min(100.0, max(40.0, round(gpa * 25.0 + ((i % 5) - 2) * 2.5, 1)))
        session_date = today - timedelta(days=num_sessions - i)
        subject = subjects[i % len(subjects)]

        sessions_to_add.append(StudySession(
            user_id=user.id,
            date=session_date,
            subject=subject,
            hours=round(max(0.5, study_hours), 2),
            score=score,
            notes=f"Kaggle benchmark student #{int(row.get('Student_ID', i+1))} profile"
        ))

    session.bulk_save_objects(sessions_to_add)
    session.commit()
    logger.info(f"Ingested {len(sessions_to_add)} study sessions.")

def main():
    logger.info("Starting Digital Twin Data Ingestion Pipeline...")
    with SessionLocal() as session:
        user = get_or_create_seed_user(session)
        ingest_personal_finance(session, user)
        ingest_sleep_and_habits(session, user)
        ingest_student_lifestyle(session, user)
    logger.info("Data ingestion completed successfully!")

if __name__ == "__main__":
    main()
