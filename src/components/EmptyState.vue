<script setup lang="ts">
import EngramIcon from './icons/EngramIcons.vue';

defineProps<{
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8 md:py-12 text-center">
    <div v-if="icon" class="mb-4 text-gray-600">
      <EngramIcon :name="icon" :size="48" />
    </div>
    <h3 class="text-lg font-medium text-gray-400">{{ title }}</h3>
    <p v-if="description" class="text-sm text-gray-500 mt-1 max-w-sm">{{ description }}</p>
    <router-link v-if="actionTo && actionLabel" :to="actionTo" class="btn-primary text-sm mt-4">
      {{ actionLabel }}
    </router-link>
    <button v-else-if="actionLabel" class="btn-primary text-sm mt-4" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>
