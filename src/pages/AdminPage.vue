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
          :rows="games"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          :sort-method="sortByDate"
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
              <q-td key="date">{{ formatToEastern(props.row.date) }}</q-td>
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
          @click="showCreateDialog = true"
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Notify, useQuasar } from 'quasar'
import { DateTime } from 'luxon'
import pb from '../services/pocketbase'
import { useGameStore } from 'src/stores/gameStore.js'
import GameDialog from 'src/components/GameDialog.vue'

const router = useRouter()
const $q = useQuasar()

// A reactive reference to hold the Pinia store instance. It starts as null.
const gameStore = ref(null)
const frisbeeCronEnabled = ref(false)
const showGameDialog = ref(false)
const isEditMode = ref(false)
const dialogGameData = ref({})

// Define the columns for the QTable
const columns = [
  { name: 'active', label: 'Active', field: 'active', sortable: false, align: 'center' },
  { name: 'title', label: 'Title', field: 'title', sortable: true, align: 'left' },
  { name: 'date', label: 'Date', field: 'date', sortable: true, align: 'left' },
  { name: 'location', label: 'Location', field: 'location', sortable: true, align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', sortable: false, align: 'center' },
]

// These computed properties now safely check if the store is available.
const games = computed(() => (gameStore.value ? gameStore.value.games : []))
const isLoading = computed(() => (gameStore.value ? gameStore.value.isLoading : true))

// We will now check if the store is available on mount and handle the case where it isn't.
onMounted(() => {
  try {
    gameStore.value = useGameStore()
    // Add a check to verify Pinia is running
    if (gameStore.value) {
      console.log('Pinia is running. Game store initialized successfully.')
      console.log('AdminPage.vue mounted. Fetching games...')
      gameStore.value.fetchGames()
      loadCronFlag()
    } else {
      console.error('Pinia store not available during onMounted.')
      Notify.create({
        type: 'negative',
        message:
          'Could not initialize the game store. Please ensure Pinia is set up correctly in your main application file.',
      })
    }
  } catch (error) {
    console.error('Failed to initialize game store:', error)
    Notify.create({
      type: 'negative',
      message: 'Failed to load game data. Please try refreshing.',
    })
  }
})

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToLeague() {
  router.push({ name: 'league' })
}

function formatToEastern(datetimeStr) {
  if (!datetimeStr) return ''
  return DateTime.fromSQL(datetimeStr, { zone: 'utc' })
    .setZone('America/New_York')
    .toLocaleString(DateTime.DATETIME_MED)
}

function sortByDate(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

const showCreateDialog = () => {
  isEditMode.value = false
  dialogGameData.value = {
    title: 'Frisbee',
    location: 'Bird Street Park',
    date: getNextFriday(),
    time: '05:30 PM',
  }
  showGameDialog.value = true
}

const editGame = (game) => {
  isEditMode.value = true
  const dt = DateTime.fromSQL(game.date, { zone: 'utc' }).setZone('America/New_York')
  dialogGameData.value = {
    ...game,
    date: dt.toISODate(),
    time: dt.toFormat('hh:mm a'),
  }
  showGameDialog.value = true
}

const handleSave = async (gameData) => {
  if (!gameStore.value) {
    Notify.create({ type: 'negative', message: 'Store not ready.' })
    return
  }
  try {
    if (isEditMode.value) {
      await gameStore.value.updateGame(gameData)
    } else {
      await gameStore.value.createGame(gameData)
    }
    resetDialog()
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: `Failed to ${isEditMode.value ? 'update' : 'create'} game.`,
    })
    console.error(err)
  }
}

const confirmDelete = (game) => {
  if (!gameStore.value) {
    Notify.create({ type: 'negative', message: 'Store not ready.' })
    return
  }
  $q.dialog({
    title: 'Confirm',
    message: `Are you sure you want to delete the game on ${formatToEastern(game.date)}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await gameStore.value.deleteGame(game.id)
  })
}

const setActiveGame = (selectedGame) => {
  if (gameStore.value) {
    gameStore.value.setActiveGame(selectedGame)
  }
}

const resetDialog = () => {
  showGameDialog.value = false
  isEditMode.value = false
  dialogGameData.value = {}
}

// Utility for creating games
function getNextFriday() {
  const now = new Date()
  const day = now.getDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + daysUntilFriday)
  return nextFriday.toISOString().split('T')[0]
}

// Cron functions
async function loadCronFlag() {
  try {
    const settings = await pb.collection('settings').getFullList()
    const setting = settings.find((s) => s.key === 'frisbee_cron')
    frisbeeCronEnabled.value = !!setting?.value
  } catch (err) {
    console.error('Failed to load cron flag:', err)
    frisbeeCronEnabled.value = false
  }
}

async function toggleCronFlag() {
  try {
    const settings = await pb.collection('settings').getFullList()
    const setting = settings.find((s) => s.key === 'frisbee_cron')
    if (setting) {
      await pb.collection('settings').update(setting.id, {
        value: frisbeeCronEnabled.value,
      })
    } else {
      await pb.collection('settings').create({
        key: 'frisbee_cron',
        value: frisbeeCronEnabled.value,
      })
    }
    Notify.create({
      type: 'positive',
      message: `Frisbee cron ${frisbeeCronEnabled.value ? 'enabled' : 'disabled'}`,
    })
  } catch (err) {
    console.error('Failed to update cron flag:', err)
    Notify.create({ type: 'negative', message: 'Failed to update cron flag' })
    frisbeeCronEnabled.value = !frisbeeCronEnabled.value
  }
}
</script>
