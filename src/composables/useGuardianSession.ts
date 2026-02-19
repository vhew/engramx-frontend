const STORAGE_KEY = 'engramx-guardian-engrams';

export function useGuardianSession() {
  function getGuardianEngrams(): { canisterId: string }[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addGuardianEngram(canisterId: string): void {
    const existing = getGuardianEngrams();
    if (!existing.some((e) => e.canisterId === canisterId)) {
      existing.push({ canisterId });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }

  function removeGuardianEngram(canisterId: string): void {
    const existing = getGuardianEngrams().filter((e) => e.canisterId !== canisterId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  function clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getGuardianEngrams, addGuardianEngram, removeGuardianEngram, clear };
}
