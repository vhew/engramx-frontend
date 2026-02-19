import { shallowRef, ref, computed } from 'vue';
import { Identity } from '@icp-sdk/core/agent';
import { login as authLogin, logout as authLogout, getIdentity, isAuthenticated as checkAuth } from '../lib/auth';

const identity = shallowRef<Identity | null>(null);
const isLoading = ref(true);
const isAuthenticated = computed(() => identity.value !== null);
const principal = computed(() => identity.value ? identity.value.getPrincipal() : null);

let initialized = false;

export function useAuth() {
  if (!initialized) {
    initialized = true;
    checkAuth().then(async (authenticated) => {
      if (authenticated) {
        identity.value = await getIdentity();
      }
      isLoading.value = false;
    }).catch(() => {
      isLoading.value = false;
    });
  }

  async function login() {
    isLoading.value = true;
    try {
      identity.value = await authLogin();
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    await authLogout();
    identity.value = null;
  }

  return {
    isAuthenticated,
    identity,
    principal,
    isLoading,
    login,
    logout,
  };
}
