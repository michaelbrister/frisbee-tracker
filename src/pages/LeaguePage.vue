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
        <q-pull-to-refresh @refresh="refreshData" :disable="loading">
          <h1 class="text-h5 q-mb-md">Ultimate Frisbee League</h1>

          <div v-if="loading">
            <q-skeleton type="heading" />
            <q-skeleton height="150px" class="q-mt-md" />
            <q-skeleton height="150px" class="q-mt-md" />
          </div>

          <div v-else>
            <div v-for="game in processedGames" :key="game.id" class="q-mb-xl">
              <q-card flat bordered class="q-pa-md">
                <div class="row justify-between items-center q-mb-sm">
                  <div>
                    <div class="text-subtitle1">
                      {{ game.title }}
                      <span class="text-caption text-grey-7 q-ml-sm">
                        ({{ totalRSVPCount(game) }} players)
                      </span>
                    </div>
                    <div class="text-caption">
                      {{ formatToEastern(game.date) }} - {{ game.location }}
                    </div>
                  </div>
                </div>
                <q-separator class="q-my-md" />

                <div v-if="pb.authStore.isValid && currentUser" class="q-mt-md">
                  <div class="q-mt-md">
                    <div class="text-subtitle2 q-mb-xs">Your RSVP:</div>
                    <div class="row q-col-gutter-sm q-mb-sm">
                      <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                        <q-btn
                          :label="status"
                          unelevated
                          class="full-width"
                          :color="
                            getCurrentRSVP(game, currentUser.id) === status ? 'primary' : 'grey-5'
                          "
                          :text-color="
                            getCurrentRSVP(game, currentUser.id) === status ? 'white' : 'black'
                          "
                          @click="setRSVP(game.id, status, currentUser.id)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-for="child in getChildren(currentUser.id)" :key="child.id" class="q-mt-sm">
                    <div class="text-subtitle2 q-mb-xs">{{ child.name }}'s RSVP:</div>
                    <div class="row q-col-gutter-sm q-mb-sm">
                      <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                        <q-btn
                          :label="status"
                          unelevated
                          :color="
                            getCurrentRSVP(game, child.id) === status ? 'secondary' : 'grey-5'
                          "
                          :text-color="
                            getCurrentRSVP(game, child.id) === status ? 'white' : 'black'
                          "
                          class="full-width"
                          @click="setRSVP(game.id, status, child.id)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <q-separator />

                <RsvpList title="Adults" icon="person" :users="game.rsvpsByStatus.adult" />

                <RsvpList title="Kids" icon="child_care" :users="game.rsvpsByStatus.kid" />
              </q-card>
            </div>
          </div>
        </q-pull-to-refresh>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import pb from '../services/pocketbase'
import { DateTime } from 'luxon'
import RsvpList from 'src/components/RsvpList.vue' // <-- Import the new component

const router = useRouter()
const upcomingGames = ref([])
const currentUser = ref(null)
const isAdmin = ref(false)
const allUsers = ref([])
const loading = ref(true)

const RSVP_STATUSES = ['In', 'Maybe', 'Out']
const RSVP_STATUSES_WITH_UNKNOWN = ['In', 'Maybe', 'Out', 'Unknown']

// --- NEW: Computed property for high-performance data processing ---
const processedGames = computed(() => {
  if (!upcomingGames.value.length || !allUsers.value.length) return []

  const usersById = new Map(allUsers.value.map((user) => [user.id, user]))

  return upcomingGames.value.map((game) => {
    const rsvps = {
      adult: { In: [], Maybe: [], Out: [], Unknown: [] },
      kid: { In: [], Maybe: [], Out: [], Unknown: [] },
    }

    const rsvpUserIds = new Set(game.rsvps.map((r) => r.user))

    game.rsvps.forEach((rsvp) => {
      const user = usersById.get(rsvp.user)
      if (!user) return
      const type = user.parent ? 'kid' : 'adult'
      rsvps[type][rsvp.status].push(user)
    })

    allUsers.value.forEach((user) => {
      if (!rsvpUserIds.has(user.id)) {
        const type = user.parent ? 'kid' : 'adult'
        rsvps[type]['Unknown'].push(user)
      }
    })

    for (const type of ['adult', 'kid']) {
      for (const status of RSVP_STATUSES_WITH_UNKNOWN) {
        rsvps[type][status].sort((a, b) => a.name.localeCompare(b.name))
      }
    }

    return {
      ...game,
      rsvpsByStatus: rsvps,
    }
  })
})

const loadUser = async () => {
  currentUser.value = pb.authStore.model
  isAdmin.value = currentUser.value?.isAdmin || false
}

const loadAllUsers = async () => {
  try {
    allUsers.value = await pb.collection('_pb_users_auth_').getFullList({ sort: 'name' })
  } catch (err) {
    console.error('Error loading users:', err)
    allUsers.value = []
  }
}

// --- NEW: Optimized loadGames function ---
const loadGames = async () => {
  try {
    // No need to set loading.value = true here if refreshData handles it
    const games = await pb.collection('games').getFullList({
      sort: 'date',
      filter: 'active=true',
    })

    const gameIds = games.map((g) => g.id)
    if (gameIds.length === 0) {
      upcomingGames.value = []
      return
    }

    const filter = gameIds.map((id) => `game='${id}'`).join('||')
    const allRsvps = await pb.collection('attendance').getFullList({ filter })

    games.forEach((game) => {
      game.rsvps = allRsvps.filter((rsvp) => rsvp.game === game.id)
    })

    upcomingGames.value = games
  } catch (err) {
    console.error('Error loading upcoming games', err)
    Notify.create({ type: 'negative', message: 'Failed to load games' })
  }
}

const refreshData = async (done) => {
  loading.value = true
  await Promise.all([loadUser(), loadAllUsers(), loadGames()])
  loading.value = false
  if (done) {
    done()
  }
}

const totalRSVPCount = (game) => {
  if (!game?.rsvps) return 0
  return game.rsvps.filter((r) => r.status === 'In').length
}

const getCurrentRSVP = (game, userId = null) => {
  const targetUser = userId || currentUser.value?.id
  if (!game?.rsvps || !targetUser) return 'Unknown'
  const found = game.rsvps.find((a) => a?.user === targetUser)
  return found?.status || 'Unknown'
}

const setRSVP = async (gameId, status, userId) => {
  if (!pb.authStore.isValid || !userId) return
  const user = allUsers.value.find((u) => u.id === userId)
  if (!user || !RSVP_STATUSES.includes(status)) return

  try {
    const existingRsvp = await pb
      .collection('attendance')
      .getFirstListItem(`game='${gameId}' && user='${userId}'`)
      .catch(() => null)

    if (existingRsvp) {
      await pb.collection('attendance').update(existingRsvp.id, { status })
    } else {
      await pb.collection('attendance').create({
        name: user.name,
        status,
        user: userId,
        game: gameId,
      })
    }
    // No need to manually reload; real-time subscription will handle it.
    Notify.create({
      type: 'positive',
      message: `RSVP set for ${user.name}: ${status}`,
    })
  } catch (err) {
    console.error('Error setting RSVP:', err)
    Notify.create({ type: 'negative', message: 'Failed to set RSVP.' })
  }
}

const getChildren = (userId) => {
  if (!userId || !allUsers.value.length) return []
  return allUsers.value.filter((u) => u.parent === userId)
}

const logout = () => {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

const goToAdmin = () => {
  router.push({ name: 'admin' })
}

const formatToEastern = (datetimeStr) => {
  if (!datetimeStr) return ''
  return DateTime.fromISO(datetimeStr)
    .setZone('America/New_York')
    .toLocaleString(DateTime.DATETIME_MED)
}

// --- NEW: Real-time subscriptions and lifecycle hooks ---
const handleRsvpChange = () => {
  // Simply reload the game data when any RSVP changes
  loadGames()
}

onMounted(async () => {
  await refreshData() // Initial data load
  // Subscribe to real-time changes
  pb.collection('attendance').subscribe('*', handleRsvpChange)
})

onUnmounted(() => {
  // Unsubscribe when the component is destroyed to prevent memory leaks
  pb.collection('attendance').unsubscribe()
})
</script>

<style>
.rsvp-status-container {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}
.rsvp-status-column {
  flex: 0 0 120px;
  min-width: 100px;
}
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
