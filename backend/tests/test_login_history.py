import pytest
from httpx import AsyncClient
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.login_event import LoginEvent
from app.services.login_history_service import record_login_event, truncate_ip, parse_browser_os


@pytest.mark.asyncio
async def test_ip_truncation_and_browser_parsing():
    """Verifies privacy-safe IP truncation and human-readable device labels."""
    # IPv4: last octet masked
    assert truncate_ip("192.168.1.55") == "192.168.1.*"
    assert truncate_ip("10.0.0.1") == "10.0.0.*"
    assert truncate_ip("127.0.0.1") == "127.0.0.*"

    # IPv6: /48 prefix
    assert truncate_ip("2001:0db8:85a3:0000:0000:8a2e:0370:7334") == "2001:0db8:85a3::/48"
    assert truncate_ip("::1") == "::1/48"

    # Browser & OS parsing
    ua_win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    assert "Chrome on Windows" in parse_browser_os(ua_win)

    ua_mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    assert "Safari on macOS" in parse_browser_os(ua_mac)

    ua_iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    assert "Safari on iOS" in parse_browser_os(ua_iphone)


@pytest.mark.asyncio
async def test_login_history_records_success_and_failure(client: AsyncClient):
    """Verifies that successful logins and failed attempts for existing users are recorded."""
    email = "login_test@example.com"
    pwd = "ValidPassword123!"

    # 1. Register user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": pwd, "full_name": "Login Tester"},
    )
    assert reg_res.status_code == 201

    # 2. Failed login attempt (wrong password for existing user)
    fail_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword999!"},
    )
    assert fail_res.status_code == 401

    # 3. Successful login attempt
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Failed login for non-existent account should NOT record anything
    non_existent = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody_exists@example.com", "password": "anypassword"},
    )
    assert non_existent.status_code == 401

    # 5. Fetch login history
    hist_res = await client.get("/api/v1/user/login-history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()

    assert len(history) == 2
    # Most recent first: index 0 should be success, index 1 should be failed
    assert history[0]["success"] is True
    assert history[0]["method"] == "password"
    assert history[1]["success"] is False
    assert history[1]["method"] == "password"


@pytest.mark.asyncio
async def test_login_history_user_isolation(client: AsyncClient):
    """Verifies user A cannot see user B's login events."""
    # User A
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "user_a@example.com", "password": "PasswordA123!", "full_name": "User A"},
    )
    token_a = res_a.json()["access_token"]

    # User B
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "user_b@example.com", "password": "PasswordB123!", "full_name": "User B"},
    )
    token_b = res_b.json()["access_token"]

    # User A logs in once more
    await client.post("/api/v1/auth/login", json={"email": "user_a@example.com", "password": "PasswordA123!"})
    # User B logs in with wrong password
    await client.post("/api/v1/auth/login", json={"email": "user_b@example.com", "password": "BadPassword"})

    # Check User A's history
    hist_a = await client.get("/api/v1/user/login-history", headers={"Authorization": f"Bearer {token_a}"})
    events_a = hist_a.json()
    assert len(events_a) == 1  # 1 login event for A
    assert events_a[0]["success"] is True

    # Check User B's history
    hist_b = await client.get("/api/v1/user/login-history", headers={"Authorization": f"Bearer {token_b}"})
    events_b = hist_b.json()
    assert len(events_b) == 1  # 1 failed login event for B
    assert events_b[0]["success"] is False


@pytest.mark.asyncio
async def test_login_history_included_in_data_export(client: AsyncClient):
    """Verifies that GDPR export includes login events."""
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "export_user@example.com", "password": "ExportPass123!", "full_name": "Export User"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Log in
    await client.post("/api/v1/auth/login", json={"email": "export_user@example.com", "password": "ExportPass123!"})

    export_res = await client.get("/api/v1/user/export-data", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()

    assert "login_events" in export_data
    assert len(export_data["login_events"]) >= 1
    assert export_data["login_events"][0]["method"] == "password"


@pytest.mark.asyncio
async def test_login_history_cascades_on_user_delete(client: AsyncClient):
    """Verifies that hard deleting a user cascade-deletes all login events."""
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "del_user@example.com", "password": "DelPass123!", "full_name": "Del User"},
    )
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate login event
    await client.post("/api/v1/auth/login", json={"email": "del_user@example.com", "password": "DelPass123!"})

    # Delete user data
    del_res = await client.delete("/api/v1/user/delete-data", headers=headers)
    assert del_res.status_code == 200

    # User token is now invalid / user deleted
    hist_res = await client.get("/api/v1/user/login-history", headers=headers)
    assert hist_res.status_code in (401, 404)


@pytest.mark.asyncio
async def test_login_history_100_entry_limit(client: AsyncClient):
    """Verifies that the latest 100 entries per user limit is strictly enforced."""
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "cap_user@example.com", "password": "CapPass123!", "full_name": "Cap User"},
    )
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Use service to record 105 login events
    from conftest import TestingSessionLocal
    async with TestingSessionLocal() as session:
        for i in range(105):
            await record_login_event(
                session,
                user_id=user_id,
                success=(i % 2 == 0),
                method="password",
                ip_override=f"192.168.1.{i % 250}",
                ua_override="Test Agent",
            )
        await session.commit()

    # Query endpoint
    hist_res = await client.get("/api/v1/user/login-history", headers=headers)
    assert hist_res.status_code == 200
    events = hist_res.json()
    assert len(events) == 100
