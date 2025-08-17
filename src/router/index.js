import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import LeaguePage from '../pages/LeaguePage.vue'
import AdminPage from '../pages/AdminPage.vue'

const routes = [
  { path: '/', name: 'login', component: LoginPage },
  { path: '/league', name: 'league', component: LeaguePage, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminPage, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
