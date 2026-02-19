<script setup lang="ts">
import EngramIcon from './icons/EngramIcons.vue';

const props = defineProps<{
  guardian: {
    principal: any;
    name: string;
    addedAt: bigint;
    permissions: {
      canRevokeOperators: boolean;
      canFreezePayments: boolean;
      canPauseWrites: boolean;
    };
    status: any;
  };
}>();

const emit = defineEmits<{
  remove: [];
  approve: [];
}>();

const formattedDate = new Date(Number(props.guardian.addedAt) / 1_000_000).toLocaleString();

const isPending = 'Pending' in props.guardian.status;
const isActive = 'Active' in props.guardian.status;

const permissionLabels = [
  { key: 'canRevokeOperators', label: 'Revoke Operators' },
  { key: 'canFreezePayments', label: 'Freeze Payments' },
  { key: 'canPauseWrites', label: 'Pause Writes' },
] as const;
</script>

<template>
  <div class="card">
    <div class="flex items-start justify-between">
      <div class="flex items-start gap-4">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10 text-red-400 shrink-0 mt-0.5">
          <EngramIcon name="shield" :size="20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-white font-semibold">{{ guardian.name }}</h3>
            <span
              :class="[
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isActive
                  ? 'bg-green-900/40 text-green-300 border border-green-700/50'
                  : 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
              ]"
            >
              {{ isActive ? 'Active' : 'Pending' }}
            </span>
          </div>
          <p class="text-gray-500 text-xs font-mono mt-1">{{ guardian.principal.toText() }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="p in permissionLabels"
              :key="p.key"
              :class="[
                'text-xs font-medium px-2 py-0.5 rounded-sm border',
                (guardian.permissions as any)[p.key]
                  ? 'bg-green-900/60 text-green-300 border-green-700/50'
                  : 'bg-gray-800 text-gray-500 border-gray-700',
              ]"
            >
              {{ p.label }}
            </span>
          </div>
          <p class="text-gray-600 text-xs mt-2">Added {{ formattedDate }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="isPending"
          class="text-sm text-engram-400 hover:text-engram-300 transition-colors font-medium"
          @click="emit('approve')"
        >
          Approve
        </button>
        <button
          v-if="isActive"
          class="text-sm text-red-400 hover:text-red-300 transition-colors"
          @click="emit('remove')"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>
