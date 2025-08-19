<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-h6">{{ title }}</div>
      <!-- Optional: Total Count -->
      <q-badge align="top" color="primary" class="q-ml-sm"> {{ totalCount }} Total </q-badge>
    </div>

    <!-- RSVP Columns with Headers -->
    <div class="row q-col-gutter-md q-mt-sm">
      <div v-for="status in statuses" :key="status" class="col-12 col-sm">
        <div class="text-subtitle2 text-center q-mb-xs text-grey-7 text-weight-medium">
          {{ status }}
        </div>
        <q-list bordered separator>
          <q-item v-for="user in filteredByStatus(status)" :key="user.id" class="q-py-xs">
            <q-item-section avatar>
              <q-avatar size="24px" color="primary" text-color="white">
                {{ user.name.charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <div class="text-body2">{{ user.name }}</div>
            </q-item-section>
          </q-item>
        </q-list>
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
    return {
      id: user.id,
      name: user.name || user.email || 'Unknown',
      status: attendance?.status || 'Unknown',
      parentId: user.parentId || null,
    }
  })
})

function filteredByStatus(status) {
  if (!normalizedUsers.value.length) return []
  let filtered = normalizedUsers.value.filter((u) => u.status === status)
  if (props.type === 'adult') {
    filtered = filtered.filter((u) => !u.parentId)
  } else {
    filtered = filtered.filter((u) => u.parentId)
  }
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

const totalCount = computed(() => normalizedUsers.value.length)
</script>
