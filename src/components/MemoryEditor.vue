<script setup lang="ts">
import { ref } from 'vue';
import EngramIcon from './icons/EngramIcons.vue';

const props = defineProps<{
  path: string;
  content: string;
  isIdentityFile: boolean;
  version: number;
  onSave: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onRollback?: (version: number) => Promise<void>;
}>();

const editing = ref(false);
const editContent = ref(props.content);
const saving = ref(false);

async function handleSave() {
  saving.value = true;
  try {
    await props.onSave(editContent.value);
    editing.value = false;
  } finally {
    saving.value = false;
  }
}

function startEditing() {
  editContent.value = props.content;
  editing.value = true;
}
</script>

<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h3 class="text-lg font-semibold text-white font-mono">{{ path }}</h3>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-sm text-gray-500">v{{ version }}</span>
          <span v-if="isIdentityFile" class="badge-owner">Identity File</span>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          v-if="!editing"
          class="btn-secondary text-sm inline-flex items-center gap-1.5"
          @click="startEditing"
        >
          <EngramIcon name="edit" :size="14" />
          Edit
        </button>
        <button
          v-if="onDelete"
          class="btn-danger text-sm inline-flex items-center gap-1.5"
          @click="onDelete"
        >
          <EngramIcon name="trash" :size="14" />
          Delete
        </button>
      </div>
    </div>

    <div v-if="editing">
      <textarea
        v-model="editContent"
        class="input font-mono text-sm min-h-[200px] md:min-h-[300px] resize-y"
        :rows="15"
      />
      <div class="flex gap-2 mt-3">
        <button
          class="btn-primary text-sm inline-flex items-center gap-1.5"
          :disabled="saving"
          @click="handleSave"
        >
          <EngramIcon name="save" :size="14" />
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button class="btn-secondary text-sm" @click="editing = false">Cancel</button>
      </div>
    </div>
    <div
      v-else
      class="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto"
    >
      <template v-if="content">{{ content }}</template>
      <span v-else class="text-gray-600 italic">Empty file</span>
    </div>
  </div>
</template>
