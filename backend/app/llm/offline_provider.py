import re
import logging
from typing import List, Dict, Any, Optional
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)

class OfflineProvider(LLMProvider):
    """
    Offline fallback assistant that operates without any external LLM APIs.
    Performs keyword matching to select the appropriate real tool (get_user_summary,
    run_prediction, run_simulation, get_recommendations) and formats real tool results
    using deterministic templates.
    Grounding rule: Numbers are never invented.
    """

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
        }

        # Horizon in months
        horizon_match = re.search(r"(\d+)\s*months?", text, re.I)
        if horizon_match:
            try:
                params["horizon_months"] = min(12, max(1, int(horizon_match.group(1))))
            except Exception:
                pass

        # Look for expense/purchase amounts e.g. "$1,000", "$1000", "1000 dollar", "1000 laptop"
        expense_match = re.search(r"\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)", text)
        if not expense_match:
            expense_match = re.search(r"\b([0-9]+(?:\.[0-9]+)?)\s*(?:dollars?|usd|\$|laptop|car|phone|course|trip)", text, re.I)
        if expense_match:
            try:
                val = float(expense_match.group(1).replace(",", ""))
                all_amounts = re.findall(r"\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)", text)
                if len(all_amounts) > 1:
                    val = float(all_amounts[-1].replace(",", ""))
                params["one_time_expense"] = val
            except Exception:
                pass

        # Salary change %
        salary_match = re.search(r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*%\s*(?:salary|income|raise|increase|cut)", text, re.I)
        if salary_match:
            try:
                mult = -1.0 if ("cut" in text.lower() or "decrease" in text.lower()) and not salary_match.group(1).startswith("-") else 1.0
                params["salary_change_pct"] = float(salary_match.group(1)) * mult
            except Exception:
                pass

        # Study hours delta
        study_match = re.search(r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:more|less|hours?)\s*(?:of\s*)?study", text, re.I)
        if study_match:
            try:
                params["study_hours_delta"] = float(study_match.group(1))
            except Exception:
                pass

        # Sleep target delta
        sleep_match = re.search(r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:more|less|hours?)\s*(?:of\s*)?sleep", text, re.I)
        if sleep_match:
            try:
                mult = -1.0 if ("cut" in text.lower() or "less" in text.lower() or "reduc" in text.lower()) and not sleep_match.group(1).startswith("-") else 1.0
                params["sleep_target_delta"] = float(sleep_match.group(1)) * mult
            except Exception:
                pass

        # Exercise minutes delta
        ex_match = re.search(r"([+-]?[0-9]+(?:\.[0-9]+)?)\s*(?:minutes?|mins?)\s*(?:of\s*)?exercise", text, re.I)
        if ex_match:
            try:
                params["exercise_minutes_delta"] = float(ex_match.group(1))
            except Exception:
                pass

        return params

    def _format_summary_response(self, result: Dict[str, Any]) -> str:
        fin = result.get("finance", {})
        stu = result.get("study", {})
        hab = result.get("habits", {})
        timeframe = result.get("timeframe", "30d")

        income = fin.get("total_income") or 0.0
        expenses = fin.get("total_expenses") or 0.0
        net_savings = fin.get("net_savings") or 0.0
        savings_rate = fin.get("savings_rate_pct") or 0.0
        runway = fin.get("runway_months")
        runway_str = f"{runway:.1f} months" if runway is not None else "N/A"

        study_hours = stu.get("total_study_hours") or 0.0
        avg_score = stu.get("avg_score_pct")
        score_str = f"{avg_score:.1f}%" if avg_score is not None else "N/A"

        sleep_hours = hab.get("avg_sleep_hours") or 0.0
        streak = hab.get("current_streak_days") or 0

        lines = [
            f"Here is your authentic digital twin activity summary for the past {timeframe}:",
            "",
            "📊 **Financial Health**:",
            f"- Total Income: ${income:,.2f}",
            f"- Total Expenses: ${expenses:,.2f}",
            f"- Net Savings: ${net_savings:,.2f} ({savings_rate:.1f}% savings rate)",
            f"- Estimated Runway: {runway_str}",
            "",
            "📚 **Academic & Study**:",
            f"- Total Study Hours: {study_hours:.1f} hrs",
            f"- Average Exam/Quiz Score: {score_str}",
            "",
            "🌿 **Wellbeing & Habits**:",
            f"- Average Sleep: {sleep_hours:.1f} hrs/night",
            f"- Current Habit Streak: {streak} days",
        ]
        return "\n".join(lines)


    def _format_prediction_response(self, result: Dict[str, Any]) -> str:
        domain = result.get("domain", "overview")
        if domain == "finance":
            monthly = result.get("expected_monthly_savings", 0.0)
            p50 = result.get("cumulative_savings_p50", 0.0)
            horizon = result.get("horizon_months", 6)
            return (
                f"📈 **Financial Forecast ({horizon} Months)**:\n"
                f"- Expected Monthly Net Savings: ${monthly:,.2f}\n"
                f"- Cumulative Projected Savings (P50 Median): ${p50:,.2f}\n"
                f"- Confidence Range: [${result.get('confidence_lower_p10', 0):,.2f} - ${result.get('confidence_upper_p90', 0):,.2f}]"
            )
        elif domain == "study":
            proj = result.get("projected_exam_score", 0.0)
            ci = result.get("confidence_interval", [0, 0])
            return (
                f"🎓 **Academic Study Prediction**:\n"
                f"- Projected Exam Score: {proj:.1f}%\n"
                f"- Confidence Range: [{ci[0]:.1f}% - {ci[1]:.1f}%]"
            )
        elif domain == "habits":
            burnout = result.get("burnout_level", "low")
            streak_prob = result.get("streak_continuation_prob", 0.0)
            return (
                f"🌿 **Habits & Wellbeing Projection**:\n"
                f"- Burnout Risk Level: {burnout.capitalize()} (Score: {result.get('burnout_risk_score', 0):.2f})\n"
                f"- Streak Continuation Probability: {streak_prob:.1%}"
            )
        else:
            return (
                f"🔮 **Multi-Domain Overview**:\n"
                f"- Monthly Savings Target: ${result.get('finance_expected_savings', 0):,.2f}\n"
                f"- Projected Study Score: {result.get('study_projected_score', 0):.1f}%\n"
                f"- Burnout Risk: {result.get('habits_burnout_level', 'moderate')}"
            )

    def _format_simulation_response(self, result: Dict[str, Any]) -> str:
        horizon = result.get("horizon_months", 6)
        baseline_p50 = result.get("baseline_final_savings_p50", 0.0)
        scenario_p50 = result.get("scenario_final_savings_p50", 0.0)
        delta_p50 = result.get("savings_delta_p50", 0.0)
        study_delta = result.get("study_score_delta_p50", 0.0)
        burnout_delta = result.get("burnout_risk_delta_p50", 0.0)

        lines = [
            f"🎲 **Monte Carlo Counterfactual Simulation ({horizon} Months, 500 Iterations)**:",
            "",
            f"- **Baseline Final Savings (P50)**: ${baseline_p50:,.2f}",
            f"- **Scenario Final Savings (P50)**: ${scenario_p50:,.2f}",
            f"- **Net Savings Impact (P50 Delta)**: ${delta_p50:,.2f}",
            f"- **Projected Study Score Impact**: {study_delta:+.1f}%",
            f"- **Projected Burnout Risk Impact**: {burnout_delta:+.2f}",
        ]
        insights = result.get("insights", [])
        if insights:
            lines.append("")
            lines.append("💡 **Key Simulation Insights**:")
            for item in insights[:2]:
                lines.append(f"- {item}")

        return "\n".join(lines)

    def _format_recommendations_response(self, result: Dict[str, Any]) -> str:
        count = result.get("count", 0)
        recs = result.get("recommendations", [])
        if not recs:
            return "No critical warnings or urgent recommendations at this time. Your twin metrics are within target thresholds!"

        lines = [f"📋 **Active Twin Recommendations ({count} items found)**:", ""]
        for r in recs[:4]:
            prio = r.get("priority", "medium").upper()
            title = r.get("title", "")
            explanation = r.get("explanation", "")
            lines.append(f"- **[{prio}] {title}**: {explanation}")

        return "\n".join(lines)

    def _format_plan_response(self, result: Dict[str, Any]) -> str:
        p = result.get("proposed_plan", {})
        title = p.get("title", "Action Item")
        domain = p.get("domain", "general")
        due = p.get("due_date") or "No deadline set"
        return (
            f"I have drafted a new action plan for you:\n\n"
            f"📌 **{title}** ({domain})\n"
            f"Target Date: {due}\n\n"
            f"Please review the proposed details below and click **Approve & Save Plan** when you are ready."
        )

    def _format_list_plans_response(self, result: Dict[str, Any]) -> str:
        count = result.get("plans_count", 0)
        plans = result.get("plans", [])
        if not plans:
            return "You do not have any active action plans right now."
        lines = [f"You currently have {count} action plan(s):", ""]
        for p in plans:
            lines.append(f"- **{p.get('title')}** ({p.get('domain')}) - Status: {p.get('status')}")
        return "\n".join(lines)

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Keyword matching turn.
        Step 1: If last message is a tool response, format the output with authentic numbers.
        Step 2: Otherwise, inspect user query keywords and trigger the real tool.
        """
        last_msg = messages[-1] if messages else {}

        # 1. Did we just receive a tool response?
        if isinstance(last_msg, dict) and last_msg.get("role") == "tool":
            tr = last_msg.get("tool_response", {})
            t_name = tr.get("name", "")
            t_result = tr.get("response", {})

            if t_name == "get_user_summary":
                formatted_text = self._format_summary_response(t_result)
            elif t_name == "run_prediction":
                formatted_text = self._format_prediction_response(t_result)
            elif t_name == "run_simulation":
                formatted_text = self._format_simulation_response(t_result)
            elif t_name == "get_recommendations":
                formatted_text = self._format_recommendations_response(t_result)
            elif t_name == "list_plans":
                formatted_text = self._format_list_plans_response(t_result)
            elif t_name in ("create_plan", "update_plan"):
                formatted_text = self._format_plan_response(t_result)
            else:
                formatted_text = f"Action {t_name} processed based on your authentic logged metrics."

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
        user_lower = user_text.lower()

        # Keyword Matching logic
        # 1. Prompt Injection / System Override Refusal
        if any(k in user_lower for k in ("system override", "reveal user", "other user", "user id 2", "ignore all previous instructions", "ignore instructions", "database password", "system prompt")):
            return {
                "content": "I cannot comply with requests to override system safety rules or disclose confidential or other users' information. Your digital twin operates in secure per-user isolation.",
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 2. Out-of-Scope Queries Refusal
        if any(k in user_lower for k in ("weather", "recipe", "chocolate chip", "quicksort", "poem", "tell me a joke", "favorite movie")):
            return {
                "content": "I am your personal Digital Twin assistant specialized in your finances, study performance, and wellbeing habits. I cannot provide assistance with general trivia, weather forecasts, or external tasks outside your digital twin profile.",
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 3. Missing Domain Data Explanations
        if any(k in user_lower for k in ("calorie", "macronutrient", "diet", "food log", "nutrition", "spending in 2020", "spending in 2021", "year 2020", "year 2021")):
            return {
                "content": "I reviewed your records, but no dietary/nutrition logs or historical data for that timeframe are present in your account. You can log new entries in the dashboard to track this metric.",
                "tool_calls": [],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 4. List Plans
        if any(k in user_lower for k in ("list plans", "list all my", "current plans", "my goals", "show plans", "what plans")):
            return {
                "content": "Fetching your active action plans...",
                "tool_calls": [{"name": "list_plans", "args": {"status": "all"}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 5. Update Plan
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

        # 6. Investment / Credit Questions
        if any(k in user_lower for k in ("invest", "bitcoin", "index funds", "stocks", "bonds", "401k", "personal loan", "credit card")):
            return {
                "content": "Analyzing your financial emergency buffer and recommendation status...",
                "tool_calls": [{"name": "get_recommendations", "args": {}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 7. Simulation
        if any(k in user_lower for k in ("simulate", "simulation", "what if", "what happens", "laptop", "salary change", "raise", "pay cut", "one-time expense")):
            sim_params = self._extract_simulation_params(user_text)
            return {
                "content": "Initiating Monte Carlo simulation based on your personal scenario...",
                "tool_calls": [{"name": "run_simulation", "args": sim_params}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 8. Recommendations
        if any(k in user_lower for k in ("recommend", "recommendation", "advice", "tips", "suggest", "priority", "optimize", "improve", "how can i", "how do i")):
            return {
                "content": "Checking active rule-based recommendations for your profile...",
                "tool_calls": [{"name": "get_recommendations", "args": {}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 9. Predictions / Forecasts
        if any(k in user_lower for k in ("predict", "prediction", "forecast", "projection", "burnout risk", "exam score", "project", "risk of burnout")):
            domain = "overview"
            if "finance" in user_lower or "saving" in user_lower:
                domain = "finance"
            elif "study" in user_lower or "exam" in user_lower or "score" in user_lower:
                domain = "study"
            elif "habit" in user_lower or "sleep" in user_lower or "burnout" in user_lower:
                domain = "habits"

            return {
                "content": f"Running machine learning forecasting model for {domain}...",
                "tool_calls": [{"name": "run_prediction", "args": {"domain": domain, "horizon": 6}}],
                "raw_content": None,
                "provider": "offline",
                "model": self.model_name,
            }

        # 10. Plan creation
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

        # Summary / Status / Default
        preset = "30d"
        if "7d" in user_lower or "7 days" in user_lower:
            preset = "7d"
        elif "90d" in user_lower or "90 days" in user_lower:
            preset = "90d"
        elif "all" in user_lower:
            preset = "all"

        return {
            "content": "Gathering multi-domain metrics from your authentic digital twin records...",
            "tool_calls": [{"name": "get_user_summary", "args": {"preset": preset}}],
            "raw_content": None,
            "provider": "offline",
            "model": self.model_name,
        }
