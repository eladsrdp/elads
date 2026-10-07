// Generates the Hebrew voice-over, one WAV per scene, via OpenAI TTS.
// SECURITY: the API key is read from the repo-root .env (never printed or logged).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const project = join(here, "..");
const envPath = join(project, "..", "..", ".env");

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("OPENAI_API_KEY="));
  if (!line) throw new Error("OPENAI_API_KEY missing from .env");
  return line.slice("OPENAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const LINES = [
  "כולם רוצים את ארץ קיר. אבל מה קורה מאחורי הקלעים?",
  "פותחים קבוצה, ומיד מגיעה הודעת וואטסאפ עם קישור אישי וקוד קופון. 160 במקום 229.",
  "על כל מי שרכש, המארגן מקבל הודעה. הקבוצה מתמלאת, והוא רואה הכול.",
  "הקבוצה נתקעה? תזכורות, דחיפה לסגירה, או ביטול עם זיכוי לכולם. והכול נח בשבת ובחגים.",
  "עשר הזמנות, והמשחק של המארגן מגיע במתנה. ההזמנה נפתחת בקלות.",
  "עדכוני משלוח מגיעים לכולם בקלות, כולל מספר מעקב. כשהמשחק מגיע, כל רוכש מקבל כתובת איסוף ולוחץ: אספתי.",
  "ואחרי האיסוף? רואים בקלות מי אסף ומי לא, ומחזירים את הרוכשים לקבוצה הבאה.",
  "אפילו מיילים משותפים נקראים ומפוענחים אוטומטית, עם בינה מלאכותית.",
  "וכל זה בלי הודעה ידנית אחת. רוצים מערכת כזו? דברו איתנו."
];

const VOICE = process.env.TTS_VOICE || "ash";
const INSTRUCTIONS =
  "Speak native Israeli Hebrew. Male voice. Warm, calm, confident, conversational commercial voice-over. " +
  "Natural pace around 150 words per minute, friendly smile in the voice.";

function wavSeconds(buf) {
  // Walk RIFF chunks for fmt (byte rate) and data (size).
  let off = 12, byteRate = 0, dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(off + 16);
    if (id === "data") { dataSize = size === 0xffffffff || off + 8 + size > buf.length ? buf.length - off - 8 : size; break; }
    off += 8 + size + (size % 2);
  }
  return byteRate ? dataSize / byteRate : 0;
}

const key = loadKey();
const outDir = join(project, "assets", "vo");
mkdirSync(outDir, { recursive: true });
const only = process.argv[2] ? Number(process.argv[2]) : null;
const durations = {};

for (let i = 0; i < LINES.length; i++) {
  if (only && only !== i + 1) continue;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE, input: LINES[i], instructions: INSTRUCTIONS, response_format: "wav" }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    // SECURITY: report status only, never the request (it carries the key).
    throw new Error(`TTS scene ${i + 1} failed: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const file = join(outDir, `vo-${String(i + 1).padStart(2, "0")}.wav`);
  writeFileSync(file, buf);
  durations[i + 1] = Number(wavSeconds(buf).toFixed(2));
  console.log(`scene ${i + 1}: ${durations[i + 1]}s`);
}
writeFileSync(join(outDir, "durations.json"), JSON.stringify(durations, null, 2));
