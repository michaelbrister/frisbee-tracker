import { defineStore } from 'pinia'
import { ref } from 'vue'
import pb from 'src/services/pocketbase'
import { Notify } from 'quasar'
import { DateTime } from 'luxon'

export const useGameStore = defineStore('gameStore', () => {
  const games = ref([])
  const isLoading = ref(false)

  const fetchGames = async () => {
    isLoading.value = true
    try {
      const records = await pb.collection('games').getFullList({ sort: 'date' })
      games.value = records
      return records
    } catch (err) {
      console.error('Failed to load games:', err)
      Notify.create({ type: 'negative', message: 'Failed to load games.' })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function findGameByDate(dateOnlyStr) {
    try {
      return await pb.collection('games').getFirstListItem(`date_only = "${dateOnlyStr}"`)
    } catch {
      return null
    }
  }

  // createGame / updateGame: include cancelled fields (default false)
  async function createGame(gameData) {
    const dateISO = normalizeToUTCISO(gameData.date, gameData.time)
    const dateOnly = toDateOnly(gameData.date) || (dateISO && toDateOnly(dateISO))
    if (!dateISO || !dateOnly) throw new Error('date and date_only required')

    const created = await pb.collection('games').create({
      title: gameData.title,
      location: gameData.location,
      date: dateISO,
      date_only: dateOnly,
      active: !!gameData.active,
      cancelled: !!(gameData.cancelled ?? false),
      cancel_reason: gameData.cancel_reason ?? null,
      cancelled_at: gameData.cancelled ? new Date().toISOString() : null,
    })
    await fetchGames()
    return created
  }

  async function updateGame(gameData) {
    const dateISO = normalizeToUTCISO(gameData.date, gameData.time)
    const dateOnly = toDateOnly(gameData.date) || (dateISO && toDateOnly(dateISO))
    if (!dateISO || !dateOnly) throw new Error('date and date_only required')

    const updated = await pb.collection('games').update(gameData.id, {
      title: gameData.title,
      location: gameData.location,
      date: dateISO,
      date_only: dateOnly,
      active: !!gameData.active,
      cancelled: !!(gameData.cancelled ?? false),
      cancel_reason: gameData.cancel_reason ?? null,
      cancelled_at: gameData.cancelled ? (gameData.cancelled_at ?? new Date().toISOString()) : null,
    })
    await fetchGames()
    return updated
  }

  // NEW: cancel / uncancel helpers
  async function cancelGame(gameId, reason) {
    await pb.collection('games').update(gameId, {
      cancelled: true,
      cancel_reason: reason ?? 'No reason provided',
      cancelled_at: new Date().toISOString(),
    })
    await fetchGames()
  }

  async function uncancelGame(gameId) {
    await pb.collection('games').update(gameId, {
      cancelled: false,
      cancel_reason: null,
      cancelled_at: null,
    })
    await fetchGames()
  }

  // Delete a game and remove it from the local state.
  const deleteGame = async (gameId) => {
    try {
      await pb.collection('games').delete(gameId)
      games.value = games.value.filter((g) => g.id !== gameId) // Optimistic UI update
      Notify.create({ type: 'info', message: 'Game deleted.' })
    } catch (err) {
      console.error('Failed to delete game:', err)
      Notify.create({ type: 'negative', message: 'Failed to delete game.' })
    }
  }

  // Set a game as active, deactivating any others.
  const setActiveGame = async (selectedGame) => {
    try {
      const currentActive = games.value.find((g) => g.active)
      if (currentActive && currentActive.id === selectedGame.id) return

      const updatePromises = []
      if (currentActive) {
        updatePromises.push(pb.collection('games').update(currentActive.id, { active: false }))
      }
      updatePromises.push(pb.collection('games').update(selectedGame.id, { active: true }))

      await Promise.all(updatePromises)
      await fetchGames() // Re-fetch to ensure sync after complex update
      Notify.create({ type: 'positive', message: `Set "${selectedGame.title}" as active.` })
    } catch (err) {
      console.error('Failed to set active game:', err)
      Notify.create({ type: 'negative', message: 'Failed to set active game.' })
    }
  }

  console.log('Loaded games:', games.value)

  function normalizeToUTCISO(inputDate, inputTime) {
    if (!inputDate) return null

    // If already ISO datetime, trust it and normalize to UTC.
    if (typeof inputDate === 'string' && inputDate.includes('T')) {
      const dt = DateTime.fromISO(inputDate)
      return dt.isValid ? dt.toUTC().toISO() : null
    }

    // Otherwise we expect date-only + time (e.g., "2025-08-29" + "05:30 PM")
    if (!inputTime) return null

    const dt = DateTime.fromFormat(`${inputDate} ${inputTime}`, 'yyyy-MM-dd hh:mm a', {
      zone: 'America/New_York',
    })
    return dt.isValid ? dt.toUTC().toISO() : null
  }

  // Works for either ISO datetime or "yyyy-MM-dd"
  function toDateOnly(input) {
    if (!input) return null
    let dt = DateTime.fromISO(input)
    if (!dt.isValid) dt = DateTime.fromFormat(input, 'yyyy-MM-dd')
    return dt.isValid ? dt.toISODate() : null
  }

  return {
    games,
    isLoading,
    fetchGames,
    createGame,
    updateGame,
    deleteGame,
    setActiveGame,
    findGameByDate,
    normalizeToUTCISO,
    toDateOnly,
    cancelGame,
    uncancelGame,
  }
})
