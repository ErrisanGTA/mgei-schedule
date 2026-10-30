import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  normalizeThemeId,
  loadTheme,
  saveTheme,
  applyTheme,
  type ThemeId,
} from '../src/theme.ts'

describe('Theme System Tests', () => {
  // Mock localStorage and document for testing environment
  let mockStorage: Record<string, string> = {}
  let mockDataset: Record<string, string> = {}
  let mockMetaAttributes: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}
    mockDataset = {}
    mockMetaAttributes = {}

    // Mock global localStorage
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

    // Mock global document
    ;(globalThis as any).document = {
      documentElement: {
        dataset: mockDataset,
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return {
            setAttribute: (attr: string, val: string) => {
              mockMetaAttributes[attr] = val
            },
            getAttribute: (attr: string) => mockMetaAttributes[attr] ?? null,
          }
        }
        return null
      },
    }
  })

  test('should provide exactly 8 distinct and beautifully configured themes (4 light, 4 dark)', () => {
    assert.equal(THEME_OPTIONS.length, 8, 'Must have exactly 8 themes')

    const expectedIds: ThemeId[] = [
      'emerald',
      'ocean',
      'amethyst',
      'amber',
      'dark',
      'dark-sapphire',
      'dark-amethyst',
      'dark-amber',
    ]
    const actualIds = THEME_OPTIONS.map(t => t.value)
    assert.deepEqual(actualIds, expectedIds, 'Theme IDs must match expected 8 themes')

    // Every theme must have complete metadata
    for (const theme of THEME_OPTIONS) {
      assert.ok(theme.value, 'Theme value must be defined')
      assert.ok(theme.label, 'Theme label must be defined')
      assert.ok(theme.iconSvg, 'Theme iconSvg must be defined')
      assert.match(theme.iconSvg, /<svg[\s\S]*<\/svg>/, 'Theme iconSvg must be valid SVG')
      assert.ok(theme.description, 'Theme description must be defined')
      assert.match(theme.primaryColor, /^#[0-9a-fA-F]{6}$/, 'primaryColor must be hex')
      assert.match(theme.bgPreview, /^#[0-9a-fA-F]{6}$/, 'bgPreview must be hex')
      assert.match(theme.cardPreview, /^#[0-9a-fA-F]{6}$/, 'cardPreview must be hex')
    }
  })

  test('normalizeThemeId: should return DEFAULT_THEME for empty or invalid values', () => {
    assert.equal(normalizeThemeId(null), DEFAULT_THEME)
    assert.equal(normalizeThemeId(undefined), DEFAULT_THEME)
    assert.equal(normalizeThemeId(''), DEFAULT_THEME)
    assert.equal(normalizeThemeId('unknown-random-theme'), DEFAULT_THEME)
  })

  test('normalizeThemeId: should accept all 8 valid themes directly', () => {
    const validThemes: ThemeId[] = [
      'emerald',
      'ocean',
      'amethyst',
      'amber',
      'dark',
      'dark-sapphire',
      'dark-amethyst',
      'dark-amber',
    ]
    for (const id of validThemes) {
      assert.equal(normalizeThemeId(id), id)
    }
  })

  test('normalizeThemeId: should migrate legacy theme keys cleanly', () => {
    assert.equal(normalizeThemeId('light-green'), 'emerald')
    assert.equal(normalizeThemeId('dark-green'), 'dark')
    assert.equal(normalizeThemeId('white-gray'), 'ocean')
  })

  test('loadTheme: should return DEFAULT_THEME if localStorage is empty', () => {
    assert.equal(loadTheme(), 'emerald')
  })

  test('loadTheme and saveTheme: should persist and restore chosen theme', () => {
    const allThemes: ThemeId[] = [
      'emerald',
      'ocean',
      'amethyst',
      'amber',
      'dark',
      'dark-sapphire',
      'dark-amethyst',
      'dark-amber',
    ]
    for (const theme of allThemes) {
      saveTheme(theme)
      assert.equal(mockStorage[THEME_STORAGE_KEY], theme)
      assert.equal(loadTheme(), theme)
    }
  })

  test('loadTheme: should gracefully handle corrupted or legacy storage', () => {
    mockStorage[THEME_STORAGE_KEY] = 'light-green'
    assert.equal(loadTheme(), 'emerald', 'Legacy light-green should migrate to emerald')

    mockStorage[THEME_STORAGE_KEY] = 'some-corrupted-junk'
    assert.equal(loadTheme(), 'emerald', 'Corrupted key should safely fallback to default')
  })

  test('applyTheme: should set dataset.theme on documentElement and update meta theme-color', () => {
    applyTheme('dark')
    assert.equal(mockDataset.theme, 'dark')
    assert.equal(mockMetaAttributes.content, '#10b981')

    applyTheme('dark-sapphire')
    assert.equal(mockDataset.theme, 'dark-sapphire')
    assert.equal(mockMetaAttributes.content, '#0ea5e9')

    applyTheme('dark-amethyst')
    assert.equal(mockDataset.theme, 'dark-amethyst')
    assert.equal(mockMetaAttributes.content, '#a855f7')

    applyTheme('dark-amber')
    assert.equal(mockDataset.theme, 'dark-amber')
    assert.equal(mockMetaAttributes.content, '#f59e0b')

    applyTheme('amethyst')
    assert.equal(mockDataset.theme, 'amethyst')
    assert.equal(mockMetaAttributes.content, '#7c3aed')

    applyTheme('amber')
    assert.equal(mockDataset.theme, 'amber')
    assert.equal(mockMetaAttributes.content, '#d97706')

    applyTheme('ocean')
    assert.equal(mockDataset.theme, 'ocean')
    assert.equal(mockMetaAttributes.content, '#0284c7')

    applyTheme('emerald')
    assert.equal(mockDataset.theme, 'emerald')
    assert.equal(mockMetaAttributes.content, '#16a34a')
  })
})
