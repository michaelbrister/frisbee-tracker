import { ref } from 'vue'
import { Notify } from 'quasar'
import {
  getFrisbeeCronEnabled,
  getPauseMessage,
  getRsvpPaused,
  setFrisbeeCronEnabled,
  setPauseMessage,
  setRsvpPaused,
} from 'src/services/settingsService'

export function useAdminCronSettings() {
  const cachedRsvpPaused =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('frisbee.settings.rsvp_paused') === 'true'
      : false

  const frisbeeCronEnabled = ref(false)
  const togglingCron = ref(false)
  const rsvpPaused = ref(cachedRsvpPaused)
  const togglingRsvpPaused = ref(false)
  const pauseMessage = ref('')
  const savingPauseMessage = ref(false)

  async function loadCronFlag() {
    try {
      const [cronEnabled, pauseFlag, message] = await Promise.allSettled([
        getFrisbeeCronEnabled(),
        getRsvpPaused(),
        getPauseMessage(),
      ])

      frisbeeCronEnabled.value = cronEnabled.status === 'fulfilled' ? cronEnabled.value : false
      rsvpPaused.value = pauseFlag.status === 'fulfilled' ? pauseFlag.value : false
      pauseMessage.value = message.status === 'fulfilled' ? message.value : ''
    } catch (err) {
      console.error('Failed to load cron flag:', err)
      frisbeeCronEnabled.value = false
      rsvpPaused.value = false
      pauseMessage.value = ''
    }
  }

  async function toggleCronFlag(val) {
    try {
      togglingCron.value = true
      const desired = !!val
      frisbeeCronEnabled.value = desired

      const saved = await setFrisbeeCronEnabled(desired)
      frisbeeCronEnabled.value = saved

      Notify.create({
        type: saved ? 'positive' : 'warning',
        message: `Frisbee cron ${saved ? 'enabled' : 'disabled'}`,
      })
    } catch (err) {
      console.error('Failed to update cron flag:', err)
      frisbeeCronEnabled.value = !frisbeeCronEnabled.value
      Notify.create({ type: 'negative', message: 'Failed to update cron flag' })
    } finally {
      togglingCron.value = false
    }
  }

  async function toggleRsvpPaused(val) {
    try {
      togglingRsvpPaused.value = true
      const desired = !!val
      rsvpPaused.value = desired
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('frisbee.settings.rsvp_paused', desired ? 'true' : 'false')
      }

      await setRsvpPaused(desired)
      const saved = await getRsvpPaused()
      rsvpPaused.value = saved
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('frisbee.settings.rsvp_paused', saved ? 'true' : 'false')
      }

      Notify.create({
        type: saved ? 'warning' : 'positive',
        message: saved ? 'RSVPs paused' : 'RSVPs enabled',
      })
    } catch (err) {
      console.error('Failed to update RSVP pause flag:', err)
      rsvpPaused.value = !rsvpPaused.value
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'frisbee.settings.rsvp_paused',
          rsvpPaused.value ? 'true' : 'false',
        )
      }
      Notify.create({ type: 'negative', message: 'Failed to update RSVP pause status' })
    } finally {
      togglingRsvpPaused.value = false
    }
  }

  async function savePauseMessage(message) {
    try {
      savingPauseMessage.value = true
      const saved = await setPauseMessage(message)
      pauseMessage.value = saved
      Notify.create({ type: 'positive', message: 'Pause message saved' })
      return saved
    } catch (err) {
      console.error('Failed to save pause message:', err)
      Notify.create({ type: 'negative', message: 'Failed to save pause message' })
      throw err
    } finally {
      savingPauseMessage.value = false
    }
  }

  return {
    frisbeeCronEnabled,
    togglingCron,
    rsvpPaused,
    togglingRsvpPaused,
    pauseMessage,
    savingPauseMessage,
    loadCronFlag,
    toggleCronFlag,
    toggleRsvpPaused,
    savePauseMessage,
  }
}
