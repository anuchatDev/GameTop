export type SfPhase = 'LOBBY' | 'PLAYING' | 'ACCUSING' | 'VOTING' | 'RESULT';
export type SfOutcome = 'LOCALS_WIN' | 'SPY_WIN';
export type SfEndReason = 'VOTE' | 'ACCUSATION' | 'SPY_GUESS';

export interface SfPlayer {
  id: string;
  name: string;
  host: boolean;
  /** ใช้สิทธิ์กล่าวหาในรอบนี้ไปแล้ว */
  accused: boolean;
  /** โหวตแล้ว (ตอนกล่าวหา / ตอนหมดเวลา) */
  voted: boolean;
  /** เปิดเผยตอนจบรอบเท่านั้น */
  spy: boolean | null;
  role: string | null;
  vote: string | null;
}

export interface SfLocation {
  name: string;
  icon: string;
}

export interface SpyfallView {
  code: string;
  phase: SfPhase;
  youId: string;
  players: SfPlayer[];
  settings: { roundSeconds: number };
  minPlayers: number;
  maxPlayers: number;
  phaseRemainingMs: number;
  locations: SfLocation[];
  me: {
    spy: boolean;
    /** null ถ้าเป็นสปาย */
    location: string | null;
    locationIcon: string | null;
    role: string | null;
    vote: string | null;
  };
  /** คนที่ถึงตาถาม และคนที่เพิ่งถามเขา (ห้ามถามกลับ) */
  askerId: string | null;
  previousAskerId: string | null;
  accusation: { accuserId: string; suspectId: string; votes: Record<string, boolean> } | null;
  result: {
    outcome: SfOutcome;
    reason: SfEndReason;
    location: string;
    spyId: string | null;
    spyGuess: string | null;
    suspectId: string | null;
    voteCounts: Record<string, number>;
  } | null;
}
