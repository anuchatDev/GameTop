export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export interface OhanaPlayer {
  id: string;
  name: string;
  host: boolean;
  /** ได้ Q อยู่ — ห้ามใครคุยด้วย */
  queen: boolean;
  /** แพ้ดวลปอดล่าสุด — ผูกผ้าพันคอ */
  scarf: boolean;
  buddyIds: string[];
  /** เพื่อนที่ Host เพิ่มชื่อเอง (โหมดมือถือเครื่องเดียว) — Host กดแทน */
  guest: boolean;
}

export interface OhanaCurrent {
  rank: string;
  suit: Suit;
  title: string;
  instruction: string;
  drawerId: string;
  targetIds: string[];
  picksNeeded: number;
  pickedIds: string[];
  duelLoserId: string | null;
  minigame: string | null;
  kingRule: string | null;
  faceOrder: string[];
  faceLoserId: string | null;
  note: string | null;
}

export interface OhanaView {
  code: string;
  phase: 'LOBBY' | 'PLAYING';
  youId: string;
  players: OhanaPlayer[];
  penalty: string;
  kingRules: string[];
  deckRemaining: number;
  deckNumber: number;
  turnId: string | null;
  current: OhanaCurrent | null;
  history: { drawerName: string; rank: string; suit: Suit; summary: string }[];
}

export const suitSymbol: Record<Suit, string> = { SPADES: '♠', HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣' };

export function isRed(suit: Suit) {
  return suit === 'HEARTS' || suit === 'DIAMONDS';
}

/** คำสั่งของแต่ละแต้ม (ใช้ในคู่มือ) */
export const cardRules: { rank: string; title: string; desc: string }[] = [
  { rank: 'A', title: 'โดนคนเดียว', desc: 'คนจั่วโดนคนเดียว' },
  { rank: '2', title: 'หาเพื่อนโดนด้วย 1 คน', desc: 'คนจั่วเลือกเพื่อน 1 คนมาโดนด้วยกัน' },
  { rank: '3', title: 'หาเพื่อนโดนด้วย 2 คน', desc: 'คนจั่วเลือกเพื่อน 2 คนมาโดนด้วยกัน' },
  { rank: '4', title: 'เพื่อนฝั่งซ้ายโดน', desc: 'คนที่นั่งฝั่งซ้ายของคนจั่วโดน' },
  { rank: '5', title: 'ห้าเฮฮา', desc: 'โดนทุกคน!' },
  { rank: '6', title: 'เพื่อนฝั่งขวาโดน', desc: 'คนที่นั่งฝั่งขวาของคนจั่วโดน' },
  {
    rank: '7',
    title: 'ดวลปอด',
    desc: 'หาคู่ประลอง ใครลากเสียงยาวที่สุดชนะ คนแพ้โดนและผูกผ้าพันคอ 🧣 — ถ้าคนใส่ผ้าพันคอแพ้ดวลครั้งถัดไปอีก จะกลายเป็นบัดดี้ 🤝 กับคนที่จั่ว 7 ครั้งก่อน (บัดดี้โดนด้วยกันตลอด)',
  },
  { rank: '8', title: 'Relax', desc: 'ทุกคนพักผ่อนได้ตามอัธยาศัย' },
  { rank: '9', title: 'มินิเกม', desc: 'เปิดการ์ดมินิเกม ใครเล่นแพ้โดนทำโทษ' },
  { rank: '10', title: 'เลอะ', desc: 'คนจั่วโดนแป้งโปะหน้า' },
  { rank: 'J', title: 'จับหน้า', desc: 'ทุกคนรีบกดปุ่ม "จับหน้า" (และจับหน้าจริงๆ) ใครช้าที่สุดโดน' },
  { rank: 'Q', title: 'แหม่มเพื่อนไม่คบ', desc: 'ห้ามใครคุยหรือตอบคำถามคนที่ได้ Q 👸 ใครเผลอคุยด้วยโดน (จนกว่าจะมีคนได้ Q ใบใหม่)' },
  { rank: 'K', title: 'กฎของวง', desc: 'ทำตามกฎที่ตกลงกันไว้ก่อนเริ่มเกม (Host ตั้งไว้ในห้อง)' },
];
