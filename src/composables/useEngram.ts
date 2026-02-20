import { ref, watch, type Ref } from 'vue';
import { Identity } from '@icp-sdk/core/agent';
import { createAgent, createEngramActor } from '../lib/actor';

export function useEngram(identity: Ref<Identity | null>, canisterId: Ref<string | null>) {
  const actor = ref<any>(null);

  watch(
    [identity, canisterId],
    ([id, cid]) => {
      if (id && cid) {
        const agent = createAgent(id);
        actor.value = createEngramActor(agent, cid);
      } else {
        actor.value = null;
      }
    },
    { immediate: true },
  );

  return { actor };
}
