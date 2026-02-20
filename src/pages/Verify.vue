<script setup lang="ts">
import { ref } from 'vue';
import { HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import CodeBlock from '../components/CodeBlock.vue';
import { createEngramActor, REGISTRY_CANISTER_ID } from '../lib/actor';

const engramId = ref('');
const provenanceStatus = ref<'idle' | 'loading' | 'canonical' | 'unknown' | 'none' | 'error'>(
  'idle',
);
const spawnedByPrincipal = ref('');
const errorMessage = ref('');

async function checkProvenance() {
  const id = engramId.value.trim();
  if (!id) return;

  provenanceStatus.value = 'loading';
  errorMessage.value = '';
  spawnedByPrincipal.value = '';

  try {
    const host = import.meta.env.VITE_IC_HOST || 'https://ic0.app';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const agent = await HttpAgent.create({ host, shouldFetchRootKey: isLocal });

    const actor = createEngramActor(agent, id);
    const result = (await actor.getSpawnedBy!()) as [] | [Principal];

    if (result.length === 0 || !result[0]) {
      provenanceStatus.value = 'none';
    } else {
      const spawner = result[0].toText();
      spawnedByPrincipal.value = spawner;
      provenanceStatus.value = spawner === REGISTRY_CANISTER_ID ? 'canonical' : 'unknown';
    }
  } catch (e: any) {
    provenanceStatus.value = 'error';
    errorMessage.value = e.message || 'Failed to query engram';
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-bold text-white mb-4">Verify Deployed Code</h1>
    <p class="text-gray-400 mb-8">
      EngramX is open source. You can verify that the deployed canister code matches the public
      repository by building from source and comparing WASM hashes.
    </p>

    <!-- Provenance Check -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-white mb-2">Engram Provenance</h2>
      <p class="text-gray-400 text-sm mb-4">
        Check which registry spawned an engram. Engrams created by the canonical EngramX registry
        carry an immutable on-chain record of their origin.
      </p>
      <div class="flex gap-2 mb-4">
        <input
          v-model="engramId"
          type="text"
          placeholder="Enter engram canister ID"
          class="flex-1 bg-gray-800 border border-gray-700 rounded-sm px-3 py-2 text-gray-200 text-sm font-mono placeholder-gray-500 focus:outline-hidden focus:border-blue-500"
          @keyup.enter="checkProvenance"
        />
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50"
          :disabled="!engramId.trim() || provenanceStatus === 'loading'"
          @click="checkProvenance"
        >
          {{ provenanceStatus === 'loading' ? 'Checking...' : 'Check' }}
        </button>
      </div>

      <!-- Provenance Result -->
      <div
        v-if="provenanceStatus === 'canonical'"
        class="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-sm"
      >
        <span class="inline-block w-2 h-2 rounded-full bg-green-400"></span>
        <span class="text-green-400 text-sm font-medium"
          >Spawned by canonical EngramX registry</span
        >
      </div>
      <div
        v-else-if="provenanceStatus === 'unknown'"
        class="p-3 bg-amber-900/30 border border-amber-700/50 rounded-sm"
      >
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-amber-400 text-sm font-medium">Spawned by unknown registry</span>
        </div>
        <p class="text-amber-400/70 text-xs font-mono mt-1">{{ spawnedByPrincipal }}</p>
      </div>
      <div
        v-else-if="provenanceStatus === 'none'"
        class="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-sm"
      >
        <span class="inline-block w-2 h-2 rounded-full bg-gray-500"></span>
        <span class="text-gray-400 text-sm"
          >No provenance data (pre-provenance engram or deployed standalone)</span
        >
      </div>
      <div
        v-else-if="provenanceStatus === 'error'"
        class="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-sm"
      >
        <span class="inline-block w-2 h-2 rounded-full bg-red-400"></span>
        <span class="text-red-400 text-sm">{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Why -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-white mb-2">Why Verification Matters</h2>
      <p class="text-gray-400 text-sm">
        ICP canisters run compiled WebAssembly (WASM) code. When you interact with a canister, you
        trust that it's running the code you expect. The IC stores a SHA-256 hash of the installed
        WASM module, which anyone can query. By building the same source code yourself and comparing
        hashes, you can prove the deployed canister matches the open source repo.
      </p>
    </div>

    <!-- Hashes -->
    <div class="card mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Deployed Hashes</h2>
      <div class="space-y-4">
        <div>
          <span class="text-sm text-gray-500">Registry Canister ID</span>
          <p class="text-gray-200 font-mono text-sm">TBD (after mainnet deployment)</p>
        </div>
        <div>
          <span class="text-sm text-gray-500">Registry WASM Hash</span>
          <p class="text-gray-200 font-mono text-sm">TBD</p>
        </div>
        <div>
          <span class="text-sm text-gray-500">Engram Template WASM Hash</span>
          <p class="text-gray-200 font-mono text-sm">TBD</p>
        </div>
        <div>
          <span class="text-sm text-gray-500">Built from Commit</span>
          <p class="text-gray-200 font-mono text-sm">TBD</p>
        </div>
      </div>
    </div>

    <!-- Steps -->
    <div class="space-y-6">
      <h2 class="text-xl font-bold text-white">Verification Steps</h2>

      <div>
        <h3 class="text-lg font-semibold text-white mb-2">1. Clone the Repository</h3>
        <CodeBlock
          :code="`git clone https://github.com/vhew/engramx.git\ncd engramx\ngit checkout <commit-hash>`"
        />
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-2">2. Build with Docker</h3>
        <CodeBlock
          :code="`docker build -t engramx-verify .\ndocker run --rm engramx-verify sha256sum registry.wasm\ndocker run --rm engramx-verify sha256sum engram.wasm`"
        />
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-2">3. Get the Deployed Hash</h3>
        <CodeBlock code="icp canister status <registry-canister-id> -e ic" />
        <p class="text-gray-400 text-sm mt-2">Look for the "Module hash" field in the output.</p>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-2">4. Compare</h3>
        <p class="text-gray-400 text-sm">
          If the SHA-256 hashes match, the deployed code is exactly what's in the repository. If
          they don't match, something is wrong — do not trust the deployment.
        </p>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-2">Or use the script</h3>
        <CodeBlock code="./scripts/verify.sh <registry-canister-id>" />
      </div>
    </div>
  </div>
</template>
