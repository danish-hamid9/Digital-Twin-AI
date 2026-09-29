import {
  AuthResponse,
  User,
  Profile,
  PaginatedResponse,
  FinanceEntry,
  SavingsGoal,
  StudySession,
  HabitLog,
  Goal,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('twin_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg}`).join(', ');
        } else {
          errorMessage = errorData.message || errorMessage;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: { email: string; password: string; full_name?: string; currency?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  // User & Profile
  async getProfile(): Promise<Profile> {
    return this.request<Profile>('/api/v1/user/profile');
  }

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    return this.request<Profile>('/api/v1/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async exportData(): Promise<any> {
    return this.request<any>('/api/v1/user/export-data');
  }

  async deleteData(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/api/v1/user/delete-data', {
      method: 'DELETE',
    });
  }

  // Finance Entries CRUD
  async getFinanceEntries(params: {
    page?: number;
    page_size?: number;
    type?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<PaginatedResponse<FinanceEntry>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.type) q.set('type', params.type);
    if (params.category) q.set('category', params.category);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    return this.request<PaginatedResponse<FinanceEntry>>(`/api/v1/finance/entries?${q.toString()}`);
  }

  async createFinanceEntry(data: {
    date: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
  }): Promise<FinanceEntry> {
    return this.request<FinanceEntry>('/api/v1/finance/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFinanceEntry(id: string, data: Partial<FinanceEntry>): Promise<FinanceEntry> {
    return this.request<FinanceEntry>(`/api/v1/finance/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFinanceEntry(id: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/v1/finance/entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Savings Goals
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    return this.request<SavingsGoal[]>('/api/v1/finance/goals');
  }

  async createSavingsGoal(data: {
    title: string;
    target_amount: number;
    current_amount?: number;
    target_date?: string;
  }): Promise<SavingsGoal> {
    return this.request<SavingsGoal>('/api/v1/finance/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Study Sessions CRUD
  async getStudySessions(params: {
    page?: number;
    page_size?: number;
    subject?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<PaginatedResponse<StudySession>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.subject) q.set('subject', params.subject);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    return this.request<PaginatedResponse<StudySession>>(`/api/v1/study/sessions?${q.toString()}`);
  }

  async createStudySession(data: {
    date: string;
    subject: string;
    hours: number;
    score?: number;
    notes?: string;
  }): Promise<StudySession> {
    return this.request<StudySession>('/api/v1/study/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudySession(id: string, data: Partial<StudySession>): Promise<StudySession> {
    return this.request<StudySession>(`/api/v1/study/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudySession(id: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/v1/study/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // Habit Logs CRUD
  async getHabitLogs(params: {
    page?: number;
    page_size?: number;
    habit?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<PaginatedResponse<HabitLog>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.page_size) q.set('page_size', params.page_size.toString());
    if (params.habit) q.set('habit', params.habit);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    return this.request<PaginatedResponse<HabitLog>>(`/api/v1/habits/logs?${q.toString()}`);
  }

  async createHabitLog(data: {
    date: string;
    habit: string;
    done?: boolean;
    sleep_hours?: number;
    exercise_minutes?: number;
    mood?: number;
  }): Promise<HabitLog> {
    return this.request<HabitLog>('/api/v1/habits/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHabitLog(id: string, data: Partial<HabitLog>): Promise<HabitLog> {
    return this.request<HabitLog>(`/api/v1/habits/logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHabitLog(id: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/v1/habits/logs/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
