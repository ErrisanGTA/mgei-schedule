import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseClassTime,
  formatRemainingTime,
  formatRemainingCompact,
  getClassLiveStatus,
} from '../src/time.ts'

test('Live Class Countdown & Time Parser Tests', async (t) => {
  await t.test('parseClassTime: parses standard en-dash format (08:00–09:35)', () => {
    const res = parseClassTime('08:00–09:35')
    assert.ok(res)
    assert.equal(res.startHour, 8)
    assert.equal(res.startMinute, 0)
    assert.equal(res.endHour, 9)
    assert.equal(res.endMinute, 35)
    assert.equal(res.startSeconds, 8 * 3600)
    assert.equal(res.endSeconds, 9 * 3600 + 35 * 60)
    assert.equal(res.totalSeconds, 95 * 60) // 1h 35m = 95m
  })

  await t.test('parseClassTime: parses hyphen and spaces (14:00 - 15:35)', () => {
    const res = parseClassTime('14:00 - 15:35')
    assert.ok(res)
    assert.equal(res.startHour, 14)
    assert.equal(res.startMinute, 0)
    assert.equal(res.endHour, 15)
    assert.equal(res.endMinute, 35)
  })

  await t.test('parseClassTime: returns null for invalid formats', () => {
    assert.equal(parseClassTime(''), null)
    assert.equal(parseClassTime('12:00'), null)
    assert.equal(parseClassTime('invalid'), null)
    assert.equal(parseClassTime('15:00–14:00'), null) // end before start
  })

  await t.test('formatRemainingTime: formats seconds accurately in Russian', () => {
    assert.equal(formatRemainingTime(0), '0 сек')
    assert.equal(formatRemainingTime(45), '45 сек')
    assert.equal(formatRemainingTime(60), '1 мин')
    assert.equal(formatRemainingTime(90), '1 мин 30 сек')
    assert.equal(formatRemainingTime(1500), '25 мин')
    assert.equal(formatRemainingTime(1515), '25 мин 15 сек')
    assert.equal(formatRemainingTime(3600), '1 ч')
    assert.equal(formatRemainingTime(4500), '1 ч 15 мин')
  })

  await t.test('formatRemainingCompact: formats MM:SS correctly', () => {
    assert.equal(formatRemainingCompact(0), '00:00')
    assert.equal(formatRemainingCompact(45), '00:45')
    assert.equal(formatRemainingCompact(1515), '25:15')
    assert.equal(formatRemainingCompact(3665), '1:01:05')
  })

  await t.test('getClassLiveStatus: before class starts (upcoming)', () => {
    // Class: 08:00 - 09:35 (28800s - 34500s)
    // Now: 07:30 (27000s) -> 30 mins (1800s) before start
    const status = getClassLiveStatus('08:00–09:35', 7 * 3600 + 30 * 60)
    assert.ok(status)
    assert.equal(status.isCurrent, false)
    assert.equal(status.isUpcoming, true)
    assert.equal(status.isPast, false)
    assert.equal(status.startsInSeconds, 1800)
    assert.equal(status.startsInFormatted, '30 мин')
    assert.equal(status.progressPercent, 0)
  })

  await t.test('getClassLiveStatus: while class is in session (current)', () => {
    // Class: 08:00 - 09:35 (28800s - 34500s, total 5700s)
    // Now: 09:00:00 (32400s)
    // Elapsed: 3600s (60 mins)
    // Remaining: 2100s (35 mins)
    const status = getClassLiveStatus('08:00–09:35', 9 * 3600)
    assert.ok(status)
    assert.equal(status.isCurrent, true)
    assert.equal(status.isUpcoming, false)
    assert.equal(status.isPast, false)
    assert.equal(status.remainingSeconds, 2100)
    assert.equal(status.remainingFormatted, '35 мин')
    assert.equal(status.remainingCompact, '35:00')
    assert.equal(status.elapsedSeconds, 3600)
    assert.equal(status.progressPercent, Math.round((3600 / 5700) * 100)) // 63%
  })

  await t.test('getClassLiveStatus: after class has ended (past)', () => {
    // Class: 08:00 - 09:35
    // Now: 10:00 (36000s)
    const status = getClassLiveStatus('08:00–09:35', 10 * 3600)
    assert.ok(status)
    assert.equal(status.isCurrent, false)
    assert.equal(status.isUpcoming, false)
    assert.equal(status.isPast, true)
    assert.equal(status.remainingSeconds, 0)
    assert.equal(status.progressPercent, 100)
  })
})
