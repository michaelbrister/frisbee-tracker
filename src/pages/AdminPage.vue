<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <q-btn label="League Page" icon="sports_esports" color="primary" @click="goToLeague" />
      </div>
    </q-header>

    <q-page-container>
      <q-page padding>
        <h1 class="text-h5">Admin Panel - Manage Games</h1>

        <q-toggle
          v-model="frisbeeCronEnabled"
          label="Enable Frisbee Game Cron"
          color="primary"
          @update:model-value="toggleCronFlag"
          class="q-mb-md"
        />

        <!-- Existing Games Table -->
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          :loading="isLoading"
          class="q-mt-md"
        >
          <template v-slot:loading>
            <q-inner-loading showing color="primary" />
          </template>

          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="active">
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
              <q-td key="title">{{ props.row.title }}</q-td>
              <q-td key="date">
                {{ formatToEastern(props.row.date, props.row.date_only) }}
              </q-td>
              <q-td key="location">{{ props.row.location }}</q-td>
              <q-td key="actions">
                <q-btn dense flat icon="edit" color="primary" @click="editGame(props.row)" />
                <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  @click="confirmDelete(props.row)"
                />
              </q-td>
              <q-td key="status">
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

              <q-td key="actions">
                <q-btn dense flat icon="edit" color="primary" @click="editGame(props.row)" />
                <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  @click="confirmDelete(props.row)"
                />

                <!-- NEW: cancel / uncancel -->
                <q-btn
                  v-if="!props.row.cancelled"
                  dense
                  flat
                  icon="event_busy"
                  color="orange"
                  label="Cancel"
                  @click="promptCancel(props.row)"
                />
                <q-btn
                  v-else
                  dense
                  flat
                  icon="refresh"
                  color="teal"
                  label="Un-cancel"
                  @click="uncancel(props.row)"
                />
              </q-td>
            </q-tr>
          </template>
        </q-table>

        <!-- Create Game FAB -->
        <q-fab
          color="primary"
          icon="add"
          label="New Game"
          label-position="left"
          direction="up"
          class="fixed-bottom-right q-mr-md q-mb-md"
          @click="showCreateDialog()"
        />

        <!-- Create/Edit Game Dialog -->
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Notify, useQuasar } from 'quasar'
import { DateTime } from 'luxon'
import pb from 'src/services/pocketbase'
import { useGameStore } from 'src/stores/gameStore'
import { getFrisbeeCronEnabled, setFrisbeeCronEnabled } from 'src/services/settingsService'
import GameDialog from 'src/components/GameDialog.vue'
import { storeToRefs } from 'pinia'

const router = useRouter()
const $q = useQuasar()

/* ---------------- Pinia ---------------- */
const gameStore = useGameStore()
const { games, isLoading } = storeToRefs(gameStore)

/* ---------------- Local state ---------------- */
const frisbeeCronEnabled = ref(false)
const showGameDialog = ref(false)
const isEditMode = ref(false)
const dialogGameData = ref({})

/* ---------------- Table columns ---------------- */
const columns = [
  { name: 'active', label: 'Active', field: 'active', sortable: false, align: 'center' },
  { name: 'title', label: 'Title', field: 'title', sortable: true, align: 'left' },
  { name: 'date', label: 'Date', field: 'date', sortable: true, align: 'left' },
  { name: 'location', label: 'Location', field: 'location', sortable: true, align: 'left' },
  { name: 'status', label: 'Status', field: 'cancelled', sortable: true, align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', sortable: false, align: 'center' },
]

/* ---------------- Rows (array, not ref) ---------------- */
const rows = computed(() => games.value ?? [])

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  try {
    await gameStore.fetchGames()
    await loadCronFlag()
  } catch (e) {
    console.error(e)
  }
})

/* ---------------- Nav ---------------- */
function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}
function goToLeague() {
  router.push({ name: 'league' })
}

/* ---------------- Dialogs: cancel/uncancel ---------------- */
function promptCancel(row) {
  $q.dialog({
    title: 'Cancel Game',
    message: `Provide a reason for cancelling ${formatToEastern(row.date)}:`,
    prompt: {
      model: '',
      type: 'text',
      isValid: (val) => (val || '').trim().length > 0,
      label: 'Reason',
      outlined: true,
    },
    cancel: true,
    persistent: true,
  }).onOk(async (reason) => {
    try {
      await gameStore.cancelGame(row.id, reason.trim())
      Notify.create({ type: 'warning', message: 'Game cancelled.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to cancel game.' })
    }
  })
}

function uncancel(row) {
  $q.dialog({
    title: 'Un-cancel Game',
    message: `Mark ${formatToEastern(row.date)} as scheduled again?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await gameStore.uncancelGame(row.id)
      Notify.create({ type: 'positive', message: 'Game restored.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to restore game.' })
    }
  })
}

/* ---------------- Date helpers ---------------- */
function formatToEastern(datetimeStr, dateOnlyStr) {
  if (datetimeStr) {
    let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
    if (!dt.isValid) dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
    if (dt.isValid) return dt.setZone('America/New_York').toLocaleString(DateTime.DATETIME_MED)
  }
  if (dateOnlyStr) {
    const dt = DateTime.fromFormat(dateOnlyStr, 'yyyy-MM-dd', { zone: 'America/New_York' })
    if (dt.isValid) return dt.toLocaleString(DateTime.DATE_MED)
  }
  return '—'
}

/* ---------------- Create/Edit ---------------- */
function showCreateDialog() {
  isEditMode.value = false
  dialogGameData.value = {
    title: 'Frisbee',
    location: 'Bird Street Park',
    date: getNextFriday(), // yyyy-MM-dd
    time: '05:30 PM',
  }
  showGameDialog.value = true
}

function editGame(game) {
  isEditMode.value = true
  // PB stores ISO; parse ISO first, then fallback to SQL
  let dt = DateTime.fromISO(game.date, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(game.date, { zone: 'utc' })
  const est = dt.isValid ? dt.setZone('America/New_York') : null

  dialogGameData.value = {
    ...game,
    date: est ? est.toISODate() : game.date_only || '',
    time: est ? est.toFormat('hh:mm a') : game.time || '05:30 PM',
  }
  showGameDialog.value = true
}

async function handleSave(gameData) {
  try {
    if (isEditMode.value) {
      await gameStore.updateGame(gameData)
    } else {
      await gameStore.createGame(gameData)
    }
    resetDialog()
  } catch (err) {
    console.error(err)
    const isDuplicate = err?.response?.data?.data?.date_only?.message?.includes('must be unique')
    Notify.create({
      type: 'negative',
      message: isDuplicate
        ? 'A game already exists on that day. Please edit the existing game instead.'
        : `Failed to ${isEditMode.value ? 'update' : 'create'} game.`,
    })
    if (isDuplicate) {
      highlightGameByDate(gameData.date)
    }
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

function confirmDelete(game) {
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete the game on ${formatToEastern(game.date)}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await gameStore.deleteGame(game.id)
      Notify.create({ type: 'info', message: 'Game deleted.' })
    } catch (e) {
      console.error(e)
      Notify.create({ type: 'negative', message: 'Failed to delete game.' })
    }
  })
}

function setActiveGame(selectedGame) {
  gameStore.setActiveGame(selectedGame)
}

function resetDialog() {
  showGameDialog.value = false
  isEditMode.value = false
  dialogGameData.value = {}
}

/* ---------------- Utilities ---------------- */
function getNextFriday() {
  const now = new Date()
  const day = now.getDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + daysUntilFriday)
  return nextFriday.toISOString().split('T')[0] // yyyy-MM-dd
}

/* ---------------- Cron flag (no auto-cancel, upsert) ---------------- */
async function loadCronFlag() {
  try {
    frisbeeCronEnabled.value = await getFrisbeeCronEnabled()
  } catch (err) {
    // 404 here would mean your seed record doesn't exist yet
    console.error('Failed to load cron flag:', err)
    frisbeeCronEnabled.value = false
  }
}

async function toggleCronFlag() {
  try {
    const next = !frisbeeCronEnabled.value
    // optimistic UI
    frisbeeCronEnabled.value = next

    const saved = await setFrisbeeCronEnabled(next)
    frisbeeCronEnabled.value = saved

    Notify.create({
      type: saved ? 'positive' : 'warning',
      message: `Frisbee cron ${saved ? 'enabled' : 'disabled'}`,
    })
  } catch (err) {
    console.error('Failed to update cron flag:', err)
    // revert optimistic UI on failure
    frisbeeCronEnabled.value = !frisbeeCronEnabled.value
    Notify.create({ type: 'negative', message: 'Failed to update cron flag' })
  }
}
</script>
