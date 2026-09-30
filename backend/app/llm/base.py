from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class LLMProvider(ABC):
    """Abstract base provider for Large Language Model integrations."""

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a model response given history, instructions, and tools.
        Returns a dictionary with:
        - content: str (optional text response)
        - tool_calls: list of {"name": str, "args": dict} (optional)
        """
        pass
