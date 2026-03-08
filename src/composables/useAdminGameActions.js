import { Notify } from 'quasar'
import { APP_TIMEZONE } from 'src/constants/app'
import { formatGameDateLabel } from 'src/utils/dates'

/**
 * @typedef {object} AdminGameActionRow
 * @property {string} id
 * @property {string} title
 * @property {string} [date]
 * @property {string} [date_only]
 * @property {boolean} [active]
 * @property {boolean} [cancelled]
 */

/**
 * @typedef {object} AdminGameActionsDeps
 * @property {import('quasar').QVueGlobals} $q
 * @property {{ value: Array<AdminGameActionRow> }} rows
 * @property {{
 *  cancelGame: (id: string, reason?: string) => Promise<void>,
 *  uncancelGame: (id: string) => Promise<void>,
 *  deleteGame: (id: string) => Promise<void>,
 *  setActiveGame: (row: AdminGameActionRow) => Promise<void>,
 *  createGame: (payload: object) => Promise<unknown>,
 *  updateGame: (payload: object) => Promise<unknown>,
 *  findGameByDate: (dateStr: string) => Promise<AdminGameActionRow | null>
 * }} gameStore
 * @property {{ value: boolean }} isEditMode
 * @property {(row: AdminGameActionRow) => void} editGame
 * @property {() => void} resetDialog
 * @property {(ms?: number) => void} requestRefresh
 * @property {(options: object) => Promise<boolean>} confirmDialog
 * @property {(options: object) => Promise<string>} promptStringDialog
 * @property {(input: { title: string, message?: string, actions?: Array<object> }) => Promise<string|object|null>} pickAction
 */

/**
 * @param {AdminGameActionsDeps} deps
 */
export function useAdminGameActions({
  $q,
  rows,
  gameStore,
  isEditMode,
  editGame,
  resetDialog,
  requestRefresh,
  confirmDialog,
  promptStringDialog,
  pickAction,
}) {
  function dialogPosition() {
    return $q.screen.lt.md ? 'bottom' : 'standard'
  }

  async function moreActions(row) {
    const actions = [
      { label: row.active ? 'Active' : 'Set Active', icon: 'check_circle', id: 'active' },
      { label: 'Edit', icon: 'edit', id: 'edit' },
      {
        label: row.cancelled ? 'Un-cancel' : 'Cancel',
        icon: row.cancelled ? 'refresh' : 'event_busy',
        id: 'cancel',
      },
      { label: 'Delete', icon: 'delete', id: 'delete', color: 'negative' },
    ]

    const picked = await pickAction({ title: row.title, actions })
    if (!picked) return

    const id = typeof picked === 'string' ? picked : picked.id
    if (id === 'active') await setActiveGame(row)
    else if (id === 'edit') editGame(row)
    else if (id === 'cancel') {
      if (row.cancelled) await uncancel(row)
      else await promptCancel(row)
    } else if (id === 'delete') {
      await confirmDelete(row)
    }
  }

  async function promptCancel(row) {
    const reason = (
      await promptStringDialog({
        title: 'Cancel Game',
        message: `Provide a reason for cancelling ${formatGameDateLabel(row.date, row.date_only, APP_TIMEZONE)}:`,
        prompt: {
          model: '',
          type: 'text',
          isValid: (v) => (v || '').trim().length > 0,
          label: 'Reason',
          outlined: true,
        },
        cancel: true,
        persistent: true,
        position: dialogPosition(),
      })
    ).trim()

    if (!reason) return

    try {
      await gameStore.cancelGame(row.id, reason)
      requestRefresh()
      Notify.create({ type: 'warning', message: 'Game cancelled.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to cancel game.' })
    }
  }

  async function uncancel(row) {
    const ok = await confirmDialog({
      title: 'Un-cancel Game',
      message: `Mark ${formatGameDateLabel(row.date, row.date_only, APP_TIMEZONE)} as scheduled again?`,
      cancel: true,
      persistent: true,
      position: dialogPosition(),
    })
    if (!ok) return

    try {
      await gameStore.uncancelGame(row.id)
      requestRefresh()
      Notify.create({ type: 'positive', message: 'Game restored.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to restore game.' })
    }
  }

  async function confirmDelete(game) {
    const ok = await confirmDialog({
      title: 'Confirm',
      message: `Delete the game on ${formatGameDateLabel(game.date, game.date_only, APP_TIMEZONE)}?`,
      cancel: true,
      persistent: true,
      position: dialogPosition(),
    })
    if (!ok) return

    try {
      await gameStore.deleteGame(game.id)
      requestRefresh()
      Notify.create({ type: 'info', message: 'Game deleted.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to delete game.' })
    }
  }

  async function setActiveGame(selectedGame) {
    const hasActive = rows.value.some((r) => r.active && r.id !== selectedGame.id)

    if (hasActive) {
      const ok = await confirmDialog({
        title: 'Set Active',
        message: 'This will deactivate the current active game. Continue?',
        cancel: true,
        persistent: true,
        position: dialogPosition(),
      })
      if (!ok) return
    }

    await gameStore.setActiveGame(selectedGame)
    requestRefresh()
  }

  async function handleSave(gameData) {
    try {
      if (isEditMode.value) await gameStore.updateGame(gameData)
      else await gameStore.createGame(gameData)
      resetDialog()
      requestRefresh()
    } catch (err) {
      console.error(err)
      const isDuplicate = err?.response?.data?.data?.date_only?.message?.includes('must be unique')
      Notify.create({
        type: 'negative',
        message: isDuplicate
          ? 'A game already exists on that day. Please edit the existing game instead.'
          : `Failed to ${isEditMode.value ? 'update' : 'create'} game.`,
      })
      if (isDuplicate) await highlightGameByDate(gameData.date)
    }
  }

  async function highlightGameByDate(dateStr) {
    try {
      const existing = await gameStore.findGameByDate(dateStr)
      if (existing) editGame(existing)
    } catch (err) {
      console.error('Could not find existing game for navigation:', err)
    }
  }

  return {
    moreActions,
    promptCancel,
    uncancel,
    confirmDelete,
    setActiveGame,
    handleSave,
  }
}
