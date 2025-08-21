import { defineStore } from 'pinia'
import { ref } from 'vue'
import pb from 'src/services/pocketbase'
import { Notify } from 'quasar'

export const useGameStore = defineStore('gameStore', () => {
  const games = ref([])
  const isLoading = ref(false)

  // Fetch all games from PocketBase and update the local state.
  const fetchGames = async () => {
    isLoading.value = true
    try {
      games.value = await pb.collection('games').getFullList({ sort: 'date' })
    } catch (err) {
      console.error('Failed to load games:', err)
      Notify.create({ type: 'negative', message: 'Failed to load games.' })
    } finally {
      isLoading.value = false
    }
  }

  // Create a new game and add it to the local state.
  const createGame = async (gameData) => {
    try {
      const createdGame = await pb.collection('games').create(gameData)
      games.value.push(createdGame) // Optimistic UI update
      Notify.create({ type: 'positive', message: 'Game created!' })
    } catch (err) {
      console.error('Failed to create game:', err)
      const msg = err?.response?.data?.date?.[0] || 'An unknown error occurred.'
      Notify.create({ type: 'negative', message: `Failed to create game: ${msg}` })
      throw err
    }
  }

  // Update an existing game and update the local state.
  const updateGame = async (gameData) => {
    try {
      const updatedGame = await pb.collection('games').update(gameData.id, gameData)
      const index = games.value.findIndex((g) => g.id === gameData.id)
      if (index !== -1) {
        games.value[index] = updatedGame // Optimistic UI update
      }
      Notify.create({ type: 'positive', message: 'Game updated!' })
    } catch (err) {
      console.error('Failed to update game:', err)
      Notify.create({ type: 'negative', message: 'Failed to update game.' })
      throw err
    }
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

  return {
    games,
    isLoading,
    fetchGames,
    createGame,
    updateGame,
    deleteGame,
    setActiveGame,
  }
})
