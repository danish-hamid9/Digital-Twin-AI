import datetime as dt
from typing import Optional, List, Tuple, Dict, Any, Set
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, Profile
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.schemas.dashboard import (
    DateRangeInfo,
    CashFlowDataPoint,
    CategoryDistribution,
    SavingsGoalSummary,
    FinanceAnalytics,
    StudyTrendPoint,
    SubjectBreakdown,
    StudyAnalytics,
    HabitTrendPoint,
    SleepMoodCorrelation,
    SleepBucket,
    HabitAnalytics,
    DashboardOverviewResponse,
)

router = APIRouter()

def resolve_date_bounds(
    preset: Optional[str],
    start_date: Optional[dt.date],
    end_date: Optional[dt.date],
) -> Tuple[Optional[dt.date], Optional[dt.date], str]:
    today = dt.date.today()
    if preset == "7d":
        return today - dt.timedelta(days=7), today, "7d"
    elif preset == "30d" or (preset is None and start_date is None and end_date is None):
        return today - dt.timedelta(days=30), today, "30d"
    elif preset == "90d":
        return today - dt.timedelta(days=90), today, "90d"
    elif preset == "all":
        return None, None, "all"
    else:
        s = start_date or (today - dt.timedelta(days=30))
        e = end_date or today
        return s, e, "custom"


async def compute_finance_analytics(
    db: AsyncSession,
    user: User,
    start_date: Optional[dt.date],
    end_date: Optional[dt.date],
) -> FinanceAnalytics:
    filters = [FinanceEntry.user_id == user.id]
    if start_date:
        filters.append(FinanceEntry.date >= start_date)
    if end_date:
        filters.append(FinanceEntry.date <= end_date)

    query = select(FinanceEntry).where(and_(*filters)).order_by(FinanceEntry.date.asc())
    result = await db.execute(query)
    entries: List[Any] = list(result.scalars().all())

    total_income = sum(float(e.amount) for e in entries if e.type == "income")
    total_expenses = sum(float(e.amount) for e in entries if e.type == "expense")
    net_savings = total_income - total_expenses
    savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

    # Currency
    currency = "USD"
    if user.profile and user.profile.currency:
        currency = str(user.profile.currency)

    # Category breakdown (expenses)
    cat_map: Dict[str, Dict[str, Any]] = {}
    for e in entries:
        if e.type == "expense":
            cat_key = str(e.category)
            if cat_key not in cat_map:
                cat_map[cat_key] = {"amount": 0.0, "count": 0}
            cat_map[cat_key]["amount"] = float(cat_map[cat_key]["amount"]) + float(e.amount)
            cat_map[cat_key]["count"] = int(cat_map[cat_key]["count"]) + 1

    category_dist: List[CategoryDistribution] = []
    for cat, data in sorted(cat_map.items(), key=lambda x: float(x[1]["amount"]), reverse=True):
        cat_amount = float(data["amount"])
        pct = round((cat_amount / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        category_dist.append(
            CategoryDistribution(
                category=cat,
                amount=round(cat_amount, 2),
                percentage=pct,
                count=int(data["count"]),
            )
        )

    # Cash flow trend grouped by date
    daily_cash_flow: Dict[str, Dict[str, float]] = {}
    for e in entries:
        d_str = e.date.isoformat()
        if d_str not in daily_cash_flow:
            daily_cash_flow[d_str] = {"income": 0.0, "expenses": 0.0}
        if e.type == "income":
            daily_cash_flow[d_str]["income"] += float(e.amount)
        else:
            daily_cash_flow[d_str]["expenses"] += float(e.amount)

    cash_flow_trend: List[CashFlowDataPoint] = [
        CashFlowDataPoint(
            date=d_str,
            income=round(data["income"], 2),
            expenses=round(data["expenses"], 2),
            net_savings=round(data["income"] - data["expenses"], 2),
        )
        for d_str, data in sorted(daily_cash_flow.items())
    ]

    # Savings Runway (Months)
    runway_months: Optional[float] = None
    if start_date and end_date and total_expenses > 0:
        days_span = max(1, (end_date - start_date).days)
        monthly_burn = total_expenses / (days_span / 30.0)
        if monthly_burn > 0:
            runway_months = round(max(0.0, net_savings) / monthly_burn, 1)

    # Savings Goals
    goals_query = select(SavingsGoal).where(SavingsGoal.user_id == user.id)
    goals_result = await db.execute(goals_query)
    savings_goals: List[Any] = list(goals_result.scalars().all())

    goals_summary: List[SavingsGoalSummary] = []
    for g in savings_goals:
        t_amt = float(g.target_amount)
        c_amt = float(g.current_amount)
        prog_pct = round(min(100.0, (c_amt / t_amt * 100)), 1) if t_amt > 0 else 0.0
        goals_summary.append(
            SavingsGoalSummary(
                id=str(g.id),
                title=str(g.title),
                target_amount=t_amt,
                current_amount=c_amt,
                progress_pct=prog_pct,
            )
        )

    return FinanceAnalytics(
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_savings=round(net_savings, 2),
        savings_rate=savings_rate,
        currency=currency,
        entries_count=len(entries),
        runway_months=runway_months,
        cash_flow_trend=cash_flow_trend,
        category_distribution=category_dist,
        goals=goals_summary,
    )


async def compute_study_analytics(
    db: AsyncSession,
    user: User,
    start_date: Optional[dt.date],
    end_date: Optional[dt.date],
) -> StudyAnalytics:
    filters = [StudySession.user_id == user.id]
    if start_date:
        filters.append(StudySession.date >= start_date)
    if end_date:
        filters.append(StudySession.date <= end_date)

    query = select(StudySession).where(and_(*filters)).order_by(StudySession.date.asc())
    result = await db.execute(query)
    sessions: List[Any] = list(result.scalars().all())

    total_study_hours = sum(float(s.hours) for s in sessions)
    sessions_count = len(sessions)

    # Calculate active days or period days
    if start_date and end_date:
        period_days = max(1, (end_date - start_date).days + 1)
    else:
        unique_dates = {s.date for s in sessions}
        period_days = max(1, len(unique_dates))

    avg_daily_hours = round(total_study_hours / period_days, 1)

    # Target weekly hours
    target_weekly_hours = (
        float(user.profile.target_study_hours_week)
        if (user.profile and user.profile.target_study_hours_week is not None)
        else 15.0
    )

    # Past 7 days progress
    seven_days_ago = dt.date.today() - dt.timedelta(days=7)
    recent_hours = sum(float(s.hours) for s in sessions if s.date >= seven_days_ago)
    weekly_progress_pct = (
        round(min(150.0, (recent_hours / target_weekly_hours * 100)), 1)
        if target_weekly_hours > 0
        else 0.0
    )

    # Scores
    scored_sessions: List[float] = [float(s.score) for s in sessions if s.score is not None]
    avg_score = round(sum(scored_sessions) / len(scored_sessions), 1) if scored_sessions else None

    # Subject breakdown
    subject_map: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        sub_name = str(s.subject)
        if sub_name not in subject_map:
            subject_map[sub_name] = {"hours": 0.0, "scores": [], "count": 0}
        subject_map[sub_name]["hours"] = float(subject_map[sub_name]["hours"]) + float(s.hours)
        subject_map[sub_name]["count"] = int(subject_map[sub_name]["count"]) + 1
        if s.score is not None:
            subject_map[sub_name]["scores"].append(float(s.score))

    subject_breakdown: List[SubjectBreakdown] = []
    for sub, data in sorted(subject_map.items(), key=lambda x: float(x[1]["hours"]), reverse=True):
        sub_hours = float(data["hours"])
        pct = round((sub_hours / total_study_hours * 100), 1) if total_study_hours > 0 else 0.0
        scs: List[float] = data["scores"]
        sub_avg_score = round(sum(scs) / len(scs), 1) if scs else None
        subject_breakdown.append(
            SubjectBreakdown(
                subject=sub,
                hours=round(sub_hours, 1),
                percentage=pct,
                sessions_count=int(data["count"]),
                avg_score=sub_avg_score,
            )
        )

    top_subject = subject_breakdown[0].subject if subject_breakdown else None

    # Study trend
    daily_study: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        d_str = s.date.isoformat()
        if d_str not in daily_study:
            daily_study[d_str] = {"hours": 0.0, "scores": [], "subjects": set()}
        daily_study[d_str]["hours"] = float(daily_study[d_str]["hours"]) + float(s.hours)
        daily_study[d_str]["subjects"].add(str(s.subject))
        if s.score is not None:
            daily_study[d_str]["scores"].append(float(s.score))

    study_trend: List[StudyTrendPoint] = []
    for d_str, data in sorted(daily_study.items()):
        d_hours = float(data["hours"])
        scores_list: List[float] = data["scores"]
        subjects_set: Set[str] = data["subjects"]
        score_val = round(sum(scores_list) / len(scores_list), 1) if scores_list else None
        study_trend.append(
            StudyTrendPoint(
                date=d_str,
                hours=round(d_hours, 1),
                score=score_val,
                subject=", ".join(sorted(subjects_set)),
            )
        )

    return StudyAnalytics(
        total_study_hours=round(total_study_hours, 1),
        avg_daily_hours=avg_daily_hours,
        target_weekly_hours=target_weekly_hours,
        weekly_progress_pct=weekly_progress_pct,
        avg_score=avg_score,
        sessions_count=sessions_count,
        top_subject=top_subject,
        subject_breakdown=subject_breakdown,
        study_trend=study_trend,
    )


async def compute_habit_analytics(
    db: AsyncSession,
    user: User,
    start_date: Optional[dt.date],
    end_date: Optional[dt.date],
) -> HabitAnalytics:
    filters = [HabitLog.user_id == user.id]
    if start_date:
        filters.append(HabitLog.date >= start_date)
    if end_date:
        filters.append(HabitLog.date <= end_date)

    query = select(HabitLog).where(and_(*filters)).order_by(HabitLog.date.asc())
    result = await db.execute(query)
    logs: List[Any] = list(result.scalars().all())

    logs_count = len(logs)
    target_sleep = (
        float(user.profile.target_sleep_hours)
        if (user.profile and user.profile.target_sleep_hours is not None)
        else 8.0
    )

    if logs_count == 0:
        return HabitAnalytics(
            avg_sleep_hours=0.0,
            target_sleep_hours=target_sleep,
            sleep_variance=0.0,
            avg_exercise_minutes=0.0,
            avg_mood=0.0,
            habit_completion_rate=0.0,
            current_streak=0,
            longest_streak=0,
            logs_count=0,
            habits_trend=[],
            sleep_vs_mood=[],
            sleep_buckets=[],
        )

    avg_sleep = round(sum(float(l.sleep_hours) for l in logs) / logs_count, 1)
    sleep_var = round(avg_sleep - target_sleep, 1)
    avg_exercise = round(sum(float(l.exercise_minutes) for l in logs) / logs_count, 0)
    avg_mood = round(sum(float(l.mood) for l in logs) / logs_count, 1)
    done_count = sum(1 for l in logs if bool(l.done))
    completion_rate = round((float(done_count) / logs_count * 100), 1)

    # Streaks calculation
    # Group by date: day completed if at least one habit done
    date_done_map: Dict[dt.date, bool] = {}
    for l in logs:
        l_date: dt.date = l.date
        if l_date not in date_done_map:
            date_done_map[l_date] = False
        if bool(l.done):
            date_done_map[l_date] = True

    sorted_dates = sorted(date_done_map.keys())
    longest_streak = 0
    temp_streak = 0
    for i, d in enumerate(sorted_dates):
        if date_done_map[d]:
            if i > 0 and (d - sorted_dates[i - 1]).days == 1 and date_done_map[sorted_dates[i - 1]]:
                temp_streak += 1
            else:
                temp_streak = 1
            if temp_streak > longest_streak:
                longest_streak = temp_streak
        else:
            temp_streak = 0

    # Current streak ending today or yesterday
    current_streak = 0
    check_date = dt.date.today()
    if check_date not in date_done_map or not date_done_map[check_date]:
        check_date = dt.date.today() - dt.timedelta(days=1)

    while check_date in date_done_map and date_done_map[check_date]:
        current_streak += 1
        check_date -= dt.timedelta(days=1)

    # Trend points
    habits_trend: List[HabitTrendPoint] = [
        HabitTrendPoint(
            date=l.date.isoformat(),
            habit=str(l.habit),
            done=bool(l.done),
            sleep_hours=round(float(l.sleep_hours), 1),
            exercise_minutes=int(l.exercise_minutes),
            mood=int(l.mood),
        )
        for l in logs
    ]

    # Sleep vs Mood correlation
    sleep_vs_mood: List[SleepMoodCorrelation] = [
        SleepMoodCorrelation(
            date=l.date.isoformat(),
            sleep_hours=round(float(l.sleep_hours), 1),
            mood=int(l.mood),
            exercise_minutes=int(l.exercise_minutes),
        )
        for l in logs
    ]

    # Sleep buckets (<6h, 6-7h, 7-8h, 8h+)
    buckets_data: Dict[str, Dict[str, Any]] = {
        "< 6h": {"moods": [], "count": 0},
        "6h - 7h": {"moods": [], "count": 0},
        "7h - 8h": {"moods": [], "count": 0},
        "8h+": {"moods": [], "count": 0},
    }
    for l in logs:
        s_val = float(l.sleep_hours)
        if s_val < 6.0:
            b = "< 6h"
        elif s_val < 7.0:
            b = "6h - 7h"
        elif s_val < 8.0:
            b = "7h - 8h"
        else:
            b = "8h+"
        cast_moods: List[float] = buckets_data[b]["moods"]
        cast_moods.append(float(l.mood))
        buckets_data[b]["count"] = int(buckets_data[b]["count"]) + 1

    sleep_buckets: List[SleepBucket] = [
        SleepBucket(
            range_label=label,
            avg_mood=round(sum(b_data["moods"]) / len(b_data["moods"]), 1) if b_data["moods"] else 0.0,
            count=int(b_data["count"]),
        )
        for label, b_data in buckets_data.items()
    ]

    return HabitAnalytics(
        avg_sleep_hours=avg_sleep,
        target_sleep_hours=target_sleep,
        sleep_variance=sleep_var,
        avg_exercise_minutes=avg_exercise,
        avg_mood=avg_mood,
        habit_completion_rate=completion_rate,
        current_streak=current_streak,
        longest_streak=longest_streak,
        logs_count=logs_count,
        habits_trend=habits_trend,
        sleep_vs_mood=sleep_vs_mood,
        sleep_buckets=sleep_buckets,
    )


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------

@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    preset: Optional[str] = Query(default="30d", description="7d, 30d, 90d, all, or custom"),
    start_date: Optional[dt.date] = Query(default=None),
    end_date: Optional[dt.date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s_date, e_date, resolved_preset = resolve_date_bounds(preset, start_date, end_date)

    finance_analytics = await compute_finance_analytics(db, current_user, s_date, e_date)
    study_analytics = await compute_study_analytics(db, current_user, s_date, e_date)
    habit_analytics = await compute_habit_analytics(db, current_user, s_date, e_date)

    date_info = DateRangeInfo(
        preset=resolved_preset,
        start_date=s_date.isoformat() if s_date else None,
        end_date=e_date.isoformat() if e_date else None,
    )

    return DashboardOverviewResponse(
        date_range=date_info,
        finance=finance_analytics,
        study=study_analytics,
        habits=habit_analytics,
    )


@router.get("/finance", response_model=FinanceAnalytics)
async def get_dashboard_finance(
    preset: Optional[str] = Query(default="30d"),
    start_date: Optional[dt.date] = Query(default=None),
    end_date: Optional[dt.date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s_date, e_date, _ = resolve_date_bounds(preset, start_date, end_date)
    return await compute_finance_analytics(db, current_user, s_date, e_date)


@router.get("/study", response_model=StudyAnalytics)
async def get_dashboard_study(
    preset: Optional[str] = Query(default="30d"),
    start_date: Optional[dt.date] = Query(default=None),
    end_date: Optional[dt.date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s_date, e_date, _ = resolve_date_bounds(preset, start_date, end_date)
    return await compute_study_analytics(db, current_user, s_date, e_date)


@router.get("/habits", response_model=HabitAnalytics)
async def get_dashboard_habits(
    preset: Optional[str] = Query(default="30d"),
    start_date: Optional[dt.date] = Query(default=None),
    end_date: Optional[dt.date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s_date, e_date, _ = resolve_date_bounds(preset, start_date, end_date)
    return await compute_habit_analytics(db, current_user, s_date, e_date)
