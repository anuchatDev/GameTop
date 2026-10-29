export type EkCardType =
  | 'EXPLODING_KITTEN'
  | 'DEFUSE'
  | 'ATTACK'
  | 'SKIP'
  | 'FAVOR'
  | 'SHUFFLE'
  | 'SEE_THE_FUTURE'
  | 'NOPE'
  | 'TACOCAT'
  | 'CATTERMELON'
  | 'POTATO_CAT'
  | 'BEARD_CAT'
  | 'RAINBOW_CAT';

export type EkActionKind = 'ATTACK' | 'SKIP' | 'FAVOR' | 'SHUFFLE' | 'SEE_THE_FUTURE' | 'PAIR' | 'TRIPLE';

export interface EkCard {
  id: number;
  type: EkCardType;
}

export interface EkPlayer {
  id: string;
  name: string;
  host: boolean;
  alive: boolean;
  handCount: number;
}

export interface KittensView {
  code: string;
  phase: 'LOBBY' | 'PLAYING' | 'RESULT';
  youId: string;
  players: EkPlayer[];
  minPlayers: number;
  maxPlayers: number;
  currentId: string | null;
  /** ตาที่เหลือของคนปัจจุบัน (โดนโจมตี = มากกว่า 1) */
  turnsLeft: number;
  deckCount: number;
  kittensInDeck: number;
  discardTop: EkCardType | null;
  discardCount: number;
  /** การกระทำที่รอคนเล่น "ไม่!" — nopes คี่ = ถูกยกเลิก */
  pending: {
    kind: EkActionKind;
    playerId: string;
    targetId: string | null;
    named: EkCardType | null;
    nopes: number;
    remainingMs: number;
  } | null;
  /** รอใครตัดสินใจ: FAVOR = เลือกการ์ดให้ / DEFUSE = ใส่แมวระเบิดกลับกอง */
  waiting: { kind: 'FAVOR' | 'DEFUSE'; playerId: string; forId: string | null; remainingMs: number } | null;
  me: { hand: EkCard[]; peek: EkCardType[]; alive: boolean };
  log: string[];
  winnerId: string | null;
}
