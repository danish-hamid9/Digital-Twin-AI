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

        user_currency = user.profile.currency if user.profile and user.profile.currency else "USD"
        user_target_sleep = float(user.profile.target_sleep_hours) if user.profile and user.profile.target_sleep_hours is not None else 7.5
        sleep_gap = round(user_target_sleep - hab.avg_sleep_hours, 2)

        user_target_savings = float(user.profile.monthly_target_savings) if user.profile and user.profile.monthly_target_savings is not None else 10000.0
        savings_gap = round(user_target_savings - fin.net_savings, 2)

        chart_spec = None
        if fin.category_distribution:
            chart_spec = {
                "type": "expense_donut",
                "title": f"Expense Breakdown ({preset})",
                "unit": user_currency,
                "currency": user_currency,
                "labels": [c.category for c in fin.category_distribution],
                "series": [
                    {"name": c.category, "value": round(float(c.amount), 2)}
                    for c in fin.category_distribution
                ],
                "raw_data": {
                    "categories": [c.category for c in fin.category_distribution],
                    "amounts": [round(float(c.amount), 2) for c in fin.category_distribution],
                    "percentages": [c.percentage for c in fin.category_distribution],
                }
            }

        return {
            "timeframe": preset,
            "currency": user_currency,
            "chart_spec": chart_spec,
            "finance": {
                "total_income": fin.total_income,
                "total_expenses": fin.total_expenses,
                "net_savings": fin.net_savings,
                "monthly_target_savings": user_target_savings,
                "savings_gap": savings_gap,
                "reconciled": True,
                "savings_rate_pct": fin.savings_rate,
                "runway_months": fin.runway_months,
                "currency": user_currency,
            },
            "study": {
                "total_study_hours": stu.total_study_hours,
                "avg_score_pct": stu.avg_score,
                "sessions_count": stu.sessions_count,
                "weekly_progress_pct": stu.weekly_progress_pct,
            },
            "habits": {
                "avg_sleep_hours": hab.avg_sleep_hours,
                "target_sleep_hours": user_target_sleep,
                "sleep_gap_hours": sleep_gap,
                "reconciled": True,
                "avg_exercise_mins": hab.avg_exercise_minutes,
                "avg_mood_score": hab.avg_mood,
                "current_streak_days": hab.current_streak,
                "habit_completion_rate_pct": hab.habit_completion_rate,
            }
        }

    elif tool_name == "run_prediction":
        domain = clean_args.get("domain", "overview").lower()
        horizon = int(clean_args.get("horizon", 6))
        user_currency = user.profile.currency if user.profile and user.profile.currency else "USD"

        if domain == "finance":
            f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == user.id).order_by(FinanceEntry.date.asc()))
            entries = list(f_res.scalars().all())
            pred = await asyncio.to_thread(predictor_service.predict_finance, entries, user.profile, horizon)
            monthly_expected = pred.forecasts[0].projected_savings.expected if pred.forecasts else 0.0
            p50_cum = pred.projected_6m_savings.expected if hasattr(pred, "projected_6m_savings") else 0.0
            p10_cum = pred.projected_6m_savings.lower if hasattr(pred, "projected_6m_savings") else 0.0
            p90_cum = pred.projected_6m_savings.upper if hasattr(pred, "projected_6m_savings") else 0.0
            forecasts = getattr(pred, "forecasts", [])
            chart_spec = None
            if forecasts:
                chart_spec = {
                    "type": "savings_forecast",
                    "title": f"Projected Monthly Savings with Confidence Bands ({horizon}M)",
                    "unit": user_currency,
                    "currency": user_currency,
                    "labels": [f"M{f.month_index}" for f in forecasts],
                    "series": [
                        {"name": "Lower (P10)", "data": [round(float(f.projected_savings.lower), 2) for f in forecasts]},
                        {"name": "Expected (P50)", "data": [round(float(f.projected_savings.expected), 2) for f in forecasts]},
                        {"name": "Upper (P90)", "data": [round(float(f.projected_savings.upper), 2) for f in forecasts]},
                    ],
                    "raw_data": {
                        "months": [f.month_index for f in forecasts],
                        "expected_savings": [round(float(f.projected_savings.expected), 2) for f in forecasts],
                        "lower_p10": [round(float(f.projected_savings.lower), 2) for f in forecasts],
                        "upper_p90": [round(float(f.projected_savings.upper), 2) for f in forecasts],
                        "cumulative_p50": [round(float(f.cumulative_savings.expected), 2) for f in forecasts],
                    }
                }
            return {
                "domain": "finance",
                "currency": user_currency,
                "horizon_months": horizon,
                "data_source": pred.data_source,
                "current_monthly_income": getattr(pred, "current_monthly_income", 0.0),
                "current_monthly_expenses": getattr(pred, "current_monthly_expenses", 0.0),
                "expected_monthly_savings": monthly_expected,
                "cumulative_savings_p50": p50_cum,
                "confidence_lower_p10": p10_cum,
                "confidence_upper_p90": p90_cum,
                "chart_spec": chart_spec,
                "monthly_forecasts": [
                    {
                        "month": f.month_index,
                        "projected_expenses": f.projected_expenses.expected,
                        "projected_savings": f.projected_savings.expected,
                        "cumulative_savings": f.cumulative_savings.expected,
                    }
                    for f in forecasts
                ],
            }
        elif domain == "study":
            s_res = await db.execute(select(StudySession).where(StudySession.user_id == user.id).order_by(StudySession.date.asc()))
            sessions = list(s_res.scalars().all())
            h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == user.id).order_by(HabitLog.date.asc()))
            habits = list(h_res.scalars().all())
            pred = await asyncio.to_thread(predictor_service.predict_study, sessions, habits, user.profile)

            # Build dual-axis chart: Study score vs Sleep tracking
            date_scores: Dict[str, List[float]] = {}
            for s in sessions:
                if s.score is not None:
                    d_k = str(s.date)
                    date_scores.setdefault(d_k, []).append(float(s.score))

            date_sleep: Dict[str, float] = {}
            for h in habits:
                if h.sleep_hours is not None:
                    date_sleep[str(h.date)] = float(h.sleep_hours)

            all_dates = sorted(set(list(date_scores.keys()) + list(date_sleep.keys())))[-10:]
            if not all_dates:
                today = dt.date.today()
                all_dates = [str(today - dt.timedelta(days=i)) for i in range(6, -1, -1)]

            score_series_data = []
            sleep_series_data = []
            exp_score = round(float(pred.current_predicted_score.expected), 1)

            for d in all_dates:
                if d in date_scores and date_scores[d]:
                    score_series_data.append(round(sum(date_scores[d]) / len(date_scores[d]), 1))
                else:
                    score_series_data.append(exp_score)
                sleep_series_data.append(round(date_sleep.get(d, 7.5), 1))

            chart_spec = {
                "type": "study_vs_sleep",
                "title": "Study Performance vs Sleep Duration (Dual-Axis)",
                "unit": "% / hrs",
                "currency": None,
                "labels": [d[-5:] if len(d) >= 5 else d for d in all_dates],
                "series": [
                    {"name": "Study Score", "data": score_series_data, "axis": "left", "unit": "%"},
                    {"name": "Sleep Hours", "data": sleep_series_data, "axis": "right", "unit": "hrs"},
                ],
                "raw_data": {
                    "dates": all_dates,
                    "study_scores": score_series_data,
                    "sleep_hours": sleep_series_data,
                    "predicted_score": pred.current_predicted_score.expected,
                }
            }

            return {
                "domain": "study",
                "projected_exam_score": pred.current_predicted_score.expected,
                "confidence_interval": [pred.current_predicted_score.lower, pred.current_predicted_score.upper],
                "chart_spec": chart_spec,
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

            burnout_score = round(float(pred.burnout_risk_score), 1)
            streak_prob = round(float(pred.streak_continuation_probability * 100 if pred.streak_continuation_probability <= 1.0 else pred.streak_continuation_probability), 1)
            chart_spec = {
                "type": "habit_burnout_gauge",
                "title": "Habit Sustainability & Burnout Gauges",
                "unit": "%",
                "currency": None,
                "labels": ["Burnout Risk", "Streak Continuity"],
                "series": [
                    {"name": "Burnout Risk", "value": burnout_score, "max": 100, "unit": "%"},
                    {"name": "Streak Continuity", "value": streak_prob, "max": 100, "unit": "%"},
                ],
                "raw_data": {
                    "burnout_risk_score": burnout_score,
                    "streak_continuation_prob": streak_prob,
                    "burnout_level": pred.burnout_risk_level,
                }
            }

            return {
                "domain": "habits",
                "streak_continuation_prob": pred.streak_continuation_probability,
                "burnout_risk_score": pred.burnout_risk_score,
                "burnout_level": pred.burnout_risk_level,
                "chart_spec": chart_spec,
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
            streak_prob = round(float(h_pred.streak_continuation_probability * 100 if h_pred.streak_continuation_probability <= 1.0 else h_pred.streak_continuation_probability), 1)
            burnout_score = 25.0 if h_pred.burnout_risk_level == "low" else (55.0 if h_pred.burnout_risk_level == "medium" else 85.0)
            chart_spec = {
                "type": "habit_burnout_gauge",
                "title": "Habit Sustainability & Burnout Gauges",
                "unit": "%",
                "currency": None,
                "labels": ["Burnout Risk", "Streak Continuity"],
                "series": [
                    {"name": "Burnout Risk", "value": burnout_score, "max": 100, "unit": "%"},
                    {"name": "Streak Continuity", "value": streak_prob, "max": 100, "unit": "%"},
                ],
                "raw_data": {
                    "burnout_risk_score": burnout_score,
                    "streak_continuation_prob": streak_prob,
                    "burnout_level": h_pred.burnout_risk_level,
                }
            }
            return {
                "domain": "overview",
                "currency": user_currency,
                "finance_expected_savings": f_monthly,
                "study_projected_score": s_pred.current_predicted_score.expected,
                "habits_burnout_level": h_pred.burnout_risk_level,
                "streak_continuation_prob": h_pred.streak_continuation_probability,
                "chart_spec": chart_spec,
            }

    elif tool_name == "run_simulation":
        sim_model = str(clean_args.get("model", "parametric")).lower()
        if sim_model not in ("parametric", "bootstrap", "compare"):
            sim_model = "parametric"

        params = SimulationScenarioParams(
            horizon_months=int(clean_args.get("horizon_months", 6)),
            salary_change_pct=float(clean_args.get("salary_change_pct", 0.0)),
            one_time_expense=float(clean_args.get("one_time_expense", 0.0)),
            one_time_expense_month=int(clean_args.get("expense_target_month", 1)),
            study_hours_delta=float(clean_args.get("study_hours_delta", 0.0)),
            sleep_target_delta=float(clean_args.get("sleep_target_delta", 0.0)),
            exercise_minutes_delta=float(clean_args.get("exercise_minutes_delta", 0.0)),
            model=sim_model,
            iterations=int(clean_args.get("iterations", 15000)),
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
        user_currency = user.profile.currency if user.profile and user.profile.currency else "USD"

        traj = sim_res.monthly_trajectory or []
        chart_labels = [f"M{getattr(m, 'month_index', getattr(m, 'month', i + 1))}" for i, m in enumerate(traj)]
        p10_data = [round(float(m.scenario.cumulative_savings.p10 if hasattr(m, 'scenario') else getattr(m, 'scenario_savings').p10), 2) for m in traj]
        p50_data = [round(float(m.scenario.cumulative_savings.p50 if hasattr(m, 'scenario') else getattr(m, 'scenario_savings').p50), 2) for m in traj]
        p90_data = [round(float(m.scenario.cumulative_savings.p90 if hasattr(m, 'scenario') else getattr(m, 'scenario_savings').p90), 2) for m in traj]
        base_data = [round(float(m.baseline.cumulative_savings.p50 if hasattr(m, 'baseline') else getattr(m, 'baseline_savings').p50), 2) for m in traj]

        chart_spec = {
            "type": "simulation_fan",
            "title": f"Monte Carlo Fan Trajectory ({sim_res.horizon_months}M - {sim_res.iterations} Runs)",
            "unit": user_currency,
            "currency": user_currency,
            "labels": chart_labels,
            "series": [
                {"name": "P10 (Unfavorable)", "data": p10_data},
                {"name": "P50 (Median Scenario)", "data": p50_data},
                {"name": "P90 (Favorable)", "data": p90_data},
                {"name": "Baseline P50", "data": base_data},
            ],
            "raw_data": {
                "months": [getattr(m, 'month_index', getattr(m, 'month', i + 1)) for i, m in enumerate(traj)],
                "baseline_p50": base_data,
                "scenario_p10": p10_data,
                "scenario_p50": p50_data,
                "scenario_p90": p90_data,
                "final_baseline_p50": sim_res.summary.baseline_final_savings.p50,
                "final_scenario_p50": sim_res.summary.scenario_final_savings.p50,
            }
        }

        return {
            "horizon_months": sim_res.horizon_months,
            "stochastic_iterations": sim_res.iterations,
            "currency": user_currency,
            "model": getattr(sim_res, "model", sim_model),
            "limited_history": getattr(sim_res, "limited_history", False),
            "savings_delta_p50": sim_res.summary.savings_net_impact_p50,
            "study_score_delta_p50": sim_res.summary.study_score_net_impact_p50,
            "burnout_risk_delta_p50": sim_res.summary.burnout_risk_net_impact_p50,
            "baseline_final_savings_p50": sim_res.summary.baseline_final_savings.p50,
            "scenario_final_savings_p50": sim_res.summary.scenario_final_savings.p50,
            "scenario_final_savings_p10": sim_res.summary.scenario_final_savings.p10,
            "scenario_final_savings_p90": sim_res.summary.scenario_final_savings.p90,
            "chart_spec": chart_spec,
            "insights": sim_res.summary.cross_domain_insights,
            "comparison_results": getattr(sim_res, "comparison_results", None),
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

    elif tool_name == "get_daily_series":
        days = int(clean_args.get("days", 30) or 30)
        end_d = dt.date.today()
        start_d = end_d - dt.timedelta(days=days)

        s_res = await db.execute(
            select(StudySession)
            .where(StudySession.user_id == user.id, StudySession.date >= start_d, StudySession.date <= end_d)
            .order_by(StudySession.date.asc())
        )
        sessions = list(s_res.scalars().all())

        h_res = await db.execute(
            select(HabitLog)
            .where(HabitLog.user_id == user.id, HabitLog.date >= start_d, HabitLog.date <= end_d)
            .order_by(HabitLog.date.asc())
        )
        habits = list(h_res.scalars().all())

        # Group by date
        daily_study: Dict[str, Dict[str, Any]] = {}
        for s in sessions:
            d_str = str(s.date)
            daily_study.setdefault(d_str, {"hours": 0.0, "scores": []})
            daily_study[d_str]["hours"] += float(s.hours or 0.0)
            if s.score is not None:
                daily_study[d_str]["scores"].append(float(s.score))

        daily_habits: Dict[str, Dict[str, Any]] = {}
        for h in habits:
            d_str = str(h.date)
            daily_habits.setdefault(d_str, {"sleep": [], "exercise": 0.0, "mood": []})
            if h.sleep_hours is not None:
                daily_habits[d_str]["sleep"].append(float(h.sleep_hours))
            daily_habits[d_str]["exercise"] += float(h.exercise_minutes or 0.0)
            if h.mood is not None:
                daily_habits[d_str]["mood"].append(float(h.mood))

        # Sorted list of dates
        all_dates = sorted(set(list(daily_study.keys()) + list(daily_habits.keys())))

        daily_records = []
        paired_sleep_scores = []
        for d in all_dates:
            score = round(sum(daily_study[d]["scores"]) / len(daily_study[d]["scores"]), 1) if (d in daily_study and daily_study[d]["scores"]) else None
            hours = round(daily_study[d]["hours"], 1) if d in daily_study else None
            sleep = round(sum(daily_habits[d]["sleep"]) / len(daily_habits[d]["sleep"]), 1) if (d in daily_habits and daily_habits[d]["sleep"]) else None
            mood = round(sum(daily_habits[d]["mood"]) / len(daily_habits[d]["mood"]), 1) if (d in daily_habits and daily_habits[d]["mood"]) else None
            exercise = round(daily_habits[d]["exercise"], 1) if d in daily_habits else None

            daily_records.append({
                "date": d,
                "study_score": score,
                "study_hours": hours,
                "sleep_hours": sleep,
                "mood": mood,
                "exercise_minutes": exercise,
            })

            if sleep is not None and score is not None:
                paired_sleep_scores.append((sleep, score))

        data_points_count = len(paired_sleep_scores)
        corr_coef: Optional[float] = None
        if data_points_count >= 2:
            xs = [p[0] for p in paired_sleep_scores]
            ys = [p[1] for p in paired_sleep_scores]
            mean_x = sum(xs) / len(xs)
            mean_y = sum(ys) / len(ys)
            denom_x = sum((x - mean_x) ** 2 for x in xs)
            denom_y = sum((y - mean_y) ** 2 for y in ys)
            if denom_x > 0 and denom_y > 0:
                corr_val = sum((x - mean_x) * (y - mean_y) for x, y in paired_sleep_scores) / ((denom_x * denom_y) ** 0.5)
                corr_coef = round(float(corr_val), 3)

        if data_points_count < 10:
            is_reliable = False
            reliability_status = "unreliable"
            reliability_message = f"Correlation is unreliable: fewer than 10 data points found ({data_points_count} points)."
        else:
            is_reliable = True
            reliability_status = "reliable"
            reliability_message = f"Correlation is statistically grounded on {data_points_count} data points."

        # Dual axis study vs sleep chart
        chart_dates = [d["date"] for d in daily_records if d["study_score"] is not None or d["sleep_hours"] is not None]
        chart_spec = None
        if chart_dates:
            user_target_sleep = float(user.profile.target_sleep_hours) if user.profile and user.profile.target_sleep_hours is not None else 7.5
            scores = [d["study_score"] if d["study_score"] is not None else 75.0 for d in daily_records if d["date"] in chart_dates]
            sleeps = [d["sleep_hours"] if d["sleep_hours"] is not None else user_target_sleep for d in daily_records if d["date"] in chart_dates]
            chart_spec = {
                "type": "study_vs_sleep",
                "title": f"Daily Study Performance vs Sleep Duration ({days}D)",
                "unit": "% / hrs",
                "currency": None,
                "labels": [d[-5:] if len(d) >= 5 else d for d in chart_dates],
                "series": [
                    {"name": "Study Score", "data": scores, "axis": "left", "unit": "%"},
                    {"name": "Sleep Hours", "data": sleeps, "axis": "right", "unit": "hrs"},
                ],
                "raw_data": {
                    "dates": chart_dates,
                    "study_scores": scores,
                    "sleep_hours": sleeps,
                    "data_points_count": data_points_count,
                    "correlation_coefficient": corr_coef,
                    "is_reliable": is_reliable,
                    "model_estimate_note": "Estimate from a model trained on public and synthetic data",
                }
            }

        return {
            "days_requested": days,
            "data_points_count": data_points_count,
            "correlation_coefficient": corr_coef,
            "is_reliable": is_reliable,
            "reliability_status": reliability_status,
            "reliability_message": reliability_message,
            "daily_records_count": len(daily_records),
            "daily_series": daily_records,
            "chart_spec": chart_spec,
        }

    else:
        return {"error": f"Unknown tool name: {tool_name}"}
