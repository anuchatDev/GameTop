import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { insiderApi } from '../api/client';
import { AuthSession } from '../types';
import { InAnswer, InSettingsInput, InsiderView } from './types';

/** ถามสถานะทุก 1 วินาที — คำถาม/คำตอบโผล่ให้ทุกคนเห็นแทบทันที */
const POLL_MS = 1000;

export function useInsiderRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<InsiderView | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: InsiderView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      // ครั้งแรกกด "เข้าห้อง" (เข้าจาก QR/ลิงก์ หรือกลับที่นั่งเดิม) ครั้งต่อไปแค่ถามสถานะ
      const view = joined.current ? await insiderApi.get(auth, code) : await insiderApi.join(auth, code);
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
    async (action: () => Promise<InsiderView>): Promise<boolean> => {
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
      settings: (body: InSettingsInput) => run(() => insiderApi.settings(auth, code, body)),
      start: () => run(() => insiderApi.start(auth, code)),
      begin: () => run(() => insiderApi.begin(auth, code)),
      ask: (text: string) => run(() => insiderApi.ask(auth, code, text)),
      answer: (entryId: number, answer: InAnswer) => run(() => insiderApi.answer(auth, code, entryId, answer)),
      guess: (text: string) => run(() => insiderApi.guess(auth, code, text)),
      correct: (playerId: string) => run(() => insiderApi.correct(auth, code, playerId)),
      vote: (playerId: string) => run(() => insiderApi.vote(auth, code, playerId)),
      endVote: () => run(() => insiderApi.endVote(auth, code)),
      again: () => run(() => insiderApi.again(auth, code)),
    }),
    [auth, code, run],
  );

  return { room, receivedAt, error, busy, actions };
}

export type InActions = ReturnType<typeof useInsiderRoom>['actions'];
