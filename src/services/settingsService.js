import pb from 'src/services/pocketbase'

const COL = 'app_settings'
const SLUG = 'global'

let cachedId = null

async function resolveOrCreateRecord() {
  // 1) Try cached id
  if (cachedId) {
    try {
      const rec = await pb.collection(COL).getOne(cachedId, { $autoCancel: false })
      return rec
    } catch {
      cachedId = null // fall through to slug lookup
    }
  }

  // 2) Lookup by slug
  try {
    const rec = await pb.collection(COL).getFirstListItem(`slug = "${SLUG}"`, {
      $autoCancel: false,
      $cancelKey: 'settings-get',
    })
    cachedId = rec.id
    return rec
  } catch (err) {
    if (err?.status !== 404) throw err
  }

  // 3) Create if missing (race-safe)
  try {
    const created = await pb
      .collection(COL)
      .create(
        { slug: SLUG, frisbee_cron: false },
        { $autoCancel: false, $cancelKey: 'settings-create' },
      )
    cachedId = created.id
    return created
  } catch (err) {
    // If another client created it first, fetch again
    if (err?.status === 400 || err?.status === 409) {
      const rec = await pb.collection(COL).getFirstListItem(`slug = "${SLUG}"`, {
        $autoCancel: false,
        $cancelKey: 'settings-get-retry',
      })
      cachedId = rec.id
      return rec
    }
    throw err
  }
}

export async function getFrisbeeCronEnabled() {
  const rec = await resolveOrCreateRecord()
  return !!rec.frisbee_cron
}

export async function setFrisbeeCronEnabled(next) {
  const rec = await resolveOrCreateRecord()
  const updated = await pb
    .collection(COL)
    .update(rec.id, { frisbee_cron: !!next }, { $autoCancel: false, $cancelKey: 'settings-upd' })
  return !!updated.frisbee_cron
}
