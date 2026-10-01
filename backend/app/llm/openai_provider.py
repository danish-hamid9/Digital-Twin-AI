import logging
import json
import asyncio
import re
from typing import List, Dict, Any, Optional

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)

class OpenAICompatibleProvider(LLMProvider):
    """
    OpenAI-compatible LLM provider using the openai SDK.
    Supports any OpenAI API-compatible endpoint (Ollama, vLLM, DeepSeek, LocalAI, OpenAI, etc.).
    Converts tool declarations and results to and from standard OpenAI format.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = base_url or settings.OPENAI_COMPAT_BASE_URL
        self.api_key = api_key or settings.OPENAI_COMPAT_API_KEY
        self.model_name = model or settings.OPENAI_COMPAT_MODEL or "default"
        self.client = None

        if self.is_configured() and AsyncOpenAI is not None:
            try:
                self.client = AsyncOpenAI(
                    base_url=self.base_url.rstrip("/") if self.base_url else None,
                    api_key=self.api_key or "sk-dummy-key",
                )
            except Exception as e:
                logger.warning(f"Could not initialize AsyncOpenAI client: {e}")
                self.client = None
        else:
            logger.info("OpenAICompatibleProvider not fully configured; will skip silently.")

    @property
    def provider_name(self) -> str:
        return "openai_compatible"

    def is_configured(self) -> bool:
        # Configured if at least base_url or api_key is provided
        return bool(self.base_url or self.api_key)

    def convert_tools_to_openai(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert our internal tool declarations to OpenAI function format."""
        openai_tools = []
        for t in tools:
            params = t.get("parameters", {})
            properties = {}
            for p_name, p_val in params.get("properties", {}).items():
                p_type = p_val.get("type", "STRING").lower()
                if p_type == "integer":
                    openai_type = "integer"
                elif p_type in ("number", "float"):
                    openai_type = "number"
                elif p_type == "boolean":
                    openai_type = "boolean"
                elif p_type == "array":
                    openai_type = "array"
                elif p_type == "object":
                    openai_type = "object"
                else:
                    openai_type = "string"

                properties[p_name] = {
                    "type": openai_type,
                    "description": p_val.get("description", ""),
                }

            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": params.get("required", []),
                    },
                }
            })
        return openai_tools

    def convert_messages_to_openai(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Convert conversation history to OpenAI Chat Completion message format."""
        openai_messages = []
        if system_instruction:
            openai_messages.append({
                "role": "system",
                "content": system_instruction,
            })

        for msg in messages:
            if not isinstance(msg, dict):
                # If Gemini raw object leaked, extract role and text/tool calls
                continue

            role = msg.get("role", "user")
            if role == "tool":
                tr = msg.get("tool_response", {})
                t_name = tr.get("name", "tool")
                t_resp = tr.get("response", {})
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tr.get("tool_call_id", f"call_{t_name}"),
                    "content": json.dumps(t_resp),
                })
            elif role == "assistant":
                msg_dict: Dict[str, Any] = {
                    "role": "assistant",
                    "content": msg.get("content") or "",
                }
                tool_calls = msg.get("tool_calls", [])
                if tool_calls:
                    msg_dict["tool_calls"] = [
                        {
                            "id": tc.get("id", f"call_{tc.get('name', 'tool')}"),
                            "type": "function",
                            "function": {
                                "name": tc.get("name"),
                                "arguments": json.dumps(tc.get("args", {})),
                            },
                        }
                        for tc in tool_calls
                    ]
                openai_messages.append(msg_dict)
            else:
                openai_messages.append({
                    "role": "user",
                    "content": msg.get("content") or "",
                })

        return openai_messages

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate completion using AsyncOpenAI client.
        Per-attempt timeout of 20s, up to 2 retries with backoff on 429/503.
        """
        if not self.is_configured() or not self.client:
            raise ValueError("OpenAICompatibleProvider is not configured")

        openai_messages = self.convert_messages_to_openai(messages, system_instruction)
        openai_tools = self.convert_tools_to_openai(tools) if tools else None

        kwargs: Dict[str, Any] = {
            "model": self.model_name,
            "messages": openai_messages,
            "temperature": 0.2,
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        max_retries = 2
        backoff_delay = 1.0
        last_error = None
        response = None

        for attempt in range(max_retries + 1):
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(**kwargs),
                    timeout=20.0
                )
                last_error = None
                break
            except asyncio.TimeoutError as te:
                logger.warning(f"OpenAICompatible call timed out (20s) on attempt {attempt + 1}")
                last_error = te
                if attempt < max_retries:
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2.0
                else:
                    break
            except Exception as exc:
                err_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
                err_str = str(exc)
                is_retryable = (err_code in (429, 503)) or bool(re.search(r"\b(429|503)\b", err_str))
                last_error = exc

                if is_retryable and attempt < max_retries:
                    logger.warning(f"OpenAICompatible retryable status {err_code} (attempt {attempt + 1}). Retrying in {backoff_delay}s...")
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2.0
                else:
                    break

        if last_error is not None:
            raise last_error

        choice = response.choices[0]
        msg = choice.message
        result_text = msg.content or ""
        tool_calls = []

        if msg.tool_calls:
            for tc in msg.tool_calls:
                fn = tc.function
                try:
                    args = json.loads(fn.arguments) if fn.arguments else {}
                except Exception:
                    args = {}
                tool_calls.append({
                    "id": tc.id,
                    "name": fn.name,
                    "args": args,
                })

        return {
            "content": result_text,
            "tool_calls": tool_calls,
            "raw_content": None,
            "provider": "openai_compatible",
            "model": self.model_name,
        }
