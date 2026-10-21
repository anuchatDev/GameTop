export type RoomStatus = 'LOBBY' | 'PLAYING' | 'GUESSING' | 'FINISHED';

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
  maxPlayers: number;
  youId: string;
  players: PlayerView[];
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
  category: string;
  pack: string;
  active: boolean;
}

export interface WordInput {
  text: string;
  category: string;
  pack: string;
  active: boolean;
}
