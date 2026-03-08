export function shouldResetRsvps(now, resetHour) {
  return now.weekday === 5 && Number.isFinite(resetHour) && now.hour === resetHour
}
