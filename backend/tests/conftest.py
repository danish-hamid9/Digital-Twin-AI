import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
repo_root = backend_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.database import Base, get_db
import app.models  # Register all models with Base.metadata
from app.main import app

import os
from sqlalchemy.pool import StaticPool, NullPool

# Configurable test database URL; defaults to /tmp SQLite file on Linux/containers to prevent lock/disk I/O errors on bind mounts
DEFAULT_DB_PATH = "/tmp/test_temp.db" if os.path.exists("/tmp") else "./test_temp.db"
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}")

connect_args = {"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
poolclass = StaticPool if "sqlite" in TEST_DATABASE_URL else NullPool

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    poolclass=poolclass,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

from app.core.security import rate_limiter

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    rate_limiter._requests.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    rate_limiter._requests.clear()

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
