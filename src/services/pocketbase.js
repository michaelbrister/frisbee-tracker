// src/services/pocketbase.js
import PocketBase from 'pocketbase'

const fallbackBaseUrl =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://127.0.0.1:8090'

const pb = new PocketBase(import.meta.env.VITE_PB_URL || fallbackBaseUrl)

export default pb
