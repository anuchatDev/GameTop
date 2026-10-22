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
import { AvalonView, AvSettings, AvStats } from '../avalon/types';
import { InAnswer, InSettingsInput, InsiderView } from '../insider/types';
import { OhanaView } from '../ohana/types';
import { SpyfallView } from '../spyfall/types';
import { WwRole, WwView } from '../werewolf/types';

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
  /** หาว่ารหัสห้องเป็นของเกมไหน (ปกติได้เกมเดียว) */
  lookupRoom: (auth: AuthSession, code: string) =>
    request<{ code: string; games: string[] }>(`/api/rooms/lookup/${encodeURIComponent(code.trim().toUpperCase())}`, { auth }),

  register: (username: string, email: string, password: string) =>
    request<AuthSession>('/api/auth/register', { method: 'POST', body: { username, email, password } }),

  /** ปุ่มเข้าสู่ระบบที่เปิดไว้ (client id ของ Google / LINE) และเปิดลืมรหัสผ่านหรือยัง */
  providers: () =>
    request<{ googleClientId: string | null; lineChannelId: string | null; passwordReset: boolean }>('/api/auth/providers'),

  google: (credential: string) => request<AuthSession>('/api/auth/google', { method: 'POST', body: { credential } }),

  line: (code: string, redirectUri: string) =>
    request<AuthSession>('/api/auth/line', { method: 'POST', body: { code, redirectUri } }),

  forgotPassword: (email: string) => request<null>('/api/auth/forgot', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    request<AuthSession>('/api/auth/reset', { method: 'POST', body: { token, password } }),

  /** เล่นแบบไม่สมัคร — กรอกแค่ชื่อเล่น */
  guest: (nickname: string) => request<AuthSession>('/api/auth/guest', { method: 'POST', body: { nickname } }),

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

function wwPath(code: string, suffix = '') {
  return `/api/werewolf/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

/** เกม One Night Werewolf */
export const werewolfApi = {
  create: (auth: AuthSession) => request<WwView>('/api/werewolf/rooms', { method: 'POST', auth }),

  join: (auth: AuthSession, code: string) => request<WwView>(wwPath(code, '/players'), { method: 'POST', auth }),

  get: (auth: AuthSession, code: string) => request<WwView>(wwPath(code), { auth }),

  settings: (
    auth: AuthSession,
    code: string,
    body: { roles?: Record<WwRole, number>; discussionSeconds?: number; nightStepSeconds?: number },
  ) => request<WwView>(wwPath(code, '/settings'), { method: 'POST', auth, body }),

  start: (auth: AuthSession, code: string) => request<WwView>(wwPath(code, '/start'), { method: 'POST', auth }),

  night: (auth: AuthSession, code: string, playerIds: string[], centerIndexes: number[]) =>
    request<WwView>(wwPath(code, '/night'), { method: 'POST', auth, body: { playerIds, centerIndexes } }),

  skip: (auth: AuthSession, code: string) => request<WwView>(wwPath(code, '/skip'), { method: 'POST', auth }),

  vote: (auth: AuthSession, code: string, target: string) =>
    request<WwView>(wwPath(code, '/vote'), { method: 'POST', auth, body: { target } }),

  endVote: (auth: AuthSession, code: string) =>
    request<WwView>(wwPath(code, '/end-vote'), { method: 'POST', auth }),

  again: (auth: AuthSession, code: string) => request<WwView>(wwPath(code, '/again'), { method: 'POST', auth }),
};

function ohPath(code: string, suffix = '') {
  return `/api/ohana/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

/** เกมไพ่ OHANA */
export const ohanaApi = {
  create: (auth: AuthSession) => request<OhanaView>('/api/ohana/rooms', { method: 'POST', auth }),
  join: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/players'), { method: 'POST', auth }),
  get: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code), { auth }),
  settings: (auth: AuthSession, code: string, body: { penalty?: string; kingRules?: string[] }) =>
    request<OhanaView>(ohPath(code, '/settings'), { method: 'POST', auth, body }),
  start: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/start'), { method: 'POST', auth }),
  end: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/end'), { method: 'POST', auth }),
  draw: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/draw'), { method: 'POST', auth }),
  pick: (auth: AuthSession, code: string, playerIds: string[]) =>
    request<OhanaView>(ohPath(code, '/pick'), { method: 'POST', auth, body: { playerIds } }),
  duelLoser: (auth: AuthSession, code: string, playerId: string) =>
    request<OhanaView>(ohPath(code, '/duel-loser'), { method: 'POST', auth, body: { playerId } }),
  face: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/face'), { method: 'POST', auth }),
  skip: (auth: AuthSession, code: string) => request<OhanaView>(ohPath(code, '/skip'), { method: 'POST', auth }),
  faceLoser: (auth: AuthSession, code: string, playerId: string) =>
    request<OhanaView>(ohPath(code, '/face-loser'), { method: 'POST', auth, body: { playerId } }),
  addGuest: (auth: AuthSession, code: string, name: string) =>
    request<OhanaView>(ohPath(code, '/guests'), { method: 'POST', auth, body: { name } }),
  removeGuest: (auth: AuthSession, code: string, playerId: string) =>
    request<OhanaView>(ohPath(code, '/guests/remove'), { method: 'POST', auth, body: { playerId } }),
};

function inPath(code: string, suffix = '') {
  return `/api/insider/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

/** เกม Insider (จอมบงการ) */
export const insiderApi = {
  create: (auth: AuthSession) => request<InsiderView>('/api/insider/rooms', { method: 'POST', auth }),
  join: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code, '/players'), { method: 'POST', auth }),
  get: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code), { auth }),
  settings: (auth: AuthSession, code: string, body: InSettingsInput) =>
    request<InsiderView>(inPath(code, '/settings'), { method: 'POST', auth, body }),
  start: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code, '/start'), { method: 'POST', auth }),
  begin: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code, '/begin'), { method: 'POST', auth }),
  ask: (auth: AuthSession, code: string, text: string) =>
    request<InsiderView>(inPath(code, '/ask'), { method: 'POST', auth, body: { text } }),
  answer: (auth: AuthSession, code: string, entryId: number, answer: InAnswer) =>
    request<InsiderView>(inPath(code, '/answer'), { method: 'POST', auth, body: { entryId, answer } }),
  guess: (auth: AuthSession, code: string, text: string) =>
    request<InsiderView>(inPath(code, '/guess'), { method: 'POST', auth, body: { text } }),
  correct: (auth: AuthSession, code: string, playerId: string) =>
    request<InsiderView>(inPath(code, '/correct'), { method: 'POST', auth, body: { playerId } }),
  vote: (auth: AuthSession, code: string, playerId: string) =>
    request<InsiderView>(inPath(code, '/vote'), { method: 'POST', auth, body: { playerId } }),
  endVote: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code, '/end-vote'), { method: 'POST', auth }),
  again: (auth: AuthSession, code: string) => request<InsiderView>(inPath(code, '/again'), { method: 'POST', auth }),
};

function sfPath(code: string, suffix = '') {
  return `/api/spyfall/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

/** เกม Spyfall */
export const spyfallApi = {
  create: (auth: AuthSession) => request<SpyfallView>('/api/spyfall/rooms', { method: 'POST', auth }),
  join: (auth: AuthSession, code: string) => request<SpyfallView>(sfPath(code, '/players'), { method: 'POST', auth }),
  get: (auth: AuthSession, code: string) => request<SpyfallView>(sfPath(code), { auth }),
  settings: (auth: AuthSession, code: string, body: { roundSeconds: number }) =>
    request<SpyfallView>(sfPath(code, '/settings'), { method: 'POST', auth, body }),
  start: (auth: AuthSession, code: string) => request<SpyfallView>(sfPath(code, '/start'), { method: 'POST', auth }),
  ask: (auth: AuthSession, code: string, playerId: string) =>
    request<SpyfallView>(sfPath(code, '/ask'), { method: 'POST', auth, body: { playerId } }),
  accuse: (auth: AuthSession, code: string, playerId: string) =>
    request<SpyfallView>(sfPath(code, '/accuse'), { method: 'POST', auth, body: { playerId } }),
  accuseVote: (auth: AuthSession, code: string, agree: boolean) =>
    request<SpyfallView>(sfPath(code, '/accuse-vote'), { method: 'POST', auth, body: { agree } }),
  spyGuess: (auth: AuthSession, code: string, location: string) =>
    request<SpyfallView>(sfPath(code, '/spy-guess'), { method: 'POST', auth, body: { location } }),
  vote: (auth: AuthSession, code: string, playerId: string) =>
    request<SpyfallView>(sfPath(code, '/vote'), { method: 'POST', auth, body: { playerId } }),
  endVote: (auth: AuthSession, code: string) => request<SpyfallView>(sfPath(code, '/end-vote'), { method: 'POST', auth }),
  again: (auth: AuthSession, code: string) => request<SpyfallView>(sfPath(code, '/again'), { method: 'POST', auth }),
};

function avPath(code: string, suffix = '') {
  return `/api/avalon/rooms/${encodeURIComponent(code.trim().toUpperCase())}${suffix}`;
}

/** เกม Avalon */
export const avalonApi = {
  create: (auth: AuthSession) => request<AvalonView>('/api/avalon/rooms', { method: 'POST', auth }),
  join: (auth: AuthSession, code: string) => request<AvalonView>(avPath(code, '/players'), { method: 'POST', auth }),
  get: (auth: AuthSession, code: string) => request<AvalonView>(avPath(code), { auth }),
  settings: (auth: AuthSession, code: string, body: AvSettings) =>
    request<AvalonView>(avPath(code, '/settings'), { method: 'POST', auth, body }),
  start: (auth: AuthSession, code: string) => request<AvalonView>(avPath(code, '/start'), { method: 'POST', auth }),
  propose: (auth: AuthSession, code: string, playerIds: string[]) =>
    request<AvalonView>(avPath(code, '/propose'), { method: 'POST', auth, body: { playerIds } }),
  vote: (auth: AuthSession, code: string, approve: boolean) =>
    request<AvalonView>(avPath(code, '/vote'), { method: 'POST', auth, body: { approve } }),
  quest: (auth: AuthSession, code: string, success: boolean) =>
    request<AvalonView>(avPath(code, '/quest'), { method: 'POST', auth, body: { success } }),
  assassinate: (auth: AuthSession, code: string, playerId: string) =>
    request<AvalonView>(avPath(code, '/assassinate'), { method: 'POST', auth, body: { playerId } }),
  again: (auth: AuthSession, code: string) => request<AvalonView>(avPath(code, '/again'), { method: 'POST', auth }),
  /** สถิติของฉัน (อัตราชนะ, บทบาทที่ได้บ่อย) */
  myStats: (auth: AuthSession) => request<AvStats>('/api/avalon/stats/me', { auth }),
};
