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

        <!-- Date & time pickers -->
        <div v-if="pickerReady" class="row q-col-gutter-sm items-center">
          <div class="col-12 col-sm-6">
            <q-date
              v-model="formData.date"
              label="Game Date (Fridays Only)"
              mask="YYYY-MM-DD"
              :options="fridayOnly"
              outlined
              class="q-mb-sm"
            />
            <!-- New button -->
            <q-btn
              dense
              outline
              color="primary"
              icon="event_available"
              label="Next Friday"
              class="q-mt-sm"
              @click="setNextFriday"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-time
              v-model="formData.time"
              label="Game Time"
              :format24h="false"
              :with-seconds="false"
              minimal
              outlined
              class="q-mb-sm"
            />
          </div>
        </div>

        <div class="row justify-end q-mt-md">
          <q-btn flat label="Cancel" color="grey" @click="closeDialog" />
          <q-btn flat :label="isEdit ? 'Save' : 'Create'" color="primary" type="submit" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { DateTime } from 'luxon'
import { Notify } from 'quasar'

const TZ = 'America/New_York'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  isEdit: { type: Boolean, default: false },
  initialData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const formData = ref({
  title: 'Frisbee',
  location: 'Bird Street Park',
  date: '', // YYYY-MM-DD (ET)
  time: '05:30 PM', // keep 12h string
})

const pickerReady = ref(false)

/* ---------- Utils ---------- */
function nextFridayISODate() {
  const now = DateTime.now().setZone(TZ)
  const days = (5 - now.weekday + 7) % 7 || 7
  return now.plus({ days }).toISODate()
}

function setNextFriday() {
  formData.value.date = nextFridayISODate()
}

function fridayOnly(dateStr) {
  const fmt = dateStr?.includes('/') ? 'yyyy/MM/dd' : 'yyyy-MM-dd'
  const dt = DateTime.fromFormat(dateStr, fmt, { zone: TZ })
  return dt.isValid && dt.weekday === 5
}

function combineDateTimeToUTC(dateStr, timeStr12h) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr12h}`, 'yyyy-MM-dd hh:mm a', { zone: TZ })
  if (!dt.isValid) throw new Error('Invalid time value')
  return dt.toUTC().toISO()
}

/* ---------- Seed ---------- */
watch(
  () => props.initialData,
  (newData) => {
    if (!newData) return
    formData.value = { ...newData }
  },
  { immediate: true },
)

/* ---------- On open ---------- */
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      pickerReady.value = false
      return
    }
    pickerReady.value = false
    await nextTick()

    if (!props.isEdit) {
      if (!formData.value.date) formData.value.date = nextFridayISODate()
      if (!/(am|pm)/i.test(formData.value.time || '')) {
        formData.value.time = '05:30 PM'
      }
    }

    pickerReady.value = true
  },
)

/* ---------- Submit ---------- */
const submitForm = async () => {
  const { title, location, date, time } = formData.value
  if (!title || !location || !date || !time) {
    Notify.create({ type: 'negative', message: 'All fields are required.' })
    return
  }
  try {
    const utcISO = combineDateTimeToUTC(date, time)
    const payload = {
      ...formData.value,
      date: utcISO,
      date_only: date,
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
