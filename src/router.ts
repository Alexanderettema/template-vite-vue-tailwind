import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { supabase } from './lib/supabase'
import LandingPage from './components/LandingPage.vue'
import AuthPage from './components/AuthPage.vue'
import ChatInterface from './components/ChatInterface.vue'
import SessionBrowser from './components/SessionBrowser.vue'
import SessionDetails from './components/SessionDetails.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: LandingPage
  },
  {
    path: '/auth',
    name: 'auth',
    component: AuthPage
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatInterface,
    meta: { requiresAuth: true }
  },
  {
    path: '/sessions',
    name: 'sessions',
    component: SessionBrowser,
    meta: { requiresAuth: false }  // Allow both logged in and anonymous users
  },
  {
    path: '/sessions/:id',
    name: 'session-details',
    component: SessionDetails,
    meta: { requiresAuth: false }  // Allow both logged in and anonymous users
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const { data: { session } } = await supabase.auth.getSession()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !session) {
    next('/auth')
  } else if (to.path === '/auth' && session) {
    next('/chat')
  } else {
    next()
  }
})

export default router 