import logging
import time
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_provider import OpenAICompatibleProvider
from app.llm.offline_provider import OfflineProvider
from app.llm.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

class ProviderManager:
    """
    Manages the failover chain across multiple LLM providers:
    1. Reads configured chain order from settings.LLM_PROVIDER_CHAIN (e.g. gemini, openai_compatible, offline).
    2. DEMO_MODE=true forces the offline provider immediately.
    3. Skips unconfigured providers silently.
    4. Circuit breaker skips failing providers for 60 seconds.
    """

    def __init__(
        self,
        providers: Optional[Dict[str, LLMProvider]] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        self.circuit_breaker = circuit_breaker or CircuitBreaker(failure_threshold=1, recovery_time_seconds=60.0)

        if providers is not None:
            self.providers = providers
        else:
            self.providers = {
                "gemini": GeminiProvider(),
                "openai_compatible": OpenAICompatibleProvider(),
                "offline": OfflineProvider(),
            }

    def get_candidate_providers(self) -> List[tuple[str, LLMProvider]]:
        """
        Returns active provider instances in failover priority order, filtering out:
        - DEMO_MODE force-offline
        - Unconfigured providers
        - Providers open in circuit breaker
        """
        if getattr(settings, "DEMO_MODE", False):
            logger.info("DEMO_MODE is active: forcing offline provider.")
            return [("offline", self.providers["offline"])]

        chain_names = settings.LLM_PROVIDER_CHAIN
        if isinstance(chain_names, str):
            chain_names = [c.strip() for c in chain_names.split(",") if c.strip()]

        candidates: List[tuple[str, LLMProvider]] = []
        for name in chain_names:
            provider = self.providers.get(name)
            if not provider:
                continue

            # Silent skip if not configured (e.g. Missing API key or base URL)
            if hasattr(provider, "is_configured") and not provider.is_configured():
                continue

            # Circuit breaker check (offline is never blocked by circuit breaker)
            if name != "offline" and not self.circuit_breaker.is_available(name):
                logger.warning(f"Provider '{name}' is currently OPEN in circuit breaker. Skipping.")
                continue

            candidates.append((name, provider))

        # Always ensure offline provider is available as absolute fallback
        if not any(name == "offline" for name, _ in candidates) and "offline" in self.providers:
            candidates.append(("offline", self.providers["offline"]))

        return candidates

    def record_success(self, provider_name: str) -> None:
        self.circuit_breaker.record_success(provider_name)

    def record_failure(self, provider_name: str) -> None:
        self.circuit_breaker.record_failure(provider_name)
