import { RoomView, Session } from '../types';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface JoinResponse {
  roomCode: string;
  playerId: string;
  token: string;
}

async function request<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers['X-Player-Token'] = options.token;
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
    throw new ApiError(data?.error ?? `เกิดข้อผิดพลาด (${res.status})`, res.status);
  }
  return data as T;
}

function roomPath(session: Session, suffix = '') {
  return `/api/rooms/${encodeURIComponent(session.roomCode)}${suffix}`;
}

export const api = {
  createRoom: (name: string) => request<JoinResponse>('/api/rooms', { method: 'POST', body: { name } }),

  joinRoom: (code: string, name: string) =>
    request<JoinResponse>(`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/players`, {
      method: 'POST',
      body: { name },
    }),

  getRoom: (s: Session) => request<RoomView>(roomPath(s), { token: s.token }),

  startRound: (s: Session) => request<RoomView>(roomPath(s, '/start'), { method: 'POST', token: s.token }),

  reportKill: (s: Session, victimId: string, killerId: string | null) =>
    request<RoomView>(roomPath(s, '/kills'), { method: 'POST', token: s.token, body: { victimId, killerId } }),

  submitGuess: (s: Session, guess: string) =>
    request<RoomView>(roomPath(s, '/guess'), { method: 'POST', token: s.token, body: { guess } }),

  endRound: (s: Session) => request<RoomView>(roomPath(s, '/end'), { method: 'POST', token: s.token }),
};
