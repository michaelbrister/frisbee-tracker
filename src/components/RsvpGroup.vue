<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-h6">{{ title }}</div>
      <q-badge v-if="totalCount" align="top" color="primary" class="q-ml-sm">
        {{ totalCount }} Total
      </q-badge>
    </div>

    <div class="rsvp-status-container q-mt-sm">
      <div class="rsvp-status-header" role="row">
        <div
          v-for="status in statuses"
          :key="status"
          class="rsvp-status-column header-cell"
          role="columnheader"
        >
          {{ status }}
        </div>
      </div>

      <div v-for="rowIndex in maxRows" :key="rowIndex" class="rsvp-status-row" role="row">
        <div v-for="status in statuses" :key="status" class="rsvp-status-column" role="gridcell">
          <div v-if="filteredByStatus(status)[rowIndex - 1]">
            {{ filteredByStatus(status)[rowIndex - 1].name }}
          </div>
          <div v-else class="empty-cell">&nbsp;</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  game: Object,
  users: Array,
  type: {
    type: String,
    default: 'adult',
  },
  statuses: {
    type: Array,
    default: () => ['In', 'Maybe', 'Out', 'Unknown'],
  },
  title: String,
})

const normalizedUsers = computed(() => {
  if (!props.users?.length || !props.game?.rsvps) return []

  return props.users.map((user) => {
    const attendance = props.game.rsvps.find((a) => a?.user === user.id)
    const parentId =
      typeof user.parent === 'string' ? user.parent : user.parent?.id || user.parentId || null

    return {
      id: user.id,
      name: user.name || user.email || 'Unknown',
      status: attendance?.status || 'Unknown',
      parentId,
    }
  })
})

function filteredByStatus(status) {
  if (!normalizedUsers.value.length) return []

  let filtered = normalizedUsers.value.filter((u) => u.status === status)

  if (props.type === 'adult') {
    filtered = filtered.filter((u) => !u.parentId)
  } else if (props.type === 'kid') {
    filtered = filtered.filter((u) => !!u.parentId)
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

// Determine the max number of rows needed for any status column
const maxRows = computed(() => {
  if (!normalizedUsers.value.length) return 0
  return Math.max(...props.statuses.map((status) => filteredByStatus(status).length))
})

const totalCount = computed(() => normalizedUsers.value.length)
</script>

<style scoped>
.rsvp-status-container {
  display: block;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.rsvp-status-header,
.rsvp-status-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(90px, 1fr));
  gap: 1rem;
}

.header-cell {
  font-weight: 600;
  text-align: center;
  color: var(--q-color-grey-7);
  padding-bottom: 0.25rem;
}

.rsvp-status-column {
  min-width: 70px;
  max-width: 110px;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 32px; /* fixed height */
  display: flex;
  align-items: center; /* vertically center text */
}

.empty-cell {
  visibility: hidden;
  height: 1em;
}

/* Desktop tweak */
@media (min-width: 768px) {
  .rsvp-status-header,
  .rsvp-status-row {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
  }

  .rsvp-status-column {
    max-width: 200px;
  }
}
</style>
