import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import LeaguePage from '../pages/LeaguePage.vue'
import AdminPage from '../pages/AdminPage.vue'
import AdminPeoplePage from '../pages/AdminPeoplePage.vue'
import pb from 'src/services/pocketbase'

const routes = [
  { path: '/', name: 'home', component: LoginPage },
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/league', name: 'league', component: LeaguePage, meta: { requiresAuth: true } },
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/people',
    name: 'admin-people',
    component: AdminPeoplePage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/otp',
    name: 'otp',
    component: () => import('src/pages/OtpLanding.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const loggedIn = pb.authStore.isValid
  const isAdmin = !!pb.authStore.model?.isAdmin

  if (to.meta.requiresAuth && !loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return { name: 'league' }
  }

  if ((to.name === 'login' || to.name === 'home') && loggedIn) {
    return { name: isAdmin ? 'admin' : 'league' }
  }
})

export default router
