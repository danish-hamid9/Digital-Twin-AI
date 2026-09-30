import logging
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
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("GeminiProvider initialized without an API key; live calls will fail unless configured.")

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate completion using google-genai SDK.
        Formats messages into contents, applies tool declarations, and extracts response text and tool calls.
        """
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not set in backend/.env")

        # Build contents from message history
        contents = []
        for msg in messages:
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

        # Build tools config
        genai_tools = None
        if tools:
            declarations = []
            for t in tools:
                declarations.append(types.FunctionDeclaration(
                    name=t["name"],
                    description=t.get("description", ""),
                    parameters=t.get("parameters")
                ))
            genai_tools = [types.Tool(function_declarations=declarations)]

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=genai_tools,
            temperature=0.2,  # Low temperature for strict adherence to tools and facts
        )

        # Call Gemini API asynchronously via asyncio wrapper or client
        import asyncio
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.model_name,
            contents=contents,
            config=config,
        )

        result_text = ""
        tool_calls = []

        if response.candidates:
            candidate = response.candidates[0]
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
        }
