import logging
import asyncio
import time
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)

class GeminiProvider(LLMProvider):
    """
    Google Gemini LLM provider implementation using google-genai SDK.
    Reads credentials and model name exclusively from settings/.env.
    Supports fallback models if configured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        fallback_models: Optional[List[str]] = None,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL
        raw_fallbacks = fallback_models if fallback_models is not None else settings.GEMINI_FALLBACK_MODELS
        if isinstance(raw_fallbacks, str):
            self.fallback_models = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
        else:
            self.fallback_models = list(raw_fallbacks) if raw_fallbacks else []

        self.client: Optional[genai.Client] = None
        self._exhausted_models: Dict[str, float] = {}
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            logger.warning("GeminiProvider initialized without an API key; live calls will fail unless configured.")

    @property
    def provider_name(self) -> str:
        return "gemini"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client)

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate completion using google-genai SDK.
        Within one turn's tool loop, appends the model's original response content object unchanged.
        """
        if not self.is_configured():
            raise ValueError("GEMINI_API_KEY is not configured")

        contents = []
        for msg in messages:
            if isinstance(msg, types.Content):
                contents.append(msg)
                continue

            role = msg.get("role", "user")
            parts = []

            # Text part
            if "content" in msg and msg["content"]:
                parts.append(types.Part.from_text(text=msg["content"]))

            # Tool call requests (when role is assistant)
            if "tool_calls" in msg and msg["tool_calls"]:
                for tc in msg["tool_calls"]:
                    parts.append(types.Part.from_function_call(
                        name=tc["name"],
                        args=tc.get("args", {})
                    ))

            # Tool responses (when role is tool)
            if "tool_response" in msg and msg["tool_response"]:
                tr = msg["tool_response"]
                parts.append(types.Part.from_function_response(
                    name=tr["name"],
                    response={"result": tr.get("response", {})}
                ))

            if parts:
                gemini_role = "user" if role in ("user", "tool") else "model"
                contents.append(types.Content(role=gemini_role, parts=parts))

        genai_tools = None
        if tools:
            declarations = []
            for t in tools:
                params = t.get("parameters")
                declarations.append(types.FunctionDeclaration(
                    name=t["name"],
                    description=t.get("description", ""),
                    parameters=params,
                ))
            genai_tools = [types.Tool(function_declarations=declarations)]

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=genai_tools,
            temperature=0.2,
        )

        now = time.time()
        all_models = [self.model_name] + [m for m in self.fallback_models if m != self.model_name]
        models_to_try = [m for m in all_models if (m not in self._exhausted_models or (now - self._exhausted_models[m] > 600.0))]
        if not models_to_try:
            models_to_try = all_models

        last_error = None
        chosen_model = models_to_try[0]

        for model_cand in models_to_try:
            chosen_model = model_cand
            # Per-attempt timeout of 20 seconds, up to 2 retries with backoff on 429/503
            max_retries = 2  # initial attempt + up to 2 retries = 3 attempts total
            backoff_delay = 1.0

            for attempt in range(max_retries + 1):
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            self.client.models.generate_content,
                            model=model_cand,
                            contents=contents,
                            config=config,
                        ),
                        timeout=20.0
                    )
                    last_error = None
                    break
                except asyncio.TimeoutError as te:
                    logger.warning(f"Gemini call timed out (20s) for model {model_cand} on attempt {attempt + 1}")
                    last_error = te
                    if attempt < max_retries:
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2.0
                    else:
                        break
                except Exception as exc:
                    err_code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
                    err_str = str(exc)
                    is_retryable = (err_code in (429, 503)) or bool(re.search(r"\b(429|503)\b", err_str))
                    last_error = exc

                    is_exhausted = "RESOURCE_EXHAUSTED" in err_str or "QuotaFailure" in err_str
                    if is_exhausted:
                        self._exhausted_models[model_cand] = time.time()
                        logger.warning(f"Gemini quota exhausted for model {model_cand}; failing over to next model.")
                        break

                    if is_retryable and attempt < max_retries:
                        logger.warning(
                            f"Gemini API retryable status {err_code or '429/503'} for model {model_cand} "
                            f"(attempt {attempt + 1}/{max_retries + 1}). Retrying in {backoff_delay}s..."
                        )
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2.0
                    else:
                        break

            if last_error is None:
                # Successfully received response from model_cand
                break
            else:
                logger.warning(f"Gemini model {model_cand} failed: {last_error}. Trying next fallback if available...")

        if last_error is not None:
            raise last_error

        result_text = ""
        tool_calls = []
        raw_content = None

        if response.candidates:
            candidate = response.candidates[0]
            raw_content = candidate.content
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if part.text:
                        result_text += part.text
                    if part.function_call:
                        tool_calls.append({
                            "name": part.function_call.name,
                            "args": dict(part.function_call.args) if part.function_call.args else {}
                        })

        return {
            "content": result_text,
            "tool_calls": tool_calls,
            "raw_content": raw_content,
            "provider": "gemini",
            "model": chosen_model,
        }
