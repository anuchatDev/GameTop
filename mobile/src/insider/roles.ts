import { InAnswer, InOutcome, InRole } from './types';

export const roleInfo: Record<InRole, { name: string; emoji: string; color: string; desc: string }> = {
  MASTER: {
    name: 'Master (ผู้คุมเกม)',
    emoji: '🎩',
    color: '#0061FC',
    desc: 'รู้คำปริศนา ตอบคำถามได้แค่ ใช่ / ไม่ใช่ / ไม่เกี่ยว — อยู่ฝ่ายเดียวกับคนธรรมดา',
  },
  INSIDER: {
    name: 'Insider (จอมบงการ)',
    emoji: '🕵️',
    color: '#D91029',
    desc: 'รู้คำปริศนาแต่ต้องแกล้งไม่รู้ แอบนำทางให้ทุกคนทายถูกในเวลา โดยไม่ให้ใครจับได้',
  },
  COMMON: {
    name: 'คนธรรมดา',
    emoji: '🙂',
    color: '#037D5D',
    desc: 'ไม่รู้คำปริศนา ช่วยกันถามจนทายถูก แล้วจับให้ได้ว่าใครคือ Insider',
  },
};

export const answerInfo: Record<InAnswer, { label: string; color: string }> = {
  YES: { label: '⭕ ใช่', color: '#037D5D' },
  NO: { label: '❌ ไม่ใช่', color: '#D91029' },
  IRRELEVANT: { label: '➖ ไม่เกี่ยว', color: '#5F5F73' },
};

export const outcomeInfo: Record<InOutcome, { title: string; bg: string }> = {
  COMMONS_WIN: { title: '🎉 จับ Insider ได้! Master และคนธรรมดาชนะ', bg: '#0A1B3A' },
  INSIDER_WIN: { title: '🕵️ Insider รอดตัว! Insider ชนะ', bg: '#2B0A12' },
  ALL_LOSE: { title: '⌛ หมดเวลา! ทายคำไม่ทัน ทุกคนแพ้', bg: '#333' },
};

export function didWin(outcome: InOutcome, role: InRole | null): boolean {
  if (outcome === 'ALL_LOSE' || !role) return false;
  return outcome === 'INSIDER_WIN' ? role === 'INSIDER' : role !== 'INSIDER';
}
