<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    maximized
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="column no-wrap" style="min-height: 100%">
      <!-- Header -->
      <q-bar>
        <div class="text-h6">
          {{ isEdit ? 'Edit Game' : 'Create New Game' }}
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="closeDialog" />
      </q-bar>

      <!-- Content -->
      <q-card-section class="q-pt-md q-pb-none">
        <q-banner
          v-if="!isFriday && form.date"
          dense
          class="bg-orange-2 text-orange-10 q-mb-md"
          inline-actions
        >
          <q-icon name="warning" class="q-mr-sm" />
          Selected date isn’t a Friday. League games are on Fridays — consider adjusting.
          <template #action>
            <q-btn flat dense color="orange-10" label="Next Friday" @click="setToNextFriday()" />
          </template>
        </q-banner>

        <q-form ref="formRef" @submit.prevent="submitForm">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.title"
                label="Game Title"
                outlined
                :rules="[req('Title is required')]"
                counter
                maxlength="60"
                lazy-rules
                class="q-mb-md"
              />
              <q-input
                v-model="form.location"
                label="Location"
                outlined
                :rules="[req('Location is required')]"
                counter
                maxlength="80"
                lazy-rules
                class="q-mb-md"
              />

              <div class="row items-center q-gutter-sm q-mt-sm">
                <q-btn
                  outline
                  icon="event_available"
                  label="Next Friday"
                  @click="setToNextFriday()"
                />
                <q-chip v-if="form.date" square> Date only: {{ form.date }} </q-chip>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-date
                    v-model="form.date"
                    mask="YYYY-MM-DD"
                    :options="fridayOnly"
                    color="primary"
                    bordered
                    class="full-width"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-time
                    v-model="form.time"
                    :format24h="false"
                    color="primary"
                    bordered
                    minimal
                    class="full-width time-picker-small"
                  />
                </div>
              </div>

              <!-- Live preview -->
              <q-separator class="q-my-md" />
              <div>
                <div class="text-subtitle2 q-mb-xs">Preview</div>
                <div class="text-body2">
                  <div><strong>Local (ET):</strong> {{ previewLocal }}</div>
                  <div><strong>UTC (stored):</strong> {{ previewUTC }}</div>
                </div>
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <!-- Sticky Footer -->
      <q-separator class="q-mt-md" />
      <q-card-actions align="right" class="bg-grey-1 q-px-md q-py-sm">
        <q-btn flat label="Cancel" color="grey-8" @click="closeDialog" />
        <q-btn
          unelevated
          :label="isEdit ? 'Save Changes' : 'Create Game'"
          color="primary"
          @click="submitForm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { DateTime } from 'luxon'
import { Notify } from 'quasar'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  isEdit: { type: Boolean, default: false },
  initialData: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'save', 'close'])

const formRef = ref(null)
const form = ref({
  title: '',
  location: '',
  date: '', // YYYY-MM-DD
  time: '05:30 PM', // hh:mm AM/PM
})

// Initialize/patch form whenever dialog opens or initialData changes
watch(
  () => props.initialData,
  (d) => {
    const seed = d || {}
    form.value = {
      title: seed.title || 'Frisbee',
      location: seed.location || 'Bird Street Park',
      date: seed.date ? toISODateLocal(seed.date) : seed.date_only || '',
      time: seed.time || (seed.date ? toLocalTime(seed.date) : '05:30 PM'),
    }
  },
  { immediate: true },
)

function req(msg) {
  return (v) => !!(v && String(v).trim()) || msg
}

// Put at top of <script setup>
const TZ = 'America/New_York'

// Helper to parse date-only strings from QDate or your model
function parseDateOnly(dateStr) {
  // QDate options callback gets 'YYYY/MM/DD'; your v-model uses mask 'YYYY-MM-DD'
  const fmt = dateStr.includes('/') ? 'yyyy/MM/dd' : 'yyyy-MM-dd'
  return DateTime.fromFormat(dateStr, fmt, { zone: TZ })
}

// Use this for QDate :options
function fridayOnly(dateStr) {
  const dt = parseDateOnly(dateStr)
  return dt.isValid && dt.weekday === 5 // 5 = Friday (Mon=1..Sun=7)
}

// Use this to drive the banner
const isFriday = computed(() => {
  const d = form.value.date
  if (!d) return true
  const dt = DateTime.fromFormat(d, 'yyyy-MM-dd', { zone: TZ })
  return dt.isValid && dt.weekday === 5
})

// Keep your “next Friday” helper in ET
function setToNextFriday() {
  const now = DateTime.now().setZone(TZ)
  const daysUntilFriday = (5 - now.weekday + 7) % 7 || 7
  form.value.date = now.plus({ days: daysUntilFriday }).toISODate()
}

/* ------ Preview helpers ------ */
const previewLocal = computed(() => {
  if (!form.value.date || !form.value.time) return '—'
  const dt = DateTime.fromFormat(`${form.value.date} ${form.value.time}`, 'yyyy-MM-dd HH:mm', {
    zone: 'America/New_York',
  })

  return dt.isValid ? dt.toLocaleString(DateTime.DATETIME_MED) : '—'
})

const previewUTC = computed(() => {
  if (!form.value.date || !form.value.time) return '—'
  const dt = DateTime.fromFormat(`${form.value.date} ${form.value.time}`, 'yyyy-MM-dd HH:mm', {
    zone: 'America/New_York',
  })

  return dt.isValid ? dt.toUTC().toISO() : '—'
})

/* ------ Converters for initial edit values ------ */
function toISODateLocal(utcISO) {
  // convert existing UTC ISO from DB to ET date-only
  let dt = DateTime.fromISO(utcISO, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(utcISO, { zone: 'utc' })
  return dt.isValid ? dt.setZone('America/New_York').toISODate() : ''
}
function toLocalTime(utcISO) {
  let dt = DateTime.fromISO(utcISO, { zone: 'utc' })
  if (!dt.isValid) dt = DateTime.fromSQL(utcISO, { zone: 'utc' })
  return dt.isValid ? dt.setZone('America/New_York').toFormat('hh:mm a') : '05:30 PM'
}

/* ------ Submit ------ */
async function submitForm() {
  const ok = await formRef.value?.validate?.()
  if (!ok) {
    Notify.create({ type: 'negative', message: 'Please fix the highlighted fields.' })
    return
  }

  if (!isFriday.value) {
    Notify.create({ type: 'warning', message: 'Games are on Friday. Continue if intentional.' })
    // You can early-return here if you want to enforce Fridays strictly.
  }

  const { title, location, date, time } = form.value
  try {
    const dt = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', {
      zone: 'America/New_York',
    })
    if (!dt.isValid) throw new Error('Invalid date/time')
    const utcISO = dt.toUTC().toISO()

    const payload = { title, location, date: utcISO, date_only: date, time } // include date_only for your store
    emit('save', payload)
  } catch (e) {
    console.error('Error submitting form:', e)
    Notify.create({ type: 'negative', message: 'Invalid date or time format.' })
  }
}

function closeDialog() {
  emit('update:modelValue', false)
  emit('close')
}
</script>
