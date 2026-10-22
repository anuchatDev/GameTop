export type RoomStatus = 'LOBBY' | 'PLAYING' | 'GUESSING' | 'FINISHED';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface CategoryRef {
  id: number;
  name: string;
  icon: string;
}

/** ตั้งค่าห้องโดย Host — categories ว่าง = ทุกหมวดมาตรฐาน, difficulty null = ทุกระดับ */
export interface RoomSettings {
  categories: CategoryRef[];
  difficulty: Difficulty | null;
  /** เวลาต่อรอบ (วินาที) */
  roundSeconds: number;
  /** จำนวนรอบต่อเกม — 0 = ไม่จำกัด */
  totalRounds: number;
}

export interface SettingsInput {
  categoryIds: number[];
  difficulty: Difficulty | null;
  roundSeconds: number;
  totalRounds: number;
}

export interface CategoryInfo {
  id: number;
  name: string;
  icon: string;
  /** true = หมวดมาตรฐาน (ทุกคนใช้ได้), false = หมวดเฉพาะกิจของผู้ใช้ */
  standard: boolean;
  mine: boolean;
  active: boolean;
  ownerName: string | null;
  /** จำนวนคำที่เปิดใช้งานแยกตามระดับ */
  counts: Record<Difficulty, number>;
}

export interface CategoryWord {
  id: number;
  text: string;
  difficulty: Difficulty;
  active: boolean;
}

export interface DrawnWord {
  id: number;
  text: string;
  categoryName: string;
  categoryIcon: string;
  difficulty: Difficulty;
}

export interface PlayerView {
  id: string;
  name: string;
  host: boolean;
  alive: boolean;
  /** null = คำบนหัวตัวเอง (ถูกซ่อนจนจบรอบ) หรือยังไม่เริ่มรอบ */
  word: string | null;
  category: string | null;
  eliminatedById: string | null;
  kills: number;
  guessed: boolean;
  guess: string | null;
  guessCorrect: boolean | null;
  roundScore: number;
  totalScore: number;
  winner: boolean;
}

export interface RoomView {
  code: string;
  status: RoomStatus;
  roundNumber: number;
  roundSeconds: number;
  remainingMs: number;
  minPlayers: number;
  /** 0 = ไม่จำกัด */
  maxPlayers: number;
  youId: string;
  players: PlayerView[];
  settings: RoomSettings;
  /** เล่นครบจำนวนรอบแล้ว */
  gameOver: boolean;
}

export type Role = 'PLAYER' | 'ADMIN';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

/** ผลการล็อกอิน — จำไว้ใน localStorage (เว็บ) เพื่อไม่ต้องล็อกอินใหม่ทุกครั้งที่รีเฟรช */
export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface RoundHistory {
  roomCode: string;
  roundNumber: number;
  word: string;
  survived: boolean;
  kills: number;
  guessCorrect: boolean | null;
  score: number;
  won: boolean;
  playedAt: string;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  role: Role;
  totalScore: number;
  roundsPlayed: number;
  roundsWon: number;
  history: RoundHistory[];
}

export interface AdminStats {
  users: number;
  words: number;
  activeWords: number;
  categories: number;
  activeRooms: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: Role;
  banned: boolean;
  totalScore: number;
  roundsPlayed: number;
  roundsWon: number;
  createdAt: string;
}

export interface AdminWord {
  id: number;
  text: string;
  categoryId: number;
  categoryName: string;
  difficulty: Difficulty;
  pack: string;
  active: boolean;
}

export interface WordInput {
  text: string;
  categoryId: number;
  difficulty: Difficulty;
  active: boolean;
}
