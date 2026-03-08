<template>
  <q-expansion-item :icon="icon" :header-class="'text-h6'" dense expand-separator class="q-mt-sm">
    <template #header>
      <div class="column" style="width: 100%">
        <div>{{ title }}</div>
        <div class="row q-mt-xs">
          <q-chip
            v-for="status in statuses"
            :key="status"
            :color="statusColor(status)"
            text-color="white"
            dense
            class="q-ml-sm"
            :label="`${users[status]?.length || 0} ${status}`"
          />
        </div>
      </div>
    </template>

    <div class="rsvp-status-container q-mt-sm">
      <div class="rsvp-status-column" v-for="status in statuses" :key="status">
        <div class="text-subtitle2">{{ status }} ({{ users[status]?.length || 0 }})</div>
        <q-list class="q-mt-sm" v-if="users[status]?.length">
          <q-item v-for="user in users[status]" :key="user.id" class="q-pa-none">
            <q-item-section>
              <div class="ellipsis">{{ userDisplayName(user) }}</div>
            </q-item-section>
            <q-item-section side v-if="showActions && canShowActionsFor(user)">
              <div class="row items-center q-gutter-xs">
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="mail"
                  color="secondary"
                  aria-label="Send sign-in link"
                  @click="emitSendSignInLink(user)"
                />
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="lock_reset"
                  color="secondary"
                  aria-label="Send password reset email"
                  @click="emitSendResetEmail(user)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-expansion-item>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  users: {
    type: Object,
    required: true,
  },
  showActions: {
    type: Boolean,
    default: false,
  },
  actionableUserIds: {
    type: Array,
    default: () => [],
  },
  onSendSignInLink: {
    type: Function,
    default: null,
  },
  onSendResetEmail: {
    type: Function,
    default: null,
  },
})

const statuses = ['In', 'Maybe', 'Out', 'Unknown']

const statusColor = (status) => {
  switch (status) {
    case 'In':
      return 'green'
    case 'Maybe':
      return 'orange'
    case 'Out':
      return 'red'
    default:
      return 'grey'
  }
}

const canShowActionsFor = (user) => {
  if (!user?.id) return false
  if (!props.actionableUserIds?.length) return true
  return props.actionableUserIds.includes(user.id)
}

const emitSendSignInLink = (user) => {
  if (typeof props.onSendSignInLink === 'function') props.onSendSignInLink(user)
}

const emitSendResetEmail = (user) => {
  if (typeof props.onSendResetEmail === 'function') props.onSendResetEmail(user)
}

const userDisplayName = (user) => {
  if (!user) return ''
  if (user.display_name) return user.display_name
  const first = (user.first_name || '').trim()
  const last = (user.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full
  return user.name || user.email || user.id || ''
}
</script>
