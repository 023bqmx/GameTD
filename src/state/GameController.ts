/**
 * The single bridge between the pure Engine, the Phaser renderer and the React UI.
 * - React reads state + calls commands; it subscribes via useSyncExternalStore.
 * - Phaser drives step(dt), forwards field taps and listens for game events.
 */
import { Engine } from '../game/engine/Engine';
import type { GameEvent, TargetMode, TowerType } from '../game/engine/types';
import { TOWERS } from '../game/data/towers';
import { ENEMIES } from '../game/data/enemies';
import { isPad, COLS, ROWS } from '../game/data/map';
import { sfx } from '../game/audio/Sfx';
import { appStore } from './appStore';

export type Selection =
  | { kind: 'none' }
  | { kind: 'pad'; c: number; r: number }
  | { kind: 'tower'; id: number };

export interface Banner { id: number; title: string; sub: string; tone: 'info' | 'boss' | 'good' | 'bad' }

export interface ResultData {
  victory: boolean;
  kills: number;
  energySpent: number;
  coreHp: number;
  maxCoreHp: number;
  wave: number;
  totalWaves: number;
  score: number;
  stars: number;
  best: boolean;
  time: number;
}

type Listener = () => void;
type EventListener = (events: GameEvent[]) => void;

export class GameController {
  engine = new Engine();
  armed: TowerType | null = null;
  selection: Selection = { kind: 'none' };
  surgeTargeting = false;
  paused = false;
  speed: 1 | 2 = 1;
  banner: Banner | null = null;
  result: ResultData | null = null;
  toast: { id: number; text: string } | null = null;
  coreHitAt = 0;
  version = 0;

  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private lastNotify = 0;
  private bannerId = 0;
  private endTimer: number | null = null;

  // ------------------------------------------------------ subscriptions
  subscribe = (fn: Listener) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;
  onEvents(fn: EventListener) { this.eventListeners.add(fn); return () => { this.eventListeners.delete(fn); }; }

  notify(force = true) {
    const now = performance.now();
    if (!force && now - this.lastNotify < 100) return;
    this.lastNotify = now;
    this.version++;
    this.listeners.forEach((l) => l());
  }

  // ------------------------------------------------------ frame driving
  /** Called by the Phaser scene every frame with real seconds. */
  tick(realDt: number) {
    if (!this.paused && !this.result) {
      let dt = Math.min(realDt, 0.1) * this.speed;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 30);
        this.engine.step(h);
        dt -= h;
      }
    }
    const events = this.engine.drainEvents();
    if (events.length) {
      this.handleEvents(events);
      this.eventListeners.forEach((l) => l(events));
    }
    const important = events.some((e) => e.type !== 'fire' && e.type !== 'hit' && e.type !== 'chain' && e.type !== 'explode');
    this.notify(important);
  }

  private handleEvents(events: GameEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case 'waveStart': {
          const def = this.engine.waveComposition(e.wave);
          this.showBanner(e.boss ? `BOSS WAVE ${e.wave}` : `WAVE ${e.wave}`,
            e.boss ? 'จอมราชันความว่างกำลังมา!' : def.map((d) => `${ENEMIES[d.type].name} ×${d.count}`).join(' · '),
            e.boss ? 'boss' : 'info');
          sfx.play(e.boss ? 'boss' : 'wave');
          break;
        }
        case 'waveClear':
          if (e.wave < this.engine.totalWaves) this.showBanner(`WAVE ${e.wave} CLEARED`, `+${e.bonus} Energy`, 'good');
          break;
        case 'leak':
          this.coreHitAt = performance.now();
          sfx.play('leak');
          break;
        case 'kill': sfx.play('kill'); break;
        case 'victory': this.scheduleEnd(true); break;
        case 'defeat': this.scheduleEnd(false); break;
        case 'sell':
          if (this.selection.kind === 'tower' && this.selection.id === e.towerId) this.selection = { kind: 'none' };
          break;
      }
    }
    if (this.engine.phase === 'prep' && this.engine.intermission !== null && !appStore.state.settings.autoNextWave) {
      // player prefers manual waves: freeze the countdown
      this.engine.intermission = null;
    }
  }

  private scheduleEnd(victory: boolean) {
    if (this.endTimer !== null) return;
    sfx.play(victory ? 'win' : 'lose');
    this.endTimer = window.setTimeout(() => {
      const eng = this.engine;
      const score = eng.score();
      const stars = eng.stars();
      const best = appStore.recordGame({ victory, score, stars, wave: eng.wave, kills: eng.stats.kills });
      this.result = {
        victory, kills: eng.stats.kills, energySpent: eng.stats.energySpent, coreHp: eng.coreHp,
        maxCoreHp: eng.maxCoreHp, wave: eng.wave, totalWaves: eng.totalWaves, score, stars, best,
        time: eng.stats.elapsed,
      };
      this.armed = null;
      this.selection = { kind: 'none' };
      this.surgeTargeting = false;
      this.notify();
    }, 1400);
  }

  private showBanner(title: string, sub: string, tone: Banner['tone']) {
    this.banner = { id: ++this.bannerId, title, sub, tone };
  }

  showToast(text: string) {
    this.toast = { id: Date.now(), text };
    this.notify();
  }

  // ------------------------------------------------------ input from field
  tapField(x: number, y: number) {
    if (this.result) return;
    sfx.unlock();
    if (this.surgeTargeting) {
      if (this.engine.castSurge(x, y)) { sfx.play('surge'); this.surgeTargeting = false; }
      this.notify();
      return;
    }
    const c = Math.floor(x), r = Math.floor(y);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) { this.clearSelection(); return; }
    const tower = this.engine.towerAt(c, r);
    if (tower) {
      sfx.play('click');
      this.selection = { kind: 'tower', id: tower.id };
      this.armed = null;
      this.notify();
      return;
    }
    if (isPad(c, r)) {
      if (this.armed) { this.build(this.armed, c, r); return; }
      sfx.play('click');
      this.selection = { kind: 'pad', c, r };
      this.notify();
      return;
    }
    this.clearSelection();
  }

  // ------------------------------------------------------------ commands
  armTower(type: TowerType) {
    sfx.unlock();
    if (this.selection.kind === 'pad') {
      this.build(type, this.selection.c, this.selection.r);
      return;
    }
    this.armed = this.armed === type ? null : type;
    if (this.armed) this.selection = { kind: 'none' };
    this.surgeTargeting = false;
    sfx.play('click');
    this.notify();
  }

  build(type: TowerType, c: number, r: number) {
    const cost = TOWERS[type].levels[0].cost;
    if (this.engine.energy < cost) {
      sfx.play('deny');
      this.showToast(`Energy ไม่พอ (ต้องการ ${cost})`);
      return;
    }
    const t = this.engine.build(type, c, r);
    if (t) {
      sfx.play('build');
      // keep the build flow fast: nothing stays selected after placing a tower
      this.selection = { kind: 'none' };
      this.armed = null;
    }
    this.notify();
  }

  upgradeSelected() {
    if (this.selection.kind !== 'tower') return;
    const t = this.engine.getTower(this.selection.id);
    if (!t) return;
    const cost = this.engine.upgradeCost(t);
    if (cost === null) return;
    if (this.engine.upgrade(t.id)) sfx.play('upgrade');
    else { sfx.play('deny'); this.showToast(`Energy ไม่พอ (ต้องการ ${cost})`); }
    this.notify();
  }

  sellSelected() {
    if (this.selection.kind !== 'tower') return;
    if (this.engine.sell(this.selection.id)) sfx.play('sell');
    this.selection = { kind: 'none' };
    this.notify();
  }

  setTargetMode(mode: TargetMode) {
    if (this.selection.kind !== 'tower') return;
    this.engine.setMode(this.selection.id, mode);
    sfx.play('click');
    this.notify();
  }

  cycleTargetMode() {
    if (this.selection.kind !== 'tower') return;
    const t = this.engine.getTower(this.selection.id);
    if (!t) return;
    const modes: TargetMode[] = ['first', 'last', 'strong', 'near'];
    this.setTargetMode(modes[(modes.indexOf(t.mode) + 1) % modes.length]);
  }

  clearSelection() {
    this.selection = { kind: 'none' };
    this.armed = null;
    this.surgeTargeting = false;
    this.notify();
  }

  startWave() {
    sfx.unlock();
    if (this.engine.startWave()) this.notify();
  }

  toggleSurge() {
    sfx.unlock();
    if (this.engine.surgeCooldown > 0) { sfx.play('deny'); return; }
    this.surgeTargeting = !this.surgeTargeting;
    if (this.surgeTargeting) { this.armed = null; this.selection = { kind: 'none' }; }
    sfx.play('click');
    this.notify();
  }

  setSpeed(s: 1 | 2) { this.speed = s; sfx.play('click'); this.notify(); }
  toggleSpeed() { this.setSpeed(this.speed === 1 ? 2 : 1); }
  setPaused(p: boolean) { if (this.result) return; this.paused = p; this.notify(); }

  restart() {
    if (this.endTimer !== null) { clearTimeout(this.endTimer); this.endTimer = null; }
    this.engine = new Engine();
    this.armed = null;
    this.selection = { kind: 'none' };
    this.surgeTargeting = false;
    this.paused = false;
    this.speed = 1;
    this.banner = null;
    this.result = null;
    this.toast = null;
    this.resetListeners.forEach((l) => l());
    this.notify();
  }

  private resetListeners = new Set<Listener>();
  onReset(fn: Listener) { this.resetListeners.add(fn); return () => { this.resetListeners.delete(fn); }; }

  dispose() {
    if (this.endTimer !== null) clearTimeout(this.endTimer);
  }
}
