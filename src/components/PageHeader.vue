<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex justify-between items-start mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white">{{ title }}</h1>
      <p v-if="description" class="text-gray-400 mt-1">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
