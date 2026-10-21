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

/** สีประจำตัวผู้เล่น 6 คนแรก */
const basePlayerColors = ['#FF4D6D', '#3A86FF', '#FFBE0B', '#06D6A0', '#8338EC', '#FB5607'];

/**
 * สีของผู้เล่นคนที่ index — 6 คนแรกใช้ชุดสีหลัก คนถัดไปสร้างสีใหม่ไม่ซ้ำ
 * โดยหมุนเฉดสีทีละ "มุมทองคำ" (~137.5°) ให้สีกระจายห่างกันเสมอ ไม่ว่าจะมีกี่คน
 * และลดความสว่างอัตโนมัติจนตัวหนังสือสีขาวบนการ์ดอ่านออก (contrast ≥ 3:1)
 */
export function playerColor(index: number): string {
  if (index < basePlayerColors.length) {
    return basePlayerColors[index];
  }
  const n = index - basePlayerColors.length;
  const hue = (n * 137.508 + 20) % 360;
  // สลับความสด/ความสว่างตามลำดับ ให้สีที่เฉดใกล้กันยังแยกออกจากกัน
  const saturation = n % 2 === 0 ? 75 : 55;
  let lightness = [48, 36, 42][n % 3];
  let rgb = hslToRgb(hue, saturation, lightness);
  while (contrastWithWhite(rgb) < 3 && lightness > 20) {
    lightness -= 2;
    rgb = hslToRgb(hue, saturation, lightness);
  }
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hslToRgb(h: number, s: number, l: number): number[] {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function contrastWithWhite(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

export function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}
