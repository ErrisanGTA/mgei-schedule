// ============================================================
// Types for ISEU Schedule App
// ============================================================

export interface SelectOption {
  value: string
  text: string
}

export type ClassType = 'lecture' | 'practice' | 'lab' | 'other'

export interface ClassEntry {
  period: string
  time: string
  subject: string
  teacher: string
  room: string
  subgroup: string
  type: ClassType
  /** topics / notes if present */
  topics?: string[]
}

export interface DaySchedule {
  [dayName: string]: ClassEntry[]
}

export interface ScheduleData {
  days: DaySchedule
  empty: boolean
  message?: string
}

export interface WeekDay {
  dow: number          // 0=Sun, 1=Mon, ...6=Sat
  date: Date
  dateStr: string      // DD.MM
  dayName: string      // Понедельник etc.
  dayShort: string     // Пн etc.
}

export type SubgroupChoice = 'all' | '1' | '2'

export interface AppSettings {
  fac: string
  dep: string
  course: string
  group: string
  groupName: string
  subgroup?: SubgroupChoice
}

export interface AppState {
  faculties: SelectOption[]
  deps: SelectOption[]
  groups: SelectOption[]
  weeks: SelectOption[]

  currentFac: string
  currentDep: string
  currentCourse: string
  currentGroup: string
  currentGroupName: string
  currentWeekIdx: number
  currentSubgroup: SubgroupChoice

  schedule: ScheduleData | null
  activeDayIdx: number

  sessionLoaded: boolean
  isFromCache: boolean
  cachedAt: string | null
}
