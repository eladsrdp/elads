// inbox/src/db.ts
// שכבת האחסון — SQLite מקומי דרך node:sqlite המובנה (יעד הפרויקט: Node 24+; ה-API עצמו יציב מ-22.5+, בלי תלות ב-native build).
// path=':memory:' לבדיקות.
import { DatabaseSync } from 'node:sqlite'

export type MessageDirection = 'incoming' | 'outgoing'
export type MessageType = 'text' | 'voice' | 'other'

export interface MessageRow {
  wahaMessageId: string
  direction: MessageDirection
  type: MessageType
  body: string | null
  timestamp: number
  rawJson: string
}

export interface StoredMessage {
  wahaMessageId: string
  direction: MessageDirection
  type: MessageType
  body: string | null
  timestamp: number
}

export interface Db {
  /** true אם נכתבה שורה חדשה, false אם התעלם מכפילות (waha_message_id קיים) */
  insertMessage(row: MessageRow): boolean
  countMessages(): number
  /** לבדיקות/דיבוג — כל ההודעות בסדר הכנסה (id עולה). */
  getMessages(): StoredMessage[]
}

export function createDb(path: string): Db {
  const conn = new DatabaseSync(path)
  conn.exec('PRAGMA journal_mode = WAL')
  conn.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waha_message_id TEXT NOT NULL UNIQUE,
      direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
      type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'other')),
      body TEXT,
      timestamp INTEGER NOT NULL, -- שניות (Unix epoch), כמו שמגיע מ-WAHA
      raw_json TEXT NOT NULL,
      received_at INTEGER NOT NULL -- מילישניות (Date.now()) — יחידה שונה מ-timestamp בכוונה, זה זמן קליטה שלנו
    )
  `)

  // SECURITY: פרמטרים מוזרקים דרך placeholders (?), לא string concatenation — מונע SQL injection.
  const insertStmt = conn.prepare(`
    INSERT OR IGNORE INTO messages
      (waha_message_id, direction, type, body, timestamp, raw_json, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const countStmt = conn.prepare('SELECT COUNT(*) as count FROM messages')
  const selectAllStmt = conn.prepare(
    'SELECT waha_message_id, direction, type, body, timestamp FROM messages ORDER BY id',
  )

  return {
    insertMessage(row) {
      const result = insertStmt.run(
        row.wahaMessageId,
        row.direction,
        row.type,
        row.body,
        row.timestamp,
        row.rawJson,
        Date.now(),
      )
      return result.changes > 0
    },
    countMessages() {
      const result = countStmt.get() as { count: number }
      return result.count
    },
    getMessages() {
      const rows = selectAllStmt.all() as Array<{
        waha_message_id: string
        direction: MessageDirection
        type: MessageType
        body: string | null
        timestamp: number
      }>
      return rows.map((row) => ({
        wahaMessageId: row.waha_message_id,
        direction: row.direction,
        type: row.type,
        body: row.body,
        timestamp: row.timestamp,
      }))
    },
  }
}
