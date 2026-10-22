import {
  AdminStats,
  AdminUser,
  AdminWord,
  AuthSession,
  CategoryInfo,
  CategoryWord,
  Difficulty,
  DrawnWord,
  Profile,
  Role,
  RoomView,
  SettingsInput,
  WordInput,
} from '../types';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** เรียกเมื่อ token หมดอายุ/ไม่ถูกต้อง เพื่อพากลับไปหน้าล็อกอิน */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: { method?: string; auth?: AuthSession; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth) {
    headers.Authorization = `Bearer ${options.auth.token}`;
  }

  let res: Response;
  try {
    res = await fetch(BASE_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 0);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && options.auth) {
      onUnauthorized?.();
    }
    throw new ApiError(data?.error ?? `เกิดข้อผิดพลาด (${res.status})`, res.status);
  }
  return data as T;
}

function roomPath(code: string, suffix = '') {
  return `/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request<AuthSession>('/api/auth/register', { method: 'POST', body: { username, email, password } }),

  login: (login: string, password: string) =>
    request<AuthSession>('/api/auth/login', { method: 'POST', body: { login, password } }),

  me: (auth: AuthSession) => request<Profile>('/api/me', { auth }),

  createRoom: (auth: AuthSession) => request<RoomView>('/api/rooms', { method: 'POST', auth }),

  joinRoom: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code, '/players'), { method: 'POST', auth }),

  getRoom: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code), { auth }),

  updateSettings: (auth: AuthSession, code: string, settings: SettingsInput) =>
    request<RoomView>(roomPath(code, '/settings'), { method: 'POST', auth, body: settings }),

  restartGame: (auth: AuthSession, code: string) =>
    request<RoomView>(roomPath(code, '/restart'), { method: 'POST', auth }),

  startRound: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code, '/start'), { method: 'POST', auth }),

  reportKill: (auth: AuthSession, code: string, victimId: string, killerId: string | null) =>
    request<RoomView>(roomPath(code, '/kills'), { method: 'POST', auth, body: { victimId, killerId } }),

  submitGuess: (auth: AuthSession, code: string, guess: string) =>
    request<RoomView>(roomPath(code, '/guess'), { method: 'POST', auth, body: { guess } }),

  endRound: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code, '/end'), { method: 'POST', auth }),
};

/** หมวดหมู่คำ: หมวดมาตรฐาน + หมวดเฉพาะกิจของผู้ใช้ */
export const categoryApi = {
  list: (auth: AuthSession) => request<CategoryInfo[]>('/api/categories', { auth }),

  create: (auth: AuthSession, name: string, icon: string) =>
    request<CategoryInfo>('/api/categories', { method: 'POST', auth, body: { name, icon } }),

  update: (auth: AuthSession, id: number, name: string, icon: string) =>
    request<CategoryInfo>(`/api/categories/${id}`, { method: 'PUT', auth, body: { name, icon } }),

  remove: (auth: AuthSession, id: number) => request<null>(`/api/categories/${id}`, { method: 'DELETE', auth }),

  words: (auth: AuthSession, id: number) => request<CategoryWord[]>(`/api/categories/${id}/words`, { auth }),

  addWord: (auth: AuthSession, id: number, text: string, difficulty: Difficulty) =>
    request<CategoryWord>(`/api/categories/${id}/words`, { method: 'POST', auth, body: { text, difficulty } }),

  deleteWord: (auth: AuthSession, id: number, wordId: number) =>
    request<null>(`/api/categories/${id}/words/${wordId}`, { method: 'DELETE', auth }),

  draw: (auth: AuthSession, ids: number[], difficulty: Difficulty | null, count = 30) =>
    request<DrawnWord[]>(
      `/api/categories/draw${query({ ids: ids.join(','), difficulty: difficulty ?? undefined, count: String(count) })}`,
      { auth },
    ),
};

function query(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v);
  return entries.length ? '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&') : '';
}

/** ระบบผู้ดูแล — backend อนุญาตเฉพาะบัญชีที่มีสิทธิ์ ADMIN */
export const adminApi = {
  stats: (auth: AuthSession) => request<AdminStats>('/api/admin/stats', { auth }),

  users: (auth: AuthSession, q?: string) => request<AdminUser[]>(`/api/admin/users${query({ q })}`, { auth }),

  setBanned: (auth: AuthSession, id: number, banned: boolean) =>
    request<AdminUser>(`/api/admin/users/${id}/ban`, { method: 'POST', auth, body: { banned } }),

  setRole: (auth: AuthSession, id: number, role: Role) =>
    request<AdminUser>(`/api/admin/users/${id}/role`, { method: 'POST', auth, body: { role } }),

  deleteUser: (auth: AuthSession, id: number) =>
    request<null>(`/api/admin/users/${id}`, { method: 'DELETE', auth }),

  categories: (auth: AuthSession) => request<CategoryInfo[]>('/api/admin/categories', { auth }),

  createCategory: (auth: AuthSession, name: string, icon: string) =>
    request<CategoryInfo>('/api/admin/categories', { method: 'POST', auth, body: { name, icon } }),

  updateCategory: (auth: AuthSession, id: number, name: string, icon: string, active: boolean) =>
    request<CategoryInfo>(`/api/admin/categories/${id}`, { method: 'PUT', auth, body: { name, icon, active } }),

  deleteCategory: (auth: AuthSession, id: number) =>
    request<null>(`/api/admin/categories/${id}`, { method: 'DELETE', auth }),

  words: (auth: AuthSession, q?: string, categoryId?: number | null) =>
    request<AdminWord[]>(`/api/admin/words${query({ q, categoryId: categoryId ? String(categoryId) : undefined })}`, {
      auth,
    }),

  createWord: (auth: AuthSession, input: WordInput) =>
    request<AdminWord>('/api/admin/words', { method: 'POST', auth, body: input }),

  updateWord: (auth: AuthSession, id: number, input: WordInput) =>
    request<AdminWord>(`/api/admin/words/${id}`, { method: 'PUT', auth, body: input }),

  deleteWord: (auth: AuthSession, id: number) =>
    request<null>(`/api/admin/words/${id}`, { method: 'DELETE', auth }),
};
