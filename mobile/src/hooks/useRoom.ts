import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api/client';
import { RoomView, Session } from '../types';

const POLL_MS = 1500;

/**
 * ดึงสถานะห้องจาก backend ทุก 1.5 วินาที และใช้ส่งคำสั่ง (เริ่มรอบ, รายงาน kill, ทายคำ)
 */
export function useRoom(session: Session) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // กันผลลัพธ์ที่มาช้ากว่าเขียนทับข้อมูลที่ใหม่กว่า
  const seq = useRef(0);

  const apply = useCallback((view: RoomView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      apply(await api.getRoom(session), requestSeq);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [session, apply]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const run = useCallback(
    async (action: (s: Session) => Promise<RoomView>): Promise<boolean> => {
      const requestSeq = ++seq.current;
      setBusy(true);
      try {
        apply(await action(session), requestSeq);
        setError(null);
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [session, apply],
  );

  return { room, receivedAt, error, busy, run };
}
