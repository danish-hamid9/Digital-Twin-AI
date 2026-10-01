import uuid
import datetime as dt
import asyncio
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.plan import Plan
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.services.predictor import predictor_service
from app.services.simulation_service import simulation_service
from app.services.recommendation_service import recommendation_service
from app.api.v1.dashboard import compute_finance_analytics, compute_study_analytics, compute_habit_analytics, resolve_date_bounds
from app.schemas.simulation import SimulationScenarioParams

async def execute_tool_call(
    tool_name: str,
    raw_args: Dict[str, Any],
    db: AsyncSession,
    user: User,
) -> Dict[str, Any]:
    """
    Executes a declared tool call with strict server-side user context injection.
    
    SECURITY GUARANTEE:
    Even if raw_args contains 'user_id', it is stripped or ignored.
    All data queries, predictions, simulations, and plans use `user.id` from the JWT!
    """
    clean_args = {k: v for k, v in raw_args.items() if k != "user_id"}

    if tool_name == "get_user_summary":
        preset = clean_args.get("preset", "30d")
        s_date, e_date, _ = resolve_date_bounds(preset, None, None)
        fin = await compute_finance_analytics(db, user, s_date, e_date)
        stu = await compute_study_analytics(db, user, s_date, e_date)
        hab = await compute_habit_analytics(db, user, s_date, e_date)

        return {
            "timeframe": preset,
            "finance": {
                "total_income": fin.total_income,
                "total_expenses": fin.total_expenses,
                "net_savings": fin.net_savings,
                "savings_rate_pct": fin.savings_rate,
                "runway_months": fin.runway_months,
            },
            "study": {
                "total_study_hours": stu.total_study_hours,
                "avg_score_pct": stu.avg_score,
                "sessions_count": stu.sessions_count,
                "weekly_progress_pct": stu.weekly_progress_pct,
            },
            "habits": {
                "avg_sleep_hours": hab.avg_sleep_hours,
                "avg_exercise_mins": hab.avg_exercise_minutes,
                "avg_mood_score": hab.avg_mood,
                "current_streak_days": hab.current_streak,
                "habit_completion_rate_pct": hab.habit_completion_rate,
            }
        }

    elif tool_name == "run_prediction":
        domain = clean_args.get("domain", "overview").lower()
        horizon = int(clean_args.get("horizon", 6))

        if domain == "finance":
            f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == user.id).order_by(FinanceEntry.date.asc()))
            entries = list(f_res.scalars().all())
            pred = await asyncio.to_thread(predictor_service.predict_finance, entries, user.profile, horizon)
            monthly_expected = pred.forecasts[0].projected_savings.expected if pred.forecasts else 0.0
            p50_cum = pred.projected_6m_savings.expected if hasattr(pred, "projected_6m_savings") else 0.0
            p10_cum = pred.projected_6m_savings.lower if hasattr(pred, "projected_6m_savings") else 0.0
            p90_cum = pred.projected_6m_savings.upper if hasattr(pred, "projected_6m_savings") else 0.0
            return {
                "domain": "finance",
                "horizon_months": horizon,
                "data_source": pred.data_source,
                "current_monthly_income": getattr(pred, "current_monthly_income", 0.0),
                "current_monthly_expenses": getattr(pred, "current_monthly_expenses", 0.0),
                "expected_monthly_savings": monthly_expected,
                "cumulative_savings_p50": p50_cum,
                "confidence_lower_p10": p10_cum,
                "confidence_upper_p90": p90_cum,
                "monthly_forecasts": [
                    {
                        "month": f.month_index,
                        "projected_expenses": f.projected_expenses.expected,
                        "projected_savings": f.projected_savings.expected,
                        "cumulative_savings": f.cumulative_savings.expected,
                    }
                    for f in getattr(pred, "forecasts", [])
                ],
            }
        elif domain == "study":
            s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
            sessions = list(s_res.scalars().all())
            h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
            habits = list(h_res.scalars().all())
            pred = await asyncio.to_thread(predictor_service.predict_study, sessions, habits, user.profile)
            return {
                "domain": "study",
                "projected_exam_score": pred.current_predicted_score.expected,
                "confidence_interval": [pred.current_predicted_score.lower, pred.current_predicted_score.upper],
                "top_feature_importance": [
                    {"feature": k, "importance_pct": v}
                    for k, v in list(pred.feature_importance.items())[:3]
                ],
            }
        elif domain == "habits":
            h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
            habits = list(h_res.scalars().all())
            s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
            sessions = list(s_res.scalars().all())
            pred = await asyncio.to_thread(predictor_service.predict_habits, habits, sessions, user.profile)
            return {
                "domain": "habits",
                "streak_continuation_prob": pred.streak_continuation_probability,
                "burnout_risk_score": pred.burnout_risk_score,
                "burnout_level": pred.burnout_risk_level,
                "risk_factors": [
                    {"name": rf.factor, "impact": rf.impact, "description": rf.value}
                    for rf in (pred.risk_factors or [])
                ],
            }
        else:
            f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == user.id).order_by(FinanceEntry.date.asc()))
            entries = list(f_res.scalars().all())
            s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
            sessions = list(s_res.scalars().all())
            h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
            habits = list(h_res.scalars().all())

            f_pred, s_pred, h_pred = await asyncio.gather(
                asyncio.to_thread(predictor_service.predict_finance, entries, user.profile, 3),
                asyncio.to_thread(predictor_service.predict_study, sessions, habits, user.profile),
                asyncio.to_thread(predictor_service.predict_habits, habits, sessions, user.profile),
            )
            f_monthly = f_pred.forecasts[0].projected_savings.expected if f_pred.forecasts else 0.0
            return {
                "domain": "overview",
                "finance_expected_savings": f_monthly,
                "study_projected_score": s_pred.current_predicted_score.expected,
                "habits_burnout_level": h_pred.burnout_risk_level,
                "streak_continuation_prob": h_pred.streak_continuation_probability,
            }

    elif tool_name == "run_simulation":
        params = SimulationScenarioParams(
            horizon_months=int(clean_args.get("horizon_months", 6)),
            salary_change_pct=float(clean_args.get("salary_change_pct", 0.0)),
            one_time_expense=float(clean_args.get("one_time_expense", 0.0)),
            one_time_expense_month=int(clean_args.get("expense_target_month", 1)),
            study_hours_delta=float(clean_args.get("study_hours_delta", 0.0)),
            sleep_target_delta=float(clean_args.get("sleep_target_delta", 0.0)),
            exercise_minutes_delta=float(clean_args.get("exercise_minutes_delta", 0.0)),
            iterations=500,
        )
        f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == user.id).order_by(FinanceEntry.date.asc()))
        finance_entries = list(f_res.scalars().all())

        s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
        study_sessions = list(s_res.scalars().all())

        h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
        habit_logs = list(h_res.scalars().all())

        sim_res = await asyncio.to_thread(
            simulation_service.run_simulation,
            finance_entries=finance_entries,
            study_sessions=study_sessions,
            habit_logs=habit_logs,
            profile=user.profile,
            scenario_params=params,
        )
        return {
            "horizon_months": sim_res.horizon_months,
            "stochastic_iterations": sim_res.iterations,
            "savings_delta_p50": sim_res.summary.savings_net_impact_p50,
            "study_score_delta_p50": sim_res.summary.study_score_net_impact_p50,
            "burnout_risk_delta_p50": sim_res.summary.burnout_risk_net_impact_p50,
            "baseline_final_savings_p50": sim_res.summary.baseline_final_savings.p50,
            "scenario_final_savings_p50": sim_res.summary.scenario_final_savings.p50,
            "scenario_final_savings_p10": sim_res.summary.scenario_final_savings.p10,
            "scenario_final_savings_p90": sim_res.summary.scenario_final_savings.p90,
            "insights": sim_res.summary.cross_domain_insights,
        }

    elif tool_name == "get_recommendations":
        f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == user.id).order_by(FinanceEntry.date.asc()))
        finance_entries = list(f_res.scalars().all())

        g_res = await db.execute(select(SavingsGoal).where(SavingsGoal.user_id == user.id))
        savings_goals = list(g_res.scalars().all())

        s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
        study_sessions = list(s_res.scalars().all())

        h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
        habit_logs = list(h_res.scalars().all())

        recs_response = await asyncio.to_thread(
            recommendation_service.generate_recommendations,
            finance_entries=finance_entries,
            savings_goals=savings_goals,
            study_sessions=study_sessions,
            habit_logs=habit_logs,
            profile=user.profile,
        )
        return {
            "count": recs_response.total_count,
            "high_priority_count": recs_response.high_priority_count,
            "disclaimer": recs_response.disclaimer,
            "recommendations": [
                {
                    "title": r.title,
                    "explanation": r.explanation,
                    "priority": r.priority,
                    "category": r.category,
                    "metric_name": r.user_metric_name,
                    "user_metric_value": r.user_metric_value,
                    "threshold_value": r.threshold_value,
                }
                for r in recs_response.recommendations
            ]
        }

    elif tool_name == "create_plan":
        due_date_str = clean_args.get("due_date")
        return {
            "status": "proposal_created",
            "proposed_plan": {
                "action": "create",
                "title": clean_args.get("title", "Untitled Plan"),
                "description": clean_args.get("description", ""),
                "domain": clean_args.get("domain", "general"),
                "status": "pending",
                "due_date": due_date_str,
            },
            "message": "Proposed new action plan. Awaiting user confirmation card approval."
        }

    elif tool_name == "list_plans":
        query = select(Plan).where(Plan.user_id == user.id)
        status_filter = clean_args.get("status")
        if status_filter and status_filter != "all":
            query = query.where(Plan.status == status_filter)
        res = await db.execute(query.order_by(Plan.created_at.desc()))
        plans = res.scalars().all()
        return {
            "plans_count": len(plans),
            "plans": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "description": p.description,
                    "domain": p.domain,
                    "status": p.status,
                    "due_date": p.due_date.isoformat() if p.due_date else None,
                }
                for p in plans
            ]
        }

    elif tool_name == "update_plan":
        plan_id = clean_args.get("plan_id")
        existing_plan = None
        if plan_id:
            try:
                pid = uuid.UUID(str(plan_id))
                res = await db.execute(select(Plan).where(Plan.id == pid, Plan.user_id == user.id))
                existing_plan = res.scalar_one_or_none()
            except Exception:
                pass

        if not existing_plan:
            return {"error": f"Plan with id {plan_id} not found for current user"}

        return {
            "status": "proposal_updated",
            "proposed_plan": {
                "action": "update",
                "plan_id": str(existing_plan.id),
                "title": clean_args.get("title", existing_plan.title),
                "description": clean_args.get("description", existing_plan.description),
                "domain": clean_args.get("domain", existing_plan.domain),
                "status": clean_args.get("status", existing_plan.status),
                "due_date": clean_args.get("due_date", existing_plan.due_date.isoformat() if existing_plan.due_date else None),
            },
            "message": "Proposed update to existing action plan. Awaiting user confirmation card approval."
        }

    else:
        return {"error": f"Unknown tool name: {tool_name}"}
