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
  "כולם רוצים את ארץ קיר – מפת ישראל ענקית ומגנטית לכל המשפחה. אבל מה קורה מאחורי הקלעים?",
  "משפחה אחת פותחת קבוצת רכישה ביישוב שלה. בלחיצה אחת המערכת מייצרת קוד קופון אישי, קישור והודעה מוכנה להפצה – 160 שקלים במקום 229.",
  "השכנים מצטרפים, ועל כל רכישה המארגן מקבל עדכון: עוד משפחה התמגנטה בזכותך. יש שאלה? הבוט כבר עונה.",
  "הקבוצה נתקעה? תזכורות, דחיפה לסגירה, או ביטול מסודר עם זיכוי לכל הרוכשים. והכול יודע לנוח בשבת ובחגים.",
  "עשר הזמנות, והמשחק של המארגן מגיע במתנה. ההזמנה נפתחת לבד.",
  "המשלוח יוצא ומספר המעקב נכנס להודעה אוטומטית. כשהמשחק מגיע, כל רוכש מקבל כתובת איסוף ולוחץ: אספתי.",
  "ואחרי האיסוף? רעיונות למשחק, בקשת המלצה, קבוצה חדשה, ואפילו מסלול מתנה עם שולח סודי.",
  "אפילו מיילים משותפים נקראים ומפוענחים אוטומטית, עם בינה מלאכותית.",
  "שלושים וחמש אוטומציות, ארבע עשרה אלף אנשי קשר, אפס הודעות ידניות. ארץ קיר, עם פלטפורמת אוטומציה מאחורי הקלעים. רוצים כזו לעסק שלכם? דברו איתנו."
];

const VOICE = process.env.TTS_VOICE || "coral";
const INSTRUCTIONS =
  "Speak native Israeli Hebrew. Warm, calm, confident, conversational commercial voice-over. " +
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
