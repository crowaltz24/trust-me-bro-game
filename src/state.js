const STORAGE_KEY = "meme-market-state";
const SAVE_KEY = "meme-market-save";

export const DEFAULT_STATE = {
  tickMs: 1000,
  daySeconds: 300,
  dayCount: 1,
  elapsedToday: 0,
  isPaused: false,
  cash: 15000,
  seed: 452199,
  activeTab: "stocks",
  activeAssetId: "EPSN",
};

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_STATE, seed: Math.floor(Math.random() * 1_000_000_000) };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      seed:
        typeof parsed.seed === "number"
          ? parsed.seed
          : Math.floor(Math.random() * 1_000_000_000),
    };
  } catch (error) {
    return { ...DEFAULT_STATE, seed: Math.floor(Math.random() * 1_000_000_000) };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveRun(snapshot) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
}

export function loadRun() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function clearRun() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

export function formatTimer(seconds) {
  const min = Math.max(0, Math.floor(seconds / 60));
  const sec = Math.max(0, Math.floor(seconds % 60));
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
