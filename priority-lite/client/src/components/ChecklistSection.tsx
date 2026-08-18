// priority-lite/client/src/components/ChecklistSection.tsx
// צ'קליסט אישי מקומי (Phase 2) — לא מסונכרן עם פריוריטי. תומך בגרירה חופשית לסידור מחדש.
import { useEffect, useRef, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklistItems,
  reorderChecklistItems,
  updateChecklistItem,
} from '../state/useLocalItems'
import type { ChecklistItem } from '../types'

interface Props {
  taskId?: number
}

function SortableRow({
  item,
  busy,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem
  busy: boolean
  onToggle: (item: ChecklistItem) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled: busy })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-xl bg-slate-800/40 px-3 py-2">
      <button
        {...attributes}
        {...listeners}
        disabled={busy}
        className="cursor-grab touch-none px-1 text-slate-500 disabled:opacity-50"
        aria-label="גרור לסידור מחדש"
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.done}
        disabled={busy}
        onChange={() => onToggle(item)}
        className="h-4 w-4 accent-emerald-500 disabled:opacity-50"
      />
      <span className={`flex-1 text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
        {item.text}
      </span>
      <button onClick={() => onDelete(item.id)} disabled={busy} className="text-slate-500 disabled:opacity-50" aria-label="מחק">
        ✕
      </button>
    </div>
  )
}

export function ChecklistSection({ taskId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newText, setNewText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // מצב React (busy) מתעדכן רק אחרי render — לא עוצר קריאה שנייה שמתחילה באותו tick
  // סינכרוני (למשל click מהיר כפול). ref מתעדכן מיידית וסוגר את החלון הזה — אותו דפוס
  // כמו savingRef ב-TaskDetail.tsx, כאן כדי שדריסה (rollback) של מוטציה אחת לא תדרוס
  // בטעות שינוי מוצלח של מוטציה מקבילה אחרת (הן חולקות את אותו state מערך `items`).
  const busyRef = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    listChecklistItems(taskId)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
  }, [taskId])

  const addItem = async () => {
    if (!newText.trim() || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const created = await createChecklistItem({ taskId, text: newText.trim() })
      setItems((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const toggle = async (item: ChecklistItem) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    try {
      await updateChecklistItem(item.id, { done: !item.done })
    } catch (err) {
      // rollback ממוקד לפריט הזה בלבד — לא שחזור מלא של המערך, כדי לא לדרוס
      // מוטציה אחרת שהצליחה בינתיים (אין מקביליות בפועל כי busyRef חוסם, אבל
      // rollback ממוקד נשאר נכון גם אם ההגנה תוסר בעתיד).
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)))
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    const removedItem = items.find((i) => i.id === id)
    const removedIndex = items.findIndex((i) => i.id === id)
    setItems((cur) => cur.filter((i) => i.id !== id))
    try {
      await deleteChecklistItem(id)
    } catch (err) {
      // rollback ממוקד — מחזירים רק את הפריט שנמחק, במקום את כל התמונה הקודמת.
      if (removedItem) {
        setItems((cur) => {
          const next = [...cur]
          next.splice(removedIndex, 0, removedItem)
          return next
        })
      }
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (busyRef.current) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    busyRef.current = true
    setBusy(true)
    setError('')
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    try {
      await reorderChecklistItems(taskId, reordered.map((i) => i.id))
    } catch (err) {
      // כשל בסידור מחדש: מסתמכים על טעינה מחדש מהשרת (לא snapshot מלא ישן) כדי
      // לא לדרוס הוספה/מחיקה שהתרחשה בינתיים — אמנם busyRef חוסם זאת כרגע, אבל
      // resync מהשרת נשאר הבחירה הבטוחה ביותר למקרה של כשל בפעולה שנוגעת בכל המערך.
      try {
        setItems(await listChecklistItems(taskId))
      } catch {
        // אם גם ה-resync נכשל, משאירים את המצב האופטימי — עדיף מלקרוס.
      }
      setError(err instanceof Error ? err.message : 'שגיאה בסידור מחדש')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">צ'קליסט אישי</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} busy={busy} onToggle={toggle} onDelete={remove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          disabled={busy}
          placeholder="סעיף חדש…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
        />
        <button
          onClick={addItem}
          disabled={busy || !newText.trim()}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          הוסף
        </button>
      </div>
    </div>
  )
}
