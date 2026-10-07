import pytest
import datetime as dt
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, Profile
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.chat import ChatMessage
from app.services.chat_service import ChatService
from app.llm.tool_executor import execute_tool_call
from app.llm.offline_provider import OfflineProvider
from app.llm.base import LLMProvider
from tests.conftest import TestingSessionLocal


class DirectAnswerMockLLM(LLMProvider):
    """Mock LLM that responds directly without issuing any tool calls."""
    async def generate_response(self, messages, system_instruction=None, tools=None):
        return {
            "content": "Hello! I am your AI assistant. How can I help you today?",
            "tool_calls": []
        }


@pytest.mark.asyncio
async def test_simulation_fan_chart_numbers_match_tool_output():
    """Verify simulation fan chart spec numbers strictly match tool output."""
    async with TestingSessionLocal() as session:
        user = User(
            email="sim_chart_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # Add profile
        prof = Profile(user_id=user.id, currency="USD")
        session.add(prof)

        # Add some finance entries
        today = dt.date.today()
        session.add(FinanceEntry(user_id=user.id, date=today, amount=4000.0, type="income", category="Salary"))
        session.add(FinanceEntry(user_id=user.id, date=today, amount=1200.0, type="expense", category="Rent"))
        await session.commit()

        # Execute run_simulation tool
        result = await execute_tool_call(
            tool_name="run_simulation",
            raw_args={"horizon_months": 6, "one_time_expense": 1000.0, "iterations": 1000},
            db=session,
            user=user,
        )

        assert "chart_spec" in result
        chart_spec = result["chart_spec"]
        assert chart_spec is not None
        assert chart_spec["type"] == "simulation_fan"

        # Check series presence
        series_map = {s["name"]: s["data"] for s in chart_spec["series"]}
        assert "P10 (Unfavorable)" in series_map
        assert "P50 (Median Scenario)" in series_map
        assert "P90 (Favorable)" in series_map
        assert "Baseline P50" in series_map

        # Verify exact number equality: the final horizon month in chart series must equal tool output
        assert series_map["P10 (Unfavorable)"][-1] == result["scenario_final_savings_p10"]
        assert series_map["P50 (Median Scenario)"][-1] == result["scenario_final_savings_p50"]
        assert series_map["P90 (Favorable)"][-1] == result["scenario_final_savings_p90"]
        assert series_map["Baseline P50"][-1] == result["baseline_final_savings_p50"]


@pytest.mark.asyncio
async def test_savings_forecast_chart_numbers_match_tool_output():
    """Verify savings forecast with bands chart numbers equal tool output."""
    async with TestingSessionLocal() as session:
        user = User(
            email="sav_chart_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        today = dt.date.today()
        session.add(FinanceEntry(user_id=user.id, date=today, amount=3000.0, type="income", category="Salary"))
        session.add(FinanceEntry(user_id=user.id, date=today, amount=1500.0, type="expense", category="Living"))
        await session.commit()

        result = await execute_tool_call(
            tool_name="run_prediction",
            raw_args={"domain": "finance", "horizon": 6},
            db=session,
            user=user,
        )

        assert "chart_spec" in result
        chart_spec = result["chart_spec"]
        assert chart_spec is not None
        assert chart_spec["type"] == "savings_forecast"

        # Expected series numbers must match monthly_forecasts
        series_map = {s["name"]: s["data"] for s in chart_spec["series"]}
        assert "Expected (P50)" in series_map
        forecast_expected = [f["projected_savings"] for f in result["monthly_forecasts"]]
        assert series_map["Expected (P50)"] == forecast_expected


@pytest.mark.asyncio
async def test_expense_donut_chart_numbers_match_tool_output():
    """Verify expense donut chart numbers equal category distribution tool output."""
    async with TestingSessionLocal() as session:
        user = User(
            email="donut_chart_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        today = dt.date.today()
        session.add(FinanceEntry(user_id=user.id, date=today, amount=500.0, type="expense", category="Food"))
        session.add(FinanceEntry(user_id=user.id, date=today, amount=1200.0, type="expense", category="Housing"))
        session.add(FinanceEntry(user_id=user.id, date=today, amount=300.0, type="expense", category="Utilities"))
        await session.commit()

        result = await execute_tool_call(
            tool_name="get_user_summary",
            raw_args={"preset": "30d"},
            db=session,
            user=user,
        )

        assert "chart_spec" in result
        chart_spec = result["chart_spec"]
        assert chart_spec is not None
        assert chart_spec["type"] == "expense_donut"

        chart_amounts = {s["name"]: s["value"] for s in chart_spec["series"]}
        assert chart_amounts["Food"] == 500.0
        assert chart_amounts["Housing"] == 1200.0
        assert chart_amounts["Utilities"] == 300.0
        assert sum(chart_amounts.values()) == result["finance"]["total_expenses"]


@pytest.mark.asyncio
async def test_study_vs_sleep_and_habit_gauges():
    """Verify study_vs_sleep dual-axis chart and habit burnout gauges match tool output."""
    async with TestingSessionLocal() as session:
        user = User(
            email="dual_axis_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        today = dt.date.today()
        session.add(StudySession(user_id=user.id, date=today, hours=3.5, score=88.0, subject="Math"))
        session.add(HabitLog(user_id=user.id, date=today, habit="Exercise", sleep_hours=7.5, exercise_minutes=30.0, done=True))
        await session.commit()

        # Study tool
        res_study = await execute_tool_call(
            tool_name="run_prediction",
            raw_args={"domain": "study"},
            db=session,
            user=user,
        )
        assert res_study["chart_spec"]["type"] == "study_vs_sleep"
        series_map = {s["name"]: s for s in res_study["chart_spec"]["series"]}
        assert series_map["Study Score"]["axis"] == "left"
        assert series_map["Sleep Hours"]["axis"] == "right"

        # Habit tool
        res_habits = await execute_tool_call(
            tool_name="run_prediction",
            raw_args={"domain": "habits"},
            db=session,
            user=user,
        )
        assert res_habits["chart_spec"]["type"] == "habit_burnout_gauge"
        gauge_series = {s["name"]: s["value"] for s in res_habits["chart_spec"]["series"]}
        assert gauge_series["Burnout Risk"] == round(float(res_habits["burnout_risk_score"]), 1)


@pytest.mark.asyncio
async def test_answer_without_tool_data_produces_no_chart():
    """Verify an answer without tool execution produces no chart."""
    async with TestingSessionLocal() as session:
        user = User(
            email="no_tool_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        service = ChatService(provider=DirectAnswerMockLLM())
        turn = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="Hello, can you help me?",
        )

        assert turn.tool_calls == []
        # No chart spec should be attached or generated
        for tc in turn.tool_calls:
            assert tc.result is None or "chart_spec" not in tc.result


@pytest.mark.asyncio
async def test_offline_provider_produces_same_chart_specs():
    """Verify the offline provider produces chart specs via real tool execution."""
    async with TestingSessionLocal() as session:
        user = User(
            email="offline_chart_user@example.com",
            hashed_password="pw",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        today = dt.date.today()
        session.add(FinanceEntry(user_id=user.id, date=today, amount=5000.0, type="income", category="Salary"))
        session.add(FinanceEntry(user_id=user.id, date=today, amount=2000.0, type="expense", category="Bills"))
        await session.commit()

        service = ChatService(provider=OfflineProvider())
        turn = await service.execute_chat_turn(
            db=session,
            user=user,
            user_message="What happens if I buy a $1000 laptop over 6 months?",
        )

        # Tool calls must be executed
        assert len(turn.tool_calls) > 0
        sim_call = next(tc for tc in turn.tool_calls if tc.tool_name == "run_simulation")
        assert sim_call.result is not None
        assert "chart_spec" in sim_call.result
        assert sim_call.result["chart_spec"]["type"] == "simulation_fan"

        # Check DB persistence
        db_msg = await session.execute(
            select(ChatMessage).where(ChatMessage.user_id == user.id, ChatMessage.role == "assistant")
        )
        saved_msg = db_msg.scalars().first()
        assert saved_msg is not None
        assert saved_msg.tool_results is not None
        assert any(r.get("chart_spec", {}).get("type") == "simulation_fan" for r in saved_msg.tool_results)
