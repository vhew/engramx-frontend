import { ref, computed, onUnmounted, type Ref } from 'vue';

export function useGuardianInvite(engramActor: Ref<any>, engramCanisterId: Ref<string>) {
  const inviteCode = ref<string | null>(null);
  const inviteError = ref<string | null>(null);
  const creating = ref(false);
  const inviteSecondsLeft = ref(0);
  const accepted = ref(false);
  let inviteTimer: ReturnType<typeof setInterval> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let knownGuardianPrincipals = new Set<string>();

  const countdownText = computed(() => {
    const total = inviteSecondsLeft.value;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  const inviteLink = computed(() => {
    if (!inviteCode.value) return null;
    return `${window.location.origin}/guardian-invite?engram=${engramCanisterId.value}&code=${inviteCode.value}`;
  });

  function clearTimer() {
    if (inviteTimer) {
      clearInterval(inviteTimer);
      inviteTimer = null;
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startCountdown() {
    clearTimer();
    inviteSecondsLeft.value = 86400; // 24 hours
    inviteTimer = setInterval(() => {
      inviteSecondsLeft.value--;
      if (inviteSecondsLeft.value <= 0) {
        clearTimer();
        stopPolling();
        inviteCode.value = null;
        accepted.value = false;
      }
    }, 1000);
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (!engramActor.value || accepted.value) return;
      try {
        const guardians = await engramActor.value.listGuardians();
        const newPending = guardians.find(
          (g: any) => 'Pending' in g.status && !knownGuardianPrincipals.has(g.principal.toText()),
        );
        if (newPending) {
          accepted.value = true;
          stopPolling();
        }
      } catch {
        /* ignore polling errors */
      }
    }, 5000);
  }

  async function createInvite(
    name: string,
    permissions: {
      canRevokeOperators: boolean;
      canFreezePayments: boolean;
      canPauseWrites: boolean;
    },
  ) {
    if (!engramActor.value) return;
    creating.value = true;
    inviteError.value = null;
    accepted.value = false;
    try {
      // Snapshot current guardians before creating invite
      try {
        const current = await engramActor.value.listGuardians();
        knownGuardianPrincipals = new Set(current.map((g: any) => g.principal.toText()));
      } catch {
        knownGuardianPrincipals = new Set();
      }

      const result = await engramActor.value.createGuardianInvite(name, permissions);
      if ('Ok' in result) {
        inviteCode.value = result.Ok;
        startCountdown();
        startPolling();
      } else {
        inviteError.value = result.Err;
      }
    } catch (err: any) {
      inviteError.value = err.message;
    } finally {
      creating.value = false;
    }
  }

  function copyInviteLink() {
    if (inviteLink.value) {
      navigator.clipboard.writeText(inviteLink.value);
    }
  }

  onUnmounted(() => {
    clearTimer();
    stopPolling();
  });

  return {
    inviteCode,
    inviteError,
    creating,
    inviteSecondsLeft,
    countdownText,
    inviteLink,
    accepted,
    createInvite,
    copyInviteLink,
  };
}
