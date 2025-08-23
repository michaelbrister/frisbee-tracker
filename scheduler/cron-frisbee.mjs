// scheduler/cron-frisbee.mjs
import PocketBase from 'pocketbase'
import { DateTime } from 'luxon'

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
  return pb.collection(SETTINGS_COLLECTION).getFirstListItem(`slug = "${SETTINGS_SLUG}"`, {
    $autoCancel: false,
  })
}

async function upsertNextFridayGame() {
  const dateOnly = nextFridayDateOnly(TIMEZONE)
  const dateISO = toUTCISO(dateOnly, GAME_TIME, TIMEZONE)

  // 1) Check toggle
  const settings = await getSettings()
  if (!settings?.frisbee_cron) {
    return { skipped: true, reason: 'frisbee_cron disabled' }
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

  return { ok: true, targetId, date_only: dateOnly, deactivatedOthers: others.map((o) => o.id) }
}

async function main() {
  try {
    await ensureAdmin()

    if (HEALTH) {
      // Minimal: verify we can read settings
      const settings = await getSettings()
      if (!settings) throw new Error('settings not found')
      console.log(JSON.stringify({ ok: true, health: true }))
      process.exit(0)
    }

    const start = DateTime.now().toISO()
    const result = await upsertNextFridayGame()
    console.log(JSON.stringify({ ok: true, start, result }, null, 2))
    process.exit(0)
  } catch (err) {
    // Log structured PB errors if present
    const detail = err?.response?.data
      ? { status: err.status, data: err.response.data }
      : { message: err?.message || String(err) }
    console.error('cron-frisbee error:', JSON.stringify(detail))
    process.exit(1)
  }
}

main()
