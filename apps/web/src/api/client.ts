import {
  ApiErrorSchema,
  DebtSchema,
  ExplanationSchema,
  PlanSchema,
  TransactionSchema,
  type Debt,
  type Explanation,
  type Plan,
  type Transaction,
} from '../domain/models';
const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
let accessToken: string | undefined;
let refreshPromise: Promise<boolean> | undefined;
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
const messages: Record<number, string> = {
  400: 'Проверьте введённые данные',
  401: 'Сессия завершена. Войдите снова',
  403: 'Недостаточно прав',
  404: 'Запись не найдена',
  409: 'Данные изменились. Проверьте конфликт',
  422: 'Проверьте поля формы',
  500: 'Сервис временно недоступен',
};
async function refresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const token = sessionStorage.getItem('vyhod_refresh');
    if (!token || !base) return false;
    const response = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { access_token: string; refresh_token: string };
    accessToken = body.access_token;
    sessionStorage.setItem('vyhod_refresh', body.refresh_token);
    return true;
  })().finally(() => {
    refreshPromise = undefined;
  });
  return refreshPromise;
}
export function mapError(status: number, raw: unknown) {
  const parsed = ApiErrorSchema.safeParse(raw);
  return new AppError(
    parsed.success ? parsed.data.error.code : `http_${status}`,
    parsed.success
      ? parsed.data.error.message
      : (messages[status] ?? 'Не удалось выполнить запрос'),
    status,
  );
}
async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!base) throw new AppError('config', 'VITE_API_BASE_URL не настроен');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
    if (response.status === 401 && retry && (await refresh())) return request(path, init, false);
    const raw = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) throw mapError(response.status, raw);
    return raw as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if ((error as Error).name === 'AbortError')
      throw new AppError('timeout', 'Сервер не ответил вовремя');
    throw new AppError('network', 'Нет связи с сервером');
  } finally {
    clearTimeout(timeout);
  }
}
function saveTokens(v: { access_token: string; refresh_token: string }) {
  accessToken = v.access_token;
  /* Temporary compatibility adapter: refresh is session-only until backend supports HttpOnly cookies. */ sessionStorage.setItem(
    'vyhod_refresh',
    v.refresh_token,
  );
}
export const api = {
  hasRefreshSession() {
    return Boolean(sessionStorage.getItem('vyhod_refresh'));
  },
  restore() {
    return refresh();
  },
  async auth(kind: 'login' | 'register', email: string, password: string) {
    const result = await request<{ access_token: string; refresh_token: string }>(`/auth/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveTokens(result);
  },
  async logout() {
    const token = sessionStorage.getItem('vyhod_refresh');
    if (token)
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: token }),
      }).catch(() => undefined);
    accessToken = undefined;
    sessionStorage.removeItem('vyhod_refresh');
  },
  async plan(): Promise<Plan> {
    return PlanSchema.parse(await request('/plan'));
  },
  async explanation(): Promise<Explanation> {
    return ExplanationSchema.parse(await request('/plan/explanation'));
  },
  async debts(): Promise<Debt[]> {
    return DebtSchema.array().parse(await request('/debts'));
  },
  async transactions(): Promise<Transaction[]> {
    const value = await request<unknown>('/transactions?limit=100');
    return TransactionSchema.array().parse((value as { items?: unknown }).items ?? value);
  },
  async accounts(): Promise<Array<{ id: string; currency: string }>> {
    return request('/accounts');
  },
  async onboarding(draft: import('../domain/models').OnboardingDraft): Promise<void> {
    await request('/onboarding', {
      method: 'POST',
      headers: { 'Idempotency-Key': draft.idempotencyKey },
      body: JSON.stringify({
        language: draft.language,
        currency: draft.currency,
        available_now: draft.availableNow,
        minimum_buffer: draft.minimumReserve,
        incomes: draft.incomes.map((item) => ({
          name: item.name,
          amount: item.amount,
          due_date: item.date,
          confirmed: item.confirmed,
          recurring: item.recurring,
        })),
        expenses: draft.expenses.map((item) => ({
          name: item.name,
          amount: item.amount,
          due_date: item.date,
          recurring: item.recurring,
        })),
        debts: draft.debts.map(
          ({
            name,
            balance,
            annual_rate_bps,
            minimum_payment,
            due_day,
            overdue,
            custom_priority,
          }) => ({
            name,
            balance,
            annual_rate_bps,
            minimum_payment,
            due_day,
            overdue,
            custom_priority,
          }),
        ),
      }),
    });
  },
  async saveDebt(
    input: Omit<Debt, 'id' | 'syncStatus'>,
    id: string | undefined,
    key: string,
  ): Promise<Debt> {
    const raw = await request(id ? `/debts/${id}` : '/debts', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(input),
    });
    return DebtSchema.parse({ ...(raw as object), syncStatus: 'synced' });
  },
  async deleteDebt(id: string): Promise<void> {
    await request(`/debts/${id}`, { method: 'DELETE' });
  },
  async addTransaction(
    input: Omit<Transaction, 'id' | 'syncStatus'>,
    key: string,
  ): Promise<Transaction> {
    const raw = await request('/transactions', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(input),
    });
    return TransactionSchema.parse({ ...(raw as object), recurring: false, syncStatus: 'synced' });
  },
  async deleteTransaction(id: string): Promise<void> {
    await request(`/transactions/${id}`, { method: 'DELETE' });
  },
};
export const __testing = {
  refresh,
  setAccess: (v?: string) => {
    accessToken = v;
  },
};
