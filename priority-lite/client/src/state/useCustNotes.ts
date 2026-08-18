// קריאות ישירות לשרת (בלי Dexie) — אותו דפוס כמו TaskPicker הקיים.
import { api } from '../lib/api'
import type { CustNote, EmployeeSummary, TaskStatus, UpdateCustNoteInput } from '../types'

export interface SearchCustNotesParams {
  q?: string
  mine?: boolean
  status?: TaskStatus[]
}

export function buildQuery(params: SearchCustNotesParams): string {
  const usp = new URLSearchParams()
  if (params.q) usp.set('q', params.q)
  if (params.mine) usp.set('mine', 'true')
  for (const s of params.status ?? []) usp.append('status', s)
  return usp.toString()
}

export async function searchCustNotes(params: SearchCustNotesParams): Promise<CustNote[]> {
  return api<CustNote[]>(`/api/custnotes?${buildQuery(params)}`)
}

export async function getCustNoteDetail(id: number): Promise<CustNote> {
  return api<CustNote>(`/api/custnotes/${id}`)
}

export async function updateCustNote(id: number, changes: UpdateCustNoteInput): Promise<CustNote> {
  return api<CustNote>(`/api/custnotes/${id}`, { method: 'PATCH', json: changes })
}

export async function listEmployees(): Promise<EmployeeSummary[]> {
  return api<EmployeeSummary[]>('/api/employees')
}
