import Phaser from 'phaser';
import type { GameController } from '../../state/GameController';
import { appStore } from '../../state/appStore';
import type { Enemy, EnemyType, GameEvent, Projectile, Tower, TowerType, Vec } from '../engine/types';
import { PATH_LENGTH, pathPoint } from '../engine/Engine';
import { TOWERS, TOWER_ORDER } from '../data/towers';
import { ENEMY_ORDER } from '../data/enemies';
import { COLS, ROWS, PATH, PADS, CORE_POS, RIFT_POS } from '../data/map';
import { SURGE } from '../data/waves';
import { sfx } from '../audio/Sfx';
import {
  TEX, ENEMY_TEX, makeCanvas, drawTowerBase, drawTurret, drawEnemy, drawCore, drawRift, drawPad,
  drawSoftDot, drawRing, drawBolt, drawShard, drawShell,
} from './art';

export const CELL = 100;
const LAND = { w: COLS * CELL, h: ROWS * CELL };
const PORT = { w: ROWS * CELL, h: COLS * CELL };

const C = {
  cyan: 0x3ef0ff, teal: 0x14c8b4, gold: 0xffd76a, purple: 0xa43cff, red: 0xff3b5c, ice: 0x9ff0ff,
  white: 0xffffff, orange: 0xffb238, navy: 0x070d22,
};

interface TowerView { base: Phaser.GameObjects.Image; turret: Phaser.GameObjects.Image; aura: Phaser.GameObjects.Image; level: number; angle: number; type: TowerType }
interface EnemyView { spr: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; lastHp: number; flash: number; type: EnemyType }
interface Bolt { pts: Vec[]; ttl: number; max: number; color: number; width: number; world: boolean }
type EmitterKey = 'cyan' | 'purple' | 'gold' | 'ice' | 'red' | 'white';

export class BattleScene extends Phaser.Scene {
  private ctrl: GameController;
  portrait = false;
  private staticObjs: Phaser.GameObjects.GameObject[] = [];
  private towers = new Map<number, TowerView>();
  private enemies = new Map<number, EnemyView>();
  private projs = new Map<number, Phaser.GameObjects.Image>();
  private killed = new Set<number>();
  private bolts: Bolt[] = [];
  private hpGfx!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private boltGfx!: Phaser.GameObjects.Graphics;
  private emitters!: Record<EmitterKey, Phaser.GameObjects.Particles.ParticleEmitter>;
  private flowDots: Phaser.GameObjects.Image[] = [];
  private core!: Phaser.GameObjects.Image;
  private coreRings: Phaser.GameObjects.Image[] = [];
  private coreGlow!: Phaser.GameObjects.Image;
  private rift!: Phaser.GameObjects.Image;
  private rift2!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Rectangle;
  private textPool: Phaser.GameObjects.Text[] = [];
  private pointer: Vec | null = null;
  private time0 = 0;
  private unsub: (() => void)[] = [];

  constructor(ctrl: GameController) {
    super({ key: 'battle' });
    this.ctrl = ctrl;
  }

  // ------------------------------------------------------------ coordinates
  toW(x: number, y: number): Vec {
    return this.portrait ? { x: y * CELL, y: x * CELL } : { x: x * CELL, y: y * CELL };
  }
  toL(wx: number, wy: number): Vec {
    return this.portrait ? { x: wy / CELL, y: wx / CELL } : { x: wx / CELL, y: wy / CELL };
  }
  private dirAngle(dx: number, dy: number) {
    return this.portrait ? Math.atan2(dx, dy) : Math.atan2(dy, dx);
  }

  // ------------------------------------------------------------- textures
  private makeTextures() {
    const tx = this.textures;
    const add = (key: string, w: number, draw: (ctx: CanvasRenderingContext2D) => void, h = w) => {
      if (tx.exists(key)) return;
      const cv = makeCanvas(w, h);
      draw(cv.getContext('2d')!);
      tx.addCanvas(key, cv);
    };
    for (const t of TOWER_ORDER) {
      for (let lv = 0; lv < 3; lv++) {
        add(`tb_${t}_${lv}`, TEX, (c) => drawTowerBase(c, t, lv));
        add(`tt_${t}_${lv}`, TEX, (c) => drawTurret(c, t, lv));
      }
    }
    for (const e of ENEMY_ORDER) for (let f = 0; f < 2; f++) add(`e_${e}_${f}`, ENEMY_TEX[e], (c) => drawEnemy(c, e, f));
    add('core', 220, (c) => drawCore(c, 220));
    add('rift', 200, (c) => drawRift(c, 200));
    add('pad', 100, (c) => drawPad(c, 100));
    add('dot', 32, (c) => drawSoftDot(c, 32));
    add('ring', 256, (c) => drawRing(c, 256, 6));
    add('ringDash', 256, (c) => drawRing(c, 256, 4, true));
    add('bolt', 40, (c) => drawBolt(c, 40, '#3ef0ff'));
    add('shard', 40, (c) => drawShard(c, 40));
    add('shell', 40, (c) => drawShell(c, 40));

    for (const e of ENEMY_ORDER) {
      const key = `walk_${e}`;
      if (!this.anims.exists(key)) {
        this.anims.create({
          key, frames: [{ key: `e_${e}_0` }, { key: `e_${e}_1` }],
          frameRate: e === 'runner' ? 10 : e === 'overlord' ? 3 : e === 'brute' ? 4 : 6, repeat: -1,
        });
      }
    }
  }

  // --------------------------------------------------------------- create
  create() {
    this.makeTextures();
    this.time0 = 0;

    this.hpGfx = this.add.graphics().setDepth(60);
    this.overlay = this.add.graphics().setDepth(5);
    this.boltGfx = this.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);

    const mk = (tint: number) => this.add.particles(0, 0, 'dot', {
      speed: { min: 40, max: 220 }, lifespan: { min: 250, max: 650 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, tint, blendMode: 'ADD', emitting: false,
    }).setDepth(50);
    this.emitters = { cyan: mk(C.cyan), purple: mk(C.purple), gold: mk(C.gold), ice: mk(C.ice), red: mk(C.red), white: mk(C.white) };

    this.coreGlow = this.add.image(0, 0, 'dot').setDepth(3).setTint(C.cyan).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    this.coreRings = [
      this.add.image(0, 0, 'ringDash').setDepth(4).setTint(C.cyan).setAlpha(0.7),
      this.add.image(0, 0, 'ring').setDepth(4).setTint(C.gold).setAlpha(0.5),
    ];
    this.core = this.add.image(0, 0, 'core').setDepth(6);
    this.rift = this.add.image(0, 0, 'rift').setDepth(3);
    this.rift2 = this.add.image(0, 0, 'rift').setDepth(3).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < 22; i++) {
      this.flowDots.push(this.add.image(0, 0, 'dot').setDepth(2).setTint(i % 3 ? C.cyan : C.teal).setBlendMode(Phaser.BlendModes.ADD).setScale(0.45).setAlpha(0.7));
    }

    this.flash = this.add.rectangle(0, 0, 10, 10, C.cyan, 0).setOrigin(0).setDepth(90).setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < 24; i++) {
      const t = this.add.text(0, 0, '', {
        fontFamily: '"Chakra Petch", sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffd76a',
        stroke: '#070d22', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(80).setVisible(false);
      this.textPool.push(t);
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const l = this.toL(p.worldX, p.worldY);
      this.pointer = l;
      this.ctrl.tapField(l.x, l.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.pointer = this.toL(p.worldX, p.worldY); });

    this.unsub.push(this.ctrl.onEvents((ev) => this.onEvents(ev)));
    this.unsub.push(this.ctrl.onReset(() => this.resetViews()));
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
    this.events.once('destroy', () => this.unsub.forEach((u) => u()));

    this.applyOrientation(this.portrait, true);
  }

  /** Switches between 16×9 and 9×16 world layouts without touching game state. */
  applyOrientation(portrait: boolean, force = false) {
    if (!force && portrait === this.portrait) return;
    this.portrait = portrait;
    const size = portrait ? PORT : LAND;
    this.scale.setGameSize(size.w, size.h);
    this.cameras.main.setSize(size.w, size.h);
    this.buildStatic();
  }

  /** Pre-renders background, path and pads into one canvas texture (cheap to draw every frame). */
  private buildStatic() {
    this.staticObjs.forEach((o) => o.destroy());
    this.staticObjs = [];
    const size = this.portrait ? PORT : LAND;
    const key = this.portrait ? 'static_port' : 'static_land';
    if (!this.textures.exists(key)) {
      const cv = makeCanvas(size.w, size.h);
      const ctx = cv.getContext('2d')!;
      const sky = ctx.createLinearGradient(0, 0, 0, size.h);
      sky.addColorStop(0, '#0a1433'); sky.addColorStop(1, '#050915');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, size.w, size.h);
      const rnd = new Phaser.Math.RandomDataGenerator(['aether']);
      for (let i = 0; i < 140; i++) {
        ctx.globalAlpha = rnd.realInRange(0.08, 0.45);
        ctx.fillStyle = rnd.pick(['#ffffff', '#9ff0ff', '#ffd76a']);
        ctx.beginPath(); ctx.arc(rnd.between(0, size.w), rnd.between(0, size.h), rnd.realInRange(0.6, 2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // floating platform
      const plat = ctx.createRadialGradient(size.w / 2, size.h / 2, 0, size.w / 2, size.h / 2, Math.max(size.w, size.h) * 0.7);
      plat.addColorStop(0, 'rgba(22,40,84,0.95)'); plat.addColorStop(1, 'rgba(10,20,46,0.9)');
      ctx.fillStyle = plat;
      ctx.beginPath(); ctx.roundRect(8, 8, size.w - 16, size.h - 16, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(62,240,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
      // grid
      ctx.strokeStyle = 'rgba(62,240,255,0.05)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = CELL; x < size.w; x += CELL) { ctx.moveTo(x, 16); ctx.lineTo(x, size.h - 16); }
      for (let y = CELL; y < size.h; y += CELL) { ctx.moveTo(16, y); ctx.lineTo(size.w - 16, y); }
      ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const x = rnd.between(1, size.w / CELL - 1) * CELL, y = rnd.between(1, size.h / CELL - 1) * CELL;
        ctx.strokeStyle = 'rgba(20,200,180,0.1)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd.pick([-1, 1]) * CELL * 0.5, y); ctx.stroke();
        ctx.fillStyle = 'rgba(20,200,180,0.2)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
      // path
      const pts = PATH.map((p) => this.toW(p.x, p.y));
      const stroke = (width: number, style: string, blur = 0) => {
        ctx.save();
        ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
        ctx.strokeStyle = style; ctx.lineWidth = width;
        if (blur) { ctx.shadowColor = '#3ef0ff'; ctx.shadowBlur = blur; }
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.restore();
      };
      stroke(CELL * 0.9, 'rgba(62,240,255,0.5)', 24);
      stroke(CELL * 0.8, '#081026');
      stroke(CELL * 0.66, '#0f1b3c');
      ctx.save();
      ctx.setLineDash([22, 28]);
      stroke(3, 'rgba(62,240,255,0.22)');
      ctx.restore();
      // pads
      const padCv = makeCanvas(100);
      drawPad(padCv.getContext('2d')!, 100);
      ctx.globalAlpha = 0.65;
      for (const p of PADS) {
        const w = this.toW(p.c + 0.5, p.r + 0.5);
        ctx.drawImage(padCv, w.x - 50, w.y - 50);
      }
      ctx.globalAlpha = 1;
      // vignette
      const vg = ctx.createRadialGradient(size.w / 2, size.h / 2, Math.min(size.w, size.h) * 0.35, size.w / 2, size.h / 2, Math.max(size.w, size.h) * 0.7);
      vg.addColorStop(0, 'rgba(5,9,21,0)'); vg.addColorStop(1, 'rgba(5,9,21,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, size.w, size.h);
      this.textures.addCanvas(key, cv);
    }
    this.staticObjs.push(this.add.image(0, 0, key).setOrigin(0).setDepth(0));

    const cw = this.toW(CORE_POS.x, CORE_POS.y);
    this.core.setPosition(cw.x, cw.y).setDisplaySize(CELL * 1.7, CELL * 1.7);
    this.coreGlow.setPosition(cw.x, cw.y).setDisplaySize(CELL * 3.2, CELL * 3.2);
    this.coreRings[0].setPosition(cw.x, cw.y).setDisplaySize(CELL * 1.9, CELL * 1.9);
    this.coreRings[1].setPosition(cw.x, cw.y).setDisplaySize(CELL * 2.3, CELL * 2.3);
    const rw = this.toW(RIFT_POS.x, RIFT_POS.y);
    this.rift.setPosition(rw.x, rw.y).setDisplaySize(CELL * 1.3, CELL * 1.3);
    this.rift2.setPosition(rw.x, rw.y).setDisplaySize(CELL * 1.6, CELL * 1.6);
    this.flash.setSize(size.w, size.h);
  }

  private resetViews() {
    this.towers.forEach((v) => { v.base.destroy(); v.turret.destroy(); v.aura.destroy(); });
    this.enemies.forEach((v) => { v.spr.destroy(); v.shadow.destroy(); });
    this.projs.forEach((p) => p.destroy());
    this.towers.clear(); this.enemies.clear(); this.projs.clear(); this.killed.clear();
    this.bolts = [];
    this.textPool.forEach((t) => t.setVisible(false));
    this.tweens.killAll();
    this.cameras.main.resetFX();
  }

  // ---------------------------------------------------------------- effects
  private get q() { return appStore.state.settings.quality === 'high' ? 1 : 0.4; }

  private burst(key: EmitterKey, x: number, y: number, n: number) {
    const count = Math.max(1, Math.round(n * this.q));
    this.emitters[key].explode(count, x, y);
  }

  private ring(x: number, y: number, radiusPx: number, tint: number, dur = 400, startScale = 0.1, alpha = 0.9, dashed = false) {
    const r = this.add.image(x, y, dashed ? 'ringDash' : 'ring').setDepth(52).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha);
    const target = (radiusPx * 2) / 256;
    r.setScale(target * startScale);
    this.tweens.add({ targets: r, scale: target, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
  }

  private floatText(x: number, y: number, text: string, color = '#ffd76a', size = 26) {
    const t = this.textPool.find((p) => !p.visible);
    if (!t) return;
    t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.tweens.add({ targets: t, y: y - 50, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300, onComplete: () => t.setVisible(false) });
  }

  private lightning(from: Vec, to: Vec, color: number, width: number, ttl = 0.18) {
    this.bolts.push({ pts: [from, to], ttl, max: ttl, color, width, world: true });
  }

  private onEvents(events: GameEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case 'build': {
          const t = this.ctrl.engine.getTower(e.towerId);
          if (!t) break;
          const v = this.ensureTower(t);
          v.base.setScale(0.2); v.turret.setScale(0.1);
          const s = (CELL * 1.05) / TEX;
          this.tweens.add({ targets: v.base, scale: s, duration: 380, ease: 'Back.easeOut' });
          this.tweens.add({ targets: v.turret, scale: s, duration: 420, delay: 120, ease: 'Back.easeOut' });
          this.ring(v.base.x, v.base.y, CELL * 0.8, C.gold, 500);
          this.ring(v.base.x, v.base.y, CELL * 0.6, C.cyan, 420, 0.3, 0.8, true);
          this.burst('cyan', v.base.x, v.base.y, 18);
          break;
        }
        case 'upgrade': {
          const v = this.towers.get(e.towerId);
          if (!v) break;
          const s = (CELL * 1.05) / TEX;
          this.tweens.add({ targets: [v.base, v.turret], scale: { from: s * 1.25, to: s }, duration: 380, ease: 'Back.easeOut' });
          this.ring(v.base.x, v.base.y, CELL * 1.1, C.gold, 600);
          this.burst('gold', v.base.x, v.base.y, 26);
          this.floatText(v.base.x, v.base.y - 30, `LV ${e.level + 1}`, '#ffd76a', 30);
          break;
        }
        case 'sell': {
          const w = this.toW(e.x, e.y);
          this.ring(w.x, w.y, CELL * 0.7, C.gold, 400);
          this.burst('gold', w.x, w.y, 14);
          this.floatText(w.x, w.y - 20, `+${e.refund}`, '#ffd76a');
          break;
        }
        case 'fire': {
          const v = this.towers.get(e.towerId);
          if (!v) break;
          const s = (CELL * 1.05) / TEX;
          const ang = v.turret.rotation;
          const tip = { x: v.base.x + Math.cos(ang) * CELL * 0.32, y: v.base.y + Math.sin(ang) * CELL * 0.32 };
          if (e.towerType === 'pulse') { this.emitters.cyan.explode(Math.ceil(2 * this.q), tip.x, tip.y); sfx.play('pulse'); }
          if (e.towerType === 'cryo') { this.emitters.ice.explode(Math.ceil(2 * this.q), tip.x, tip.y); sfx.play('cryo'); }
          if (e.towerType === 'mortar') { this.burst('gold', tip.x, tip.y, 6); sfx.play('mortar'); }
          if (e.towerType === 'arc') sfx.play('zap');
          if (e.towerType !== 'arc') {
            this.tweens.add({ targets: v.turret, scale: { from: s * 0.86, to: s }, duration: 140, ease: 'Quad.easeOut' });
          } else {
            this.tweens.add({ targets: v.turret, scale: { from: s * 1.15, to: s }, duration: 200 });
          }
          break;
        }
        case 'chain': {
          const col = [C.purple, 0xc6a0ff, C.white][e.level] ?? C.purple;
          for (let i = 0; i < e.points.length - 1; i++) {
            this.lightning(e.points[i], e.points[i + 1], col, 5 + e.level * 1.5);
            const w = this.toW(e.points[i + 1].x, e.points[i + 1].y);
            this.burst('purple', w.x, w.y, 5);
          }
          break;
        }
        case 'hit': {
          const w = this.toW(e.x, e.y);
          if (e.kind === 'pulse') { this.burst('cyan', w.x, w.y, 4); sfx.play('hit'); }
          else this.burst('ice', w.x, w.y, 6);
          break;
        }
        case 'explode': {
          const w = this.toW(e.x, e.y);
          if (e.kind === 'mortar') {
            this.ring(w.x, w.y, e.radius * CELL, C.orange, 450);
            this.ring(w.x, w.y, e.radius * CELL * 0.6, C.white, 250, 0.2, 0.7);
            this.burst('gold', w.x, w.y, 22);
            this.burst('red', w.x, w.y, 10);
            this.cameras.main.shake(90, 0.003);
            sfx.play('boom');
          } else {
            this.ring(w.x, w.y, e.radius * CELL, C.ice, 380, 0.2, 0.8, true);
            this.burst('ice', w.x, w.y, 14);
          }
          break;
        }
        case 'kill': {
          this.killed.add(e.enemyId);
          const w = this.toW(e.x, e.y);
          const big = e.enemyType === 'overlord';
          this.burst('purple', w.x, w.y, big ? 80 : 16);
          this.burst('red', w.x, w.y, big ? 50 : 8);
          if (big) {
            this.ring(w.x, w.y, CELL * 3, C.purple, 900);
            this.ring(w.x, w.y, CELL * 2, C.red, 700);
            this.cameras.main.shake(500, 0.012);
            this.cameras.main.flash(300, 160, 60, 255);
          }
          this.floatText(w.x, w.y - 20, `+${e.reward}`, '#ffd76a', big ? 40 : 24);
          break;
        }
        case 'leak': {
          const cw = this.core;
          this.ring(cw.x, cw.y, CELL * 1.4, C.red, 500);
          this.burst('red', cw.x, cw.y, 20);
          this.cameras.main.shake(200, 0.008);
          this.flash.setFillStyle(C.red, 0.22);
          this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 400 });
          break;
        }
        case 'spawn': {
          const w = this.toW(e.x, e.y);
          this.burst('purple', w.x, w.y, 6);
          break;
        }
        case 'summon': {
          const w = this.toW(e.x, e.y);
          this.ring(w.x, w.y, CELL * 1.5, C.red, 600);
          this.burst('purple', w.x, w.y, 24);
          break;
        }
        case 'surge': {
          const w = this.toW(e.x, e.y);
          const cw = { x: this.core.x, y: this.core.y };
          this.bolts.push({ pts: [this.toL(cw.x, cw.y), { x: e.x, y: e.y }], ttl: 0.45, max: 0.45, color: C.cyan, width: 14, world: true });
          this.bolts.push({ pts: [this.toL(cw.x, cw.y), { x: e.x, y: e.y }], ttl: 0.35, max: 0.35, color: C.white, width: 5, world: true });
          this.ring(w.x, w.y, e.radius * CELL, C.cyan, 700, 0.05, 1);
          this.ring(w.x, w.y, e.radius * CELL * 1.15, C.gold, 900, 0.1, 0.8, true);
          this.time.delayedCall(120, () => this.ring(w.x, w.y, e.radius * CELL * 0.7, C.white, 500, 0.1, 0.9));
          this.burst('cyan', w.x, w.y, 70);
          this.burst('gold', w.x, w.y, 40);
          this.burst('white', cw.x, cw.y, 30);
          this.cameras.main.shake(320, 0.01);
          this.flash.setFillStyle(C.cyan, 0.3);
          this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 500 });
          break;
        }
      }
    }
  }

  // ----------------------------------------------------------------- views
  private ensureTower(t: Tower): TowerView {
    let v = this.towers.get(t.id);
    if (!v) {
      const w = this.toW(t.x, t.y);
      const s = (CELL * 1.05) / TEX;
      const aura = this.add.image(w.x, w.y, 'dot').setDepth(9).setTint(C.gold).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDisplaySize(CELL * 1.3, CELL * 1.3);
      const base = this.add.image(w.x, w.y, `tb_${t.type}_${t.level}`).setDepth(10).setScale(s);
      const turret = this.add.image(w.x, w.y, `tt_${t.type}_${t.level}`).setDepth(30).setScale(s);
      v = { base, turret, aura, level: t.level, angle: -Math.PI / 2, type: t.type };
      turret.setRotation(v.angle);
      this.towers.set(t.id, v);
    }
    return v;
  }

  private syncTowers(dt: number, time: number) {
    const seen = new Set<number>();
    const showBuff = appStore.state.settings.showRanges;
    for (const t of this.ctrl.engine.towers) {
      seen.add(t.id);
      const v = this.ensureTower(t);
      const w = this.toW(t.x, t.y);
      v.base.setPosition(w.x, w.y);
      v.turret.setPosition(w.x, w.y);
      v.aura.setPosition(w.x, w.y);
      if (v.level !== t.level) {
        v.level = t.level;
        v.base.setTexture(`tb_${t.type}_${t.level}`);
        v.turret.setTexture(`tt_${t.type}_${t.level}`);
      }
      if (t.type === 'arc') v.turret.rotation += dt * 0.8;
      else if (t.type === 'beacon') {
        v.turret.rotation = Math.sin(time * 1.4 + t.id) * 0.15;
        v.turret.y = w.y - 4 + Math.sin(time * 2 + t.id) * 4;
      } else {
        const target = this.dirAngle(t.aimX, t.aimY);
        const diff = Phaser.Math.Angle.Wrap(target - v.turret.rotation);
        v.turret.rotation += diff * Math.min(1, dt * 14);
      }
      v.aura.setAlpha(showBuff && t.buff > 1 ? 0.22 + Math.sin(time * 4 + t.id) * 0.08 : t.type === 'beacon' ? 0.35 : 0);
    }
    for (const [id, v] of this.towers) {
      if (!seen.has(id)) {
        this.tweens.add({ targets: [v.base, v.turret], scale: 0, alpha: 0, duration: 250, onComplete: () => { v.base.destroy(); v.turret.destroy(); } });
        v.aura.destroy();
        this.towers.delete(id);
      }
    }
  }

  private syncEnemies(dt: number, time: number) {
    const seen = new Set<number>();
    const hp = this.hpGfx;
    hp.clear();
    for (const e of this.ctrl.engine.enemies) {
      seen.add(e.id);
      let v = this.enemies.get(e.id);
      const w = this.toW(e.x, e.y);
      const disp = (e.def.size * CELL) / 0.6;
      if (!v) {
        const spr = this.add.sprite(w.x, w.y, `e_${e.type}_0`).setDepth(e.def.boss ? 22 : 20);
        spr.play(`walk_${e.type}`);
        spr.anims.setProgress(Math.random());
        spr.setDisplaySize(disp * 0.2, disp * 0.2);
        this.tweens.add({ targets: spr, displayWidth: disp, displayHeight: disp, duration: 300, ease: 'Back.easeOut' });
        const shadow = this.add.ellipse(w.x, w.y, disp * 0.55, disp * 0.3, 0x000000, 0.35).setDepth(19);
        v = { spr, shadow, lastHp: e.hp, flash: 0, type: e.type };
        this.enemies.set(e.id, v);
      }
      const bob = Math.sin(time * (e.type === 'runner' ? 18 : 8) + e.id) * (e.def.boss ? 4 : 2);
      v.spr.setPosition(w.x, w.y + bob);
      v.shadow.setPosition(w.x + 4, w.y + disp * 0.18);
      v.spr.rotation = this.dirAngle(e.dirX, e.dirY);
      v.spr.anims.timeScale = (e.stunTime > 0 ? 0 : e.slowTime > 0 ? e.slowFactor : 1) * this.ctrl.speed;
      if (e.hp < v.lastHp - 0.01) v.flash = 0.07;
      v.lastHp = e.hp;
      if (v.flash > 0) { v.flash -= dt; v.spr.setTintFill(0xffffff); }
      else if (e.stunTime > 0) v.spr.setTint(0x9ffcff);
      else if (e.slowTime > 0) v.spr.setTint(0x8fdcff);
      else v.spr.clearTint();

      // hp bar
      if (e.hp < e.maxHp || e.def.boss) {
        const bw = e.def.boss ? CELL * 1.6 : Math.max(CELL * 0.5, disp * 0.6);
        const bh = e.def.boss ? 10 : 6;
        const bx = w.x - bw / 2, by = w.y - disp * 0.45 - (e.def.boss ? 14 : 4);
        const k = Math.max(0, e.hp / e.maxHp);
        hp.fillStyle(0x000000, 0.65); hp.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
        hp.fillStyle(k > 0.5 ? 0x5dff9a : k > 0.25 ? C.gold : C.red, 1);
        hp.fillRect(bx, by, bw * k, bh);
        if (e.def.boss) { hp.lineStyle(2, C.gold, 0.9); hp.strokeRect(bx - 2, by - 2, bw + 4, bh + 4); }
      }
      if (e.shielded) {
        hp.lineStyle(3, C.red, 0.35 + Math.sin(time * 6) * 0.15);
        hp.strokeCircle(w.x, w.y, disp * 0.38);
      }
      if (e.def.aura) {
        hp.lineStyle(2, C.red, 0.12);
        hp.strokeCircle(w.x, w.y, e.def.aura.radius * CELL);
      }
    }
    for (const [id, v] of this.enemies) {
      if (seen.has(id)) continue;
      this.enemies.delete(id);
      v.shadow.destroy();
      v.spr.anims.stop();
      if (this.killed.has(id)) {
        this.killed.delete(id);
        v.spr.setTintFill(0xffffff);
        this.tweens.add({
          targets: v.spr, scale: v.spr.scale * 1.5, alpha: 0, angle: v.spr.angle + 40, duration: 260, ease: 'Quad.easeOut',
          onComplete: () => v.spr.destroy(),
        });
      } else {
        this.tweens.add({
          targets: v.spr, x: this.core.x, y: this.core.y, scale: 0, alpha: 0, duration: 260, onComplete: () => v.spr.destroy(),
        });
      }
    }
  }

  private syncProjectiles() {
    const seen = new Set<number>();
    for (const p of this.ctrl.engine.projectiles) {
      seen.add(p.id);
      let img = this.projs.get(p.id);
      if (!img) {
        const key = p.kind === 'pulse' ? 'bolt' : p.kind === 'cryo' ? 'shard' : 'shell';
        img = this.add.image(0, 0, key).setDepth(40).setBlendMode(p.kind === 'mortar' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        img.setScale(p.kind === 'pulse' ? 0.9 + p.level * 0.2 : p.kind === 'cryo' ? 1.0 : 1.1 + p.level * 0.15);
        this.projs.set(p.id, img);
      }
      this.placeProjectile(img, p);
    }
    for (const [id, img] of this.projs) if (!seen.has(id)) { img.destroy(); this.projs.delete(id); }
  }

  private placeProjectile(img: Phaser.GameObjects.Image, p: Projectile) {
    const w = this.toW(p.x, p.y);
    if (p.kind === 'mortar') {
      const k = Math.min(1, p.t / p.flight);
      const h = 4 * k * (1 - k) * p.height * CELL;
      img.setPosition(w.x, w.y - h);
      const base = 1.1 + p.level * 0.15;
      img.setScale(base * (1 + 0.6 * 4 * k * (1 - k)));
      if (Math.random() < 0.5 * this.q) this.emitters.gold.emitParticleAt(img.x, img.y, 1);
    } else {
      img.setPosition(w.x, w.y);
      const t = this.toW(p.tx, p.ty);
      img.rotation = Math.atan2(t.y - w.y, t.x - w.x);
    }
  }

  private drawBolts(dt: number) {
    const g = this.boltGfx;
    g.clear();
    this.bolts = this.bolts.filter((b) => (b.ttl -= dt) > 0);
    for (const b of this.bolts) {
      const a = b.ttl / b.max;
      const from = this.toW(b.pts[0].x, b.pts[0].y), to = this.toW(b.pts[1].x, b.pts[1].y);
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      const segs = Math.max(3, Math.floor(len / 22));
      const nx = -(to.y - from.y) / (len || 1), ny = (to.x - from.x) / (len || 1);
      const path: Vec[] = [from];
      for (let i = 1; i < segs; i++) {
        const k = i / segs;
        const j = (Math.random() - 0.5) * Math.min(26, len * 0.18);
        path.push({ x: from.x + (to.x - from.x) * k + nx * j, y: from.y + (to.y - from.y) * k + ny * j });
      }
      path.push(to);
      for (const [wMul, alpha, col] of [[3, 0.25, b.color], [1, 0.95, b.color], [0.35, 1, C.white]] as [number, number, number][]) {
        g.lineStyle(b.width * wMul, col, alpha * a);
        g.beginPath();
        g.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
        g.strokePath();
      }
    }
  }

  private drawOverlay(time: number) {
    const g = this.overlay;
    g.clear();
    const ctrl = this.ctrl;
    const eng = ctrl.engine;
    const pulse = 0.5 + Math.sin(time * 5) * 0.5;

    if (ctrl.armed) {
      const def = TOWERS[ctrl.armed];
      for (const p of PADS) {
        if (eng.towerAt(p.c, p.r)) continue;
        const w = this.toW(p.c + 0.5, p.r + 0.5);
        g.lineStyle(3, def.attack === 'aura' ? C.gold : C.cyan, 0.25 + pulse * 0.45);
        g.strokeCircle(w.x, w.y, CELL * 0.38);
      }
      if (this.pointer) {
        const c = Math.floor(this.pointer.x), r = Math.floor(this.pointer.y);
        if (PADS.some((p) => p.c === c && p.r === r) && !eng.towerAt(c, r)) {
          const w = this.toW(c + 0.5, r + 0.5);
          this.rangeCircle(g, w, def.levels[0].range, def.attack === 'aura' ? C.gold : C.cyan);
        }
      }
    }

    if (ctrl.selection.kind === 'pad') {
      const w = this.toW(ctrl.selection.c + 0.5, ctrl.selection.r + 0.5);
      g.fillStyle(C.cyan, 0.12 + pulse * 0.12);
      g.fillCircle(w.x, w.y, CELL * 0.42);
      g.lineStyle(4, C.gold, 0.9);
      g.strokeCircle(w.x, w.y, CELL * 0.44);
    }

    if (ctrl.selection.kind === 'tower') {
      const t = eng.getTower(ctrl.selection.id);
      if (t) {
        const def = TOWERS[t.type];
        const lv = def.levels[t.level];
        const w = this.toW(t.x, t.y);
        this.rangeCircle(g, w, lv.range, def.attack === 'aura' ? C.gold : C.cyan);
        g.lineStyle(4, C.gold, 0.9);
        g.strokeCircle(w.x, w.y, CELL * 0.47);
        if (def.attack === 'aura') {
          for (const o of eng.towers) {
            if (o === t || TOWERS[o.type].attack === 'aura') continue;
            if (Math.hypot(o.x - t.x, o.y - t.y) <= lv.range + 0.05) {
              const ow = this.toW(o.x, o.y);
              g.lineStyle(3, C.gold, 0.5);
              g.lineBetween(w.x, w.y, ow.x, ow.y);
            }
          }
        }
      }
    }

    if (ctrl.surgeTargeting && this.pointer) {
      const w = this.toW(this.pointer.x, this.pointer.y);
      g.fillStyle(C.cyan, 0.1 + pulse * 0.08);
      g.fillCircle(w.x, w.y, SURGE.radius * CELL);
      g.lineStyle(4, C.cyan, 0.9);
      g.strokeCircle(w.x, w.y, SURGE.radius * CELL);
      g.lineStyle(2, C.gold, 0.6);
      g.strokeCircle(w.x, w.y, SURGE.radius * CELL * (0.6 + pulse * 0.3));
    }
  }

  private rangeCircle(g: Phaser.GameObjects.Graphics, w: Vec, range: number, color: number) {
    g.fillStyle(color, 0.08);
    g.fillCircle(w.x, w.y, range * CELL);
    g.lineStyle(3, color, 0.65);
    g.strokeCircle(w.x, w.y, range * CELL);
  }

  // ---------------------------------------------------------------- update
  update(_t: number, deltaMs: number) {
    const real = deltaMs / 1000;
    const ctrl = this.ctrl;
    ctrl.tick(real);
    const running = !ctrl.paused && !ctrl.result;
    const ts = running ? ctrl.speed : 0;
    this.tweens.timeScale = running ? ctrl.speed : 0.0001;
    Object.values(this.emitters).forEach((em) => { em.timeScale = ts || 0.0001; });
    const dt = real * ts;
    this.time0 += dt;
    const time = this.time0;

    // ambient
    this.rift.rotation -= dt * 1.2;
    this.rift2.rotation += dt * 0.7;
    this.rift2.setAlpha(0.35 + Math.sin(time * 3) * 0.15);
    const coreK = ctrl.engine.coreHp / ctrl.engine.maxCoreHp;
    this.coreRings[0].rotation += dt * 0.6;
    this.coreRings[1].rotation -= dt * 0.35;
    this.core.y = this.toW(CORE_POS.x, CORE_POS.y).y + Math.sin(time * 2) * 3;
    this.coreGlow.setAlpha(0.35 + Math.sin(time * 2.5) * 0.12);
    const hurt = performance.now() - ctrl.coreHitAt < 300;
    this.core.setTint(hurt ? C.red : coreK < 0.3 ? Phaser.Display.Color.GetColor(255, 140 + Math.floor(Math.sin(time * 8) * 60), 160) : 0xffffff);
    this.coreGlow.setTint(coreK < 0.3 ? C.red : C.cyan);

    for (let i = 0; i < this.flowDots.length; i++) {
      const d = ((i / this.flowDots.length) * PATH_LENGTH + time * 1.3) % PATH_LENGTH;
      const p = pathPoint(d);
      const w = this.toW(p.x, p.y);
      this.flowDots[i].setPosition(w.x, w.y).setAlpha(0.25 + 0.4 * Math.sin((d / PATH_LENGTH) * Math.PI));
    }

    this.syncTowers(dt, time);
    this.syncEnemies(dt, time);
    this.syncProjectiles();
    this.drawBolts(dt);
    this.drawOverlay(performance.now() / 1000);
  }
}

export type { Enemy };
