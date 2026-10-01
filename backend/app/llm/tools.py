from typing import List, Dict, Any

# Tool declarations exposed to Gemini.
# Note: In accordance with security requirements, NO tool accepts user_id from the model!
# The backend strictly injects the authenticated user from the verified JWT context.
CHAT_TOOLS_DECLARATIONS = [
    {
        "name": "get_user_summary",
        "description": "Fetch real-time multi-domain summary metrics for the user: financial cash flow, net savings, study hours, average exam scores, sleep averages, and habit streak.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "preset": {
                    "type": "STRING",
                    "description": "Date range preset: '7d', '30d', '90d', or 'all'. Default is '30d'."
                }
            },
            "required": []
        }
    },
    {
        "name": "run_prediction",
        "description": "Run trained Machine Learning forecasting models for the user across finance, study, or habits.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "domain": {
                    "type": "STRING",
                    "description": "Domain to forecast: 'finance', 'study', 'habits', or 'overview'."
                },
                "horizon": {
                    "type": "INTEGER",
                    "description": "Projection horizon in months (1-12) or days for habits. Default is 6."
                }
            },
            "required": ["domain"]
        }
    },
    {
        "name": "run_simulation",
        "description": "Run Monte Carlo counterfactual what-if simulation (500+ iterations) testing decision interventions like salary adjustments, one-time expenses, study hour changes, sleep targets, or exercise shifts.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "horizon_months": {
                    "type": "INTEGER",
                    "description": "Simulation horizon from 1 to 12 months. Default is 6."
                },
                "salary_change_pct": {
                    "type": "NUMBER",
                    "description": "Percentage change in recurring income/salary (-50 to +100). Default is 0."
                },
                "one_time_expense": {
                    "type": "NUMBER",
                    "description": "One-time major expense amount in currency units (e.g. 1000 for a laptop). Default is 0."
                },
                "expense_target_month": {
                    "type": "INTEGER",
                    "description": "The specific month (1 to horizon) in which the one-time expense occurs. Default is 1."
                },
                "study_hours_delta": {
                    "type": "NUMBER",
                    "description": "Weekly study hours adjustment (+/- hours per week). Default is 0."
                },
                "sleep_target_delta": {
                    "type": "NUMBER",
                    "description": "Daily sleep target adjustment (+/- hours per day). Default is 0."
                },
                "exercise_minutes_delta": {
                    "type": "NUMBER",
                    "description": "Daily exercise target adjustment (+/- minutes per day). Default is 0."
                }
            },
            "required": []
        }
    },
    {
        "name": "get_recommendations",
        "description": "Retrieve active rule-based actionable recommendations grounded in the user's authentic logged metrics.",
        "parameters": {
            "type": "OBJECT",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "create_plan",
        "description": "Propose creating a new action plan item (e.g. habit schedule, budget target, exam prep). Note: Does not immediately write to DB; returns a proposal for user confirmation card.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "title": {
                    "type": "STRING",
                    "description": "Short title of the proposed plan."
                },
                "description": {
                    "type": "STRING",
                    "description": "Actionable instructions or details for this plan."
                },
                "domain": {
                    "type": "STRING",
                    "description": "Domain: 'finance', 'study', 'habit', or 'general'."
                },
                "due_date": {
                    "type": "STRING",
                    "description": "Optional ISO target due date (YYYY-MM-DD)."
                }
            },
            "required": ["title", "domain"]
        }
    },
    {
        "name": "list_plans",
        "description": "List existing action plans and their current status ('pending', 'in_progress', 'completed') for the user.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "status": {
                    "type": "STRING",
                    "description": "Filter by status: 'pending', 'in_progress', 'completed', or 'all'."
                }
            },
            "required": []
        }
    },
    {
        "name": "update_plan",
        "description": "Propose updating an existing action plan's status, title, description, or due date. Returns a proposal for user confirmation card.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "plan_id": {
                    "type": "STRING",
                    "description": "UUID string of the plan to update."
                },
                "title": {
                    "type": "STRING",
                    "description": "New title if changing."
                },
                "description": {
                    "type": "STRING",
                    "description": "New description if changing."
                },
                "status": {
                    "type": "STRING",
                    "description": "New status: 'pending', 'in_progress', 'completed', or 'cancelled'."
                },
                "due_date": {
                    "type": "STRING",
                    "description": "New target due date (YYYY-MM-DD)."
                }
            },
            "required": ["plan_id"]
        }
    }
]

SYSTEM_PROMPT = """You are Digital Twin AI, an intelligent personal life simulation and decision assistant.
You possess a holistic digital twin of the user spanning their personal finance, academic study, and daily wellbeing/recovery habits.

CRITICAL GROUNDING GUARDRAILS & INSTRUCTIONS:
1. STRICT DATA GROUNDING: ALL numbers, currency values, percentages, study scores, sleep hours, runway figures, and probabilities MUST be sourced directly from tool execution outputs. NEVER invent, hallucinate, assume, or estimate numbers without running the appropriate tool first.
2. TOOL USAGE:
   - When asked about current status, balances, scores, or habits -> Call `get_user_summary`.
   - When asked about future forecasts or ML models -> Call `run_prediction`.
   - When asked what-if questions (e.g. 'what happens if I buy a laptop', 'if my salary changes', 'if I sleep 5 hours') -> Call `run_simulation`.
   - When asked for advice, optimization, or tips -> Call `get_recommendations`.
   - When proposing new action items or goal steps -> Call `create_plan` or `update_plan`.
3. CITATION OF AUTHENTIC NUMBERS: Always explain the exact metrics reported by the tools (e.g. citing baseline vs scenario median P50 savings, specific runway in months, score changes).
4. PLAN CONFIRMATIONS: Any `create_plan` or `update_plan` tool call produces a proposed action item. Inform the user that you have drafted this action plan for them and that they can review and approve it using the confirmation card.
5. CONCISE, PROFESSIONAL TONE: Be supportive, structured, analytical, and concise.
"""

MANDATORY_DISCLAIMER = (
    "\n\n> ⚠️ **Automated Simulation Notice**: The projections and heuristic suggestions provided "
    "are algorithmically computed from historical statistical models and simulation assumptions. "
    "They do not constitute certified financial, legal, or medical advice. Consult qualified professionals "
    "before making major lifestyle, health, or financial decisions."
)

DISCLAIMER_KEYWORDS = [
    "invest", "portfolio", "stock", "saving", "savings", "expense", "budget", "runway",
    "credit", "debt", "loan", "salary", "spend", "spending", "finance", "financial",
    "medical", "doctor", "health", "sleep", "burnout", "diagnosis", "therapy", "emergency fund"
]
