<script setup lang="ts">
import { ref, inject, watch, computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Principal } from '@icp-sdk/core/principal';
import { useAuth } from '../composables/useAuth';
import { createAgent, createManagementActor, REGISTRY_CANISTER_ID } from '../lib/actor';
import AuditEntryRow from '../components/AuditEntry.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/EmptyState.vue';
import EngramIcon from '../components/icons/EngramIcons.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const registryActor = inject<Ref<any>>('registryActor')!;
const engramActor = inject<Ref<any>>('engramActor')!;
const engram = inject<Ref<any>>('engram')!;
const engramCanisterId = computed(() => engram.value?.canisterId?.toText?.() || engram.value?.canisterId?.toString() || null);

const activeTab = computed({
  get: () => (route.query.tab === 'audit' ? 'audit' : 'updates'),
  set: (val: string) => router.replace({ query: val === 'updates' ? {} : { tab: val } }),
});

// Shared error/success (only one tab visible at a time)
const error = ref<string | null>(null);
const success = ref<string | null>(null);

// === Updates sub-tab state ===
const updatesSubTab = ref<'changelog' | 'sovereignty'>('changelog');

// Upgrade state
const upgrading = ref(false);
const engramWasmHash = ref<string | null>(null);
const registryWasmHash = ref<string | null>(null);
const updateAvailable = computed(() =>
  engramWasmHash.value && registryWasmHash.value && engramWasmHash.value !== registryWasmHash.value
);

// Changelog state
const changelogEntries = ref<any[]>([]);
const changelogLoading = ref(true);

// Sovereignty state
const sovereigntyStatus = ref<string | null>(null);
const sovereigntyLoading = ref(true);
const actionLoading = ref(false);

// Confirmation modal
const showConfirmModal = ref(false);
const confirmAction = ref<'claim' | 'return' | null>(null);

// === Audit state ===
const entries = ref<any[]>([]);
const total = ref(0);
const page = ref(0);
const auditLoading = ref(true);
const filterOp = ref('');
const pageSize = 50;

// === Data loading ===

watch(registryActor, (actor) => {
  if (actor) {
    loadChangelog();
    loadSovereignty();
    checkForUpdates();
  }
}, { immediate: true });

watch(engramActor, (actor) => {
  if (actor) loadEntries();
}, { immediate: true });

watch(page, () => {
  if (engramActor.value) loadEntries();
});

// === Updates logic ===

async function loadChangelog() {
  changelogLoading.value = true;
  try {
    const result = await registryActor.value.getChangelog();
    changelogEntries.value = [...result].reverse();
  } catch (e) {
    console.warn('Failed to load changelog:', e);
  } finally {
    changelogLoading.value = false;
  }
}

async function loadSovereignty() {
  sovereigntyLoading.value = true;
  try {
    const statusResult = await registryActor.value.getSovereigntyStatus();
    if ('Managed' in statusResult) sovereigntyStatus.value = 'Managed';
    else if ('Sovereign' in statusResult) sovereigntyStatus.value = 'Sovereign';
    else sovereigntyStatus.value = 'Unknown';
  } catch (e) {
    console.warn('Failed to load sovereignty status:', e);
  } finally {
    sovereigntyLoading.value = false;
  }
}

async function checkForUpdates() {
  try {
    if (!auth.identity.value || !engramCanisterId.value) return;

    // Get the registry's stored hash (what the latest WASM should be)
    const registryHash = await registryActor.value.getEngramWasmHash();
    registryWasmHash.value = registryHash;

    // Get the engram's actual on-chain module hash via IC management canister
    const agent = createAgent(auth.identity.value);
    const mgmt = createManagementActor(agent);
    const statusResult = await mgmt.canister_status({
      canister_id: Principal.fromText(engramCanisterId.value),
    }) as any;

    if (statusResult.module_hash && statusResult.module_hash.length > 0) {
      const hashBytes = new Uint8Array(statusResult.module_hash[0]);
      const hashHex = Array.from(hashBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
      engramWasmHash.value = hashHex;
    } else {
      engramWasmHash.value = null;
    }
  } catch {
    // Can't determine versions — don't block UI
  }
}

async function upgradeMyEngram() {
  upgrading.value = true;
  error.value = null;
  success.value = null;
  try {
    const result = await registryActor.value.upgradeMyEngram();
    if ('Ok' in result) {
      success.value = 'Engram upgraded to latest version. Reload the page to use new features.';
      await checkForUpdates();
    } else {
      error.value = 'Upgrade failed: ' + result.Err;
    }
  } catch (e: any) {
    error.value = 'Upgrade failed: ' + (e.message || String(e));
  } finally {
    upgrading.value = false;
  }
}

function requestClaimSovereignty() {
  confirmAction.value = 'claim';
  showConfirmModal.value = true;
}

function requestReturnToManaged() {
  confirmAction.value = 'return';
  showConfirmModal.value = true;
}

async function executeConfirmedAction() {
  showConfirmModal.value = false;
  actionLoading.value = true;
  error.value = null;
  success.value = null;

  try {
    if (confirmAction.value === 'claim') {
      const result = await registryActor.value.claimSovereignty();
      if ('Ok' in result) {
        success.value = 'Sovereignty claimed. Registry removed as controller. Auto-updates disabled.';
        await loadSovereignty();
      } else {
        error.value = result.Err;
      }
    } else if (confirmAction.value === 'return') {
      // Step 1: Add registry back as controller via IC Management Canister
      try {
        if (!auth.identity.value || !engramCanisterId.value) {
          error.value = 'Not authenticated or engram not available.';
          return;
        }
        const agent = createAgent(auth.identity.value);
        const mgmt = createManagementActor(agent);
        const canisterPrincipal = Principal.fromText(engramCanisterId.value);
        const registryPrincipal = Principal.fromText(REGISTRY_CANISTER_ID);
        const ownerPrincipal = auth.identity.value.getPrincipal();

        // Get current status to preserve the engram's self-controller
        const statusResult = await mgmt.canister_status({ canister_id: canisterPrincipal }) as any;
        const currentControllers: Principal[] = statusResult.settings.controllers;

        // Build new controller list: current controllers + registry (deduped)
        const controllerTexts = new Set(currentControllers.map((c: Principal) => c.toText()));
        controllerTexts.add(registryPrincipal.toText());
        controllerTexts.add(ownerPrincipal.toText());
        const newControllers = Array.from(controllerTexts).map((t) => Principal.fromText(t));

        await mgmt.update_settings({
          canister_id: canisterPrincipal,
          settings: {
            controllers: [newControllers],
            compute_allocation: [],
            memory_allocation: [],
            freezing_threshold: [],
          },
        });
      } catch (e: any) {
        error.value = 'Failed to update controllers: ' + (e.message || String(e));
        return;
      }

      // Step 2: Tell the registry to verify and reset update preference
      try {
        const result = await registryActor.value.returnToManaged();
        if ('Ok' in result) {
          success.value = 'Returned to managed mode. Registry restored as controller and auto-updates re-enabled.';
          await loadSovereignty();
        } else {
          error.value = 'Controllers updated, but registry confirmation failed: ' + result.Err;
        }
      } catch (e: any) {
        error.value = 'Controllers updated, but registry confirmation failed: ' + (e.message || String(e));
      }
    }
  } catch (e: any) {
    error.value = e.message;
  } finally {
    actionLoading.value = false;
    confirmAction.value = null;
  }
}

// === Audit logic ===

async function loadEntries() {
  auditLoading.value = true;
  try {
    const size = await engramActor.value.auditLogSize();
    total.value = Number(size);
    entries.value = await engramActor.value.readAuditLog(BigInt(page.value * pageSize), BigInt(pageSize));
  } finally {
    auditLoading.value = false;
  }
}

// === Helpers ===

function formatDateShort(nanos: bigint | number): string {
  return new Date(Number(nanos) / 1_000_000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTimestamp(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleString();
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function getRoleString(role: any): string {
  if ('Owner' in role) return 'Owner';
  if ('Operator' in role) return 'Operator';
  return 'Unknown';
}
</script>

<template>
  <div v-if="!registryActor && !engramActor" class="max-w-5xl mx-auto px-4 py-8">
    <p class="text-gray-400">No registry connected.</p>
  </div>

  <div v-else class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-6">System</h1>

    <!-- Update available banner (above tabs) -->
    <div v-if="updateAvailable" class="bg-engram-900/20 border border-engram-700/50 rounded-lg p-4 mb-6 flex items-center justify-between gap-4">
      <div>
        <p class="text-engram-300 text-sm font-medium">A new engram version is available</p>
        <p class="text-gray-500 text-xs mt-1">
          Current: {{ engramWasmHash?.slice(0, 12) }}...
          &rarr; Latest: {{ registryWasmHash?.slice(0, 12) }}...
        </p>
      </div>
      <button
        class="btn-primary text-sm shrink-0"
        :disabled="upgrading"
        @click="upgradeMyEngram"
      >
        {{ upgrading ? 'Upgrading...' : 'Upgrade Now' }}
      </button>
    </div>

    <!-- Tab Bar -->
    <div class="flex border-b border-gray-800 mb-6">
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'updates'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'updates'"
      >
        Updates
      </button>
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'audit'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'audit'"
      >
        Audit Log
      </button>
    </div>

    <!-- Messages -->
    <div v-if="error" class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400">{{ error }}</div>
    <div v-if="success" class="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4 text-green-400">{{ success }}</div>

    <!-- Updates Tab -->
    <div v-if="activeTab === 'updates'" class="max-w-3xl mx-auto">
      <!-- Sub-tab bar (underline style) -->
      <div class="flex border-b border-gray-800 mb-6">
        <button
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
            updatesSubTab === 'changelog'
              ? 'border-engram-500 text-engram-400'
              : 'border-transparent text-gray-400 hover:text-white',
          ]"
          @click="updatesSubTab = 'changelog'"
        >
          Changelog
        </button>
        <button
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
            updatesSubTab === 'sovereignty'
              ? 'border-engram-500 text-engram-400'
              : 'border-transparent text-gray-400 hover:text-white',
          ]"
          @click="updatesSubTab = 'sovereignty'"
        >
          Sovereignty
        </button>
      </div>

      <!-- Changelog Sub-tab -->
      <div v-if="updatesSubTab === 'changelog'">
        <div v-if="changelogLoading" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else-if="changelogEntries.length === 0" class="card text-center py-12">
          <p class="text-gray-500">No changelog entries yet.</p>
        </div>
        <div v-else class="space-y-4">
          <div v-for="entry in changelogEntries" :key="entry.version" class="card">
            <div class="flex items-center gap-3 mb-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                v{{ entry.version }}
              </span>
              <span class="text-sm text-gray-500">{{ formatDateShort(entry.timestamp) }}</span>
            </div>
            <p class="text-gray-300 text-sm whitespace-pre-wrap mb-3">{{ entry.releaseNotes }}</p>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>WASM:</span>
              <code class="font-mono">{{ truncateHash(entry.wasmHash) }}</code>
              <button
                class="text-gray-500 hover:text-white transition-colors"
                title="Copy full hash"
                @click="copyToClipboard(entry.wasmHash)"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sovereignty Sub-tab -->
      <div v-if="updatesSubTab === 'sovereignty'">
        <div v-if="sovereigntyLoading" class="flex justify-center py-12">
          <LoadingSpinner />
        </div>
        <div v-else>
          <!-- Status Display -->
          <div class="card mb-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-sm text-gray-500">Status</span>
              <span v-if="sovereigntyStatus === 'Managed'"
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                Managed
              </span>
              <span v-else-if="sovereigntyStatus === 'Sovereign'"
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">
                Sovereign
              </span>
              <span v-else
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
                Unknown
              </span>
            </div>

            <!-- Managed Mode -->
            <div v-if="sovereigntyStatus === 'Managed'">
              <p class="text-sm text-gray-400 mb-4">
                Your engram is managed by the registry. The registry can push WASM upgrades to keep your engram up to date.
                You can claim sovereignty at any time to take full control and disable auto-updates.
              </p>

              <div class="pt-4 border-t border-gray-800">
                <button
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
                  :disabled="actionLoading"
                  @click="requestClaimSovereignty"
                >
                  {{ actionLoading ? 'Processing...' : 'Claim Sovereignty' }}
                </button>
                <p class="text-xs text-gray-500 mt-2">
                  Removes the registry as a controller of your engram. You will be the sole controller.
                  Auto-updates will be disabled. You can return to managed mode later.
                </p>
              </div>
            </div>

            <!-- Sovereign Mode -->
            <div v-else-if="sovereigntyStatus === 'Sovereign'">
              <p class="text-sm text-gray-400 mb-4">
                Your engram is sovereign. You are the sole controller. The registry cannot push upgrades
                or modify your engram. To receive auto-updates again, return to managed mode.
              </p>

              <div class="pt-4 border-t border-gray-800">
                <button
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                  :disabled="actionLoading"
                  @click="requestReturnToManaged"
                >
                  {{ actionLoading ? 'Processing...' : 'Return to Managed' }}
                </button>
                <p class="text-xs text-gray-500 mt-2">
                  Adds the registry back as a controller alongside you and re-enables auto-updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Log Tab -->
    <div v-if="activeTab === 'audit'">
      <div class="flex justify-between items-center mb-4">
        <span class="text-gray-500 text-sm">{{ total }} total entries</span>
      </div>

      <!-- Filter -->
      <div class="mb-4 relative max-w-md">
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
          <EngramIcon name="search" :size="16" />
        </div>
        <input
          v-model="filterOp"
          type="text"
          placeholder="Filter by operation (e.g., memory.append)"
          class="input pl-9"
        />
      </div>

      <!-- Table (desktop) -->
      <div class="hidden md:block card overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-800">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Caller</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operation</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="auditLoading">
              <td colspan="7" class="px-4 py-8 text-center">
                <LoadingSpinner label="Loading audit entries..." />
              </td>
            </tr>
            <template v-else>
              <template v-for="entry in entries" :key="Number(entry.id)">
                <AuditEntryRow
                  v-if="!filterOp || entry.operation.toLowerCase().includes(filterOp.toLowerCase())"
                  :id="Number(entry.id)"
                  :timestamp="formatTimestamp(entry.timestamp)"
                  :caller="entry.caller.toText()"
                  :caller-role="getRoleString(entry.callerRole)"
                  :operation="entry.operation"
                  :details="entry.details"
                  :success="entry.success"
                />
              </template>
              <tr v-if="!auditLoading && entries.length === 0">
                <td colspan="7">
                  <EmptyState
                    icon="shield"
                    title="No audit entries"
                    description="Audit log entries will appear here as engram operations are performed."
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Cards (mobile) -->
      <div class="md:hidden">
        <LoadingSpinner v-if="auditLoading" label="Loading audit entries..." />
        <EmptyState
          v-else-if="entries.length === 0"
          icon="shield"
          title="No audit entries"
          description="Audit log entries will appear here as engram operations are performed."
        />
        <div v-else class="space-y-3">
          <template v-for="entry in entries" :key="Number(entry.id)">
            <div
              v-if="!filterOp || entry.operation.toLowerCase().includes(filterOp.toLowerCase())"
              :class="['card border-l-4', entry.success ? 'border-l-green-600' : 'border-l-red-600']"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-medium text-white text-sm">{{ entry.operation }}</span>
                <span :class="entry.success ? 'text-green-400' : 'text-red-400'" class="text-xs font-medium">
                  {{ entry.success ? 'OK' : 'FAIL' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mb-1">
                <span :class="getRoleString(entry.callerRole) === 'Owner' ? 'text-blue-400' : 'text-purple-400'">
                  {{ getRoleString(entry.callerRole) }}
                </span>
                &middot; {{ formatTimestamp(entry.timestamp) }}
              </div>
              <p v-if="entry.details" class="text-sm text-gray-400 break-all">{{ entry.details }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex justify-center gap-2 mt-4">
        <button
          class="btn-secondary text-sm"
          :disabled="page === 0"
          @click="page = Math.max(0, page - 1)"
        >
          Previous
        </button>
        <span class="text-gray-400 text-sm py-2">
          Page {{ page + 1 }} of {{ Math.ceil(total / pageSize) }}
        </span>
        <button
          class="btn-secondary text-sm"
          :disabled="(page + 1) * pageSize >= total"
          @click="page = page + 1"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="showConfirmModal = false" />
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-3">
            {{ confirmAction === 'claim' ? 'Claim Sovereignty?' : 'Return to Managed?' }}
          </h3>
          <p class="text-sm text-gray-400 mb-6">
            <template v-if="confirmAction === 'claim'">
              This will remove the registry as a controller of your engram. You will be the sole controller and will
              no longer receive automatic upgrades. You can reverse this later by returning to managed mode.
            </template>
            <template v-else>
              This will add the registry back as a controller of your engram, allowing it to push WASM upgrades.
              You will remain a controller alongside the registry.
            </template>
          </p>
          <div class="flex gap-3 justify-end">
            <button
              class="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              @click="showConfirmModal = false"
            >
              Cancel
            </button>
            <button
              :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                confirmAction === 'claim'
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : 'bg-green-600 text-white hover:bg-green-500']"
              @click="executeConfirmedAction"
            >
              {{ confirmAction === 'claim' ? 'Claim Sovereignty' : 'Return to Managed' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
