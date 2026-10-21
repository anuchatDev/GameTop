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

export interface AuthUser {
  id: number;
  username: string;
}

/** ผลการล็อกอิน — เก็บไว้ในหน่วยความจำเท่านั้น (ปิด/รีเฟรชหน้าต้องล็อกอินใหม่) */
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
  totalScore: number;
  roundsPlayed: number;
  roundsWon: number;
  history: RoundHistory[];
}
