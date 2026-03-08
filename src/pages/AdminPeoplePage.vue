<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <div class="row items-center q-pa-sm">
        <q-btn icon="logout" label="Logout" color="negative" unelevated glossy @click="logout" />
        <q-space />
        <ThemeToggle class="q-mr-sm" />
        <q-btn label="Games" icon="sports" color="secondary" class="q-mr-sm" @click="goToAdminGames" />
        <q-btn label="League Page" icon="sports_esports" color="primary" @click="goToLeague" />
      </div>
    </q-header>

    <q-page-container>
      <q-page class="q-px-md q-pt-md q-pb-xl">
        <div class="row items-center justify-between q-mb-sm">
          <h1 class="text-h6 q-mb-none">Admin Panel — People</h1>
          <q-btn
            flat
            color="primary"
            icon="refresh"
            label="Refresh"
            :loading="loading"
            @click="loadUsers"
          />
        </div>

        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <q-input
              v-model="search"
              dense
              outlined
              clearable
              label="Search people"
              placeholder="Filter by name or email"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <div v-if="$q.screen.lt.md" class="column q-gutter-sm">
          <q-card v-for="user in filteredUsers" :key="user.id" flat bordered>
            <q-card-section>
              <div class="row items-start justify-between">
                <div>
                  <div class="text-subtitle1">{{ user.displayName }}</div>
                  <div class="text-caption text-grey-7">{{ user.email || 'No email' }}</div>
                </div>
                <q-chip dense :color="user.isAdmin ? 'negative' : 'primary'" text-color="white">
                  {{ user.isAdmin ? 'Admin' : user.isChild ? 'Child' : 'Player' }}
                </q-chip>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="left" class="q-gutter-xs">
              <q-btn dense flat icon="edit" color="primary" label="Rename" @click="renameUser(user)" />
              <q-btn
                dense
                flat
                icon="mail"
                color="secondary"
                label="Sign-in Link"
                @click="sendSignInLink(user)"
              />
              <q-btn
                dense
                flat
                icon="lock_reset"
                color="secondary"
                label="Reset Email"
                @click="sendResetEmail(user)"
              />
              <q-btn
                v-if="!user.isAdmin && !user.isChild"
                dense
                flat
                icon="child_care"
                color="accent"
                label="Set Child"
                @click="convertToChild(user)"
              />
              <q-btn
                v-if="!user.isAdmin && user.isChild"
                dense
                flat
                icon="person"
                color="accent"
                label="Set Player"
                @click="convertToPlayer(user)"
              />
              <q-btn
                dense
                flat
                icon="delete"
                color="negative"
                label="Delete"
                :disable="isCurrentUser(user)"
                @click="deleteUser(user)"
              />
            </q-card-actions>
          </q-card>
        </div>

        <q-table
          v-else
          :rows="filteredUsers"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          :loading="loading"
        >
          <template #body-cell-name="props">
            <q-td :props="props">{{ props.row.displayName }}</q-td>
          </template>
          <template #body-cell-role="props">
            <q-td :props="props">
              <q-chip dense :color="props.row.isAdmin ? 'negative' : 'primary'" text-color="white">
                {{ props.row.isAdmin ? 'Admin' : props.row.isChild ? 'Child' : 'Player' }}
              </q-chip>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs">
              <q-btn dense flat icon="edit" color="primary" @click="renameUser(props.row)" />
              <q-btn dense flat icon="mail" color="secondary" @click="sendSignInLink(props.row)" />
              <q-btn dense flat icon="lock_reset" color="secondary" @click="sendResetEmail(props.row)" />
              <q-btn
                v-if="!props.row.isAdmin && !props.row.isChild"
                dense
                flat
                icon="child_care"
                color="accent"
                @click="convertToChild(props.row)"
              />
              <q-btn
                v-if="!props.row.isAdmin && props.row.isChild"
                dense
                flat
                icon="person"
                color="accent"
                @click="convertToPlayer(props.row)"
              />
              <q-btn
                dense
                flat
                icon="delete"
                color="negative"
                :disable="isCurrentUser(props.row)"
                @click="deleteUser(props.row)"
              />
            </q-td>
          </template>
        </q-table>

        <q-dialog v-model="editDialogOpen" persistent>
          <q-card style="min-width: 320px; width: min(560px, 94vw)">
            <q-card-section>
              <div class="text-h6">Edit Person</div>
              <div class="text-caption text-grey-7">
                Update first name, last name, and display name.
              </div>
            </q-card-section>
            <q-card-section class="q-gutter-sm">
              <q-input v-model="editFirstName" dense outlined label="First Name" />
              <q-input v-model="editLastName" dense outlined label="Last Name" />
              <q-input v-model="editDisplayName" dense outlined label="Display Name" />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancel" color="grey-7" v-close-popup />
              <q-btn color="primary" unelevated label="Save" :loading="editSaving" @click="saveUserNames" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notify, useQuasar } from 'quasar'
import pb from 'src/services/pocketbase'
import ThemeToggle from 'src/components/ThemeToggle.vue'
import { useQuasarDialogs } from 'src/composables/useQuasarDialogs'

const router = useRouter()
const $q = useQuasar()
const { confirmDialog } = useQuasarDialogs($q)

const users = ref([])
const guardianships = ref([])
const loading = ref(false)
const search = ref('')
const editDialogOpen = ref(false)
const editSaving = ref(false)
const editUserId = ref('')
const editFirstName = ref('')
const editLastName = ref('')
const editDisplayName = ref('')

const columns = [
  { name: 'name', label: 'Name', field: 'displayName', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'role', label: 'Role', field: 'role', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const childIds = computed(() => {
  const ids = new Set()
  for (const link of guardianships.value) {
    if (link?.child) ids.add(link.child)
  }
  return ids
})

const decoratedUsers = computed(() =>
  users.value
    .map((u) => ({
      ...u,
      displayName: resolveDisplayName(u),
      isChild: childIds.value.has(u.id),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName)),
)

const filteredUsers = computed(() => {
  const q = (search.value || '').trim().toLowerCase()
  if (!q) return decoratedUsers.value
  return decoratedUsers.value.filter((u) => {
    const name = (u.displayName || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })
})

function isCurrentUser(user) {
  return user?.id && user.id === pb.authStore.model?.id
}

function logout() {
  pb.authStore.clear()
  router.push({ name: 'login' })
}

function goToLeague() {
  router.push({ name: 'league' })
}

function goToAdminGames() {
  router.push({ name: 'admin' })
}

async function loadUsers() {
  loading.value = true
  try {
    const [allUsers, links] = await Promise.all([
      pb.collection('_pb_users_auth_').getFullList({ sort: 'name' }),
      pb.collection('guardianships').getFullList({ sort: 'guardian,child' }).catch(() => []),
    ])
    users.value = allUsers
    guardianships.value = links
  } catch (err) {
    console.error('Failed to load users', err)
    Notify.create({ type: 'negative', message: 'Failed to load people.' })
  } finally {
    loading.value = false
  }
}

async function renameUser(user) {
  editUserId.value = user.id
  editFirstName.value = (user.first_name || '').trim()
  editLastName.value = (user.last_name || '').trim()
  editDisplayName.value = (user.display_name || '').trim() || user.displayName
  editDialogOpen.value = true
}

async function sendSignInLink(user) {
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

async function sendResetEmail(user) {
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

function userLabel(user) {
  const name = resolveDisplayName(user)
  if (!name) return user?.email || user?.id || 'Unknown'
  return user?.email ? `${name} (${user.email})` : name
}

function resolveDisplayName(user) {
  const display = (user?.display_name || '').trim()
  if (display) return display
  const first = (user?.first_name || '').trim()
  const last = (user?.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full
  const name = (user?.name || '').trim()
  if (name) return name
  return user?.email || user?.id || ''
}

function guardianOptionsFor(childUser) {
  return decoratedUsers.value
    .filter((u) => u.id !== childUser.id)
    .map((u) => ({ label: userLabel(u), value: u.id }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function currentGuardianIdsFor(childUser) {
  return guardianships.value.filter((g) => g.child === childUser.id).map((g) => g.guardian)
}

function promptGuardianSelection(childUser, options, preselected) {
  return new Promise((resolve) => {
    $q.dialog({
      title: `Set ${childUser.displayName} as Child`,
      message: 'Choose one or more guardians:',
      cancel: true,
      persistent: true,
      position: $q.screen.lt.md ? 'bottom' : 'standard',
      options: {
        type: 'checkbox',
        model: preselected,
        items: options,
      },
    })
      .onOk((val) => resolve(Array.isArray(val) ? val : []))
      .onCancel(() => resolve(null))
      .onDismiss(() => resolve(null))
  })
}

async function convertToChild(user) {
  if (user?.isAdmin) {
    Notify.create({ type: 'warning', message: 'Admin accounts cannot be set as child.' })
    return
  }

  const options = guardianOptionsFor(user)
  if (!options.length) {
    Notify.create({ type: 'warning', message: 'No available guardians found.' })
    return
  }

  const selectedGuardianIds = await promptGuardianSelection(user, options, currentGuardianIdsFor(user))
  if (!selectedGuardianIds) return
  if (!selectedGuardianIds.length) {
    Notify.create({ type: 'warning', message: 'Select at least one guardian.' })
    return
  }

  try {
    const existing = guardianships.value.filter((g) => g.child === user.id)
    for (const link of existing) {
      await pb.collection('guardianships').delete(link.id)
    }
    for (const guardianId of selectedGuardianIds) {
      await pb.collection('guardianships').create({ guardian: guardianId, child: user.id })
    }
    Notify.create({ type: 'positive', message: `${user.displayName} is now a child account.` })
    await loadUsers()
  } catch (err) {
    console.error('Failed to convert user to child', err)
    Notify.create({ type: 'negative', message: 'Failed to update child guardians.' })
  }
}

async function convertToPlayer(user) {
  if (!user?.isChild) return

  const ok = await confirmDialog({
    title: 'Set Player',
    message: `Remove child status for ${user.displayName}?`,
    cancel: true,
    persistent: true,
    position: $q.screen.lt.md ? 'bottom' : 'standard',
  })
  if (!ok) return

  try {
    const childLinks = guardianships.value.filter((g) => g.child === user.id)
    for (const link of childLinks) {
      await pb.collection('guardianships').delete(link.id)
    }
    Notify.create({ type: 'positive', message: `${user.displayName} is now a player.` })
    await loadUsers()
  } catch (err) {
    console.error('Failed to convert user to player', err)
    Notify.create({ type: 'negative', message: 'Failed to remove child status.' })
  }
}

async function deleteUser(user) {
  if (isCurrentUser(user)) {
    Notify.create({ type: 'warning', message: 'You cannot delete your own account.' })
    return
  }

  const ok = await confirmDialog({
    title: 'Delete User',
    message: `Delete ${user.displayName}? This cannot be undone.`,
    cancel: true,
    persistent: true,
    position: $q.screen.lt.md ? 'bottom' : 'standard',
  })
  if (!ok) return

  try {
    await pb.collection('users').delete(user.id)
    Notify.create({ type: 'info', message: 'User deleted.' })
    await loadUsers()
  } catch (err) {
    console.error('Failed to delete user', err)
    Notify.create({ type: 'negative', message: 'Failed to delete user.' })
  }
}

async function saveUserNames() {
  if (!editUserId.value) return
  editSaving.value = true
  try {
    const payload = {
      first_name: (editFirstName.value || '').trim(),
      last_name: (editLastName.value || '').trim(),
      display_name: (editDisplayName.value || '').trim(),
    }
    await pb.collection('users').update(editUserId.value, payload, { $autoCancel: false })
    Notify.create({ type: 'positive', message: 'User names updated.' })
    editDialogOpen.value = false
    await loadUsers()
  } catch (err) {
    console.error('Failed to update user names', err)
    Notify.create({ type: 'negative', message: 'Failed to update names.' })
  } finally {
    editSaving.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>
