// קריאות ישירות לשרת לצ'קליסט/טיוטות מקומיים (Phase 2) — לא מסונכרן עם פריוריטי, בלי Dexie.
import { api } from '../lib/api'
import type {
  ChecklistItem,
  CreateChecklistItemInput,
  CreateDraftInput,
  DraftNote,
  UpdateChecklistItemInput,
} from '../types'

export function taskQuery(taskId?: number): string {
  return taskId != null ? `?taskId=${taskId}` : ''
}

export async function listChecklistItems(taskId?: number): Promise<ChecklistItem[]> {
  return api<ChecklistItem[]>(`/api/checklist${taskQuery(taskId)}`)
}

export async function createChecklistItem(input: CreateChecklistItemInput): Promise<ChecklistItem> {
  return api<ChecklistItem>('/api/checklist', { method: 'POST', json: input })
}

export async function updateChecklistItem(id: number, changes: UpdateChecklistItemInput): Promise<ChecklistItem> {
  return api<ChecklistItem>(`/api/checklist/${id}`, { method: 'PATCH', json: changes })
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await api<{ ok: true }>(`/api/checklist/${id}`, { method: 'DELETE' })
}

export async function reorderChecklistItems(taskId: number | undefined, orderedIds: number[]): Promise<void> {
  await api<{ ok: true }>('/api/checklist/reorder', { method: 'PATCH', json: { taskId, orderedIds } })
}

export async function listDrafts(taskId?: number): Promise<DraftNote[]> {
  return api<DraftNote[]>(`/api/drafts${taskQuery(taskId)}`)
}

export async function createDraft(input: CreateDraftInput): Promise<DraftNote> {
  return api<DraftNote>('/api/drafts', { method: 'POST', json: input })
}

export async function updateDraft(id: number, text: string): Promise<DraftNote> {
  return api<DraftNote>(`/api/drafts/${id}`, { method: 'PATCH', json: { text } })
}

export async function deleteDraft(id: number): Promise<void> {
  await api<{ ok: true }>(`/api/drafts/${id}`, { method: 'DELETE' })
}
