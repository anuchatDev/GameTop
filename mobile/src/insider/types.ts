import { CategoryRef, Difficulty } from '../types';

export type InPhase = 'LOBBY' | 'REVEAL' | 'QUESTIONS' | 'VOTING' | 'RESULT';
export type InRole = 'MASTER' | 'INSIDER' | 'COMMON';
export type InAnswer = 'YES' | 'NO' | 'IRRELEVANT';
export type InOutcome = 'COMMONS_WIN' | 'INSIDER_WIN' | 'ALL_LOSE';

export interface InPlayer {
  id: string;
  name: string;
  host: boolean;
  /** Master เปิดเผยต่อทุกคน */
  master: boolean;
  /** บทบาท — ของคนอื่นเป็น null จนจบเกม (ยกเว้น Master) */
  role: InRole | null;
  voted: boolean;
  /** โหวตใคร — เห็นตอนสรุปผล */
  vote: string | null;
}

export interface InSettings {
  questionSeconds: number;
  categories: CategoryRef[];
  difficulty: Difficulty | null;
}

export interface InLogEntry {
  id: number;
  playerId: string;
  text: string;
  /** true = ทายคำ, false = คำถาม */
  guess: boolean;
  answer: InAnswer | null;
  correct: boolean | null;
}

export interface InsiderView {
  code: string;
  phase: InPhase;
  youId: string;
  players: InPlayer[];
  settings: InSettings;
  minPlayers: number;
  maxPlayers: number;
  phaseRemainingMs: number;
  me: {
    role: InRole | null;
    /** คำปริศนา — เฉพาะ Master / Insider (หรือหลังจบเกม) */
    word: string | null;
    category: string | null;
    vote: string | null;
  };
  log: InLogEntry[];
  /** คนที่ทายคำถูก */
  guesserId: string | null;
  result: {
    outcome: InOutcome;
    word: string | null;
    insiderId: string | null;
    voteCounts: Record<string, number>;
  } | null;
}

export interface InSettingsInput {
  questionSeconds?: number;
  categoryIds?: number[];
  difficulty?: Difficulty | null;
}
