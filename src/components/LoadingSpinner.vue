<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}>();

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};
</script>

<template>
  <div class="flex items-center gap-2" :class="size === 'sm' ? '' : 'justify-center py-8'">
    <div
      :class="[
        sizeClasses[size || 'md'],
        'rounded-full border-gray-700 border-t-engram-500 animate-spin',
      ]"
    />
    <span v-if="label" class="text-sm text-gray-400">{{ label }}</span>
  </div>
</template>
