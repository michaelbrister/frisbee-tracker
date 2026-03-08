import PocketBase from 'pocketbase'
import { DateTime } from 'luxon'

const {
  PB_URL = 'http://127.0.0.1:8090',
  POCKETBASE_ADMIN_EMAIL,
  POCKETBASE_ADMIN_PASSWORD,
  TIMEZONE = 'America/New_York',
  GAME_TIME = '05:30 PM',
  DUMMY_PASSWORD = 'test1234',
} = process.env

const argv = new Set(process.argv.slice(2))
const WIPE_ONLY = argv.has('--wipe-only')

if (!POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD) {
  console.error('Missing POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD')
  process.exit(2)
}

const pb = new PocketBase(PB_URL)

async function authAsSuperuser() {
  try {
    await pb.admins.authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    return
  } catch {
    // PocketBase >=0.23 uses _superusers; keep fallback for compatibility.
  }

  await pb.collection('_superusers').authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
}

async function deleteAllRecords(collectionName, filter = '') {
  const records = await pb.collection(collectionName).getFullList({ filter, $autoCancel: false })
  for (const rec of records) {
    await pb.collection(collectionName).delete(rec.id, { $autoCancel: false })
  }
  return records.length
}

function nextFridayDateOnly(tz) {
  const now = DateTime.now().setZone(tz)
  const daysUntilFriday = (5 - now.weekday + 7) % 7 || 7
  return now.plus({ days: daysUntilFriday }).toISODate()
}

function toUtcIso(dateOnly, time12h, tz) {
  const dtLocal = DateTime.fromFormat(`${dateOnly} ${time12h}`, 'yyyy-MM-dd hh:mm a', { zone: tz })
  if (!dtLocal.isValid) throw new Error(`Invalid local datetime: "${dateOnly} ${time12h}"`)
  return dtLocal.toUTC().toISO()
}

async function wipeData() {
  const counts = {}
  counts.attendance = await deleteAllRecords('attendance')
  counts.guardianships = await deleteAllRecords('guardianships')
  counts.cron_runs = await deleteAllRecords('cron_runs')
  counts.games = await deleteAllRecords('games')
  counts.app_settings = await deleteAllRecords('app_settings')
  counts.users = await deleteAllRecords('users')
  return counts
}

async function createSettings() {
  const created = await pb.collection('app_settings').create(
    {
      slug: 'global',
      frisbee_cron: true,
    },
    { $autoCancel: false },
  )

  try {
    await pb.collection('app_settings').update(
      created.id,
      {
        rsvp_paused: false,
        pause_message: 'RSVPs are paused right now. Please check back later.',
      },
      { $autoCancel: false },
    )
  } catch {
    await pb.collection('app_settings').update(
      created.id,
      {
        season_over: false,
        season_over_message: 'RSVPs are paused right now. Please check back later.',
      },
      { $autoCancel: false },
    )
  }

  return created
}

async function createUsers() {
  const seedUsers = [
    {
      key: 'mike',
      email: 'mike@mikebrister.com',
      password: DUMMY_PASSWORD,
      name: 'Mike Brister',
      display_name: 'Mike',
      first_name: 'Mike',
      last_name: 'Brister',
      isAdmin: true,
    },
    {
      key: 'jamie',
      email: 'jamie@example.com',
      password: DUMMY_PASSWORD,
      name: 'Jamie Carter',
      display_name: 'Jamie',
      first_name: 'Jamie',
      last_name: 'Carter',
      isAdmin: false,
    },
    {
      key: 'alex',
      email: 'alex@example.com',
      password: DUMMY_PASSWORD,
      name: 'Alex Rivera',
      display_name: 'Alex',
      first_name: 'Alex',
      last_name: 'Rivera',
      isAdmin: false,
    },
    {
      key: 'sam',
      email: 'sam@example.com',
      password: DUMMY_PASSWORD,
      name: 'Sam Patel',
      display_name: 'Sam',
      first_name: 'Sam',
      last_name: 'Patel',
      isAdmin: false,
    },
    {
      key: 'katherine',
      email: 'katherine@example.com',
      password: DUMMY_PASSWORD,
      name: 'Katherine Brister',
      display_name: 'Katherine',
      first_name: 'Katherine',
      last_name: 'Brister',
      isAdmin: false,
    },
    {
      key: 'owen',
      email: 'owen@example.com',
      password: DUMMY_PASSWORD,
      name: 'Owen Brister',
      display_name: 'Owen',
      first_name: 'Owen',
      last_name: 'Brister',
      isAdmin: false,
    },
  ]

  const out = new Map()

  for (const u of seedUsers) {
    const created = await pb.collection('users').create(
      {
        email: u.email,
        password: u.password,
        passwordConfirm: u.password,
        name: u.name,
        display_name: u.display_name,
        first_name: u.first_name,
        last_name: u.last_name,
        isAdmin: !!u.isAdmin,
        verified: true,
        emailVisibility: true,
      },
      { $autoCancel: false },
    )
    out.set(u.key, created)
  }

  // Keep legacy parent field populated for kids for compatibility.
  await pb.collection('users').update(
    out.get('katherine').id,
    { parent: out.get('mike').id },
    { $autoCancel: false },
  )
  await pb.collection('users').update(
    out.get('owen').id,
    { parent: out.get('mike').id },
    { $autoCancel: false },
  )

  return out
}

async function createGuardianships(users) {
  const links = [
    { guardian: users.get('mike').id, child: users.get('katherine').id },
    { guardian: users.get('jamie').id, child: users.get('katherine').id },
    { guardian: users.get('mike').id, child: users.get('owen').id },
    { guardian: users.get('jamie').id, child: users.get('owen').id },
  ]

  for (const link of links) {
    await pb.collection('guardianships').create(link, { $autoCancel: false })
  }
}

async function createGamesAndAttendance(users) {
  const nextFriday = nextFridayDateOnly(TIMEZONE)
  const nextFridayIso = toUtcIso(nextFriday, GAME_TIME, TIMEZONE)

  const activeGame = await pb.collection('games').create(
    {
      title: 'Friday Ultimate',
      location: 'Bird Street Park',
      date: nextFridayIso,
      date_only: nextFriday,
      active: true,
      cancelled: false,
      cancel_reason: null,
    },
    { $autoCancel: false },
  )

  const previousFriday = DateTime.fromISO(nextFriday).minus({ days: 7 }).toISODate()
  const previousFridayIso = toUtcIso(previousFriday, GAME_TIME, TIMEZONE)

  await pb.collection('games').create(
    {
      title: 'Friday Ultimate (Last Week)',
      location: 'Bird Street Park',
      date: previousFridayIso,
      date_only: previousFriday,
      active: false,
      cancelled: true,
      cancel_reason: 'Heavy rain and thunderstorms',
    },
    { $autoCancel: false },
  )

  const rsvps = [
    { user: users.get('mike'), status: 'In' },
    { user: users.get('jamie'), status: 'In' },
    { user: users.get('alex'), status: 'Maybe' },
    { user: users.get('sam'), status: 'Out' },
    { user: users.get('katherine'), status: 'In' },
    { user: users.get('owen'), status: 'Maybe' },
  ]

  for (const r of rsvps) {
    await pb.collection('attendance').create(
      {
        user: r.user.id,
        game: activeGame.id,
        status: r.status,
        name: r.user.display_name || r.user.name || r.user.email,
      },
      { $autoCancel: false },
    )
  }
}

async function main() {
  await authAsSuperuser()

  const wipeCounts = await wipeData()
  if (WIPE_ONLY) {
    console.log(JSON.stringify({ ok: true, wiped: wipeCounts, seeded: false }, null, 2))
    return
  }

  await createSettings()
  const users = await createUsers()
  await createGuardianships(users)
  await createGamesAndAttendance(users)

  const credentials = [
    'mike@mikebrister.com',
    'jamie@example.com',
    'alex@example.com',
    'sam@example.com',
    'katherine@example.com',
    'owen@example.com',
  ].map((email) => ({ email, password: DUMMY_PASSWORD }))

  console.log(
    JSON.stringify(
      {
        ok: true,
        wiped: wipeCounts,
        seeded: true,
        loginCredentials: credentials,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error('reset-seed failed:', err?.response?.data || err?.message || err)
  process.exit(1)
})
