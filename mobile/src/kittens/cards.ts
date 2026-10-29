import { EkActionKind, EkCardType } from './types';

/**
 * หน้าตาการ์ดแต่ละแบบ — สีพื้นการ์ดใช้คู่กับตัวหนังสือสีเข้ม (contrast ≥ 4.5:1)
 */
export const cardInfo: Record<EkCardType, { name: string; emoji: string; bg: string; desc: string }> = {
  EXPLODING_KITTEN: { name: 'แมวระเบิด', emoji: '💣', bg: '#FFB3B3', desc: 'จั่วเจอแล้วไม่มีกู้ระเบิด = ตกรอบ' },
  DEFUSE: { name: 'กู้ระเบิด', emoji: '🧯', bg: '#B8F2C9', desc: 'ใช้อัตโนมัติเมื่อจั่วเจอแมวระเบิด แล้วแอบใส่แมวกลับกองตรงไหนก็ได้' },
  ATTACK: { name: 'โจมตี', emoji: '⚔️', bg: '#FFC48C', desc: 'จบตาโดยไม่จั่ว คนถัดไปต้องเล่น 2 ตา (โจมตีซ้อน = ตาค้าง + 2)' },
  SKIP: { name: 'ข้าม', emoji: '⏭️', bg: '#B3D4FF', desc: 'จบตา 1 ตาโดยไม่ต้องจั่ว' },
  FAVOR: { name: 'ขอหน่อย', emoji: '🤲', bg: '#E6C9FF', desc: 'บังคับเพื่อน 1 คนให้การ์ดคุณ 1 ใบ (เขาเลือกเอง)' },
  SHUFFLE: { name: 'สับกอง', emoji: '🔀', bg: '#FFE68C', desc: 'สับกองจั่วใหม่ (ใครแอบดูไว้ก็ใช้ไม่ได้แล้ว)' },
  SEE_THE_FUTURE: { name: 'มองอนาคต', emoji: '🔮', bg: '#C9C9FF', desc: 'แอบดูการ์ด 3 ใบบนสุดของกอง (เห็นคนเดียว)' },
  NOPE: { name: 'ไม่!', emoji: '🙅', bg: '#FF9EC4', desc: 'ยกเลิกการกระทำล่าสุด เล่นได้ตลอดแม้ไม่ใช่ตาตัวเอง' },
  TACOCAT: { name: 'แมวทาโก้', emoji: '🌮', bg: '#F2E0C9', desc: 'แมวธรรมดา — 2 ใบเหมือนกัน ขโมยสุ่ม / 3 ใบ ขอตามชื่อ' },
  CATTERMELON: { name: 'แมวแตงโม', emoji: '🍉', bg: '#F2E0C9', desc: 'แมวธรรมดา — 2 ใบเหมือนกัน ขโมยสุ่ม / 3 ใบ ขอตามชื่อ' },
  POTATO_CAT: { name: 'แมวมันฝรั่ง', emoji: '🥔', bg: '#F2E0C9', desc: 'แมวธรรมดา — 2 ใบเหมือนกัน ขโมยสุ่ม / 3 ใบ ขอตามชื่อ' },
  BEARD_CAT: { name: 'แมวเครา', emoji: '🧔', bg: '#F2E0C9', desc: 'แมวธรรมดา — 2 ใบเหมือนกัน ขโมยสุ่ม / 3 ใบ ขอตามชื่อ' },
  RAINBOW_CAT: { name: 'แมวสายรุ้ง', emoji: '🌈', bg: '#F2E0C9', desc: 'แมวธรรมดา — 2 ใบเหมือนกัน ขโมยสุ่ม / 3 ใบ ขอตามชื่อ' },
};

export const actionTypes: EkCardType[] = ['ATTACK', 'SKIP', 'FAVOR', 'SHUFFLE', 'SEE_THE_FUTURE'];
export const catTypes: EkCardType[] = ['TACOCAT', 'CATTERMELON', 'POTATO_CAT', 'BEARD_CAT', 'RAINBOW_CAT'];
/** การ์ดที่ขอได้ด้วยแมว 3 ใบ */
export const namedChoices: EkCardType[] = ['DEFUSE', 'NOPE', 'ATTACK', 'SKIP', 'FAVOR', 'SHUFFLE', 'SEE_THE_FUTURE', ...catTypes];

export const actionLabel: Record<EkActionKind, string> = {
  ATTACK: '⚔️ โจมตี',
  SKIP: '⏭️ ข้าม',
  FAVOR: '🤲 ขอหน่อย',
  SHUFFLE: '🔀 สับกอง',
  SEE_THE_FUTURE: '🔮 มองอนาคต',
  PAIR: '🐱🐱 แมวคู่ (ขโมยสุ่ม)',
  TRIPLE: '🐱🐱🐱 แมว 3 ใบ (ขอตามชื่อ)',
};
