"""
Seed Demo Account for Digital Twin AI (demo@digitaltwin.ai).
Idempotent script with --reset flag.

Story & Dynamics:
- User: demo@digitaltwin.ai
- Currency: USD
- Timeframe: ~3 weeks (21 days) leading up to today.
- 12 finance entries, 12 study sessions, 12 habit logs.
- Realistic storyline:
  * Regular income and living expenses.
  * Several consecutive nights with sleep < 6.5h followed by lower exam scores.
  * Liquid savings close to the 3-month emergency fund threshold ($2,850 vs $900/mo expenses -> ~3.1 months runway).
  * All rows tagged with source="synthetic".
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, date, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend and project root to Python path
current_dir = Path(__file__).resolve().parent
repo_root = current_dir if current_dir.name != "scripts" else current_dir.parent
sys.path.insert(0, str(repo_root / "backend"))
sys.path.insert(0, str(repo_root))

from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, Profile
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog, Goal
from app.models.plan import Plan

DEMO_EMAIL = "demo@digitaltwin.ai"
DEMO_PASSWORD = "DemoPassword2026!"
DEMO_FULL_NAME = "Demo Persona"
DEMO_OCCUPATION = "Associate Analyst & Part-time Student"
DEMO_CURRENCY = "INR"


from app.core.database import Base


def get_sync_engine():
    db_url = os.getenv("SYNC_DATABASE_URL", settings.SYNC_DATABASE_URL)
    if "asyncpg" in db_url:
        db_url = db_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    if db_url.startswith("sqlite:///") and not db_url.startswith("sqlite:////"):
        rel_path = db_url.replace("sqlite:///", "")
        abs_path = (repo_root / "backend" / rel_path).resolve()
        db_url = f"sqlite:///{abs_path}"
    connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
    engine = create_engine(db_url, connect_args=connect_args)
    Base.metadata.create_all(bind=engine)
    return engine


def get_sync_session():
    engine = get_sync_engine()
    return sessionmaker(bind=engine)()


def seed_demo_account(reset: bool = False):
    session = get_sync_session()
    try:
        user = session.execute(select(User).where(User.email == DEMO_EMAIL)).scalar_one_or_none()

        if user and not reset:
            print(f"[!] Demo user '{DEMO_EMAIL}' already exists. Use --reset to re-seed demo data.")
            return user.id

        if user and reset:
            print(f"[*] Reset flag active. Cleaning up existing demo data for '{DEMO_EMAIL}'...")
            session.execute(delete(FinanceEntry).where(FinanceEntry.user_id == user.id))
            session.execute(delete(SavingsGoal).where(SavingsGoal.user_id == user.id))
            session.execute(delete(StudySession).where(StudySession.user_id == user.id))
            session.execute(delete(HabitLog).where(HabitLog.user_id == user.id))
            session.execute(delete(Goal).where(Goal.user_id == user.id))
            session.execute(delete(Plan).where(Plan.user_id == user.id))
            session.commit()
            print("[+] Cleared old records for demo user.")

        if not user:
            print(f"[*] Creating user '{DEMO_EMAIL}'...")
            user = User(
                email=DEMO_EMAIL,
                hashed_password=get_password_hash(DEMO_PASSWORD),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(user)
            session.flush()

            profile = Profile(
                user_id=user.id,
                full_name=DEMO_FULL_NAME,
                occupation=DEMO_OCCUPATION,
                currency=DEMO_CURRENCY,
                monthly_target_savings=10000.0,
                target_study_hours_week=14.0,
                target_sleep_hours=7.5,
            )
            session.add(profile)
            session.flush()
        else:
            # Ensure existing profile has INR currency and correct targets
            if user.profile:
                user.profile.currency = DEMO_CURRENCY
                user.profile.monthly_target_savings = 10000.0
                user.profile.target_sleep_hours = 7.5
                session.flush()

        uid = user.id
        today = date.today()

        # -------------------------------------------------------------
        # 1. Savings Goal (Emergency Fund close to threshold)
        # -------------------------------------------------------------
        emergency_goal = SavingsGoal(
            user_id=uid,
            title="3-Month Emergency Safety Net",
            target_amount=120000.0,
            current_amount=45000.0,
            target_date=today + timedelta(days=90),
        )
        session.add(emergency_goal)

        # -------------------------------------------------------------
        # 2. Exactly 12 Finance Entries forming realistic 3-week story in INR
        # Monthly salary on day -20 (₹45,000) + recurring rent (₹12,000) + utility (₹2,200) + groceries/dining
        # -------------------------------------------------------------
        finance_data = [
            # Day -20: Monthly Salary
            (today - timedelta(days=20), "income", "Salary", 45000.0, "Monthly Salary Deposit"),
            # Day -19: Rent payment
            (today - timedelta(days=19), "expense", "Rent", 12000.0, "Apartment Rent"),
            # Day -17: Utilities & Internet
            (today - timedelta(days=17), "expense", "Utilities", 2200.0, "Electricity & Internet Bill"),
            # Day -15: Weekly Groceries
            (today - timedelta(days=15), "expense", "Groceries", 3500.0, "Supermarket Groceries"),
            # Day -13: Transportation pass
            (today - timedelta(days=13), "expense", "Transportation", 1800.0, "Monthly Transit Card Top-up"),
            # Day -11: Textbooks & Study Materials
            (today - timedelta(days=11), "expense", "Education", 2500.0, "Data Analytics Textbook"),
            # Day -9: Dining out with study group
            (today - timedelta(days=9), "expense", "Dining Out", 1500.0, "Dinner with Classmates"),
            # Day -8: Groceries
            (today - timedelta(days=8), "expense", "Groceries", 3200.0, "Mid-week Grocery Restock"),
            # Day -6: Freelance tutoring side-income
            (today - timedelta(days=6), "income", "Freelance", 5000.0, "Math Tutoring Session"),
            # Day -4: Coffee & snacks during cramming
            (today - timedelta(days=4), "expense", "Dining Out", 650.0, "Coffee & Snacks during Study"),
            # Day -2: Groceries
            (today - timedelta(days=2), "expense", "Groceries", 3800.0, "Weekend Grocery Supply"),
            # Day -1: Unplanned Pharmacy & Health expense
            (today - timedelta(days=1), "expense", "Healthcare", 1200.0, "Pharmacy Vitamins & Pain Relief"),
        ]

        finance_entries = [
            FinanceEntry(
                user_id=uid,
                date=f_date,
                type=f_type,
                category=f_cat,
                amount=f_amt,
                description=f_desc,
                source="synthetic",
            )
            for f_date, f_type, f_cat, f_amt, f_desc in finance_data
        ]
        session.bulk_save_objects(finance_entries)

        # -------------------------------------------------------------
        # 3. Exactly 12 Habit Logs (Forming problem days: low sleep < 6.5h)
        # Days -10 to -7: Good sleep (7.2h - 8.0h)
        # Days -6 to -3: Sleep deprivation crisis (5.0h - 6.0h < 6.5h threshold)
        # Days -2 to 0: Recovery attempt (6.8h - 7.5h)
        # -------------------------------------------------------------
        habit_data = [
            # date, habit, done, sleep_hours, exercise_minutes, mood
            (today - timedelta(days=18), "Sleep & Fitness", True, 7.5, 30, 4),
            (today - timedelta(days=16), "Sleep & Fitness", True, 7.8, 35, 4),
            (today - timedelta(days=14), "Sleep & Fitness", True, 7.2, 25, 4),
            (today - timedelta(days=12), "Sleep & Fitness", True, 7.4, 30, 4),
            (today - timedelta(days=10), "Sleep & Fitness", True, 7.0, 20, 3),
            # Problem Days (Low sleep under 6.5h threshold, missed workouts, low mood)
            (today - timedelta(days=6), "Sleep & Fitness", False, 5.2, 0, 2),
            (today - timedelta(days=5), "Sleep & Fitness", False, 5.5, 0, 2),
            (today - timedelta(days=4), "Sleep & Fitness", False, 5.8, 0, 1),
            (today - timedelta(days=3), "Sleep & Fitness", False, 6.0, 10, 2),
            # Recovery Days
            (today - timedelta(days=2), "Sleep & Fitness", True, 7.0, 25, 3),
            (today - timedelta(days=1), "Sleep & Fitness", True, 7.5, 30, 4),
            (today, "Sleep & Fitness", True, 7.6, 35, 4),
        ]

        habit_logs = [
            HabitLog(
                user_id=uid,
                date=h_date,
                habit=h_name,
                done=h_done,
                sleep_hours=h_sleep,
                exercise_minutes=h_ex,
                mood=h_mood,
                source="synthetic",
            )
            for h_date, h_name, h_done, h_sleep, h_ex, h_mood in habit_data
        ]
        session.bulk_save_objects(habit_logs)

        # -------------------------------------------------------------
        # 4. Exactly 12 Study Sessions (Coupled to sleep: drops on days -6 to -3)
        # Normal score: 85 - 92
        # Problem score following low sleep: 62 - 70
        # -------------------------------------------------------------
        study_data = [
            # date, subject, hours, score, notes
            (today - timedelta(days=18), "Data Analytics", 2.5, 88.0, "Statistical hypothesis testing review"),
            (today - timedelta(days=16), "Financial Modeling", 2.0, 91.0, "Discounted Cash Flow exercises"),
            (today - timedelta(days=14), "SQL for Business", 1.5, 87.0, "Window functions and recursive CTEs"),
            (today - timedelta(days=12), "Data Analytics", 2.0, 89.0, "Regression and feature engineering"),
            (today - timedelta(days=10), "Financial Modeling", 2.5, 86.0, "Scenario analysis techniques"),
            # Problem Days (Severe cognitive fatigue from <6.5h sleep)
            (today - timedelta(days=6), "SQL for Business", 3.0, 68.0, "Struggled with query optimization due to fatigue"),
            (today - timedelta(days=5), "Data Analytics", 2.5, 64.0, "Mid-term mock exam, low retention noted"),
            (today - timedelta(days=4), "Financial Modeling", 2.0, 62.0, "Difficulty focusing on formula derivations"),
            (today - timedelta(days=3), "Data Analytics", 1.5, 70.0, "Short review, brain fog recorded"),
            # Recovery Days
            (today - timedelta(days=2), "SQL for Business", 2.0, 82.0, "Clarity returned with sleep recovery"),
            (today - timedelta(days=1), "Financial Modeling", 2.5, 89.0, "Strong grasp on valuation models"),
            (today, "Data Analytics", 2.0, 92.0, "Final review quiz aced"),
        ]

        study_sessions = [
            StudySession(
                user_id=uid,
                date=s_date,
                subject=s_sub,
                hours=s_hrs,
                score=s_score,
                notes=s_notes,
                source="synthetic",
            )
            for s_date, s_sub, s_hrs, s_score, s_notes in study_data
        ]
        session.bulk_save_objects(study_sessions)

        # Add an initial action plan
        demo_plan = Plan(
            user_id=uid,
            title="Restore Sleep Consistency & Emergency Buffer",
            description="Target >=7.5h sleep every weeknight to maintain 85%+ exam scores and allocate ₹3,000 to runway.",
            domain="habit",
            status="in_progress",
            due_date=today + timedelta(days=30),
        )
        session.add(demo_plan)

        session.commit()
        print(f"[+] Successfully seeded demo account '{DEMO_EMAIL}':")
        print(f"    - Currency:        {DEMO_CURRENCY}")
        print(f"    - Finance entries: {len(finance_entries)} (source='synthetic')")
        print(f"    - Habit logs:      {len(habit_logs)} (source='synthetic')")
        print(f"    - Study sessions:  {len(study_sessions)} (source='synthetic')")
        print(f"    - Emergency goal:  1 (Current ₹45,000 / Target ₹120,000)")
        print(f"    - Active plan:     1 ('{demo_plan.title}')")
        return uid
    finally:
        session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo account for Digital Twin AI.")
    parser.add_argument("--reset", action="store_true", help="Force wipe and re-seed of demo data.")
    args = parser.parse_args()
    seed_demo_account(reset=args.reset)
