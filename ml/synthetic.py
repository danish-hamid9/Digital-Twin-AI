"""
Synthetic Data Generator for Digital Twin AI
Generates 90 days of correlated finance, study, and habit time-series data
for 3 distinct archetypal demo personas, seeded for reproducibility.
"""

import os
import sys
import random
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
import numpy as np
from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import sessionmaker

# Setup path to import backend models
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent
sys.path.insert(0, str(repo_root / "backend"))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, Profile
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog, Goal
from app.models.plan import Plan

# Deterministic seeding
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

db_url = os.getenv("SYNC_DATABASE_URL", settings.SYNC_DATABASE_URL)
if "asyncpg" in db_url:
    db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

PERSONAS = [
    {
        "email": "alex@digitaltwin.ai",
        "full_name": "Alex Mercer",
        "occupation": "Senior Software Engineer",
        "currency": "USD",
        "monthly_salary": 7500.0,
        "monthly_target_savings": 2500.0,
        "target_study_hours_week": 14.0,
        "target_sleep_hours": 7.5,
        "base_sleep": 7.6,
        "sleep_variance": 0.4,
        "base_exercise": 45,
        "base_mood": 4,
        "study_subjects": ["System Architecture", "Rust Programming", "Distributed Systems"],
        "base_study_hours": 2.0,
        "base_score": 92.0,
        "expense_ratio": 0.45,  # 45% of income
        "personality": "disciplined_tech_lead"
    },
    {
        "email": "maya@digitaltwin.ai",
        "full_name": "Maya Lin",
        "occupation": "Graduate Medical Student",
        "currency": "EUR",
        "monthly_salary": 2200.0,
        "monthly_target_savings": 350.0,
        "target_study_hours_week": 28.0,
        "target_sleep_hours": 7.0,
        "base_sleep": 5.4,  # High sleep debt
        "sleep_variance": 0.9,
        "base_exercise": 15,
        "base_mood": 2,  # Stressed
        "study_subjects": ["Clinical Pathology", "Biochemistry", "Pharmacology", "Neuroanatomy"],
        "base_study_hours": 4.5,
        "base_score": 76.0,
        "expense_ratio": 0.85,  # 85% of income, tight margin
        "personality": "stressed_student_burnout_risk"
    },
    {
        "email": "sam@digitaltwin.ai",
        "full_name": "Sam Rivera",
        "occupation": "Product Analyst",
        "currency": "GBP",
        "monthly_salary": 4200.0,
        "monthly_target_savings": 1000.0,
        "target_study_hours_week": 10.0,
        "target_sleep_hours": 7.2,
        "base_sleep": 7.1,
        "sleep_variance": 0.5,
        "base_exercise": 30,
        "base_mood": 4,
        "study_subjects": ["Data Science with Python", "SQL for Business", "Machine Learning"],
        "base_study_hours": 1.5,
        "base_score": 84.0,
        "expense_ratio": 0.60,
        "personality": "balanced_career_switcher"
    }
]

def generate_correlated_user_data(session, persona_cfg, days=90):
    email = persona_cfg["email"]
    
    # 1. User & Profile
    user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash("TwinPassword2026!"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(user)
        session.flush()

        profile = Profile(
            user_id=user.id,
            full_name=persona_cfg["full_name"],
            occupation=persona_cfg["occupation"],
            currency=persona_cfg["currency"],
            monthly_target_savings=persona_cfg["monthly_target_savings"],
            target_study_hours_week=persona_cfg["target_study_hours_week"],
            target_sleep_hours=persona_cfg["target_sleep_hours"]
        )
        session.add(profile)
    else:
        # Clear existing data for idempotency
        session.execute(delete(FinanceEntry).where(FinanceEntry.user_id == user.id))
        session.execute(delete(SavingsGoal).where(SavingsGoal.user_id == user.id))
        session.execute(delete(StudySession).where(StudySession.user_id == user.id))
        session.execute(delete(HabitLog).where(HabitLog.user_id == user.id))
        session.execute(delete(Goal).where(Goal.user_id == user.id))
        session.execute(delete(Plan).where(Plan.user_id == user.id))

    session.flush()
    uid = user.id
    today = date.today()

    finance_entries = []
    study_sessions = []
    habit_logs = []

    # Add Savings Goal
    target_goal = SavingsGoal(
        user_id=uid,
        title="6-Month Emergency & Growth Fund",
        target_amount=persona_cfg["monthly_target_savings"] * 6,
        current_amount=persona_cfg["monthly_target_savings"] * 2.2,
        target_date=today + timedelta(days=120)
    )
    session.add(target_goal)

    # 90-day time-series generation with cross-domain correlation
    for d_idx in range(days):
        current_date = today - timedelta(days=days - 1 - d_idx)
        is_weekend = current_date.weekday() >= 5
        day_of_month = current_date.day

        # A. Sleep & Habits with correlated variance
        # Random sleep shock
        sleep_noise = np.random.normal(0, persona_cfg["sleep_variance"])
        # Weekends allow slightly more catch-up sleep
        weekend_sleep_bonus = 0.6 if is_weekend else 0.0
        sleep_hours = max(3.5, min(10.5, round(persona_cfg["base_sleep"] + sleep_noise + weekend_sleep_bonus, 1)))

        # Sleep deficit effect on mood and fatigue
        sleep_deficit = max(0.0, 7.0 - sleep_hours)
        mood_modifier = -1 if sleep_deficit > 1.5 else (1 if sleep_hours >= 7.5 else 0)
        mood = max(1, min(5, persona_cfg["base_mood"] + mood_modifier + (1 if is_weekend else 0)))

        # Exercise
        exercise_prob = 0.85 if persona_cfg["personality"] == "disciplined_tech_lead" else (0.4 if is_weekend else 0.25)
        exercise_mins = int(persona_cfg["base_exercise"] + np.random.randint(-10, 15)) if random.random() < exercise_prob else 0
        habit_done = bool(sleep_hours >= 6.5 and (exercise_mins >= 20 or is_weekend))

        habit_logs.append(HabitLog(
            user_id=uid,
            date=current_date,
            habit="Daily Fitness & Sleep",
            done=habit_done,
            sleep_hours=sleep_hours,
            exercise_minutes=exercise_mins,
            mood=mood
        ))

        # B. Study sessions correlated with sleep & weekend patterns
        # If sleep is critically low (< 5.5h), study retention / score decreases by 8% - 15%
        study_day_prob = 0.4 if is_weekend else 0.85
        if random.random() < study_day_prob:
            subject = random.choice(persona_cfg["study_subjects"])
            hours = max(0.5, min(8.0, round(persona_cfg["base_study_hours"] + np.random.normal(0, 0.5), 1)))
            
            # Cognitive penalty from sleep debt
            fatigue_penalty = (sleep_deficit * 3.5) if sleep_deficit > 1.0 else 0.0
            score = max(45.0, min(99.0, round(persona_cfg["base_score"] - fatigue_penalty + np.random.normal(0, 3.0), 1)))

            study_sessions.append(StudySession(
                user_id=uid,
                date=current_date,
                subject=subject,
                hours=hours,
                score=score,
                notes=f"Deep work session ({'high focus' if sleep_hours >= 7 else 'fatigue noted'})"
            ))

        # C. Finance entries (Monthly salary + recurring bills + discretionary daily spends)
        # 1. Salary on the 1st of the month
        if day_of_month == 1:
            finance_entries.append(FinanceEntry(
                user_id=uid,
                date=current_date,
                type="income",
                category="Salary",
                amount=round(persona_cfg["monthly_salary"], 2),
                description="Monthly Primary Income"
            ))

        # 2. Fixed bills around 5th of each month
        if day_of_month == 5:
            rent = round(persona_cfg["monthly_salary"] * 0.28, 2)
            finance_entries.append(FinanceEntry(
                user_id=uid,
                date=current_date,
                type="expense",
                category="Housing/Rent",
                amount=rent,
                description="Apartment Lease"
            ))

        # 3. Discretionary expenses (groceries, dining, transport)
        if random.random() < 0.65:
            cat = "Dining Out" if is_weekend else random.choice(["Groceries", "Transportation", "Utilities", "Coffee/Snacks"])
            base_amt = 45.0 if is_weekend else 18.0
            amount = round(base_amt * (1.0 + np.random.exponential(0.5)), 2)
            finance_entries.append(FinanceEntry(
                user_id=uid,
                date=current_date,
                type="expense",
                category=cat,
                amount=amount,
                description=f"Routine {cat.lower()}"
            ))

    session.bulk_save_objects(finance_entries)
    session.bulk_save_objects(study_sessions)
    session.bulk_save_objects(habit_logs)

    # Initial proposed action plan
    plan = Plan(
        user_id=uid,
        title=f"Optimize {persona_cfg['full_name'].split()[0]}'s Cognitive Recovery",
        description="Maintain >=7.2h sleep baseline on high-workload weekdays to boost study exam retention by 10%.",
        domain="habit",
        status="in_progress",
        due_date=today + timedelta(days=30)
    )
    session.add(plan)

    session.commit()
    return len(finance_entries), len(study_sessions), len(habit_logs)

def main():
    print(f"Generating 90-day synthetic dataset for {len(PERSONAS)} distinct personas (seed={RANDOM_SEED})...")
    with SessionLocal() as session:
        for p in PERSONAS:
            f_count, s_count, h_count = generate_correlated_user_data(session, p, days=90)
            print(f"  [+] {p['full_name']} ({p['email']}): {f_count} finance, {s_count} study, {h_count} habit records generated.")
    print("Synthetic data generation finished successfully!")

if __name__ == "__main__":
    main()
