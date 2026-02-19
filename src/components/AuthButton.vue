<script setup lang="ts">
defineProps<{
  isAuthenticated: boolean;
  isLoading: boolean;
  principal: string | null;
}>();

const emit = defineEmits<{
  login: [];
  logout: [];
}>();
</script>

<template>
  <button v-if="isLoading" class="btn-secondary opacity-50 cursor-not-allowed" disabled>
    Connecting...
  </button>
  <div v-else-if="isAuthenticated" class="flex items-center gap-3">
    <span class="text-sm text-gray-400 font-mono">
      {{ principal ? `${principal.slice(0, 8)}...${principal.slice(-4)}` : '' }}
    </span>
    <button class="btn-secondary text-sm" @click="emit('logout')">
      Sign Out
    </button>
  </div>
  <button v-else class="btn-primary" @click="emit('login')">
    Sign in with Internet Identity
  </button>
</template>
