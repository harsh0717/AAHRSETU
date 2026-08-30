import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status


class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60, block_seconds: int = 120):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.block_seconds = block_seconds
        self.failed_attempts: Dict[str, List[float]] = defaultdict(list)
        self.blocked_until: Dict[str, float] = {}

    def _cleanup_old_attempts(self, key: str, now: float):
        cutoff = now - self.window_seconds
        self.failed_attempts[key] = [t for t in self.failed_attempts[key] if t > cutoff]

    def check_rate_limit(self, key: str) -> None:
        now = time.time()
        if key in self.blocked_until:
            remaining = int(self.blocked_until[key] - now)
            if remaining > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed login attempts. Please wait {remaining} seconds before trying again."
                )
            else:
                del self.blocked_until[key]

        self._cleanup_old_attempts(key, now)
        if len(self.failed_attempts[key]) >= self.max_attempts:
            self.blocked_until[key] = now + self.block_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please wait {self.block_seconds} seconds before trying again."
            )

    def record_failed_attempt(self, key: str) -> None:
        now = time.time()
        self._cleanup_old_attempts(key, now)
        self.failed_attempts[key].append(now)
        if len(self.failed_attempts[key]) >= self.max_attempts:
            self.blocked_until[key] = now + self.block_seconds

    def record_successful_login(self, key: str) -> None:
        if key in self.failed_attempts:
            del self.failed_attempts[key]
        if key in self.blocked_until:
            del self.blocked_until[key]


login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60, block_seconds=120)
