import { createRouter, createWebHistory } from 'vue-router';
import Landing from './pages/Landing.vue';

const routes = [
  { path: '/', component: Landing },
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/memory', component: () => import('./pages/Memory.vue'), meta: { requiresAuth: true } },
  { path: '/access', component: () => import('./pages/Access.vue'), meta: { requiresAuth: true } },
  { path: '/billing', component: () => import('./pages/Billing.vue'), meta: { requiresAuth: true } },
  { path: '/system', component: () => import('./pages/System.vue'), meta: { requiresAuth: true } },
  { path: '/guardian-invite', component: () => import('./pages/GuardianInvite.vue') },
  { path: '/guardian', component: () => import('./pages/Guardian.vue'), meta: { requiresAuth: true } },
  { path: '/verify', component: () => import('./pages/Verify.vue') },
  { path: '/docs', component: () => import('./pages/Docs.vue') },

  // Redirects from old paths
  { path: '/wallet', redirect: '/billing?tab=transfers' },
  { path: '/cycles', redirect: '/billing' },
  { path: '/updates', redirect: '/system' },
  { path: '/settings', redirect: '/memory?tab=backups' },
  { path: '/sessions', redirect: '/memory?tab=sessions' },
  { path: '/operators', redirect: '/access' },
  { path: '/guardians', redirect: '/access?tab=guardians' },
  { path: '/audit', redirect: '/system?tab=audit' },
  { path: '/backups', redirect: '/memory?tab=backups' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
