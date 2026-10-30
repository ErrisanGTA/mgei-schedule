// ============================================================
// UI rendering module
// ============================================================

import type { ScheduleData, WeekDay, ClassEntry, SubgroupChoice } from './types.ts'
import { state } from './state.ts'
import { getClassLiveStatus } from './time.ts'

// ── Constants ─────────────────────────────────────────────────

export const DAY_NAMES = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
]
export const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

// ── State helpers ────────────────────────────────────────────

export type AppViewState = 'empty' | 'loading' | 'error' | 'schedule'

export function showView(v: AppViewState): void {
  const map: Record<AppViewState, string> = {
    empty: 'emptyState',
    loading: 'loadingState',
    error: 'errorState',
    schedule: 'scheduleContainer',
  }
  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id)
    if (!el) continue
    el.style.display = v === (key as AppViewState) ? (key === 'schedule' ? 'block' : 'flex') : 'none'
  }
}

export function showError(msg: string): void {
  const el = document.getElementById('errorDesc')
  if (el) el.textContent = msg
  showView('error')
}

// ── Dropdowns ────────────────────────────────────────────────

export function populateSelect(id: string, options: { value: string; text: string }[], currentValue?: string): void {
  const sel = document.getElementById(id) as HTMLSelectElement | null
  if (!sel) return
  sel.innerHTML = ''
  for (const o of options) {
    const opt = document.createElement('option')
    opt.value = o.value
    opt.textContent = o.text
    sel.appendChild(opt)
  }
  if (currentValue) sel.value = currentValue
}

export function populateGroupSelect(currentGroup?: string): void {
  const sel = document.getElementById('selGroup') as HTMLSelectElement | null
  if (!sel) return
  sel.innerHTML = '<option value="">Выберите группу</option>'
  for (const g of state.groups) {
    const opt = document.createElement('option')
    opt.value = g.value
    opt.textContent = g.text
    sel.appendChild(opt)
  }
  if (currentGroup) sel.value = currentGroup
}

// ── Week navigation ──────────────────────────────────────────

export function getWeekDisplayLabel(weekValue: string): string {
  const dateStr = weekValue.split(' ')[0]
  const parts = dateStr.split('.')
  if (parts.length < 3) return weekValue

  const start = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
  const end = new Date(start.getTime() + 5 * 86_400_000)

  const fmt = (d: Date): string =>
    `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`

  return `${fmt(start)} — ${fmt(end)}.${end.getFullYear()}`
}

export function updateWeekDisplay(): void {
  const week = state.weeks[state.currentWeekIdx]
  if (!week) return

  const el = document.getElementById('weekDatesDisplay')
  if (el) el.textContent = getWeekDisplayLabel(week.value)

  const btnPrev = document.getElementById('btnPrevWeek') as HTMLButtonElement | null
  const btnNext = document.getElementById('btnNextWeek') as HTMLButtonElement | null
  if (btnPrev) btnPrev.disabled = state.currentWeekIdx >= state.weeks.length - 1
  if (btnNext) btnNext.disabled = state.currentWeekIdx <= 0
}

// ── Week days builder ────────────────────────────────────────

export function buildWeekDays(weekValue: string): WeekDay[] {
  const dateStr = weekValue.split(' ')[0]
  const parts = dateStr.split('.')

  let startDate: Date
  if (parts.length >= 3) {
    startDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
  } else {
    startDate = new Date()
    const dow = startDate.getDay()
    startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1))
  }

  const days: WeekDay[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(startDate.getTime() + i * 86_400_000)
    days.push({
      dow: d.getDay(),
      date: d,
      dateStr: `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      dayName: DAY_NAMES[d.getDay()],
      dayShort: DAY_NAMES_SHORT[d.getDay()],
    })
  }
  return days
}

// ── Subgroup filtering ───────────────────────────────────────

/**
 * Detects whether a laboratory work belongs to subgroup '1', '2', 'both', or null (undivided / whole group).
 */
export function getLabSubgroup(cls: ClassEntry): '1' | '2' | 'both' | null {
  const text = `${cls.subgroup || ''} ${cls.subject || ''} ${(cls.topics || []).join(' ')}`.toLowerCase()

  // Matches for subgroup 1: e.g. "1", "1 п/гр", "1 подгр", "1-я подгруппа", "подгр. 1", "п/г 1"
  const has1 = /(?:^|[^\d])1\s*(?:п\/?гр|подгр|п\/г|подгрупп)|подгр[^\d]*1/.test(text) || cls.subgroup.trim() === '1'
  // Matches for subgroup 2: e.g. "2", "2 п/гр", "2 подгр", "2-я подгруппа", "подгр. 2", "п/г 2"
  const has2 = /(?:^|[^\d])2\s*(?:п\/?гр|подгр|п\/г|подгрупп)|подгр[^\d]*2/.test(text) || cls.subgroup.trim() === '2'

  if (has1 && has2) return 'both'
  if (has1) return '1'
  if (has2) return '2'
  return null
}

/**
 * Checks if a class is visible for the student's chosen subgroup.
 * IMPORTANT: Applies exclusively to laboratory works (`cls.type === 'lab'`).
 * Lectures, seminars, practices etc. are ALWAYS visible.
 */
export function isClassVisibleForSubgroup(cls: ClassEntry, selectedSubgroup: SubgroupChoice = state.currentSubgroup): boolean {
  if (!selectedSubgroup || selectedSubgroup === 'all') return true

  // Only filter laboratory works: "это относится только к лабораторным работам"
  if (cls.type !== 'lab') return true

  const labGroup = getLabSubgroup(cls)
  if (labGroup === null || labGroup === 'both') {
    // If not split by subgroup or applies to both, show to all
    return true
  }

  return labGroup === selectedSubgroup
}

/**
 * Filters an array of classes based on the chosen subgroup.
 */
export function filterClassesBySubgroup(classes: ClassEntry[], subgroup: SubgroupChoice = state.currentSubgroup): ClassEntry[] {
  return classes.filter(cls => isClassVisibleForSubgroup(cls, subgroup))
}

// ── Schedule day matching ────────────────────────────────────

export function getDayClasses(day: WeekDay, schedule: ScheduleData, subgroup: SubgroupChoice = state.currentSubgroup): ClassEntry[] {
  const ruDays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

  let dayClasses: ClassEntry[] = []
  for (const [key, classes] of Object.entries(schedule.days)) {
    const low = key.toLowerCase()
    const target = ruDays[day.dow]
    if (target && low.startsWith(target.substring(0, 4))) {
      dayClasses = classes
      break
    }
    if (key.includes(day.dateStr)) {
      dayClasses = classes
      break
    }
  }

  return filterClassesBySubgroup(dayClasses, subgroup)
}

// ── Schedule rendering ───────────────────────────────────────

// Track full week view state
let _weekViewActive = false
let _cachedWeekDays: WeekDay[] = []
let _cachedSchedule: ScheduleData | null = null

export function reRenderCurrentSchedule(): void {
  if (_cachedSchedule && state.weeks[state.currentWeekIdx]) {
    renderSchedule(_cachedSchedule, state.weeks[state.currentWeekIdx].value)
  }
}

export function updateCacheBanner(): void {
  // Banner removed from the main view; the "last updated" info now lives
  // in the settings modal (rendered by updateSettingsUpdateInfo in main.ts).
  // Kept as a no-op for API compatibility.
}export function renderSchedule(schedule: ScheduleData, weekValue: string): void {
  _weekViewActive = false
  _cachedSchedule = schedule
  _cachedWeekDays = []

  if (schedule.empty) {
    const weekSection = document.getElementById('weekSection')
    if (weekSection) weekSection.style.display = 'block'
    updateWeekDisplay()
    showView('schedule')

    const tabs = document.getElementById('dayTabs')
    const content = document.getElementById('scheduleContent')
    const btnWeekView = document.getElementById('btnWeekView')
    if (tabs) tabs.innerHTML = ''
    if (btnWeekView) btnWeekView.style.display = 'none'
    if (content) {
      content.innerHTML = `
        <div class="week-empty">
          <div class="week-empty-icon">
            <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-floating-leaf" aria-hidden="true">
              <path d="M12 2v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="m4.93 19.07 1.41-1.41"/>
              <path d="M12 20v2"/>
              <path d="m19.07 19.07-1.41-1.41"/>
              <path d="M20 12h2"/>
              <path d="m19.07 4.93-1.41 1.41"/>
              <circle cx="12" cy="12" r="5"/>
            </svg>
          </div>
          <div class="week-empty-title">Занятий нет</div>
          <div class="week-empty-sub">${schedule.message ?? 'На этой неделе занятий не запланировано'}</div>
        </div>
      `
    }
    return
  }

  const weekDays = buildWeekDays(weekValue)
  _cachedWeekDays = weekDays

  showView('schedule')
  const weekSection = document.getElementById('weekSection')
  if (weekSection) weekSection.style.display = 'block'
  updateWeekDisplay()

  renderDayTabs(weekDays, schedule)

  // Auto-select today or first day with classes
  const today = new Date()
  const todayDow = today.getDay()
  let initialIdx = 0
  for (let i = 0; i < weekDays.length; i++) {
    if (weekDays[i].dow === todayDow) { initialIdx = i; break }
  }

  state.activeDayIdx = initialIdx
  setActiveTab(initialIdx, weekDays, schedule)

  // Show week view button
  const btnWeekView = document.getElementById('btnWeekView')
  if (btnWeekView) {
    btnWeekView.style.display = 'flex'
    btnWeekView.classList.remove('active')
    btnWeekView.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      Показать всю неделю
    `
    btnWeekView.onclick = toggleWeekView
  }
}

function toggleWeekView(): void {
  if (!_cachedSchedule || _cachedWeekDays.length === 0) return
  _weekViewActive = !_weekViewActive

  const btn = document.getElementById('btnWeekView')
  const tabs = document.getElementById('dayTabs')

  if (_weekViewActive) {
    // Show full week
    if (tabs) tabs.style.display = 'none'
    renderFullWeekView(_cachedWeekDays, _cachedSchedule)
    if (btn) {
      btn.classList.add('active')
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        По дням (вкладки)
      `
    }
  } else {
    // Back to tabs
    if (tabs) tabs.style.display = 'flex'
    setActiveTab(state.activeDayIdx, _cachedWeekDays, _cachedSchedule)
    if (btn) {
      btn.classList.remove('active')
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        Показать всю неделю
      `
    }
  }
}

function renderWeekRow(cls: ClassEntry, isToday: boolean, now: Date): string {
  const typeClass = cls.type === 'lab' ? 'lab' : cls.type === 'practice' ? 'pra' : cls.type === 'lecture' ? 'lec' : 'oth'
  const live = isToday && cls.time ? getClassLiveStatus(cls.time, now) : null
  const isCurrent = Boolean(live?.isCurrent)
  const room = cls.room ? `<span class="wl-room">${cls.room}</span>` : ''
  const teacher = cls.teacher ? `<span class="wl-teacher">${cls.teacher}</span>` : ''
  const subgroup = cls.subgroup ? `<span class="wl-subgroup">п/г ${cls.subgroup}</span>` : ''
  return `
    <div class="wl-row ${typeClass}${isCurrent ? ' wl-current' : ''}">
      <div class="wl-time">
        <span class="wl-period">${cls.period || '?'}</span>
        ${cls.time ? `<span class="wl-clock">${cls.time}</span>` : ''}
      </div>
      <div class="wl-info">
        <div class="wl-subject">${cls.subject}</div>
        <div class="wl-meta">${room}${subgroup}${teacher}</div>
      </div>
    </div>`
}

function renderFullWeekView(weekDays: WeekDay[], schedule: ScheduleData): void {
  const container = document.getElementById('scheduleContent')
  if (!container) return

  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`

  const blocks = weekDays.map(day => {
    const classes = getDayClasses(day, schedule)
    const isToday = day.dateStr === todayStr

    const rows = classes.length > 0
      ? classes.map(cls => renderWeekRow(cls, isToday, today)).join('')
      : '<div class="wl-empty">Занятий нет</div>'

    const chip = isToday
      ? '<span class="wl-today-chip">сейчас</span>'
      : `<span class="wl-count">${classes.length}</span>`

    return `
      <div class="wl-day${isToday ? ' wl-today' : ''}">
        <div class="wl-day-header">
          <span class="wl-day-name">${day.dayName}</span>
          <span class="wl-day-date">${day.dateStr}</span>
          ${chip}
        </div>
        <div class="wl-body">${rows}</div>
      </div>`
  }).join('')

  container.innerHTML = `<div class="full-week-view week-list-view">${blocks}</div>`
  container.className = 'day-schedule'
}

function renderDayTabs(weekDays: WeekDay[], schedule: ScheduleData): void {
  const container = document.getElementById('dayTabs')
  if (!container) return

  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`

  container.innerHTML = ''
  container.style.display = 'flex'

  weekDays.forEach((day, idx) => {
    const isToday = day.dateStr === todayStr
    const dayClasses = getDayClasses(day, schedule)
    const count = dayClasses.length

    const tab = document.createElement('button')
    tab.className = `day-tab${isToday ? ' today' : ''}`
    tab.id = `dayTab${idx}`
    tab.setAttribute('aria-label', `${day.dayName}, ${day.dateStr}`)
    tab.innerHTML = `
      ${isToday ? '<span class="day-badge"><span class="pulse-beacon"></span>Сегодня</span>' : ''}
      <span class="day-name">${day.dayShort}</span>
      <span class="day-date">${day.dateStr}</span>
      <span class="day-count${count === 0 ? ' day-count--empty' : ''}">${count > 0 ? count + ' пар' : '—'}</span>
    `
    tab.addEventListener('click', () => {
      _weekViewActive = false
      const btn = document.getElementById('btnWeekView')
      if (btn) {
        btn.classList.remove('active')
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Показать всю неделю
        `
      }
      container.style.display = 'flex'
      setActiveTab(idx, weekDays, schedule)
    })
    container.appendChild(tab)
  })
}

export function setActiveTab(idx: number, weekDays: WeekDay[], schedule: ScheduleData): void {
  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'))
  const tab = document.getElementById(`dayTab${idx}`)
  if (tab) tab.classList.add('active')
  state.activeDayIdx = idx
  renderDayContent(weekDays[idx], getDayClasses(weekDays[idx], schedule))
}

function renderDayContent(day: WeekDay, classes: ClassEntry[]): void {
  const container = document.getElementById('scheduleContent')
  if (!container) return

  if (!classes || classes.length === 0) {
    container.innerHTML = `
      <div class="no-classes">
        <div class="no-classes-icon-svg">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-floating-leaf" aria-hidden="true">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        <div class="no-classes-text">Занятий нет</div>
        <div class="no-classes-sub">${day.dayName}, ${day.dateStr} — свободный день</div>
      </div>
    `
    container.className = 'day-schedule'
    return
  }

  const now = new Date()
  const isToday = day.date.toDateString() === now.toDateString()

  // Detect active ongoing class on today
  let activeBannerHtml = ''
  if (isToday) {
    for (const cls of classes) {
      if (cls.time) {
        const live = getClassLiveStatus(cls.time, now)
        if (live && live.isCurrent) {
          const typeLabel: Record<string, string> = {
            lecture: 'Лекция', practice: 'Практика', lab: 'Лаб. работа', other: 'Занятие',
          }
          activeBannerHtml = `
            <div class="active-class-banner" id="activeClassBanner">
              <div class="active-banner-main">
                <div class="active-banner-pulse-col">
                  <span class="pulse-beacon large"></span>
                </div>
                <div class="active-banner-info">
                  <div class="active-banner-heading">
                    <span class="active-banner-tag">Идёт сейчас</span>
                    <span class="active-banner-period">${cls.period || '—'} пара (${cls.time})</span>
                  </div>
                  <div class="active-banner-title">${cls.subject}</div>
                  <div class="active-banner-meta">
                    <span class="active-banner-meta-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="inline-svg-icon" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      До конца пары: <strong class="time-countdown-val active-banner-countdown" data-class-time="${cls.time}">${live.remainingFormatted}</strong>
                    </span>
                    <span class="active-banner-sep">•</span>
                    <span>${typeLabel[cls.type] ?? 'Занятие'}</span>
                    ${cls.room ? `<span class="active-banner-sep">•</span><span>Ауд. ${cls.room}</span>` : ''}
                    ${cls.teacher ? `<span class="active-banner-sep">•</span><span>${cls.teacher}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="class-live-progress-bar-wrap" title="Прогресс пары: ${live.progressPercent}%">
                <div class="class-live-progress-fill" data-class-progress="${cls.time}" style="width: ${live.progressPercent}%;"></div>
              </div>
            </div>
          `
          break
        }
      }
    }
  }

  const cards = classes.map(cls => renderClassCard(cls, isToday, now)).join('')
  container.innerHTML = `${activeBannerHtml}<div class="class-list">${cards}</div>`
  container.className = 'day-schedule'
}

function getClassTypeIcon(type: string): string {
  switch (type) {
    case 'lab':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="type-icon icon-lab" aria-hidden="true"><path d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.6a1 1 0 0 0 .9 1.4h12.8a1 1 0 0 0 .9-1.4l-5.1-10.2a2 2 0 0 1-.2-.9V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>`
    case 'lecture':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="type-icon icon-lec" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>`
    case 'practice':
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="type-icon icon-pra" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>`
    default:
      return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="type-icon icon-oth" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>`
  }
}

function renderClassCard(cls: ClassEntry, isToday: boolean, nowOrSeconds: Date | number = new Date()): string {
  const liveStatus = isToday && cls.time ? getClassLiveStatus(cls.time, nowOrSeconds) : null
  const isCurrent = Boolean(liveStatus?.isCurrent)

  const typeClass = cls.type === 'lab' ? 'lab' : cls.type === 'practice' ? 'pra' : cls.type === 'lecture' ? 'lec' : 'oth'
  const typeLabel: Record<string, string> = {
    lecture: 'Лекция', practice: 'Практика', lab: 'Лаб. работа', other: 'Занятие',
  }
  const topicsHtml = cls.topics?.length
    ? `<div class="class-topics">${cls.topics.map(t => `<span class="class-topic">${t}</span>`).join('')}</div>`
    : ''

  const typeIconSvg = getClassTypeIcon(cls.type)

  return `
    <div class="class-card type-${cls.type}${isCurrent ? ' current-class' : ''}">
      ${isCurrent && liveStatus ? `
        <div class="current-badge live-countdown-badge" title="До конца пары осталось ${liveStatus.remainingFormatted}">
          <span class="pulse-beacon"></span>
          <span>Идёт сейчас • осталось <strong class="time-countdown-val" data-class-time="${cls.time}">${liveStatus.remainingFormatted}</strong></span>
        </div>
      ` : ''}
      <div class="class-time-col">
        <div class="class-period">${cls.period || '?'}</div>
        <div class="class-time">${cls.time || ''}</div>
      </div>
      <div class="class-info-col">
        <div class="class-discipline">${cls.subject}</div>
        <div class="class-meta">
          <span class="class-badge badge-type ${typeClass}">
            ${typeIconSvg}
            ${typeLabel[cls.type] ?? 'Занятие'}
          </span>
          ${cls.room ? `
            <span class="class-badge badge-room">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="meta-icon" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${cls.room}
            </span>
          ` : ''}
          ${cls.subgroup ? `
            <span class="class-subgroup">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="meta-icon" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Подгр. ${cls.subgroup}
            </span>
          ` : ''}
        </div>
        ${cls.teacher ? `
          <div class="class-teacher">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="meta-icon" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ${cls.teacher}
          </div>
        ` : ''}
        ${topicsHtml}
        ${isCurrent && liveStatus ? `
          <div class="class-live-progress-bar-wrap" title="Прогресс пары: ${liveStatus.progressPercent}%">
            <div class="class-live-progress-fill" data-class-progress="${cls.time}" style="width: ${liveStatus.progressPercent}%;"></div>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

// ── Clock & Live Schedule Ticker ─────────────────────────────

export function startClock(): void {
  const el = document.getElementById('currentTime')

  const update = (): void => {
    const now = new Date()

    if (el) {
      const timeText = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      el.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-svg-icon" style="margin-right:5px;vertical-align:-1px;" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>${timeText}</span>
      `
    }

    // Live update all active countdown displays
    const countdownEls = document.querySelectorAll<HTMLElement>('.time-countdown-val[data-class-time]')
    let stateChanged = false

    countdownEls.forEach(countdownEl => {
      const timeStr = countdownEl.dataset.classTime
      if (!timeStr) return
      const status = getClassLiveStatus(timeStr, now)
      if (status && status.isCurrent) {
        if (countdownEl.textContent !== status.remainingFormatted) {
          countdownEl.textContent = status.remainingFormatted
        }
      } else {
        // Active pair ended!
        stateChanged = true
      }
    })

    // Live update all progress bars
    const progressEls = document.querySelectorAll<HTMLElement>('.class-live-progress-fill[data-class-progress]')
    progressEls.forEach(progEl => {
      const timeStr = progEl.dataset.classProgress
      if (!timeStr) return
      const status = getClassLiveStatus(timeStr, now)
      if (status && status.isCurrent) {
        progEl.style.width = `${status.progressPercent}%`
      }
    })

    // If active pair ended or at second 0 check if new pair started
    if (stateChanged) {
      reRenderCurrentSchedule()
    } else if (now.getSeconds() === 0 && _cachedSchedule) {
      // Re-evaluate current day classes in case a new pair begins
      const hasTodayActiveTab = document.querySelector('.day-tab.today.active')
      if (hasTodayActiveTab) {
        reRenderCurrentSchedule()
      }
    }
  }

  update()
  setInterval(update, 1000)
}
