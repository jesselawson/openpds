import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth';
import { isInitialized } from '@/main'



const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'editor/:id?',
        name: 'editor',
        component: () => import('@/views/Editor.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/auth/login',
        name: 'login',
        component: () => import('@/views/Login.vue')
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFound.vue')
      }
    ]
  },
]
    
const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

router.beforeEach(async (to, from) => {
  // Wait for auth init
  if (!isInitialized()) {
    return false
  }

  const authStore = useAuthStore()
  
  if (to.path.startsWith('/auth/') && authStore.isAuthenticated) {
    return { name: 'home' }
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath }
    }
  }

  return true
})

export default router