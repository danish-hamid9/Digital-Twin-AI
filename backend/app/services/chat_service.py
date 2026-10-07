import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.chat import ChatMessage
import asyncio
import time
from app.models.user import User
from app.models.chat import ChatMessage
from app.llm.base import LLMProvider
from app.llm.provider_manager import ProviderManager
from app.llm.offline_provider import OfflineProvider
from app.llm.tools import (
    CHAT_TOOLS_DECLARATIONS,
    SYSTEM_PROMPT,
    MANDATORY_DISCLAIMER,
    DISCLAIMER_KEYWORDS,
)
from app.llm.tool_executor import execute_tool_call
from app.schemas.chat import ChatTurnResponse, ToolCallRecord, PlanProposal

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(
        self,
        provider: Optional[LLMProvider] = None,
        provider_manager: Optional[ProviderManager] = None,
    ):
        self.provider_manager = provider_manager or ProviderManager()
        # If a specific provider was explicitly supplied (e.g. in test fixture), use it directly
        self.custom_provider = provider
        self.max_tool_iterations = 5  # Requirement 7: Cap tool calls per chat turn at 5

    def should_append_disclaimer(self, text: str, user_prompt: str = "") -> bool:
        """Requirement 5: One short notice, only for investment, credit, or health topics, never duplicated."""
        lower_text = text.lower()
        if any(marker in lower_text for marker in (
            "informational purposes only",
            "certified financial",
            "medical advice",
            "notice:",
            "disclaimer",
        )):
            return False

        lower_prompt = user_prompt.lower()
        is_investment = any(k in lower_prompt for k in ("invest", "portfolio", "stock", "equity", "crypto", "bitcoin", "etf", "mutual fund", "asset allocation"))
        is_credit = any(k in lower_prompt for k in ("credit", "loan", "borrow", "mortgage", "lending", "debt consolidation"))
        is_health = any(k in lower_prompt for k in ("medical", "doctor", "health", "diagnosis", "therapy", "clinical", "medication", "prescribe", "illness", "disease"))
        is_simulation = any(k in lower_prompt for k in ("simulate", "simulation", "what if", "scenario", "laptop", "salary change"))

        return is_investment or is_credit or is_health or is_simulation

    async def get_recent_history(
        self,
        db: AsyncSession,
        user: User,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Fetch scoped chat history for the user from chat_messages table.
        Replays ONLY plain user and assistant text messages; past tool calls and tool results are omitted.
        """
        res = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.user_id == user.id,
                ChatMessage.role.in_(["user", "assistant"]),
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = res.scalars().all()
        messages = list(reversed(messages))  # Chronological order

        history: List[Dict[str, Any]] = []
        for msg in messages:
            # Replay only plain text messages, ignore any records without content
            text_content = (msg.content or "").strip()
            if text_content:
                history.append({
                    "role": msg.role,
                    "content": text_content,
                })
        return history

    async def execute_chat_turn(
        self,
        db: AsyncSession,
        user: User,
        user_message: str,
    ) -> ChatTurnResponse:
        """
        Executes a complete multi-step tool-calling conversational turn:
        1. Persists user prompt to chat_messages.
        2. Queries history + system instructions + declared tools.
        3. Loops up to 5 tool calls.
        4. Injects authenticated user context securely into each tool call.
        5. Extracts any proposed plans (Requirement 5).
        6. Appends disclaimer if applicable (Requirement 7).
        7. Persists assistant response and returns ChatTurnResponse.
        """
        # 1. Fetch prior conversation context (last 10 plain-text messages)
        history = await self.get_recent_history(db, user, limit=10)

        # 2. Persist user prompt
        user_db_msg = ChatMessage(
            user_id=user.id,
            role="user",
            content=user_message,
        )
        db.add(user_db_msg)
        await db.commit()

        # 3. Build conversation context: prior 10 plain-text messages + current user message
        base_conversation_messages = list(history)
        base_conversation_messages.append({"role": "user", "content": user_message})

        # 3. Determine candidate providers
        if self.custom_provider is not None:
            c_name = getattr(self.custom_provider, "provider_name", "custom")
            candidates = [(c_name, self.custom_provider)]
        else:
            candidates = self.provider_manager.get_candidate_providers()

        overall_deadline_seconds = 45.0
        start_time = time.time()

        executed_tool_records: List[ToolCallRecord] = []
        proposed_plans: List[PlanProposal] = []
        final_assistant_content = ""
        answered_provider = "offline"
        answered_model = "offline-rule-engine"

        for p_name, provider in candidates:
            elapsed = time.time() - start_time
            remaining_time = overall_deadline_seconds - elapsed
            if remaining_time <= 0 and p_name != "offline":
                logger.warning("Overall 45-second deadline reached; skipping to offline fallback.")
                continue

            # Fresh copies of tools and plan proposals for this candidate attempt
            candidate_tool_records: List[ToolCallRecord] = []
            candidate_plans: List[PlanProposal] = []
            candidate_messages = list(base_conversation_messages)
            turn_iteration = 0
            candidate_success = False

            try:
                while turn_iteration < self.max_tool_iterations:
                    turn_iteration += 1

                    # Check overall deadline
                    if time.time() - start_time >= overall_deadline_seconds and p_name != "offline":
                        raise asyncio.TimeoutError("Overall chat turn deadline (45s) exceeded")

                    model_output = await provider.generate_response(
                        messages=candidate_messages,
                        system_instruction=SYSTEM_PROMPT,
                        tools=CHAT_TOOLS_DECLARATIONS,
                    )

                    assistant_text = model_output.get("content", "")
                    tool_calls = model_output.get("tool_calls", [])
                    resp_provider = model_output.get("provider", p_name)
                    resp_model = model_output.get("model", getattr(provider, "model_name", "default"))

                    if not tool_calls:
                        final_assistant_content = assistant_text
                        answered_provider = resp_provider
                        answered_model = resp_model
                        candidate_success = True
                        break

                    raw_content = model_output.get("raw_content")
                    if raw_content is not None:
                        candidate_messages.append(raw_content)
                    else:
                        candidate_messages.append({
                            "role": "assistant",
                            "content": assistant_text,
                            "tool_calls": tool_calls,
                        })

                    # Execute tool calls
                    for tc in tool_calls:
                        t_name = tc.get("name", "")
                        t_args = tc.get("args", {})

                        # Server-side tool execution with injected user context
                        t_result = await execute_tool_call(
                            tool_name=t_name,
                            raw_args=t_args,
                            db=db,
                            user=user,
                        )

                        # Check if this tool produces a proposed plan (create_plan or update_plan)
                        if t_name in ("create_plan", "update_plan") and "proposed_plan" in t_result:
                            p = t_result["proposed_plan"]
                            candidate_plans.append(
                                PlanProposal(
                                    action=p.get("action", "create"),
                                    plan_id=p.get("plan_id"),
                                    title=p.get("title", "Untitled Plan"),
                                    description=p.get("description", ""),
                                    domain=p.get("domain", "general"),
                                    status=p.get("status", "pending"),
                                    due_date=p.get("due_date"),
                                )
                            )

                        candidate_tool_records.append(
                            ToolCallRecord(
                                tool_name=t_name,
                                arguments=t_args,
                                result=t_result,
                            )
                        )

                        # For offline provider, also fetch rule-based recommendations
                        recs_result = None
                        if p_name == "offline":
                            if t_name != "get_recommendations":
                                try:
                                    recs_result = await execute_tool_call(
                                        tool_name="get_recommendations",
                                        raw_args={},
                                        db=db,
                                        user=user,
                                    )
                                    if recs_result:
                                        candidate_tool_records.append(
                                            ToolCallRecord(
                                                tool_name="get_recommendations",
                                                arguments={},
                                                result=recs_result,
                                            )
                                        )
                                except Exception as e:
                                    logger.warning(f"Failed to fetch recommendations for offline mode: {e}")
                            else:
                                recs_result = t_result

                        # Append tool result to conversation messages
                        candidate_messages.append({
                            "role": "tool",
                            "tool_response": {
                                "name": t_name,
                                "response": t_result,
                                "recommendations": recs_result,
                            }
                        })

                if not final_assistant_content and candidate_success:
                    final_assistant_content = assistant_text or "Analysis completed based on your digital twin records."

                if candidate_success or turn_iteration >= self.max_tool_iterations:
                    if not final_assistant_content:
                        final_assistant_content = assistant_text or "Analysis completed based on your digital twin records."
                    executed_tool_records = candidate_tool_records
                    proposed_plans = candidate_plans
                    answered_provider = resp_provider
                    answered_model = resp_model
                    self.provider_manager.record_success(p_name)
                    break

            except Exception as exc:
                logger.warning(f"Provider '{p_name}' failed with error: {exc}. Trying next candidate...")
                if p_name != "offline":
                    self.provider_manager.record_failure(p_name)
                continue

        # If all candidates failed or timed out, run offline provider directly
        if not final_assistant_content:
            logger.warning("All primary providers failed or timed out; running offline provider fallback.")
            offline_prov = self.provider_manager.providers.get("offline") or OfflineProvider()
            candidate_messages = list(base_conversation_messages)
            executed_tool_records = []
            proposed_plans = []
            turn_iteration = 0

            while turn_iteration < self.max_tool_iterations:
                turn_iteration += 1
                model_output = await offline_prov.generate_response(
                    messages=candidate_messages,
                    system_instruction=SYSTEM_PROMPT,
                    tools=CHAT_TOOLS_DECLARATIONS,
                )
                assistant_text = model_output.get("content", "")
                tool_calls = model_output.get("tool_calls", [])

                if not tool_calls:
                    final_assistant_content = assistant_text
                    break

                for tc in tool_calls:
                    t_name = tc.get("name", "")
                    t_args = tc.get("args", {})
                    t_result = await execute_tool_call(
                        tool_name=t_name,
                        raw_args=t_args,
                        db=db,
                        user=user,
                    )
                    if t_name in ("create_plan", "update_plan") and "proposed_plan" in t_result:
                        p = t_result["proposed_plan"]
                        proposed_plans.append(
                            PlanProposal(
                                action=p.get("action", "create"),
                                plan_id=p.get("plan_id"),
                                title=p.get("title", "Untitled Plan"),
                                description=p.get("description", ""),
                                domain=p.get("domain", "general"),
                                status=p.get("status", "pending"),
                                due_date=p.get("due_date"),
                            )
                        )
                    executed_tool_records.append(
                        ToolCallRecord(
                            tool_name=t_name,
                            arguments=t_args,
                            result=t_result,
                        )
                    )
                    recs_result = None
                    if t_name != "get_recommendations":
                        try:
                            recs_result = await execute_tool_call(
                                tool_name="get_recommendations",
                                raw_args={},
                                db=db,
                                user=user,
                            )
                            if recs_result:
                                executed_tool_records.append(
                                    ToolCallRecord(
                                        tool_name="get_recommendations",
                                        arguments={},
                                        result=recs_result,
                                    )
                                )
                        except Exception as e:
                            logger.warning(f"Failed to fetch recommendations in offline fallback: {e}")
                    else:
                        recs_result = t_result

                    candidate_messages.append({
                        "role": "tool",
                        "tool_response": {
                            "name": t_name,
                            "response": t_result,
                            "recommendations": recs_result,
                        }
                    })

            answered_provider = "offline"
            answered_model = getattr(offline_prov, "model_name", "offline-rule-engine")
            if not final_assistant_content:
                final_assistant_content = "Analysis completed based on your digital twin records."

        # 6. Reconcile charts to match question intent (Requirement 1)
        executed_tool_records = await self.reconcile_charts_for_question(
            user_message=user_message,
            records=executed_tool_records,
            db=db,
            user=user,
        )

        # 7. Disclaimer auto-append check (short disclaimer only for investment, credit, and medical topics)
        if self.should_append_disclaimer(final_assistant_content, user_message):
            clean_disc = MANDATORY_DISCLAIMER.strip()
            if clean_disc not in final_assistant_content:
                final_assistant_content = final_assistant_content.rstrip() + MANDATORY_DISCLAIMER

        # 8. Persist assistant reply to database
        assistant_db_msg = ChatMessage(
            user_id=user.id,
            role="assistant",
            content=final_assistant_content,
            tool_calls=[{"tool_name": r.tool_name, "arguments": r.arguments} for r in executed_tool_records] if executed_tool_records else None,
            tool_results=[r.result for r in executed_tool_records] if executed_tool_records else None,
            provider=answered_provider,
            model=answered_model,
        )
        db.add(assistant_db_msg)
        await db.commit()

        return ChatTurnResponse(
            role="assistant",
            content=final_assistant_content,
            tool_calls=executed_tool_records,
            proposed_plans=proposed_plans,
            provider=answered_provider,
            model=answered_model,
        )

    async def reconcile_charts_for_question(
        self,
        user_message: str,
        records: List[ToolCallRecord],
        db: AsyncSession,
        user: User,
    ) -> List[ToolCallRecord]:
        """
        Requirement 1: Charts must match the question:
        - study/sleep questions get the study-vs-sleep chart
        - habit/burnout questions get the gauges
        - savings questions get the forecast chart
        - spending questions get the expense donut
        - Never attach the expense donut to unrelated answers
        """
        if not records:
            return records

        msg_lower = user_message.lower()
        is_spending = any(k in msg_lower for k in ("spend", "spending", "expense", "expenses", "donut", "breakdown", "category", "where did my money go", "cost"))
        is_savings = any(k in msg_lower for k in ("saving", "savings", "save", "forecast", "runway", "future balance")) and not is_spending
        is_study_sleep = any(k in msg_lower for k in ("study", "exam", "score", "sleep", "academic", "pomodoro", "grade", "class")) and not is_spending
        is_habit_burnout = any(k in msg_lower for k in ("burnout", "habit", "streak", "routine", "burnout risk", "continuity")) and not is_spending

        # Rule: Never attach expense donut to unrelated answers
        if not is_spending:
            for r in records:
                if isinstance(r.result, dict) and r.result.get("chart_spec"):
                    if r.result["chart_spec"].get("type") == "expense_donut":
                        r.result["chart_spec"] = None

        # Rule: study/sleep questions get study-vs-sleep chart
        if is_study_sleep:
            has_study_chart = any(
                isinstance(r.result, dict) and r.result.get("chart_spec") and r.result["chart_spec"].get("type") == "study_vs_sleep"
                for r in records
            )
            if not has_study_chart:
                try:
                    study_pred = await execute_tool_call("run_prediction", {"domain": "study"}, db, user)
                    if study_pred and study_pred.get("chart_spec"):
                        records[0].result["chart_spec"] = study_pred["chart_spec"]
                except Exception as e:
                    logger.warning(f"Could not synthesize study_vs_sleep chart: {e}")

        # Rule: habit/burnout questions get habit_burnout_gauge chart
        elif is_habit_burnout:
            has_gauge = any(
                isinstance(r.result, dict) and r.result.get("chart_spec") and r.result["chart_spec"].get("type") == "habit_burnout_gauge"
                for r in records
            )
            if not has_gauge:
                try:
                    habit_pred = await execute_tool_call("run_prediction", {"domain": "habits"}, db, user)
                    if habit_pred and habit_pred.get("chart_spec"):
                        records[0].result["chart_spec"] = habit_pred["chart_spec"]
                except Exception as e:
                    logger.warning(f"Could not synthesize habit_burnout_gauge chart: {e}")

        # Rule: savings questions get savings_forecast chart
        elif is_savings:
            has_savings = any(
                isinstance(r.result, dict) and r.result.get("chart_spec") and r.result["chart_spec"].get("type") in ("savings_forecast", "simulation_fan")
                for r in records
            )
            if not has_savings:
                try:
                    fin_pred = await execute_tool_call("run_prediction", {"domain": "finance", "horizon": 6}, db, user)
                    if fin_pred and fin_pred.get("chart_spec"):
                        records[0].result["chart_spec"] = fin_pred["chart_spec"]
                except Exception as e:
                    logger.warning(f"Could not synthesize savings_forecast chart: {e}")

        # Rule: spending questions get expense_donut chart
        elif is_spending:
            has_donut = any(
                isinstance(r.result, dict) and r.result.get("chart_spec") and r.result["chart_spec"].get("type") == "expense_donut"
                for r in records
            )
            if not has_donut:
                try:
                    summary_res = await execute_tool_call("get_user_summary", {"preset": "30d"}, db, user)
                    if summary_res and summary_res.get("chart_spec"):
                        records[0].result["chart_spec"] = summary_res["chart_spec"]
                except Exception as e:
                    logger.warning(f"Could not synthesize expense_donut chart: {e}")

        return records

