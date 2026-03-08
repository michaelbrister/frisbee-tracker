import test from 'node:test'
import assert from 'node:assert/strict'
import {
  combineDateTimeToUTC,
  formatGameDateLabel,
  isFridayDate,
  normalizeToUTCISO,
  toDateOnly,
} from '../src/utils/dates.js'

test('isFridayDate validates friday and non-friday dates', () => {
  assert.equal(isFridayDate('2026-03-06'), true)
  assert.equal(isFridayDate('2026-03-07'), false)
})

test('combineDateTimeToUTC converts ET to UTC ISO', () => {
  const utc = combineDateTimeToUTC('2026-03-06', '05:30 PM')
  assert.ok(utc.includes('2026-03-06T22:30:00'))
})

test('normalizeToUTCISO handles existing ISO and date+time inputs', () => {
  assert.equal(
    normalizeToUTCISO('2026-03-06T22:30:00.000Z'),
    '2026-03-06T22:30:00.000Z',
  )
  assert.ok(normalizeToUTCISO('2026-03-06', '05:30 PM')?.startsWith('2026-03-06T22:30:00'))
})

test('toDateOnly supports ISO and date-only values', () => {
  assert.equal(toDateOnly('2026-03-06T22:30:00.000Z'), '2026-03-06')
  assert.equal(toDateOnly('2026-03-06'), '2026-03-06')
})

test('formatGameDateLabel provides fallback marker', () => {
  assert.equal(formatGameDateLabel('', ''), '—')
})
