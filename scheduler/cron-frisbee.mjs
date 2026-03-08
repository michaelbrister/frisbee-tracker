// scheduler/cron-frisbee.mjs
import PocketBase from 'pocketbase'
import { DateTime } from 'luxon'
import { shouldResetRsvps } from './cron-utils.mjs'

const {
  PB_URL,
  PB_ADMIN_EMAIL,
  PB_ADMIN_PASSWORD,
  TIMEZONE = 'America/New_York',
  GAME_TITLE = 'Frisbee',
  GAME_LOCATION = 'Bird Street Park',
  GAME_TIME = '05:30 PM',
  SETTINGS_COLLECTION = 'app_settings',
  SETTINGS_SLUG = 'global',
  RESET_HOUR = '22',
} = process.env

const argv = new Set(process.argv.slice(2))
const DRY = argv.has('--dry-run')
const HEALTH = argv.has('--healthcheck')

if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
  console.error('Missing PB_URL/PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD env vars')
  process.exit(2)
}

const pb = new PocketBase(PB_URL)

function nextFridayDateOnly(tz) {
  const now = DateTime.now().setZone(tz)
  const daysUntilFriday = (5 - now.weekday + 7) % 7 || 7 // 5 = Friday
  return now.plus({ days: daysUntilFriday }).toISODate() // YYYY-MM-DD
}

function toUTCISO(dateOnly, time12h, tz) {
  const dtLocal = DateTime.fromFormat(`${dateOnly} ${time12h}`, 'yyyy-MM-dd hh:mm a', { zone: tz })
  if (!dtLocal.isValid) throw new Error(`Invalid local datetime: "${dateOnly} ${time12h}"`)
  return dtLocal.toUTC().toISO()
}

async function ensureAdmin() {
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
}

async function getSettings() {
  try {
    return await pb.collection(SETTINGS_COLLECTION).getFirstListItem(`slug = "${SETTINGS_SLUG}"`, {
      $autoCancel: false,
    })
  } catch (err) {
    if (err?.status === 404) return null
    throw err
  }
}

async function upsertNextFridayGame() {
  const now = DateTime.now().setZone(TIMEZONE)
  const resetHour = Number.parseInt(RESET_HOUR, 10)
  const dateOnly = nextFridayDateOnly(TIMEZONE)
  const dateISO = toUTCISO(dateOnly, GAME_TIME, TIMEZONE)

  // 1) Check toggle
  const settings = await getSettings()
  if (!settings) {
    return { skipped: true, reason: 'settings record not found' }
  }
  if (!settings?.frisbee_cron) {
    return { skipped: true, reason: 'frisbee_cron disabled' }
  }
  if (settings?.rsvp_paused ?? settings?.season_over) {
    return { skipped: true, reason: 'rsvp_paused enabled' }
  }

  // 2) Pull existing game for that day (if any)
  let existing = null
  try {
    existing = await pb
      .collection('games')
      .getFirstListItem(`date_only = "${dateOnly}"`, { $autoCancel: false })
  } catch (e) {
    if (e?.status !== 404) throw e
  }

  // Compute “already correct?” condition to skip unnecessary writes
  const alreadyCorrect =
    existing &&
    existing.active === true &&
    existing.cancelled === false &&
    existing.cancel_reason == null &&
    existing.title === GAME_TITLE &&
    existing.location === GAME_LOCATION

  if (DRY) {
    return {
      dryRun: true,
      nextFriday: dateOnly,
      alreadyCorrect: !!alreadyCorrect,
      would: existing ? 'update' : 'create',
    }
  }

  // 3) Create/update target game
  let targetId
  if (existing) {
    if (!alreadyCorrect || existing.date !== dateISO) {
      const updated = await pb.collection('games').update(
        existing.id,
        {
          title: GAME_TITLE,
          location: GAME_LOCATION,
          date: dateISO,
          date_only: dateOnly,
          active: true,
          cancelled: false,
          cancel_reason: null,
        },
        { $autoCancel: false },
      )
      targetId = updated.id
    } else {
      targetId = existing.id // no change needed
    }
  } else {
    const created = await pb.collection('games').create(
      {
        title: GAME_TITLE,
        location: GAME_LOCATION,
        date: dateISO,
        date_only: dateOnly,
        active: true,
        cancelled: false,
        cancel_reason: null,
      },
      { $autoCancel: false },
    )
    targetId = created.id
  }

  // 4) Deactivate any other active games (no-op if already done)
  const others = await pb.collection('games').getFullList({
    filter: `active = true && date_only != "${dateOnly}"`,
  })
  for (const g of others) {
    await pb.collection('games').update(g.id, { active: false }, { $autoCancel: false })
  }

  let resetTriggered = false
  let rsvpsReset = 0

  // Friday night reset: clear next game's RSVPs so everyone responds again.
  if (shouldResetRsvps(now, resetHour)) {
    const existingRsvps = await pb.collection('attendance').getFullList({
      filter: `game = "${targetId}"`,
      $autoCancel: false,
    })
    for (const rsvp of existingRsvps) {
      await pb.collection('attendance').delete(rsvp.id, { $autoCancel: false })
    }
    resetTriggered = true
    rsvpsReset = existingRsvps.length
  }

  return {
    ok: true,
    targetId,
    date_only: dateOnly,
    deactivatedOthers: others.map((o) => o.id),
    resetTriggered,
    rsvpsReset,
  }
}

async function recordCronRun({ source, status, details = '', result = null }) {
  try {
    await pb.collection('cron_runs').create(
      {
        source,
        status: !!status,
        reset_triggered: !!result?.resetTriggered,
        rsvps_reset: result?.rsvpsReset != null ? String(result.rsvpsReset) : '0',
        run_for_date: result?.date_only || '',
        details,
      },
      { $autoCancel: false },
    )
  } catch (err) {
    // Keep scheduler resilient if cron_runs doesn't exist yet.
    console.warn('Could not persist cron run status:', err?.message || err)
  }
}

async function main() {
  try {
    if (HEALTH) {
      // Minimal: verify backend is reachable without requiring admin credentials.
      await pb.send('/api/health', { method: 'GET', $autoCancel: false })
      console.log(JSON.stringify({ ok: true, health: true }))
      process.exit(0)
    }

    await ensureAdmin()

    const start = DateTime.now().toISO()
    const result = await upsertNextFridayGame()
    const details = result?.skipped ? `Skipped: ${result.reason}` : 'Run completed'
    await recordCronRun({ source: 'scheduler', status: true, details, result })
    console.log(JSON.stringify({ ok: true, start, result }, null, 2))
    process.exit(0)
  } catch (err) {
    // Log structured PB errors if present
    const detail = err?.response?.data
      ? { status: err.status, data: err.response.data }
      : { message: err?.message || String(err) }
    console.error('cron-frisbee error:', JSON.stringify(detail))
    await recordCronRun({
      source: 'scheduler',
      status: false,
      details: `Error: ${detail?.message || 'unknown error'}`,
      result: null,
    })
    process.exit(1)
  }
}

main()
