import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
from collections import defaultdict
import threading
import bcrypt
import jwt
from fastapi import HTTPException, status, Request
from app.core.config import settings

# -------------------------------------------------------------
# Password Hashing with Bcrypt
# -------------------------------------------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# -------------------------------------------------------------
# JWT Tokens
# -------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# -------------------------------------------------------------
# In-Memory Rate Limiter (Thread-safe Sliding Window)
# -------------------------------------------------------------
class InMemoryRateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            # Clean expired timestamps
            timestamps = [t for t in self._requests[key] if t > cutoff]
            if len(timestamps) >= max_requests:
                retry_after = int(timestamps[0] + window_seconds - now) + 1
                self._requests[key] = timestamps
                return False, max(1, retry_after)
            
            timestamps.append(now)
            self._requests[key] = timestamps
            return True, 0

rate_limiter = InMemoryRateLimiter()

def check_rate_limit(request: Request, key_prefix: str, limit: int, window_seconds: int = 60):
    client_ip = request.client.host if request.client else "127.0.0.1"
    key = f"{key_prefix}:{client_ip}"
    allowed, retry_after = rate_limiter.is_allowed(key, max_requests=limit, window_seconds=window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
