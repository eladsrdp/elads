// Procedural upbeat 120 BPM backing track (no samples, fully original, royalty-free).
import { writeFileSync, mkdirSync } from "node:fs";
const SR = 44100, BPM = 120, BEAT = 60 / BPM, BARS = Number(process.argv[2] || 28);
const N = Math.floor(SR * BEAT * 4 * BARS);
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const tri = (ph) => 2 * Math.abs(saw(ph)) - 1;
const chords = [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]]; // C G Am F
const roots = [65.41, 49.0, 55.0, 43.65];
function add(t0, dur, fn, pan = 0, gain = 1) {
  const s = Math.floor(t0 * SR), e = Math.min(N, s + Math.floor(dur * SR));
  const gl = gain * (pan <= 0 ? 1 : 1 - pan), gr = gain * (pan >= 0 ? 1 : 1 + pan);
  for (let i = s; i < e; i++) { const v = fn((i - s) / SR); L[i] += v * gl; R[i] += v * gr; }
}
let lp = 0;
for (let bar = 0; bar < BARS; bar++) {
  const c = chords[bar % 4], root = roots[bar % 4], t = bar * 4 * BEAT;
  // bass: driving eighths with octave pops (from bar 2)
  if (bar >= 2) for (let k = 0; k < 8; k++) {
    const f = root * (k % 4 === 3 ? 2 : 1), tt = t + k * BEAT / 2;
    add(tt, BEAT / 2 * 0.9, (x) => { const env = Math.exp(-x * 6); lp += (saw(f * x) - lp) * 0.12; return lp * env * 0.9; }, 0, 0.55);
  }
  // off-beat chord plucks
  for (let k = 0; k < 4; k++) {
    const tt = t + k * BEAT + BEAT / 2;
    c.forEach((f, j) => add(tt, 0.22, (x) => saw(f * 2 * x + j * 0.1) * Math.exp(-x * 14) * 0.5, j - 1 > 0 ? 0.35 : -0.35, 0.16));
  }
  // sparkling 16th arpeggio (from bar 4)
  if (bar >= 4) for (let k = 0; k < 16; k++) {
    const f = c[k % 3] * (k % 6 < 3 ? 4 : 2) , tt = t + k * BEAT / 4;
    add(tt, 0.12, (x) => tri(f * x) * Math.exp(-x * 20) * 0.5, (k % 2 ? 0.4 : -0.4), 0.12);
  }
  // drums
  for (let k = 0; k < 4; k++) {
    const tt = t + k * BEAT;
    if (bar >= 2) add(tt, 0.3, (x) => Math.sin(2 * Math.PI * (45 * x + 75 * (1 - Math.exp(-x * 30)) / 30 * 1.0 * 30 / 30 * 1) ) * Math.exp(-x * 11), 0, 0.95);
    if (bar >= 4 && (k === 1 || k === 3)) add(tt, 0.16, (x) => rnd() * Math.exp(-x * 28), 0, 0.42);
    add(tt + BEAT / 2, 0.05, (x) => rnd() * Math.exp(-x * 90), 0.2, 0.2);
    if (bar >= 8) for (const o of [BEAT / 4, BEAT * 3 / 4]) add(tt + o, 0.03, (x) => rnd() * Math.exp(-x * 140), -0.2, 0.1);
  }
}
// sidechain pump on every beat, fades, normalize
let peak = 0;
for (let i = 0; i < N; i++) {
  const tb = (i / SR) % BEAT, duck = 1 - 0.55 * Math.exp(-tb * 9), tsec = i / SR, tot = N / SR;
  const fade = Math.min(1, tsec / 0.15) * Math.min(1, (tot - tsec) / 2.5);
  L[i] *= duck * fade; R[i] *= duck * fade; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.7 / peak, out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * 32767))), 44 + i * 4); out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * 32767))), 46 + i * 4); }
mkdirSync("assets", { recursive: true }); writeFileSync("assets/music.wav", out);
console.log("music.wav", (N / SR).toFixed(1) + "s");
