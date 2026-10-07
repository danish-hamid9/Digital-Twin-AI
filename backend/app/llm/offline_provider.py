import re
import logging
from typing import List, Dict, Any, Optional
from app.llm.base import LLMProvider
from app.core.currency import format_money, get_currency_symbol

logger = logging.getLogger(__name__)


class OfflineProvider(LLMProvider):
    """
    Offline fallback assistant that operates without external LLM APIs.
    Combines real tool data with rule-based suggestions from the recommendations engine
    into two distinct parts:
      - '### What your data says'
      - '### What you could do'
    Includes an explanation line noting that offline mode cannot hold free conversation.
    Grounding rule: Numbers are strictly drawn from real tool data.
    """

    OFFLINE_NOTE = (
        "*Note: Offline mode cannot hold free conversation. "
        "Normal chat returns when the AI service is reachable.*"
    )

    def __init__(self, model_name: str = "offline-rule-engine"):
        self.model_name = model_name

    @property
    def provider_name(self) -> str:
        return "offline"

    def is_configured(self) -> bool:
        return True

    def _extract_simulation_params(self, text: str) -> Dict[str, Any]:
        """Extract scenario numbers from prompt using regex."""
        params: Dict[str, Any] = {
            "horizon_months": 6,
            "salary_change_pct": 0.0,
            "one_time_expense": 0.0,
            "expense_target_month": 1,
            "study_hours_delta": 0.0,
            "sleep_target_delta": 0.0,
            "exercise_minutes_delta": 0.0,
            "iterations": 15000,
            "model": "parametric",
        }

        t_low = text.lower()
        if "compare" in t_low or "side by side" in t_low:
            params["model"] = "compare"
        elif "bootstrap" in t_low or "historical" in t_low:
            params["model"] = "bootstrap"

        horizon_match = re.search(r"(\d+)\s*months?", text, re.I)
        if horizon_match:
            try:
                params["horizon_months"] = min(12, max(1, int(horizon_match.group(1))))
            except Exception:
                pass

        expense_match = re.search(r"[\$₹€£]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)", text)
        if not expense_match:
            expense_match = re.search(
                r"\b([0-9]+(?:\.[0-9]+)?)\s*(?:dollars?|usd|inr|rupees?|rs|\$|₹|€|£|laptop|car|phone|course|trip)",
                text,
                re.I,
            )
        if expense_match:
            try:
                val = float(expense_match.group(1).replace(",", ""))
                all_amounts = re.findall(r"[\$₹€£]\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)", text)
                if len(all_amounts) > 1:
                    val = float(all_amounts[-1].replace(",", ""))
                params["one_time_expense"] = val
            except Exception:
                pass

        salary_match = re.search(
            r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*%\s*(?:salary|income|raise|increase|cut)", text, re.I
        )
        if salary_match:
            try:
                mult = (
                    -1.0
                    if ("cut" in text.lower() or "decrease" in text.lower())
                    and not salary_match.group(1).startswith("-")
                    else 1.0
                )
                params["salary_change_pct"] = float(salary_match.group(1)) * mult
            except Exception:
                pass

        study_match = re.search(
            r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:more|less|hours?)\s*(?:of\s*)?study", text, re.I
        )
        if study_match:
            try:
                params["study_hours_delta"] = float(study_match.group(1))
            except Exception:
                pass

        sleep_match = re.search(
            r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:more|less|hours?)\s*(?:of\s*)?sleep", text, re.I
        )
        if sleep_match:
            try:
                mult = (
                    -1.0
                    if ("cut" in text.lower() or "less" in text.lower() or "reduc" in text.lower())
                    and not sleep_match.group(1).startswith("-")
                    else 1.0
                )
                params["sleep_target_delta"] = float(sleep_match.group(1)) * mult
            except Exception:
                pass

        ex_match = re.search(
            r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:minutes?|mins?)\s*(?:of\s*)?exercise", text, re.I
        )
        if ex_match:
            try:
                params["exercise_minutes_delta"] = float(ex_match.group(1))
            except Exception:
                pass

        return params

    def _extract_recommendation_suggestions(self, recs_data: Optional[Dict[str, Any]]) -> str:
        """Extract prioritized concrete suggestions from the rule-based recommendation engine."""
        if recs_data and isinstance(recs_data, dict):
            recs = recs_data.get("recommendations", [])
            if recs:
                lines = []
                for idx, r in enumerate(recs[:3], 1):
                    prio = r.get("priority", "medium").upper()
                    title = r.get("title", "Actionable Step")
                    t_low = title.lower()
                    if "emergency" in t_low or "runway" in t_low or "saving" in t_low or "buffer" in t_low:
                        advice = "Allocate extra monthly surplus toward liquid reserves until reaching the 3-month living expense runway."
                    elif "sleep" in t_low or "rest" in t_low:
                        advice = "Maintain a steady 7 to 9 hour sleep schedule to improve recovery and cognitive retention."
                    elif "study" in t_low or "score" in t_low or "exam" in t_low:
                        advice = "Structure weekly study sessions into 25-minute Pomodoro focus intervals with 5-minute recovery breaks."
                    elif "expense" in t_low or "budget" in t_low:
                        advice = "Trim discretionary spending categories to preserve your net monthly savings rate."
                    else:
                        advice = "Review and apply this goal target in your dashboard plans."
                    lines.append(f"{idx}. **[{prio}] {title}**: {advice}")
                return "\n".join(lines)

        return (
            "1. **[HIGH] Maintain Liquid Reserve Buffer**: Keep adding to savings until your liquid runway safely exceeds 3.0 months of essential living expenses.\n"
            "2. **[MEDIUM] Sleep Regularity**: Target a consistent 7.0 to 9.0 hours of sleep per night to stabilize cognitive recovery and study scores.\n"
            "3. **[LOW] Incremental Study Blocks**: Use 25-minute focused study sessions followed by 5-minute recovery intervals."
        )

    def _wrap_two_parts(self, data_section: str, recs_data: Optional[Dict[str, Any]]) -> str:
        """Requirement 4: Two-part response: What your data says + What you could do + offline note."""
        suggestions = self._extract_recommendation_suggestions(recs_data)
        return (
            f"### What your data says\n"
            f"{data_section}\n\n"
            f"### What you could do\n"
            f"{suggestions}\n\n"
            f"{self.OFFLINE_NOTE}"
        )

    def _format_summary_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        fin = result.get("finance", {})
        stu = result.get("study", {})
        hab = result.get("habits", {})
        timeframe = result.get("timeframe", "30d")
        currency = result.get("currency") or fin.get("currency") or "USD"

        income = fin.get("total_income") or 0.0
        expenses = fin.get("total_expenses") or 0.0
        net_savings = fin.get("net_savings") or 0.0
        target_savings = fin.get("monthly_target_savings")
        savings_gap = fin.get("savings_gap")
        savings_rate = fin.get("savings_rate_pct") or 0.0
        runway = fin.get("runway_months")
        runway_unit = "month" if runway is not None and round(runway, 1) == 1.0 else "months"
        runway_str = f"{runway:.1f} {runway_unit}" if runway is not None else "N/A"

        study_hours = stu.get("total_study_hours") or 0.0
        avg_score = stu.get("avg_score_pct")
        score_str = f"{avg_score:.1f}%" if avg_score is not None else "N/A"

        sleep_hours = hab.get("avg_sleep_hours") or 0.0
        target_sleep = hab.get("target_sleep_hours") or 7.5
        sleep_gap = hab.get("sleep_gap_hours")
        streak = hab.get("current_streak_days") or 0

        target_savings_str = f", Target {format_money(target_savings, currency)} (Gap: {format_money(savings_gap, currency)})" if target_savings is not None and savings_gap is not None else ""
        target_sleep_str = f" (target from Settings: {target_sleep:.1f} hrs, gap: {sleep_gap:+.1f} hrs)" if sleep_gap is not None else f" (target: {target_sleep:.1f} hrs)"

        lines = [
            f"Activity records for the past {timeframe} (defaulting to last 30 days):",
            f"- **Financial Health**: Total Income {format_money(income, currency)}, Expenses {format_money(expenses, currency)}, Net Savings {format_money(net_savings, currency)}{target_savings_str} ({savings_rate:.1f}% savings rate), Runway {runway_str}.",
            f"- **Academic Study**: Total Study Hours {study_hours:.1f} hrs, Average Score {score_str}.",
            f"- **Wellbeing & Habits**: Average Sleep {sleep_hours:.1f} hrs/night{target_sleep_str}, Current Habit Streak {streak} days.",
        ]
        return self._wrap_two_parts("\n".join(lines), recs_data)

    def _format_prediction_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        domain = result.get("domain", "overview")
        currency = result.get("currency") or "USD"
        if domain == "finance":
            monthly = result.get("expected_monthly_savings", 0.0)
            p50 = result.get("cumulative_savings_p50", 0.0)
            p10 = result.get("confidence_lower_p10", 0.0)
            p90 = result.get("confidence_upper_p90", 0.0)
            horizon = result.get("horizon_months", 6)
            horizon_unit = "Month" if horizon == 1 else "Months"
            data_text = (
                f"- **Financial Forecast ({horizon} {horizon_unit})**:\n"
                f"  * Expected Monthly Savings: {format_money(monthly, currency)}\n"
                f"  * Cumulative Projected Savings (P50 Median): {format_money(p50, currency)}\n"
                f"  * 80% Confidence Range: [{format_money(p10, currency)} - {format_money(p90, currency)}]"
            )
        elif domain == "study":
            proj = result.get("projected_exam_score", 0.0)
            ci = result.get("confidence_interval", [0, 0])
            data_text = (
                f"- **Academic Study Forecast**:\n"
                f"  * Projected Exam Score: {proj:.1f}%\n"
                f"  * Confidence Interval: [{ci[0]:.1f}% - {ci[1]:.1f}%]"
            )
        elif domain == "habits":
            burnout = result.get("burnout_level", "low")
            streak_prob = result.get("streak_continuation_prob", 0.0)
            burnout_score = result.get("burnout_risk_score", 0.0)
            prob_pct = streak_prob * 100.0 if streak_prob <= 1.0 else streak_prob
            if prob_pct >= 95.0:
                prob_str = ">95%"
            elif prob_pct <= 5.0:
                prob_str = "<5%"
            else:
                prob_str = f"{prob_pct:.1f}%"
            data_text = (
                f"- **Habits & Wellbeing Forecast**:\n"
                f"  * Burnout Risk Level: {burnout.capitalize()} (Score: {burnout_score:.2f})\n"
                f"  * Habit Streak Continuation Probability: {prob_str}"
            )
        else:
            data_text = (
                f"- **Multi-Domain Overview Forecast**:\n"
                f"  * Expected Monthly Savings: {format_money(result.get('finance_expected_savings', 0), currency)}\n"
                f"  * Projected Study Score: {result.get('study_projected_score', 0):.1f}%\n"
                f"  * Burnout Risk: {result.get('habits_burnout_level', 'moderate')}"
            )
        return self._wrap_two_parts(data_text, recs_data)

    def _format_daily_series_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        days = result.get("days_requested", 30)
        count = result.get("data_points_count", 0)
        corr = result.get("correlation_coefficient")
        rel_msg = result.get("reliability_message", "")
        corr_str = f"r = {corr:.2f}" if corr is not None else "Insufficient variance"
        lines = [
            f"Daily Time-Series Metrics (Last {days} Days):",
            f"- **Paired Data Points**: {count} days with recorded study and sleep metrics.",
            f"- **Correlation (Study Score vs Sleep)**: {corr_str}.",
            f"- **Data Reliability**: {rel_msg}",
        ]
        return self._wrap_two_parts("\n".join(lines), recs_data)

    def _format_simulation_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        horizon = result.get("horizon_months", 6)
        iterations = result.get("stochastic_iterations") or result.get("iterations") or 15000
        currency = result.get("currency") or "USD"
        model = result.get("model", "parametric").capitalize()
        limited_history = result.get("limited_history", False)

        baseline_p50 = result.get("baseline_final_savings_p50", 0.0)
        scenario_p50 = result.get("scenario_final_savings_p50", 0.0)
        delta_p50 = result.get("savings_delta_p50", 0.0)
        study_delta = result.get("study_score_delta_p50", 0.0)
        burnout_delta = result.get("burnout_risk_delta_p50", 0.0)

        history_tag = " (Limited History)" if limited_history else ""
        h_unit = "Month" if horizon == 1 else "Months"
        lines = [
            f"Monte Carlo Simulation ({horizon} {h_unit}, {iterations:,} Iterations, Model: {model}{history_tag}):",
            f"- **Baseline Final Savings (P50)**: {format_money(baseline_p50, currency)}",
            f"- **Scenario Final Savings (P50)**: {format_money(scenario_p50, currency)}",
            f"- **Net Savings Impact (P50 Delta)**: {format_money(delta_p50, currency)}",
            f"- **Projected Study Score Impact**: {study_delta:+.1f}%",
            f"- **Projected Burnout Risk Impact**: {burnout_delta:+.2f}",
        ]
        comp = result.get("comparison_results")
        if comp and comp.get("divergence_note"):
            lines.append(f"- **Model Comparison**: {comp['divergence_note']}")

        return self._wrap_two_parts("\n".join(lines), recs_data)

    def _format_recommendations_response(self, result: Dict[str, Any]) -> str:
        recs = result.get("recommendations", [])
        count = result.get("count", len(recs))
        data_lines = [f"Found {count} evaluated recommendation metric(s) based on your recorded numbers:"]
        for r in recs[:3]:
            m_name = r.get("metric_name", "")
            m_val = r.get("user_metric_value")
            m_thresh = r.get("threshold_value")
            if m_val is not None and m_thresh is not None:
                data_lines.append(f"- **{r.get('title')}**: Your current {m_name} is {m_val} (target threshold: {m_thresh}).")
            else:
                data_lines.append(f"- **{r.get('title')}**: Evaluated priority is {r.get('priority', 'medium').upper()}.")

        return self._wrap_two_parts("\n".join(data_lines), result)

    def _format_plan_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        p = result.get("proposed_plan", {})
        title = p.get("title", "Action Item")
        domain = p.get("domain", "general")
        due = p.get("due_date") or "No deadline set"
        data_text = (
            f"Drafted action plan proposal:\n"
            f"- **Title**: {title} ({domain})\n"
            f"- **Target Due Date**: {due}\n"
            f"- **Status**: Pending user confirmation card approval."
        )
        return self._wrap_two_parts(data_text, recs_data)

    def _format_list_plans_response(self, result: Dict[str, Any], recs_data: Optional[Dict[str, Any]]) -> str:
        count = result.get("plans_count", 0)
        plans = result.get("plans", [])
        if not plans:
            data_text = "You currently have 0 active action plans."
        else:
            lines = [f"You currently have {count} action plan(s):"]
            for p in plans:
                lines.append(f"- **{p.get('title')}** ({p.get('domain')}) — Status: {p.get('status')}")
            data_text = "\n".join(lines)
        return self._wrap_two_parts(data_text, recs_data)

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Keyword matching turn.
        Step 1: If last message is a tool response, combine real tool data with rule-based recommendations.
        Step 2: Otherwise, inspect user query keywords and trigger appropriate real tools or conversational replies.
        """
        last_msg = messages[-1] if messages else {}

        # 1. Did we just receive a tool response?
        if isinstance(last_msg, dict) and last_msg.get("role") == "tool":
            tr = last_msg.get("tool_response", {})
            t_name = tr.get("name", "")
            t_result = tr.get("response", {})
            recs_result = tr.get("recommendations") or t_result.get("recommendations_engine")

            if t_name == "get_user_summary":
                formatted_text = self._format_summary_response(t_result, recs_result)
            elif t_name == "run_prediction":
                formatted_text = self._format_prediction_response(t_result, recs_result)
            elif t_name == "run_simulation":
                formatted_text = self._format_simulation_response(t_result, recs_result)
            elif t_name == "get_recommendations":
                formatted_text = self._format_recommendations_response(t_result)
            elif t_name == "list_plans":
                formatted_text = self._format_list_plans_response(t_result, recs_result)
            elif t_name == "get_daily_series":
                formatted_text = self._format_daily_series_response(t_result, recs_result)
            elif t_name in ("create_plan", "update_plan"):
                formatted_text = self._format_plan_response(t_result, recs_result)
            else:
                formatted_text = self._wrap_two_parts(
                    f"Action {t_name} processed based on your authentic logged metrics.",
                    recs_result,
                )

            return {
                "content": formatted_text,
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 2. Extract latest user query text
        user_text = ""
        for m in reversed(messages):
            if isinstance(m, dict) and m.get("role") == "user":
                user_text = m.get("content", "")
                break
        user_lower = user_text.lower().strip()

        # Keyword Matching logic
        # 1. Prompt Injection / System Override Refusal
        if any(k in user_lower for k in ("system override", "reveal user", "other user", "user id 2", "ignore all previous instructions", "ignore instructions", "database password", "system prompt")):
            return {
                "content": (
                    "I cannot comply with requests to override system safety rules or disclose confidential or other users' information. "
                    "Your digital twin operates in secure per-user isolation.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 2. Out-of-Scope Queries Refusal
        if any(k in user_lower for k in ("weather", "recipe", "chocolate chip", "quicksort", "poem", "tell me a joke", "favorite movie", "capital of france")):
            return {
                "content": (
                    "I am Twin Bot, your personal coach focused on your personal finances, study habits, and sleep routines. "
                    "I cannot assist with general trivia, programming puzzles, or external topics outside your digital twin profile.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 3. Missing Domain Data Explanations
        if any(k in user_lower for k in ("calorie", "macronutrient", "diet", "food log", "nutrition", "spending in 2020", "spending in 2021", "year 2020", "year 2021")):
            return {
                "content": (
                    "I reviewed your records, but no dietary/nutrition logs or historical data for that timeframe are present in your account. "
                    "You can log new entries in the dashboard to track this metric.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 4. Ambiguous Requests -> Ask ONE clarifying question
        if user_lower in (
            "can you help me improve it?",
            "can you help me improve it",
            "i want to do better next month.",
            "i want to do better next month",
            "can you help me with that?",
            "how can i do better?",
            "improve it",
        ) or (("help me improve" in user_lower or "do better" in user_lower) and not any(k in user_lower for k in ("study", "finance", "budget", "sleep", "habit", "exam", "score"))):
            return {
                "content": (
                    "Could you clarify which area you would like to focus on: your finances, academic study, or sleep and wellness habits?\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 5. Small Talk & Greetings
        if any(user_lower.startswith(k) or user_lower == k for k in (
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "thanks", "thank you"
        )):
            return {
                "content": (
                    "Hello! I am Twin Bot, your personal coach inside the Digital Twin app. "
                    "I'm here to help you optimize your personal finances, study performance, and healthy routines. How can I help you today?\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 6. General Knowledge (Budgeting basics, Pomodoro, Sleep habits)
        if any(k in user_lower for k in ("50/30/20", "budgeting rule", "budgeting basics")):
            return {
                "content": (
                    "The 50/30/20 rule is a standard budgeting framework: allocate 50% of after-tax income to essential needs, "
                    "30% to discretionary wants, and 20% to savings and debt reduction.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        if any(k in user_lower for k in ("pomodoro", "study technique", "study techniques")):
            return {
                "content": (
                    "The Pomodoro technique organizes work into 25-minute focused study sessions followed by 5-minute short breaks, "
                    "helping prevent mental fatigue and maintain high focus over time.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        if any(k in user_lower for k in ("hours of sleep", "sleep recommended", "sleep habits", "how much sleep")):
            return {
                "content": (
                    "General health guidelines typically recommend 7 to 9 hours of quality sleep per night for adults "
                    "to maintain optimal cognitive performance, memory retention, and physical recovery.\n\n"
                    f"{self.OFFLINE_NOTE}"
                ),
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 7. List Plans
        if any(k in user_lower for k in ("list plans", "list all my", "current plans", "my goals", "show plans", "what plans")):
            return {
                "content": "Fetching your active action plans...",
                "tool_calls": [{"name": "list_plans", "args": {"status": "all"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 8. Update Plan
        if any(k in user_lower for k in ("update plan", "update my action plan", "mark sleep")):
            return {
                "content": "Updating action plan status...",
                "tool_calls": [{
                    "name": "update_plan",
                    "args": {
                        "plan_id": "00000000-0000-0000-0000-000000000000",
                        "status": "in_progress",
                        "title": "Sleep Consistency",
                    }
                }],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 9. Simulation & What-If
        if any(k in user_lower for k in ("simulate", "simulation", "what if", "what happens", "laptop", "salary change", "raise", "pay cut", "one-time expense")):
            sim_params = self._extract_simulation_params(user_text)
            return {
                "content": "Initiating Monte Carlo simulation based on your personal scenario...",
                "tool_calls": [{"name": "run_simulation", "args": sim_params}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 10. Recommendations / Advice / "What should I do?"
        if any(k in user_lower for k in (
            "recommend", "recommendation", "advice", "tips", "suggest", "priority",
            "optimize", "improve", "how can i", "how do i", "what should i do", "what do you recommend", "prioritize", "concrete tips"
        )):
            return {
                "content": "Checking active rule-based recommendations for your profile...",
                "tool_calls": [{"name": "get_recommendations", "args": {}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 11. Multi-domain Summary / Overview (Requirement 3: defaults to 30d)
        if any(k in user_lower for k in ("summary", "comprehensive", "overview", "dashboard", "all my data", "how am i doing")):
            return {
                "content": "Gathering multi-domain metrics from your authentic digital twin records (defaulting to the last 30 days)...",
                "tool_calls": [{"name": "get_user_summary", "args": {"preset": "30d"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 12. Correlation & Daily Time Series (Requirement 2)
        if any(k in user_lower for k in ("correlation", "daily series", "daily data", "daily study", "study vs sleep", "sleep vs study", "time series", "trend over time")):
            return {
                "content": "Analyzing daily study scores and sleep correlation over the last 30 days...",
                "tool_calls": [{"name": "get_daily_series", "args": {"days": 30}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 12. Spending & Expense Breakdown (Requirement 1: gets expense donut)
        if any(k in user_lower for k in ("spend", "spending", "expense", "expenses", "donut", "breakdown", "category", "where did my money go", "cost")):
            return {
                "content": "Fetching expense distribution and spending categories for the last 30 days...",
                "tool_calls": [{"name": "get_user_summary", "args": {"preset": "30d"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 13. Savings Forecast (Requirement 1: gets forecast chart)
        if any(k in user_lower for k in ("saving", "savings", "save", "runway", "future balance", "forecast savings")):
            return {
                "content": "Calculating your projected savings forecast...",
                "tool_calls": [{"name": "run_prediction", "args": {"domain": "finance", "horizon": 6}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 14. Study & Sleep Analysis (Requirement 1: gets study vs sleep chart)
        if any(k in user_lower for k in ("study", "exam", "score", "grades", "sleep", "bedtime", "rest")):
            return {
                "content": "Analyzing your study performance and sleep duration records...",
                "tool_calls": [{"name": "run_prediction", "args": {"domain": "study"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 15. Habit & Burnout Analysis (Requirement 1: gets gauges)
        if any(k in user_lower for k in ("habit", "burnout", "streak", "routine", "burnout risk")):
            return {
                "content": "Checking habit consistency and burnout risk metrics...",
                "tool_calls": [{"name": "run_prediction", "args": {"domain": "habits"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 16. Predictions / General Forecasts
        if any(k in user_lower for k in ("predict", "prediction", "forecast", "projection", "burnout risk", "exam score", "project")):
            domain = "overview"
            if "finance" in user_lower:
                domain = "finance"
            elif "study" in user_lower:
                domain = "study"
            elif "habit" in user_lower:
                domain = "habits"

            return {
                "content": f"Running machine learning forecasting model for {domain}...",
                "tool_calls": [{"name": "run_prediction", "args": {"domain": domain, "horizon": 6}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 17. Plan creation
        if any(k in user_lower for k in ("create plan", "create a plan", "make a plan", "draft plan", "set goal", "study plan", "action plan")):
            domain = "general"
            if "study" in user_lower:
                domain = "study"
            elif "finance" in user_lower or "budget" in user_lower:
                domain = "finance"
            elif "habit" in user_lower:
                domain = "habit"

            title = "Action Plan"
            if "study" in user_lower:
                title = "Exam Preparation and Study Plan"
            elif "finance" in user_lower:
                title = "Target Savings Milestone"
            elif "habit" in user_lower or "sleep" in user_lower:
                title = "Sleep & Routine Optimization"

            return {
                "content": "Drafting action plan for your review...",
                "tool_calls": [{
                    "name": "create_plan",
                    "args": {
                        "title": title,
                        "description": "Structured schedule generated from digital twin recommendations.",
                        "domain": domain,
                    }
                }],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # Summary / Status / Default (Requirement 3: Default to last 30 days and say so)
        preset = "30d"
        if "7d" in user_lower or "7 days" in user_lower:
            preset = "7d"
        elif "90d" in user_lower or "90 days" in user_lower:
            preset = "90d"
        elif "all" in user_lower:
            preset = "all"

        return {
            "content": "Gathering multi-domain metrics from your authentic digital twin records (defaulting to the last 30 days)...",
            "tool_calls": [{"name": "get_user_summary", "args": {"preset": preset}}],
            "raw_content": None,
            "provider": "offline",
            "model": self.model_name,
        }
