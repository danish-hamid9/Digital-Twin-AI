"""
Circuit breaker for LLM providers.
Skips a failing provider for 60 seconds after threshold consecutive failures.
"""
import time
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 1, recovery_time_seconds: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = recovery_time_seconds
        self._failure_counts: Dict[str, int] = {}
        self._opened_at: Dict[str, float] = {}

    def is_available(self, provider_key: str) -> bool:
        opened_time = self._opened_at.get(provider_key)
        if opened_time is None:
            return True
        elapsed = time.time() - opened_time
        if elapsed >= self.recovery_time_seconds:
            # Recovery time elapsed, reset to half-open / try
            logger.info(f"Circuit breaker for '{provider_key}' cooldown passed ({elapsed:.1f}s >= {self.recovery_time_seconds}s). Resetting.")
            self._opened_at.pop(provider_key, None)
            self._failure_counts[provider_key] = 0
            return True
        return False

    def record_success(self, provider_key: str) -> None:
        self._failure_counts[provider_key] = 0
        self._opened_at.pop(provider_key, None)

    def record_failure(self, provider_key: str) -> None:
        count = self._failure_counts.get(provider_key, 0) + 1
        self._failure_counts[provider_key] = count
        if count >= self.failure_threshold:
            self._opened_at[provider_key] = time.time()
            logger.warning(
                f"Circuit breaker OPENED for '{provider_key}' after {count} failure(s). "
                f"Provider will be skipped for {self.recovery_time_seconds} seconds."
            )

    def reset(self, provider_key: str = None) -> None:
        if provider_key:
            self._failure_counts.pop(provider_key, None)
            self._opened_at.pop(provider_key, None)
        else:
            self._failure_counts.clear()
            self._opened_at.clear()
