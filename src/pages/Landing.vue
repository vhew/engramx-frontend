<script setup lang="ts">
import { inject, ref, computed, watch, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import CodeBlock from '../components/CodeBlock.vue';
import InviteCodeDisplay from '../components/InviteCodeDisplay.vue';
import ArchitectureDiagram from '../components/ArchitectureDiagram.vue';
import AuthButton from '../components/AuthButton.vue';
import { useAuth } from '../composables/useAuth';
import { useOperatorInvite } from '../composables/useOperatorInvite';
import { createAnonymousRegistryActor } from '../lib/actor';
import { onMounted } from 'vue';
import cardPersistent from '../assets/cards/card-persistent.webp';
import cardRecoverable from '../assets/cards/card-recoverable.webp';
import cardSovereign from '../assets/cards/card-sovereign.webp';

const publicMetrics = ref<{
  totalEngrams: number;
  activeEngrams: number;
  registrySince: bigint;
  totalCyclesAllocated: bigint;
} | null>(null);

function formatUptime(nanos: bigint): string {
  const ns = Number(nanos);
  if (ns === 0) return 'N/A';
  const now = Date.now() * 1_000_000;
  const diffMs = (now - ns) / 1_000_000;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return '<1 day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month';
  return `${months} months`;
}

function formatTrilliCycles(raw: bigint): string {
  const t = Number(raw) / 1e12;
  if (t < 0.01) return '0 T';
  if (t < 10) return `${t.toFixed(2)} T`;
  if (t < 1000) return `${t.toFixed(1)} T`;
  return `${(t / 1000).toFixed(1)}k T`;
}

onMounted(async () => {
  try {
    const actor = createAnonymousRegistryActor();
    const m = await actor.publicMetrics() as any;
    publicMetrics.value = {
      totalEngrams: Number(m.totalEngrams),
      activeEngrams: Number(m.activeEngrams),
      registrySince: m.registrySince as bigint,
      totalCyclesAllocated: m.totalCyclesAllocated as bigint,
    };
  } catch {
    // Fail silently — landing page must never break
  }
});

const router = useRouter();
const { isAuthenticated, isLoading, principal, login, logout } = useAuth();

const isGuardianOnly = inject<Ref<boolean>>('isGuardianOnly', ref(false));
watch(isGuardianOnly, (v) => {
  if (v) router.push('/guardian');
}, { immediate: true });

const engram = inject<Ref<any>>('engram', ref(null));
const engramActor = inject<Ref<any>>('engramActor', ref(null));
const createEngramFn = inject<() => Promise<any>>('createEngram', () => Promise.resolve());

const creating = ref(false);
const createError = ref<string | null>(null);

async function handleCreateEngram() {
  creating.value = true;
  createError.value = null;
  try {
    await createEngramFn();
  } catch (err: any) {
    createError.value = err.message;
  } finally {
    creating.value = false;
  }
}

const engramCanisterId = computed(() => engram.value?.canisterId?.toText?.() || engram.value?.canisterId?.toString() || '');
const invite = useOperatorInvite(engramActor, engramCanisterId);
const pairCommand = computed(() => `npx @engramx/client pair ${invite.inviteCode.value} --engram ${engramCanisterId.value}`);
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <section class="max-w-5xl mx-auto px-4 pt-16 pb-16 text-center">
      <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight font-mono">
        Your AI Agent's
        <br />
        <span class="text-engram-400">Indestructible State</span>
      </h1>
      <p class="mt-6 text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto">
        EngramX gives AI agents persistent memory, identity, and a wallet
        on the Internet Computer. If the host machine dies, gets hacked, or
        simply moves &mdash; the agent lives on.
      </p>
      <p class="mt-3 text-gray-500 max-w-xl mx-auto">
        Built for <a href="https://github.com/nicholasgriffintn/openclaw" class="text-engram-400 hover:text-engram-300">OpenClaw</a>.
        Ready for any agent framework.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
        <a href="#get-started" class="btn-primary text-lg px-6 py-3 text-center">
          Get Started
        </a>
        <router-link to="/verify" class="btn-secondary text-lg px-6 py-3 text-center">
          Verify Our Code
        </router-link>
      </div>
    </section>

    <!-- Metrics Banner -->
    <section v-if="publicMetrics" class="max-w-5xl mx-auto px-4 pb-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div class="rounded-lg border border-white/6 bg-white/3 p-4 text-center">
          <p class="text-2xl md:text-3xl font-bold text-amber-400 font-mono">{{ publicMetrics.totalEngrams }}</p>
          <p class="text-xs md:text-sm text-gray-400 mt-1">Engrams Deployed</p>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/3 p-4 text-center">
          <p class="text-2xl md:text-3xl font-bold text-amber-400 font-mono">{{ publicMetrics.activeEngrams }}</p>
          <p class="text-xs md:text-sm text-gray-400 mt-1">Active</p>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/3 p-4 text-center">
          <p class="text-2xl md:text-3xl font-bold text-amber-400 font-mono">{{ formatUptime(publicMetrics.registrySince) }}</p>
          <p class="text-xs md:text-sm text-gray-400 mt-1">Uptime</p>
        </div>
        <div class="rounded-lg border border-white/6 bg-white/3 p-4 text-center">
          <p class="text-2xl md:text-3xl font-bold text-amber-400 font-mono">{{ formatTrilliCycles(publicMetrics.totalCyclesAllocated) }}</p>
          <p class="text-xs md:text-sm text-gray-400 mt-1">Cycles Consumed</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="max-w-5xl mx-auto px-4 py-16">
      <div class="grid gap-4 md:grid-cols-3 md:gap-8">
        <!-- Persistent -->
        <div class="feature-card" :style="{ backgroundImage: `url(${cardPersistent})` }">
          <div class="feature-card-overlay"></div>
          <div class="feature-card-content">
            <h3 class="text-lg font-semibold text-white mb-2 font-mono">Persistent</h3>
            <p class="text-gray-300 text-sm">
              Survives host machine failure. Survives canister upgrades.
              Your agent's memory is stored on the Internet Computer.
            </p>
          </div>
        </div>
        <!-- Recoverable -->
        <div class="feature-card" :style="{ backgroundImage: `url(${cardRecoverable})` }">
          <div class="feature-card-overlay"></div>
          <div class="feature-card-content">
            <h3 class="text-lg font-semibold text-white mb-2 font-mono">Recoverable</h3>
            <p class="text-gray-300 text-sm">
              Host compromised? Revoke its access from your phone,
              register a new machine, and resume with full state intact.
            </p>
          </div>
        </div>
        <!-- Sovereign -->
        <div class="feature-card" :style="{ backgroundImage: `url(${cardSovereign})` }">
          <div class="feature-card-overlay"></div>
          <div class="feature-card-content">
            <h3 class="text-lg font-semibold text-white mb-2 font-mono">Sovereign</h3>
            <p class="text-gray-300 text-sm">
              You own your canister. No one &mdash; not even the service
              operators &mdash; can read or modify your agent's data.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Architecture -->
    <section class="max-w-5xl mx-auto px-4 py-16">
      <h2 class="text-3xl font-bold text-white text-center mb-8 font-mono">Architecture</h2>
      <ArchitectureDiagram />
    </section>

    <!-- Get Started -->
    <section id="get-started" class="max-w-3xl mx-auto px-4 py-16">
      <h2 class="text-3xl font-bold text-white text-center mb-8 font-mono">Get Started</h2>
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">1. Create an engram</h3>
          <!-- State: already have an engram -->
          <div v-if="isAuthenticated && engram" class="flex items-center gap-3 flex-wrap">
            <span class="text-engram-400 font-mono text-sm">{{ engram.canisterId?.toText?.() || engram.canisterId?.toString() }}</span>
            <span class="text-green-400 text-sm">&#10003; Engram created</span>
          </div>
          <!-- State: signed in, no engram yet -->
          <div v-else-if="isAuthenticated && !engram" class="space-y-2">
            <p v-if="createError" class="text-red-400 text-sm">{{ createError }}</p>
            <button class="btn-primary" :disabled="creating" @click="handleCreateEngram">
              {{ creating ? 'Creating...' : 'Create Engram' }}
            </button>
          </div>
          <!-- State: not signed in -->
          <div v-else class="flex items-center gap-3 flex-wrap">
            <AuthButton
              :is-authenticated="isAuthenticated"
              :is-loading="isLoading"
              :principal="principal?.toText() || null"
              @login="login"
              @logout="logout"
            />
            <span class="text-gray-400">then create your engram.</span>
          </div>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">2. Register your host as an operator</h3>
          <div v-if="isAuthenticated && engram" class="space-y-3">
            <InviteCodeDisplay
              v-if="invite.inviteCode.value"
              :invite-code="invite.inviteCode.value"
              :countdown-text="invite.countdownText.value"
              :seconds-left="invite.inviteSecondsLeft.value"
              :pair-command="pairCommand"
              @copy="invite.copyPairCommand"
              @dismiss="invite.dismiss"
            />
            <div v-else>
              <p class="text-gray-400 text-sm mb-2">Create an invite code, then run the pairing command on your agent host.</p>
              <button class="btn-primary" :disabled="invite.creating.value" @click="invite.createInvite('operator')">
                {{ invite.creating.value ? 'Creating...' : 'Create Invite' }}
              </button>
              <p v-if="invite.inviteError.value" class="text-red-400 text-sm mt-2">{{ invite.inviteError.value }}</p>
            </div>
          </div>
          <p v-else class="text-gray-400 text-sm">Create your engram first, then generate an invite code.</p>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">3. Install the client</h3>
          <CodeBlock code="npm install @engramx/client" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">4. Use the engram in your agent</h3>
          <CodeBlock :code="`import { EngramClient } from '@engramx/client';\n\nconst engram = new EngramClient({\n  canisterId: '${engram ? (engram.canisterId?.toText?.() || engram.canisterId?.toString()) : 'xxxxx-xxxxx-xxxxx-xxxxx-xxx'}',\n  sessionKeyPath: '~/.engramx/session.key',\n});\n\nconst file = await engram.readMemory('MEMORY.md');\nawait engram.appendMemory('memory/daily.md', '## Notes\\nSomething happened.');`" />
          <p class="text-gray-500 text-sm mt-3">
            Using OpenClaw? See the <router-link to="/docs" class="text-engram-400 hover:text-engram-300">integration guide</router-link> for the one-step config.
          </p>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white mb-2">5. Done</h3>
          <p class="text-gray-400">Your agent's memory now syncs to the canister. If the host dies, spin up a new one and resume.</p>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.feature-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: flex-end;
}
.feature-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(10, 14, 20, 0.85) 0%,
    rgba(10, 14, 20, 0.4) 40%,
    rgba(10, 14, 20, 0) 100%
  );
}
.feature-card-content {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  text-align: center;
  width: 100%;
}
</style>
