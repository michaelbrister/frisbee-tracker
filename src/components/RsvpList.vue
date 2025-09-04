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
              <div class="ellipsis">{{ user.name }}</div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-expansion-item>
</template>

<script setup>
defineProps({
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
</script>
