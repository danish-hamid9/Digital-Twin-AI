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
        """Requirement 7: Mandatory disclaimer auto-appended to any response touching investment, credit, savings, or health/sleep."""
        combined = f"{text} {user_prompt}".lower()
        return any(keyword in combined for keyword in DISCLAIMER_KEYWORDS)

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
        # 1. Persist user prompt
        user_db_msg = ChatMessage(
            user_id=user.id,
            role="user",
            content=user_message,
        )
        db.add(user_db_msg)
        await db.commit()

        # 2. Build conversation context
        history = await self.get_recent_history(db, user, limit=8)

        base_conversation_messages = list(history)
        if not any(m.get("content") == user_message and m.get("role") == "user" for m in base_conversation_messages):
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

                        # Append tool result to conversation messages
                        candidate_messages.append({
                            "role": "tool",
                            "tool_response": {
                                "name": t_name,
                                "response": t_result,
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
                    candidate_messages.append({
                        "role": "tool",
                        "tool_response": {
                            "name": t_name,
                            "response": t_result,
                        }
                    })

            answered_provider = "offline"
            answered_model = getattr(offline_prov, "model_name", "offline-rule-engine")
            if not final_assistant_content:
                final_assistant_content = "Analysis completed based on your digital twin records."

        # 6. Disclaimer auto-append check
        if self.should_append_disclaimer(final_assistant_content, user_message) or any(
            r.tool_name in ("run_simulation", "get_recommendations", "run_prediction") for r in executed_tool_records
        ):
            if MANDATORY_DISCLAIMER.strip() not in final_assistant_content:
                final_assistant_content += MANDATORY_DISCLAIMER

        # 7. Persist assistant reply to database
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

