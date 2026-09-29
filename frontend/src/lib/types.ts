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
  title: string;
  description: string;
  domain: string;
  status: 'proposed' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  created_at: string;
}
