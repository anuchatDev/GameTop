import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { kittensApi } from '../api/client';
import { AuthSession } from '../types';
import { EkCardType, KittensView } from './types';

/** ถามสถานะทุก 0.5 วินาที — ทุกคนต้องเห็นการ์ดที่เพิ่งเล่นทันเพื่อกด "ไม่!" ได้ในเวลา */
const POLL_MS = 500;

export function useKittensRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<KittensView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: KittensView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรกกด "เข้าห้อง" (เข้าจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await kittensApi.get(auth, code) : await kittensApi.join(auth, code);
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
    async (action: () => Promise<KittensView>): Promise<boolean> => {
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
      start: () => run(() => kittensApi.start(auth, code)),
      play: (cardIds: number[], targetId?: string | null, named?: EkCardType | null) =>
        run(() => kittensApi.play(auth, code, cardIds, targetId, named)),
      nope: () => run(() => kittensApi.nope(auth, code)),
      draw: () => run(() => kittensApi.draw(auth, code)),
      place: (position: number) => run(() => kittensApi.place(auth, code, position)),
      give: (cardId: number) => run(() => kittensApi.give(auth, code, cardId)),
      again: () => run(() => kittensApi.again(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type EkActions = ReturnType<typeof useKittensRoom>['actions'];
