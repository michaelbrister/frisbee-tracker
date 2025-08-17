<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <q-btn
          v-if="isAdmin"
          icon="admin_panel_settings"
          label="Admin Panel"
          color="primary"
          unelevated
          glossy
          @click="goToAdmin"
        />
      </div>
    </q-header>

    <q-page-container>
      <q-page padding>
        <h1 class="text-h5 q-mb-md">Ultimate Frisbee League</h1>

        <div v-for="game in upcomingGames" :key="game.id" class="q-mb-xl">
          <q-card flat bordered class="q-pa-md" v-if="allUsers.length && game?.rsvps">
            <div class="row justify-between items-center q-mb-sm">
              <div>
                <div class="text-subtitle1">{{ game.title }}</div>
                <div class="text-caption">
                  {{ formatToEastern(game.date) }} - {{ game.location }}
                </div>
              </div>
            </div>

            <q-separator />

            <!-- Adults RSVP -->
            <div class="q-mt-md">
              <div class="text-h6">Adults</div>
              <div class="row q-col-gutter-md q-mt-sm">
                <div class="col" v-for="status in ['In', 'Maybe', 'Out', 'Unknown']" :key="status">
                  <div class="text-subtitle2">{{ status }}</div>
                  <q-list bordered>
                    <q-item v-for="user in rsvpList(game, status, 'adult')" :key="user.id">
                      <q-item-section>{{ user.name }}</q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </div>

            <!-- Kids RSVP -->
            <div class="q-mt-md">
              <div class="text-h6">Kids</div>
              <div class="row q-col-gutter-md q-mt-sm">
                <div class="col" v-for="status in ['In', 'Maybe', 'Out', 'Unknown']" :key="status">
                  <div class="text-subtitle2">{{ status }}</div>
                  <q-list bordered>
                    <q-item v-for="user in rsvpList(game, status, 'kid')" :key="user.id">
                      <q-item-section>{{ user.name }}</q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- RSVP buttons for logged-in user and children -->
            <div v-if="pb.authStore.isValid && currentUser" class="q-mt-md">
              <!-- Current user -->
              <div class="row q-gutter-sm q-mb-sm">
                <span class="text-subtitle2">Your RSVP:</span>
                <q-btn
                  v-for="status in ['In', 'Maybe', 'Out']"
                  :key="status"
                  dense
                  flat
                  color="primary"
                  :label="status"
                  @click="setRSVP(game.id, status, currentUser.id)"
                  :disable="getCurrentRSVP(game, currentUser.id) === status"
                />
              </div>

              <!-- Children -->
              <div
                v-for="child in getChildren(currentUser.id)"
                :key="child.id"
                class="row q-gutter-sm q-mt-sm"
              >
                <span class="text-subtitle2">{{ child.name }}'s RSVP:</span>
                <q-btn
                  v-for="status in ['In', 'Maybe', 'Out']"
                  :key="status"
                  dense
                  flat
                  color="secondary"
                  :label="status"
                  @click="setRSVP(game.id, status, child.id)"
                  :disable="getCurrentRSVP(game, child.id) === status"
                />
              </div>
            </div>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import pb from '../services/pocketbase'
import { DateTime } from 'luxon'

const router = useRouter()
const upcomingGames = ref([])
const currentUser = ref(null)
const isAdmin = ref(false)
const allUsers = ref([])

const normalizedUsers = computed(() => {
  if (!allUsers.value?.length) return []

  return allUsers.value.map((user) => ({
    ...user,
    parentId: typeof user.parent === 'string' ? user.parent : user.parent?.id || null,
  }))
})

async function loadUser() {
  currentUser.value = pb.authStore.model
  isAdmin.value = currentUser.value?.isAdmin || false
}

async function loadAllUsers() {
  try {
    console.log('Loading users...')
    allUsers.value = await pb.collection('_pb_users_auth_').getFullList({ sort: 'name' })
  } catch (err) {
    console.error('Error loading users:', err)
    allUsers.value = []
  }
}

async function loadGames() {
  try {
    console.log('Loading games...')
    // const games = await pb.collection('games').getFullList({ sort: 'date' })
    const games = await pb.collection('games').getFullList({
      sort: 'date',
      filter: 'active=true',
    })
    for (const g of games) {
      const attendance = await pb.collection('attendance').getFullList({
        filter: `game='${g.id}'`,
      })
      g.rsvps = attendance || []
    }
    upcomingGames.value = games
  } catch (err) {
    console.error('Error loading upcoming games', err)
    Notify.create({ type: 'negative', message: 'Failed to load games' })
  }
}

function rsvpList(game, status, type = 'adult') {
  if (!normalizedUsers.value?.length || !game?.rsvps) return []

  const list = normalizedUsers.value.map((user) => {
    const attendance = game.rsvps.find((a) => a?.user === user.id)
    return {
      id: user.id,
      name: user.name || user.email || 'Unknown',
      status: attendance?.status || 'Unknown',
      parentId: user.parentId,
    }
  })

  const filtered = list.filter((u) => u.status === status)

  if (type === 'adult') {
    return filtered.filter((u) => !u.parentId).sort((a, b) => a.name.localeCompare(b.name))
  } else {
    return filtered.filter((u) => u.parentId).sort((a, b) => a.name.localeCompare(b.name))
  }
}

function getChildren(userId) {
  if (!userId || !normalizedUsers.value) return []
  return normalizedUsers.value.filter((u) => u.parentId === userId)
}

function getCurrentRSVP(game, userId = null) {
  const targetUser = userId || currentUser.value?.id
  if (!game?.rsvps || !targetUser) return 'Unknown'
  const found = game.rsvps.find((a) => a?.user === targetUser)
  return found?.status || 'Unknown'
}

async function setRSVP(gameId, status, userId) {
  if (!pb.authStore.isValid || !userId) return

  const user = allUsers.value.find((u) => u.id === userId)
  if (!user) return

  if (!['In', 'Maybe', 'Out'].includes(status)) {
    Notify.create({ type: 'negative', message: 'Invalid status' })
    return
  }

  try {
    const result = await pb.collection('attendance').getList(1, 1, {
      filter: `game='${gameId}' && user='${userId}'`,
    })

    if (result.items.length > 0) {
      await pb.collection('attendance').update(result.items[0].id, {
        name: user.name,
        status,
        user: userId,
        game: gameId,
      })
    } else {
      await pb.collection('attendance').create({
        name: user.name,
        status,
        user: userId,
        game: gameId,
      })
    }

    await loadGames()
    Notify.create({
      type: 'positive',
      message: `RSVP set for ${user.name}: ${status}`,
    })
  } catch (err) {
    console.error('Error creating or updating RSVP:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to set RSVP. Check user, game, and status.',
    })
  }
}

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToAdmin() {
  router.push({ name: 'admin' })
}

// Format date/time string to Eastern time with readable format
function formatToEastern(datetimeStr) {
  if (!datetimeStr) return ''
  // Try fromISO first, fallback to fromSQL in case the format differs
  let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
  if (!dt.isValid) {
    dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
  }
  if (!dt.isValid) return 'Invalid DateTime'
  return dt.setZone('America/New_York').toLocaleString(DateTime.DATETIME_MED)
}

onMounted(async () => {
  await loadUser()
  await loadAllUsers()
  await loadGames()
  setInterval(loadGames, 30000)
})
</script>
