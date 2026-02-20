import { ref, watch, type Ref } from 'vue';
import { Identity } from '@icp-sdk/core/agent';
import { createAgent, createRegistryActor } from '../lib/actor';

export function useRegistry(identity: Ref<Identity | null>) {
  const actor = ref<any>(null);
  const engram = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  watch(
    identity,
    (id) => {
      if (id) {
        const agent = createAgent(id);
        actor.value = createRegistryActor(agent);
      } else {
        actor.value = null;
      }
    },
    { immediate: true },
  );

  async function fetchMyEngram() {
    if (!actor.value) return;
    loading.value = true;
    error.value = null;
    try {
      const result = await actor.value.getMyEngram();
      engram.value = result.length > 0 ? result[0] : null;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function createEngram() {
    if (!actor.value) throw new Error('Not connected');
    loading.value = true;
    error.value = null;
    try {
      const result = await actor.value.createEngram();
      if ('Err' in result) throw new Error(result.Err);
      await fetchMyEngram();
      return result.Ok;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  watch(
    actor,
    (a) => {
      if (a) {
        fetchMyEngram();
      } else {
        engram.value = null;
        error.value = null;
      }
    },
    { immediate: true },
  );

  return { actor, engram, loading, error, createEngram, fetchMyEngram };
}
