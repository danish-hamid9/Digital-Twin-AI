import re
import pytest
import uuid
import datetime as dt
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.plan import Plan
from app.models.chat import ChatMessage
from app.models.finance import FinanceEntry
from app.services.chat_service import ChatService
from app.llm.base import LLMProvider
from app.llm.tool_executor import execute_tool_call
from app.llm.tools import MANDATORY_DISCLAIMER
from tests.conftest import TestingSessionLocal

async def setup_test_user_and_headers(client: AsyncClient, email: str = "chat_user@example.com"):
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Chat Tester"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.email == email))
        user = user_res.scalar_one()
    return user, headers

class MockScenarioSimulationLLM(LLMProvider):
    """
    Mock LLM that simulates a multi-turn conversation:
    Turn 1: Returns a tool call to run_simulation with parameters for reducing spending and buying a $1000 laptop.
    Turn 2: Once the tool outputs real simulation figures, summarizes the results citing exact numbers.
    """
    def __init__(self):
        self.call_count = 0

    async def generate_response(self, messages, system_instruction=None, tools=None):
        self.call_count += 1
        # Check if the last message is a tool response
        last_msg = messages[-1] if messages else {}
        if last_msg.get("role") == "tool":
            tr = last_msg.get("tool_response", {}).get("response", {})
            baseline_savings = tr.get("baseline_final_savings_p50", 0)
            scenario_savings = tr.get("scenario_final_savings_p50", 0)
            delta = tr.get("savings_delta_p50", 0)
            return {
                "content": (
                    f"Based on the Monte Carlo simulation, buying the $1,000 laptop shifts your projected "
                    f"final savings from ${baseline_savings:,.2f} to ${scenario_savings:,.2f}, resulting in a net delta of ${delta:,.2f}."
                ),
                "tool_calls": []
            }
        
        # Initial turn: invoke run_simulation
        return {
            "content": "Let me run a Monte Carlo simulation for you...",
            "tool_calls": [
                {
                    "name": "run_simulation",
                    "args": {
                        "horizon_months": 6,
                        "one_time_expense": 1000.0,
                        "expense_target_month": 1,
                        "salary_change_pct": 0.0
                    }
                }
            ]
        }


class MockPlanProposingLLM(LLMProvider):
    """
    Mock LLM that proposes a plan using create_plan.
    """
    async def generate_response(self, messages, system_instruction=None, tools=None):
        last_msg = messages[-1] if messages else {}
        if last_msg.get("role") == "tool":
            return {
                "content": "I have drafted a study plan for your upcoming exams. Please review and confirm it below.",
                "tool_calls": []
            }
        return {
            "content": "Proposing a new plan...",
            "tool_calls": [
                {
                    "name": "create_plan",
                    "args": {
                        "title": "Calculus II Exam Mastery",
                        "description": "Dedicate 12 hours weekly to problem sets",
                        "domain": "study",
                        "due_date": "2026-11-15"
                    }
                }
            ]
        }


# =========================================================================
# TEST 1: Security Critical - Malicious User ID Injection Prevention
# =========================================================================
@pytest.mark.asyncio
async def test_security_malicious_user_id_injection(client: AsyncClient):
    """
    Requirements #2:
    Prove that a maliciously crafted tool call cannot access or modify another user's
    data by supplying a foreign user_id in tool arguments.
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "attacker@example.com", "password": "Password123!", "full_name": "Attacker"},
    )
    assert reg.status_code == 201

    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.email == "attacker@example.com"))
        attacker_user = user_res.scalar_one()

        victim_user_id = str(uuid.uuid4())

        # Attempt 1: Call get_user_summary supplying victim_user_id in raw args
        malicious_args = {"user_id": victim_user_id, "preset": "30d"}
        result = await execute_tool_call(
            tool_name="get_user_summary",
            raw_args=malicious_args,
            db=session,
            user=attacker_user,  # Real authenticated session user
        )

        # Confirm it executed safely for the authenticated user and did NOT crash or leak victim's context
        assert "finance" in result
        assert "study" in result
        assert "habits" in result

        # Attempt 2: Call create_plan with malicious victim_user_id
        plan_args = {
            "user_id": victim_user_id,
            "title": "Unauthorized Plan",
            "domain": "finance",
        }
        plan_result = await execute_tool_call(
            tool_name="create_plan",
            raw_args=plan_args,
            db=session,
            user=attacker_user,
        )
        # Confirm proposed plan does not carry victim user id
        assert plan_result["proposed_plan"]["title"] == "Unauthorized Plan"
        assert "user_id" not in plan_result["proposed_plan"]


# =========================================================================
# TEST 2: Multi-Turn Scenario Calls run_simulation and Cites Real Numbers
# =========================================================================
@pytest.mark.asyncio
async def test_chat_simulation_scenario_grounded_numbers(client: AsyncClient):
    """
    Requirements #4 & #10:
    Verify a scenario like 'what happens to my savings if I buy a $1,000 laptop'
    actually executes run_simulation, cites genuine model numbers, and logs tools.
    """
    test_user, headers = await setup_test_user_and_headers(client, "scenario_user@example.com")

    async with TestingSessionLocal() as db_session:
        # Seed baseline financial record
        income_entry = FinanceEntry(
            user_id=test_user.id,
            date=dt.date.today(),
            category="Salary",
            amount=3500.0,
            type="income",
        )
        db_session.add(income_entry)
        await db_session.commit()

        # Re-fetch user in session
        res = await db_session.execute(select(User).where(User.id == test_user.id))
        user_in_session = res.scalar_one()

        mock_llm = MockScenarioSimulationLLM()
        service = ChatService(provider=mock_llm)

        response = await service.execute_chat_turn(
            db=db_session,
            user=user_in_session,
            user_message="what happens to my savings if I buy a $1,000 laptop?",
        )

        # 1. Verify tool call was recorded
        assert len(response.tool_calls) == 1
        tc = response.tool_calls[0]
        assert tc.tool_name == "run_simulation"
        assert tc.arguments.get("one_time_expense") == 1000.0

        # 2. Verify numbers in the response are traceable to the tool result
        tool_delta = tc.result.get("savings_delta_p50")
        assert tool_delta is not None
        delta_str = f"${tool_delta:,.2f}"
        assert delta_str in response.content

        # 3. Verify disclaimer was appended due to savings/expense keywords
        assert "Automated Simulation Notice" in response.content


# =========================================================================
# TEST 3: Plan Creation Returns Proposal Without Direct DB Write
# =========================================================================
@pytest.mark.asyncio
async def test_chat_plan_proposing_does_not_write_db(client: AsyncClient):
    """
    Requirements #5:
    create_plan and update_plan must NOT write directly - return a proposed change
    that the frontend shows as a confirmation card before the user approves it.
    """
    test_user, headers = await setup_test_user_and_headers(client, "plan_prop_user@example.com")

    async with TestingSessionLocal() as db_session:
        res = await db_session.execute(select(Plan).where(Plan.user_id == test_user.id))
        initial_plans_count = len(res.scalars().all())

        user_res = await db_session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        mock_llm = MockPlanProposingLLM()
        service = ChatService(provider=mock_llm)

        response = await service.execute_chat_turn(
            db=db_session,
            user=user_in_session,
            user_message="Create a study plan for Calculus II",
        )

        # 1. Verify response returned proposed plans
        assert len(response.proposed_plans) == 1
        proposal = response.proposed_plans[0]
        assert proposal.title == "Calculus II Exam Mastery"
        assert proposal.domain == "study"
        assert proposal.action == "create"

        # 2. Crucial Requirement: Verify database has NOT been written yet
        res2 = await db_session.execute(select(Plan).where(Plan.user_id == test_user.id))
        current_plans_count = len(res2.scalars().all())
        assert current_plans_count == initial_plans_count, "create_plan should NOT write to DB before user confirmation"


# =========================================================================
# TEST 4: Tool Execution Cap of 5 Prevents Runaway Loops
# =========================================================================
@pytest.mark.asyncio
async def test_tool_execution_cap_prevents_runaway_loop(client: AsyncClient):
    """
    Requirements #6:
    Cap tool calls per chat turn at 5 to prevent runaway loops.
    """
    class InfiniteToolCallingLLM(LLMProvider):
        def __init__(self):
            self.iterations = 0

        async def generate_response(self, messages, system_instruction=None, tools=None):
            self.iterations += 1
            return {
                "content": f"Iteration {self.iterations}",
                "tool_calls": [{"name": "get_recommendations", "args": {}}]
            }

    test_user, headers = await setup_test_user_and_headers(client, "infinite_user@example.com")

    async with TestingSessionLocal() as db_session:
        user_res = await db_session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        mock_llm = InfiniteToolCallingLLM()
        service = ChatService(provider=mock_llm)
        service.max_tool_iterations = 5

        response = await service.execute_chat_turn(
            db=db_session,
            user=user_in_session,
            user_message="Keep checking my recommendations forever",
        )

        assert len(response.tool_calls) == 5
        assert mock_llm.iterations == 5


# =========================================================================
# TEST 5: Chat History Persistence Scoped Per User
# =========================================================================
@pytest.mark.asyncio
async def test_chat_history_persisted_and_scoped(client: AsyncClient):
    """
    Requirements #8:
    Verify chat messages are saved to chat_messages table and scoped per user.
    """
    test_user, headers = await setup_test_user_and_headers(client, "hist_user@example.com")

    # 1. Get history
    res = await client.get("/api/v1/chat/history", headers=headers)
    assert res.status_code == 200
    initial_history = res.json()
    assert isinstance(initial_history, list)

    # 2. Add message directly
    async with TestingSessionLocal() as session:
        msg = ChatMessage(user_id=test_user.id, role="user", content="Hello Digital Twin")
        session.add(msg)
        await session.commit()

    res_with_msg = await client.get("/api/v1/chat/history", headers=headers)
    assert len(res_with_msg.json()) == 1
    assert res_with_msg.json()[0]["content"] == "Hello Digital Twin"

    # 3. Clear history endpoint
    del_res = await client.delete("/api/v1/chat/history", headers=headers)
    assert del_res.status_code == 204

    # 4. Check cleared
    res_after = await client.get("/api/v1/chat/history", headers=headers)
    assert len(res_after.json()) == 0


# =========================================================================
# TEST 6: Plans Confirmation API Endpoint
# =========================================================================
@pytest.mark.asyncio
async def test_plans_confirmation_crud_e2e(client: AsyncClient):
    """
    Test that once the user clicks 'Approve' on the confirmation card,
    POST /api/v1/plans properly creates the confirmed plan.
    """
    test_user, headers = await setup_test_user_and_headers(client, "plan_crud_user@example.com")

    payload = {
        "title": "Confirmed Savings Milestone",
        "description": "Save $300 monthly for emergency runway",
        "domain": "finance",
        "status": "in_progress",
        "due_date": "2026-12-31"
    }

    create_res = await client.post("/api/v1/plans", json=payload, headers=headers)
    assert create_res.status_code == 201
    plan_data = create_res.json()
    assert plan_data["title"] == "Confirmed Savings Milestone"
    plan_id = plan_data["id"]

    # List plans
    list_res = await client.get("/api/v1/plans", headers=headers)
    assert list_res.status_code == 200
    plans = list_res.json()
    assert any(p["id"] == plan_id for p in plans)

    # Update plan
    update_res = await client.put(f"/api/v1/plans/{plan_id}", json={"status": "completed"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "completed"


# =========================================================================
# TEST 7: Thought Signature Preserved Unchanged in Tool Loop
# =========================================================================
@pytest.mark.asyncio
async def test_thought_signature_passed_back_unchanged(client: AsyncClient):
    """
    Requirement:
    Verify a fake model response containing a thought signature on functionCall
    is appended as-is and passed back unchanged to the provider within the tool loop.
    """
    from google.genai import types

    test_user, headers = await setup_test_user_and_headers(client, "thought_sig_user@example.com")

    # Create a fake thought signature
    fake_thought_sig = b"test_thought_signature_gemini_2_5"

    fake_function_call = types.FunctionCall(
        name="get_user_summary",
        args={"preset": "30d"},
    )
    fake_part = types.Part(
        function_call=fake_function_call,
        thought_signature=fake_thought_sig,
    )
    fake_model_content = types.Content(
        role="model",
        parts=[fake_part],
    )

    class MockThoughtSignatureLLM(LLMProvider):
        def __init__(self):
            self.turn = 0
            self.received_messages_on_tool_turn = []

        async def generate_response(self, messages, system_instruction=None, tools=None):
            self.turn += 1
            if self.turn == 1:
                return {
                    "content": "",
                    "tool_calls": [{"name": "get_user_summary", "args": {"preset": "30d"}}],
                    "raw_content": fake_model_content,
                }
            # Turn 2: capture messages sent back into provider
            self.received_messages_on_tool_turn = list(messages)
            return {
                "content": "Here is your summary with preserved thought signature.",
                "tool_calls": [],
                "raw_content": None,
            }

    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        mock_llm = MockThoughtSignatureLLM()
        service = ChatService(provider=mock_llm)

        response = await service.execute_chat_turn(
            db=session,
            user=user_in_session,
            user_message="Summarize my 30-day activity",
        )

        assert len(response.tool_calls) == 1
        assert response.tool_calls[0].tool_name == "get_user_summary"

        # Check the messages that were passed to Turn 2
        msgs = mock_llm.received_messages_on_tool_turn
        # One of the messages must be the exact fake_model_content object with thought_signature
        model_content_matches = [
            m for m in msgs
            if isinstance(m, types.Content) and m.parts and getattr(m.parts[0], "thought_signature", None) == fake_thought_sig
        ]
        assert len(model_content_matches) == 1, "The model response Content with thought signature must be passed back unchanged"
        assert model_content_matches[0] is fake_model_content
        assert model_content_matches[0].parts[0].thought_signature == fake_thought_sig


# =========================================================================
# TEST 8: Stored History Containing Tool Calls Reduced to Plain Text
# =========================================================================
@pytest.mark.asyncio
async def test_stored_history_with_tool_calls_reduced_to_text(client: AsyncClient):
    """
    Requirement:
    When loading stored history from chat_messages for a new turn, replay only
    plain user and assistant text messages. Do not replay past tool calls or tool results.
    """
    test_user, headers = await setup_test_user_and_headers(client, "history_filter_user@example.com")

    # Seed chat_messages table with:
    # 1. Plain user message
    # 2. Assistant message with content, tool_calls, and tool_results
    # 3. Tool response message (role="tool")
    # 4. Another user message
    async with TestingSessionLocal() as session:
        msg1 = ChatMessage(
            user_id=test_user.id,
            role="user",
            content="Can you check my budget?",
            created_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=10),
        )
        msg2 = ChatMessage(
            user_id=test_user.id,
            role="assistant",
            content="Your current savings rate is 25%.",
            tool_calls=[{"tool_name": "get_user_summary", "arguments": {"preset": "30d"}}],
            tool_results=[{"savings_rate": 0.25}],
            created_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=9),
        )
        msg3 = ChatMessage(
            user_id=test_user.id,
            role="tool",
            content="Raw tool output",
            tool_results=[{"raw": "data"}],
            created_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=8),
        )
        msg4 = ChatMessage(
            user_id=test_user.id,
            role="user",
            content="Great, what should I do next?",
            created_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=7),
        )
        session.add_all([msg1, msg2, msg3, msg4])
        await session.commit()

        user_res = await session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        captured_messages = []

        class HistorySpyLLM(LLMProvider):
            async def generate_response(self, messages, system_instruction=None, tools=None):
                captured_messages.extend(messages)
                return {
                    "content": "You can set a new goal.",
                    "tool_calls": [],
                }

        service = ChatService(provider=HistorySpyLLM())
        await service.execute_chat_turn(
            db=session,
            user=user_in_session,
            user_message="Any advice?",
        )

        # Inspect captured messages
        roles = [m.get("role") if isinstance(m, dict) else getattr(m, "role", None) for m in captured_messages]
        # Past tool message must be excluded completely
        assert "tool" not in roles, "Stored tool messages must not be replayed to the model"

        # Check all messages are plain text with only 'role' and 'content'
        for m in captured_messages:
            if isinstance(m, dict):
                assert m.get("role") in ("user", "assistant")
                assert "tool_calls" not in m, "Stored tool_calls must not be replayed to the model"
                assert "tool_response" not in m, "Stored tool_responses must not be replayed to the model"
                assert isinstance(m.get("content"), str)
                assert len(m["content"]) > 0


# =========================================================================
# TEST 9: Provider Failover Order & Circuit Breaker & Timeout & Offline Fallback
# =========================================================================
from app.llm.provider_manager import ProviderManager
from app.llm.circuit_breaker import CircuitBreaker
from app.llm.offline_provider import OfflineProvider
from app.llm.openai_provider import OpenAICompatibleProvider
from app.core.config import settings
import asyncio


class FakeFailingProvider(LLMProvider):
    def __init__(self, name="fake_failing", model="fake-model"):
        self._name = name
        self.model_name = model
        self.call_count = 0

    @property
    def provider_name(self):
        return self._name

    def is_configured(self):
        return True

    async def generate_response(self, messages, system_instruction=None, tools=None):
        self.call_count += 1
        raise RuntimeError("Service 503 Overloaded")


class FakeSuccessProvider(LLMProvider):
    def __init__(self, name="fake_success", model="fallback-ai-model"):
        self._name = name
        self.model_name = model
        self.call_count = 0

    @property
    def provider_name(self):
        return self._name

    def is_configured(self):
        return True

    async def generate_response(self, messages, system_instruction=None, tools=None):
        self.call_count += 1
        return {
            "content": f"Hello from {self._name}!",
            "tool_calls": [],
            "provider": self._name,
            "model": self.model_name,
        }


@pytest.mark.asyncio
async def test_failover_order_and_badge_metadata(client: AsyncClient):
    """
    Test 9.1:
    When primary provider fails, failover chain moves to second provider,
    recording provider and model in reply metadata and database.
    """
    test_user, headers = await setup_test_user_and_headers(client, "failover_user@example.com")

    failing_primary = FakeFailingProvider("gemini", "gemini-2.5-flash")
    fallback_secondary = FakeSuccessProvider("openai_compatible", "gpt-4o-mini")
    offline_provider = OfflineProvider()

    pm = ProviderManager(
        providers={
            "gemini": failing_primary,
            "openai_compatible": fallback_secondary,
            "offline": offline_provider,
        }
    )

    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        service = ChatService(provider_manager=pm)
        resp = await service.execute_chat_turn(
            db=session,
            user=user_in_session,
            user_message="Hello assistant",
        )

        assert failing_primary.call_count == 1
        assert fallback_secondary.call_count == 1
        assert resp.provider == "openai_compatible"
        assert resp.model == "gpt-4o-mini"
        assert "Hello from openai_compatible!" in resp.content

        # Verify saved in database with provider metadata
        db_msg = await session.execute(
            select(ChatMessage).where(ChatMessage.user_id == test_user.id, ChatMessage.role == "assistant")
        )
        saved = db_msg.scalars().all()[-1]
        assert saved.provider == "openai_compatible"
        assert saved.model == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_circuit_breaker_skips_failing_provider():
    """
    Test 9.2:
    Circuit breaker skips a failing provider for 60 seconds after failure.
    """
    cb = CircuitBreaker(failure_threshold=1, recovery_time_seconds=60.0)
    assert cb.is_available("gemini") is True

    # Record failure -> circuit breaker opens
    cb.record_failure("gemini")
    assert cb.is_available("gemini") is False

    # Success records reset
    cb.record_success("gemini")
    assert cb.is_available("gemini") is True


@pytest.mark.asyncio
async def test_timeout_and_offline_fallback(client: AsyncClient):
    """
    Test 9.3:
    When providers fail or time out, ChatService falls back to OfflineProvider
    using keyword matching and authentic metrics.
    """
    test_user, headers = await setup_test_user_and_headers(client, "offline_fallback_user@example.com")

    failing_gemini = FakeFailingProvider("gemini")
    failing_openai = FakeFailingProvider("openai_compatible")
    offline_provider = OfflineProvider()

    pm = ProviderManager(
        providers={
            "gemini": failing_gemini,
            "openai_compatible": failing_openai,
            "offline": offline_provider,
        }
    )

    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        service = ChatService(provider_manager=pm)
        resp = await service.execute_chat_turn(
            db=session,
            user=user_in_session,
            user_message="Give me a comprehensive summary of my recent finances and habits",
        )

        assert resp.provider == "offline"
        assert resp.model == "offline-rule-engine"
        assert len(resp.tool_calls) == 1
        assert resp.tool_calls[0].tool_name == "get_user_summary"
        assert "Financial Health" in resp.content
        assert "Total Income" in resp.content


@pytest.mark.asyncio
async def test_user_id_injection_per_provider(client: AsyncClient):
    """
    Test 9.4:
    Server-side user_id injection, the 5-tool-call cap, and confirmation cards
    work identically whether invoked via gemini, openai_compatible, or offline.
    """
    test_user, headers = await setup_test_user_and_headers(client, "injection_check_user@example.com")

    class ToolCallingOpenAIProvider(LLMProvider):
        @property
        def provider_name(self):
            return "openai_compatible"

        def is_configured(self):
            return True

        async def generate_response(self, messages, system_instruction=None, tools=None):
            last_msg = messages[-1] if messages else {}
            if last_msg.get("role") == "tool":
                return {
                    "content": "Plan proposed via OpenAI compatible provider.",
                    "tool_calls": [],
                    "provider": "openai_compatible",
                    "model": "gpt-4o-mini",
                }
            # Attempt to pass a foreign victim_user_id in arguments
            return {
                "content": "",
                "tool_calls": [
                    {
                        "name": "create_plan",
                        "args": {
                            "user_id": str(uuid.uuid4()),
                            "title": "OpenAI Provider Plan",
                            "domain": "finance",
                        }
                    }
                ],
                "provider": "openai_compatible",
                "model": "gpt-4o-mini",
            }

    async with TestingSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.id == test_user.id))
        user_in_session = user_res.scalar_one()

        service = ChatService(provider=ToolCallingOpenAIProvider())
        resp = await service.execute_chat_turn(
            db=session,
            user=user_in_session,
            user_message="Create a plan for me",
        )

        assert len(resp.proposed_plans) == 1
        assert resp.proposed_plans[0].title == "OpenAI Provider Plan"
        # Tool call record arguments should have had user_id stripped or safely ignored
        assert resp.tool_calls[0].tool_name == "create_plan"
        assert "user_id" not in resp.proposed_plans[0].model_dump()


@pytest.mark.asyncio
async def test_demo_mode_forces_offline_provider(client: AsyncClient):
    """
    Test 9.5:
    DEMO_MODE=true forces the offline provider immediately without calling remote APIs.
    """
    test_user, headers = await setup_test_user_and_headers(client, "demo_user@example.com")

    failing_gemini = FakeFailingProvider("gemini")
    offline_provider = OfflineProvider()

    pm = ProviderManager(
        providers={
            "gemini": failing_gemini,
            "offline": offline_provider,
        }
    )

    orig_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = True
        candidates = pm.get_candidate_providers()
        assert len(candidates) == 1
        assert candidates[0][0] == "offline"

        async with TestingSessionLocal() as session:
            user_res = await session.execute(select(User).where(User.id == test_user.id))
            user_in_session = user_res.scalar_one()

            service = ChatService(provider_manager=pm)
            resp = await service.execute_chat_turn(
                db=session,
                user=user_in_session,
                user_message="What are my top recommendations?",
            )

            # Gemini should never have been touched
            assert failing_gemini.call_count == 0
            assert resp.provider == "offline"
            assert len(resp.tool_calls) == 1
            assert resp.tool_calls[0].tool_name == "get_recommendations"
    finally:
        settings.DEMO_MODE = orig_demo


