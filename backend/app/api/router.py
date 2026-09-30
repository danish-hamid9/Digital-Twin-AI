from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.user import router as user_router
from app.api.v1.finance import router as finance_router
from app.api.v1.study import router as study_router
from app.api.v1.habits import router as habits_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.chat import router as chat_router
from app.api.v1.plans import router as plans_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user_router, prefix="/user", tags=["User & Settings"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard & Analytics"])
api_router.include_router(predictions_router, prefix="/predictions", tags=["ML Predictions & Forecasts"])
api_router.include_router(simulations_router, prefix="/simulations", tags=["What-If Monte Carlo Simulations"])
api_router.include_router(recommendations_router, prefix="/recommendations", tags=["Actionable Recommendations"])
api_router.include_router(chat_router, prefix="/chat", tags=["Digital Twin Conversational Assistant"])
api_router.include_router(plans_router, prefix="/plans", tags=["Action Plans Tracker"])
api_router.include_router(finance_router, prefix="/finance", tags=["Personal Finance"])
api_router.include_router(study_router, prefix="/study", tags=["Study Sessions"])
api_router.include_router(habits_router, prefix="/habits", tags=["Habits & Wellbeing"])


