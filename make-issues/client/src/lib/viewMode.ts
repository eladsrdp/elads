// קריאה/כתיבה של מצב התצוגה (כרטיסים/טבלה) ל-storage — Pick<Storage, ...> כדי לאפשר בדיקות עם מוק פשוט.
const STORAGE_KEY = 'mi:view-mode'
export type ViewMode = 'cards' | 'table'

export function readViewMode(storage: Pick<Storage, 'getItem'>): ViewMode {
  const value = storage.getItem(STORAGE_KEY)
  return value === 'table' ? 'table' : 'cards'
}

export function writeViewMode(storage: Pick<Storage, 'setItem'>, mode: ViewMode): void {
  storage.setItem(STORAGE_KEY, mode)
}
