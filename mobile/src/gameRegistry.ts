import { api, avalonApi, insiderApi, ohanaApi, spyfallApi, werewolfApi } from './api/client';
import { storage } from './storage';
import { GameKey, games } from './theme';
import { AuthSession } from './types';

type RoomApi = {
  create: (auth: AuthSession) => Promise<{ code: string }>;
  join: (auth: AuthSession, code: string) => Promise<{ code: string }>;
  get: (auth: AuthSession, code: string) => Promise<{ code: string }>;
};

/** API สร้าง/เข้า/ดูห้องของแต่ละเกม — หน้าแรกใช้ร่วมกันทุกเกม */
export const roomApis: Record<GameKey, RoomApi> = {
  forbidden: { create: api.createRoom, join: api.joinRoom, get: api.getRoom },
  werewolf: werewolfApi,
  ohana: ohanaApi,
  insider: insiderApi,
  spyfall: spyfallApi,
  avalon: avalonApi,
};

export const gameOrder = Object.keys(games) as GameKey[];

/** เล่นได้ไหมด้วยจำนวนคนนี้ */
export function fitsPlayers(game: GameKey, count: number): boolean {
  const g = games[game];
  return count >= g.minPlayers && (g.maxPlayers === 0 || count <= g.maxPlayers);
}

// ---------- ความชอบของผู้ใช้ (เก็บในเบราว์เซอร์) ----------

const PINNED_KEY = 'fw.pinned';
const RECENT_KEY = 'fw.recent';
const LAST_KEY = 'fw.last';

export interface LastRoom {
  game: GameKey;
  code: string;
}

export const prefs = {
  pinned: (): GameKey[] => (storage.get<GameKey[]>(PINNED_KEY) ?? []).filter((g) => g in games),
  togglePin(game: GameKey): GameKey[] {
    const cur = prefs.pinned();
    const next = cur.includes(game) ? cur.filter((g) => g !== game) : [...cur, game];
    storage.set(PINNED_KEY, next);
    return next;
  },
  /** เวลาที่เข้าเล่นแต่ละเกมล่าสุด (ms) */
  recent: (): Partial<Record<GameKey, number>> => storage.get(RECENT_KEY) ?? {},
  /** ห้องล่าสุดที่เข้า — ใช้ทำปุ่ม "เล่นต่อ" */
  last: (): LastRoom | null => {
    const l = storage.get<LastRoom>(LAST_KEY);
    return l && l.game in games ? l : null;
  },
  enteredRoom(game: GameKey, code: string) {
    storage.set(RECENT_KEY, { ...prefs.recent(), [game]: Date.now() });
    storage.set(LAST_KEY, { game, code });
  },
  clearLast: () => storage.remove(LAST_KEY),
};

/** ปักหมุดก่อน → เล่นล่าสุด → ลำดับเดิม */
export function sortGames(list: GameKey[], pinned: GameKey[], recent: Partial<Record<GameKey, number>>): GameKey[] {
  return [...list].sort((a, b) => {
    const pa = pinned.includes(a) ? 1 : 0;
    const pb = pinned.includes(b) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ra = recent[a] ?? 0;
    const rb = recent[b] ?? 0;
    if (ra !== rb) return rb - ra;
    return gameOrder.indexOf(a) - gameOrder.indexOf(b);
  });
}
