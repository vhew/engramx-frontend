<script setup lang="ts">
import { ref, inject, watch, computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Principal } from '@icp-sdk/core/principal';
import QRCode from 'qrcode';
import { principalToBytes32Hex, isLocalHost } from '../lib/actor';
import EngramIcon from '../components/icons/EngramIcons.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();

const engramActor = inject<Ref<any>>('engramActor')!;
const engramCanisterId = inject<Ref<string | null>>('engramCanisterId')!;
const registryActor = inject<Ref<any>>('registryActor')!;
const getCkusdcIndexActor = inject<() => any>('getCkusdcIndexActor')!;
const getCkusdtIndexActor = inject<() => any>('getCkusdtIndexActor')!;
const getMinterActor = inject<() => any>('getMinterActor')!;

const activeTab = computed({
  get: () => {
    const tab = route.query.tab;
    if (tab === 'wallet' || tab === 'transfers') return 'wallet';
    return 'cycles';
  },
  set: (val: string) => router.replace({ query: val === 'cycles' ? {} : { tab: val } }),
});

// === Shared state (loaded eagerly) ===
const engramStatus = ref<any>(null);
const cycleHistory = ref<[bigint, bigint][]>([]);
const accounting = ref<any>(null);
const depositAddress = ref<any>(null);
const platformFeeBps = ref<number | null>(null);

// === Cycles tab state ===
const cyclesLoading = ref(true);
const cyclesError = ref<string | null>(null);
const cyclesSuccess = ref<string | null>(null);
const topUpAmount = ref('');
const topUpLoading = ref(false);
const topUpStep = ref(''); // '', 'transferring', 'converting'
const topUpLimits = ref<{ maxCkusdcE6s: bigint; cooldownSeconds: bigint } | null>(null);

// === Wallet tab state ===
const walletBalances = ref<{
  cycles: bigint;
  icpE8s: bigint;
  ckusdcE6s: bigint;
  ckusdtE6s: bigint;
} | null>(null);
const ckusdcTxHistory = ref<any[]>([]);
const ckusdtTxHistory = ref<any[]>([]);
const walletLoading = ref(true);
const walletError = ref<string | null>(null);
const walletSuccess = ref<string | null>(null);

// Token selectors
const withdrawToken = ref<'ckUSDC' | 'ckUSDT'>('ckUSDC');
const topUpCurrency = ref<'ckUSDC' | 'ckUSDT'>('ckUSDC');
const ethDepositToken = ref<'USDC' | 'USDT'>('USDC');

// Withdraw
const withdrawAmount = ref('');
const withdrawLoading = ref(false);

// QR code for deposit address
const depositQrDataUrl = ref<string | null>(null);
const addressCopied = ref(false);

// Ethereum deposit
const ethHelperContract = ref<string | null>(null);
const ethHelperLoading = ref(false);
const ethPrincipalHex = computed(() => {
  if (!engramCanisterId.value) return null;
  try {
    return principalToBytes32Hex(engramCanisterId.value);
  } catch {
    return null;
  }
});
const ethHexCopied = ref(false);
const ethContractCopied = ref(false);
const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const ethTokenContract = computed(() =>
  ethDepositToken.value === 'USDC' ? USDC_CONTRACT : USDT_CONTRACT,
);

// Tx history pagination
const txPage = ref(0);
const TX_PAGE_SIZE = 20;

// === Data loading ===

watch(
  engramActor,
  (actor) => {
    if (actor) {
      loadEngramData();
      loadWalletBalances();
      loadTopUpLimits();
    }
  },
  { immediate: true },
);

watch(
  registryActor,
  (actor) => {
    if (actor) {
      loadAccountingData();
      loadDepositAddress();
      loadPlatformFee();
    }
  },
  { immediate: true },
);

async function loadEngramData() {
  cyclesLoading.value = true;
  try {
    const [statusResult, historyResult] = await Promise.all([
      engramActor.value.status(),
      engramActor.value.getCycleHistory(),
    ]);
    engramStatus.value = statusResult[0] || statusResult;
    cycleHistory.value = historyResult;
  } catch (e) {
    console.warn('Failed to load engram data:', e);
  } finally {
    cyclesLoading.value = false;
  }
}

async function loadAccountingData() {
  try {
    const result = await registryActor.value.getMyEngramAccounting();
    accounting.value = result.length > 0 ? result[0] : null;
  } catch (e) {
    console.warn('Failed to load accounting data:', e);
  }
}

async function loadDepositAddress() {
  try {
    depositAddress.value = await registryActor.value.getMyDepositAddress();
  } catch (e) {
    console.warn('Failed to load deposit address:', e);
  }
}

async function loadPlatformFee() {
  try {
    platformFeeBps.value = Number(await registryActor.value.getPlatformFeeBps());
  } catch (e) {
    console.warn('Failed to load platform fee:', e);
  }
}

async function loadWalletBalances() {
  walletLoading.value = true;
  try {
    const result = await engramActor.value.walletBalances();
    if ('Ok' in result) {
      walletBalances.value = result.Ok;
    }
  } catch (e) {
    console.warn('Failed to load wallet balances:', e);
    // Fallback to cycles-only balance
    try {
      const result = await engramActor.value.walletBalance();
      if ('Ok' in result) {
        walletBalances.value = {
          cycles: result.Ok,
          icpE8s: BigInt(0),
          ckusdcE6s: BigInt(0),
          ckusdtE6s: BigInt(0),
        };
      }
    } catch {
      /* ignore */
    }
  } finally {
    walletLoading.value = false;
  }
}

async function loadTopUpLimits() {
  try {
    topUpLimits.value = await engramActor.value.getTopUpLimits();
  } catch (e) {
    console.warn('Failed to load top-up limits:', e);
  }
}

async function loadTxHistory() {
  if (!engramActor.value || !engramCanisterId.value) return;
  try {
    const account = { owner: Principal.fromText(engramCanisterId.value), subaccount: [] };

    // Load ckUSDC transactions
    const ckusdcIndex = getCkusdcIndexActor();
    if (ckusdcIndex) {
      try {
        const result = await ckusdcIndex.get_account_transactions({
          account,
          start: [],
          max_results: BigInt(50),
        });
        if ('Ok' in result) {
          ckusdcTxHistory.value = result.Ok.transactions.map((tx: any) => ({
            ...tx,
            _token: 'ckUSDC',
          }));
        }
      } catch (e) {
        console.warn('Failed to load ckUSDC tx history:', e);
      }
    }

    // Load ckUSDT transactions
    const ckusdtIndex = getCkusdtIndexActor();
    if (ckusdtIndex) {
      try {
        const result = await ckusdtIndex.get_account_transactions({
          account,
          start: [],
          max_results: BigInt(50),
        });
        if ('Ok' in result) {
          ckusdtTxHistory.value = result.Ok.transactions.map((tx: any) => ({
            ...tx,
            _token: 'ckUSDT',
          }));
        }
      } catch (e) {
        console.warn('Failed to load ckUSDT tx history:', e);
      }
    }
  } catch (e) {
    console.warn('Failed to load tx history:', e);
  }
}

const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://ic0.app';

async function loadEthDepositInfo() {
  if (ethHelperContract.value) return; // already loaded
  // ckETH minter only exists on mainnet — skip on local replica
  if (isLocalHost(IC_HOST)) return;
  ethHelperLoading.value = true;
  try {
    const minter = getMinterActor();
    if (!minter) return;
    const info = await minter.get_minter_info();
    ethHelperContract.value =
      info.erc20_helper_contract_address?.[0] ||
      info.deposit_with_subaccount_helper_contract_address?.[0] ||
      null;
  } catch (e) {
    console.warn('Failed to load ckETH minter info:', e);
  } finally {
    ethHelperLoading.value = false;
  }
}

// Load tx history and ETH deposit info when wallet tab is active
watch(
  activeTab,
  (tab) => {
    if (tab === 'wallet' && engramActor.value) {
      loadTxHistory();
      loadEthDepositInfo();
    }
  },
  { immediate: true },
);

// === Computed properties ===

const combinedTxHistory = computed(() => {
  const all = [...ckusdcTxHistory.value, ...ckusdtTxHistory.value];
  all.sort((a, b) => Number(b.transaction.timestamp) - Number(a.transaction.timestamp));
  return all;
});

const paginatedTxHistory = computed(() => {
  const start = txPage.value * TX_PAGE_SIZE;
  return combinedTxHistory.value.slice(start, start + TX_PAGE_SIZE);
});

const txTotalPages = computed(() =>
  Math.max(1, Math.ceil(combinedTxHistory.value.length / TX_PAGE_SIZE)),
);

// === Withdraw handler ===

async function handleWithdraw() {
  if (!withdrawAmount.value) return;
  withdrawLoading.value = true;
  walletError.value = null;
  walletSuccess.value = null;
  try {
    const parsedAmount = parseFloat(withdrawAmount.value);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      walletError.value = 'Amount must be a positive number';
      return;
    }
    const e = BigInt(Math.floor(parsedAmount * 1_000_000));

    const result = await engramActor.value.ownerWithdraw(withdrawToken.value, e);
    if ('Ok' in result) {
      walletSuccess.value = `Withdrawn ${parsedAmount} ${withdrawToken.value} to your wallet. Block: ${Number(result.Ok)}`;
      withdrawAmount.value = '';
      await Promise.all([loadWalletBalances(), loadTxHistory()]);
    } else {
      walletError.value = result.Err;
    }
  } catch (err: any) {
    walletError.value = err.message;
  } finally {
    withdrawLoading.value = false;
  }
}

// === Top-up handler ===

function onTopUpAmountInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  if (raw === '') {
    topUpAmount.value = '';
    return;
  }
  const val = parseFloat(raw);
  if (topUpMaxCkusdc.value !== null && val > topUpMaxCkusdc.value) {
    topUpAmount.value = topUpMaxCkusdc.value.toFixed(2);
    (e.target as HTMLInputElement).value = topUpAmount.value;
  } else {
    topUpAmount.value = raw;
  }
}

async function handleTopUp() {
  if (!topUpAmount.value || !registryActor.value) return;
  topUpLoading.value = true;
  topUpStep.value = 'transferring';
  cyclesError.value = null;
  cyclesSuccess.value = null;
  try {
    const parsedAmount = parseFloat(topUpAmount.value);

    if (isNaN(parsedAmount) || parsedAmount < 0.1) {
      cyclesError.value = `Minimum top-up is 0.10 ${topUpCurrency.value}`;
      return;
    }

    if (topUpMaxCkusdc.value !== null && parsedAmount > topUpMaxCkusdc.value) {
      cyclesError.value = `Maximum top-up is ${topUpMaxCkusdc.value.toFixed(2)} ${topUpCurrency.value}`;
      return;
    }

    // Step 1: Transfer from engram wallet to registry deposit address
    const e = BigInt(Math.floor(parsedAmount * 1_000_000));

    const transferResult = await engramActor.value.fundTopUp(topUpCurrency.value, e);

    if ('Err' in transferResult) {
      cyclesError.value = `${topUpCurrency.value} transfer to registry failed: ${transferResult.Err}`;
      return;
    }

    // Step 2: Tell registry to convert deposit to cycles
    topUpStep.value = 'converting';
    const result = await registryActor.value.topUpEngramWithStablecoin(topUpCurrency.value);
    if ('Ok' in result) {
      cyclesSuccess.value = `Deposited ${formatCycles(result.Ok.cyclesDeposited)} cycles for ${formatStablecoin(result.Ok.stablecoinChargedE6s)} ${result.Ok.token}`;
      topUpAmount.value = '';
      await Promise.all([loadEngramData(), loadAccountingData(), loadWalletBalances()]);
    } else {
      cyclesError.value = result.Err;
    }
  } catch (err: any) {
    cyclesError.value = err.message;
  } finally {
    topUpLoading.value = false;
    topUpStep.value = '';
  }
}

// === Formatting helpers ===

function formatCycles(n: bigint | number): string {
  const val = Number(n);
  if (val >= 1_000_000_000_000) return (val / 1_000_000_000_000).toFixed(2) + 'T';
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  return val.toLocaleString();
}

function formatStablecoin(e6s: bigint | number): string {
  return (Number(e6s) / 1_000_000).toFixed(2);
}

function formatDateTime(nanos: bigint | number): string {
  return new Date(Number(nanos) / 1_000_000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrincipal(p: any): string {
  const text = p?.toText?.() || p?.toString?.() || '';
  return text.length > 20 ? text.slice(0, 10) + '...' + text.slice(-5) : text;
}

function formatEventAmount(event: any): string {
  const token = event.token;
  const amount = Number(event.amountPaid);
  if (token === 'ICP') return (amount / 1e8).toFixed(4) + ' ICP';
  if (token === 'ckUSDC' || token === 'ckUSDT') return (amount / 1e6).toFixed(2) + ' ' + token;
  return amount.toLocaleString() + ' cycles';
}

function formatTxAmount(tx: any): string {
  const t = tx.transaction;
  const op = t.transfer?.[0] || t.mint?.[0] || t.burn?.[0];
  if (!op) return '—';
  const amt = Number(op.amount) / 1_000_000;
  const token = tx._token || 'ckUSDC';
  return `${amt.toFixed(2)} ${token}`;
}

function txDirection(tx: any, engramPrincipal: string): 'in' | 'out' | '—' {
  const t = tx.transaction;
  if (t.mint?.[0]) return 'in';
  if (t.burn?.[0]) return 'out';
  if (t.transfer?.[0]) {
    const to = t.transfer[0].to?.owner?.toText?.() || t.transfer[0].to?.owner?.toString?.();
    return to === engramPrincipal ? 'in' : 'out';
  }
  return '—';
}

function txCounterparty(tx: any, engramPrincipal: string): string {
  const t = tx.transaction;
  if (t.transfer?.[0]) {
    const to = t.transfer[0].to?.owner?.toText?.() || t.transfer[0].to?.owner?.toString?.();
    return to === engramPrincipal
      ? formatPrincipal(t.transfer[0].from?.owner)
      : formatPrincipal(t.transfer[0].to?.owner);
  }
  if (t.mint?.[0]) return 'Mint';
  if (t.burn?.[0]) return 'Burn';
  return '—';
}

// === Chart computation ===

const chartPoints = computed(() => {
  if (cycleHistory.value.length < 2) return '';
  const data = cycleHistory.value.map(([ts, bal]) => ({
    x: Number(ts),
    y: Number(bal),
  }));

  const minX = data[0]!.x;
  const maxX = data[data.length - 1]!.x;
  const rangeX = maxX - minX || 1;

  const minY = Math.min(...data.map((d) => d.y));
  const maxY = Math.max(...data.map((d) => d.y));
  const rangeY = maxY - minY || 1;

  const W = 600;
  const H = 160;
  const pad = 4;

  return data
    .map((d) => {
      const x = pad + ((d.x - minX) / rangeX) * (W - 2 * pad);
      const y = H - pad - ((d.y - minY) / rangeY) * (H - 2 * pad);
      return `${x},${y}`;
    })
    .join(' ');
});

const chartLabels = computed(() => {
  if (cycleHistory.value.length < 2) return [];
  const data = cycleHistory.value;
  const first = data[0]!;
  const last = data[data.length - 1]!;
  return [formatDateTime(first[0]), formatDateTime(last[0])];
});

const burnRate = computed(() => {
  if (cycleHistory.value.length < 2) return null;
  const data = cycleHistory.value;
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const timeDiffHours = (Number(last[0]) - Number(first[0])) / 3_600_000_000_000;
  if (timeDiffHours <= 0) return null;
  const cycleDiff = Number(first[1]) - Number(last[1]);
  if (cycleDiff <= 0) return null; // gaining cycles, no burn
  const perDay = (cycleDiff / timeDiffHours) * 24;
  const currentBalance = Number(last[1]);
  const daysRemaining = currentBalance / perDay;
  return { perDay, daysRemaining: Math.floor(daysRemaining) };
});

const topUpButtonText = computed(() => {
  if (!topUpLoading.value) return 'Top Up';
  if (topUpStep.value === 'transferring') return `Transferring ${topUpCurrency.value}...`;
  if (topUpStep.value === 'converting') return 'Converting to Cycles...';
  return 'Processing...';
});

const feePercent = computed(() =>
  platformFeeBps.value !== null ? (platformFeeBps.value / 100).toFixed(0) + '%' : null,
);

const topUpBreakdown = computed(() => {
  const amt = parseFloat(topUpAmount.value);
  if (!amt || amt <= 0 || platformFeeBps.value === null) return null;
  const fee = 10_000; // ledger fee (0.01 in e6s)
  const amountUnits = amt * 1_000_000;
  const net = amountUnits - 2 * fee;
  if (net <= 0) return null;
  const platformFee = (net * platformFeeBps.value) / 10_000;
  const operational = net - platformFee;
  const estimatedCycles = operational * 751_900; // 1 USD ≈ 751.9B cycles
  return { estimatedCycles };
});

const walletAvailableForTopUp = computed(() => {
  if (!walletBalances.value) return '0';
  const bal =
    topUpCurrency.value === 'ckUSDT'
      ? walletBalances.value.ckusdtE6s
      : walletBalances.value.ckusdcE6s;
  return formatStablecoin(bal);
});

const topUpMaxCkusdc = computed(() => {
  if (!topUpLimits.value) return null;
  return Number(topUpLimits.value.maxCkusdcE6s) / 1_000_000;
});

const topUpMaxDisplay = computed(() => {
  if (topUpMaxCkusdc.value === null) return null;
  return topUpMaxCkusdc.value.toFixed(2) + ' ' + topUpCurrency.value;
});

const topUpCooldownDisplay = computed(() => {
  if (!topUpLimits.value) return null;
  const secs = Number(topUpLimits.value.cooldownSeconds);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m`;
});

const walletTotalUsd = computed(() => {
  const usdc = Number(walletBalances.value?.ckusdcE6s ?? 0n) / 1_000_000;
  const usdt = Number(walletBalances.value?.ckusdtE6s ?? 0n) / 1_000_000;
  return (usdc + usdt).toFixed(2);
});

const engramPrincipalText = computed(() => engramCanisterId.value || '');

// Generate QR code when engram principal is known
watch(
  engramPrincipalText,
  async (principal) => {
    if (!principal) {
      depositQrDataUrl.value = null;
      return;
    }
    try {
      depositQrDataUrl.value = await QRCode.toDataURL(principal, {
        width: 200,
        margin: 2,
        color: { dark: '#ffffffdd', light: '#00000000' },
      });
    } catch {
      depositQrDataUrl.value = null;
    }
  },
  { immediate: true },
);

async function copyAddress() {
  if (!engramPrincipalText.value) return;
  try {
    await navigator.clipboard.writeText(engramPrincipalText.value);
    addressCopied.value = true;
    setTimeout(() => {
      addressCopied.value = false;
    }, 2000);
  } catch {
    /* clipboard may fail in some contexts */
  }
}

async function copyEthHex() {
  if (!ethPrincipalHex.value) return;
  try {
    await navigator.clipboard.writeText(ethPrincipalHex.value);
    ethHexCopied.value = true;
    setTimeout(() => {
      ethHexCopied.value = false;
    }, 2000);
  } catch {
    /* ignore */
  }
}

async function copyEthContract() {
  if (!ethHelperContract.value) return;
  try {
    await navigator.clipboard.writeText(ethHelperContract.value);
    ethContractCopied.value = true;
    setTimeout(() => {
      ethContractCopied.value = false;
    }, 2000);
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div v-if="!engramActor" class="max-w-5xl mx-auto px-4 py-8">
    <p class="text-gray-400">No engram connected.</p>
  </div>

  <div v-else class="max-w-3xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-6">Billing</h1>

    <!-- Tab Bar -->
    <div class="flex border-b border-gray-800 mb-6">
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'cycles'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'cycles'"
      >
        Cycles
      </button>
      <button
        :class="[
          'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
          activeTab === 'wallet'
            ? 'border-engram-500 text-engram-400'
            : 'border-transparent text-gray-400 hover:text-white',
        ]"
        @click="activeTab = 'wallet'"
      >
        Wallet
      </button>
    </div>

    <!-- Cycles Tab -->
    <div v-if="activeTab === 'cycles'">
      <!-- Balance Card -->
      <div class="card mb-6">
        <div class="flex items-center gap-4">
          <div
            class="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-500/10 text-yellow-400"
          >
            <EngramIcon name="zap" :size="24" />
          </div>
          <div>
            <span class="text-sm text-gray-500">Cycle Balance</span>
            <div v-if="cyclesLoading">
              <LoadingSpinner size="sm" />
            </div>
            <p v-else class="text-2xl md:text-4xl font-bold text-white mt-1">
              {{ engramStatus ? formatCycles(engramStatus.cyclesBalance) : 'N/A' }}
            </p>
          </div>
        </div>
        <div v-if="burnRate" class="mt-3 text-sm text-gray-400">
          Burn rate: ~{{ formatCycles(burnRate.perDay) }}/day
          <span class="text-gray-500 ml-2">|</span>
          <span
            class="ml-2"
            :class="burnRate.daysRemaining < 7 ? 'text-red-400' : 'text-green-400'"
          >
            ~{{ burnRate.daysRemaining }} days remaining
          </span>
        </div>
      </div>

      <!-- Usage Chart -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Usage Over Time</h2>
        <div v-if="cycleHistory.length < 2" class="text-gray-500 text-sm py-8 text-center">
          Not enough data yet. Snapshots are recorded hourly.
        </div>
        <div v-else>
          <svg viewBox="0 0 600 160" class="w-full h-40" preserveAspectRatio="none">
            <polyline
              :points="chartPoints"
              fill="none"
              stroke="#a78bfa"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
          <div class="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>{{ chartLabels[0] }}</span>
            <span>{{ chartLabels[1] }}</span>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-if="cyclesError"
        class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400"
      >
        {{ cyclesError }}
      </div>
      <div
        v-if="cyclesSuccess"
        class="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4 text-green-400"
      >
        {{ cyclesSuccess }}
      </div>

      <!-- Top-Up Form -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Top Up with Stablecoin</h2>

        <!-- Token Selector -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="t in ['ckUSDC', 'ckUSDT'] as const"
            :key="t"
            :class="[
              'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
              topUpCurrency === t
                ? 'bg-engram-500/20 text-engram-400 border border-engram-500/40'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white',
            ]"
            @click="topUpCurrency = t"
          >
            {{ t }}
          </button>
        </div>

        <p class="text-sm text-gray-400 mb-4">
          Transfer {{ topUpCurrency }} from your engram wallet to receive cycles.
          <span v-if="feePercent"
            >Platform fee: <span class="text-white font-medium">{{ feePercent }}</span
            >.</span
          >
          <span v-if="topUpMaxDisplay">
            Max per top-up: <span class="text-white font-medium">{{ topUpMaxDisplay }}</span
            >.</span
          >
          <span v-if="topUpCooldownDisplay">
            Cooldown: <span class="text-white font-medium">{{ topUpCooldownDisplay }}</span
            >.</span
          >
        </p>

        <!-- Available Balance -->
        <div class="bg-gray-800/50 rounded-lg p-3 mb-4">
          <span class="text-xs text-gray-500">Available in wallet</span>
          <p class="text-sm text-white font-mono mt-1">
            {{ walletAvailableForTopUp }} {{ topUpCurrency }}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Amount ({{ topUpCurrency }})</label>
            <input
              :value="topUpAmount"
              @input="onTopUpAmountInput"
              type="number"
              placeholder="1.00"
              step="0.10"
              min="0.10"
              :max="topUpMaxCkusdc ?? undefined"
              class="input"
            />
          </div>
          <!-- Breakdown -->
          <div v-if="topUpBreakdown" class="bg-gray-800/50 rounded-lg p-3 text-sm font-mono">
            <div class="flex justify-between text-gray-400">
              <span>Top up:</span>
              <span class="text-white"
                >~{{ formatCycles(topUpBreakdown.estimatedCycles) }} cycles</span
              >
            </div>
          </div>

          <button class="btn-primary w-full" :disabled="topUpLoading" @click="handleTopUp">
            {{ topUpButtonText }}
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          {{ topUpCurrency }} is converted to cycles at the current USD exchange rate. A depeg
          safety check is performed via the XRC canister.
        </p>
      </div>

      <!-- Accounting History -->
      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">Top-Up History</h2>
        <div
          v-if="!accounting || accounting.topUpHistory.length === 0"
          class="text-gray-500 text-sm py-4 text-center"
        >
          No top-ups yet.
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="(event, i) in [...accounting.topUpHistory].reverse()"
            :key="i"
            class="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
          >
            <div>
              <span class="text-sm text-white">{{ formatCycles(event.cyclesAmount) }} cycles</span>
              <span class="text-xs text-gray-500 ml-2">
                <template v-if="event.token === 'creation'">Starter Gift</template>
                <template v-else-if="event.token === 'cycles'"
                  >{{ formatCycles(event.amountPaid) }} cycles paid</template
                >
                <template v-else>{{ formatEventAmount(event) }} paid</template>
              </span>
            </div>
            <span class="text-xs text-gray-500">{{ formatDateTime(event.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Wallet Tab -->
    <div v-if="activeTab === 'wallet'">
      <!-- Balance Card -->
      <div class="card mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div
            class="flex items-center justify-center w-12 h-12 rounded-lg bg-engram-500/10 text-engram-400"
          >
            <EngramIcon name="wallet" :size="24" />
          </div>
          <div class="flex-1">
            <span class="text-sm text-gray-500">Engram Wallet</span>
            <div v-if="walletLoading">
              <LoadingSpinner size="sm" />
            </div>
            <div v-else>
              <p class="text-2xl md:text-4xl font-bold text-white mt-1">${{ walletTotalUsd }}</p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span
                  >{{ formatStablecoin(walletBalances?.ckusdcE6s ?? 0n) }}
                  <span class="text-gray-500">ckUSDC</span></span
                >
                <span
                  >{{ formatStablecoin(walletBalances?.ckusdtE6s ?? 0n) }}
                  <span class="text-gray-500">ckUSDT</span></span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-if="walletError"
        class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 text-red-400"
      >
        {{ walletError }}
      </div>
      <div
        v-if="walletSuccess"
        class="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4 text-green-400"
      >
        {{ walletSuccess }}
      </div>

      <!-- Deposit Address -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Deposit</h2>
        <p class="text-sm text-gray-400 mb-4">
          Send ckUSDC or ckUSDT to the address below. Both tokens are deposited to the same engram
          address.
        </p>

        <div v-if="engramPrincipalText" class="bg-gray-800/50 rounded-lg p-4">
          <div class="flex items-start gap-4">
            <div v-if="depositQrDataUrl" class="flex-shrink-0">
              <img :src="depositQrDataUrl" alt="Deposit address QR" class="w-32 h-32 rounded" />
            </div>
            <div class="flex-1 min-w-0">
              <span class="text-xs text-gray-500 block mb-1">Engram Deposit Address</span>
              <p class="text-sm text-white font-mono break-all leading-relaxed">
                {{ engramPrincipalText }}
              </p>
              <button
                class="mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors"
                :class="
                  addressCopied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-300 hover:text-white'
                "
                @click="copyAddress"
              >
                {{ addressCopied ? 'Copied!' : 'Copy Address' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-gray-500 text-sm">Loading deposit address...</div>
      </div>

      <!-- Ethereum Deposit (USDC → ckUSDC) -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-2">Deposit from Ethereum</h2>

        <!-- Ethereum token selector -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="t in ['USDC', 'USDT'] as const"
            :key="t"
            :class="[
              'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
              ethDepositToken === t
                ? 'bg-engram-500/20 text-engram-400 border border-engram-500/40'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white',
            ]"
            @click="ethDepositToken = t"
          >
            {{ t }}
          </button>
        </div>

        <p class="text-sm text-gray-400 mb-4">
          Send {{ ethDepositToken }} (ERC-20) from any Ethereum wallet on
          <span class="text-white font-medium">Ethereum Mainnet only</span>. It will be minted as
          ck{{ ethDepositToken }} in your engram (~20 min). Do not send from other networks.
        </p>

        <div v-if="ethHelperLoading" class="py-4">
          <LoadingSpinner size="sm" />
        </div>
        <div v-else-if="ethHelperContract && ethPrincipalHex">
          <ol class="text-sm text-gray-300 space-y-3 mb-4 list-decimal list-inside">
            <li>
              <span class="text-gray-400">Approve</span> the helper contract to spend your
              {{ ethDepositToken }} on the
              <a
                :href="`https://etherscan.io/token/${ethTokenContract}#writeProxyContract`"
                target="_blank"
                rel="noopener"
                class="text-engram-400 hover:underline"
                >{{ ethDepositToken }} contract</a
              >. <br /><span class="text-xs text-gray-500"
                >Spender: the helper contract address below.</span
              >
            </li>
            <li>
              Call <code class="text-engram-400">deposit</code> on the helper contract with:
              <br /><span class="text-xs text-gray-500"
                ><code>_token</code>: {{ ethDepositToken }} contract &middot; <code>_amount</code>:
                amount in 6-decimal units &middot; <code>_principal</code>: your engram bytes32
                below.</span
              >
            </li>
            <li>
              Wait ~20 minutes for Ethereum finality. ck{{ ethDepositToken }} will appear in your
              wallet balance.
            </li>
          </ol>

          <div class="space-y-3">
            <!-- Helper Contract -->
            <div class="bg-gray-800/50 rounded-lg p-3">
              <span class="text-xs text-gray-500 block mb-1">ERC-20 Helper Contract</span>
              <div class="flex items-center gap-2">
                <p class="text-sm text-white font-mono break-all flex-1">{{ ethHelperContract }}</p>
                <button
                  class="flex-shrink-0 text-xs px-2 py-1 rounded transition-colors"
                  :class="
                    ethContractCopied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-700 text-gray-300 hover:text-white'
                  "
                  @click="copyEthContract"
                >
                  {{ ethContractCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <a
                :href="`https://etherscan.io/address/${ethHelperContract}#writeContract`"
                target="_blank"
                rel="noopener"
                class="text-xs text-engram-400 hover:underline mt-1 inline-block"
              >
                View on Etherscan
              </a>
            </div>

            <!-- Engram Principal as bytes32 -->
            <div class="bg-gray-800/50 rounded-lg p-3">
              <span class="text-xs text-gray-500 block mb-1">Engram Principal (bytes32)</span>
              <div class="flex items-center gap-2">
                <p class="text-sm text-white font-mono break-all flex-1">{{ ethPrincipalHex }}</p>
                <button
                  class="flex-shrink-0 text-xs px-2 py-1 rounded transition-colors"
                  :class="
                    ethHexCopied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-700 text-gray-300 hover:text-white'
                  "
                  @click="copyEthHex"
                >
                  {{ ethHexCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>

            <!-- Token Contract Reference -->
            <div class="bg-gray-800/50 rounded-lg p-3">
              <span class="text-xs text-gray-500 block mb-1"
                >{{ ethDepositToken }} Contract (ERC-20)</span
              >
              <p class="text-sm text-white font-mono break-all">{{ ethTokenContract }}</p>
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-3">
            Ethereum gas fees apply. The ckETH minter processes deposits after ~30 Ethereum block
            confirmations.
          </p>
        </div>
        <div v-else class="text-gray-500 text-sm">
          Unable to load Ethereum deposit info. Try refreshing the page.
        </div>
      </div>

      <!-- Withdraw -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Withdraw</h2>

        <!-- Token Selector -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="t in ['ckUSDC', 'ckUSDT'] as const"
            :key="t"
            :class="[
              'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
              withdrawToken === t
                ? 'bg-engram-500/20 text-engram-400 border border-engram-500/40'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white',
            ]"
            @click="withdrawToken = t"
          >
            {{ t }}
          </button>
        </div>

        <p class="text-sm text-gray-400 mb-4">
          Withdraw {{ withdrawToken }} from your engram back to your owner wallet.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Amount ({{ withdrawToken }})</label>
            <input
              v-model="withdrawAmount"
              type="number"
              placeholder="0.00"
              step="0.10"
              class="input"
            />
          </div>
          <button class="btn-primary w-full" :disabled="withdrawLoading" @click="handleWithdraw">
            {{ withdrawLoading ? 'Withdrawing...' : 'Withdraw to Owner Wallet' }}
          </button>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="card">
        <h2 class="text-lg font-semibold text-white mb-4">Transaction History</h2>
        <div v-if="combinedTxHistory.length === 0" class="text-gray-500 text-sm py-4 text-center">
          No transactions yet.
        </div>
        <div v-else>
          <div class="space-y-1">
            <div
              v-for="tx in paginatedTxHistory"
              :key="`${tx._token}-${tx.id}`"
              class="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
            >
              <div class="flex items-center gap-3">
                <span
                  :class="[
                    'text-xs font-medium px-2 py-0.5 rounded',
                    txDirection(tx, engramPrincipalText) === 'in'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400',
                  ]"
                >
                  {{ txDirection(tx, engramPrincipalText) === 'in' ? 'IN' : 'OUT' }}
                </span>
                <div>
                  <span class="text-sm text-white">{{ formatTxAmount(tx) }}</span>
                  <span class="text-xs text-gray-500 ml-2">{{
                    txCounterparty(tx, engramPrincipalText)
                  }}</span>
                </div>
              </div>
              <span class="text-xs text-gray-500">{{
                formatDateTime(tx.transaction.timestamp)
              }}</span>
            </div>
          </div>
          <!-- Pagination -->
          <div v-if="txTotalPages > 1" class="flex items-center justify-center gap-4 mt-4">
            <button
              class="text-sm text-gray-400 hover:text-white disabled:opacity-30"
              :disabled="txPage === 0"
              @click="txPage--"
            >
              Previous
            </button>
            <span class="text-sm text-gray-500">{{ txPage + 1 }} / {{ txTotalPages }}</span>
            <button
              class="text-sm text-gray-400 hover:text-white disabled:opacity-30"
              :disabled="txPage >= txTotalPages - 1"
              @click="txPage++"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="card mt-6">
        <h2 class="text-lg font-semibold text-white mb-2">Spending Limits</h2>
        <p class="text-gray-400 text-sm">
          Operator spending limits and address allowlists can be configured per operator from the
          Operators page. Operators can only transfer to pre-approved addresses within their daily
          limit.
        </p>
      </div>
    </div>
  </div>
</template>
