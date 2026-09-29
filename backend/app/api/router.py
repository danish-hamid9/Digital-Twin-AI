from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.user import router as user_router
from app.api.v1.finance import router as finance_router
from app.api.v1.study import router as study_router
from app.api.v1.habits import router as habits_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user_router, prefix="/user", tags=["User & Settings"])
api_router.include_router(finance_router, prefix="/finance", tags=["Personal Finance"])
api_router.include_router(study_router, prefix="/study", tags=["Study Sessions"])
api_router.include_router(habits_router, prefix="/habits", tags=["Habits & Wellbeing"])
