export const colors = {
  bg: '#FFF4D6',
  card: '#FFFFFF',
  text: '#22223B',
  muted: '#6C6C80',
  primary: '#FF4D6D',
  secondary: '#3A86FF',
  accent: '#FFBE0B',
  success: '#06D6A0',
  danger: '#EF233C',
  disabled: '#C9C9D6',
};

/** สีประจำตัวผู้เล่นแต่ละคน (สูงสุด 6 คน) */
export const playerColors = ['#FF4D6D', '#3A86FF', '#FFBE0B', '#06D6A0', '#8338EC', '#FB5607'];

export function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}
