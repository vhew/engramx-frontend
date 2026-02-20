<script setup lang="ts">
import { computed } from 'vue';
import EngramIcon from './icons/EngramIcons.vue';

const props = defineProps<{
  backup: {
    backupId: string;
    dbType: string;
    backupType: { FullSnapshot?: null; PartialSnapshot?: null; IncrementalDiff?: null };
    parentBackupId: string[] | null;
    totalSize: bigint;
    chunkCount: bigint;
    sha256: string;
    createdAt: bigint;
    createdBy: any;
    backupLabel: string[] | null;
    status: { Uploading?: null; Finalized?: null; Failed?: null };
  };
  isOwner: boolean;
}>();

const emit = defineEmits<{
  delete: [];
  download: [];
}>();

const backupTypeLabel = computed(() => {
  if ('FullSnapshot' in props.backup.backupType) return 'Full';
  if ('PartialSnapshot' in props.backup.backupType) return 'Partial';
  return 'Incremental';
});

const backupTypeBadge = computed(() => {
  if ('FullSnapshot' in props.backup.backupType)
    return 'bg-blue-900/60 text-blue-300 border-blue-700/50';
  if ('PartialSnapshot' in props.backup.backupType)
    return 'bg-purple-900/60 text-purple-300 border-purple-700/50';
  return 'bg-amber-900/60 text-amber-300 border-amber-700/50';
});

const statusLabel = computed(() => {
  if ('Finalized' in props.backup.status) return 'Finalized';
  if ('Uploading' in props.backup.status) return 'Uploading';
  return 'Failed';
});

const statusColor = computed(() => {
  if ('Finalized' in props.backup.status)
    return 'bg-green-900/60 text-green-300 border-green-700/50';
  if ('Uploading' in props.backup.status)
    return 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50';
  return 'bg-red-900/60 text-red-300 border-red-700/50';
});

const formattedSize = computed(() => {
  const bytes = Number(props.backup.totalSize);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

const formattedDate = computed(() => {
  const ms = Number(props.backup.createdAt) / 1_000_000;
  return new Date(ms).toLocaleString();
});

const truncatedSha = computed(() => {
  const sha = props.backup.sha256;
  if (sha.length <= 16) return sha;
  return `${sha.slice(0, 8)}...${sha.slice(-8)}`;
});

const labelText = computed(() => {
  if (!props.backup.backupLabel) return null;
  if (Array.isArray(props.backup.backupLabel) && props.backup.backupLabel.length > 0)
    return props.backup.backupLabel[0];
  return null;
});
</script>

<template>
  <div class="card">
    <div class="flex items-start justify-between">
      <div class="flex items-start gap-4">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5"
        >
          <EngramIcon name="file" :size="20" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-white font-semibold font-mono text-sm">{{ backup.backupId }}</h3>
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-sm border', statusColor]">{{
              statusLabel
            }}</span>
          </div>
          <p class="text-gray-400 text-sm mt-1">
            {{ backup.dbType }}
            <span v-if="labelText" class="text-gray-500"> &mdash; {{ labelText }}</span>
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-sm border', backupTypeBadge]">{{
              backupTypeLabel
            }}</span>
            <span class="text-xs text-gray-500">{{ formattedSize }}</span>
            <span class="text-xs text-gray-500">{{ Number(backup.chunkCount) }} chunks</span>
            <span class="text-xs text-gray-500 font-mono" :title="backup.sha256">{{
              truncatedSha
            }}</span>
          </div>
          <p class="text-gray-600 text-xs mt-2">{{ formattedDate }}</p>
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button
          v-if="'Finalized' in backup.status"
          class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          @click="emit('download')"
        >
          Download
        </button>
        <button
          v-if="isOwner"
          class="text-sm text-red-400 hover:text-red-300 transition-colors"
          @click="emit('delete')"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
