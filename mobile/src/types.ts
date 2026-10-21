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

export interface Session {
  roomCode: string;
  playerId: string;
  token: string;
}
