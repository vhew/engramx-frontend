<script setup lang="ts">
import EngramIcon from './icons/EngramIcons.vue';

defineProps<{
  name: string;
  principal: string;
  status: string;
  lastSeen: string;
  registeredAt: string;
}>();

const emit = defineEmits<{
  revoke: [];
  editPermissions: [];
}>();
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-lg font-semibold text-white">{{ name }}</h3>
        <p class="text-sm text-gray-400 font-mono mt-1">{{ principal }}</p>
      </div>
      <span :class="status === 'Active' ? 'badge-active' : 'badge-revoked'">
        {{ status }}
      </span>
    </div>
    <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 text-sm">
      <div>
        <span class="inline-flex items-center gap-1 text-gray-500">
          <EngramIcon name="clock" :size="12" />
          Registered
        </span>
        <p class="text-gray-300">{{ registeredAt }}</p>
      </div>
      <div>
        <span class="inline-flex items-center gap-1 text-gray-500">
          <EngramIcon name="clock" :size="12" />
          Last Seen
        </span>
        <p class="text-gray-300">{{ lastSeen }}</p>
      </div>
    </div>
    <div v-if="status === 'Active'" class="mt-4 flex flex-col gap-2 sm:flex-row">
      <button class="btn-secondary text-sm inline-flex items-center gap-1.5" @click="emit('editPermissions')">
        <EngramIcon name="edit" :size="14" />
        Edit Permissions
      </button>
      <button class="btn-danger text-sm inline-flex items-center gap-1.5" @click="emit('revoke')">
        <EngramIcon name="x-circle" :size="14" />
        Revoke
      </button>
    </div>
  </div>
</template>
