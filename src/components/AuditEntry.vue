<script setup lang="ts">
import EngramIcon from './icons/EngramIcons.vue';

defineProps<{
  id: number;
  timestamp: string;
  caller: string;
  callerRole: string;
  operation: string;
  details: string;
  success: boolean;
}>();
</script>

<template>
  <tr :class="['border-b border-gray-800', !success ? 'bg-red-950/20' : '']">
    <td class="px-4 py-3 text-sm text-gray-500">{{ id }}</td>
    <td class="px-4 py-3 text-sm text-gray-400">{{ timestamp }}</td>
    <td class="px-4 py-3">
      <span :class="callerRole === 'Owner' ? 'badge-owner' : 'badge-operator'">
        {{ callerRole }}
      </span>
    </td>
    <td class="px-4 py-3 text-sm font-mono text-gray-400">
      {{ caller.slice(0, 10) }}...
    </td>
    <td class="px-4 py-3 text-sm font-medium text-gray-200">{{ operation }}</td>
    <td class="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{{ details }}</td>
    <td class="px-4 py-3 text-sm">
      <span v-if="success" class="inline-flex items-center gap-1 text-green-400">
        <EngramIcon name="check-circle" :size="14" />
        OK
      </span>
      <span v-else class="inline-flex items-center gap-1 text-red-400">
        <EngramIcon name="x-circle" :size="14" />
        FAIL
      </span>
    </td>
  </tr>
</template>
