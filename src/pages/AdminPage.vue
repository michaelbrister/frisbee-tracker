<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <q-btn flat label="Back to League Page" color="primary" @click="goToLeague" />
        <q-btn
          icon="league_panel"
          label="League Page"
          color="primary"
          unelevated
          glossy
          @click="goToLeague"
        />
      </div>
    </q-header>

    <q-page-container>
      <q-page padding>
        <h1 class="text-h5">Admin Panel - Manage Games</h1>

        <!-- Create New Game Form -->
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Create New Game</div>

          <q-input v-model="newGame.title" label="Game Title" outlined dense class="q-mb-sm" />
          <q-input v-model="newGame.location" label="Location" outlined dense class="q-mb-sm" />

          <q-date
            v-model="newGame.date"
            label="Game Date (Fridays Only)"
            mask="YYYY-MM-DD"
            :options="fridayOnly"
            outlined
            dense
            class="q-mb-sm"
          />

          <q-time
            v-model="newGame.time"
            label="Game Time"
            :format24h="false"
            :with-seconds="false"
            ampm
            outlined
            dense
            class="q-mb-sm"
          />

          <q-btn color="primary" label="Create Game" @click="createGame" />
        </q-card>

        <!-- Existing Games Table -->
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

        <!-- Edit Game Dialog -->
        <q-dialog v-model="editDialog">
          <q-card class="q-pa-md" style="min-width: 300px">
            <div class="text-subtitle2 q-mb-sm">Edit Game</div>

            <q-input
              v-model="editGameData.title"
              label="Game Title"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-input
              v-model="editGameData.location"
              label="Location"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-date
              v-model="editGameData.date"
              label="Game Date (Fridays Only)"
              mask="YYYY-MM-DD"
              :options="fridayOnly"
              outlined
              dense
              class="q-mb-sm"
            />
            <q-time
              v-model="editGameData.time"
              label="Game Time"
              :format24h="false"
              :with-seconds="false"
              ampm
              outlined
              dense
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

const newGame = ref({
  title: 'Frisbee',
  location: 'Bird Street Park',
  date: getNextFriday(),
  time: '05:30 PM',
})

const editDialog = ref(false)
const editGameData = ref({ id: '', title: '', location: '', date: '', time: '' })

const columns = [
  { name: 'title', label: 'Title', field: 'title', sortable: true },
  { name: 'date', label: 'Date', field: 'date', sortable: true },
  { name: 'location', label: 'Location', field: 'location', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', sortable: false },
]

function sortByDate(a, b) {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

function fridayOnly(date) {
  return new Date(date).getDay() === 5
}

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

function combineDateTimeToUTC(dateStr, timeStr) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd hh:mm a', {
    zone: 'America/New_York',
  })
  if (!dt.isValid) throw new Error('Invalid time value')
  return dt.toUTC().toISO()
}

async function setActiveGame(selectedGame) {
  try {
    // Load all games
    const allGames = await pb.collection('games').getFullList()

    // Update active flags
    const updatePromises = allGames.map((game) =>
      pb.collection('games').update(game.id, {
        active: game.id === selectedGame.id,
      }),
    )

    await Promise.all(updatePromises)

    Notify.create({
      type: 'positive',
      message: `Set "${selectedGame.title}" as active game.`,
    })

    await loadGames()
  } catch (err) {
    console.error('Failed to set active game', err)
    Notify.create({ type: 'negative', message: 'Failed to set active game' })
  }
}

async function loadGames() {
  try {
    games.value = await pb.collection('games').getFullList({ sort: 'date' })
  } catch (err) {
    console.error('Failed to load games', err)
    Notify.create({ type: 'negative', message: 'Failed to load games' })
  }
}

async function createGame() {
  console.log('New game date:', newGame.value.date)

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
      Notify.create({
        type: 'negative',
        message: `A game already exists on ${newGameDateOnly}. Only one game per day allowed.`,
      })
      return
    }

    const utcISO = combineDateTimeToUTC(newGame.value.date, newGame.value.time)

    await pb.collection('games').create({
      title: newGame.value.title,
      location: newGame.value.location,
      date: utcISO,
      date_only: newGameDateOnly, // backend will enforce uniqueness
    })

    Notify.create({ type: 'positive', message: 'Game created!' })

    newGame.value = {
      title: 'Frisbee',
      location: 'Bird Street Park',
      date: getNextFriday(),
      time: '05:30 PM',
    }

    await loadGames()
  } catch (err) {
    console.error('Failed to create game', err)

    const msg =
      err?.response?.data?.date_only?.[0] ||
      err?.response?.message ||
      err.message ||
      'Unknown error'

    Notify.create({
      type: 'negative',
      message: `Failed to create game: ${msg}`,
    })
  }
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
  if (
    !editGameData.value.title ||
    !editGameData.value.location ||
    !editGameData.value.date ||
    !editGameData.value.time
  ) {
    Notify.create({ type: 'negative', message: 'All fields are required' })
    return
  }
  try {
    const utcISO = combineDateTimeToUTC(editGameData.value.date, editGameData.value.time)
    await pb.collection('games').update(editGameData.value.id, {
      title: editGameData.value.title,
      location: editGameData.value.location,
      date: utcISO,
    })
    Notify.create({ type: 'positive', message: 'Game updated!' })
    editDialog.value = false
    await loadGames()
  } catch (err) {
    console.error('Failed to update game', err)
    Notify.create({ type: 'negative', message: 'Failed to update game' })
  }
}

async function deleteGame(game) {
  try {
    await pb.collection('games').delete(game.id)
    Notify.create({ type: 'info', message: 'Game deleted' })
    await loadGames()
  } catch (err) {
    console.error('Failed to delete game', err)
    Notify.create({ type: 'negative', message: 'Failed to delete game' })
  }
}

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToLeague() {
  router.push({ name: 'league' })
}

onMounted(() => {
  loadGames()
})
</script>
