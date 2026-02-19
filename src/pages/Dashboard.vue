<script setup lang="ts">
import { ref, inject, watch, type Ref } from 'vue';
import EngramIcon from '../components/icons/EngramIcons.vue';

const engram = inject<Ref<any>>('engram')!;
const engramActor = inject<Ref<any>>('engramActor')!;
const createEngramFn = inject<() => Promise<void>>('createEngram')!;

const status = ref<any>(null);
const creating = ref(false);
const error = ref<string | null>(null);

watch(engramActor, (actor) => {
  if (actor) {
    actor.status().then((s: any) => (status.value = s[0] || s)).catch((e: any) => console.warn('Failed to load status:', e));
  }
}, { immediate: true });

async function handleCreate() {
  creating.value = true;
  error.value = null;
  try {
    await createEngramFn();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    creating.value = false;
  }
}

const statCards = [
  { key: 'memoryFileCount', label: 'Memory Files', icon: 'file', color: 'bg-blue-500/10 text-blue-400' },
  { key: 'sessionCount', label: 'Sessions', icon: 'chat', color: 'bg-green-500/10 text-green-400' },
  { key: 'operatorCount', label: 'Operators', icon: 'users', color: 'bg-purple-500/10 text-purple-400' },
  { key: 'guardianCount', label: 'Guardians', icon: 'shield', color: 'bg-red-500/10 text-red-400' },
  { key: 'backupCount', label: 'Backups', icon: 'file', color: 'bg-cyan-500/10 text-cyan-400' },
  { key: 'auditLogSize', label: 'Audit Entries', icon: 'check-circle', color: 'bg-amber-500/10 text-amber-400' },
  { key: 'totalMemoryWrites', label: 'Memory Writes', icon: 'file', color: 'bg-orange-500/10 text-orange-400' },
  { key: 'totalSessionAppends', label: 'Session Messages', icon: 'chat', color: 'bg-teal-500/10 text-teal-400' },
];

const quickLinks = [
  { to: '/memory', label: 'Memory', desc: 'Browse files and session transcripts', icon: 'file' },
  { to: '/access', label: 'Access Control', desc: 'Manage operators and guardians', icon: 'users' },
  { to: '/billing', label: 'Billing', desc: 'Cycles balance, usage, and transfers', icon: 'zap' },
  { to: '/system', label: 'System', desc: 'Updates, backups, and audit log', icon: 'shield' },
];
</script>

<template>
  <div v-if="!engram" class="max-w-3xl mx-auto px-4 py-16 text-center">
    <div class="mb-6 text-gray-600">
      <EngramIcon name="shield" :size="64" class="mx-auto" />
    </div>
    <h1 class="text-3xl font-bold text-white mb-4">Welcome to EngramX</h1>
    <p class="text-gray-400 mb-8">
      You don't have an engram yet. Create one to get started.
    </p>
    <p v-if="error" class="text-red-400 mb-4">{{ error }}</p>
    <button class="btn-primary text-lg px-8 py-3" :disabled="creating" @click="handleCreate">
      {{ creating ? 'Creating...' : 'Create Engram' }}
    </button>
  </div>

  <div v-else class="max-w-5xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-8">Dashboard</h1>

    <!-- Engram Info -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Your Engram</h2>
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <span class="text-sm text-gray-500">Canister ID</span>
          <p class="text-gray-200 font-mono text-sm">
            {{ engram.canisterId?.toText?.() || engram.canisterId?.toString() || '' }}
          </p>
        </div>
        <div>
          <span class="text-sm text-gray-500">Status</span>
          <p><span class="badge-active">Active</span></p>
        </div>
      </div>
    </div>

    <!-- Status Banners -->
    <div v-if="status && status.paymentsFrozen" class="mb-4 rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 flex items-center gap-3">
      <EngramIcon name="x-circle" :size="20" class="text-red-400 shrink-0" />
      <span class="text-red-300 text-sm">Payments are frozen by a guardian.</span>
    </div>
    <div v-if="status && status.writesPaused" class="mb-4 rounded-lg bg-yellow-900/20 border border-yellow-800 px-4 py-3 flex items-center gap-3">
      <EngramIcon name="x-circle" :size="20" class="text-yellow-400 shrink-0" />
      <span class="text-yellow-300 text-sm">Writes are paused by a guardian.</span>
    </div>

    <!-- Stats -->
    <div v-if="status" class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 mb-8">
      <div v-for="s in statCards" :key="s.key" class="card">
        <div class="flex items-center gap-3">
          <div :class="['flex items-center justify-center w-10 h-10 rounded-lg', s.color]">
            <EngramIcon :name="s.icon" :size="20" />
          </div>
          <div>
            <span class="text-sm text-gray-500">{{ s.label }}</span>
            <p class="text-2xl font-bold text-white">{{ Number(status[s.key]) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="grid gap-3 md:grid-cols-2 md:gap-4">
      <router-link v-for="link in quickLinks" :key="link.to" :to="link.to" class="card-link">
        <div class="flex items-center gap-3 mb-1">
          <EngramIcon :name="link.icon" :size="18" class="text-engram-400 shrink-0" />
          <h3 class="text-lg font-semibold text-white">{{ link.label }}</h3>
        </div>
        <p class="text-gray-400 text-sm pl-[30px]">{{ link.desc }}</p>
      </router-link>
    </div>
  </div>
</template>
