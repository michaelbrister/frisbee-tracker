// src/services/pocketbase.js
import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090') // <-- replace with your PocketBase URL

export default pb
