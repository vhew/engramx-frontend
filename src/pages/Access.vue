<script setup lang="ts">
import { ref, inject, watch, computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OperatorCard from '../components/OperatorCard.vue';
import GuardianCard from '../components/GuardianCard.vue';
import InviteCodeDisplay from '../components/InviteCodeDisplay.vue';
import EmergencyActions from '../components/EmergencyActions.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/EmptyState.vue';
import EngramIcon from '../components/icons/EngramIcons.vue';
import { useOperatorInvite } from '../composables/useOperatorInvite';
import { useGuardianInvite } from '../composables/useGuardianInvite';

const route = useRoute();
const router = useRouter();
const engramActor = inject<Ref<any>>('engramActor')!;
const engram = inject<Ref<any>>('engram')!;
const engramCanisterId = computed(
  () =>
    engram.value?.canisterId?.toText?.() || engram.value?.canisterId?.toString() || '<canister-id>',
);

const activeTab = computed({
  get: () => (route.query.tab === 'guardians' ? 'guardians' : 'operators'),
  set: (val: string) => router.replace({ query: val === 'operators' ? {} : { tab: val } }),
});

const error = ref<string | null>(null);

// === Operators state ===
const operators = ref<any[]>([]);
const operatorsLoading = ref(true);
const invite = useOperatorInvite(engramActor, engramCanisterId);
const pairCommand = computed(
  () => `npx @engramx/client pair ${invite.inviteCode.value} --engram ${engramCanisterId.value}`,
);

// === Guardians state ===
const guardians = ref<any[]>([]);
const guardiansLoading = ref(true);
const guardianInvite = useGuardianInvite(engramActor, engramCanisterId);
const showInviteForm = ref(false);
const newGuardianName = ref('');
const newPermissions = ref({
  canRevokeOperators: true,
  canFreezePayments: true,
  canPauseWrites: true,
});

// === Emergency actions state ===
const paymentsFrozen = ref(false);
const writesPaused = ref(false);
const operatorSummaries = ref<{ principal: any; name: string; status: any }[]>([]);

watch(
  engramActor,
  (actor) => {
    if (actor) {
      loadOperators();
      loadGuardians();
      loadStatus();
    }
  },
  { immediate: true },
);

// Auto-refresh guardian list when a guardian accepts the invite
watch(
  () => guardianInvite.accepted.value,
  (isAccepted) => {
    if (isAccepted) loadGuardians();
  },
);

// === Operators logic ===
async function loadOperators() {
  operatorsLoading.value = true;
  try {
    operators.value = await engramActor.value.listOperators();
  } finally {
    operatorsLoading.value = false;
  }
}

async function handleCreateInvite() {
  error.value = null;
  await invite.createInvite('operator');
  if (invite.inviteError.value) {
    error.value = invite.inviteError.value;
  }
}

async function revokeOperator(principal: any) {
  if (!confirm('Revoke this operator? This cannot be undone.')) return;
  try {
    const result = await engramActor.value.revokeOperator(principal);
    if ('Err' in result) {
      error.value = result.Err;
    } else {
      await loadOperators();
      await loadOperatorSummaries();
    }
  } catch (err: any) {
    error.value = err.message;
  }
}

function formatTimestamp(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleString();
}

function getStatusString(status: any): string {
  if ('Active' in status) return 'Active';
  if ('Revoked' in status) return 'Revoked';
  if ('Expired' in status) return 'Expired';
  return 'Unknown';
}

// === Guardians logic ===
async function loadGuardians() {
  guardiansLoading.value = true;
  try {
    guardians.value = await engramActor.value.listGuardians();
  } catch {
    guardians.value = [];
  } finally {
    guardiansLoading.value = false;
  }
}

async function handleCreateGuardianInvite() {
  if (!newGuardianName.value.trim()) return;
  error.value = null;
  await guardianInvite.createInvite(newGuardianName.value.trim(), newPermissions.value);
  if (guardianInvite.inviteError.value) {
    error.value = guardianInvite.inviteError.value;
  } else {
    showInviteForm.value = false;
    newGuardianName.value = '';
    newPermissions.value = {
      canRevokeOperators: true,
      canFreezePayments: true,
      canPauseWrites: true,
    };
  }
}

async function approveGuardian(principal: any) {
  error.value = null;
  try {
    const result = await engramActor.value.approveGuardian(principal);
    if ('Err' in result) {
      error.value = result.Err;
    } else {
      await loadGuardians();
    }
  } catch (err: any) {
    error.value = err.message;
  }
}

async function removeGuardian(principal: any) {
  if (!confirm('Remove this guardian? This cannot be undone.')) return;
  try {
    const result = await engramActor.value.removeGuardian(principal);
    if ('Err' in result) {
      error.value = result.Err;
    } else {
      await loadGuardians();
    }
  } catch (err: any) {
    error.value = err.message;
  }
}

// === Status / Emergency actions ===
async function loadStatus() {
  try {
    const s = await engramActor.value.status();
    paymentsFrozen.value = s.paymentsFrozen;
    writesPaused.value = s.writesPaused;
  } catch {
    // ignore — status may fail if engram not yet created
  }
  await loadOperatorSummaries();
}

async function loadOperatorSummaries() {
  try {
    operatorSummaries.value = await engramActor.value.listOperatorsForGuardian();
  } catch {
    operatorSummaries.value = [];
  }
}

async function handleEmergencyRefresh() {
  await loadStatus();
  await loadOperators();
}
</script>

<template>
  <div v-if="!engramActor" class="max-w-5xl mx-auto px-4 py-8">
    <p class="text-gray-400">No engram connected.</p>
  </div>

  <div v-else class="max-w-5xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-6">Access Control</h1>

    <!-- Emergency Actions (visible on all tabs) -->
    <div class="mb-6">
      <EmergencyActions
        :actor="engramActor"
        :is-owner="true"
        :permissions="{ canRevokeOperators: true, canFreezePayments: true, canPauseWrites: true }"
        :payments-frozen="paymentsFrozen"
        :writes-paused="writesPaused"
        :operators="operatorSummaries"
        @refresh="handleEmergencyRefresh"
      />
    </div>

    <!-- Tab Bar -->
    <div class="flex border-b border-gray-800 mb-6">
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'operators'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'operators'"
      >
        Operators
      </button>
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'guardians'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'guardians'"
      >
        Guardians
      </button>
    </div>

    <div v-if="error" class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400">
      {{ error }}
    </div>

    <!-- Operators Tab -->
    <div v-if="activeTab === 'operators'">
      <div v-if="operators.length > 0" class="flex justify-end mb-6">
        <button
          class="btn-primary inline-flex items-center gap-2"
          :disabled="invite.creating.value"
          @click="handleCreateInvite"
        >
          <EngramIcon name="plus" :size="16" />
          {{ invite.creating.value ? 'Creating...' : 'Create Invite' }}
        </button>
      </div>

      <!-- Invite Code Display -->
      <InviteCodeDisplay
        v-if="invite.inviteCode.value"
        class="mb-6"
        :invite-code="invite.inviteCode.value"
        :countdown-text="invite.countdownText.value"
        :seconds-left="invite.inviteSecondsLeft.value"
        :pair-command="pairCommand"
        @copy="invite.copyPairCommand"
        @dismiss="invite.dismiss"
      />

      <!-- Operator List -->
      <LoadingSpinner v-if="operatorsLoading" label="Loading operators..." />
      <EmptyState
        v-else-if="operators.length === 0"
        icon="users"
        title="No operators registered"
        description="Create an invite code and use it to register your agent host machine."
        action-label="Create Invite"
        @action="handleCreateInvite"
      />
      <div v-else class="space-y-4">
        <OperatorCard
          v-for="op in operators"
          :key="op.principal.toText()"
          :name="op.name"
          :principal="op.principal.toText()"
          :status="getStatusString(op.status)"
          :last-seen="formatTimestamp(op.lastSeen)"
          :registered-at="formatTimestamp(op.registeredAt)"
          @revoke="revokeOperator(op.principal)"
          @edit-permissions="
            () => {
              /* TODO: permissions editor modal */
            }
          "
        />
      </div>
    </div>

    <!-- Guardians Tab -->
    <div v-if="activeTab === 'guardians'">
      <div
        v-if="guardians.length > 0 || guardianInvite.inviteCode.value"
        class="flex justify-end mb-6"
      >
        <button
          class="btn-primary inline-flex items-center gap-2"
          :disabled="guardianInvite.creating.value"
          @click="showInviteForm = true"
        >
          <EngramIcon name="plus" :size="16" />
          {{ guardianInvite.creating.value ? 'Creating...' : 'Create Guardian Invite' }}
        </button>
      </div>

      <!-- Create Guardian Invite Form -->
      <div v-if="showInviteForm && !guardianInvite.inviteCode.value" class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Create Guardian Invite</h2>
        <div class="space-y-3">
          <input
            v-model="newGuardianName"
            type="text"
            placeholder="Guardian name (e.g., 'Alice')"
            class="input w-full"
          />
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label class="flex items-center gap-2 text-sm text-gray-300 py-1">
              <input
                type="checkbox"
                v-model="newPermissions.canRevokeOperators"
                class="rounded-sm w-5 h-5"
              />
              Revoke Operators
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-300 py-1">
              <input
                type="checkbox"
                v-model="newPermissions.canFreezePayments"
                class="rounded-sm w-5 h-5"
              />
              Freeze Payments
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-300 py-1">
              <input
                type="checkbox"
                v-model="newPermissions.canPauseWrites"
                class="rounded-sm w-5 h-5"
              />
              Pause Writes
            </label>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              class="btn-primary flex-1 sm:flex-none"
              :disabled="guardianInvite.creating.value || !newGuardianName.trim()"
              @click="handleCreateGuardianInvite"
            >
              {{ guardianInvite.creating.value ? 'Creating...' : 'Create Invite' }}
            </button>
            <button class="btn-secondary flex-1 sm:flex-none" @click="showInviteForm = false">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Guardian Invite Link Display -->
      <div
        v-if="guardianInvite.inviteCode.value"
        class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6"
      >
        <div class="flex items-center justify-between mb-2">
          <span
            class="text-lg font-semibold"
            :class="guardianInvite.accepted.value ? 'text-green-400' : 'text-engram-400'"
          >
            {{ guardianInvite.accepted.value ? 'Guardian Accepted' : 'Guardian Invite Ready' }}
          </span>
          <span
            :class="[
              'text-sm font-mono',
              guardianInvite.inviteSecondsLeft.value <= 300 ? 'text-red-400' : 'text-gray-400',
            ]"
          >
            Expires in {{ guardianInvite.countdownText.value }}
          </span>
        </div>

        <!-- Accepted state -->
        <div
          v-if="guardianInvite.accepted.value"
          class="flex items-center gap-2 text-green-400 text-sm mb-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>A guardian has accepted this invite. Approve them below to activate.</span>
        </div>

        <!-- Waiting state -->
        <div v-else>
          <p class="text-gray-400 text-sm mb-2">Send this link to the guardian:</p>
          <code class="text-gray-300 text-sm block bg-gray-900 rounded-sm px-3 py-2 break-all">{{
            guardianInvite.inviteLink.value
          }}</code>
          <div class="flex items-center gap-3 mt-3">
            <button class="btn-secondary text-sm" @click="guardianInvite.copyInviteLink">
              Copy Link
            </button>
            <span class="text-gray-500 text-xs flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse"></span>
              Waiting for guardian to accept...
            </span>
          </div>
        </div>
      </div>

      <!-- Guardian List -->
      <LoadingSpinner v-if="guardiansLoading" label="Loading guardians..." />
      <EmptyState
        v-else-if="guardians.length === 0"
        icon="shield"
        title="No guardians added"
        description="Guardians can freeze payments, pause writes, and revoke operators in emergencies."
        action-label="Create Guardian Invite"
        @action="showInviteForm = true"
      />
      <div v-else class="space-y-4">
        <GuardianCard
          v-for="g in guardians"
          :key="g.principal.toText()"
          :guardian="g"
          @remove="removeGuardian(g.principal)"
          @approve="approveGuardian(g.principal)"
        />
      </div>
    </div>
  </div>
</template>
