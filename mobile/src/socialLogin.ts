import { storage } from './storage';

/**
 * ล็อกอินด้วย Google / LINE บนเว็บ
 * - Google: ปุ่มของ Google Identity Services คืน ID token มาในหน้าเดิม
 * - LINE: พาไปหน้า LINE Login แล้วกลับมาพร้อม ?code=&state= (จำห้องที่จะเข้าไว้ก่อนออกจากหน้า)
 */

const LINE_KEY = 'fw.lineLogin';

function win(): any {
  return (globalThis as any).window ?? null;
}

/** URL ที่ LINE ส่งกลับมา — ต้องตรงกับ Callback URL ที่ลงทะเบียนใน LINE Developers */
export function redirectUri(): string {
  const loc = win()?.location;
  return loc ? `${loc.origin}${loc.pathname}` : '';
}

/** ไปหน้า LINE Login — afterLogin = เส้นทางที่จะพาไปหลังล็อกอิน (เช่น ห้องที่เพื่อนชวน) */
export function startLineLogin(channelId: string, afterLogin: unknown) {
  const bytes = new Uint8Array(16);
  (globalThis as any).crypto.getRandomValues(bytes);
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  storage.set(LINE_KEY, { state, afterLogin });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri(),
    state,
    scope: 'profile openid email',
  });
  win().location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

/** กลับมาจาก LINE: อ่าน code แล้วลบออกจาก URL — state ต้องตรงกับที่จำไว้ (กันลิงก์ปลอม) */
export function readLineReturn(): { code: string; afterLogin: unknown } | null {
  try {
    const loc = win()?.location;
    if (!loc?.search) return null;
    const params = new URLSearchParams(loc.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return null;
    ['code', 'state', 'friendship_status_changed', 'liffClientId', 'liffRedirectUri'].forEach((k) => params.delete(k));
    const rest = params.toString();
    win().history?.replaceState(null, '', loc.pathname + (rest ? '?' + rest : ''));
    const saved = storage.get<{ state: string; afterLogin: unknown }>(LINE_KEY);
    storage.remove(LINE_KEY);
    return saved && saved.state === state ? { code, afterLogin: saved.afterLogin } : null;
  } catch {
    return null;
  }
}

let googleScript: Promise<void> | null = null;

/** โหลดสคริปต์ปุ่ม Google ครั้งเดียว */
export function loadGoogle(): Promise<void> {
  const w = win();
  if (!w) return Promise.reject(new Error('no window'));
  if (w.google?.accounts?.id) return Promise.resolve();
  googleScript ??= new Promise((resolve, reject) => {
    const s = w.document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      googleScript = null;
      reject(new Error('โหลดปุ่ม Google ไม่สำเร็จ'));
    };
    w.document.head.appendChild(s);
  });
  return googleScript;
}

/** วาดปุ่ม Google ลงใน element — กดแล้วได้ ID token ส่งให้ onCredential */
export function renderGoogleButton(el: any, clientId: string, width: number, onCredential: (token: string) => void) {
  const id = win().google.accounts.id;
  id.initialize({ client_id: clientId, callback: (r: { credential: string }) => onCredential(r.credential) });
  id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'th', width });
}
