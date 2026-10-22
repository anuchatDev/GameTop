import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints แบบ Mobile-first — รองรับตั้งแต่ 320px (มือถือเล็ก) ถึง 1920px+ (เดสก์ท็อปใหญ่)
 *
 * | ขนาด     | ความกว้าง     |
 * |----------|--------------|
 * | phone    | < 600        |
 * | tablet   | 600 – 1023   |
 * | desktop  | ≥ 1024       |
 */
export const BREAKPOINTS = { tablet: 600, desktop: 1024 } as const;

/** ความกว้างสูงสุดของเนื้อหา — narrow สำหรับหน้าเล่นเกม/ฟอร์ม, wide สำหรับหน้าแรกที่มีหลายคอลัมน์ */
export const CONTENT_WIDTH = { narrow: 720, wide: 1200 } as const;

/** ขนาดพื้นที่กดขั้นต่ำ (WCAG / Apple HIG) */
export const MIN_TOUCH = 44;

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isPhone = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;

  /** ขนาดตัวอักษรที่ปรับตามจอ: จอเล็กมาก (320px) ย่อลงเล็กน้อย จอใหญ่ขยายขึ้น ไม่เกิน 20% */
  const fs = (size: number) => {
    const factor = Math.min(1.2, Math.max(0.88, width / 420));
    return Math.round(size * (size >= 24 ? factor : Math.min(1.1, Math.max(0.94, factor))));
  };

  /** จำนวนคอลัมน์ของกริด ตามขนาดจอ */
  const columns = (phone: number, tablet: number, desktop: number) =>
    isDesktop ? desktop : isTablet ? tablet : phone;

  /** ระยะขอบจอ — จอแคบมาก (≤360) ใช้ 14px เพื่อให้เนื้อหาไม่อึดอัด */
  const gutter = width <= 360 ? 14 : isPhone ? 18 : 24;

  /** ความกว้างจริงของพื้นที่เนื้อหา */
  const contentWidth = (variant: keyof typeof CONTENT_WIDTH = 'narrow') =>
    Math.min(width - gutter * 2, CONTENT_WIDTH[variant]);

  /** ความกว้างของช่องในกริด (Fluid Grid: แบ่งพื้นที่เนื้อหาตามจำนวนคอลัมน์ หักช่องว่างแล้ว) */
  const itemWidth = (cols: number, gap: number, variant: keyof typeof CONTENT_WIDTH = 'narrow') =>
    Math.floor((contentWidth(variant) - gap * (cols - 1)) / cols);

  return { width, isPhone, isTablet, isDesktop, fs, columns, gutter, contentWidth, itemWidth };
}
