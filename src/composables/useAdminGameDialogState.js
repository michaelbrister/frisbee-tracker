import { ref } from 'vue'
import {
  APP_TIMEZONE,
  DEFAULT_GAME_LOCATION,
  DEFAULT_GAME_TIME,
  DEFAULT_GAME_TITLE,
} from 'src/constants/app'
import { nextFridayISODate, toLocalGameFormFields } from 'src/utils/dates'

export function useAdminGameDialogState() {
  const showGameDialog = ref(false)
  const isEditMode = ref(false)
  const dialogGameData = ref({})

  function showCreateDialog() {
    isEditMode.value = false
    dialogGameData.value = {
      title: DEFAULT_GAME_TITLE,
      location: DEFAULT_GAME_LOCATION,
      date: nextFridayISODate(APP_TIMEZONE),
      time: DEFAULT_GAME_TIME,
    }
    showGameDialog.value = true
  }

  function editGame(game) {
    isEditMode.value = true
    const localFields = toLocalGameFormFields(game, APP_TIMEZONE, DEFAULT_GAME_TIME)

    dialogGameData.value = {
      ...game,
      date: localFields.date,
      time: localFields.time,
    }
    showGameDialog.value = true
  }

  function resetDialog() {
    showGameDialog.value = false
    isEditMode.value = false
    dialogGameData.value = {}
  }

  return {
    showGameDialog,
    isEditMode,
    dialogGameData,
    showCreateDialog,
    editGame,
    resetDialog,
  }
}
