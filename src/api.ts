// ============================================================
// Schedule API — static data mode for GitHub Pages
//
// The original app proxied live requests to rsp.iseu.by through
// a Node.js server. GitHub Pages only serves static files, so
// this build reads schedule data from JSON files in /data/
// (data/meta.json + data/parsed/{groupId}_{weekDate}.json),
// which a GitHub Actions crawler keeps up to date.
// ============================================================

import type { ScheduleData, SelectOption } from './types'
import { state } from './state'

const META_URL = new URL('data/meta.json', document.baseURI).href

// ── Meta loading ──────────────────────────────────────────────

export interface StaticMeta {
  updatedAt: string
  updatedAtFormatted: string
  faculties: SelectOption[]
  deps: Record<string, SelectOption[]>
  courses: string[]
  groups: Record<string, SelectOption[]>
  weeks: SelectOption[]
  targetWeeks: SelectOption[]
}

let metaCache: StaticMeta | null = null

export async function loadMeta(): Promise<StaticMeta> {
  if (metaCache) return metaCache
  const res = await fetch(META_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`meta.json: HTTP ${res.status}`)
  const meta: StaticMeta = await res.json()
  metaCache = meta
  state.isFromCache = true
  state.cachedAt = metaCache.updatedAtFormatted
  return metaCache
}

// ── Schedule fetching ─────────────────────────────────────────

export interface ParsedScheduleFile extends ScheduleData {
  groupId: string
  groupName: string
  week: string
  weekDate: string
  savedAt: string
}

function scheduleUrl(group: string, weekValue: string): string {
  const weekDate = weekValue.split(' ')[0].replace(/[^0-9.]/g, '') || 'default'
  return new URL(`data/parsed/${group}_${weekDate}.json`, document.baseURI).href
}

export async function fetchScheduleFile(group: string, weekValue: string): Promise<ParsedScheduleFile> {
  const res = await fetch(scheduleUrl(group, weekValue), { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Fetches schedule for a group+week; returns a graceful "empty" result when the file is missing. */
export async function fetchSchedule(group: string, weekValue: string): Promise<ScheduleData> {
  try {
    const file = await fetchScheduleFile(group, weekValue)
    return { days: file.days, empty: file.empty, message: file.message }
  } catch {
    return {
      days: {},
      empty: true,
      message: 'Расписание на эту неделю пока не загружено. Попробуйте позже — данные обновляются автоматически.',
    }
  }
}
