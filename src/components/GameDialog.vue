<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    full-width
    full-height
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="q-pa-md">
      <q-bar>
        <div class="text-h6">{{ isEdit ? 'Edit' : 'Create New' }} Game</div>
        <q-space />
        <q-btn dense flat icon="close" @click="closeDialog" />
      </q-bar>

      <q-form @submit="submitForm">
        <q-input
          v-model="formData.title"
          label="Game Title"
          outlined
          class="q-mb-sm"
          :rules="[(val) => !!val || 'Title is required']"
        />
        <q-input
          v-model="formData.location"
          label="Location"
          outlined
          class="q-mb-sm"
          :rules="[(val) => !!val || 'Location is required']"
        />
        <q-date
          v-model="formData.date"
          label="Game Date (Fridays Only)"
          mask="YYYY-MM-DD"
          :options="fridayOnly"
          outlined
          class="q-mb-sm"
        />
        <q-time
          v-model="formData.time"
          label="Game Time"
          :format24h="false"
          :with-seconds="false"
          ampm
          outlined
          class="q-mb-sm"
        />

        <div class="row justify-end q-mt-md">
          <q-btn flat label="Cancel" color="grey" @click="closeDialog" />
          <q-btn flat :label="isEdit ? 'Save' : 'Create'" color="primary" type="submit" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { DateTime } from 'luxon'
import { Notify } from 'quasar'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const formData = ref({})

// Watch for changes to initialData to populate the form when the dialog opens
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      formData.value = { ...newData }
    }
  },
  { immediate: true },
)

function fridayOnly(date) {
  return new Date(date).getDay() === 5
}

function combineDateTimeToUTC(dateStr, timeStr) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd hh:mm a', {
    zone: 'America/New_York',
  })
  if (!dt.isValid) throw new Error('Invalid time value')
  return dt.toUTC().toISO()
}

const submitForm = async () => {
  if (
    !formData.value.title ||
    !formData.value.location ||
    !formData.value.date ||
    !formData.value.time
  ) {
    Notify.create({ type: 'negative', message: 'All fields are required.' })
    return
  }
  try {
    const utcISO = combineDateTimeToUTC(formData.value.date, formData.value.time)
    const payload = {
      ...formData.value,
      date: utcISO,
    }
    emit('save', payload)
  } catch (error) {
    console.error('Error submitting form:', error)
    Notify.create({ type: 'negative', message: 'Invalid date or time format.' })
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
  emit('close')
}
</script>
