<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  actor: any;
  isOwner: boolean;
  permissions: {
    canRevokeOperators: boolean;
    canFreezePayments: boolean;
    canPauseWrites: boolean;
  };
  paymentsFrozen: boolean;
  writesPaused: boolean;
  operators?: { principal: any; name: string; status: any }[];
}>();

const emit = defineEmits<{ refresh: [] }>();

const loading = ref<string | null>(null);
const error = ref<string | null>(null);
const selectedOperator = ref<any>(null);

const activeOperators = computed(() =>
  (props.operators || []).filter((op) => 'Active' in op.status),
);

async function freezePayments() {
  if (!confirm('Freeze all payments on this engram? Only the owner can unfreeze.')) return;
  loading.value = 'freeze';
  error.value = null;
  try {
    const result = await props.actor.guardianFreezePayments();
    if ('Err' in result) error.value = result.Err;
    else emit('refresh');
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = null;
  }
}

async function pauseWrites() {
  if (!confirm('Pause all writes on this engram? Only the owner can resume.')) return;
  loading.value = 'pause';
  error.value = null;
  try {
    const result = await props.actor.guardianPauseWrites();
    if ('Err' in result) error.value = result.Err;
    else emit('refresh');
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = null;
  }
}

async function unfreezePayments() {
  if (!confirm('Unfreeze payments?')) return;
  loading.value = 'unfreeze';
  error.value = null;
  try {
    const result = await props.actor.unfreezePayments();
    if ('Err' in result) error.value = result.Err;
    else emit('refresh');
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = null;
  }
}

async function resumeWrites() {
  if (!confirm('Resume writes?')) return;
  loading.value = 'resume';
  error.value = null;
  try {
    const result = await props.actor.resumeWrites();
    if ('Err' in result) error.value = result.Err;
    else emit('refresh');
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = null;
  }
}

async function revokeOperator() {
  if (!selectedOperator.value) return;
  const name =
    activeOperators.value.find(
      (op: any) => op.principal.toText() === selectedOperator.value.toText(),
    )?.name || 'this operator';
  if (!confirm(`Revoke ${name}? This cannot be undone.`)) return;
  loading.value = 'revoke';
  error.value = null;
  try {
    const fn = props.isOwner ? props.actor.revokeOperator : props.actor.guardianRevokeOperator;
    const result = await fn(selectedOperator.value);
    if ('Err' in result) error.value = result.Err;
    else {
      selectedOperator.value = null;
      emit('refresh');
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = null;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Status indicators -->
    <div class="flex flex-wrap gap-2">
      <span
        v-if="paymentsFrozen"
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-900/40 text-red-300 border border-red-700/50"
      >
        Payments Frozen
      </span>
      <span
        v-if="writesPaused"
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-700/50"
      >
        Writes Paused
      </span>
      <span
        v-if="!paymentsFrozen && !writesPaused"
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-900/40 text-green-300 border border-green-700/50"
      >
        All Systems Normal
      </span>
    </div>

    <div
      v-if="error"
      class="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm"
    >
      {{ error }}
    </div>

    <div class="flex flex-wrap gap-3">
      <!-- Freeze Payments -->
      <button
        v-if="permissions.canFreezePayments && !paymentsFrozen"
        class="btn-danger text-sm"
        :disabled="!!loading"
        @click="freezePayments"
      >
        {{ loading === 'freeze' ? 'Freezing...' : 'Freeze Payments' }}
      </button>

      <!-- Pause Writes -->
      <button
        v-if="permissions.canPauseWrites && !writesPaused"
        class="btn-danger text-sm"
        :disabled="!!loading"
        @click="pauseWrites"
      >
        {{ loading === 'pause' ? 'Pausing...' : 'Pause Writes' }}
      </button>

      <!-- Unfreeze Payments (owner only) -->
      <button
        v-if="isOwner && paymentsFrozen"
        class="btn-primary text-sm"
        :disabled="!!loading"
        @click="unfreezePayments"
      >
        {{ loading === 'unfreeze' ? 'Unfreezing...' : 'Unfreeze Payments' }}
      </button>

      <!-- Resume Writes (owner only) -->
      <button
        v-if="isOwner && writesPaused"
        class="btn-primary text-sm"
        :disabled="!!loading"
        @click="resumeWrites"
      >
        {{ loading === 'resume' ? 'Resuming...' : 'Resume Writes' }}
      </button>
    </div>

    <!-- Revoke Operator -->
    <div
      v-if="permissions.canRevokeOperators && activeOperators.length > 0"
      class="flex items-center gap-3"
    >
      <select v-model="selectedOperator" class="input text-sm flex-1">
        <option :value="null" disabled>Select operator to revoke...</option>
        <option v-for="op in activeOperators" :key="op.principal.toText()" :value="op.principal">
          {{ op.name }} ({{ op.principal.toText().slice(0, 10) }}...)
        </option>
      </select>
      <button
        class="btn-danger text-sm shrink-0"
        :disabled="!selectedOperator || !!loading"
        @click="revokeOperator"
      >
        {{ loading === 'revoke' ? 'Revoking...' : 'Revoke' }}
      </button>
    </div>
  </div>
</template>
