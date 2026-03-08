import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Notify } from 'quasar'
import { normalizeToUTCISO, toDateOnly } from 'src/utils/dates'
import { pbApi } from 'src/services/pbApi'

/**
 * @typedef {object} GamePayload
 * @property {string} [id]
 * @property {string} title
 * @property {string} location
 * @property {string} date
 * @property {string} [time]
 * @property {boolean} [active]
 * @property {boolean} [cancelled]
 * @property {string|null} [cancel_reason]
 * @property {string|null} [cancelled_at]
 */

export const useGameStore = defineStore('gameStore', () => {
  const games = ref([])
  const isLoading = ref(false)

  const fetchGames = async () => {
    isLoading.value = true
    try {
      const records = await pbApi.fullList('games', { sort: 'date' })
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
    return pbApi.firstListItemOrNull('games', `date_only = "${dateOnlyStr}"`)
  }

  // createGame / updateGame: include cancelled fields (default false)
  /**
   * @param {GamePayload} gameData
   */
  async function createGame(gameData) {
    const dateISO = normalizeToUTCISO(gameData.date, gameData.time)
    const dateOnly = toDateOnly(gameData.date) || (dateISO && toDateOnly(dateISO))
    if (!dateISO || !dateOnly) throw new Error('date and date_only required')

    const created = await pbApi.create('games', {
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

  /**
   * @param {GamePayload} gameData
   */
  async function updateGame(gameData) {
    const dateISO = normalizeToUTCISO(gameData.date, gameData.time)
    const dateOnly = toDateOnly(gameData.date) || (dateISO && toDateOnly(dateISO))
    if (!dateISO || !dateOnly) throw new Error('date and date_only required')

    const updated = await pbApi.update('games', gameData.id, {
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
    await pbApi.update('games', gameId, {
      cancelled: true,
      cancel_reason: reason ?? 'No reason provided',
      cancelled_at: new Date().toISOString(),
    })
    await fetchGames()
  }

  async function uncancelGame(gameId) {
    await pbApi.update('games', gameId, {
      cancelled: false,
      cancel_reason: null,
      cancelled_at: null,
    })
    await fetchGames()
  }

  // Delete a game and remove it from the local state.
  const deleteGame = async (gameId) => {
    try {
      await pbApi.remove('games', gameId)
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
        updatePromises.push(pbApi.update('games', currentActive.id, { active: false }))
      }
      updatePromises.push(pbApi.update('games', selectedGame.id, { active: true }))

      await Promise.all(updatePromises)
      await fetchGames() // Re-fetch to ensure sync after complex update
      Notify.create({ type: 'positive', message: `Set "${selectedGame.title}" as active.` })
    } catch (err) {
      console.error('Failed to set active game:', err)
      Notify.create({ type: 'negative', message: 'Failed to set active game.' })
    }
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
