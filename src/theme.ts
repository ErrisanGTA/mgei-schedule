// ============================================================
// Theme management for ISEU Schedule App
// Separate storage key keeps existing faculty/form/course/group
// persistence completely untouched.
// ============================================================

export type ThemeId =
  | 'emerald'
  | 'ocean'
  | 'amethyst'
  | 'amber'
  | 'dark'
  | 'dark-sapphire'
  | 'dark-amethyst'
  | 'dark-amber'

export interface ThemeOption {
  value: ThemeId
  label: string
  iconSvg: string
  description: string
  primaryColor: string
  bgPreview: string
  cardPreview: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  // ── 4 Light Themes ──
  {
    value: 'emerald',
    label: 'Эко-Изумруд',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M12 20V10"/><path d="M12 10c0-4.5 3.5-7 7-7 0 4.5-3.5 7-7 7z"/><path d="M12 14c0-3.5-2.5-5.5-5-5.5 0 3.5 2.5 5.5 5 5.5z"/></svg>`,
    description: 'Фирменный стиль МГЭИ',
    primaryColor: '#16a34a',
    bgPreview: '#f0faf4',
    cardPreview: '#ffffff',
  },
  {
    value: 'ocean',
    label: 'Лазурный океан',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5-3 5.5-3 8 0 2.5 3 5.5 3 8 0 1.5-1.8 3-2.5 4-2"/><path d="M2 17c2.5-3 5.5-3 8 0 2.5 3 5.5 3 8 0 1.5-1.8 3-2.5 4-2"/></svg>`,
    description: 'Морская свежесть и глубина',
    primaryColor: '#0284c7',
    bgPreview: '#f0f7ff',
    cardPreview: '#ffffff',
  },
  {
    value: 'amethyst',
    label: 'Аметист',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20"/><path d="M10 3l-2 6 4 12 4-12-2-6"/></svg>`,
    description: 'Фиолетовый закат и неон',
    primaryColor: '#7c3aed',
    bgPreview: '#faf5ff',
    cardPreview: '#ffffff',
  },
  {
    value: 'amber',
    label: 'Тёплый янтарь',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    description: 'Уютная золотая осень',
    primaryColor: '#d97706',
    bgPreview: '#fffbeb',
    cardPreview: '#ffffff',
  },
  // ── 4 Dark Themes ──
  {
    value: 'dark',
    label: 'Изумрудная ночь',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/><path d="M19 3v4M17 5h4"/></svg>`,
    description: 'Тёмный изумрудный режим',
    primaryColor: '#10b981',
    bgPreview: '#0b0f19',
    cardPreview: '#131b2e',
  },
  {
    value: 'dark-sapphire',
    label: 'Глубокий космос',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><path d="M2 14c3.5-3.5 12-6.5 19-3"/><path d="M3 10c7 6.5 15.5 3.5 19 0"/></svg>`,
    description: 'Кибернетический сапфир',
    primaryColor: '#0ea5e9',
    bgPreview: '#080c14',
    cardPreview: '#0f172a',
  },
  {
    value: 'dark-amethyst',
    label: 'Неоновый аметист',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>`,
    description: 'OLED ультрафиолет',
    primaryColor: '#a855f7',
    bgPreview: '#0c0714',
    cardPreview: '#170e28',
  },
  {
    value: 'dark-amber',
    label: 'Вулканический янтарь',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    description: 'Обсидиановое золото',
    primaryColor: '#f59e0b',
    bgPreview: '#120f0c',
    cardPreview: '#1c1612',
  },
]

export const THEME_STORAGE_KEY = 'iseu_theme_v1'
export const DEFAULT_THEME: ThemeId = 'emerald'

// Legacy mappings for backward compatibility
const LEGACY_MAP: Record<string, ThemeId> = {
  'light-green': 'emerald',
  'dark-green': 'dark',
  'white-gray': 'ocean',
}

export function normalizeThemeId(raw: string | null | undefined): ThemeId {
  if (!raw) return DEFAULT_THEME
  if (THEME_OPTIONS.some(t => t.value === raw)) return raw as ThemeId
  if (LEGACY_MAP[raw]) return LEGACY_MAP[raw]
  return DEFAULT_THEME
}

export function loadTheme(): ThemeId {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      return normalizeThemeId(saved)
    }
  } catch {
    // Ignore storage errors and use the default theme.
  }
  return DEFAULT_THEME
}

export function saveTheme(theme: ThemeId): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    // Ignore storage errors; the current theme remains applied for this session.
  }
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = theme

    // Update <meta name="theme-color"> if present
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    const option = THEME_OPTIONS.find(t => t.value === theme)
    if (metaThemeColor && option) {
      metaThemeColor.setAttribute('content', option.primaryColor)
    }
  }
}
