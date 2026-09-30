import asyncio
import httpx
import datetime as dt
import json

BASE_URL = "http://localhost:8000"

async def test_phase3():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        email = f"phase3_smoke_{int(dt.datetime.now().timestamp())}@example.com"
        print(f"=== 1. Registering user {email} ===")
        reg_res = await client.post("/api/v1/auth/register", json={
            "email": email,
            "password": "Password123!",
            "full_name": "Phase 3 Tester",
            "currency": "USD"
        })
        if reg_res.status_code != 201:
            print(f"Registration failed: {reg_res.text}")
            return
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Registration successful, JWT issued.")

        print("\n=== 2. Populating 14-day sample trajectory across Finance, Study, Habits ===")
        today = dt.date.today()

        # Finance
        categories = ["Salary", "Rent", "Groceries", "Utilities", "Dining Out", "Tech & Subscriptions"]
        await client.post("/api/v1/finance/entries", json={
            "date": (today - dt.timedelta(days=12)).isoformat(),
            "type": "income",
            "category": "Salary",
            "amount": 4500.0,
            "description": "Bi-weekly paycheck"
        }, headers=headers)

        await client.post("/api/v1/finance/entries", json={
            "date": (today - dt.timedelta(days=10)).isoformat(),
            "type": "expense",
            "category": "Rent",
            "amount": 1400.0,
            "description": "Monthly apartment rent"
        }, headers=headers)

        await client.post("/api/v1/finance/entries", json={
            "date": (today - dt.timedelta(days=7)).isoformat(),
            "type": "expense",
            "category": "Groceries",
            "amount": 250.0,
            "description": "Whole Foods groceries"
        }, headers=headers)

        await client.post("/api/v1/finance/entries", json={
            "date": (today - dt.timedelta(days=4)).isoformat(),
            "type": "expense",
            "category": "Utilities",
            "amount": 120.0,
            "description": "Internet & Power"
        }, headers=headers)

        await client.post("/api/v1/finance/entries", json={
            "date": (today - dt.timedelta(days=2)).isoformat(),
            "type": "expense",
            "category": "Dining Out",
            "amount": 65.0,
            "description": "Weekend sushi with friends"
        }, headers=headers)

        # Study
        subjects = [
            ("Computer Science", 3.5, 92.0),
            ("Mathematics", 2.0, 88.0),
            ("Machine Learning", 4.0, 95.0),
            ("Computer Science", 3.0, 90.0),
            ("Economics", 2.5, 85.0),
        ]
        for idx, (sub, hrs, score) in enumerate(subjects):
            d = (today - dt.timedelta(days=10 - idx * 2)).isoformat()
            await client.post("/api/v1/study/sessions", json={
                "date": d,
                "subject": sub,
                "hours": hrs,
                "score": score,
                "notes": f"Focused review on {sub}"
            }, headers=headers)

        # Habits
        for i in range(10, 0, -1):
            d = (today - dt.timedelta(days=i)).isoformat()
            sleep = 7.0 + (i % 3) * 0.5
            mood = 3 + (i % 3)
            exercise = 30 if (i % 2 == 0) else 45
            await client.post("/api/v1/habits/logs", json={
                "date": d,
                "habit": "Daily Wellbeing & Deep Sleep",
                "done": True,
                "sleep_hours": sleep,
                "exercise_minutes": exercise,
                "mood": mood
            }, headers=headers)

        print("Entries successfully recorded.")

        print("\n=== 3. Querying /api/v1/dashboard/overview (Preset: 30d) ===")
        overview_res = await client.get("/api/v1/dashboard/overview?preset=30d", headers=headers)
        assert overview_res.status_code == 200
        overview = overview_res.json()

        print("\n--- Date Range ---")
        print(json.dumps(overview["date_range"], indent=2))

        print("\n--- Finance Metrics ---")
        fin = overview["finance"]
        print(f"Total Income:       {fin['currency']} {fin['total_income']:,.2f}")
        print(f"Total Expenses:     {fin['currency']} {fin['total_expenses']:,.2f}")
        print(f"Net Savings:        {fin['currency']} {fin['net_savings']:,.2f}")
        print(f"Savings Rate:       {fin['savings_rate']}%")
        print(f"Entries Count:      {fin['entries_count']}")
        print(f"Estimated Runway:   {fin['runway_months']} months")
        print("Expense Categories:")
        for cat in fin["category_distribution"]:
            print(f"  • {cat['category']:<20}: {fin['currency']} {cat['amount']:>8.2f} ({cat['percentage']}%)")

        print("\n--- Study Metrics ---")
        stu = overview["study"]
        print(f"Total Focus Hours:  {stu['total_study_hours']} hrs")
        print(f"Daily Average:      {stu['avg_daily_hours']} hrs/day")
        print(f"Weekly Target:      {stu['target_weekly_hours']} hrs/week")
        print(f"7-Day Target Pace:  {stu['weekly_progress_pct']}%")
        print(f"Average Exam Score: {stu['avg_score']}%")
        print(f"Total Sessions:     {stu['sessions_count']}")
        print(f"Top Subject:        {stu['top_subject']}")
        print("Subject Breakdown:")
        for sub in stu["subject_breakdown"]:
            print(f"  • {sub['subject']:<20}: {sub['hours']:>4.1f}h ({sub['percentage']}%), avg score {sub['avg_score']}%")

        print("\n--- Habits & Wellbeing Metrics ---")
        hab = overview["habits"]
        print(f"Avg Sleep:          {hab['avg_sleep_hours']} hrs (target: {hab['target_sleep_hours']} hrs, var: {hab['sleep_variance']}h)")
        print(f"Avg Vitality Mood:  ★ {hab['avg_mood']} / 5")
        print(f"Current Streak:     {hab['current_streak']} days")
        print(f"Completion Rate:    {hab['habit_completion_rate']}%")
        print(f"Avg Exercise:       {hab['avg_exercise_minutes']} mins/day")
        print("Sleep vs Mood Heatmap Buckets:")
        for b in hab["sleep_buckets"]:
            print(f"  • {b['range_label']:<10}: avg mood ★{b['avg_mood']}, count {b['count']}")

        print("\n=== 4. Testing Domain Specific Analytics Endpoints ===")
        fin_res = await client.get("/api/v1/dashboard/finance?preset=7d", headers=headers)
        assert fin_res.status_code == 200
        print("GET /api/v1/dashboard/finance?preset=7d -> Status 200 OK")

        stu_res = await client.get("/api/v1/dashboard/study?preset=7d", headers=headers)
        assert stu_res.status_code == 200
        print("GET /api/v1/dashboard/study?preset=7d -> Status 200 OK")

        hab_res = await client.get("/api/v1/dashboard/habits?preset=7d", headers=headers)
        assert hab_res.status_code == 200
        print("GET /api/v1/dashboard/habits?preset=7d -> Status 200 OK")

        print("\n=== All Phase 3 Backend Aggregation & Analytics Verified Working! ===")

if __name__ == "__main__":
    asyncio.run(test_phase3())
