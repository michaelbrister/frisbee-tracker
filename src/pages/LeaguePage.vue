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
            <q-skeleton type="text" class="q-mb-sm" style="width: 220px; height: 28px" />
            <q-skeleton type="rect" height="150px" class="q-mt-md" />
            <q-skeleton type="rect" height="150px" class="q-mt-md" />
          </div>

          <template v-else>
            <!-- No active game -->
            <q-banner v-if="!processedGame" class="bg-grey-3 q-pa-md q-mb-md" rounded>
              No active game is currently scheduled.
            </q-banner>

            <!-- Cancelled notice -->
            <q-banner
              v-else-if="processedGame.cancelled"
              class="q-mt-sm q-mb-md bg-negative text-white"
              dense
              rounded
              inline-actions
            >
              <div class="row items-center">
                <q-icon name="event_busy" class="q-mr-sm" />
                <div>
                  <div class="text-subtitle2">This game has been cancelled</div>
                  <div v-if="processedGame.cancel_reason" class="text-body2">
                    Reason: {{ processedGame.cancel_reason }}
                  </div>
                </div>
              </div>
            </q-banner>

            <!-- Active game card -->
            <q-card v-if="processedGame" flat bordered class="q-pa-md q-mt-md">
              <div class="row justify-between items-center q-mb-sm">
                <div>
                  <div class="text-subtitle1">
                    {{ processedGame.title }}
                    <span class="text-caption text-grey-7 q-ml-sm">
                      ({{ totalRSVPCount(processedGame) }} players)
                    </span>
                  </div>
                  <div class="text-caption">
                    {{ formatToEastern(processedGame.date) }} - {{ processedGame.location }}
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div v-if="pb.authStore.isValid && currentUser" class="q-mt-md">
                <!-- RSVP Section (only if game is not cancelled) -->
                <div
                  v-if="!processedGame.cancelled && pb.authStore.isValid && currentUser"
                  class="q-mt-md"
                >
                  <div class="text-subtitle2 q-mb-xs">Your RSVP:</div>
                  <div class="row q-col-gutter-sm q-mb-sm">
                    <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                      <q-btn
                        :label="status"
                        unelevated
                        class="full-width"
                        :disable="processedGame.cancelled"
                        :color="
                          getCurrentRSVP(processedGame, currentUser.id) === status
                            ? 'primary'
                            : 'grey-5'
                        "
                        :text-color="
                          getCurrentRSVP(processedGame, currentUser.id) === status
                            ? 'white'
                            : 'black'
                        "
                        @click="setRSVP(processedGame.id, status, currentUser.id)"
                      />
                    </div>
                  </div>

                  <div v-for="child in getChildren(currentUser.id)" :key="child.id" class="q-mt-sm">
                    <div class="text-subtitle2 q-mb-xs">{{ child.name }}'s RSVP:</div>
                    <div class="row q-col-gutter-sm q-mb-sm">
                      <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                        <q-btn
                          :label="status"
                          unelevated
                          class="full-width"
                          :disable="processedGame.cancelled"
                          :color="
                            getCurrentRSVP(processedGame, child.id) === status
                              ? 'secondary'
                              : 'grey-5'
                          "
                          :text-color="
                            getCurrentRSVP(processedGame, child.id) === status ? 'white' : 'black'
                          "
                          @click="setRSVP(processedGame.id, status, child.id)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <q-separator />

              <div
                v-if="!processedGame.cancelled && pb.authStore.isValid && currentUser"
                class="q-mt-md"
              >
                <RsvpList title="Adults" icon="person" :users="processedGame.rsvpsByStatus.adult" />
                <RsvpList title="Kids" icon="child_care" :users="processedGame.rsvpsByStatus.kid" />
              </div>
            </q-card>
          </template>
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
import RsvpList from 'src/components/RsvpList.vue'

const router = useRouter()

// Single game, not an array
const activeGame = ref(null)
const currentUser = ref(null)
const isAdmin = ref(false)
const allUsers = ref([])
const loading = ref(true)

const RSVP_STATUSES = ['In', 'Maybe', 'Out']
const RSVP_STATUSES_WITH_UNKNOWN = ['In', 'Maybe', 'Out', 'Unknown']

// --- derived, safe object for template ---
const processedGame = computed(() => {
  const g = activeGame.value
  if (!g || !Array.isArray(allUsers.value)) return null

  const usersById = new Map(allUsers.value.map((u) => [u.id, u]))
  const safeGame = {
    ...g,
    cancelled: !!g.cancelled,
    cancel_reason: g.cancel_reason || '',
    rsvps: Array.isArray(g.rsvps) ? g.rsvps : [],
  }

  const rsvps = {
    adult: { In: [], Maybe: [], Out: [], Unknown: [] },
    kid: { In: [], Maybe: [], Out: [], Unknown: [] },
  }

  const rsvpUserIds = new Set(safeGame.rsvps.map((r) => r.user))

  safeGame.rsvps.forEach((rsvp) => {
    const user = usersById.get(rsvp.user)
    if (!user) return
    const type = user.parent ? 'kid' : 'adult'
    rsvps[type][rsvp.status]?.push(user)
  })

  allUsers.value.forEach((user) => {
    if (!rsvpUserIds.has(user.id)) {
      const type = user.parent ? 'kid' : 'adult'
      rsvps[type].Unknown.push(user)
    }
  })

  for (const type of ['adult', 'kid']) {
    for (const status of RSVP_STATUSES_WITH_UNKNOWN) {
      rsvps[type][status].sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  return { ...safeGame, rsvpsByStatus: rsvps }
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

const loadActiveGame = async () => {
  try {
    // get the single active game (newest first if multiple marked active)
    const game = await pb.collection('games').getFirstListItem('active = true', {
      sort: '-date',
    })

    // attach its RSVPs
    const rsvps = await pb.collection('attendance').getFullList({
      filter: `game='${game.id}'`,
    })
    game.rsvps = rsvps

    activeGame.value = game
  } catch (err) {
    // If no active game (404), clear it gracefully
    if (err?.status === 404) {
      activeGame.value = null
      return
    }
    console.error('Error loading active game', err)
    Notify.create({ type: 'negative', message: 'Failed to load the active game' })
  }
}

const refreshData = async (done) => {
  loading.value = true
  await Promise.all([loadUser(), loadAllUsers(), loadActiveGame()])
  loading.value = false
  done?.()
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
    const existing = await pb
      .collection('attendance')
      .getFirstListItem(`game='${gameId}' && user='${userId}'`)
      .catch(() => null)

    if (existing) {
      await pb.collection('attendance').update(existing.id, { status })
    } else {
      await pb.collection('attendance').create({
        name: user.name,
        status,
        user: userId,
        game: gameId,
      })
    }

    Notify.create({ type: 'positive', message: `RSVP set for ${user.name}: ${status}` })
    // Refresh just this game’s RSVPs
    await loadActiveGame()
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
  // PocketBase stores ISO (try ISO first), fallback to SQL if needed
  let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
  return dt.isValid ? dt.setZone('America/New_York').toLocaleString(DateTime.DATETIME_MED) : ''
}

const handleRsvpChange = () => {
  // If you rely on realtime attendance changes elsewhere:
  loadActiveGame()
}

onMounted(async () => {
  await refreshData()
  // Optional: if you want live updates when attendance changes elsewhere
  pb.collection('attendance').subscribe('*', handleRsvpChange)
})

onUnmounted(() => {
  pb.collection('attendance').unsubscribe()
})
</script>
