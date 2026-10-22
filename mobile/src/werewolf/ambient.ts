/**
 * เพลงคลอเบาๆ ตอนพูดคุยกลางวัน — สังเคราะห์ด้วย Web Audio (ไม่ต้องมีไฟล์เพลง)
 * ใช้ได้บนเว็บเท่านั้น บนมือถือแบบแอปจะไม่มีเสียง
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

// คอร์ดเบาๆ วนไปเรื่อยๆ (Am - F - C - G)
const CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 261.63, 329.63],
  [196.0, 246.94, 293.66],
];
const CHORD_SECONDS = 4;

function playChord(freqs: number[]) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 1.2);
    gain.gain.linearRampToValueAtTime(0, now + CHORD_SECONDS + 0.5);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + CHORD_SECONDS + 0.6);
  }
}

export function startAmbient() {
  if (timer) return;
  const AudioCtx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    ctx = ctx ?? new AudioCtx();
    ctx!.resume?.();
    master = ctx!.createGain();
    master.gain.value = 0.6;
    master.connect(ctx!.destination);
    let i = 0;
    playChord(CHORDS[i]);
    timer = setInterval(() => {
      i = (i + 1) % CHORDS.length;
      playChord(CHORDS[i]);
    }, CHORD_SECONDS * 1000);
  } catch {
    stopAmbient();
  }
}

export function stopAmbient() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  try {
    master?.disconnect();
  } catch {
    // ignore
  }
  master = null;
}
