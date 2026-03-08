import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldResetRsvps } from '../scheduler/cron-utils.mjs'

test('shouldResetRsvps returns true only during friday reset hour', () => {
  assert.equal(shouldResetRsvps({ weekday: 5, hour: 22 }, 22), true)
  assert.equal(shouldResetRsvps({ weekday: 4, hour: 22 }, 22), false)
  assert.equal(shouldResetRsvps({ weekday: 5, hour: 21 }, 22), false)
  assert.equal(shouldResetRsvps({ weekday: 5, hour: 22 }, Number.NaN), false)
})
