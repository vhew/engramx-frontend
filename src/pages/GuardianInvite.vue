<script setup lang="ts">
import { ref, computed, inject, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useGuardianSession } from '../composables/useGuardianSession';
import { createAgent, createEngramActor } from '../lib/actor';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const guardianSession = useGuardianSession();
const refreshGuardianStatus = inject<() => Promise<void>>('refreshGuardianStatus')!;

const engramCanisterId = computed(() => (route.query.engram as string) || '');
const inviteCode = computed(() => (route.query.code as string) || '');

const accepting = ref(false);
const accepted = ref(false);
const approved = ref(false);
const error = ref<string | null>(null);

const isValid = computed(() => engramCanisterId.value && inviteCode.value);

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function acceptInvite() {
  if (!auth.identity.value || !engramCanisterId.value || !inviteCode.value) return;
  accepting.value = true;
  error.value = null;
  try {
    const agent = createAgent(auth.identity.value);
    const actor = createEngramActor(agent, engramCanisterId.value);
    const result = (await actor.acceptGuardianInvite!(inviteCode.value)) as Record<string, any>;
    if ('Ok' in result) {
      guardianSession.addGuardianEngram(engramCanisterId.value);
      accepted.value = true;
      await refreshGuardianStatus();
      startPolling();
    } else {
      error.value = result.Err as string;
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    accepting.value = false;
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const agent = createAgent(auth.identity.value!);
      const actor = createEngramActor(agent, engramCanisterId.value);
      const result = (await actor.checkGuardianStatus!()) as Record<string, any>;
      if ('Ok' in result && 'Active' in result.Ok.status) {
        approved.value = true;
        stopPolling();
        await refreshGuardianStatus();
        router.push('/guardian');
      }
    } catch {
      /* ignore polling errors */
    }
  }, 5000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onUnmounted(stopPolling);
</script>

<template>
  <div class="max-w-xl mx-auto px-4 py-16">
    <div class="card text-center">
      <!-- Invalid link -->
      <div v-if="!isValid">
        <h1 class="text-2xl font-bold text-white mb-3">Invalid Invite Link</h1>
        <p class="text-gray-400">This guardian invite link is missing required parameters.</p>
      </div>

      <!-- Not authenticated -->
      <div v-else-if="!auth.isAuthenticated.value">
        <h1 class="text-2xl font-bold text-white mb-3">Guardian Invite</h1>
        <p class="text-gray-400 mb-2">You've been invited as a guardian for engram:</p>
        <p class="text-engram-400 font-mono text-sm mb-6 break-all">{{ engramCanisterId }}</p>
        <p class="text-gray-400 mb-6">
          Please log in with Internet Identity to accept this invitation.
        </p>
        <button class="btn-primary" :disabled="auth.isLoading.value" @click="auth.login">
          {{ auth.isLoading.value ? 'Logging in...' : 'Log in to Accept' }}
        </button>
      </div>

      <!-- Accepted — waiting for approval -->
      <div v-else-if="accepted && !approved">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <div class="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
          </div>
        </div>
        <h1 class="text-2xl font-bold text-white mb-3">Pending Approval</h1>
        <p class="text-gray-400 mb-2">Your guardian request has been submitted for engram:</p>
        <p class="text-engram-400 font-mono text-sm mb-4 break-all">{{ engramCanisterId }}</p>
        <p class="text-gray-500 text-sm">Checking for approval...</p>
      </div>

      <!-- Approved — redirecting -->
      <div v-else-if="approved">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              class="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h1 class="text-2xl font-bold text-white mb-3">Approved!</h1>
        <p class="text-gray-400">Redirecting to Guardian Dashboard...</p>
      </div>

      <!-- Ready to accept -->
      <div v-else>
        <h1 class="text-2xl font-bold text-white mb-3">Guardian Invite</h1>
        <p class="text-gray-400 mb-2">You've been invited as a guardian for engram:</p>
        <p class="text-engram-400 font-mono text-sm mb-6 break-all">{{ engramCanisterId }}</p>
        <p class="text-gray-500 text-sm mb-6">
          As a guardian, you'll be able to perform emergency operations like freezing payments,
          pausing writes, and revoking operators.
        </p>

        <div
          v-if="error"
          class="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-4"
        >
          {{ error }}
        </div>

        <button class="btn-primary" :disabled="accepting" @click="acceptInvite">
          {{ accepting ? 'Accepting...' : 'Accept Invite' }}
        </button>
      </div>
    </div>
  </div>
</template>
