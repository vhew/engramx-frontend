<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { useRegistry } from './composables/useRegistry';
import { useEngram } from './composables/useEngram';
import { useGuardianSession } from './composables/useGuardianSession';
import {
  createAgent,
  createEngramActor,
  createLedgerActor,
  createCkusdcLedgerActor,
  createCkusdtLedgerActor,
  createIcpIndexActor,
  createCkusdcIndexActor,
  createCkusdtIndexActor,
  createMinterActor,
} from './lib/actor';
import Navbar from './components/Navbar.vue';
import AppFooter from './components/AppFooter.vue';

const auth = useAuth();
const registry = useRegistry(auth.identity);
const canisterId = computed(() => {
  const v = registry.engram.value;
  return v?.canisterId?.toText?.() || v?.canisterId?.toString() || null;
});
const { actor: engramActor } = useEngram(auth.identity, canisterId);

// === Guardian state ===
const guardianSession = useGuardianSession();
const guardianCanisterId = ref<string | null>(null);
const guardianActor = ref<any>(null);
const guardianRecord = ref<any>(null);
const isGuardianOnly = computed(
  () => !!guardianRecord.value && !registry.engram.value && !registry.loading.value,
);
const isAlsoGuardian = computed(() => !!guardianRecord.value && !!registry.engram.value);

async function refreshGuardianStatus() {
  const id = auth.identity.value;
  if (!id) {
    guardianCanisterId.value = null;
    guardianActor.value = null;
    guardianRecord.value = null;
    return;
  }
  const stored = guardianSession.getGuardianEngrams();
  for (const entry of stored) {
    try {
      const agent = createAgent(id);
      const actor = createEngramActor(agent, entry.canisterId);
      const result = (await actor.checkGuardianStatus!()) as Record<string, any>;
      if ('Ok' in result) {
        guardianCanisterId.value = entry.canisterId;
        guardianActor.value = actor;
        guardianRecord.value = result.Ok;
        return;
      }
    } catch {
      guardianSession.removeGuardianEngram(entry.canisterId);
    }
  }
  // No valid guardian found
  guardianCanisterId.value = null;
  guardianActor.value = null;
  guardianRecord.value = null;
}

watch(auth.identity, () => refreshGuardianStatus(), { immediate: true });

// Clear guardian session on logout
watch(auth.isAuthenticated, (isAuth) => {
  if (!isAuth) {
    guardianCanisterId.value = null;
    guardianActor.value = null;
    guardianRecord.value = null;
  }
});

// Lazy actor factories — only created when pages need them
function getLedgerActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createLedgerActor(agent);
}

function getCkusdcLedgerActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createCkusdcLedgerActor(agent);
}

function getIcpIndexActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createIcpIndexActor(agent);
}

function getCkusdcIndexActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createCkusdcIndexActor(agent);
}

function getCkusdtLedgerActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createCkusdtLedgerActor(agent);
}

function getCkusdtIndexActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createCkusdtIndexActor(agent);
}

function getMinterActor() {
  const id = auth.identity.value;
  if (!id) return null;
  const agent = createAgent(id);
  return createMinterActor(agent);
}

provide('engram', registry.engram);
provide('engramActor', engramActor);
provide('engramCanisterId', canisterId);
provide('registryActor', registry.actor);
provide('getLedgerActor', getLedgerActor);
provide('getCkusdcLedgerActor', getCkusdcLedgerActor);
provide('getIcpIndexActor', getIcpIndexActor);
provide('getCkusdcIndexActor', getCkusdcIndexActor);
provide('getCkusdtLedgerActor', getCkusdtLedgerActor);
provide('getCkusdtIndexActor', getCkusdtIndexActor);
provide('getMinterActor', getMinterActor);
provide('createEngram', registry.createEngram);
provide('guardianActor', guardianActor);
provide('guardianRecord', guardianRecord);
provide('guardianCanisterId', guardianCanisterId);
provide('isGuardianOnly', isGuardianOnly);
provide('refreshGuardianStatus', refreshGuardianStatus);
</script>

<template>
  <div
    class="min-h-screen flex flex-col"
    style="
      background: #0a0e14;
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
        env(safe-area-inset-left);
    "
  >
    <Navbar
      :is-authenticated="auth.isAuthenticated.value"
      :is-loading="auth.isLoading.value"
      :principal="auth.principal.value?.toText() || null"
      :is-guardian-only="isGuardianOnly"
      :is-also-guardian="isAlsoGuardian"
      @login="auth.login"
      @logout="auth.logout"
    />
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    <AppFooter />
  </div>
</template>
