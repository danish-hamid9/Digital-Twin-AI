import pytest
import datetime as dt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Profile
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.chat import ChatMessage
from app.services.chat_service import ChatService
from app.llm.offline_provider import OfflineProvider
from app.llm.tool_executor import execute_tool_call
from tests.conftest import TestingSessionLocal


@pytest.fixture
async def chart_test_user():
    async with TestingSessionLocal() as session:
        user = User(
            email="chart_mapper_user@digitaltwin.ai",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        profile = Profile(
            user_id=user.id,
            currency="INR",
            monthly_target_savings=10000.0,
            target_sleep_hours=7.5,
            target_study_hours_week=15.0,
        )
        session.add(profile)

        today = dt.date.today()
        # Seed 12 finance entries
        session.add(FinanceEntry(user_id=user.id, date=today - dt.timedelta(days=20), amount=45000.0, type="income", category="Salary"))
        session.add(FinanceEntry(user_id=user.id, date=today - dt.timedelta(days=19), amount=12000.0, type="expense", category="Rent"))
        session.add(FinanceEntry(user_id=user.id, date=today - dt.timedelta(days=15), amount=3500.0, type="expense", category="Groceries"))
        session.add(FinanceEntry(user_id=user.id, date=today - dt.timedelta(days=10), amount=2200.0, type="expense", category="Utilities"))

        # Seed study sessions
        for i in range(12):
            session.add(StudySession(
                user_id=user.id,
                date=today - dt.timedelta(days=15 - i),
                hours=2.5,
                score=85.0 + (i % 5),
                subject="Analytics",
            ))

        # Seed habit logs
        for i in range(12):
            session.add(HabitLog(
                user_id=user.id,
                date=today - dt.timedelta(days=15 - i),
                habit="Sleep & Routine",
                sleep_hours=6.5 + (0.2 * (i % 5)),
                exercise_minutes=30.0,
                mood=4,
                done=True,
            ))

        await session.commit()
        await session.refresh(user)
        return user


@pytest.mark.asyncio
async def test_question_types_mapped_to_correct_charts(chart_test_user):
    """
    Requirement 1: Verify charts strictly match the question type:
    - study/sleep questions -> study_vs_sleep
    - habit/burnout questions -> habit_burnout_gauge
    - savings questions -> savings_forecast
    - spending questions -> expense_donut
    - never attach expense donut to unrelated answers
    """
    async with TestingSessionLocal() as session:
        user = chart_test_user
        service = ChatService(provider=OfflineProvider())

        # 1. Study question -> study_vs_sleep chart
        turn_study = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="How has my study score and sleep duration been tracking?",
        )
        charts_study = [tc.result.get("chart_spec") for tc in turn_study.tool_calls if tc.result and tc.result.get("chart_spec")]
        assert len(charts_study) > 0, "Study question must include a chart"
        assert all(c["type"] == "study_vs_sleep" for c in charts_study), "Study question must get study_vs_sleep chart"
        assert not any(c["type"] == "expense_donut" for c in charts_study), "Study question must NEVER get expense donut"

        # 2. Habit / Burnout question -> habit_burnout_gauge chart
        turn_habit = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="What is my burnout risk and active habit streak?",
        )
        charts_habit = [tc.result.get("chart_spec") for tc in turn_habit.tool_calls if tc.result and tc.result.get("chart_spec")]
        assert len(charts_habit) > 0, "Habit question must include a chart"
        assert all(c["type"] == "habit_burnout_gauge" for c in charts_habit), "Habit question must get habit_burnout_gauge"
        assert not any(c["type"] == "expense_donut" for c in charts_habit), "Habit question must NEVER get expense donut"

        # 3. Savings question -> savings_forecast chart
        turn_savings = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="How are my projected savings and runway looking over the next 6 months?",
        )
        charts_savings = [tc.result.get("chart_spec") for tc in turn_savings.tool_calls if tc.result and tc.result.get("chart_spec")]
        assert len(charts_savings) > 0, "Savings question must include a chart"
        assert any(c["type"] in ("savings_forecast", "simulation_fan") for c in charts_savings), "Savings question must get savings forecast"
        assert not any(c["type"] == "expense_donut" for c in charts_savings), "Savings question must NEVER get expense donut"

        # 4. Spending question -> expense_donut chart
        turn_spending = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="Where did my money go? Show my spending categories and expense breakdown.",
        )
        charts_spending = [tc.result.get("chart_spec") for tc in turn_spending.tool_calls if tc.result and tc.result.get("chart_spec")]
        assert len(charts_spending) > 0, "Spending question must include a chart"
        assert any(c["type"] == "expense_donut" for c in charts_spending), "Spending question must get expense donut"

        # 5. Unrelated / general question -> NEVER attach expense donut
        turn_general = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="Hey Twin Bot! How are you doing today?",
        )
        charts_general = [tc.result.get("chart_spec") for tc in turn_general.tool_calls if tc.result and tc.result.get("chart_spec")]
        assert not any(c.get("type") == "expense_donut" for c in charts_general), "Unrelated answer must NEVER attach expense donut"


@pytest.mark.asyncio
async def test_get_daily_series_tool(chart_test_user):
    """
    Requirement 2: get_daily_series tool computes correlation coefficient and data points count.
    If fewer than 10 points, indicates correlation is unreliable.
    """
    async with TestingSessionLocal() as session:
        user = chart_test_user

        # 1. Test with >= 10 points (user has 12 points)
        res_rich = await execute_tool_call(
            tool_name="get_daily_series",
            raw_args={"days": 30},
            db=session,
            user=user,
        )
        assert res_rich["data_points_count"] >= 10
        assert res_rich["is_reliable"] is True
        assert res_rich["reliability_status"] == "reliable"
        assert res_rich["correlation_coefficient"] is not None
        assert "chart_spec" in res_rich
        assert res_rich["chart_spec"]["type"] == "study_vs_sleep"

        # 2. Test with < 10 points (request only 3 days)
        res_sparse = await execute_tool_call(
            tool_name="get_daily_series",
            raw_args={"days": 3},
            db=session,
            user=user,
        )
        assert res_sparse["data_points_count"] < 10
        assert res_sparse["is_reliable"] is False
        assert res_sparse["reliability_status"] == "unreliable"
        assert "unreliable" in res_sparse["reliability_message"].lower()


@pytest.mark.asyncio
async def test_derived_numbers_reconcile_and_settings_sleep_target(chart_test_user):
    """
    Requirement 4: Verify derived numbers reconcile (gap = target - average) and sleep target comes from Settings.
    """
    async with TestingSessionLocal() as session:
        user = chart_test_user
        res = await execute_tool_call(
            tool_name="get_user_summary",
            raw_args={"preset": "30d"},
            db=session,
            user=user,
        )

        hab = res["habits"]
        fin = res["finance"]

        # Sleep target from settings (7.5)
        assert hab["target_sleep_hours"] == user.profile.target_sleep_hours
        # Reconciliation check: gap = target - average
        expected_sleep_gap = round(hab["target_sleep_hours"] - hab["avg_sleep_hours"], 2)
        assert hab["sleep_gap_hours"] == expected_sleep_gap
        assert hab["reconciled"] is True

        # Savings target reconciliation
        assert fin["monthly_target_savings"] == user.profile.monthly_target_savings
        expected_savings_gap = round(fin["monthly_target_savings"] - fin["net_savings"], 2)
        assert fin["savings_gap"] == expected_savings_gap
        assert fin["reconciled"] is True


@pytest.mark.asyncio
async def test_disclaimers_restricted_and_no_raw_asterisks(chart_test_user):
    """
    Requirement 5: Disclaimers only for investment, credit, or health, never duplicated, rendered without raw asterisks.
    """
    async with TestingSessionLocal() as session:
        user = chart_test_user
        service = ChatService(provider=OfflineProvider())

        # Investment prompt -> triggers disclaimer
        turn_inv = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="Should I invest in stocks or crypto?",
        )
        assert "Notice: For informational purposes only" in turn_inv.content
        assert "*Disclaimer" not in turn_inv.content, "Must not contain raw asterisks"
        # Must not be duplicated
        assert turn_inv.content.count("informational purposes only") == 1

        # General budgeting prompt -> should NOT have disclaimer
        turn_budget = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="Can you explain the 50/30/20 budgeting rule?",
        )
        assert "informational purposes only" not in turn_budget.content
