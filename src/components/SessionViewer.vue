<script setup lang="ts">
interface Message {
  role: string;
  content: string;
  timestamp: string;
}

defineProps<{
  sessionKey: string;
  messages: Message[];
}>();

function getRoleColor(role: string): string {
  switch (role) {
    case 'User':
      return 'bg-blue-900/30 border-blue-800';
    case 'Assistant':
      return 'bg-green-900/30 border-green-800';
    case 'System':
      return 'bg-yellow-900/30 border-yellow-800';
    case 'Tool':
      return 'bg-purple-900/30 border-purple-800';
    default:
      return 'bg-gray-800 border-gray-700';
  }
}

function getRoleBadge(role: string): string {
  switch (role) {
    case 'User':
      return 'text-blue-400';
    case 'Assistant':
      return 'text-green-400';
    case 'System':
      return 'text-yellow-400';
    case 'Tool':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-white mb-4 font-mono">{{ sessionKey }}</h3>
    <div class="space-y-3">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['rounded-lg border p-4', getRoleColor(msg.role)]"
      >
        <div class="flex justify-between items-center mb-2">
          <span :class="['text-sm font-semibold', getRoleBadge(msg.role)]">
            {{ msg.role }}
          </span>
          <span class="text-xs text-gray-500">{{ msg.timestamp }}</span>
        </div>
        <p class="text-gray-200 text-sm whitespace-pre-wrap">{{ msg.content }}</p>
      </div>
      <p v-if="messages.length === 0" class="text-gray-500 text-center py-8">
        No messages in this session
      </p>
    </div>
  </div>
</template>
