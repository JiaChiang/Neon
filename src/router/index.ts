import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'menu',
      component: () => import('../views/MainMenuView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../views/GameSetupView.vue'),
    },
    {
      path: '/draft',
      name: 'draft',
      component: () => import('../views/DraftView.vue'),
    },
    {
      path: '/play',
      name: 'play',
      component: () => import('../views/GamePlayView.vue'),
    },
    {
      path: '/victory',
      name: 'victory',
      component: () => import('../views/VictoryView.vue'),
    },
  ],
})

export default router
