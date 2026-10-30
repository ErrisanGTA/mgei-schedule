// ============================================================
// Time parsing & Live Class Countdown Module
// ============================================================

export interface ParsedTimeRange {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  startSeconds: number
  endSeconds: number
  totalSeconds: number
}

export interface ClassLiveStatus {
  isCurrent: boolean
  isUpcoming: boolean
  isPast: boolean
  remainingSeconds: number
  remainingFormatted: string
  remainingCompact: string
  elapsedSeconds: number
  progressPercent: number
  startsInSeconds?: number
  startsInFormatted?: string
}

/**
 * Parses time strings like '08:00–09:35', '08:00-09:35', '8:00 — 9:35'
 */
export function parseClassTime(timeStr: string): ParsedTimeRange | null {
  if (!timeStr || typeof timeStr !== 'string') return null
  const parts = timeStr.split(/[–—~-]/).map(s => s.trim())
  if (parts.length < 2) return null

  const [startPart, endPart] = parts
  const startMatch = startPart.match(/^(\d{1,2}):(\d{2})$/)
  const endMatch = endPart.match(/^(\d{1,2}):(\d{2})$/)
  if (!startMatch || !endMatch) return null

  const startHour = parseInt(startMatch[1], 10)
  const startMinute = parseInt(startMatch[2], 10)
  const endHour = parseInt(endMatch[1], 10)
  const endMinute = parseInt(endMatch[2], 10)

  if (
    startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
    endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59
  ) {
    return null
  }

  const startSeconds = startHour * 3600 + startMinute * 60
  const endSeconds = endHour * 3600 + endMinute * 60
  const totalSeconds = endSeconds - startSeconds

  if (totalSeconds <= 0) return null

  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    startSeconds,
    endSeconds,
    totalSeconds,
  }
}

/**
 * Formats seconds into human-readable Russian string: '24 мин 15 сек', '45 мин', '1 ч 12 мин', etc.
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '0 сек'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
  }
  if (mins > 0) {
    return secs > 0 ? `${mins} мин ${secs} сек` : `${mins} мин`
  }
  return `${secs} сек`
}

/**
 * Formats seconds into compact MM:SS or HH:MM:SS
 */
export function formatRemainingCompact(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

/**
 * Computes the real-time status of a class period given current time or seconds from midnight.
 */
export function getClassLiveStatus(
  timeStr: string,
  nowOrSeconds: Date | number = new Date()
): ClassLiveStatus | null {
  const parsed = parseClassTime(timeStr)
  if (!parsed) return null

  let nowSeconds: number
  if (typeof nowOrSeconds === 'number') {
    nowSeconds = nowOrSeconds
  } else {
    nowSeconds = nowOrSeconds.getHours() * 3600 + nowOrSeconds.getMinutes() * 60 + nowOrSeconds.getSeconds()
  }

  const { startSeconds, endSeconds, totalSeconds } = parsed

  if (nowSeconds < startSeconds) {
    const startsIn = startSeconds - nowSeconds
    return {
      isCurrent: false,
      isUpcoming: true,
      isPast: false,
      remainingSeconds: 0,
      remainingFormatted: '',
      remainingCompact: '00:00',
      elapsedSeconds: 0,
      progressPercent: 0,
      startsInSeconds: startsIn,
      startsInFormatted: formatRemainingTime(startsIn),
    }
  }

  if (nowSeconds >= startSeconds && nowSeconds <= endSeconds) {
    const remaining = endSeconds - nowSeconds
    const elapsed = nowSeconds - startSeconds
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalSeconds) * 100)))

    return {
      isCurrent: true,
      isUpcoming: false,
      isPast: false,
      remainingSeconds: remaining,
      remainingFormatted: formatRemainingTime(remaining),
      remainingCompact: formatRemainingCompact(remaining),
      elapsedSeconds: elapsed,
      progressPercent,
    }
  }

  return {
    isCurrent: false,
    isUpcoming: false,
    isPast: true,
    remainingSeconds: 0,
    remainingFormatted: '',
    remainingCompact: '00:00',
    elapsedSeconds: totalSeconds,
    progressPercent: 100,
  }
}
