/**
 * Automated Schedule Crawler for МГЭИ им. А.Д. Сахарова БГУ
 * 
 * Periodically crawls all faculties, study forms, courses, and groups (70 groups),
 * downloads current and upcoming weekly schedules, and stores them in /cache:
 *   - cache/meta.json                      (faculties, forms, courses, groups, weeks, lastUpdated)
 *   - cache/snapshots/initial_page.html    (root page HTML with ViewState for offline bootstrap)
 *   - cache/snapshots/fac_*_course_*.html  (dropdown snapshots for offline filter switching)
 *   - cache/html/{groupId}_{weekDate}.html (raw HTML containing #TT schedule table)
 *   - cache/parsed/{groupId}_{weekDate}.json (structured parsed schedule)
 * 
 * Can be run standalone: `node crawler.js`
 * Or imported in server.js: `import { runCrawler, getCacheStatus } from './crawler.js'`
 */

import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const TARGET_URL = process.env.TARGET_URL || 'http://rsp.iseu.by/Raspisanie/TimeTable/umu.aspx'
export const CACHE_DIR = process.env.CACHE_DIR || join(__dirname, 'cache')

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Connection': 'keep-alive',
}

// Ensure required cache folders exist
export function initCacheDirectories() {
  const dirs = [
    CACHE_DIR,
    join(CACHE_DIR, 'html'),
    join(CACHE_DIR, 'parsed'),
    join(CACHE_DIR, 'snapshots'),
  ]
  for (const d of dirs) {
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true })
    }
  }
}

export function safeWeek(weekVal) {
  if (!weekVal) return 'default'
  // weekVal is like "21.09.2026 0:00:00" -> extract "21.09.2026"
  const datePart = weekVal.split(' ')[0].trim()
  return datePart.replace(/[^0-9.]/g, '') || 'default'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractTokens(html) {
  const vsMatch = html.match(/id="__VIEWSTATE"\s+value="([^"]*)"/)
  const evMatch = html.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/)
  const vsgMatch = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/)
  return {
    viewState: vsMatch ? vsMatch[1] : '',
    eventValidation: evMatch ? evMatch[1] : '',
    viewStateGenerator: vsgMatch ? vsgMatch[1] : '4C55420B',
  }
}

function extractOptions(html, selectId) {
  const selectRegex = new RegExp(`<select[^>]+id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`, 'i')
  const selectMatch = html.match(selectRegex)
  if (!selectMatch) return []

  const options = []
  const optRegex = /<option([^>]*)>([\s\S]*?)<\/option>/gi
  let m
  while ((m = optRegex.exec(selectMatch[1])) !== null) {
    const attrs = m[1]
    const text = m[2].replace(/&nbsp;/g, ' ').trim()
    const valMatch = attrs.match(/value="([^"]*)"/i)
    const val = valMatch ? valMatch[1] : ''
    const isSelected = /selected/i.test(attrs)
    if (val !== '') {
      options.push({ value: val, text, selected: isSelected })
    }
  }
  return options
}

async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 12000) {
  let lastError = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { ...HTTP_HEADERS, ...(options.headers || {}) },
      })
      clearTimeout(timeout)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
      }
      return await resp.text()
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      if (attempt < retries) {
        await sleep(500 * attempt)
      }
    }
  }
  throw lastError
}

/**
 * Lightweight pure-JS server parser for ASP.NET Schedule Table #TT
 */
export function parseScheduleHtml(html) {
  const lMsgMatch = html.match(/id="lMessage"[^>]*>([\s\S]*?)<\/span>/i)
  if (lMsgMatch) {
    const cleanMsg = lMsgMatch[1].replace(/<[^>]+>/g, '').trim()
    if (cleanMsg && cleanMsg !== '&nbsp;') {
      return { days: {}, empty: true, message: cleanMsg }
    }
  }

  const tableMatch = html.match(/<table[^>]+id="TT"[^>]*>([\s\S]*?)<\/table>/i)
  if (!tableMatch) {
    return { days: {}, empty: true, message: 'Расписание не найдено' }
  }

  const tableContent = tableMatch[1]
  const rows = tableContent.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
  if (rows.length === 0) {
    return { days: {}, empty: true, message: 'Таблица пуста' }
  }

  const schedule = { days: {}, empty: false }
  let currentDay = ''
  let dayRowspan = 0
  let dayCounter = 0

  const RU_DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

  for (const row of rows) {
    // Check for day span in row
    const daySpanMatch = row.match(/<td[^>]+class="[^"]*cell-date[^"]*"[^>]*rowspan="(\d+)"[^>]*>([\s\S]*?)<\/td>/i)
      || row.match(/<td[^>]+rowspan="(\d+)"[^>]+class="[^"]*cell-date[^"]*"[^>]*>([\s\S]*?)<\/td>/i)

    if (daySpanMatch) {
      const rspan = parseInt(daySpanMatch[1], 10)
      const dayCellText = daySpanMatch[2].replace(/<[^>]+>/g, ' ').trim().toLowerCase()
      for (const d of RU_DAYS) {
        if (dayCellText.startsWith(d.toLowerCase().substring(0, 4))) {
          currentDay = d
          dayRowspan = rspan
          dayCounter = 0
          break
        }
      }
    }

    // Extract lesson data
    const subjMatch = row.match(/<td[^>]+class="[^"]*cell-discipline[^"]*"[^>]*>([\s\S]*?)<\/td>/i)
    if (subjMatch) {
      const rawSubjHtml = subjMatch[1]
      const topics = []
      const topicMatches = rawSubjHtml.match(/<span[^>]+class='topic'[^>]*>([\s\S]*?)<\/span>/gi) || []
      for (const tm of topicMatches) {
        const txt = tm.replace(/<[^>]+>/g, '').trim()
        if (txt) topics.push(txt)
      }

      // Subject text (excluding topic spans)
      const cleanSubj = rawSubjHtml.replace(/<span[^>]+class='topic'[\s\S]*?<\/span>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()

      const timeMatch = row.match(/<td[^>]+class="[^"]*cell-time[^"]*"[^>]*>([\s\S]*?)<\/td>/i)
      let period = ''
      let time = ''
      if (timeMatch) {
        const timeLines = timeMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n')
          .map(s => s.trim()).filter(Boolean)
        period = timeLines[0] || ''
        time = timeLines[1] || timeLines[0] || ''
      }

      const staffMatch = row.match(/<td[^>]+class="[^"]*cell-staff[^"]*"[^>]*>([\s\S]*?)<\/td>/i)
      const teacher = staffMatch ? staffMatch[1].replace(/<[^>]+>/g, '').trim() : ''

      const roomMatch = row.match(/<td[^>]+class="[^"]*cell-auditory[^"]*"[^>]*>([\s\S]*?)<\/td>/i)
      const room = roomMatch ? roomMatch[1].replace(/<[^>]+>/g, '').trim() : ''

      const subgrMatch = row.match(/<td[^>]+class="[^"]*cell-subgroup[^"]*"[^>]*>([\s\S]*?)<\/td>/i)
      let subgroup = subgrMatch ? subgrMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      if (!subgroup) {
        const m = cleanSubj.match(/(?:^|[^\d])([12])\s*(?:п\/?гр|подгр|п\/г)/i)
        if (m) subgroup = `${m[1]} п/гр`
      }

      // Type detection
      const lowSubj = cleanSubj.toLowerCase()
      let type = 'other'
      if (lowSubj.includes('лаб') || lowSubj.includes('лр')) type = 'lab'
      else if (lowSubj.includes('практ') || lowSubj.includes('семин')) type = 'practice'
      else if (lowSubj.includes('лекц') || lowSubj.includes('лк')) type = 'lecture'

      if (currentDay) {
        if (!schedule.days[currentDay]) schedule.days[currentDay] = []
        schedule.days[currentDay].push({
          period,
          time,
          subject: cleanSubj,
          teacher,
          room,
          subgroup,
          type,
          topics: topics.length > 0 ? topics : undefined,
        })
      }
    }

    if (currentDay && dayRowspan > 0) {
      dayCounter++
      if (dayCounter >= dayRowspan) {
        currentDay = ''
      }
    }
  }

  if (Object.keys(schedule.days).length === 0) {
    schedule.empty = true
    schedule.message = 'На выбранной неделе занятий нет'
  }

  return schedule
}

let isCrawling = false
let lastCrawlStats = null

export function getCacheStatus() {
  return {
    isCrawling,
    lastCrawlStats,
  }
}

/**
 * Main Crawler function: crawls all faculties and groups, saves to disk
 */
export async function runCrawler() {
  if (isCrawling) {
    console.log('[Crawler] Crawl is already running in background, skipping trigger.')
    return lastCrawlStats
  }

  isCrawling = true
  const startTime = Date.now()
  console.log(`[Crawler] Starting hourly schedule crawl at ${new Date().toISOString()}...`)

  try {
    initCacheDirectories()

    // 1. Initial GET to obtain session tokens, faculties, and available weeks
    const initHtml = await fetchWithRetry(TARGET_URL)
    const rootTokens = extractTokens(initHtml)
    const faculties = extractOptions(initHtml, 'ddlFac')
    const weeks = extractOptions(initHtml, 'ddlWeek')

    // Find default selected week
    const defaultWeekObj = weeks.find(w => w.selected) || weeks[0]
    const defaultWeekVal = defaultWeekObj ? defaultWeekObj.value : ''

    // Save root page snapshot for instant offline bootstrap
    await fs.writeFile(join(CACHE_DIR, 'snapshots', 'initial_page.html'), initHtml, 'utf-8')

    console.log(`[Crawler] Found ${faculties.length} faculties, ${weeks.length} total weeks. Default week: ${defaultWeekVal}`)

    // 2. Discover all forms of study, courses, and groups for all faculties
    const metadata = {
      updatedAt: new Date().toISOString(),
      updatedAtFormatted: new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Minsk',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date()),
      faculties,
      deps: {},
      courses: ['1', '2', '3', '4', '5'],
      groups: {},
      allGroups: [],
      weeks,
      currentWeek: defaultWeekVal,
      stats: {}
    }

    for (const fac of faculties) {
      if (!fac.value) continue
      // Postback to select faculty
      const facBody = new URLSearchParams({
        __EVENTTARGET: 'ddlFac',
        __EVENTARGUMENT: '',
        __VIEWSTATE: rootTokens.viewState,
        __EVENTVALIDATION: rootTokens.eventValidation,
        __VIEWSTATEGENERATOR: rootTokens.viewStateGenerator,
        ddlFac: fac.value,
        ddlCourse: '1',
        iframeheight: '0'
      })

      const facHtml = await fetchWithRetry(TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: facBody.toString()
      })

      const facTokens = extractTokens(facHtml)
      const deps = extractOptions(facHtml, 'ddlDep')
      metadata.deps[fac.value] = deps

      // Save faculty snapshot
      await fs.writeFile(join(CACHE_DIR, 'snapshots', `fac_${fac.value}.html`), facHtml, 'utf-8')

      for (const dep of deps) {
        if (!dep.value) continue
        
        // Postback to select dep and get available courses
        const depBody = new URLSearchParams({
          __EVENTTARGET: 'ddlDep',
          __EVENTARGUMENT: '',
          __VIEWSTATE: facTokens.viewState,
          __EVENTVALIDATION: facTokens.eventValidation,
          __VIEWSTATEGENERATOR: facTokens.viewStateGenerator,
          ddlFac: fac.value,
          ddlDep: dep.value,
          ddlCourse: '1',
          iframeheight: '0'
        })

        let depHtml = facHtml
        let depTokens = facTokens
        try {
          depHtml = await fetchWithRetry(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: depBody.toString()
          })
          depTokens = extractTokens(depHtml)
        } catch (depErr) {
          console.warn(`[Crawler] Warning: ddlDep postback for dep ${dep.value} failed, using facTokens: ${depErr.message}`)
        }

        const availableCourses = extractOptions(depHtml, 'ddlCourse')
        const coursesToIterate = availableCourses.length > 0 ? availableCourses : [{ value: '1', text: '1 курс' }]

        for (const courseObj of coursesToIterate) {
          const course = courseObj.value
          if (!course) continue

          const courseBody = new URLSearchParams({
            __EVENTTARGET: 'ddlCourse',
            __EVENTARGUMENT: '',
            __VIEWSTATE: depTokens.viewState,
            __EVENTVALIDATION: depTokens.eventValidation,
            __VIEWSTATEGENERATOR: depTokens.viewStateGenerator,
            ddlFac: fac.value,
            ddlDep: dep.value,
            ddlCourse: course,
            iframeheight: '0'
          })

          let courseHtml = ''
          let courseTokens = depTokens
          let groups = []
          try {
            courseHtml = await fetchWithRetry(TARGET_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: courseBody.toString()
            })
            courseTokens = extractTokens(courseHtml)
            groups = extractOptions(courseHtml, 'ddlGroup')
          } catch (courseErr) {
            console.warn(`[Crawler] Course ${course} not available for fac ${fac.value} dep ${dep.value}: ${courseErr.message}`)
            continue
          }

          const key = `${fac.value}_${dep.value}_${course}`
          metadata.groups[key] = groups

          if (courseHtml) {
            // Save snapshot for offline dropdown navigation
            await fs.writeFile(
              join(CACHE_DIR, 'snapshots', `fac_${fac.value}_dep_${dep.value}_course_${course}.html`),
              courseHtml,
              'utf-8'
            )
          }

          for (const g of groups) {
            if (!g.value) continue
            metadata.allGroups.push({
              fac: fac.value,
              facName: fac.text,
              dep: dep.value,
              depName: dep.text,
              course,
              groupId: g.value,
              groupName: g.text,
              tokens: courseTokens
            })
          }
          await sleep(60)
        }
      }
    }

    console.log(`[Crawler] Discovered total ${metadata.allGroups.length} groups across all faculties!`)

    // 3. Determine target weeks window:
    // We crawl: Current Week, 2 Previous Weeks, 4 Future Weeks (7 weeks total)
    const currentWeekIdx = weeks.findIndex(w => w.value === defaultWeekVal || w.selected)
    const activeIdx = currentWeekIdx >= 0 ? currentWeekIdx : 0

    // Since weeks are in reverse order (future to past):
    // index - 1 is next week, index + 1 is previous week
    const targetWeekIndices = new Set()
    for (let offset = -4; offset <= 2; offset++) {
      const idx = activeIdx + offset
      if (idx >= 0 && idx < weeks.length) {
        targetWeekIndices.add(idx)
      }
    }

    const targetWeeks = Array.from(targetWeekIndices)
      .sort((a, b) => a - b)
      .map(i => weeks[i])

    console.log(`[Crawler] Target crawling window: ${targetWeeks.length} weeks (${targetWeeks.map(w => w.text).join(', ')})`)
    metadata.targetWeeks = targetWeeks

    // 4. Crawl schedules for every group and every target week
    let schedulesSaved = 0
    let errorsCount = 0

    for (let i = 0; i < metadata.allGroups.length; i++) {
      const g = metadata.allGroups[i]
      for (const w of targetWeeks) {
        try {
          const body = new URLSearchParams({
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __VIEWSTATE: g.tokens.viewState,
            __EVENTVALIDATION: g.tokens.eventValidation,
            __VIEWSTATEGENERATOR: g.tokens.viewStateGenerator,
            ddlFac: g.fac,
            ddlDep: g.dep,
            ddlCourse: g.course,
            ddlGroup: g.groupId,
            ddlWeek: w.value,
            ShowTT: 'Показать',
            iframeheight: '0'
          })

          const schedHtml = await fetchWithRetry(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
          }, 2, 8000)

          const weekDate = safeWeek(w.value)
          // 1) Save raw HTML
          await fs.writeFile(join(CACHE_DIR, 'html', `${g.groupId}_${weekDate}.html`), schedHtml, 'utf-8')

          // 2) Parse and save JSON
          const parsed = parseScheduleHtml(schedHtml)
          await fs.writeFile(
            join(CACHE_DIR, 'parsed', `${g.groupId}_${weekDate}.json`),
            JSON.stringify({
              groupId: g.groupId,
              groupName: g.groupName,
              faculty: g.facName,
              week: w.value,
              weekDate,
              savedAt: new Date().toISOString(),
              ...parsed
            }, null, 2),
            'utf-8'
          )

          schedulesSaved++
        } catch (err) {
          errorsCount++
          console.warn(`[Crawler] Failed to fetch schedule for group ${g.groupName} (${g.groupId}) week ${w.text}: ${err.message}`)
        }
        await sleep(80)
      }
      if ((i + 1) % 10 === 0 || i === metadata.allGroups.length - 1) {
        console.log(`[Crawler] Progress: ${i + 1}/${metadata.allGroups.length} groups processed (${schedulesSaved} schedules saved)`)
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
    metadata.stats = {
      totalGroups: metadata.allGroups.length,
      totalSchedulesSaved: schedulesSaved,
      errorsCount,
      durationSec: parseFloat(durationSec),
      finishedAt: new Date().toISOString()
    }

    // Save final metadata
    // Remove group tokens before saving metadata to keep meta.json lightweight
    const cleanGroups = metadata.allGroups.map(({ tokens, ...rest }) => rest)
    const finalMeta = { ...metadata, allGroups: cleanGroups }

    await fs.writeFile(join(CACHE_DIR, 'meta.json'), JSON.stringify(finalMeta, null, 2), 'utf-8')

    lastCrawlStats = {
      success: true,
      ...metadata.stats,
      updatedAtFormatted: metadata.updatedAtFormatted,
    }

    console.log(`✅ [Crawler] Crawl finished successfully in ${durationSec}s! Saved ${schedulesSaved} schedules for ${metadata.allGroups.length} groups.`)
    return lastCrawlStats
  } catch (fatalErr) {
    console.error(`❌ [Crawler] Fatal error during crawl:`, fatalErr)
    lastCrawlStats = {
      success: false,
      error: fatalErr.message,
      finishedAt: new Date().toISOString()
    }
    return lastCrawlStats
  } finally {
    isCrawling = false
  }
}

// If executed directly from CLI: `node crawler.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCrawler().then((stats) => {
    console.log('[Crawler CLI] Done:', stats)
    process.exit(stats && stats.success ? 0 : 1)
  })
}
