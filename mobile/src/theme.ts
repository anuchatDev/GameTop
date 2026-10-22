/**
 * สีหลัก — ทุกสีที่ใช้เป็นพื้นหลังปุ่ม (ตัวหนังสือขาว) หรือเป็นสีตัวหนังสือ ผ่าน WCAG 2.1 AA (≥ 4.5:1)
 * ทั้งบนพื้นขาวและพื้นครีม
 */
export const colors = {
  bg: '#FFF4D6',
  card: '#FFFFFF',
  text: '#22223B',
  muted: '#5F5F73',
  primary: '#DC0028',
  secondary: '#0061FC',
  accent: '#FFBE0B',
  success: '#037D5D',
  danger: '#D91029',
  disabled: '#C9C9D6',
  disabledText: '#4A4A5A',
};

/** ข้อมูลประจำแต่ละเกม — ทุกเกมใช้หน้าตาเดียวกัน ต่างกันแค่สีประจำเกม · maxPlayers 0 = ไม่จำกัด */
export const games = {
  forbidden: {
    name: 'คำต้องห้าม',
    icon: '🤐',
    color: '#DC0028',
    tint: '#FFE4EA',
    tagline: 'หลอกล่อให้เพื่อนหลุดปากพูดคำบนหัวตัวเอง',
    players: '2 คนขึ้นไป',
    linkParam: 'fw',
    minPlayers: 2,
    maxPlayers: 0,
  },
  werewolf: {
    name: 'One Night Werewolf',
    icon: '🐺',
    color: '#6554F5',
    tint: '#ECE9FF',
    tagline: 'ล่าหมาป่าในคืนเดียว มีบอทผู้ดำเนินเกมเสียงภาษาไทย',
    players: '3-10 คน',
    linkParam: 'ww',
    minPlayers: 3,
    maxPlayers: 10,
  },
  ohana: {
    name: 'OHANA',
    icon: '🍻',
    color: '#C24103',
    tint: '#FFF1E6',
    tagline: 'เกมไพ่ปาร์ตี้ ผลัดกันจั่วแล้วทำตามคำสั่งบนไพ่',
    players: '2 คนขึ้นไป · 🔞 20+',
    linkParam: 'oh',
    minPlayers: 2,
    maxPlayers: 0,
  },
  insider: {
    name: 'Insider',
    icon: '🕵️',
    color: '#2D2A32',
    tint: '#FDE7EA',
    tagline: 'ถาม-ตอบทายคำปริศนา แล้วจับผู้บงการที่แฝงตัวอยู่',
    players: '4-20 คน',
    linkParam: 'in',
    minPlayers: 4,
    maxPlayers: 20,
  },
  spyfall: {
    name: 'Spyfall',
    icon: '🕶️',
    color: '#00707A',
    tint: '#E0F4F5',
    tagline: 'ทุกคนอยู่ที่เดียวกัน ยกเว้นสปาย — ถามตอบจับผิดกันเอง',
    players: '3-12 คน',
    linkParam: 'sf',
    minPlayers: 3,
    maxPlayers: 12,
  },
} as const;

export type GameKey = keyof typeof games;

/**
 * สีประจำตัวผู้เล่น 6 คนแรก — สีสดโทนพาสเทล ใช้คู่กับตัวหนังสือสีเข้ม (contrast ≥ 4.5:1 ตาม WCAG AA)
 */
const basePlayerColors = ['#FF8FA3', '#7FB2FF', '#FFBE0B', '#2EE6B0', '#C4A1FF', '#FF9F5A'];

const DARK_TEXT = [0x22, 0x22, 0x3b];

/**
 * สีของผู้เล่นคนที่ index — 6 คนแรกใช้ชุดสีหลัก คนถัดไปสร้างสีใหม่ไม่ซ้ำ
 * โดยหมุนเฉดสีทีละ "มุมทองคำ" (~137.5°) ให้สีกระจายห่างกันเสมอ ไม่ว่าจะมีกี่คน
 * และเพิ่มความสว่างอัตโนมัติจนตัวหนังสือสีเข้มอ่านออก (contrast ≥ 4.5:1)
 */
export function playerColor(index: number): string {
  if (index < basePlayerColors.length) {
    return basePlayerColors[index];
  }
  const n = index - basePlayerColors.length;
  const hue = (n * 137.508 + 20) % 360;
  // สลับความสด/ความสว่างตามลำดับ ให้สีที่เฉดใกล้กันยังแยกออกจากกัน
  const saturation = n % 2 === 0 ? 85 : 65;
  let lightness = [66, 74, 70][n % 3];
  let rgb = hslToRgb(hue, saturation, lightness);
  while (contrast(rgb, DARK_TEXT) < 4.5 && lightness < 92) {
    lightness += 2;
    rgb = hslToRgb(hue, saturation, lightness);
  }
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** สีตัวหนังสือที่อ่านง่ายที่สุดบนพื้นสีนี้ (ขาว หรือ น้ำเงินเข้ม) */
export function textOn(background: string): string {
  const rgb = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));
  return contrast(rgb, [255, 255, 255]) >= contrast(rgb, DARK_TEXT) ? '#FFFFFF' : colors.text;
}

function hslToRgb(h: number, s: number, l: number): number[] {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** อัตราส่วน contrast ตาม WCAG */
function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** ป้ายระดับความยาก (สีผ่าน WCAG AA ทั้งเป็นตัวหนังสือและเป็นพื้นหลังตัวหนังสือขาว) */
export const difficultyInfo = {
  EASY: { label: 'ง่าย', emoji: '🟢', color: '#037D5D' },
  MEDIUM: { label: 'ปานกลาง', emoji: '🟡', color: '#8E6600' },
  HARD: { label: 'ยาก', emoji: '🔴', color: '#D91029' },
} as const;

export const difficulties = ['EASY', 'MEDIUM', 'HARD'] as const;

/** ไอคอนให้เลือกตอนสร้างหมวด */
export const categoryIcons = ['🎉', '🎄', '🎃', '🏢', '⚽', '🎵', '🐶', '🍻', '🎓', '❤️', '🌏', '🎮'];

export function formatTime(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}
