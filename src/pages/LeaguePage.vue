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
            <div v-for="game in upcomingGames" :key="game.id" class="q-mb-xl">
              <q-card flat bordered class="q-pa-md" v-if="allUsers.length && game?.rsvps">
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

                <!-- RSVP buttons for logged-in user and children -->
                <div v-if="pb.authStore.isValid && currentUser" class="q-mt-md">
                  <!-- Current user RSVP -->
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

                  <!-- Children RSVP -->
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

                <!-- Adults RSVP Collapsible -->
                <q-expansion-item
                  icon="person"
                  label="Adults"
                  class="q-mb-md"
                  :header-class="'text-h6'"
                  dense
                  expand-separator
                >
                  <!-- Adults header -->
                  <template #header>
                    <div class="column" style="width: 100%">
                      <div>Adults</div>
                      <div class="row q-mt-xs">
                        <q-chip
                          v-for="status in RSVP_STATUSES_WITH_UNKNOWN"
                          :key="status"
                          :color="statusColor(status)"
                          text-color="white"
                          dense
                          class="q-ml-sm"
                          :label="`${rsvpList(game, status, 'adult').length} ${status}`"
                        />
                      </div>
                    </div>
                  </template>

                  <div class="rsvp-status-container q-mt-sm">
                    <div
                      class="rsvp-status-column"
                      v-for="status in RSVP_STATUSES_WITH_UNKNOWN"
                      :key="status"
                    >
                      <div class="text-subtitle2">
                        {{ status }} ({{ rsvpList(game, status, type).length }})
                      </div>
                      <q-list class="q-mt-sm">
                        <q-item
                          v-for="user in rsvpList(game, status, 'adult')"
                          :key="user.id"
                          class="q-pa-none"
                        >
                          <q-item-section class="q-pa-none">
                            <div class="row items-center justify-between no-wrap">
                              <div class="ellipsis">{{ user.name }}</div>
                              <q-chip
                                :color="statusColor(status)"
                                text-color="white"
                                dense
                                label
                                class="q-ml-sm"
                              />
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </div>
                </q-expansion-item>

                <!-- Kids RSVP Collapsible -->
                <q-expansion-item
                  icon="child_care"
                  label="Kids"
                  class="q-mb-md"
                  :header-class="'text-h6'"
                  dense
                  expand-separator
                >
                  <!-- Kids header -->
                  <template #header>
                    <div class="column" style="width: 100%">
                      <div>Kids</div>
                      <div class="row q-mt-xs">
                        <q-chip
                          v-for="status in RSVP_STATUSES_WITH_UNKNOWN"
                          :key="status"
                          :color="statusColor(status)"
                          text-color="white"
                          dense
                          class="q-ml-sm"
                          :label="`${rsvpList(game, status, 'kid').length} ${status}`"
                        />
                      </div>
                    </div>
                  </template>

                  <div class="rsvp-status-container q-mt-sm">
                    <div
                      class="rsvp-status-column"
                      v-for="status in RSVP_STATUSES_WITH_UNKNOWN"
                      :key="status"
                    >
                      <div class="text-subtitle2">
                        {{ status }} ({{ rsvpList(game, status, 'kid').length }})
                      </div>
                      <q-list class="q-mt-sm">
                        <q-item
                          v-for="user in rsvpList(game, status, 'kid')"
                          :key="user.id"
                          class="q-pa-none"
                        >
                          <q-item-section class="q-pa-none">
                            <div class="row items-center justify-between no-wrap">
                              <div class="ellipsis">{{ user.name }}</div>
                              <q-chip
                                :color="statusColor(status)"
                                text-color="white"
                                dense
                                label
                                class="q-ml-sm"
                              />
                            </div>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </div>
                </q-expansion-item>
              </q-card>
            </div>
          </div>
        </q-pull-to-refresh>
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
const upcomingGames = ref([])
const currentUser = ref(null)
const isAdmin = ref(false)
const allUsers = ref([])
const loading = ref(true)

const RSVP_STATUSES = ['In', 'Maybe', 'Out']
const RSVP_STATUSES_WITH_UNKNOWN = ['In', 'Maybe', 'Out', 'Unknown']

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

const loadGames = async () => {
  try {
    loading.value = true
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
  } finally {
    loading.value = false
  }
}

const refreshData = async (done) => {
  await loadUser()
  await loadAllUsers()
  await loadGames()
  done()
}

const rsvpList = (game, status, type = 'adult') => {
  if (!allUsers.value.length || !game?.rsvps) return []

  const list = allUsers.value.map((user) => {
    const attendance = game.rsvps.find((a) => a?.user === user.id)
    return {
      id: user.id,
      name: user.name || user.email || 'Unknown',
      status: attendance?.status || 'Unknown',
      parentId: typeof user.parent === 'string' ? user.parent : user.parent?.id || null,
    }
  })

  const filtered = list.filter((u) => u.status === status)

  if (type === 'adult') {
    return filtered.filter((u) => !u.parentId).sort((a, b) => a.name.localeCompare(b.name))
  } else {
    return filtered.filter((u) => u.parentId).sort((a, b) => a.name.localeCompare(b.name))
  }
}

const statusColor = (status) => {
  switch (status) {
    case 'In':
      return 'green'
    case 'Maybe':
      return 'orange'
    case 'Out':
      return 'red'
    case 'Unknown':
      return 'grey'
    default:
      return 'grey'
  }
}

const totalRSVPCount = (game) => {
  if (!game?.rsvps) return 0
  return game.rsvps.length
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
  if (!user) return

  if (!RSVP_STATUSES.includes(status)) {
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

const getChildren = (userId) => {
  if (!userId || !allUsers.value.length) return []
  return allUsers.value.filter((u) => {
    const parentId = typeof u.parent === 'string' ? u.parent : u.parent?.id || null
    return parentId === userId
  })
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
  let dt = DateTime.fromISO(datetimeStr, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(datetimeStr, { zone: 'utc' })
  if (!dt.isValid) return 'Invalid DateTime'
  return dt.setZone('America/New_York').toLocaleString(DateTime.DATETIME_MED)
}

onMounted(async () => {
  // Run these two in parallel to improve loading speed
  await Promise.all([loadUser(), loadAllUsers()])
  // Then load games (depends on users loaded)
  await loadGames()
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
  flex: 0 0 80px; /* default for mobile */
  min-width: 70px;
  max-width: 130px;
}

@media (min-width: 768px) {
  /* Desktop and larger tablets */
  .rsvp-status-column {
    flex: 0 0 160px; /* wider columns on desktop */
    min-width: 140px;
    max-width: 200px;
  }
}

/* Smaller buttons on mobile */
@media (max-width: 600px) {
  .q-btn.dense {
    min-width: 64px;
    height: 36px;
    font-size: 14px;
  }
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
