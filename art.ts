/**
 * Procedural art. Every sprite is drawn with Canvas 2D so the same artwork is
 * used by Phaser (as canvas textures) and by the React UI (as data-URL icons).
 * Convention: rotatable art points to the right (angle 0).
 */
import type { EnemyType, TowerType } from '../engine/types';

export const TEX = 128; // tower / generic texture size

type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h = w): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function hex(ctx: Ctx, cx: number, cy: number, r: number, rot = Math.PI / 6) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function glow(ctx: Ctx, color: string, blur: number) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function noGlow(ctx: Ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const TOWER_COLORS: Record<TowerType, string> = {
  pulse: '#3ef0ff', arc: '#b78cff', cryo: '#9ff0ff', mortar: '#ffb238', beacon: '#ffd76a',
};

// ------------------------------------------------------------------ towers
export function drawTowerBase(ctx: Ctx, type: TowerType, level: number, s = TEX) {
  const c = s / 2;
  const col = TOWER_COLORS[type];
  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  hex(ctx, c + 3, c + 6, s * 0.4);
  ctx.fill();
  // plate
  const plate = ctx.createLinearGradient(0, c - s * 0.4, 0, c + s * 0.4);
  plate.addColorStop(0, '#2a3a63');
  plate.addColorStop(1, '#0f1730');
  ctx.fillStyle = plate;
  hex(ctx, c, c, s * 0.4);
  ctx.fill();
  // gold rim (brighter per level)
  const rim = ['#9b7a35', '#d9a93e', '#ffd76a'][level];
  ctx.lineWidth = s * (0.025 + level * 0.008);
  ctx.strokeStyle = rim;
  if (level === 2) glow(ctx, '#ffd76a', 10);
  ctx.stroke();
  noGlow(ctx);
  // inner ring
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = s * 0.012;
  hex(ctx, c, c, s * 0.31);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // energy well
  ctx.fillStyle = radial(ctx, c, c, s * 0.26, [[0, col + 'aa'], [0.6, col + '22'], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.arc(c, c, s * 0.26, 0, Math.PI * 2); ctx.fill();
  // level pips
  for (let i = 0; i <= level; i++) {
    const px = c + (i - level / 2) * s * 0.09, py = c + s * 0.33;
    ctx.fillStyle = '#ffd76a';
    glow(ctx, '#ffd76a', 6);
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.03); ctx.lineTo(px + s * 0.025, py); ctx.lineTo(px, py + s * 0.03); ctx.lineTo(px - s * 0.025, py);
    ctx.closePath(); ctx.fill();
  }
  noGlow(ctx);
  // corner crystals for max level
  if (level === 2) {
    for (let i = 0; i < 6; i += 2) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const x = c + Math.cos(a) * s * 0.4, y = c + Math.sin(a) * s * 0.4;
      ctx.fillStyle = col; glow(ctx, col, 8);
      ctx.beginPath(); ctx.arc(x, y, s * 0.028, 0, Math.PI * 2); ctx.fill();
    }
    noGlow(ctx);
  }
  ctx.restore();
}

export function drawTurret(ctx: Ctx, type: TowerType, level: number, s = TEX) {
  const c = s / 2;
  const col = TOWER_COLORS[type];
  ctx.save();
  ctx.translate(c, c);
  const L = level;
  switch (type) {
    case 'pulse': {
      const barrels = L === 2 ? 3 : 2;
      const len = s * (0.3 + L * 0.04);
      for (let i = 0; i < barrels; i++) {
        const off = (i - (barrels - 1) / 2) * s * 0.075;
        ctx.fillStyle = '#c7d6f2';
        roundRect(ctx, 0, off - s * 0.022, len, s * 0.044, s * 0.015); ctx.fill();
        ctx.fillStyle = col; glow(ctx, col, 8);
        ctx.fillRect(len - s * 0.03, off - s * 0.022, s * 0.03, s * 0.044);
        noGlow(ctx);
      }
      ctx.fillStyle = '#1d2b52';
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = s * 0.015;
      roundRect(ctx, -s * 0.15, -s * 0.13, s * 0.27, s * 0.26, s * 0.06); ctx.fill(); ctx.stroke();
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.08, [[0, '#ffffff'], [0.4, col], [1, col + '00']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'arc': {
      // tesla coil – radially symmetric
      for (let i = 3; i >= 0; i--) {
        ctx.strokeStyle = i % 2 ? '#ffd76a' : '#6b7fb8';
        ctx.lineWidth = s * 0.03;
        ctx.beginPath(); ctx.arc(0, 0, s * (0.08 + i * 0.045), 0, Math.PI * 2); ctx.stroke();
      }
      const prongs = 3 + L;
      for (let i = 0; i < prongs; i++) {
        const a = (i / prongs) * Math.PI * 2;
        ctx.strokeStyle = '#c7d6f2'; ctx.lineWidth = s * 0.025;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12);
        ctx.lineTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3); ctx.stroke();
        ctx.fillStyle = col; glow(ctx, col, 10);
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.03, 0, Math.PI * 2); ctx.fill();
        noGlow(ctx);
      }
      glow(ctx, col, 18);
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.11, [[0, '#ffffff'], [0.45, col], [1, '#5a2ca8']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.11, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      break;
    }
    case 'cryo': {
      const len = s * (0.3 + L * 0.03);
      glow(ctx, col, 12);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, '#e8fcff'); g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(s * 0.05, -s * 0.07); ctx.lineTo(-s * 0.04, 0); ctx.lineTo(s * 0.05, s * 0.07); ctx.closePath(); ctx.fill();
      noGlow(ctx);
      // side fins
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = '#7fb9d6';
        ctx.beginPath(); ctx.moveTo(-s * 0.1, sgn * s * 0.05); ctx.lineTo(s * 0.06, sgn * s * (0.16 + L * 0.02)); ctx.lineTo(s * 0.12, sgn * s * 0.06); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#1d2b52'; ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = s * 0.014;
      hex(ctx, 0, 0, s * 0.1, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8fcff'; glow(ctx, col, 10);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.035, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      break;
    }
    case 'mortar': {
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.19, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = s * 0.02; ctx.stroke();
      const bw = s * (0.15 + L * 0.02);
      ctx.fillStyle = '#9aa6c4';
      roundRect(ctx, 0, -bw / 2, s * 0.27, bw, s * 0.03); ctx.fill();
      ctx.fillStyle = '#2b1a0b';
      ctx.beginPath(); ctx.ellipse(s * 0.27, 0, s * 0.03, bw * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      // sun emblem
      glow(ctx, col, 14);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = col; ctx.lineWidth = s * 0.016;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.07, Math.sin(a) * s * 0.07);
        ctx.lineTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12); ctx.stroke();
      }
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.07, [[0, '#fff6c8'], [1, col]]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.065, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      break;
    }
    case 'beacon': {
      for (let i = 0; i <= L; i++) {
        ctx.strokeStyle = i % 2 ? '#3ef0ff' : col;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = s * 0.014;
        ctx.beginPath(); ctx.ellipse(0, 0, s * (0.2 + i * 0.05), s * (0.08 + i * 0.03), i * 0.9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      glow(ctx, col, 20);
      const g = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.2);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, col); g.addColorStop(1, '#3ef0ff');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.lineTo(s * 0.1, 0); ctx.lineTo(0, s * 0.2); ctx.lineTo(-s * 0.1, 0); ctx.closePath(); ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, -s * 0.12); ctx.lineTo(s * 0.035, 0); ctx.lineTo(0, s * 0.05); ctx.lineTo(-s * 0.035, 0); ctx.closePath(); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Composite icon used by the UI (base + turret at a nice angle). */
export function towerIcon(type: TowerType, level = 0, size = 128): string {
  const cv = makeCanvas(size);
  const ctx = cv.getContext('2d')!;
  drawTowerBase(ctx, type, level, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(type === 'arc' || type === 'beacon' ? 0 : -Math.PI / 5);
  ctx.translate(-size / 2, -size / 2);
  drawTurret(ctx, type, level, size);
  ctx.restore();
  return cv.toDataURL();
}

// ----------------------------------------------------------------- enemies
export const ENEMY_TEX: Record<EnemyType, number> = { crawler: 96, runner: 88, brute: 128, guardian: 120, overlord: 224 };

export function drawEnemy(ctx: Ctx, type: EnemyType, frame: number) {
  const s = ENEMY_TEX[type];
  const c = s / 2;
  const f = frame ? 1 : -1;
  ctx.save();
  ctx.translate(c, c);
  ctx.lineCap = 'round';
  switch (type) {
    case 'crawler': {
      ctx.strokeStyle = '#6d2bb3'; ctx.lineWidth = s * 0.05;
      for (let i = -1; i <= 1; i++) {
        for (const side of [-1, 1]) {
          const sw = (i % 2 === 0 ? f : -f) * s * 0.06;
          ctx.beginPath(); ctx.moveTo(i * s * 0.1, side * s * 0.1);
          ctx.lineTo(i * s * 0.12 + sw, side * s * 0.3); ctx.stroke();
        }
      }
      glow(ctx, '#a43cff', 14);
      ctx.fillStyle = radial(ctx, -s * 0.05, 0, s * 0.3, [[0, '#b46bff'], [0.7, '#5a1a9a'], [1, '#2a0a4a']]);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.27, s * 0.19, 0, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = s * 0.015;
      ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.lineTo(s * 0.15, 0); ctx.stroke();
      ctx.fillStyle = '#ff3b5c'; glow(ctx, '#ff3b5c', 8);
      ctx.beginPath(); ctx.arc(s * 0.19, -s * 0.06, s * 0.035, 0, Math.PI * 2); ctx.arc(s * 0.19, s * 0.06, s * 0.035, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'runner': {
      ctx.strokeStyle = '#ff2fb0'; ctx.lineWidth = s * 0.04;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-s * 0.05, side * s * 0.06);
        ctx.lineTo(-s * 0.18 + f * side * s * 0.06, side * s * 0.25); ctx.stroke();
      }
      glow(ctx, '#ff2fb0', 16);
      const g = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
      g.addColorStop(0, 'rgba(255,47,176,0)'); g.addColorStop(0.4, '#c21f8a'); g.addColorStop(1, '#ff7ad1');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(s * 0.32, 0); ctx.lineTo(-s * 0.05, -s * 0.14); ctx.lineTo(-s * 0.36, 0); ctx.lineTo(-s * 0.05, s * 0.14); ctx.closePath(); ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = '#fff0f8';
      ctx.beginPath(); ctx.arc(s * 0.14, 0, s * 0.035, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'brute': {
      ctx.fillStyle = '#3b1460';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(f * side * s * 0.06, side * s * 0.25, s * 0.1, s * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
      glow(ctx, '#ff3b5c', 18);
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.33, [[0, '#7a2fb0'], [0.75, '#3d1266'], [1, '#1d0733']]);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.27, 0, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      // armor plates
      ctx.fillStyle = '#5b5577'; ctx.strokeStyle = '#2a2440'; ctx.lineWidth = s * 0.012;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(-s * 0.12 + i * s * 0.1, 0, s * 0.07, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = radial(ctx, s * 0.2, 0, s * 0.08, [[0, '#ffd0d8'], [0.5, '#ff3b5c'], [1, '#8a0a20']]);
      glow(ctx, '#ff3b5c', 12);
      ctx.beginPath(); ctx.arc(s * 0.2, 0, s * 0.07, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'guardian': {
      ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = s * 0.02; ctx.globalAlpha = 0.6;
      glow(ctx, '#ff3b5c', 12);
      hex(ctx, 0, 0, s * 0.4, f > 0 ? 0 : Math.PI / 6); ctx.stroke();
      ctx.globalAlpha = 1; noGlow(ctx);
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.28, [[0, '#9b4bd6'], [0.8, '#43166e'], [1, '#22093d']]);
      hex(ctx, 0, 0, s * 0.27, 0); ctx.fill();
      ctx.strokeStyle = '#c9a3ff'; ctx.lineWidth = s * 0.018; ctx.stroke();
      // front shield plate
      ctx.fillStyle = '#6a6290';
      ctx.beginPath(); ctx.arc(s * 0.05, 0, s * 0.3, -0.8, 0.8); ctx.arc(s * 0.05, 0, s * 0.22, 0.8, -0.8, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff3b5c'; glow(ctx, '#ff3b5c', 10);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'overlord': {
      // aura
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.5, [[0, 'rgba(160,40,255,0.35)'], [0.7, 'rgba(120,20,200,0.12)'], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
      // tentacles
      ctx.strokeStyle = '#4b1580'; ctx.lineWidth = s * 0.04;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.55 + (i / 5) * Math.PI * 0.9;
        const wob = (i % 2 ? f : -f) * 0.18;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2);
        ctx.quadraticCurveTo(Math.cos(a + wob) * s * 0.36, Math.sin(a + wob) * s * 0.36, Math.cos(a - wob) * s * 0.46, Math.sin(a - wob) * s * 0.46);
        ctx.stroke();
      }
      glow(ctx, '#b02cff', 24);
      ctx.fillStyle = radial(ctx, 0, 0, s * 0.3, [[0, '#5a1a9a'], [0.8, '#250840'], [1, '#12031f']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.fill();
      noGlow(ctx);
      // crown spikes
      ctx.fillStyle = '#ff3b5c';
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + (i / 4) * 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.12) * s * 0.26, Math.sin(a - 0.12) * s * 0.26);
        ctx.lineTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
        ctx.lineTo(Math.cos(a + 0.12) * s * 0.26, Math.sin(a + 0.12) * s * 0.26);
        ctx.closePath(); ctx.fill();
      }
      // eye
      ctx.fillStyle = '#16021f';
      ctx.beginPath(); ctx.ellipse(s * 0.06, 0, s * 0.14, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      glow(ctx, '#ff3b5c', 20);
      ctx.fillStyle = radial(ctx, s * 0.09, 0, s * 0.08, [[0, '#ffffff'], [0.3, '#ff5a75'], [1, '#b0102e']]);
      ctx.beginPath(); ctx.ellipse(s * 0.09, 0, s * 0.045, s * 0.075, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
  noGlow(ctx);
}

export function enemyIcon(type: EnemyType, size = 96): string {
  const s = ENEMY_TEX[type];
  const cv = makeCanvas(size);
  const ctx = cv.getContext('2d')!;
  const tmp = makeCanvas(s);
  drawEnemy(tmp.getContext('2d')!, type, 0);
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 2);
  const k = type === 'overlord' ? 1.0 : 1.25;
  ctx.drawImage(tmp, (-size / 2) * k, (-size / 2) * k, size * k, size * k);
  return cv.toDataURL();
}

// --------------------------------------------------------------- props & fx
export function drawCore(ctx: Ctx, s: number) {
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.fillStyle = radial(ctx, 0, 0, s * 0.5, [[0, 'rgba(62,240,255,0.5)'], [0.5, 'rgba(62,240,255,0.12)'], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
  // platform
  ctx.fillStyle = '#16213f'; ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = s * 0.02;
  hex(ctx, 0, 0, s * 0.3, 0); ctx.fill(); ctx.stroke();
  // crystal
  glow(ctx, '#3ef0ff', 30);
  const g = ctx.createLinearGradient(0, -s * 0.28, 0, s * 0.2);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7ff7ff'); g.addColorStop(1, '#0f9fb3');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.12, -s * 0.05); ctx.lineTo(0, s * 0.18); ctx.lineTo(-s * 0.12, -s * 0.05); ctx.closePath(); ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.03, -s * 0.05); ctx.lineTo(0, s * 0.18); ctx.lineTo(-s * 0.05, -s * 0.05); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawRing(ctx: Ctx, s: number, width: number, dashed = false) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([s * 0.08, s * 0.05]);
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - width, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawRift(ctx: Ctx, s: number) {
  const c = s / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.fillStyle = radial(ctx, 0, 0, s * 0.5, [[0, '#000000'], [0.25, '#2a0640'], [0.55, 'rgba(160,40,255,0.55)'], [0.8, 'rgba(255,40,90,0.18)'], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = i % 2 ? 'rgba(255,59,92,0.7)' : 'rgba(190,110,255,0.8)';
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    const a0 = (i / 5) * Math.PI * 2;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const r = s * (0.08 + t * 0.34);
      const a = a0 + t * 2.4;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPad(ctx: Ctx, s: number) {
  const c = s / 2;
  ctx.fillStyle = 'rgba(62,240,255,0.06)';
  hex(ctx, c, c, s * 0.42); ctx.fill();
  ctx.strokeStyle = 'rgba(62,240,255,0.35)';
  ctx.lineWidth = s * 0.02;
  ctx.setLineDash([s * 0.07, s * 0.05]);
  hex(ctx, c, c, s * 0.42); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(62,240,255,0.5)';
  ctx.beginPath(); ctx.arc(c, c, s * 0.03, 0, Math.PI * 2); ctx.fill();
}

export function drawSoftDot(ctx: Ctx, s: number) {
  const c = s / 2;
  ctx.fillStyle = radial(ctx, c, c, c, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, 0, s, s);
}

export function drawBolt(ctx: Ctx, s: number, color: string) {
  const c = s / 2;
  ctx.fillStyle = radial(ctx, c, c, c, [[0, '#ffffff'], [0.3, color], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.ellipse(c, c, c, c * 0.55, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawShard(ctx: Ctx, s: number) {
  const c = s / 2;
  glow(ctx, '#9ff0ff', 8);
  ctx.fillStyle = '#e8fcff';
  ctx.beginPath(); ctx.moveTo(s * 0.95, c); ctx.lineTo(c, c - s * 0.18); ctx.lineTo(s * 0.1, c); ctx.lineTo(c, c + s * 0.18); ctx.closePath(); ctx.fill();
  noGlow(ctx);
}

export function drawShell(ctx: Ctx, s: number) {
  const c = s / 2;
  glow(ctx, '#ffb238', 12);
  ctx.fillStyle = radial(ctx, c, c, c * 0.7, [[0, '#fffbe0'], [0.5, '#ffc14d'], [1, '#c26a00']]);
  ctx.beginPath(); ctx.arc(c, c, c * 0.6, 0, Math.PI * 2); ctx.fill();
  noGlow(ctx);
}
