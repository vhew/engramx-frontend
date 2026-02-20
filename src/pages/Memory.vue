<script setup lang="ts">
import { ref, inject, watch, computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MemoryEditor from '../components/MemoryEditor.vue';
import SessionViewer from '../components/SessionViewer.vue';
import BackupCard from '../components/BackupCard.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/EmptyState.vue';
import EngramIcon from '../components/icons/EngramIcons.vue';

const route = useRoute();
const router = useRouter();
const engramActor = inject<Ref<any>>('engramActor')!;

const activeTab = computed({
  get: () => {
    const tab = route.query.tab as string;
    if (tab === 'sessions') return 'sessions';
    if (tab === 'backups') return 'backups';
    return 'files';
  },
  set: (val: string) => router.replace({ query: val === 'files' ? {} : { tab: val } }),
});

// === Files state ===
const files = ref<any[]>([]);
const selectedFile = ref<any>(null);
const history = ref<any[]>([]);
const filesLoading = ref(true);
const filesError = ref<string | null>(null);

// === Sessions state ===
const sessions = ref<any[]>([]);
const selectedSession = ref<string | null>(null);
const messages = ref<any[]>([]);
const sessionsLoading = ref(true);

// === Backups state ===
const backups = ref<any[]>([]);
const backupsLoading = ref(true);
const backupsError = ref<string | null>(null);
const dbTypeFilter = ref('');

watch(
  engramActor,
  (actor) => {
    if (actor) {
      loadFiles();
      loadSessions();
      loadBackups();
    }
  },
  { immediate: true },
);

// === Files logic ===
async function loadFiles() {
  filesLoading.value = true;
  try {
    files.value = await engramActor.value.listMemoryFiles();
  } catch (err: any) {
    filesError.value = err.message;
  } finally {
    filesLoading.value = false;
  }
}

async function selectFile(path: string) {
  try {
    const result = await engramActor.value.readMemory(path);
    if ('Ok' in result) {
      selectedFile.value = result.Ok;
      history.value = await engramActor.value.getMemoryHistory(path);
    } else {
      filesError.value = result.Err;
    }
  } catch (err: any) {
    filesError.value = err.message;
  }
}

async function handleSave(content: string) {
  if (!selectedFile.value) return;
  const result = selectedFile.value.isIdentityFile
    ? await engramActor.value.setIdentityFile(selectedFile.value.path, content)
    : await engramActor.value.appendMemory(selectedFile.value.path, content);
  if ('Err' in result) throw new Error(result.Err);
  await selectFile(selectedFile.value.path);
  await loadFiles();
}

async function handleDelete() {
  if (!selectedFile.value || !confirm(`Delete ${selectedFile.value.path}?`)) return;
  const result = await engramActor.value.deleteMemoryFile(selectedFile.value.path);
  if ('Err' in result) {
    filesError.value = result.Err;
    return;
  }
  selectedFile.value = null;
  await loadFiles();
}

async function handleRollback(version: number) {
  if (!selectedFile.value || !confirm(`Rollback ${selectedFile.value.path} to v${version}?`))
    return;
  const result = await engramActor.value.rollbackMemory(selectedFile.value.path, BigInt(version));
  if ('Err' in result) {
    filesError.value = result.Err;
    return;
  }
  await selectFile(selectedFile.value.path);
  await loadFiles();
}

// === Sessions logic ===
async function loadSessions() {
  sessionsLoading.value = true;
  try {
    sessions.value = await engramActor.value.listSessions();
  } finally {
    sessionsLoading.value = false;
  }
}

async function selectSession(key: string) {
  selectedSession.value = key;
  try {
    const result = await engramActor.value.readSession(key, BigInt(0), BigInt(200));
    if ('Ok' in result) {
      messages.value = result.Ok;
    }
  } catch (err) {
    console.error(err);
  }
}

// === Backups logic ===
async function loadBackups() {
  backupsLoading.value = true;
  try {
    const filter = dbTypeFilter.value.trim() || null;
    backups.value = await engramActor.value.listBackups(filter ? [filter] : []);
  } catch {
    backups.value = [];
  } finally {
    backupsLoading.value = false;
  }
}

async function downloadBackup(backup: any) {
  backupsError.value = null;
  try {
    const chunkCount = Number(backup.chunkCount);
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const result = await engramActor.value.pullBackupChunk(backup.backupId, BigInt(i));
      if ('Err' in result) {
        backupsError.value = result.Err;
        return;
      }
      chunks.push(new Uint8Array(result.Ok));
    }

    const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([combined], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = backup.backupLabel?.[0] || backup.backupId;
    a.download = `${label}.backup`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    backupsError.value = err.message;
  }
}

async function deleteBackup(backupId: string) {
  if (!confirm(`Delete backup ${backupId}? This cannot be undone.`)) return;
  backupsError.value = null;
  try {
    const result = await engramActor.value.deleteBackup(backupId);
    if ('Err' in result) {
      backupsError.value = result.Err;
    } else {
      await loadBackups();
    }
  } catch (err: any) {
    backupsError.value = err.message;
  }
}

function formatTimestamp(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleString();
}

function getRoleString(role: any): string {
  if ('User' in role) return 'User';
  if ('Assistant' in role) return 'Assistant';
  if ('System' in role) return 'System';
  if ('Tool' in role) return 'Tool';
  return 'Unknown';
}
</script>

<template>
  <div v-if="!engramActor" class="max-w-5xl mx-auto px-4 py-8">
    <p class="text-gray-400">No engram connected.</p>
  </div>

  <div v-else class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-6">Memory</h1>

    <!-- Tab Bar -->
    <div class="flex border-b border-gray-800 mb-6">
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'files'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'files'"
      >
        Files
      </button>
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'sessions'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'sessions'"
      >
        Sessions
      </button>
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'backups'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'backups'"
      >
        Backups
      </button>
    </div>

    <!-- Files Tab -->
    <div v-if="activeTab === 'files'">
      <div
        v-if="filesError"
        class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400"
      >
        {{ filesError }}
      </div>

      <!-- Mobile file selector -->
      <div class="md:hidden mb-4">
        <LoadingSpinner v-if="filesLoading" size="sm" label="Loading..." />
        <EmptyState
          v-else-if="files.length === 0"
          icon="file"
          title="No memory files yet"
          description="Memory files will appear here once created by an operator."
        />
        <select
          v-else
          :value="selectedFile?.path || ''"
          class="input w-full"
          @change="selectFile(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Select a file...</option>
          <option v-for="f in files" :key="f.path" :value="f.path">
            {{ f.path }} (v{{ Number(f.version) }})
          </option>
        </select>
      </div>

      <div class="grid md:grid-cols-4 gap-4 md:gap-6">
        <!-- File List (desktop sidebar) -->
        <div class="hidden md:block md:col-span-1 md:sticky md:top-24 md:self-start">
          <div class="card">
            <h2 class="text-sm font-semibold text-gray-400 uppercase mb-3">Files</h2>
            <LoadingSpinner v-if="filesLoading" size="sm" label="Loading..." />
            <EmptyState
              v-else-if="files.length === 0"
              icon="file"
              title="No memory files yet"
              description="Memory files will appear here once created by an operator."
            />
            <div v-else class="space-y-1">
              <button
                v-for="f in files"
                :key="f.path"
                :class="[
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2',
                  selectedFile?.path === f.path
                    ? 'bg-engram-600/20 text-engram-400'
                    : 'text-gray-300 hover:bg-gray-800',
                ]"
                @click="selectFile(f.path)"
              >
                <EngramIcon name="file" :size="14" class="shrink-0 text-gray-500" />
                <div class="min-w-0">
                  <div class="font-mono truncate">{{ f.path }}</div>
                  <div class="text-xs text-gray-500 mt-0.5">v{{ Number(f.version) }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Version History -->
          <div v-if="selectedFile && history.length > 0" class="card mt-4">
            <h2 class="text-sm font-semibold text-gray-400 uppercase mb-3">History</h2>
            <div class="space-y-2">
              <div
                v-for="v in history"
                :key="Number(v.version)"
                class="flex justify-between items-center text-sm"
              >
                <span class="text-gray-300">v{{ Number(v.version) }}</span>
                <button
                  class="text-engram-400 hover:text-engram-300 text-xs py-1 px-2"
                  @click="handleRollback(Number(v.version))"
                >
                  Rollback
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="md:col-span-3">
          <MemoryEditor
            v-if="selectedFile"
            :path="selectedFile.path"
            :content="selectedFile.content"
            :is-identity-file="selectedFile.isIdentityFile"
            :version="Number(selectedFile.version)"
            :on-save="handleSave"
            :on-delete="handleDelete"
          />
          <div v-else class="card">
            <EmptyState
              icon="file"
              title="Select a file"
              description="Choose a file from the sidebar to view its contents."
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Tab -->
    <div v-if="activeTab === 'sessions'">
      <!-- Mobile session selector -->
      <div class="md:hidden mb-4">
        <LoadingSpinner v-if="sessionsLoading" size="sm" label="Loading..." />
        <EmptyState
          v-else-if="sessions.length === 0"
          icon="chat"
          title="No sessions yet"
          description="Session transcripts will appear here once an operator starts a conversation."
        />
        <select
          v-else
          :value="selectedSession || ''"
          class="input w-full"
          @change="selectSession(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Select a session...</option>
          <option v-for="s in sessions" :key="s.sessionKey" :value="s.sessionKey">
            {{ s.sessionKey }} ({{ Number(s.messageCount) }} messages)
          </option>
        </select>
      </div>

      <div class="grid md:grid-cols-4 gap-4 md:gap-6">
        <!-- Session List (desktop sidebar) -->
        <div class="hidden md:block md:col-span-1 md:sticky md:top-24 md:self-start">
          <div class="card">
            <h2 class="text-sm font-semibold text-gray-400 uppercase mb-3">Sessions</h2>
            <LoadingSpinner v-if="sessionsLoading" size="sm" label="Loading..." />
            <EmptyState
              v-else-if="sessions.length === 0"
              icon="chat"
              title="No sessions yet"
              description="Session transcripts will appear here once an operator starts a conversation."
            />
            <div v-else class="space-y-1">
              <button
                v-for="s in sessions"
                :key="s.sessionKey"
                :class="[
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2',
                  selectedSession === s.sessionKey
                    ? 'bg-engram-600/20 text-engram-400'
                    : 'text-gray-300 hover:bg-gray-800',
                ]"
                @click="selectSession(s.sessionKey)"
              >
                <EngramIcon name="chat" :size="14" class="shrink-0 text-gray-500" />
                <div class="min-w-0">
                  <div class="font-mono truncate">{{ s.sessionKey }}</div>
                  <div class="text-xs text-gray-500 mt-0.5">
                    {{ Number(s.messageCount) }} messages
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="md:col-span-3">
          <div v-if="selectedSession" class="card">
            <SessionViewer
              :session-key="selectedSession"
              :messages="
                messages.map((m: any) => ({
                  role: getRoleString(m.role),
                  content: m.content,
                  timestamp: formatTimestamp(m.timestamp),
                }))
              "
            />
          </div>
          <div v-else class="card">
            <EmptyState
              icon="chat"
              title="Select a session"
              description="Choose a session from the sidebar to view its transcript."
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Backups Tab -->
    <div v-if="activeTab === 'backups'" class="max-w-3xl mx-auto">
      <div
        v-if="backupsError"
        class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400"
      >
        {{ backupsError }}
      </div>

      <!-- Filter -->
      <div class="mb-4">
        <input
          v-model="dbTypeFilter"
          type="text"
          placeholder="Filter by database type..."
          class="input w-full sm:w-64"
          @input="loadBackups"
        />
      </div>

      <!-- Backup List -->
      <LoadingSpinner v-if="backupsLoading" label="Loading backups..." />
      <EmptyState
        v-else-if="backups.length === 0"
        icon="file"
        title="No backups found"
        description="Use @engramx/client to upload database snapshots for durable, decentralized backup storage."
      />
      <div v-else class="space-y-4">
        <BackupCard
          v-for="b in backups"
          :key="b.backupId"
          :backup="b"
          :is-owner="true"
          @delete="deleteBackup(b.backupId)"
          @download="downloadBackup(b)"
        />
      </div>
    </div>
  </div>
</template>
