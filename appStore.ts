// App-level state (screens, settings, saved progress) as a minimal external store.
import { useSyncExternalStore } from 'react';
import {
  loadProgress, loadSettings, saveProgress, saveSettings, type Progress, type Settings,
} from './persist';
import { sfx } from '../game/audio/Sfx';

export type Screen = 'menu' | 'game';
export type Modal = null | 'settings' | 'howto';

interface AppState {
  screen: Screen;
  modal: Modal;
  settings: Settings;
  progress: Progress;
  runId: number;
}

class AppStore {
  state: AppState = {
    screen: 'menu', modal: null, settings: loadSettings(), progress: loadProgress(), runId: 0,
  };
  private listeners = new Set<() => void>();

  constructor() {
    sfx.setVolumes(this.state.settings.sfxVolume, this.state.settings.musicVolume);
  }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getState = () => this.state;

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  play() {
    sfx.unlock();
    sfx.startMusic();
    sfx.play('click');
    this.set({ screen: 'game', modal: null, runId: this.state.runId + 1 });
  }

  toMenu() { this.set({ screen: 'menu', modal: null }); }
  openModal(modal: Modal) { sfx.unlock(); sfx.play('click'); this.set({ modal }); }
  closeModal() { this.set({ modal: null }); }

  updateSettings(patch: Partial<Settings>) {
    const settings = { ...this.state.settings, ...patch };
    saveSettings(settings);
    sfx.setVolumes(settings.sfxVolume, settings.musicVolume);
    this.set({ settings });
  }

  /** Saves a finished run; returns true when it is a new best score. */
  recordGame(r: { victory: boolean; score: number; stars: number; wave: number; kills: number }): boolean {
    const p = this.state.progress;
    const best = r.score > p.bestScore;
    const progress: Progress = {
      bestScore: Math.max(p.bestScore, r.score),
      bestStars: Math.max(p.bestStars, r.stars),
      wins: p.wins + (r.victory ? 1 : 0),
      games: p.games + 1,
      highestWave: Math.max(p.highestWave, r.wave),
      totalKills: p.totalKills + r.kills,
      lastPlayed: new Date().toISOString(),
    };
    saveProgress(progress);
    this.set({ progress });
    return best;
  }

  resetProgress() {
    const progress: Progress = { bestScore: 0, bestStars: 0, wins: 0, games: 0, highestWave: 0, totalKills: 0, lastPlayed: null };
    saveProgress(progress);
    this.set({ progress });
  }
}

export const appStore = new AppStore();
export const useApp = () => useSyncExternalStore(appStore.subscribe, appStore.getState);
