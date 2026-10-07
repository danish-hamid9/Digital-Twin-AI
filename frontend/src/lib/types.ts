export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  occupation: string;
  currency: string;
  monthly_target_savings: number;
  target_study_hours_week: number;
  target_sleep_hours: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  profile?: Profile;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FinanceEntry {
  id: string;
  user_id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  date: string;
  subject: string;
  hours: number;
  score?: number;
  notes?: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  date: string;
  habit: string;
  done: boolean;
  sleep_hours: number;
  exercise_minutes: number;
  mood: number;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  domain: 'finance' | 'study' | 'habit' | 'general';
  status: 'proposed' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  created_at: string;
}

// -------------------------------------------------------------
// Dashboard & Analytics Interfaces
// -------------------------------------------------------------
export interface DateRangeInfo {
  preset: string;
  start_date?: string;
  end_date?: string;
}

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expenses: number;
  net_savings: number;
}

export interface CategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface SavingsGoalSummary {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  progress_pct: number;
}

export interface FinanceAnalytics {
  total_income: number;
  total_expenses: number;
  net_savings: number;
  savings_rate: number;
  currency: string;
  entries_count: number;
  runway_months?: number;
  cash_flow_trend: CashFlowDataPoint[];
  category_distribution: CategoryDistribution[];
  goals: SavingsGoalSummary[];
}

export interface StudyTrendPoint {
  date: string;
  hours: number;
  score?: number;
  subject?: string;
}

export interface SubjectBreakdown {
  subject: string;
  hours: number;
  percentage: number;
  sessions_count: number;
  avg_score?: number;
}

export interface StudyAnalytics {
  total_study_hours: number;
  avg_daily_hours: number;
  target_weekly_hours: number;
  weekly_progress_pct: number;
  avg_score?: number;
  sessions_count: number;
  top_subject?: string;
  subject_breakdown: SubjectBreakdown[];
  study_trend: StudyTrendPoint[];
}

export interface HabitTrendPoint {
  date: string;
  habit: string;
  done: boolean;
  sleep_hours: number;
  exercise_minutes: number;
  mood: number;
}

export interface SleepMoodCorrelation {
  date: string;
  sleep_hours: number;
  mood: number;
  exercise_minutes: number;
}

export interface SleepBucket {
  range_label: string;
  avg_mood: number;
  count: number;
}

export interface HabitAnalytics {
  avg_sleep_hours: number;
  target_sleep_hours: number;
  sleep_variance: number;
  avg_exercise_minutes: number;
  avg_mood: number;
  habit_completion_rate: number;
  current_streak: number;
  longest_streak: number;
  logs_count: number;
  habits_trend: HabitTrendPoint[];
  sleep_vs_mood: SleepMoodCorrelation[];
  sleep_buckets: SleepBucket[];
}

export interface DashboardOverviewResponse {
  date_range: DateRangeInfo;
  finance: FinanceAnalytics;
  study: StudyAnalytics;
  habits: HabitAnalytics;
}

// -------------------------------------------------------------
// Phase 4: ML Prediction & Forecast Interfaces
// -------------------------------------------------------------

export interface ConfidenceInterval {
  lower: number;
  expected: number;
  upper: number;
}

export interface FinanceMonthlyForecast {
  month_index: number;
  projected_date: string;
  projected_expenses: ConfidenceInterval;
  projected_savings: ConfidenceInterval;
  cumulative_savings: ConfidenceInterval;
}

export interface FinancePredictionResponse {
  domain: string;
  horizon_months: number;
  current_monthly_income: number;
  current_monthly_expenses: number;
  forecasts: FinanceMonthlyForecast[];
  projected_6m_savings: ConfidenceInterval;
  data_source: 'personal' | 'blended' | 'global';
  personal_weight: number;
  user_data_points: number;
  model_metadata: Record<string, any>;
  explanation: string;
}

export interface StudyScenario {
  weekly_study_hours: number;
  projected_score: ConfidenceInterval;
}

export interface StudyPredictionResponse {
  domain: string;
  current_predicted_score: ConfidenceInterval;
  feature_importance: Record<string, number>;
  study_hours_scenarios: StudyScenario[];
  data_source: 'personal' | 'blended' | 'global';
  personal_weight: number;
  user_data_points: number;
  model_metadata: Record<string, any>;
  top_improvement_lever: string;
  explanation: string;
}

export interface HabitRiskFactor {
  factor: string;
  status: 'optimal' | 'warning' | 'critical';
  value: string;
  impact: string;
}

export interface HabitPredictionResponse {
  domain: string;
  streak_continuation_probability: number;
  burnout_risk_score: number;
  burnout_risk_level: 'low' | 'moderate' | 'high';
  risk_factors: HabitRiskFactor[];
  recommendations: string[];
  data_source: 'personal' | 'blended' | 'global';
  personal_weight: number;
  user_data_points: number;
  model_metadata: Record<string, any>;
  explanation: string;
}

export interface OverviewPredictionResponse {
  finance: FinancePredictionResponse;
  study: StudyPredictionResponse;
  habits: HabitPredictionResponse;
}

// -------------------------------------------------------------
// Phase 5 Simulation Types
// -------------------------------------------------------------

export interface PercentileValue {
  p10: number;
  p50: number;
  p90: number;
}

export interface DomainTrajectoryPoint {
  cumulative_savings: PercentileValue;
  monthly_expenses: PercentileValue;
  monthly_income: PercentileValue;
  study_score: PercentileValue;
  habit_consistency: PercentileValue;
  burnout_risk: PercentileValue;
}

export interface SimulationMonthPoint {
  month_index: number;
  projected_date: string;
  baseline: DomainTrajectoryPoint;
  scenario: DomainTrajectoryPoint;
  savings_delta_p50: number;
  study_score_delta_p50: number;
  burnout_risk_delta_p50: number;
  habit_consistency_delta_p50: number;
}

export interface SimulationScenarioParams {
  salary_change_pct: number;
  one_time_expense: number;
  one_time_expense_month: number;
  study_hours_delta: number;
  sleep_target_delta: number;
  exercise_minutes_delta: number;
  horizon_months: number;
  iterations: number;
  model?: 'parametric' | 'bootstrap' | 'compare';
}

export interface SimulationSummary {
  baseline_final_savings: PercentileValue;
  scenario_final_savings: PercentileValue;
  savings_net_impact_p50: number;
  baseline_final_study_score: PercentileValue;
  scenario_final_study_score: PercentileValue;
  study_score_net_impact_p50: number;
  baseline_final_burnout_risk: PercentileValue;
  scenario_final_burnout_risk: PercentileValue;
  burnout_risk_net_impact_p50: number;
  cross_domain_insights: string[];
}

export interface SimulationRunResponse {
  simulation_id?: string;
  horizon_months: number;
  iterations: number;
  model?: string;
  limited_history?: boolean;
  scenario_params: SimulationScenarioParams;
  monthly_trajectory: SimulationMonthPoint[];
  summary: SimulationSummary;
  assumptions: Record<string, any>;
  disclaimer: string;
  comparison_results?: Record<string, any>;
}

// -------------------------------------------------------------
// Phase 6 Recommendation Types
// -------------------------------------------------------------

export interface RecommendationItem {
  id: string;
  rule_id: string;
  domain: 'finance' | 'study' | 'habits' | 'general';
  priority: 'high' | 'medium' | 'low';
  category: 'risk_alert' | 'performance_warning' | 'habit_streak' | 'positive_reinforcement';
  title: string;
  explanation: string;
  action_text: string;
  action_link?: string;
  user_metric_name: string;
  user_metric_value: string;
  threshold_value: string;
  created_at: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
  total_count: number;
  high_priority_count: number;
  disclaimer: string;
}

// -------------------------------------------------------------
// Phase 7 Action Plans and Chat Types
// -------------------------------------------------------------

export interface PlanCreate {
  title: string;
  description?: string;
  domain?: string;
  status?: string;
  due_date?: string;
}

export interface PlanUpdate {
  title?: string;
  description?: string;
  domain?: string;
  status?: string;
  due_date?: string;
}

export interface ToolCallRecord {
  tool_name: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
}

export interface PlanProposal {
  action: 'create' | 'update';
  plan_id?: string;
  title: string;
  description?: string;
  domain: string;
  status: string;
  due_date?: string;
}

export interface ChatTurnResponse {
  role: string;
  content: string;
  tool_calls: ToolCallRecord[];
  proposed_plans: PlanProposal[];
  provider?: string;
  model?: string;
  created_at: string;
}

export interface ChartSeries {
  name: string;
  data?: number[];
  value?: number;
  color?: string;
  axis?: 'left' | 'right';
  unit?: string;
  max?: number;
}

export interface ChartSpec {
  type: 'simulation_fan' | 'savings_forecast' | 'expense_donut' | 'study_vs_sleep' | 'habit_burnout_gauge';
  title?: string;
  labels: string[];
  series: ChartSeries[];
  unit?: string;
  currency?: string;
  raw_data?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCallRecord[];
  tool_results?: any;
  provider?: string;
  model?: string;
  created_at: string;
}

export interface LoginEvent {
  id: string;
  user_id: string;
  created_at: string;
  success: boolean;
  method: string;
  browser_os: string;
  ip_address: string;
}



