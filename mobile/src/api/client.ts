import { AuthSession, Profile, RoomView } from '../types';

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

  const data = await res.json().catch(() => null);
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

  startRound: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code, '/start'), { method: 'POST', auth }),

  reportKill: (auth: AuthSession, code: string, victimId: string, killerId: string | null) =>
    request<RoomView>(roomPath(code, '/kills'), { method: 'POST', auth, body: { victimId, killerId } }),

  submitGuess: (auth: AuthSession, code: string, guess: string) =>
    request<RoomView>(roomPath(code, '/guess'), { method: 'POST', auth, body: { guess } }),

  endRound: (auth: AuthSession, code: string) => request<RoomView>(roomPath(code, '/end'), { method: 'POST', auth }),
};
