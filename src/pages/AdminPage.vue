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
        <div style="overflow-x: auto">
          <q-table
            :rows="games"
            :columns="columns"
            row-key="id"
            flat
            bordered
            dense
            :sort-method="sortByDate"
          >
            <template v-slot:body="props">
              <q-tr :props="props">
                <q-td key="title">{{ props.row.title }}</q-td>
                <q-td key="date">{{ formatToEastern(props.row.date) }}</q-td>
                <q-td key="location">{{ props.row.location }}</q-td>
                <q-td key="actions">
                  <q-btn dense flat icon="edit" color="primary" @click="editGame(props.row)" />
                  <q-btn dense flat icon="delete" color="negative" @click="deleteGame(props.row)" />
                  <q-btn
                    v-if="!props.row.active"
                    dense
                    flat
                    label="Set Active"
                    color="secondary"
                    @click="setActiveGame(props.row)"
                  />
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </div>

        <!-- Create Game FAB -->
        <q-fab
          color="primary"
          icon="add"
          label="New Game"
          label-position="left"
          direction="up"
          class="fixed-bottom-right q-mr-md q-mb-md"
          @click="createDialog = true"
        />

        <!-- Create Game Dialog -->
        <q-dialog
          v-model="createDialog"
          full-width
          full-height
          persistent
          transition-show="jump-up"
          transition-hide="jump-down"
        >
          <q-card class="q-pa-md">
            <q-bar>
              <div class="text-h6">Create New Game</div>
              <q-space />
              <q-btn dense flat icon="close" v-close-popup />
            </q-bar>

            <q-input v-model="newGame.title" label="Game Title" outlined class="q-mb-sm" />
            <q-input v-model="newGame.location" label="Location" outlined class="q-mb-sm" />
            <q-date
              v-model="newGame.date"
              label="Game Date (Fridays Only)"
              mask="YYYY-MM-DD"
              :options="fridayOnly"
              outlined
              class="q-mb-sm"
            />
            <q-time
              v-model="newGame.time"
              label="Game Time"
              :format24h="false"
              :with-seconds="false"
              ampm
              outlined
              class="q-mb-sm"
            />

            <div class="row justify-end q-mt-md">
              <q-btn flat label="Cancel" color="grey" v-close-popup />
              <q-btn flat label="Create" color="primary" @click="handleCreateGame" />
            </div>
          </q-card>
        </q-dialog>

        <!-- Edit Game Dialog -->
        <q-dialog v-model="editDialog" persistent full-width full-height>
          <q-card class="q-pa-md">
            <q-bar>
              <div class="text-h6">Edit Game</div>
              <q-space />
              <q-btn dense flat icon="close" v-close-popup />
            </q-bar>

            <q-input v-model="editGameData.title" label="Game Title" outlined class="q-mb-sm" />
            <q-input v-model="editGameData.location" label="Location" outlined class="q-mb-sm" />
            <q-date
              v-model="editGameData.date"
              label="Game Date (Fridays Only)"
              mask="YYYY-MM-DD"
              :options="fridayOnly"
              outlined
              class="q-mb-sm"
            />
            <q-time
              v-model="editGameData.time"
              label="Game Time"
              :format24h="false"
              :with-seconds="false"
              ampm
              outlined
              class="q-mb-sm"
            />

            <div class="row justify-end q-mt-md">
              <q-btn flat label="Cancel" color="grey" v-close-popup />
              <q-btn flat label="Save" color="primary" @click="saveEdit" />
            </div>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import pb from '../services/pocketbase'
import { DateTime } from 'luxon'

const router = useRouter()
const games = ref([])
const frisbeeCronEnabled = ref(false)
const createDialog = ref(false)
const editDialog = ref(false)

const newGame = ref({
  title: 'Frisbee',
  location: 'Bird Street Park',
  date: getNextFriday(),
  time: '05:30 PM',
})

const editGameData = ref({ id: '', title: '', location: '', date: '', time: '' })

const columns = [
  { name: 'title', label: 'Title', field: 'title', sortable: true },
  { name: 'date', label: 'Date', field: 'date', sortable: true },
  { name: 'location', label: 'Location', field: 'location', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', sortable: false },
]

onMounted(() => {
  loadGames()
  loadCronFlag()
})

function formatToEastern(datetimeStr) {
  if (!datetimeStr) return ''
  return DateTime.fromSQL(datetimeStr, { zone: 'utc' })
    .setZone('America/New_York')
    .toLocaleString(DateTime.DATETIME_MED)
}

function getNextFriday() {
  const now = new Date()
  const day = now.getDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + daysUntilFriday)
  return nextFriday.toISOString().split('T')[0]
}

function fridayOnly(date) {
  return new Date(date).getDay() === 5
}

function combineDateTimeToUTC(dateStr, timeStr) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd hh:mm a', {
    zone: 'America/New_York',
  })
  if (!dt.isValid) throw new Error('Invalid time value')
  return dt.toUTC().toISO()
}

async function loadGames() {
  try {
    games.value = await pb.collection('games').getFullList({ sort: 'date' })
  } catch (err) {
    console.error('Failed to load games', err)
    Notify.create({ type: 'negative', message: 'Failed to load games' })
  }
}

async function loadCronFlag() {
  try {
    const settings = await pb.collection('settings').getFullList()
    const setting = settings.find((s) => s.key === 'frisbee_cron')
    frisbeeCronEnabled.value = !!setting?.value
  } catch {
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
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to update cron flag' })
    frisbeeCronEnabled.value = !frisbeeCronEnabled.value
  }
}

function sortByDate(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

function editGame(game) {
  const dt = DateTime.fromSQL(game.date, { zone: 'utc' }).setZone('America/New_York')
  editGameData.value = {
    id: game.id,
    title: game.title,
    location: game.location,
    date: dt.toISODate(),
    time: dt.toFormat('hh:mm a'),
  }
  editDialog.value = true
}

async function saveEdit() {
  try {
    const utcISO = combineDateTimeToUTC(editGameData.value.date, editGameData.value.time)
    await pb.collection('games').update(editGameData.value.id, {
      title: editGameData.value.title,
      location: editGameData.value.location,
      date: utcISO,
    })
    editDialog.value = false
    await loadGames()
    Notify.create({ type: 'positive', message: 'Game updated!' })
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to update game' })
  }
}

async function deleteGame(game) {
  try {
    await pb.collection('games').delete(game.id)
    await loadGames()
    Notify.create({ type: 'info', message: 'Game deleted' })
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to delete game' })
  }
}

async function setActiveGame(selectedGame) {
  try {
    const allGames = await pb.collection('games').getFullList()
    const updatePromises = allGames.map((game) =>
      pb.collection('games').update(game.id, {
        active: game.id === selectedGame.id,
      }),
    )
    await Promise.all(updatePromises)
    Notify.create({ type: 'positive', message: `Set "${selectedGame.title}" as active game.` })
    await loadGames()
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to set active game' })
  }
}

function handleCreateGame() {
  createGame().then(() => {
    createDialog.value = false
  })
}

async function createGame() {
  if (
    !newGame.value.title ||
    !newGame.value.location ||
    !newGame.value.date ||
    !newGame.value.time
  ) {
    Notify.create({ type: 'negative', message: 'All fields are required' })
    return
  }
  const newGameDateOnly = newGame.value.date
  try {
    const allGames = await pb.collection('games').getFullList()
    const conflict = allGames.some((game) => {
      if (!game.date) return false
      const existingDate = new Date(game.date).toISOString().split('T')[0]
      return existingDate === newGameDateOnly
    })
    if (conflict) {
      Notify.create({ type: 'negative', message: `A game already exists on ${newGameDateOnly}` })
      return
    }
    const utcISO = combineDateTimeToUTC(newGame.value.date, newGame.value.time)
    await pb.collection('games').create({
      title: newGame.value.title,
      location: newGame.value.location,
      date: utcISO,
      date_only: newGameDateOnly,
    })
    newGame.value = {
      title: 'Frisbee',
      location: 'Bird Street Park',
      date: getNextFriday(),
      time: '05:30 PM',
    }
    await loadGames()
    Notify.create({ type: 'positive', message: 'Game created!' })
  } catch (err) {
    const msg =
      err?.response?.data?.date_only?.[0] ||
      err?.response?.message ||
      err.message ||
      'Unknown error'
    Notify.create({ type: 'negative', message: `Failed to create game: ${msg}` })
  }
}

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToLeague() {
  router.push({ name: 'league' })
}
</script>
