import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ohanaApi } from '../api/client';
import { AuthSession } from '../types';
import { OhanaView } from './types';

/** ถามสถานะทุก 0.7 วินาที (ไพ่ J แข่งกันกด ต้องเห็นเร็ว) */
const POLL_MS = 700;

export function useOhanaRoom(auth: AuthSession, code: string) {
  const [room, setRoom] = useState<OhanaView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const joined = useRef(false);

  const apply = useCallback((view: OhanaView, requestSeq: number) => {
    if (requestSeq < seq.current) return;
    seq.current = requestSeq;
    setRoom(view);
  }, []);

  const refresh = useCallback(async () => {
    const requestSeq = seq.current + 1;
    try {
      const view = joined.current ? await ohanaApi.get(auth, code) : await ohanaApi.join(auth, code);
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
    async (action: () => Promise<OhanaView>) => {
      const requestSeq = ++seq.current;
      setBusy(true);
      try {
        apply(await action(), requestSeq);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const actions = useMemo(
    () => ({
      settings: (body: { penalty?: string; kingRules?: string[] }) => run(() => ohanaApi.settings(auth, code, body)),
      start: () => run(() => ohanaApi.start(auth, code)),
      end: () => run(() => ohanaApi.end(auth, code)),
      draw: () => run(() => ohanaApi.draw(auth, code)),
      pick: (ids: string[]) => run(() => ohanaApi.pick(auth, code, ids)),
      duelLoser: (id: string) => run(() => ohanaApi.duelLoser(auth, code, id)),
      face: () => run(() => ohanaApi.face(auth, code)),
      skip: () => run(() => ohanaApi.skip(auth, code)),
      faceLoser: (id: string) => run(() => ohanaApi.faceLoser(auth, code, id)),
      addGuest: (name: string) => run(() => ohanaApi.addGuest(auth, code, name)),
      removeGuest: (id: string) => run(() => ohanaApi.removeGuest(auth, code, id)),
    }),
    [auth, code, run],
  );

  return { room, error, busy, actions };
}

export type OhanaActions = ReturnType<typeof useOhanaRoom>['actions'];
