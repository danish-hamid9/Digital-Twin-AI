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
        "description": "Run Monte Carlo counterfactual what-if simulation (default 15,000 iterations) testing decision interventions like salary adjustments, one-time expenses, study hour changes, sleep targets, or exercise shifts.",
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
                },
                "model": {
                    "type": "STRING",
                    "description": "Simulation engine model: 'parametric' | 'bootstrap' | 'compare'. Default is 'parametric'."
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
    },
    {
        "name": "get_daily_series",
        "description": "Fetch daily time-series records (study score, study hours, sleep, mood, exercise) for N days (default 30). Returns correlation coefficient between metrics and number of data points. If fewer than 10 points, indicates correlation is unreliable.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "days": {
                    "type": "INTEGER",
                    "description": "Number of days of history to retrieve. Default is 30."
                }
            },
            "required": []
        }
    }
]

SYSTEM_PROMPT = """You are Twin Bot, a friendly, encouraging personal coach inside the Digital Twin app.
You help the user balance their personal finances, study performance, and daily wellbeing/sleep habits.

CORE BEHAVIOR & GUIDELINES:
1. NATURAL CONVERSATION:
   - Converse naturally, warmly, and concisely in plain language.
   - Answer small talk, follow-ups, and general knowledge questions (budgeting basics, study techniques, sleep habits) normally and briefly without calling tools, unless the user's personal data is needed.

2. STRICT DATA GROUNDING & EFFECT SIZES:
   - When a question involves the user's own data (records, balances, scores, sleep, forecasts, or what-if scenarios), call the tools.
   - Every figure, balance, score, hour, percentage, runway metric, or effect size about the user MUST come strictly from tool output; never invent, hallucinate, or assume figures about the user.
   - If a figure or effect size cannot be quantified from tool data, say so explicitly or offer to run a simulation.
   - All derived figures must reconcile (for example, gap = target - average). Always use the sleep target from Settings everywhere.

3. TIME PERIOD HANDLING:
   - NEVER ask clarifying questions about the time period.
   - Always default to the last 30 days and explicitly say so (e.g., "Looking at your records over the last 30 days...").
   - Only ask a clarifying question if the domain itself is completely unspecified (e.g. "help me improve" without specifying finance, study, or habits).

4. ACTIONABLE ADVICE STRUCTURE:
   - When asked for advice, give 2 to 4 concrete, prioritized suggestions with clear reasons.
   - Combine the user's data (from tools) with general best practice.
   - Make it crystal clear which parts come from the user's data (e.g. "Based on your data: ...") and which are general tips (e.g. "General best practice: ...").

5. MATCHING CHARTS & NEXT STEPS:
   - Charts must match the question: study/sleep questions get the study-vs-sleep chart, habit/burnout questions get the gauges, savings questions get the forecast chart, spending questions get the expense donut.
   - Never attach the expense donut to unrelated answers.
   - End your response with a useful next step (offer to simulate, create a plan, or show a chart).
   - Show very high or low probabilities as ">95%" or "<5%" instead of 0.99/1.

6. SHORT, TARGETED DISCLAIMERS:
   - Keep disclaimers short (one brief notice) ONLY for investment, credit, or health topics. Never duplicate disclaimers and never include raw asterisks.

7. TONE:
   - Warm, concise, plain language. Avoid robotic summaries.
"""

MANDATORY_DISCLAIMER = (
    "\n\n> ⚠️ Notice: For informational purposes only; not certified financial, credit, or medical advice."
)

DISCLAIMER_KEYWORDS = [
    # Investment topics
    "invest", "investment", "portfolio", "stock", "stocks", "equity", "crypto", "bitcoin", "etf", "mutual fund", "asset allocation",
    # Credit topics
    "credit", "credit score", "debt", "loan", "borrow", "mortgage", "lending",
    # Health topics
    "medical", "doctor", "health", "diagnosis", "therapy", "clinical", "medication", "prescribe", "illness"
]


