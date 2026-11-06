import { TOWERS, SELL_RATIO, MAX_LEVEL } from '../data/towers';
import { ENEMIES } from '../data/enemies';
import {
  WAVES, waveHpScale, START_ENERGY, CORE_HP, INTERMISSION, waveClearBonus, SURGE,
} from '../data/waves';
import { PATH, PADS } from '../data/map';
import type {
  Enemy, EnemyType, GameEvent, GameStats, Phase, Projectile, TargetMode, Tower, TowerType, Vec,
} from './types';

interface Segment { ax: number; ay: number; dx: number; dy: number; len: number; start: number }

const SEGMENTS: Segment[] = (() => {
  const out: Segment[] = [];
  let acc = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    out.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len, len, start: acc });
    acc += len;
  }
  return out;
})();
export const PATH_LENGTH = SEGMENTS.reduce((s, g) => s + g.len, 0);

export function pathPoint(dist: number): { x: number; y: number; dx: number; dy: number } {
  const d = Math.max(0, Math.min(PATH_LENGTH, dist));
  for (const s of SEGMENTS) {
    if (d <= s.start + s.len) {
      const t = d - s.start;
      return { x: s.ax + s.dx * t, y: s.ay + s.dy * t, dx: s.dx, dy: s.dy };
    }
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return { x: last.ax + last.dx * last.len, y: last.ay + last.dy * last.len, dx: last.dx, dy: last.dy };
}

interface SpawnEntry { time: number; type: EnemyType }

/**
 * Deterministic, renderer-agnostic simulation. Call step(dt) with game-time
 * seconds and read `events` afterwards for visuals / sound.
 */
export class Engine {
  phase: Phase = 'prep';
  wave = 0; // number of waves started (1-based current wave while in 'wave')
  readonly totalWaves = WAVES.length;
  coreHp = CORE_HP;
  readonly maxCoreHp = CORE_HP;
  energy = START_ENERGY;
  intermission: number | null = null; // countdown to auto start, null = waiting for player
  surgeCooldown = 0;
  readonly surgeMax = SURGE.cooldown;

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  events: GameEvent[] = [];
  stats: GameStats = { kills: 0, energySpent: 0, energyEarned: 0, leaks: 0, surgeUses: 0, towersBuilt: 0, elapsed: 0 };

  private nextId = 1;
  private spawnQueue: SpawnEntry[] = [];
  private waveTime = 0;
  private enemyById = new Map<number, Enemy>();

  // ---------------------------------------------------------------- queries
  get enemiesRemaining() { return this.enemies.length + this.spawnQueue.length; }
  get isOver() { return this.phase === 'victory' || this.phase === 'defeat'; }
  get canStartWave() { return this.phase === 'prep' && this.wave < this.totalWaves; }

  towerAt(c: number, r: number) { return this.towers.find((t) => t.c === c && t.r === r); }
  getTower(id: number) { return this.towers.find((t) => t.id === id); }
  getEnemy(id: number) { return this.enemyById.get(id); }

  upgradeCost(t: Tower): number | null {
    return t.level + 1 < MAX_LEVEL ? TOWERS[t.type].levels[t.level + 1].cost : null;
  }
  sellValue(t: Tower) { return Math.floor(t.spent * SELL_RATIO); }

  /** Composition of a wave (1-based) for previews. */
  waveComposition(wave: number): { type: EnemyType; count: number }[] {
    const def = WAVES[wave - 1];
    if (!def) return [];
    const map = new Map<EnemyType, number>();
    for (const g of def.groups) map.set(g.type, (map.get(g.type) ?? 0) + g.count);
    return [...map.entries()].map(([type, count]) => ({ type, count }));
  }

  // --------------------------------------------------------------- commands
  build(type: TowerType, c: number, r: number): Tower | null {
    if (this.isOver) return null;
    if (!PADS.some((p) => p.c === c && p.r === r) || this.towerAt(c, r)) return null;
    const cost = TOWERS[type].levels[0].cost;
    if (this.energy < cost) return null;
    this.energy -= cost;
    this.stats.energySpent += cost;
    this.stats.towersBuilt++;
    const t: Tower = {
      id: this.nextId++, type, level: 0, c, r, x: c + 0.5, y: r + 0.5, cooldown: 0.2,
      mode: 'first', spent: cost, buff: 1, aimX: 1, aimY: 0, kills: 0, damageDealt: 0,
    };
    this.towers.push(t);
    this.events.push({ type: 'build', towerId: t.id, towerType: type });
    return t;
  }

  upgrade(id: number): boolean {
    const t = this.getTower(id);
    if (!t || this.isOver) return false;
    const cost = this.upgradeCost(t);
    if (cost === null || this.energy < cost) return false;
    this.energy -= cost;
    this.stats.energySpent += cost;
    t.spent += cost;
    t.level++;
    this.events.push({ type: 'upgrade', towerId: t.id, level: t.level });
    return true;
  }

  sell(id: number): boolean {
    const t = this.getTower(id);
    if (!t || this.isOver) return false;
    const refund = this.sellValue(t);
    this.energy += refund;
    this.towers = this.towers.filter((x) => x !== t);
    this.events.push({ type: 'sell', towerId: id, x: t.x, y: t.y, refund });
    return true;
  }

  setMode(id: number, mode: TargetMode) {
    const t = this.getTower(id);
    if (t) t.mode = mode;
  }

  startWave(): boolean {
    if (!this.canStartWave) return false;
    if (this.intermission !== null && this.intermission > 0) {
      // reward calling the wave early
      const bonus = Math.floor(this.intermission);
      this.energy += bonus;
      this.stats.energyEarned += bonus;
    }
    this.wave++;
    this.phase = 'wave';
    this.intermission = null;
    this.waveTime = 0;
    const def = WAVES[this.wave - 1];
    this.spawnQueue = [];
    for (const g of def.groups)
      for (let i = 0; i < g.count; i++) this.spawnQueue.push({ time: g.delay + i * g.interval, type: g.type });
    this.spawnQueue.sort((a, b) => a.time - b.time);
    this.events.push({ type: 'waveStart', wave: this.wave, boss: def.groups.some((g) => ENEMIES[g.type].boss) });
    return true;
  }

  castSurge(x: number, y: number): boolean {
    if (this.surgeCooldown > 0 || this.isOver) return false;
    this.surgeCooldown = SURGE.cooldown;
    this.stats.surgeUses++;
    this.events.push({ type: 'surge', x, y, radius: SURGE.radius });
    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > SURGE.radius + e.def.size * 0.3) continue;
      e.stunTime = Math.max(e.stunTime, e.def.boss ? SURGE.bossStun : SURGE.stun);
      this.damage(e, SURGE.damage, 1, null);
    }
    return true;
  }

  // ------------------------------------------------------------- simulation
  step(dt: number) {
    if (this.isOver) return;
    this.stats.elapsed += dt;
    if (this.surgeCooldown > 0) this.surgeCooldown = Math.max(0, this.surgeCooldown - dt);

    if (this.phase === 'prep' && this.intermission !== null) {
      this.intermission -= dt;
      if (this.intermission <= 0) { this.intermission = 0; this.startWave(); }
    }

    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].time <= this.waveTime) {
        const s = this.spawnQueue.shift()!;
        this.spawnEnemy(s.type, 0);
      }
    }

    this.updateEnemies(dt);
    if (this.isOver) return;
    this.updateTowers(dt);
    this.updateProjectiles(dt);

    if (this.phase === 'wave' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      const bonus = waveClearBonus(this.wave);
      this.energy += bonus;
      this.stats.energyEarned += bonus;
      this.events.push({ type: 'waveClear', wave: this.wave, bonus });
      if (this.wave >= this.totalWaves) {
        this.phase = 'victory';
        this.events.push({ type: 'victory' });
      } else {
        this.phase = 'prep';
        this.intermission = INTERMISSION;
      }
    }
  }

  private spawnEnemy(type: EnemyType, dist: number) {
    const def = ENEMIES[type];
    const hp = Math.round(def.hp * waveHpScale(Math.max(1, this.wave)));
    const p = pathPoint(dist);
    const e: Enemy = {
      id: this.nextId++, type, def, hp, maxHp: hp, dist, x: p.x, y: p.y, dirX: p.dx, dirY: p.dy,
      slowFactor: 1, slowTime: 0, stunTime: 0, summonTimer: def.summon?.every ?? 0, alive: true, shielded: false,
    };
    this.enemies.push(e);
    this.enemyById.set(e.id, e);
    this.events.push({ type: 'spawn', enemyId: e.id, enemyType: type, x: e.x, y: e.y });
  }

  private updateEnemies(dt: number) {
    const guardians = this.enemies.filter((e) => e.def.aura);
    for (const e of this.enemies) {
      if (e.slowTime > 0) { e.slowTime -= dt; if (e.slowTime <= 0) e.slowFactor = 1; }
      let speed = e.def.speed * (e.slowTime > 0 ? e.slowFactor : 1);
      if (e.stunTime > 0) { e.stunTime -= dt; speed = 0; }
      e.dist += speed * dt;
      const p = pathPoint(e.dist);
      e.x = p.x; e.y = p.y; e.dirX = p.dx; e.dirY = p.dy;
      e.shielded = guardians.some((g) => g !== e && Math.hypot(g.x - e.x, g.y - e.y) <= g.def.aura!.radius);

      if (e.def.summon) {
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = e.def.summon.every;
          for (let i = 0; i < e.def.summon.count; i++) this.spawnEnemy(e.def.summon.type, Math.max(0, e.dist - 0.3 - i * 0.35));
          this.events.push({ type: 'summon', x: e.x, y: e.y });
        }
      }

      if (e.dist >= PATH_LENGTH) {
        e.alive = false;
        this.coreHp = Math.max(0, this.coreHp - e.def.coreDamage);
        this.stats.leaks++;
        this.events.push({ type: 'leak', enemyId: e.id, damage: e.def.coreDamage });
      }
    }
    this.purgeDead();
    if (this.coreHp <= 0 && this.phase !== 'defeat') {
      this.phase = 'defeat';
      this.events.push({ type: 'defeat' });
    }
  }

  private purgeDead() {
    if (this.enemies.some((e) => !e.alive)) {
      for (const e of this.enemies) if (!e.alive) this.enemyById.delete(e.id);
      this.enemies = this.enemies.filter((e) => e.alive);
    }
  }

  private updateTowers(dt: number) {
    const beacons = this.towers.filter((t) => TOWERS[t.type].attack === 'aura');
    for (const t of this.towers) {
      const def = TOWERS[t.type];
      if (def.attack === 'aura') { t.buff = 1; continue; }
      let buff = 1;
      for (const b of beacons) {
        const lv = TOWERS.beacon.levels[b.level];
        if (Math.hypot(b.x - t.x, b.y - t.y) <= lv.range + 0.05) buff = Math.max(buff, lv.buff ?? 1);
      }
      t.buff = buff;
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const lv = def.levels[t.level];
      const target = this.pickTarget(t, lv.range);
      if (!target) { t.cooldown = 0; continue; }
      t.aimX = target.x - t.x; t.aimY = target.y - t.y;
      this.fire(t, target);
      t.cooldown += 1 / (lv.rate * buff);
      if (t.cooldown < 0) t.cooldown = 0;
    }
  }

  private pickTarget(t: Tower, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestScore = -Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.dist < 0.2) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d > range + e.def.size * 0.25) continue;
      let score: number;
      switch (t.mode) {
        case 'last': score = -e.dist; break;
        case 'strong': score = e.hp * 1000 + e.dist; break;
        case 'near': score = -d; break;
        default: score = e.dist;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  private fire(t: Tower, target: Enemy) {
    const def = TOWERS[t.type];
    const lv = def.levels[t.level];
    this.events.push({ type: 'fire', towerId: t.id, towerType: t.type, x: t.x, y: t.y, tx: target.x, ty: target.y });
    if (def.attack === 'chain') {
      const hit = new Set<number>();
      const points: Vec[] = [{ x: t.x, y: t.y }];
      let cur: Enemy | null = target;
      let dmg = lv.damage;
      for (let i = 0; i < (lv.chains ?? 1) && cur; i++) {
        hit.add(cur.id);
        points.push({ x: cur.x, y: cur.y });
        const from: Enemy = cur;
        this.damage(cur, dmg, def.armorPierce, t);
        dmg *= lv.chainFalloff ?? 1;
        cur = null;
        let bestD = 1.7;
        for (const e of this.enemies) {
          if (!e.alive || hit.has(e.id)) continue;
          const d = Math.hypot(e.x - from.x, e.y - from.y);
          if (d < bestD) { bestD = d; cur = e; }
        }
      }
      this.events.push({ type: 'chain', points, level: t.level });
      this.purgeDead();
      return;
    }
    if (def.attack === 'lob') {
      // lead the target slightly
      const lead = pathPoint(target.dist + target.def.speed * (target.slowTime > 0 ? target.slowFactor : 1) * 0.55);
      const flight = 0.85;
      this.projectiles.push({
        id: this.nextId++, kind: 'mortar', towerId: t.id, level: t.level, x: t.x, y: t.y, sx: t.x, sy: t.y,
        tx: lead.x, ty: lead.y, targetId: -1, speed: 0, damage: lv.damage, splash: lv.splash ?? 1,
        slow: 1, slowDuration: 0, pierce: def.armorPierce, t: 0, flight, height: 1.4,
      });
      return;
    }
    this.projectiles.push({
      id: this.nextId++, kind: t.type === 'cryo' ? 'cryo' : 'pulse', towerId: t.id, level: t.level,
      x: t.x + t.aimX * 0, y: t.y, sx: t.x, sy: t.y, tx: target.x, ty: target.y, targetId: target.id,
      speed: def.projectileSpeed, damage: lv.damage, splash: lv.splash ?? 0, slow: lv.slow ?? 1,
      slowDuration: lv.slowDuration ?? 0, pierce: def.armorPierce, t: 0, flight: 0, height: 0,
    });
  }

  private updateProjectiles(dt: number) {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      if (p.kind === 'mortar') {
        p.t += dt;
        const k = Math.min(1, p.t / p.flight);
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k;
        if (k >= 1) { this.explode(p); continue; }
        keep.push(p);
        continue;
      }
      const target = this.enemyById.get(p.targetId);
      if (target && target.alive) { p.tx = target.x; p.ty = target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const move = p.speed * dt;
      if (d <= move + 0.12) {
        p.x = p.tx; p.y = p.ty;
        if (target && target.alive) this.impact(p, target);
        else if (p.splash > 0) this.impact(p, null);
        continue;
      }
      p.x += (dx / d) * move;
      p.y += (dy / d) * move;
      keep.push(p);
    }
    this.projectiles = keep;
    this.purgeDead();
  }

  private impact(p: Projectile, target: Enemy | null) {
    const tower = this.getTower(p.towerId) ?? null;
    if (p.kind === 'cryo') {
      const victims = p.splash > 0
        ? this.enemies.filter((e) => e.alive && Math.hypot(e.x - p.x, e.y - p.y) <= p.splash)
        : target ? [target] : [];
      if (p.splash > 0) this.events.push({ type: 'explode', x: p.x, y: p.y, radius: p.splash, kind: 'cryo' });
      for (const e of victims) {
        const factor = e.def.boss ? 1 - (1 - p.slow) * 0.5 : p.slow;
        if (e.slowTime <= 0 || factor < e.slowFactor) e.slowFactor = factor;
        e.slowTime = Math.max(e.slowTime, p.slowDuration);
        this.damage(e, p.damage, p.pierce, tower);
      }
      this.events.push({ type: 'hit', enemyId: target?.id ?? -1, x: p.x, y: p.y, kind: 'cryo' });
      return;
    }
    if (target) {
      this.damage(target, p.damage, p.pierce, tower);
      this.events.push({ type: 'hit', enemyId: target.id, x: p.x, y: p.y, kind: 'pulse' });
    }
  }

  private explode(p: Projectile) {
    const tower = this.getTower(p.towerId) ?? null;
    this.events.push({ type: 'explode', x: p.x, y: p.y, radius: p.splash, kind: 'mortar' });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > p.splash + e.def.size * 0.3) continue;
      const falloff = 1 - 0.45 * Math.min(1, d / p.splash);
      this.damage(e, p.damage * falloff, p.pierce, tower);
    }
  }

  private damage(e: Enemy, raw: number, pierce: number, tower: Tower | null) {
    if (!e.alive) return;
    const armor = e.def.armor * (1 - pierce);
    const shield = e.shielded && pierce < 1 ? 0.8 : 1;
    const dmg = raw * (1 - armor) * shield;
    e.hp -= dmg;
    if (tower) tower.damageDealt += dmg;
    if (e.hp <= 0) {
      e.alive = false;
      this.energy += e.def.reward;
      this.stats.energyEarned += e.def.reward;
      this.stats.kills++;
      if (tower) tower.kills++;
      this.events.push({ type: 'kill', enemyId: e.id, enemyType: e.type, x: e.x, y: e.y, reward: e.def.reward });
    }
  }

  // ---------------------------------------------------------------- results
  score(): number {
    const victory = this.phase === 'victory';
    const cleared = victory ? this.totalWaves : Math.max(0, this.wave - 1);
    return this.stats.kills * 10 + this.coreHp * 150 + Math.floor(this.energy) + cleared * 300 + (victory ? 3000 : 0);
  }

  stars(): number {
    if (this.phase !== 'victory') return 0;
    if (this.coreHp >= 17) return 3;
    if (this.coreHp >= 8) return 2;
    return 1;
  }

  drainEvents(): GameEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }
}
