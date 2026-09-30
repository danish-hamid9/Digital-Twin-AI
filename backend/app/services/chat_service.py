import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.chat import ChatMessage
from app.llm.base import LLMProvider
from app.llm.gemini_provider import GeminiProvider
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
    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or GeminiProvider()
        self.max_tool_iterations = 5  # Requirement 6: Cap tool calls per chat turn at 5

    def should_append_disclaimer(self, text: str) -> bool:
        """Requirement 7: Mandatory disclaimer auto-appended to any response touching investment, credit, savings, or health/sleep."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in DISCLAIMER_KEYWORDS)

    async def get_recent_history(
        self,
        db: AsyncSession,
        user: User,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Fetch scoped chat history for the user from chat_messages table."""
        res = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = res.scalars().all()
        messages = list(reversed(messages))  # Chronological order

        history: List[Dict[str, Any]] = []
        for msg in messages:
            history.append({
                "role": msg.role,
                "content": msg.content or "",
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

        executed_tool_records: List[ToolCallRecord] = []
        proposed_plans: List[PlanProposal] = []

        turn_iteration = 0
        final_assistant_content = ""

        # Current messages array for model
        conversation_messages = list(history)
        if not any(m.get("content") == user_message and m.get("role") == "user" for m in conversation_messages):
            conversation_messages.append({"role": "user", "content": user_message})

        # Loop with tool execution cap of 5
        while turn_iteration < self.max_tool_iterations:
            turn_iteration += 1

            model_output = await self.provider.generate_response(
                messages=conversation_messages,
                system_instruction=SYSTEM_PROMPT,
                tools=CHAT_TOOLS_DECLARATIONS,
            )

            assistant_text = model_output.get("content", "")
            tool_calls = model_output.get("tool_calls", [])

            if not tool_calls:
                # Terminal text response
                final_assistant_content = assistant_text
                break

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

                # Append assistant function_call to conversation
                conversation_messages.append({
                    "role": "assistant",
                    "content": assistant_text,
                    "tool_calls": [{"name": t_name, "args": t_args}]
                })

                # Append tool function_response to conversation
                conversation_messages.append({
                    "role": "tool",
                    "tool_response": {
                        "name": t_name,
                        "response": t_result,
                    }
                })

        if not final_assistant_content:
            final_assistant_content = assistant_text or "Analysis completed based on your digital twin records."

        # 6. Disclaimer auto-append check
        if self.should_append_disclaimer(final_assistant_content) or any(
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
        )
        db.add(assistant_db_msg)
        await db.commit()

        return ChatTurnResponse(
            role="assistant",
            content=final_assistant_content,
            tool_calls=executed_tool_records,
            proposed_plans=proposed_plans,
        )
