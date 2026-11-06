// LocalStorage persistence for settings and player progress.

export interface Settings {
  sfxVolume: number;   // 0..1
  musicVolume: number; // 0..1
  quality: 'high' | 'low';
  showRanges: boolean; // show beacon/aura links etc.
  autoNextWave: boolean;
}

export interface Progress {
  bestScore: number;
  bestStars: number;
  wins: number;
  games: number;
  highestWave: number;
  totalKills: number;
  lastPlayed: string | null;
}

const KEY_SETTINGS = 'aetherkeep.settings.v1';
const KEY_PROGRESS = 'aetherkeep.progress.v1';

export const DEFAULT_SETTINGS: Settings = {
  sfxVolume: 0.7, musicVolume: 0.4, quality: 'high', showRanges: true, autoNextWave: true,
};

export const DEFAULT_PROGRESS: Progress = {
  bestScore: 0, bestStars: 0, wins: 0, games: 0, highestWave: 0, totalKills: 0, lastPlayed: null,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return { ...fallback };
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export const loadSettings = () => read(KEY_SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);
export const loadProgress = () => read(KEY_PROGRESS, DEFAULT_PROGRESS);
export const saveProgress = (p: Progress) => write(KEY_PROGRESS, p);
