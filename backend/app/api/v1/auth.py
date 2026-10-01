from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, check_rate_limit
from app.core.config import settings
from app.models.user import User, Profile
from app.schemas.user import UserRegister, UserLogin, Token, UserOut
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    # Apply rate limiting to prevent spam registration
    check_rate_limit(request, key_prefix="auth_register", limit=settings.RATE_LIMIT_AUTH_PER_MINUTE)

    # Check if email is already registered
    stmt = select(User).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash password with bcrypt
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email.lower().strip(),
        hashed_password=hashed_pwd
    )
    db.add(user)
    await db.flush()  # Generate user.id

    # Create associated default profile with chosen currency
    profile = Profile(
        user_id=user.id,
        full_name=user_in.full_name or "",
        currency=(user_in.currency or "USD").upper()
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    # Reload with profile
    stmt = select(User).options(selectinload(User.profile)).where(User.id == user.id)
    user_with_profile = (await db.execute(stmt)).scalar_one()

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user_with_profile)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    # Apply rate limiting to prevent brute-force attacks
    check_rate_limit(request, key_prefix="auth_login", limit=settings.RATE_LIMIT_AUTH_PER_MINUTE)

    stmt = select(User).options(selectinload(User.profile)).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)


@router.get("/status")
async def auth_status():
    """Returns public authentication capabilities like whether demo-login is enabled."""
    return {
        "demo_login_enabled": getattr(settings, "ENABLE_DEMO_LOGIN", False)
    }


@router.post("/demo-login", response_model=Token)
async def demo_login(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate as demo@digitaltwin.ai without hardcoded credentials in the frontend.
    Only enabled when ENABLE_DEMO_LOGIN=true in backend config.
    Rate-limited to RATE_LIMIT_AUTH_PER_MINUTE requests per IP.
    """
    check_rate_limit(request, key_prefix="auth_demo_login", limit=settings.RATE_LIMIT_AUTH_PER_MINUTE)

    if not getattr(settings, "ENABLE_DEMO_LOGIN", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo login is disabled on this server."
        )

    demo_email = "demo@digitaltwin.ai"
    stmt = select(User).options(selectinload(User.profile)).where(User.email == demo_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo account not found. Please run scripts/seed_demo_account.py first."
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

