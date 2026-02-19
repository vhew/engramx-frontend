<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useGuardianSession } from '../composables/useGuardianSession';
import { createAgent, createEngramActor } from '../lib/actor';
import EmergencyActions from '../components/EmergencyActions.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const auth = useAuth();
const guardianSession = useGuardianSession();
const refreshGuardianStatus = inject<() => Promise<void>>('refreshGuardianStatus')!;

// Injected state from App.vue
const injectedActor = inject<Ref<any>>('guardianActor')!;
const injectedRecord = inject<Ref<any>>('guardianRecord')!;
const injectedCanisterId = inject<Ref<string | null>>('guardianCanisterId')!;

// Local fallback state (used when injected is null)
const localActor = ref<any>(null);
const localRecord = ref<any>(null);
const localCanisterId = ref<string | null>(null);

// Effective state — prefer injected, fall back to local
const actor = computed(() => injectedActor.value || localActor.value);
const record = computed(() => injectedRecord.value || localRecord.value);
const canisterId = computed(() => injectedCanisterId.value || localCanisterId.value);

const loading = ref(true);
const error = ref<string | null>(null);
const paymentsFrozen = ref(false);
const writesPaused = ref(false);
const operators = ref<{ principal: any; name: string; status: any }[]>([]);

async function loadGuardianFromStorage() {
  const identity = auth.identity.value;
  if (!identity) return;
  const stored = guardianSession.getGuardianEngrams();
  for (const entry of stored) {
    try {
      const agent = createAgent(identity);
      const a = createEngramActor(agent, entry.canisterId);
      const result = await a.checkGuardianStatus() as Record<string, any>;
      if ('Ok' in result) {
        localActor.value = a;
        localRecord.value = result.Ok;
        localCanisterId.value = entry.canisterId;
        return;
      }
    } catch {
      guardianSession.removeGuardianEngram(entry.canisterId);
    }
  }
}

async function loadData() {
  if (!actor.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const [statusResult, opsList] = await Promise.all([
      actor.value.status(),
      actor.value.listOperatorsForGuardian(),
    ]);
    paymentsFrozen.value = statusResult.paymentsFrozen;
    writesPaused.value = statusResult.writesPaused;
    operators.value = opsList;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// --- Approval polling while pending ---
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startApprovalPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const cid = canisterId.value;
      const identity = auth.identity.value;
      if (!cid || !identity) return;
      const agent = createAgent(identity);
      const a = createEngramActor(agent, cid);
      const result = await a.checkGuardianStatus() as Record<string, any>;
      if ('Ok' in result && 'Active' in result.Ok.status) {
        stopPolling();
        localRecord.value = result.Ok;
        localActor.value = a;
        await refreshGuardianStatus();
        await loadData();
      }
    } catch { /* ignore polling errors */ }
  }, 5000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

watch(record, (r) => {
  if (r && 'Pending' in r.status) {
    startApprovalPolling();
  } else {
    stopPolling();
  }
}, { immediate: true });

onMounted(async () => {
  if (!actor.value) {
    await loadGuardianFromStorage();
  }
  if (actor.value) {
    await loadData();
  } else {
    loading.value = false;
  }
});

// Also watch for injected state arriving later
watch(injectedActor, (a) => {
  if (a && !localActor.value) loadData();
});

onUnmounted(stopPolling);
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- No guardian session -->
    <div v-if="!actor" class="card text-center py-12">
      <h1 class="text-2xl font-bold text-white mb-3">Guardian Dashboard</h1>
      <p class="text-gray-400">You are not currently a guardian of any engram.</p>
      <p class="text-gray-500 text-sm mt-2">Ask an engram owner to send you a guardian invite link.</p>
    </div>

    <div v-else>
      <h1 class="text-3xl font-bold text-white mb-2">Guardian Dashboard</h1>
      <p class="text-gray-500 text-sm mb-6 font-mono">Engram: {{ canisterId }}</p>

      <!-- Pending state -->
      <div v-if="record && 'Pending' in record.status" class="card mb-6">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-700/50">
            <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
            Pending Approval
          </span>
          <span class="text-gray-400 text-sm">The engram owner needs to approve your guardianship before you can perform actions.</span>
        </div>
      </div>

      <!-- Active state -->
      <div v-else>
        <LoadingSpinner v-if="loading" label="Loading engram status..." />

        <div v-else-if="error" class="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">{{ error }}</div>

        <div v-else>
          <div class="card mb-6">
            <h2 class="text-lg font-semibold text-white mb-1">{{ record?.name || 'Guardian' }}</h2>
            <p class="text-gray-500 text-xs font-mono mb-4">{{ record?.principal?.toText?.() || '' }}</p>

            <h3 class="text-sm font-medium text-gray-400 mb-3">Emergency Actions</h3>
            <EmergencyActions
              :actor="actor"
              :is-owner="false"
              :permissions="record?.permissions || { canRevokeOperators: false, canFreezePayments: false, canPauseWrites: false }"
              :payments-frozen="paymentsFrozen"
              :writes-paused="writesPaused"
              :operators="operators"
              @refresh="loadData"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
