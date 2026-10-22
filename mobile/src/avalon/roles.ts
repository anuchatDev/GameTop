import { colors } from '../theme';
import { AvRole, AvSettings, AvTeam, AvWinReason } from './types';

export const teamInfo: Record<AvTeam, { name: string; color: string; emoji: string }> = {
  GOOD: { name: 'ฝ่ายดี (อัศวินของอาเธอร์)', color: colors.secondary, emoji: '🛡️' },
  EVIL: { name: 'ฝ่ายร้าย (สมุนมอร์เดรด)', color: colors.danger, emoji: '😈' },
};

export const roleInfo: Record<AvRole, { name: string; emoji: string; team: AvTeam; desc: string }> = {
  MERLIN: {
    name: 'เมอร์ลิน',
    emoji: '🧙',
    team: 'GOOD',
    desc: 'รู้ว่าใครเป็นฝ่ายร้าย (ยกเว้นมอร์เดรด) — ชี้นำแบบเนียนๆ ถ้ามือสังหารจับได้ตอนท้าย ฝ่ายดีแพ้',
  },
  PERCIVAL: {
    name: 'เพอร์ซิวาล',
    emoji: '🛡️',
    team: 'GOOD',
    desc: 'เห็นเมอร์ลินกับมอร์แกนา แต่แยกไม่ออกว่าใครเป็นใคร — ช่วยปกป้องเมอร์ลินตัวจริง',
  },
  SERVANT: {
    name: 'อัศวินผู้ภักดี',
    emoji: '🙂',
    team: 'GOOD',
    desc: 'ไม่มีพลังพิเศษ — สังเกตคำพูดและการโหวต แล้วเลือกทีมที่ไว้ใจได้',
  },
  ASSASSIN: {
    name: 'มือสังหาร',
    emoji: '🗡️',
    team: 'EVIL',
    desc: 'ถ้าฝ่ายดีทำภารกิจสำเร็จครบ 3 ครั้ง คุณได้ชี้ตัวเมอร์ลิน — ชี้ถูก ฝ่ายร้ายพลิกชนะ',
  },
  MORGANA: {
    name: 'มอร์แกนา',
    emoji: '🔮',
    team: 'EVIL',
    desc: 'เพอร์ซิวาลเห็นคุณเหมือนเป็นเมอร์ลิน — ปลอมตัวให้เพอร์ซิวาลสับสน',
  },
  MORDRED: {
    name: 'มอร์เดรด',
    emoji: '👑',
    team: 'EVIL',
    desc: 'เมอร์ลินมองไม่เห็นว่าคุณเป็นฝ่ายร้าย',
  },
  OBERON: {
    name: 'โอเบอรอน',
    emoji: '👻',
    team: 'EVIL',
    desc: 'ฝ่ายร้ายที่ไม่รู้ว่าพวกเดียวกันคือใคร และพวกเดียวกันก็ไม่รู้ว่าคุณคือใคร (เมอร์ลินเห็นคุณ)',
  },
  MINION: {
    name: 'สมุนมอร์เดรด',
    emoji: '😈',
    team: 'EVIL',
    desc: 'รู้จักฝ่ายร้ายด้วยกัน — แฝงตัวเข้าทีมแล้วทำให้ภารกิจล้มเหลว',
  },
};

export const optionalRoles: (keyof AvSettings)[] = ['percival', 'morgana', 'mordred', 'oberon'];
export const optionalRole: Record<keyof AvSettings, AvRole> = {
  percival: 'PERCIVAL',
  morgana: 'MORGANA',
  mordred: 'MORDRED',
  oberon: 'OBERON',
};

export const winText: Record<AvWinReason, string> = {
  QUESTS_FAILED: 'ภารกิจล้มเหลวครบ 3 ครั้ง',
  FIVE_REJECTS: 'ทีมไม่ผ่านการโหวตติดกัน 5 ครั้ง',
  MERLIN_ASSASSINATED: 'มือสังหารชี้ตัวเมอร์ลินได้ถูกต้อง!',
  MERLIN_SURVIVED: 'ภารกิจสำเร็จครบ 3 และมือสังหารชี้ผิดคน',
};

/** จำนวนฝ่ายร้ายตามจำนวนผู้เล่น 5-10 (ตรงกับ AvalonRules.java) */
export function evilCount(players: number): number {
  return [2, 2, 3, 3, 3, 4][Math.min(10, Math.max(5, players)) - 5];
}

/** บทบาทที่จะถูกแจก — ตรงกับ AvalonService.rolesFor */
export function rolesFor(players: number, s: AvSettings): AvRole[] {
  const n = Math.min(10, Math.max(5, players));
  const good: AvRole[] = ['MERLIN'];
  if (s.percival) good.push('PERCIVAL');
  while (good.length < n - evilCount(n)) good.push('SERVANT');
  const evil: AvRole[] = ['ASSASSIN'];
  if (s.morgana) evil.push('MORGANA');
  if (s.mordred) evil.push('MORDRED');
  if (s.oberon) evil.push('OBERON');
  while (evil.length < evilCount(n)) evil.push('MINION');
  return [...good, ...evil];
}

/** รวมบทบาทซ้ำเป็น "อัศวินผู้ภักดี ×3" */
export function summarize(roles: AvRole[]): string {
  const counts = new Map<AvRole, number>();
  roles.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
  return [...counts].map(([r, c]) => `${roleInfo[r].emoji} ${roleInfo[r].name}${c > 1 ? ` ×${c}` : ''}`).join('  ·  ');
}
