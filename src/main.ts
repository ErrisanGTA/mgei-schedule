// ============================================================
// МГЭИ им. А.Д. Сахарова БГУ — Schedule App (static build)
// ============================================================

import './style.css'
import { renderAnimatedLogo } from './logo'
import { loadMeta, fetchSchedule, type StaticMeta } from './api'
import { state, saveSettings, loadSettings, findCurrentWeekIdx } from './state'
import {
  showView,
  showError,
  populateSelect,
  populateGroupSelect,
  updateWeekDisplay,
  renderSchedule,
  reRenderCurrentSchedule,
  startClock,
} from './ui'
import {
  THEME_OPTIONS,
  loadTheme,
  saveTheme,
  applyTheme,
} from './theme'
import type { SubgroupChoice } from './types'

// ── HTML Template ─────────────────────────────────────────────

const template = `
  <div class="bg-animated">
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>
  </div>

  <header class="header">
    <div class="header-inner">
      <div class="logo">
        <div class="logo-icon" title="МГЭИ им. А.Д. Сахарова БГУ">
          ${renderAnimatedLogo(36)}
        </div>
        <div class="logo-text">
          <span class="logo-title">МГЭИ</span>
          <span class="logo-sub">им. А.Д. Сахарова БГУ</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-icon" id="btnSettings" title="Настройки группы" aria-label="Настройки">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="btn-icon" id="btnRefresh" title="Обновить расписание" aria-label="Обновить">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <div class="current-time" id="currentTime"></div>
      </div>
    </div>
  </header>

  <!-- Settings Modal -->
  <div class="modal-overlay" id="settingsModal" role="dialog" aria-modal="true" aria-label="Настройки">
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Настройки
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="modal-hint">Сохраняются автоматически</span>
          <button class="modal-close" id="btnCloseSettings" aria-label="Закрыть">✕</button>
        </div>
      </div>
      <div class="settings-grid">
        <div class="form-group">
          <label class="form-label" for="selFac">Факультет</label>
          <div class="select-wrapper">
            <select id="selFac" aria-label="Выберите факультет"><option value="">Загрузка...</option></select>
            <span class="select-arrow" aria-hidden="true">&#9662;</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="selDep">Форма обучения</label>
          <div class="select-wrapper">
            <select id="selDep" aria-label="Выберите форму обучения"><option value="">Загрузка...</option></select>
            <span class="select-arrow" aria-hidden="true">&#9662;</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="selCourse">Курс</label>
          <div class="select-wrapper">
            <select id="selCourse" aria-label="Выберите курс">
              <option value="1">1 курс</option>
              <option value="2">2 курс</option>
              <option value="3">3 курс</option>
              <option value="4">4 курс</option>
              <option value="5">5 курс</option>
            </select>
            <span class="select-arrow" aria-hidden="true">&#9662;</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="selGroup">Группа</label>
          <div class="select-wrapper">
            <select id="selGroup" aria-label="Выберите группу"><option value="">Выберите группу</option></select>
            <span class="select-arrow" aria-hidden="true">&#9662;</span>
          </div>
        </div>
      </div>

      <div class="subgroup-section">
        <div class="subgroup-header">
          <label class="subgroup-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Подгруппа (лабораторные работы)
          </label>
          <span class="subgroup-hint">Фильтрует только лабораторные</span>
        </div>
        <div class="subgroup-pills" role="radiogroup" aria-label="Выбор подгруппы для лабораторных">
          <button type="button" class="subgroup-pill active" id="subgroupBtn-all" data-subgroup="all" role="radio" aria-checked="true">Все подгруппы</button>
          <button type="button" class="subgroup-pill" id="subgroupBtn-1" data-subgroup="1" role="radio" aria-checked="false">1 подгруппа (1 п/гр)</button>
          <button type="button" class="subgroup-pill" id="subgroupBtn-2" data-subgroup="2" role="radio" aria-checked="false">2 подгруппа (2 п/гр)</button>
        </div>
      </div>

      <div class="theme-section">
        <div class="theme-section-header">
          <div class="theme-section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"></path>
            </svg>
            Тема оформления
          </div>
          <span class="theme-active-label" id="currentThemeName"></span>
        </div>
        <div class="theme-picker-grid" id="themePickerGrid"></div>
      </div>
    </div>
  </div>

  <div class="week-section" id="weekSection" style="display:none">
    <div class="container">
      <div class="week-nav">
        <button class="week-btn" id="btnPrevWeek" aria-label="Предыдущая неделя">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Пред. неделя
        </button>
        <div class="week-info">
          <div class="week-label">Учебная неделя</div>
          <div class="week-dates" id="weekDatesDisplay">—</div>
        </div>
        <button class="week-btn" id="btnNextWeek" aria-label="Следующая неделя">
          След. неделя
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <main class="main-content">
    <div class="container">
      <div class="empty-state" id="emptyState">
        <div class="empty-scene-svg-wrap">
          <svg width="220" height="175" viewBox="0 0 220 175" fill="none" class="empty-scene-svg" aria-hidden="true">
            <defs>
              <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--bg-card)"/>
                <stop offset="100%" stop-color="var(--bg-card2)"/>
              </linearGradient>
              <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--accent)"/>
                <stop offset="100%" stop-color="var(--accent-light)"/>
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>

            <!-- Ground shadow -->
            <ellipse cx="110" cy="155" rx="72" ry="12" fill="var(--text-primary)" class="empty-shadow"/>

            <!-- Floating Isometric Calendar Board -->
            <g class="empty-floating-group">
              <rect x="45" y="32" width="130" height="105" rx="16" fill="url(#cardGrad)" stroke="var(--border)" stroke-width="1.8"/>
              <path d="M45 62h130" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="3 3"/>

              <!-- Top Calendar Bindings -->
              <circle cx="75" cy="24" r="5" fill="var(--accent)" stroke="var(--bg-card)" stroke-width="2"/>
              <rect x="73" y="16" width="4" height="12" rx="2" fill="var(--accent)"/>
              <circle cx="145" cy="24" r="5" fill="var(--accent)" stroke="var(--bg-card)" stroke-width="2"/>
              <rect x="143" y="16" width="4" height="12" rx="2" fill="var(--accent)"/>

              <!-- Header bars on calendar -->
              <rect x="62" y="44" width="45" height="7" rx="3.5" fill="var(--accent)" opacity="0.8"/>
              <rect x="115" y="44" width="20" height="7" rx="3.5" fill="var(--border)" opacity="0.6"/>

              <!-- Grid rows (lessons placeholders) -->
              <rect x="62" y="74" width="96" height="12" rx="6" fill="var(--bg-deep)" stroke="var(--border)" stroke-width="1"/>
              <rect x="66" y="77" width="24" height="6" rx="3" fill="var(--accent)" opacity="0.4"/>
              <rect x="96" y="77" width="42" height="6" rx="3" fill="var(--text-muted)" opacity="0.3"/>

              <rect x="62" y="93" width="96" height="12" rx="6" fill="var(--bg-deep)" stroke="var(--border)" stroke-width="1"/>
              <rect x="66" y="96" width="32" height="6" rx="3" fill="var(--accent-light)" opacity="0.5"/>
              <rect x="104" y="96" width="34" height="6" rx="3" fill="var(--text-muted)" opacity="0.3"/>

              <rect x="62" y="112" width="70" height="12" rx="6" fill="var(--bg-deep)" stroke="var(--border)" stroke-width="1"/>
              <rect x="66" y="115" width="20" height="6" rx="3" fill="var(--accent)" opacity="0.4"/>

              <!-- Floating glowing compass/target badge -->
              <g class="empty-badge-float">
                <circle cx="156" cy="115" r="20" fill="url(#accentGrad)" filter="url(#glowFilter)"/>
                <path d="M156 105v20M146 115h20" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
                <circle cx="156" cy="115" r="5" stroke="#ffffff" stroke-width="1.8" fill="none"/>
              </g>
            </g>

            <!-- Orbiting Eco Sprout Sparkles -->
            <g class="empty-sparkle sparkle-1">
              <path d="M38 65c-4 0-8-4-8-9 5 0 9 4 8 9z" fill="var(--accent)" opacity="0.75"/>
            </g>
            <g class="empty-sparkle sparkle-2">
              <polygon points="182,45 185,52 192,55 185,58 182,65 179,58 172,55 179,52" fill="var(--accent-light)" opacity="0.8"/>
            </g>
            <g class="empty-sparkle sparkle-3">
              <circle cx="34" cy="115" r="3" fill="var(--accent2)" opacity="0.6"/>
            </g>
          </svg>
        </div>
        <h2 class="empty-title">Выберите группу</h2>
        <p class="empty-desc">Нажмите <span class="inline-svg-icon" style="color:var(--accent);margin:0 2px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span> в правом верхнем углу, укажите факультет, форму обучения, курс и группу</p>
      </div>

      <div class="loading-state" id="loadingState" style="display:none">
        <div class="sakharov-loader-wrap">
          <div class="sakharov-atom-3d" aria-hidden="true">
            <div class="orbital-ring ring-1">
              <svg viewBox="0 0 160 160" class="orbital-svg">
                <ellipse cx="80" cy="80" rx="72" ry="26" class="orbital-path"></ellipse>
                <circle cx="152" cy="80" r="4.5" class="quantum-electron"></circle>
              </svg>
            </div>
            <div class="orbital-ring ring-2">
              <svg viewBox="0 0 160 160" class="orbital-svg">
                <ellipse cx="80" cy="80" rx="72" ry="26" class="orbital-path"></ellipse>
                <circle cx="152" cy="80" r="4.5" class="quantum-electron"></circle>
              </svg>
            </div>
            <div class="orbital-ring ring-3">
              <svg viewBox="0 0 160 160" class="orbital-svg">
                <ellipse cx="80" cy="80" rx="72" ry="26" class="orbital-path"></ellipse>
                <circle cx="152" cy="80" r="4.5" class="quantum-electron"></circle>
              </svg>
            </div>
            <div class="atom-nucleus">
              <div class="nucleus-glow"></div>
              <div class="nucleus-waves"></div>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" class="nucleus-sprout">
                <path d="M12 22v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                <path d="M12 14C8 14 4 10 4 4c6 0 10 4 10 10z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M12 11c2.5-3.5 5.5-4 8-4 0 4-2.5 7-8 7" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="sakharov-loader-label">
            <span class="loader-canon-badge">МГЭИ им. А.Д. Сахарова БГУ</span>
            <span class="loading-text-shimmer">Синхронизация расписания...</span>
          </div>
        </div>
      </div>

      <div class="error-state" id="errorState" style="display:none">
        <div class="error-icon-svg" style="margin-bottom:16px;">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 class="error-title">Не удалось загрузить</h3>
        <p class="error-desc" id="errorDesc">Проверьте соединение и попробуйте снова</p>
        <button class="btn-retry" id="btnRetry">Повторить</button>
      </div>

      <div id="scheduleContainer" style="display:none">
        <div id="cacheStatusBanner" style="display:none"></div>
        <div class="day-tabs" id="dayTabs"></div>
        <div id="scheduleContent"></div>
        <button class="btn-week-view" id="btnWeekView" style="display:none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Показать всю неделю
        </button>
      </div>
    </div>
  </main>
`

// ── Modal helpers ─────────────────────────────────────────────

function openSettingsModal(): void {
  const modal = document.getElementById('settingsModal')
  if (!modal) return
  modal.classList.add('open')
  document.getElementById('btnSettings')?.classList.add('btn-settings-active')
  document.body.style.overflow = 'hidden'
}

function closeSettingsModal(): void {
  const modal = document.getElementById('settingsModal')
  if (!modal) return
  modal.classList.remove('open')
  document.getElementById('btnSettings')?.classList.remove('btn-settings-active')
  document.body.style.overflow = ''
}

// ── Theme selector ───────────────────────────────────────────

function setupThemeSelector(): void {
  const currentTheme = loadTheme()
  applyTheme(currentTheme)

  const container = document.getElementById('themePickerGrid')
  const labelEl = document.getElementById('currentThemeName')
  if (!container) return

  container.innerHTML = ''

  THEME_OPTIONS.forEach((theme) => {
    const isSelected = theme.value === currentTheme
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `theme-card${isSelected ? ' active' : ''}`
    card.id = `themeBtn-${theme.value}`
    card.setAttribute('aria-label', `Тема: ${theme.label} (${theme.description})`)
    card.setAttribute('role', 'radio')
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false')

    card.innerHTML = `
      <div class="theme-check-icon" aria-hidden="true">✓</div>
      <div class="theme-preview-bubble" style="background: ${theme.bgPreview}">
        <span class="theme-preview-svg-icon" style="color: ${theme.primaryColor}">${theme.iconSvg}</span>
        <span class="theme-preview-dot" style="background: ${theme.primaryColor}"></span>
      </div>
      <div class="theme-card-info">
        <span class="theme-card-title">${theme.label}</span>
        <span class="theme-card-badge">${theme.description}</span>
      </div>
    `

    card.addEventListener('click', () => {
      applyTheme(theme.value)
      saveTheme(theme.value)

      document.querySelectorAll('.theme-card').forEach((c) => {
        c.classList.remove('active')
        c.setAttribute('aria-checked', 'false')
      })
      card.classList.add('active')
      card.setAttribute('aria-checked', 'true')

      if (labelEl) {
        labelEl.innerHTML = `<span class="inline-svg-icon" style="color:${theme.primaryColor}">${theme.iconSvg}</span> <span>${theme.label}</span>`
      }
    })

    container.appendChild(card)
  })

  const currentOption = THEME_OPTIONS.find(t => t.value === currentTheme)
  if (labelEl && currentOption) {
    labelEl.innerHTML = `<span class="inline-svg-icon" style="color:${currentOption.primaryColor}">${currentOption.iconSvg}</span> <span>${currentOption.label}</span>`
  }
}

// ── Subgroup selector ────────────────────────────────────────

function setupSubgroupSelector(): void {
  const pills = document.querySelectorAll<HTMLButtonElement>('.subgroup-pill')
  const updatePills = (activeSubgroup: SubgroupChoice): void => {
    pills.forEach(p => {
      const isMatch = p.getAttribute('data-subgroup') === activeSubgroup
      p.classList.toggle('active', isMatch)
      p.setAttribute('aria-checked', isMatch ? 'true' : 'false')
    })
  }

  updatePills(state.currentSubgroup)

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const val = (pill.getAttribute('data-subgroup') ?? 'all') as SubgroupChoice
      state.currentSubgroup = val
      saveSettings()
      updatePills(val)

      // Re-render schedule immediately with subgroup filter applied
      reRenderCurrentSchedule()
    })
  })
}

// ── Bootstrap ─────────────────────────────────────────────────

let meta: StaticMeta | null = null

function groupsKey(fac: string, dep: string, course: string): string {
  return `${fac}_${dep}_${course}`
}

function refreshGroupList(): void {
  const key = groupsKey(state.currentFac, state.currentDep, state.currentCourse)
  state.groups = (meta?.groups?.[key]) ?? []
  populateGroupSelect(state.currentGroup || undefined)
}

function depsForFac(fac: string): { value: string; text: string }[] {
  return meta?.deps?.[fac] ?? []
}

async function init(): Promise<void> {
  const app = document.getElementById('app')!
  app.innerHTML = template

  setupThemeSelector()
  setupSubgroupSelector()
  startClock()
  bindEvents()
  showView('loading')

  try {
    meta = await loadMeta()

    state.faculties = meta.faculties ?? []
    state.weeks = meta.weeks ?? []
    state.deps = depsForFac(state.faculties[0]?.value ?? '')

    if (state.faculties.length > 0) state.currentFac = state.faculties[0].value
    if (state.deps.length > 0) state.currentDep = state.deps[0].value
    state.currentWeekIdx = findCurrentWeekIdx()

    populateSelect('selFac', state.faculties, state.currentFac)
    populateSelect('selDep', state.deps, state.currentDep)
    ;(document.getElementById('selCourse') as HTMLSelectElement).value = state.currentCourse
    refreshGroupList()

    state.sessionLoaded = true

    // Restore saved settings
    const saved = loadSettings()
    if (saved) {
      if (saved.subgroup) {
        state.currentSubgroup = saved.subgroup
        const pills = document.querySelectorAll<HTMLButtonElement>('.subgroup-pill')
        pills.forEach(p => {
          const isMatch = p.getAttribute('data-subgroup') === saved.subgroup
          p.classList.toggle('active', isMatch)
          p.setAttribute('aria-checked', isMatch ? 'true' : 'false')
        })
      }
      if (saved.fac && state.faculties.some(f => f.value === saved.fac)) {
        state.currentFac = saved.fac
        state.deps = depsForFac(saved.fac)
        if (!state.deps.some(d => d.value === state.currentDep)) {
          state.currentDep = state.deps[0]?.value ?? ''
        }
        ;(document.getElementById('selFac') as HTMLSelectElement).value = saved.fac
        populateSelect('selDep', state.deps, state.currentDep)
      }
      if (saved.dep && state.deps.some(d => d.value === saved.dep)) {
        state.currentDep = saved.dep
        ;(document.getElementById('selDep') as HTMLSelectElement).value = saved.dep
      }
      if (saved.course) {
        state.currentCourse = saved.course
        ;(document.getElementById('selCourse') as HTMLSelectElement).value = saved.course
      }

      if (saved.fac && saved.dep && saved.course) {
        refreshGroupList()
        if (saved.group && state.groups.some(g => g.value === saved.group)) {
          state.currentGroup = saved.group
          state.currentGroupName = saved.groupName
          ;(document.getElementById('selGroup') as HTMLSelectElement).value = saved.group
          ;(document.getElementById('weekSection') as HTMLElement).style.display = 'block'
          updateWeekDisplay()
          await loadAndRenderSchedule()
          return
        }
      }
    }

    showView('empty')
  } catch (err) {
    console.error('[init]', err)
    showError(
      'Не удалось загрузить данные расписания. Проверьте соединение и попробуйте снова.\n' +
      (err instanceof Error ? err.message : String(err))
    )
  }
}

// ── Dropdown handlers ─────────────────────────────────────────

async function onFacChange(): Promise<void> {
  const facSel = document.getElementById('selFac') as HTMLSelectElement
  state.currentFac = facSel.value
  state.currentGroup = ''
  state.currentGroupName = ''
  state.deps = depsForFac(state.currentFac)
  if (!state.deps.some(d => d.value === state.currentDep)) {
    state.currentDep = state.deps[0]?.value ?? ''
  }
  populateSelect('selDep', state.deps, state.currentDep)
  refreshGroupList()
  saveSettings()
}

async function onDepChange(): Promise<void> {
  const depSel = document.getElementById('selDep') as HTMLSelectElement
  state.currentDep = depSel.value
  state.currentGroup = ''
  state.currentGroupName = ''
  refreshGroupList()
  saveSettings()
}

async function onCourseChange(): Promise<void> {
  const courseSel = document.getElementById('selCourse') as HTMLSelectElement
  state.currentCourse = courseSel.value
  state.currentGroup = ''
  state.currentGroupName = ''
  refreshGroupList()
  saveSettings()
}

async function onGroupChange(): Promise<void> {
  const sel = document.getElementById('selGroup') as HTMLSelectElement
  state.currentGroup = sel.value
  state.currentGroupName = sel.options[sel.selectedIndex]?.text ?? ''
  saveSettings()

  if (state.currentGroup) {
    closeSettingsModal()
    ;(document.getElementById('weekSection') as HTMLElement).style.display = 'block'
    updateWeekDisplay()
    await loadAndRenderSchedule()
  } else {
    ;(document.getElementById('weekSection') as HTMLElement).style.display = 'none'
    showView('empty')
  }
}

async function loadAndRenderSchedule(): Promise<void> {
  if (!state.currentGroup) { showView('empty'); return }

  const week = state.weeks[state.currentWeekIdx]
  if (!week) { showView('empty'); return }

  showView('loading')

  try {
    const schedule = await fetchSchedule(state.currentGroup, week.value)
    state.schedule = schedule
    renderSchedule(schedule, week.value)
  } catch (err) {
    console.error('[loadAndRenderSchedule]', err)
    showError('Не удалось загрузить расписание: ' + (err instanceof Error ? err.message : String(err)))
  }
}

async function changeWeek(dir: number): Promise<void> {
  const newIdx = state.currentWeekIdx + dir
  if (newIdx < 0 || newIdx >= state.weeks.length) return
  state.currentWeekIdx = newIdx
  updateWeekDisplay()
  await loadAndRenderSchedule()
}

async function refreshSchedule(): Promise<void> {
  const btn = document.getElementById('btnRefresh') as HTMLButtonElement
  btn.classList.add('spinning')
  try {
    if (state.currentGroup) {
      await loadAndRenderSchedule()
    } else {
      state.sessionLoaded = false
      await init()
    }
  } finally {
    btn.classList.remove('spinning')
  }
}

function bindEvents(): void {
  document.getElementById('selFac')?.addEventListener('change', onFacChange)
  document.getElementById('selDep')?.addEventListener('change', onDepChange)
  document.getElementById('selCourse')?.addEventListener('change', onCourseChange)
  document.getElementById('selGroup')?.addEventListener('change', onGroupChange)
  // Note: weeks list is reverse-sorted (latest first), so prev = index+1, next = index-1
  document.getElementById('btnPrevWeek')?.addEventListener('click', () => changeWeek(1))
  document.getElementById('btnNextWeek')?.addEventListener('click', () => changeWeek(-1))
  document.getElementById('btnRefresh')?.addEventListener('click', refreshSchedule)
  document.getElementById('btnRetry')?.addEventListener('click', refreshSchedule)

  // Settings modal
  document.getElementById('btnSettings')?.addEventListener('click', openSettingsModal)
  document.getElementById('btnCloseSettings')?.addEventListener('click', closeSettingsModal)
  document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'settingsModal') closeSettingsModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsModal()
  })
}

// ── PWA Install Prompt ────────────────────────────────────────

function setupPWAInstall(): void {
  // Always show on iOS Safari (every visit) — no localStorage check
  if (window.matchMedia('(display-mode: standalone)').matches) return

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  if (isIOS && isSafari) {
    setTimeout(() => showIOSInstallBanner(), 1500)
    return
  }

  // Android / Chrome: native install prompt
  const dismissed = localStorage.getItem('pwa_install_dismissed')
  if (dismissed) return

  let deferredPrompt: Event & { prompt?: () => void; userChoice?: Promise<{outcome: string}> } | null = null

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as typeof deferredPrompt
    setTimeout(() => showAndroidInstallBanner(deferredPrompt), 3000)
  })
}

function showIOSInstallBanner(): void {
  // Remove any existing banner
  document.getElementById('iosBigBanner')?.remove()

  const banner = document.createElement('div')
  banner.id = 'iosBigBanner'
  banner.className = 'ios-install-banner'
  banner.innerHTML = `
    <div class="ios-banner-inner">
      <button class="ios-banner-close" id="iosBannerClose" aria-label="Закрыть">✕</button>
      <div class="ios-banner-header">
        <span class="ios-banner-emoji" style="display:flex;align-items:center;justify-content:center;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
        </span>
        <div>
          <div class="ios-banner-title">Установите приложение</div>
          <div class="ios-banner-sub">Расписание МГЭИ на вашем экране домой</div>
        </div>
      </div>
      <div class="ios-banner-steps">
        <div class="ios-banner-step">
          <span class="ios-step-num">1</span>
          <span class="ios-step-text">Нажмите кнопку
            <span class="ios-share-icon" aria-label="Поделиться">
              <svg width="18" height="20" viewBox="0 0 18 22" fill="none">
                <path d="M9 1v13M4 5l5-4 5 4" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="1" y="9" width="16" height="12" rx="2" stroke="#007AFF" stroke-width="2"/>
              </svg>
            </span>
            <strong>«Поделиться»</strong> внизу экрана
          </span>
        </div>
        <div class="ios-banner-step">
          <span class="ios-step-num">2</span>
          <span class="ios-step-text">Прокрутите вниз и выберите <strong>«На экран Домой»</strong></span>
        </div>
        <div class="ios-banner-step">
          <span class="ios-step-num">3</span>
          <span class="ios-step-text">Нажмите <strong>«Добавить»</strong> — готово!</span>
        </div>
      </div>
      <div class="ios-banner-arrow-wrap">
        <div class="ios-banner-arrow-label">Кнопка здесь ↓</div>
        <div class="ios-banner-arrow">▼</div>
      </div>
    </div>
  `
  document.body.appendChild(banner)

  // Animate in
  requestAnimationFrame(() => banner.classList.add('ios-banner-visible'))

  document.getElementById('iosBannerClose')?.addEventListener('click', () => {
    banner.classList.remove('ios-banner-visible')
    setTimeout(() => banner.remove(), 350)
  })
}

function showAndroidInstallBanner(deferredPrompt: any): void {
  const banner = document.createElement('div')
  banner.className = 'install-banner'
  banner.innerHTML = `
    <div class="install-banner-icon" style="display:flex;align-items:center;justify-content:center;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-floating-leaf" aria-hidden="true">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    </div>
    <div class="install-banner-text">
      <div class="install-banner-title">Установить приложение</div>
      <div class="install-banner-desc">Расписание МГЭИ на главном экране</div>
    </div>
    <button class="install-banner-btn" id="btnInstallPWA">Установить</button>
    <button class="install-banner-close" aria-label="Закрыть">✕</button>
  `
  document.body.appendChild(banner)

  banner.querySelector('#btnInstallPWA')?.addEventListener('click', async () => {
    banner.remove()
    if (deferredPrompt?.prompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') localStorage.setItem('pwa_install_dismissed', '1')
    }
  })
  banner.querySelector('.install-banner-close')?.addEventListener('click', () => {
    banner.remove()
    localStorage.setItem('pwa_install_dismissed', '1')
  })
}

init().catch(console.error)
setupPWAInstall()
