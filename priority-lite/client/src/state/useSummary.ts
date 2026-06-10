// סיכומי שעות לפי טווח — מחושב מקומית מ-Dexie (טיוטות + מסונכרנים).
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { LocalTimeEntry } from '../types'

export interface TaskTotal {
  taskId: string
  taskName: string
  projectName: string
  totalMin: number
  draftMin: number
}

export interface ProjectGroup {
  projectName: string
  totalMin: number
  tasks: TaskTotal[]
}

export interface RangeSummary {
  totalMin: number
  draftMin: number
  projects: ProjectGroup[]
}

export function summarize(entries: LocalTimeEntry[]): RangeSummary {
  const byTask = new Map<string, TaskTotal>()
  let totalMin = 0
  let draftMin = 0

  for (const e of entries) {
    totalMin += e.durationMin
    const isDraft = e.status !== 'synced'
    if (isDraft) draftMin += e.durationMin
    const t = byTask.get(e.taskId) ?? {
      taskId: e.taskId,
      taskName: e.taskName,
      projectName: e.projectName,
      totalMin: 0,
      draftMin: 0,
    }
    t.totalMin += e.durationMin
    if (isDraft) t.draftMin += e.durationMin
    byTask.set(e.taskId, t)
  }

  const byProject = new Map<string, ProjectGroup>()
  for (const t of byTask.values()) {
    const g = byProject.get(t.projectName) ?? { projectName: t.projectName, totalMin: 0, tasks: [] }
    g.totalMin += t.totalMin
    g.tasks.push(t)
    byProject.set(t.projectName, g)
  }

  const projects = [...byProject.values()].sort((a, b) => b.totalMin - a.totalMin)
  for (const p of projects) p.tasks.sort((a, b) => b.totalMin - a.totalMin)

  return { totalMin, draftMin, projects }
}

export function useRangeSummary(from: string, to: string): RangeSummary | undefined {
  return useLiveQuery(async () => {
    const entries = await db.timeEntries.where('date').between(from, to, true, true).toArray()
    return summarize(entries)
  }, [from, to])
}
