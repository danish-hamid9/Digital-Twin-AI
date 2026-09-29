import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    """Test successful user registration and initial profile creation with currency"""
    payload = {
        "email": "user_reg@example.com",
        "password": "Password123!",
        "full_name": "Reg Tester",
        "currency": "EUR"
    }
    res = await client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user_reg@example.com"
    assert data["user"]["profile"]["currency"] == "EUR"
    assert data["user"]["profile"]["full_name"] == "Reg Tester"

@pytest.mark.asyncio
async def test_prevent_duplicate_registration(client: AsyncClient):
    """Test duplicate email rejection (HTTP 400)"""
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "Duplicate Tester",
        "currency": "USD"
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

@pytest.mark.asyncio
async def test_user_login_success(client: AsyncClient):
    """Test successful user login with valid credentials"""
    await client.post("/api/v1/auth/register", json={
        "email": "login_success@example.com",
        "password": "ValidPassword123!"
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "login_success@example.com",
        "password": "ValidPassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login_success@example.com"

@pytest.mark.asyncio
async def test_user_login_invalid_password(client: AsyncClient):
    """Test rejection on incorrect password (HTTP 401)"""
    await client.post("/api/v1/auth/register", json={
        "email": "bad_password@example.com",
        "password": "RealPassword123!"
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": "bad_password@example.com",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient):
    """Test /me endpoint returning authenticated user profile"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "me_test@example.com",
        "password": "Password123!",
        "full_name": "Me Tester"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me_test@example.com"
    assert data["profile"]["full_name"] == "Me Tester"

@pytest.mark.asyncio
async def test_update_user_currency_and_targets(client: AsyncClient):
    """Test updating user currency setting and domain target hours"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "currency_user@example.com",
        "password": "Password123!",
        "currency": "USD"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "currency": "GBP",
        "monthly_target_savings": 1200.0,
        "target_study_hours_week": 20.0,
        "target_sleep_hours": 8.0
    }
    res = await client.put("/api/v1/user/profile", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["currency"] == "GBP"
    assert data["monthly_target_savings"] == 1200.0
    assert data["target_study_hours_week"] == 20.0
    assert data["target_sleep_hours"] == 8.0

@pytest.mark.asyncio
async def test_gdpr_export_my_data(client: AsyncClient):
    """Test GDPR export of all user data in structured JSON format"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "gdpr_export@example.com",
        "password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/user/export-data", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "user" in data
    assert "finance_entries" in data
    assert "study_sessions" in data
    assert "habit_logs" in data
    assert "plans" in data

@pytest.mark.asyncio
async def test_gdpr_cascade_delete_my_data(client: AsyncClient):
    """Test hard cascade delete of user data and invalidation of credentials"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "gdpr_delete@example.com",
        "password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete data
    res_del = await client.delete("/api/v1/user/delete-data", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"

    # Subsequent access with same token must fail with 401
    res_subsequent = await client.get("/api/v1/auth/me", headers=headers)
    assert res_subsequent.status_code == 401

@pytest.mark.asyncio
async def test_auth_rate_limiting(client: AsyncClient):
    """Test sliding window rate limiting on authentication attempts"""
    for i in range(25):
        res = await client.post("/api/v1/auth/login", json={
            "email": f"rate_limit_probe_{i}@example.com",
            "password": "wrong"
        })
        if res.status_code == 429:
            assert "Rate limit exceeded" in res.json()["detail"]
            break
    else:
        pytest.fail("Rate limiter did not trigger after rapid attempts")
