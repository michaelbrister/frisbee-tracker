<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <ThemeToggle class="q-mr-sm" />
        <q-btn label="People" icon="groups" color="secondary" class="q-mr-sm" @click="goToPeople" />
        <q-btn label="League Page" icon="sports_esports" color="primary" @click="goToLeague" />
      </div>
    </q-header>

    <q-page-container>
      <q-page class="q-px-md q-pt-md q-pb-xl">
        <div class="row items-center justify-between q-mb-sm">
          <h1 class="text-h6 q-mb-none">Admin Panel — Manage Games</h1>
          <q-toggle
            v-model="frisbeeCronEnabled"
            label="Game Cron"
            color="primary"
            :disable="isLoading || togglingCron || rsvpPaused"
            @update:model-value="toggleCronFlag"
          >
            <template #thumb>
              <q-spinner v-if="togglingCron" size="14px" />
            </template>
          </q-toggle>
          <q-toggle
            v-model="rsvpPaused"
            class="q-ml-md"
            label="Pause RSVPs"
            color="warning"
            :disable="isLoading || togglingRsvpPaused"
            @update:model-value="toggleRsvpPaused"
          >
            <template #thumb>
              <q-spinner v-if="togglingRsvpPaused" size="14px" />
            </template>
          </q-toggle>
        </div>

        <q-card flat bordered class="q-mb-md">
          <q-card-section class="row items-center justify-between q-col-gutter-sm">
            <div class="col-12 col-md">
              <div class="text-subtitle1">Friday Reset Status</div>
              <div class="text-caption text-grey-7">Next scheduled run: {{ nextScheduledRunLabel }}</div>
              <div class="text-caption text-grey-7">Last run: {{ lastRunLabel }}</div>
              <div v-if="latestCronRun?.details" class="text-caption text-grey-7">
                {{ latestCronRun.details }}
              </div>
            </div>
            <div class="col-12 col-md-auto row q-gutter-sm">
              <q-btn
                color="secondary"
                outline
                icon="refresh"
                label="Refresh Status"
                :loading="cronStatusLoading"
                @click="loadCronStatus"
              />
              <q-btn
                color="primary"
                icon="play_arrow"
                label="Run Reset Now"
                :loading="manualRunLoading"
                :disable="manualRunLoading"
                @click="runResetNow"
              />
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1">Pause Message</div>
            <div class="text-caption text-grey-7 q-mb-sm">
              Shown on the league page when "Pause RSVPs" is enabled.
            </div>
            <q-input
              v-model="pauseMessageDraft"
              type="textarea"
              autogrow
              outlined
              dense
              maxlength="280"
              hint="Example: Game is canceled tonight due to weather. We'll update soon."
              :disable="isLoading || savingPauseMessage"
            />
            <div class="row justify-end q-mt-sm">
              <q-btn
                color="primary"
                icon="save"
                label="Save Message"
                :loading="savingPauseMessage"
                :disable="isLoading || !pauseMessageDraft.trim()"
                @click="onSavePauseMessage"
              />
            </div>
          </q-card-section>
        </q-card>

        <div v-if="$q.screen.lt.md">
          <q-pull-to-refresh @refresh="onPullToRefresh" :disable="isLoading">
            <div class="column q-gutter-sm q-mt-sm">
              <q-card v-for="g in rows" :key="g.id" flat bordered>
                <q-card-section class="q-pb-sm">
                  <div class="row items-center justify-between">
                    <div class="text-subtitle1 ellipsis">{{ g.title }}</div>
                    <q-chip
                      :color="g.cancelled ? 'negative' : 'positive'"
                      text-color="white"
                      dense
                      square
                      :icon="g.cancelled ? 'event_busy' : 'event_available'"
                    >
                      {{ g.cancelled ? 'Cancelled' : 'Scheduled' }}
                    </q-chip>
                  </div>

                  <div class="row items-center text-caption text-grey-7 q-mt-xs">
                    <q-icon name="event" size="16px" class="q-mr-xs" /> {{ g._dateLabel }}
                    <q-icon name="place" size="16px" class="q-ml-md q-mr-xs" /> {{ g.location }}
                  </div>

                  <div v-if="g.cancelled && g.cancel_reason" class="text-body2 q-mt-xs">
                    Reason: {{ g.cancel_reason }}
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-actions align="right" class="q-gutter-xs">
                  <q-btn
                    dense
                    outline
                    color="secondary"
                    icon="check_circle"
                    label="Set Active"
                    v-if="!g.active"
                    @click="setActiveGame(g)"
                    aria-label="Set Active"
                  />
                  <q-btn
                    dense
                    flat
                    color="primary"
                    icon="edit"
                    label="Edit"
                    @click="editGame(g)"
                    aria-label="Edit"
                  />
                  <q-btn
                    dense
                    flat
                    color="negative"
                    icon="delete"
                    label="Delete"
                    @click="confirmDelete(g)"
                    aria-label="Delete"
                  />
                  <q-btn
                    v-if="!g.cancelled"
                    dense
                    flat
                    color="orange"
                    icon="event_busy"
                    label="Cancel"
                    @click="promptCancel(g)"
                    aria-label="Cancel"
                  />
                  <q-btn
                    v-else
                    dense
                    flat
                    color="teal"
                    icon="refresh"
                    label="Un-cancel"
                    @click="uncancel(g)"
                    aria-label="Un-cancel"
                  />
                  <q-btn
                    dense
                    flat
                    icon="more_vert"
                    @click="moreActions(g)"
                    aria-label="More actions"
                  />
                </q-card-actions>
              </q-card>
            </div>

            <q-banner
              v-if="!isLoading && rows.length === 0"
              class="bg-grey-3 q-pa-md q-mt-md"
              rounded
            >
              No games found. Tap "New Game" to create one.
            </q-banner>
          </q-pull-to-refresh>
        </div>

        <q-table
          v-else
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          :loading="isLoading"
          :rows-per-page-options="[10, 25, 50, 0]"
          :sort-method="sortByDate"
          class="q-mt-md"
        >
          <template #loading>
            <q-inner-loading showing color="primary" />
          </template>

          <template #no-data>
            <div class="q-pa-md text-grey-7">No games yet. Click "New Game".</div>
          </template>

          <template #body="props">
            <q-tr :props="props">
              <q-td key="active" :props="props">
                <q-icon
                  v-if="props.row.active"
                  name="check_circle"
                  color="green"
                  size="24px"
                  class="q-mr-sm"
                />
                <q-btn
                  v-else
                  dense
                  flat
                  label="Set Active"
                  color="secondary"
                  @click="setActiveGame(props.row)"
                />
              </q-td>

              <q-td key="title" :props="props">{{ props.row.title }}</q-td>

              <q-td key="date" :props="props">
                {{ props.row._dateLabel }}
              </q-td>

              <q-td key="location" :props="props">{{ props.row.location }}</q-td>

              <q-td key="status" :props="props">
                <q-chip
                  v-if="props.row.cancelled"
                  color="negative"
                  text-color="white"
                  icon="event_busy"
                  square
                >
                  Cancelled
                </q-chip>
                <q-chip v-else color="positive" text-color="white" icon="event_available" square>
                  Scheduled
                </q-chip>
                <div
                  v-if="props.row.cancelled && props.row.cancel_reason"
                  class="text-grey-7 q-mt-xs"
                >
                  {{ props.row.cancel_reason }}
                </div>
              </q-td>

              <q-td key="actions" :props="props" class="q-gutter-xs">
                <q-btn
                  dense
                  flat
                  icon="edit"
                  color="primary"
                  @click="editGame(props.row)"
                  aria-label="Edit"
                />
                <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  @click="confirmDelete(props.row)"
                  aria-label="Delete"
                />
                <q-separator vertical spaced />
                <q-btn
                  v-if="!props.row.cancelled"
                  dense
                  flat
                  icon="event_busy"
                  color="orange"
                  label="Cancel"
                  @click="promptCancel(props.row)"
                  aria-label="Cancel"
                />
                <q-btn
                  v-else
                  dense
                  flat
                  icon="refresh"
                  color="teal"
                  label="Un-cancel"
                  @click="uncancel(props.row)"
                  aria-label="Un-cancel"
                />
              </q-td>
            </q-tr>
          </template>
        </q-table>

        <q-fab
          color="primary"
          icon="add"
          label="New Game"
          label-position="left"
          direction="up"
          class="fixed-bottom-right q-mr-md"
          :style="{ marginBottom: `calc(env(safe-area-inset-bottom) + 12px)` }"
          @click="showCreateDialog()"
        />

        <GameDialog
          v-model="showGameDialog"
          :is-edit="isEditMode"
          :initial-data="dialogGameData"
          @save="handleSave"
          @close="resetDialog"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon'
import { Notify, useQuasar } from 'quasar'
import pb from 'src/services/pocketbase'
import ThemeToggle from 'src/components/ThemeToggle.vue'
import { useGameStore } from 'src/stores/gameStore'
import { storeToRefs } from 'pinia'
import { APP_TIMEZONE } from 'src/constants/app'
import {
  combineDateTimeToUTC,
  formatDateTimeInTimezone,
  formatGameDateLabel,
  nextFridayISODate,
  toGameSortTimestamp,
} from 'src/utils/dates'
import { useQuasarDialogs } from 'src/composables/useQuasarDialogs'
import { useAdminGameDialogState } from 'src/composables/useAdminGameDialogState'
import { useAdminGameActions } from 'src/composables/useAdminGameActions'
import { useAdminCronSettings } from 'src/composables/useAdminCronSettings'

const router = useRouter()
const $q = useQuasar()

const gameStore = useGameStore()
const { games, isLoading } = storeToRefs(gameStore)
const latestCronRun = ref(null)
const cronStatusLoading = ref(false)
const manualRunLoading = ref(false)

const { confirmDialog, promptStringDialog, pickAction } = useQuasarDialogs($q)
const { showGameDialog, isEditMode, dialogGameData, showCreateDialog, editGame, resetDialog } =
  useAdminGameDialogState()
const {
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
} = useAdminCronSettings()
const pauseMessageDraft = ref('')

const GameDialog = defineAsyncComponent(() => import('src/components/GameDialog.vue'))

const rows = computed(() =>
  (games.value ?? []).map((g) => ({
    ...g,
    _dateLabel: formatGameDateLabel(g.date, g.date_only, APP_TIMEZONE),
  })),
)

const columns = [
  { name: 'active', label: 'Active', field: 'active', sortable: false, align: 'center' },
  { name: 'title', label: 'Title', field: 'title', sortable: true, align: 'left' },
  { name: 'date', label: 'Date', field: 'date', sortable: true, align: 'left' },
  { name: 'location', label: 'Location', field: 'location', sortable: true, align: 'left' },
  { name: 'status', label: 'Status', field: 'cancelled', sortable: true, align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', sortable: false, align: 'center' },
]

function sortByDate(a, b) {
  return toGameSortTimestamp(a, APP_TIMEZONE) - toGameSortTimestamp(b, APP_TIMEZONE)
}

onMounted(async () => {
  const [gamesResult, settingsResult, statusResult] = await Promise.allSettled([
    gameStore.fetchGames(),
    loadCronFlag(),
    loadCronStatus(),
  ])

  if (gamesResult.status === 'rejected') {
    console.error('Failed to load games on admin page mount', gamesResult.reason)
  }
  if (settingsResult.status === 'rejected') {
    console.error('Failed to load settings on admin page mount', settingsResult.reason)
  } else {
    pauseMessageDraft.value = pauseMessage.value
  }
  if (statusResult.status === 'rejected') {
    console.error('Failed to load cron status on admin page mount', statusResult.reason)
  }
})

async function onSavePauseMessage() {
  const message = pauseMessageDraft.value.trim()
  if (!message) return
  const saved = await savePauseMessage(message)
  pauseMessageDraft.value = saved
}

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToLeague() {
  router.push({ name: 'league' })
}

function goToPeople() {
  router.push({ name: 'admin-people' })
}

const nextScheduledRunLabel = computed(() => {
  const now = DateTime.now().setZone(APP_TIMEZONE)
  let next = now.set({ minute: 5, second: 0, millisecond: 0 })
  if (next <= now) next = next.plus({ hours: 1 })
  return next.toLocaleString(DateTime.DATETIME_MED)
})

const lastRunLabel = computed(() => {
  if (!latestCronRun.value?.created) return 'No run recorded yet'
  return formatDateTimeInTimezone(latestCronRun.value.created, APP_TIMEZONE)
})

const { moreActions, promptCancel, uncancel, confirmDelete, setActiveGame, handleSave } =
  useAdminGameActions({
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
  })

let refTimer
function requestRefresh(ms = 120) {
  clearTimeout(refTimer)
  refTimer = setTimeout(() => gameStore.fetchGames(), ms)
}

function onPullToRefresh(done) {
  gameStore.fetchGames().finally(done)
}

async function loadCronStatus() {
  cronStatusLoading.value = true
  try {
    latestCronRun.value = await pb.collection('cron_runs').getFirstListItem('', { sort: '-created' })
  } catch (err) {
    if (err?.status !== 404) {
      console.error('Failed to load cron status', err)
    }
    latestCronRun.value = null
  } finally {
    cronStatusLoading.value = false
  }
}

async function runResetNow() {
  const ok = await confirmDialog({
    title: 'Run Reset Now',
    message: 'This will clear RSVPs for next Friday and re-open responses. Continue?',
    cancel: true,
    persistent: true,
    position: $q.screen.lt.md ? 'bottom' : 'standard',
  })
  if (!ok) return

  manualRunLoading.value = true
  try {
    const dateOnly = nextFridayISODate(APP_TIMEZONE)
    const gameTime = import.meta.env.VITE_GAME_TIME || '05:30 PM'
    const gameTitle = import.meta.env.VITE_GAME_TITLE || 'Frisbee'
    const gameLocation = import.meta.env.VITE_GAME_LOCATION || 'Bird Street Park'
    const dateISO = combineDateTimeToUTC(dateOnly, gameTime, APP_TIMEZONE)

    let game = null
    try {
      game = await pb.collection('games').getFirstListItem(`date_only="${dateOnly}"`, {
        $autoCancel: false,
      })
    } catch (err) {
      if (err?.status !== 404) throw err
    }

    if (game) {
      game = await pb.collection('games').update(
        game.id,
        {
          title: gameTitle,
          location: gameLocation,
          date: dateISO,
          date_only: dateOnly,
          active: true,
          cancelled: false,
          cancel_reason: null,
        },
        { $autoCancel: false },
      )
    } else {
      game = await pb.collection('games').create(
        {
          title: gameTitle,
          location: gameLocation,
          date: dateISO,
          date_only: dateOnly,
          active: true,
          cancelled: false,
          cancel_reason: null,
        },
        { $autoCancel: false },
      )
    }

    const activeOthers = await pb.collection('games').getFullList({
      filter: `active=true && id!="${game.id}"`,
      $autoCancel: false,
    })
    for (const other of activeOthers) {
      await pb.collection('games').update(other.id, { active: false }, { $autoCancel: false })
    }

    const rsvps = await pb.collection('attendance').getFullList({
      filter: `game="${game.id}"`,
      $autoCancel: false,
    })
    for (const rsvp of rsvps) {
      await pb.collection('attendance').delete(rsvp.id, { $autoCancel: false })
    }

    try {
      await pb.collection('cron_runs').create(
        {
          source: 'manual',
          status: true,
          reset_triggered: true,
          rsvps_reset: String(rsvps.length),
          run_for_date: dateOnly,
          details: 'Manual reset run from Admin page',
          triggered_by: pb.authStore.model?.id || '',
        },
        { $autoCancel: false },
      )
    } catch (err) {
      console.error('Failed to write manual run status', err)
    }

    Notify.create({ type: 'positive', message: `Reset complete. Cleared ${rsvps.length} RSVP(s).` })
    await Promise.all([gameStore.fetchGames(), loadCronStatus()])
  } catch (err) {
    console.error('Manual reset failed', err)
    Notify.create({ type: 'negative', message: 'Manual reset failed.' })
    try {
      await pb.collection('cron_runs').create(
        {
          source: 'manual',
          status: false,
          reset_triggered: false,
          rsvps_reset: '0',
          run_for_date: '',
          details: `Manual reset failed: ${err?.message || 'unknown error'}`,
          triggered_by: pb.authStore.model?.id || '',
        },
        { $autoCancel: false },
      )
    } catch (writeErr) {
      console.error('Failed to write failure run status', writeErr)
    }
  } finally {
    manualRunLoading.value = false
  }
}
</script>

<style scoped>
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
