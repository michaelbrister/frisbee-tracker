import { DateTime } from 'luxon'
import { APP_TIMEZONE } from '../constants/app.js'

export function nextFridayISODate(timezone = APP_TIMEZONE) {
  const now = DateTime.now().setZone(timezone)
  const days = (5 - now.weekday + 7) % 7 || 7
  return now.plus({ days }).toISODate()
}

export function isFridayDate(dateStr, timezone = APP_TIMEZONE) {
  const format = dateStr?.includes('/') ? 'yyyy/MM/dd' : 'yyyy-MM-dd'
  const dt = DateTime.fromFormat(dateStr, format, { zone: timezone })
  return dt.isValid && dt.weekday === 5
}

export function combineDateTimeToUTC(dateStr, timeStr12h, timezone = APP_TIMEZONE) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr12h}`, 'yyyy-MM-dd hh:mm a', {
    zone: timezone,
  })
  if (!dt.isValid) throw new Error('Invalid time value')
  return dt.toUTC().toISO()
}

export function normalizeToUTCISO(inputDate, inputTime, timezone = APP_TIMEZONE) {
  if (!inputDate) return null

  if (typeof inputDate === 'string' && inputDate.includes('T')) {
    const dt = DateTime.fromISO(inputDate)
    return dt.isValid ? dt.toUTC().toISO() : null
  }

  if (!inputTime) return null
  return combineDateTimeToUTC(inputDate, inputTime, timezone)
}

export function toDateOnly(input) {
  if (!input) return null
  let dt = DateTime.fromISO(input)
  if (!dt.isValid) dt = DateTime.fromFormat(input, 'yyyy-MM-dd')
  return dt.isValid ? dt.toISODate() : null
}

export function formatGameDateLabel(datetimeStr, dateOnlyStr, timezone = APP_TIMEZONE) {
  if (datetimeStr) {
    let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
    if (!dt.isValid) dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
    if (dt.isValid) return dt.setZone(timezone).toLocaleString(DateTime.DATETIME_MED)
  }

  if (dateOnlyStr) {
    const dt = DateTime.fromFormat(dateOnlyStr, 'yyyy-MM-dd', { zone: timezone })
    if (dt.isValid) return dt.toLocaleString(DateTime.DATE_MED)
  }

  return '—'
}

export function formatDateTimeInTimezone(datetimeStr, timezone = APP_TIMEZONE) {
  if (!datetimeStr) return ''
  let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
  return dt.isValid ? dt.setZone(timezone).toLocaleString(DateTime.DATETIME_MED) : ''
}

export function toGameSortTimestamp(record, timezone = APP_TIMEZONE) {
  if (record.date) return DateTime.fromISO(record.date, { zone: 'utc' }).toMillis()
  if (record.date_only) return DateTime.fromFormat(record.date_only, 'yyyy-MM-dd', { zone: timezone }).toMillis()
  return 0
}

export function toLocalGameFormFields(game, timezone = APP_TIMEZONE, fallbackTime = '05:30 PM') {
  let dt = DateTime.fromISO(game.date, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(game.date, { zone: 'utc' })

  if (!dt.isValid) {
    return {
      date: game.date_only || '',
      time: game.time || fallbackTime,
    }
  }

  const local = dt.setZone(timezone)
  return {
    date: local.toISODate(),
    time: local.toFormat('hh:mm a'),
  }
}
