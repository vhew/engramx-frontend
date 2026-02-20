<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  code: string;
  language?: string;
}>();

const copied = ref(false);

async function handleCopy(code: string) {
  await navigator.clipboard.writeText(code);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <div class="relative group">
    <pre
      class="border border-gray-700 rounded-md p-4 overflow-x-auto text-left"
      style="background: #080c12"
    ><code class="text-sm font-mono" style="color:#9a9083">{{ code }}</code></pre>
    <button
      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded-sm"
      @click="handleCopy(code)"
    >
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>
