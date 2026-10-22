import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../api/client';
import { AuthSession, RoomView, SettingsInput } from '../types';

const POLL_MS = 1500;

/**
 * ดึงสถานะห้องจาก backend ทุก 1.5 วินาที และใช้ส่งคำสั่ง (เริ่มรอบ, รายงาน kill, ทายคำ)
 */
export function useRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // กันผลลัพธ์ที่มาช้ากว่าเขียนทับข้อมูลที่ใหม่กว่า
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: RoomView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรก "เข้าห้อง" (มาจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await api.getRoom(auth, code) : await api.joinRoom(auth, code);
      joined.current = true;
      apply(view, requestSeq);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [auth, code, apply]);

  useEffect(() => {
    joined.current = false;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<RoomView>): Promise<boolean> => {
      const requestSeq = ++seq.current;
      setBusy(true);
      try {
        apply(await action(), requestSeq);
        setError(null);
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const actions = useMemo(
    () => ({
      start: () => run(() => api.startRound(auth, code)),
      updateSettings: (settings: SettingsInput) => run(() => api.updateSettings(auth, code, settings)),
      restart: () => run(() => api.restartGame(auth, code)),
      kill: (victimId: string, killerId: string | null) => run(() => api.reportKill(auth, code, victimId, killerId)),
      guess: (guess: string) => run(() => api.submitGuess(auth, code, guess)),
      end: () => run(() => api.endRound(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type RoomActions = ReturnType<typeof useRoom>['actions'];
