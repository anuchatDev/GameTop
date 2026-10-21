import { Alert, Platform } from 'react-native';

/**
 * localStorage แบบปลอดภัย: บนเว็บใช้ localStorage จริง, บนมือถือ (ยังไม่มี storage) จะคืน null
 * ทุกการอ่าน/เขียนครอบ try/catch เพราะบางเบราว์เซอร์ (private mode) อาจโยน error
 */
function local(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null {
  try {
    return (globalThis as any).localStorage ?? null;
  } catch {
    return null;
  }
}

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = local()?.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      local()?.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
  remove(key: string) {
    try {
      local()?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

/** กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ (Alert ของ react-native ใช้บนเว็บไม่ได้ จึงใช้ window.confirm แทน) */
export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(!!(globalThis as any).confirm?.(message));
  }
  return new Promise((resolve) =>
    Alert.alert('ยืนยัน', message, [
      { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
      { text: 'ตกลง', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
