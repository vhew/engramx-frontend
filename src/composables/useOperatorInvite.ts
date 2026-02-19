import { ref, computed, onUnmounted, type Ref } from 'vue';

const DEFAULT_PERMISSIONS = {
  canReadMemory: true,
  canAppendMemory: true,
  canReadSessions: true,
  canAppendSessions: true,
  canSearchMemory: true,
  canReadConfig: true,
  canReadWallet: true,
  canTransferFunds: false,
  dailySpendingLimitE8s: BigInt(0),
  allowlistedAddresses: [],
  callsPerMinute: BigInt(120),
  maxSessionTTLNanos: BigInt(86_400_000_000_000),
};

export function useOperatorInvite(engramActor: Ref<any>, engramCanisterId: Ref<string>) {
  const inviteCode = ref<string | null>(null);
  const inviteError = ref<string | null>(null);
  const creating = ref(false);
  const inviteSecondsLeft = ref(0);
  let inviteTimer: ReturnType<typeof setInterval> | null = null;

  const countdownText = computed(() => {
    const m = Math.floor(inviteSecondsLeft.value / 60);
    const s = inviteSecondsLeft.value % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  function clearTimer() {
    if (inviteTimer) {
      clearInterval(inviteTimer);
      inviteTimer = null;
    }
  }

  function startCountdown() {
    clearTimer();
    inviteSecondsLeft.value = 300;
    inviteTimer = setInterval(() => {
      inviteSecondsLeft.value--;
      if (inviteSecondsLeft.value <= 0) {
        clearTimer();
        inviteCode.value = null;
      }
    }, 1000);
  }

  async function createInvite(name: string) {
    if (!engramActor.value) return;
    creating.value = true;
    inviteError.value = null;
    try {
      const result = await engramActor.value.createOperatorInvite(name, DEFAULT_PERMISSIONS);
      if ('Ok' in result) {
        inviteCode.value = result.Ok;
        startCountdown();
      } else {
        inviteError.value = result.Err;
      }
    } catch (err: any) {
      inviteError.value = err.message;
    } finally {
      creating.value = false;
    }
  }

  function copyPairCommand() {
    if (inviteCode.value) {
      navigator.clipboard.writeText(
        `npx @engramx/client pair ${inviteCode.value} --engram ${engramCanisterId.value}`,
      );
    }
  }

  function dismiss() {
    inviteCode.value = null;
    clearTimer();
  }

  onUnmounted(clearTimer);

  return {
    inviteCode,
    inviteError,
    creating,
    inviteSecondsLeft,
    countdownText,
    createInvite,
    copyPairCommand,
    dismiss,
  };
}
