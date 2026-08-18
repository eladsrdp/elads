// priority-lite/client/src/components/ChecklistSection.tsx
// צ'קליסט אישי מקומי (Phase 2) — לא מסונכרן עם פריוריטי. תומך בגרירה חופשית לסידור מחדש.
import { useEffect, useState } from 'react'
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
  onToggle,
  onDelete,
}: {
  item: ChecklistItem
  onToggle: (item: ChecklistItem) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-xl bg-slate-800/40 px-3 py-2">
      <button {...attributes} {...listeners} className="cursor-grab touch-none px-1 text-slate-500" aria-label="גרור לסידור מחדש">
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item)}
        className="h-4 w-4 accent-emerald-500"
      />
      <span className={`flex-1 text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
        {item.text}
      </span>
      <button onClick={() => onDelete(item.id)} className="text-slate-500" aria-label="מחק">
        ✕
      </button>
    </div>
  )
}

export function ChecklistSection({ taskId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newText, setNewText] = useState('')
  const [error, setError] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    listChecklistItems(taskId)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
  }, [taskId])

  const addItem = async () => {
    if (!newText.trim()) return
    try {
      const created = await createChecklistItem({ taskId, text: newText.trim() })
      setItems((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה')
    }
  }

  const toggle = async (item: ChecklistItem) => {
    const prev = items
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    try {
      await updateChecklistItem(item.id, { done: !item.done })
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    }
  }

  const remove = async (id: number) => {
    const prev = items
    setItems((cur) => cur.filter((i) => i.id !== id))
    try {
      await deleteChecklistItem(id)
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(items, oldIndex, newIndex)
    const prev = items
    setItems(reordered)
    try {
      await reorderChecklistItems(taskId, reordered.map((i) => i.id))
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה בסידור מחדש')
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
              <SortableRow key={item.id} item={item} onToggle={toggle} onDelete={remove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="סעיף חדש…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          onClick={addItem}
          disabled={!newText.trim()}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          הוסף
        </button>
      </div>
    </div>
  )
}
