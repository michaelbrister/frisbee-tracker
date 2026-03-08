// src/services/settingsService.js
import { pbApi } from 'src/services/pbApi'

// Defaults for your setup; override when needed
const DEFAULT_COLLECTION = 'app_settings'
const DEFAULT_SLUG = 'global'
const CACHE_KEYS = {
  rsvpPaused: 'frisbee.settings.rsvp_paused',
  pauseMessage: 'frisbee.settings.pause_message',
  legacySeasonOver: 'frisbee.settings.season_over',
  legacySeasonOverMessage: 'frisbee.settings.season_over_message',
}

// normalize any type to boolean
function toBool(v) {
  return v === true || v === 'true' || v === 1 || v === '1'
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readCachedBoolAny(keys, fallback = false) {
  for (const key of keys) {
    const raw = canUseStorage() ? window.localStorage.getItem(key) : null
    if (raw != null) return toBool(raw)
  }
  return fallback
}

function writeCachedBool(key, value) {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, toBool(value) ? 'true' : 'false')
}

function readCachedTextAny(keys, fallback = '') {
  for (const key of keys) {
    const raw = canUseStorage() ? window.localStorage.getItem(key) : null
    if (raw != null) return raw
  }
  return fallback
}

function writeCachedText(key, value) {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, String(value || ''))
}

export async function getSettingsRecord(
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  try {
    const rec = await pbApi.firstListItem(collection, `slug="${slug}"`, {
      $autoCancel: false,
      ...reqOpts,
    })
    return rec
  } catch (err) {
    if (err?.status === 404) return null
    throw err
  }
}

export async function resolveOrCreateRecord(
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  const existing = await getSettingsRecord({ collection, slug }, reqOpts)
  if (existing) return existing

  // Create a seed record with a safe default
  const created = await pbApi.create(
    collection,
    {
      slug,
      frisbee_cron: false,
      rsvp_paused: false,
      pause_message: 'RSVPs are paused right now. Please check back later.',
    },
    { $autoCancel: false, ...reqOpts },
  )
  return created
}

export async function getFrisbeeCronEnabled(
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
  return toBool(rec?.frisbee_cron)
}

export async function setFrisbeeCronEnabled(
  enabled,
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
  const patch = { frisbee_cron: toBool(enabled) }
  const updated = await pbApi.update(collection, rec.id, patch, {
    $autoCancel: false,
    ...reqOpts,
  })
  return toBool(updated?.frisbee_cron)
}

export async function getRsvpPaused(
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  try {
    const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
    const value = toBool(rec?.rsvp_paused ?? rec?.season_over)
    writeCachedBool(CACHE_KEYS.rsvpPaused, value)
    writeCachedBool(CACHE_KEYS.legacySeasonOver, value)
    return value
  } catch {
    return readCachedBoolAny([CACHE_KEYS.rsvpPaused, CACHE_KEYS.legacySeasonOver], false)
  }
}

export async function setRsvpPaused(
  enabled,
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
  const value = toBool(enabled)
  const patch = {}
  if ('rsvp_paused' in rec) patch.rsvp_paused = value
  if ('season_over' in rec || !('rsvp_paused' in rec)) patch.season_over = value
  const updated = await pbApi.update(collection, rec.id, patch, {
    $autoCancel: false,
    ...reqOpts,
  })
  const saved = toBool(updated?.rsvp_paused ?? updated?.season_over)
  writeCachedBool(CACHE_KEYS.rsvpPaused, saved)
  writeCachedBool(CACHE_KEYS.legacySeasonOver, saved)
  return saved
}

export async function getPauseMessage(
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  try {
    const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
    const value = (rec?.pause_message || rec?.season_over_message || '').trim()
    writeCachedText(CACHE_KEYS.pauseMessage, value)
    writeCachedText(CACHE_KEYS.legacySeasonOverMessage, value)
    return value
  } catch {
    return readCachedTextAny([CACHE_KEYS.pauseMessage, CACHE_KEYS.legacySeasonOverMessage], '').trim()
  }
}

export async function setPauseMessage(
  message,
  { collection = DEFAULT_COLLECTION, slug = DEFAULT_SLUG } = {},
  reqOpts = {},
) {
  const rec = await resolveOrCreateRecord({ collection, slug }, reqOpts)
  const value = String(message || '').trim()
  const patch = {}
  if ('pause_message' in rec) patch.pause_message = value
  if ('season_over_message' in rec || !('pause_message' in rec)) patch.season_over_message = value
  const updated = await pbApi.update(collection, rec.id, patch, {
    $autoCancel: false,
    ...reqOpts,
  })
  const saved = (updated?.pause_message || updated?.season_over_message || '').trim()
  writeCachedText(CACHE_KEYS.pauseMessage, saved)
  writeCachedText(CACHE_KEYS.legacySeasonOverMessage, saved)
  return saved
}

// Backward-compatible aliases
export const getSeasonOver = getRsvpPaused
export const setSeasonOver = setRsvpPaused
export const getSeasonOverMessage = getPauseMessage
export const setSeasonOverMessage = setPauseMessage
