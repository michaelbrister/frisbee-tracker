<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <ThemeToggle class="q-mr-sm" />
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

          <!-- Loading skeletons -->
          <div v-if="loading">
            <q-skeleton type="text" class="q-mb-sm" style="width: 220px; height: 28px" />
            <q-skeleton type="rect" height="150px" class="q-mt-md" />
            <q-skeleton type="rect" height="150px" class="q-mt-md" />
          </div>

          <template v-else>
            <q-banner v-if="rsvpPaused" class="q-mb-md bg-warning text-black" rounded inline-actions>
              <div class="row items-center">
                <q-icon name="info" class="q-mr-sm" />
                <div class="text-body1">{{ pauseMessageToShow }}</div>
              </div>
            </q-banner>

            <q-banner v-else-if="!processedGame" class="bg-grey-3 q-pa-md q-mb-md" rounded>
              No active game is currently scheduled.
            </q-banner>

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

            <q-card v-else flat bordered class="q-pa-md q-mt-md">
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
                  <div v-if="comingNames.length" class="text-caption q-mt-xs">
                    Coming: {{ comingNames.join(', ') }}
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div v-if="pb.authStore.isValid && currentUser" class="q-mt-md">
                <!-- RSVP Section (hidden when cancelled) -->
                <div v-if="!processedGame.cancelled" class="q-mt-md">
                  <div class="text-subtitle2 q-mb-xs">Your RSVP:</div>
                  <!-- Mobile: compact toggle -->
                  <q-btn-toggle
                    v-if="$q.screen.lt.md"
                    v-model="myRsvp"
                    :options="[
                      { label: 'In', value: 'In' },
                      { label: 'Maybe', value: 'Maybe' },
                      { label: 'Out', value: 'Out' },
                    ]"
                    spread
                    unelevated
                    toggle-color="primary"
                    aria-label="Your RSVP selector"
                    class="q-mb-sm"
                  />
                  <!-- Desktop: keep three buttons -->
                  <div v-else class="row q-col-gutter-sm q-mb-sm">
                    <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                      <q-btn
                        :label="status"
                        unelevated
                        class="full-width"
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
                        aria-label="Set your RSVP to {{ status }}"
                        @click="setRSVP(processedGame.id, status, currentUser.id)"
                      />
                    </div>
                  </div>

                  <div v-for="child in getChildren(currentUser.id)" :key="child.id" class="q-mt-sm">
                    <div class="text-subtitle2 q-mb-xs">{{ displayName(child) }}'s RSVP:</div>
                    <div class="row q-col-gutter-sm q-mb-sm">
                      <div v-for="status in RSVP_STATUSES" :key="status" class="col">
                        <q-btn
                          :label="status"
                          unelevated
                          class="full-width"
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
                <RsvpList
                  title="Adults"
                  icon="person"
                  :users="processedGame.rsvpsByStatus.adult"
                  :show-actions="isAdmin"
                  :on-send-sign-in-link="sendSignInLinkForUser"
                  :on-send-reset-email="sendResetEmailForUser"
                />
                <RsvpList
                  title="Kids"
                  icon="child_care"
                  :users="processedGame.rsvpsByStatus.kid"
                  :show-actions="isAdmin"
                  :on-send-sign-in-link="sendSignInLinkForUser"
                  :on-send-reset-email="sendResetEmailForUser"
                />
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
import RsvpList from 'src/components/RsvpList.vue'
import ThemeToggle from 'src/components/ThemeToggle.vue'
import { RSVP_STATUSES, RSVP_STATUSES_WITH_UNKNOWN } from 'src/constants/app'
import { formatDateTimeInTimezone } from 'src/utils/dates'
import { getPauseMessage, getRsvpPaused } from 'src/services/settingsService'

const router = useRouter()

const activeGame = ref(null) // single game
const currentUser = ref(null)
const isAdmin = ref(false)
const allUsers = ref([])
const guardianships = ref([])
const loading = ref(true)
const rsvpPaused = ref(false)
const pauseMessage = ref('')

const myRsvp = computed({
  get() {
    return getCurrentRSVP(processedGame.value, currentUser.value?.id)
  },
  set(val) {
    if (processedGame.value && currentUser.value)
      setRSVP(processedGame.value.id, val, currentUser.value.id)
  },
})

/* ---------- derived, safe object for template ---------- */
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
    const type = isKidUser(user.id) ? 'kid' : 'adult'
    rsvps[type][rsvp.status]?.push(user)
  })

  allUsers.value.forEach((user) => {
    if (!rsvpUserIds.has(user.id)) {
      const type = isKidUser(user.id) ? 'kid' : 'adult'
      rsvps[type].Unknown.push(user)
    }
  })

  for (const type of ['adult', 'kid']) {
    for (const status of RSVP_STATUSES_WITH_UNKNOWN) {
      rsvps[type][status].sort((a, b) => displayName(a).localeCompare(displayName(b)))
    }
  }

  return { ...safeGame, rsvpsByStatus: rsvps }
})

/* ---------- loads ---------- */
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

const loadGuardianships = async () => {
  try {
    guardianships.value = await pb.collection('guardianships').getFullList()
  } catch (err) {
    // Collection may not exist yet in older local DBs.
    if (err?.status === 404) {
      guardianships.value = []
      return
    }
    console.error('Error loading guardianships:', err)
    guardianships.value = []
  }
}

const loadSeasonSettings = async () => {
  try {
    const [pauseFlag, message] = await Promise.allSettled([getRsvpPaused(), getPauseMessage()])
    rsvpPaused.value = pauseFlag.status === 'fulfilled' ? !!pauseFlag.value : false
    pauseMessage.value =
      message.status === 'fulfilled' ? String(message.value || '').trim() : ''
  } catch (err) {
    console.error('Error loading RSVP pause settings:', err)
    rsvpPaused.value = false
    pauseMessage.value = ''
  }
}

const ACTIVE_GAME_CANCEL_KEY = 'active-game'

const loadActiveGame = async () => {
  try {
    const game = await pb.collection('games').getFirstListItem('active = true', {
      sort: '-date',
      $cancelKey: ACTIVE_GAME_CANCEL_KEY, // latest wins
    })

    const rsvps = await pb.collection('attendance').getFullList({
      filter: `game='${game.id}'`,
      $cancelKey: ACTIVE_GAME_CANCEL_KEY, // same key
    })

    game.rsvps = rsvps
    activeGame.value = game
    subscribeAttendanceFor(game.id)
  } catch (err) {
    if (err?.status === 404) {
      activeGame.value = null
      return
    }
    // swallow benign autocancel noise
    if (err?.name === 'AbortError' || /autocancelled/i.test(err?.message)) return

    console.error('Error loading active game', err)
    Notify.create({ type: 'negative', message: 'Failed to load the active game' })
  }
}

/* ---------- refresh orchestration ---------- */
const refreshData = async (done) => {
  loading.value = true
  await Promise.all([loadUser(), loadAllUsers(), loadGuardianships(), loadActiveGame(), loadSeasonSettings()])
  loading.value = false
  done?.()
}

// tiny debounce so back-to-back triggers collapse into one load
let refreshTimer
function requestActiveGameRefresh(ms = 120) {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => loadActiveGame(), ms)
}

/* ---------- RSVP helpers ---------- */
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
  if (!canManageUser(userId)) {
    Notify.create({ type: 'warning', message: 'You can only RSVP for yourself or linked children.' })
    return
  }
  const user = allUsers.value.find((u) => u.id === userId)
  if (!user || !RSVP_STATUSES.includes(status)) return

  // --- optimistic update ---
  const prev = Array.isArray(activeGame.value?.rsvps) ? activeGame.value.rsvps.slice() : []
  const next = prev.slice()
  const idx = next.findIndex((r) => r.user === userId)
  if (idx > -1) next[idx] = { ...next[idx], status }
  else next.push({ user: userId, status })
  activeGame.value = { ...activeGame.value, rsvps: next }

  try {
    const existing = await pb
      .collection('attendance')
      .getFirstListItem(`game='${gameId}' && user='${userId}'`)
      .catch(() => null)

    if (existing) {
      await pb.collection('attendance').update(existing.id, { status }, { $autoCancel: false })
    } else {
      await pb
        .collection('attendance')
        .create({ name: displayName(user), status, user: userId, game: gameId }, { $autoCancel: false })
    }

    Notify.create({ type: 'positive', message: `RSVP set for ${displayName(user)}: ${status}` })
    requestActiveGameRefresh(250)
  } catch (err) {
    // revert on failure
    activeGame.value = { ...activeGame.value, rsvps: prev }
    console.error('Error setting RSVP:', err)
    Notify.create({ type: 'negative', message: 'Failed to set RSVP.' })
  }
}

const childIdsByGuardian = computed(() => {
  const map = new Map()

  for (const link of guardianships.value) {
    const guardianId = link?.guardian
    const childId = link?.child
    if (!guardianId || !childId) continue
    const existing = map.get(guardianId) ?? new Set()
    existing.add(childId)
    map.set(guardianId, existing)
  }

  return map
})

const kidUserIds = computed(() => {
  const childIds = new Set()
  for (const childSet of childIdsByGuardian.value.values()) {
    for (const childId of childSet) childIds.add(childId)
  }
  return childIds
})

const managedUserIds = computed(() => {
  const ids = new Set()
  const me = currentUser.value?.id
  if (!me) return ids
  ids.add(me)

  const childSet = childIdsByGuardian.value.get(me)
  if (childSet) {
    for (const childId of childSet) ids.add(childId)
  }
  return ids
})

const canManageUser = (userId) => {
  if (!userId) return false
  return managedUserIds.value.has(userId)
}

const isKidUser = (userId) => {
  if (!userId) return false
  return kidUserIds.value.has(userId)
}

const getChildren = (userId) => {
  if (!userId || !allUsers.value.length) return []
  const childIds = childIdsByGuardian.value.get(userId)
  if (!childIds?.size) return []

  return allUsers.value
    .filter((u) => childIds.has(u.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)))
}

const displayName = (user) => {
  if (!user) return ''
  if (user.display_name) return user.display_name
  const first = (user.first_name || '').trim()
  const last = (user.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full
  return user.name || user.email || user.id || ''
}

const comingNames = computed(() => {
  const game = processedGame.value
  if (!game?.rsvpsByStatus) return []

  return [...game.rsvpsByStatus.adult.In, ...game.rsvpsByStatus.kid.In]
    .map((u) => displayName(u))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
})

const pauseMessageToShow = computed(() => {
  return pauseMessage.value || 'RSVPs are paused right now. Please check back later.'
})

const sendSignInLinkForUser = async (user) => {
  if (!isAdmin.value) return
  if (!user?.email) {
    Notify.create({ type: 'warning', message: 'This account has no email address.' })
    return
  }
  try {
    await pb.send('/api/collections/users/request-otp', {
      method: 'POST',
      body: { email: user.email },
      $autoCancel: false,
    })
    Notify.create({ type: 'positive', message: `Sign-in link sent to ${user.email}.` })
  } catch (err) {
    console.error('Failed to send sign-in link', err)
    Notify.create({ type: 'negative', message: 'Failed to send sign-in link.' })
  }
}

const sendResetEmailForUser = async (user) => {
  if (!isAdmin.value) return
  if (!user?.email) {
    Notify.create({ type: 'warning', message: 'This account has no email address.' })
    return
  }
  try {
    await pb.collection('users').requestPasswordReset(user.email)
    Notify.create({ type: 'positive', message: `Password reset email sent to ${user.email}.` })
  } catch (err) {
    console.error('Failed to send reset email', err)
    Notify.create({ type: 'negative', message: 'Failed to send password reset email.' })
  }
}

/* ---------- nav / utils ---------- */
const logout = () => {
  pb.authStore.clear()
  router.push({ name: 'login' })
}
const goToAdmin = () => {
  router.push({ name: 'admin' })
}

const formatToEastern = (datetimeStr) => {
  return formatDateTimeInTimezone(datetimeStr)
}

/* ---------- realtime ---------- */
let unsubscribeAttendance = null

function subscribeAttendanceFor(gameId) {
  if (unsubscribeAttendance) {
    try {
      unsubscribeAttendance()
    } catch {
      console.error('Failed to unsubscribe from attendance')
    }
    unsubscribeAttendance = null
  }
  unsubscribeAttendance = pb
    .collection('attendance')
    .subscribe(`game="${gameId}"`, () => requestActiveGameRefresh())
}

onMounted(async () => {
  await refreshData()
})

onUnmounted(() => {
  if (unsubscribeAttendance) {
    try {
      unsubscribeAttendance()
    } catch {
      console.error('Failed to unsubscribe from attendance')
    }
    unsubscribeAttendance = null
  }
})
</script>
