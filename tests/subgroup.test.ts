import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  getLabSubgroup,
  isClassVisibleForSubgroup,
  filterClassesBySubgroup,
} from '../src/ui.ts'
import { state, saveSettings, loadSettings } from '../src/state.ts'
import type { ClassEntry } from '../src/types.ts'

describe('Laboratory Subgroup Filtering Tests', () => {
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}
    ;(globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val)
      },
      removeItem: (key: string) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }
  })

  test('getLabSubgroup: correctly detects subgroup 1 from various formats', () => {
    const cls1: ClassEntry = {
      period: '1',
      time: '08:00–09:35',
      subject: 'Радиационная медицина (лаб.)',
      teacher: 'Иванов И.И.',
      room: '101',
      subgroup: '1',
      type: 'lab',
    }
    assert.equal(getLabSubgroup(cls1), '1')

    const cls2: ClassEntry = {
      ...cls1,
      subgroup: '1 п/гр',
    }
    assert.equal(getLabSubgroup(cls2), '1')

    const cls3: ClassEntry = {
      ...cls1,
      subgroup: '1 подгруппа',
    }
    assert.equal(getLabSubgroup(cls3), '1')

    const clsFromSubject: ClassEntry = {
      ...cls1,
      subject: 'Химия окружающей среды (лаб. 1 п/гр)',
      subgroup: '',
    }
    assert.equal(getLabSubgroup(clsFromSubject), '1')
  })

  test('getLabSubgroup: correctly detects subgroup 2 from various formats', () => {
    const cls1: ClassEntry = {
      period: '2',
      time: '09:50–11:25',
      subject: 'Радиационная медицина (лаб.)',
      teacher: 'Иванов И.И.',
      room: '101',
      subgroup: '2',
      type: 'lab',
    }
    assert.equal(getLabSubgroup(cls1), '2')

    const cls2: ClassEntry = {
      ...cls1,
      subgroup: '2 п/гр',
    }
    assert.equal(getLabSubgroup(cls2), '2')

    const cls3: ClassEntry = {
      ...cls1,
      subgroup: '2 подгруппа',
    }
    assert.equal(getLabSubgroup(cls3), '2')

    const clsFromSubject: ClassEntry = {
      ...cls1,
      subject: 'Информатика и основы программирования (лаб. 2 п/гр)',
      subgroup: '',
    }
    assert.equal(getLabSubgroup(clsFromSubject), '2')
  })

  test('getLabSubgroup: returns null when no subgroup is specified', () => {
    const cls: ClassEntry = {
      period: '1',
      time: '08:00–09:35',
      subject: 'Общая биология (лаб.)',
      teacher: 'Петров П.П.',
      room: '205',
      subgroup: '',
      type: 'lab',
    }
    assert.equal(getLabSubgroup(cls), null)
  })

  test('isClassVisibleForSubgroup: NEVER filters lectures and practice classes', () => {
    const lecture: ClassEntry = {
      period: '1',
      time: '08:00–09:35',
      subject: 'Высшая математика (лекц.)',
      teacher: 'Сидоров С.С.',
      room: 'Ауд. 1',
      subgroup: '1',
      type: 'lecture',
    }
    const practice: ClassEntry = {
      period: '2',
      time: '09:50–11:25',
      subject: 'Иностранный язык (практ.)',
      teacher: 'Смирнова А.А.',
      room: 'Ауд. 302',
      subgroup: '2',
      type: 'practice',
    }

    // Both should be visible regardless of subgroup setting
    assert.equal(isClassVisibleForSubgroup(lecture, '1'), true)
    assert.equal(isClassVisibleForSubgroup(lecture, '2'), true)
    assert.equal(isClassVisibleForSubgroup(lecture, 'all'), true)

    assert.equal(isClassVisibleForSubgroup(practice, '1'), true)
    assert.equal(isClassVisibleForSubgroup(practice, '2'), true)
    assert.equal(isClassVisibleForSubgroup(practice, 'all'), true)
  })

  test('isClassVisibleForSubgroup: accurately filters laboratory classes', () => {
    const lab1: ClassEntry = {
      period: '3',
      time: '11:40–13:15',
      subject: 'Физика (лаб.)',
      teacher: 'Кузнецов К.К.',
      room: 'Лаб. 4',
      subgroup: '1 п/гр',
      type: 'lab',
    }
    const lab2: ClassEntry = {
      period: '3',
      time: '11:40–13:15',
      subject: 'Физика (лаб.)',
      teacher: 'Кузнецов К.К.',
      room: 'Лаб. 4',
      subgroup: '2 п/гр',
      type: 'lab',
    }
    const labCommon: ClassEntry = {
      period: '4',
      time: '14:00–15:35',
      subject: 'Экология (лаб.)',
      teacher: 'Кузнецов К.К.',
      room: 'Лаб. 2',
      subgroup: '',
      type: 'lab',
    }

    // When 1 п/гр is selected
    assert.equal(isClassVisibleForSubgroup(lab1, '1'), true, 'Lab 1 must be visible for subgroup 1')
    assert.equal(isClassVisibleForSubgroup(lab2, '1'), false, 'Lab 2 must be HIDDEN for subgroup 1')
    assert.equal(isClassVisibleForSubgroup(labCommon, '1'), true, 'Unassigned lab must be visible')

    // When 2 п/гр is selected
    assert.equal(isClassVisibleForSubgroup(lab1, '2'), false, 'Lab 1 must be HIDDEN for subgroup 2')
    assert.equal(isClassVisibleForSubgroup(lab2, '2'), true, 'Lab 2 must be visible for subgroup 2')
    assert.equal(isClassVisibleForSubgroup(labCommon, '2'), true, 'Unassigned lab must be visible')

    // When all is selected
    assert.equal(isClassVisibleForSubgroup(lab1, 'all'), true)
    assert.equal(isClassVisibleForSubgroup(lab2, 'all'), true)
    assert.equal(isClassVisibleForSubgroup(labCommon, 'all'), true)
  })

  test('filterClassesBySubgroup: filters daily schedule array correctly', () => {
    const dayClasses: ClassEntry[] = [
      { period: '1', time: '08:00', subject: 'Математика (лекц.)', teacher: '', room: '', subgroup: '', type: 'lecture' },
      { period: '2', time: '09:50', subject: 'Физика (лаб.)', teacher: '', room: '', subgroup: '1', type: 'lab' },
      { period: '2', time: '09:50', subject: 'Физика (лаб.)', teacher: '', room: '', subgroup: '2', type: 'lab' },
      { period: '3', time: '11:40', subject: 'Химия (практ.)', teacher: '', room: '', subgroup: '', type: 'practice' },
    ]

    const forSubgroup1 = filterClassesBySubgroup(dayClasses, '1')
    assert.equal(forSubgroup1.length, 3)
    assert.ok(forSubgroup1.some(c => c.type === 'lecture'))
    assert.ok(forSubgroup1.some(c => c.type === 'practice'))
    assert.ok(forSubgroup1.some(c => c.type === 'lab' && c.subgroup === '1'))
    assert.ok(!forSubgroup1.some(c => c.type === 'lab' && c.subgroup === '2'))

    const forSubgroup2 = filterClassesBySubgroup(dayClasses, '2')
    assert.equal(forSubgroup2.length, 3)
    assert.ok(!forSubgroup2.some(c => c.type === 'lab' && c.subgroup === '1'))
    assert.ok(forSubgroup2.some(c => c.type === 'lab' && c.subgroup === '2'))

    const forAll = filterClassesBySubgroup(dayClasses, 'all')
    assert.equal(forAll.length, 4)
  })

  test('subgroup persistence: saveSettings and loadSettings save and restore subgroup', () => {
    state.currentSubgroup = '1'
    state.currentFac = '1'
    state.currentDep = '1'
    state.currentCourse = '2'
    state.currentGroup = '123'
    state.currentGroupName = 'Группа 123'

    saveSettings()

    const loaded = loadSettings()
    assert.ok(loaded)
    assert.equal(loaded.subgroup, '1')

    state.currentSubgroup = '2'
    saveSettings()
    const loaded2 = loadSettings()
    assert.ok(loaded2)
    assert.equal(loaded2.subgroup, '2')
  })
})
