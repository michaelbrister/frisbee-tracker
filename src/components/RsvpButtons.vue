<template>
  <div class="row q-gutter-sm q-wrap">
    <q-btn
      v-for="status in ['In', 'Maybe', 'Out']"
      :key="status"
      :label="status"
      flat
      ripple
      :color="currentStatus === status ? colorPrimary : 'grey-6'"
      :class="[
        'q-mb-xs',
        'q-hoverable cursor-pointer transition-all',
        currentStatus === status ? 'bg-grey-2 text-weight-bold' : 'text-grey-8',
      ]"
      @click="setRsvpStatus(status)"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  gameId: String,
  userId: String,
  currentStatus: {
    type: String,
    default: 'Unknown',
  },
  colorPrimary: {
    type: String,
    default: 'primary',
  },
})

const emit = defineEmits(['update-rsvp'])

function setRsvpStatus(status) {
  emit('update-rsvp', props.gameId, status, props.userId)
}
</script>
