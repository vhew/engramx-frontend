<script setup lang="ts">
defineProps<{
  inviteCode: string;
  countdownText: string;
  secondsLeft: number;
  pairCommand: string;
}>();

defineEmits<{
  copy: [];
  dismiss: [];
}>();
</script>

<template>
  <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-3xl font-mono font-bold text-engram-400 tracking-widest">{{
        inviteCode
      }}</span>
      <span :class="['text-sm font-mono', secondsLeft <= 60 ? 'text-red-400' : 'text-gray-400']">
        Expires in {{ countdownText }}
      </span>
    </div>
    <p class="text-gray-400 text-sm mb-2">On the operator machine, run:</p>
    <code class="text-gray-300 text-sm block bg-gray-900 rounded-sm px-3 py-2 break-all">{{
      pairCommand
    }}</code>
    <div class="flex gap-2 mt-3">
      <button class="btn-secondary text-sm" @click="$emit('copy')">Copy Command</button>
      <button class="btn-secondary text-sm" @click="$emit('dismiss')">Dismiss</button>
    </div>
  </div>
</template>
