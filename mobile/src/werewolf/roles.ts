import { NightStep, Winner, WwRole } from './types';

export interface RoleInfo {
  name: string;
  emoji: string;
  team: 'VILLAGE' | 'WEREWOLF';
  max: number;
  desc: string;
}

/** ลำดับเดียวกับ backend (WwRole) */
export const roleOrder: WwRole[] = [
  'WEREWOLF',
  'MINION',
  'MASON',
  'SEER',
  'ROBBER',
  'TROUBLEMAKER',
  'DRUNK',
  'INSOMNIAC',
  'VILLAGER',
];

export const roleInfo: Record<WwRole, RoleInfo> = {
  WEREWOLF: { name: 'หมาป่า', emoji: '🐺', team: 'WEREWOLF', max: 2, desc: 'ตื่นมาดูว่าใครเป็นหมาป่าด้วยกัน (ถ้าตัวเดียวดูการ์ดกลางได้ 1 ใบ) — อย่าให้ใครจับได้!' },
  MINION: { name: 'ลูกน้องหมาป่า', emoji: '🦊', team: 'WEREWOLF', max: 1, desc: 'รู้ว่าใครเป็นหมาป่า ช่วยปกป้องหมาป่า — ถ้าตัวเองโดนโหวตตายแทน ฝั่งหมาป่าก็ยังชนะ' },
  MASON: { name: 'ช่างอิฐ', emoji: '🧱', team: 'VILLAGE', max: 2, desc: 'ตื่นมาดูว่าช่างอิฐอีกคนคือใคร' },
  SEER: { name: 'นักพยากรณ์', emoji: '🔮', team: 'VILLAGE', max: 1, desc: 'ดูการ์ดของผู้เล่น 1 คน หรือการ์ดกลางโต๊ะ 2 ใบ' },
  ROBBER: { name: 'จอมโจร', emoji: '🦹', team: 'VILLAGE', max: 1, desc: 'ขโมยการ์ดผู้เล่น 1 คนมาเป็นของตัวเอง แล้วดูว่ากลายเป็นอะไร' },
  TROUBLEMAKER: { name: 'ตัวป่วน', emoji: '😈', team: 'VILLAGE', max: 1, desc: 'สลับการ์ดของผู้เล่นอื่น 2 คน (ไม่ได้ดูการ์ด)' },
  DRUNK: { name: 'คนขี้เมา', emoji: '🍺', team: 'VILLAGE', max: 1, desc: 'ต้องสลับการ์ดตัวเองกับการ์ดกลาง 1 ใบ โดยไม่รู้ว่าได้อะไร' },
  INSOMNIAC: { name: 'คนนอนไม่หลับ', emoji: '😳', team: 'VILLAGE', max: 1, desc: 'ตื่นตอนท้ายสุดเพื่อดูว่าการ์ดตัวเองถูกสลับไปหรือยัง' },
  VILLAGER: { name: 'ชาวบ้าน', emoji: '🧑‍🌾', team: 'VILLAGE', max: 3, desc: 'ไม่มีพลังพิเศษ — ใช้การพูดคุยจับหมาป่าให้ได้' },
};

export const teamColor = { VILLAGE: '#0061FC', WEREWOLF: '#D91029' } as const;

export function roleLabel(role: WwRole | null | undefined): string {
  return role ? `${roleInfo[role].emoji} ${roleInfo[role].name}` : '?';
}

export function stepLabel(step: NightStep): string {
  if (step === 'SLEEP') return 'ทุกคนหลับตา';
  if (step === 'WAKE') return 'ใกล้เช้าแล้ว';
  return `${roleLabel(step as WwRole)} ตื่น`;
}

const openText: Record<NightStep, string> = {
  SLEEP: 'ทุกคน หลับตาลง และคว่ำโทรศัพท์ไว้ตรงหน้า',
  WEREWOLF: 'หมาป่า ลืมตาขึ้น และมองหาหมาป่าตัวอื่น ถ้ามีหมาป่าตัวเดียว ให้แอบดูการ์ดกลางโต๊ะได้หนึ่งใบ',
  MINION: 'ลูกน้องหมาป่า ลืมตาขึ้น และดูหน้าจอว่าใครคือหมาป่า',
  MASON: 'ช่างอิฐ ลืมตาขึ้น และมองหาช่างอิฐอีกคน',
  SEER: 'นักพยากรณ์ ลืมตาขึ้น เลือกดูการ์ดของผู้เล่นหนึ่งคน หรือการ์ดกลางโต๊ะสองใบ',
  ROBBER: 'จอมโจร ลืมตาขึ้น เลือกขโมยการ์ดของผู้เล่นหนึ่งคน แล้วดูการ์ดใหม่ของคุณ',
  TROUBLEMAKER: 'ตัวป่วน ลืมตาขึ้น เลือกสลับการ์ดของผู้เล่นอื่นสองคน',
  DRUNK: 'คนขี้เมา ลืมตาขึ้น เลือกการ์ดกลางโต๊ะหนึ่งใบ เพื่อสลับกับการ์ดของคุณ',
  INSOMNIAC: 'คนนอนไม่หลับ ลืมตาขึ้น และดูการ์ดของตัวเองอีกครั้ง',
  WAKE: 'ทุกคน ลืมตาตื่นขึ้นมาในตอนเช้า',
};

/** ข้อความผู้ดำเนินเกมเมื่อเข้าสู่ขั้นนี้ (ปิดท้ายบทบาทก่อนหน้าด้วย "...หลับตาลง") */
export function narrationFor(step: NightStep, previous: NightStep | null): string {
  const close =
    previous && previous !== 'SLEEP' && previous !== 'WAKE' ? `${roleInfo[previous as WwRole].name} หลับตาลง. ` : '';
  return close + openText[step];
}

export const winnerText: Record<Winner, string> = {
  VILLAGE: '🏡 ฝั่งชาวบ้านชนะ!',
  WEREWOLF: '🐺 ฝั่งหมาป่าชนะ!',
  NONE: '😶 ไม่มีใครชนะ',
};
