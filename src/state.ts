// ============================================================
// State management for ISEU Schedule App
// ============================================================

import type { AppState, AppSettings } from './types'

const STORAGE_KEY = 'iseu_schedule_v2'

export const state: AppState = {
  faculties: [],
  deps: [],
  groups: [],
  weeks: [],
  currentFac: '',
  currentDep: '',
  currentCourse: '1',
  currentGroup: '',
  currentGroupName: '',
  currentWeekIdx: 0,
  currentSubgroup: 'all',
  schedule: null,
  activeDayIdx: -1,
  sessionLoaded: false,
  isFromCache: false,
  cachedAt: null,
}

export function saveSettings(): void {
  const s: AppSettings = {
    fac: state.currentFac,
    dep: state.currentDep,
    course: state.currentCourse,
    group: state.currentGroup,
    groupName: state.currentGroupName,
    subgroup: state.currentSubgroup,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function loadSettings(): AppSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppSettings
  } catch {
    return null
  }
}

export function findCurrentWeekIdx(): number {
  const now = Date.now()
  for (let i = 0; i < state.weeks.length; i++) {
    const w = state.weeks[i]
    const parts = w.text.split('.')
    if (parts.length >= 3) {
      const start = new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      )
      const end = new Date(start.getTime() + 7 * 86_400_000)
      if (now >= start.getTime() && now < end.getTime()) return i
    }
  }
  return 0 // default to first (latest) week
}
