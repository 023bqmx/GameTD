import { useEffect, useRef } from 'react';

/** Animated floating sky-city backdrop for the main menu (Canvas 2D, ~30fps). */
interface Island { canvas: HTMLCanvasElement; x: number; y: number; scale: number; depth: number; phase: number }

function makeIsland(w: number, seed: number, main = false): HTMLCanvasElement {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const h = w * (main ? 1.5 : 0.9);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  const top = h * (main ? 0.62 : 0.45);
  // rock underside
  const rock = ctx.createLinearGradient(0, top, 0, h);
  rock.addColorStop(0, '#1b2546'); rock.addColorStop(1, '#070b1a');
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(w * 0.05, top);
  ctx.lineTo(w * 0.95, top);
  for (let i = 10; i >= 0; i--) {
    const x = w * (0.1 + (i / 10) * 0.8);
    const depth = Math.sin((i / 10) * Math.PI) * (h - top) * (0.75 + rnd() * 0.25);
    ctx.lineTo(x, top + depth);
  }
  ctx.closePath();
  ctx.fill();
  // energy veins
  ctx.strokeStyle = 'rgba(62,240,255,0.35)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = w * (0.25 + rnd() * 0.5), y = top + 4;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * w * 0.08; y += (h - top) * 0.12; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // ground
  ctx.fillStyle = '#24335e';
  ctx.fillRect(w * 0.05, top - h * 0.015, w * 0.9, h * 0.02);
  ctx.fillStyle = 'rgba(62,240,255,0.5)';
  ctx.fillRect(w * 0.05, top - h * 0.016, w * 0.9, Math.max(1, h * 0.003));
  // buildings
  const count = main ? 16 : 9;
  for (let i = 0; i < count; i++) {
    const bw = w * (0.04 + rnd() * 0.06);
    const bx = w * 0.08 + rnd() * (w * 0.84 - bw);
    const centre = 1 - Math.abs(bx + bw / 2 - w / 2) / (w / 2);
    const bh = (main ? h * 0.45 : h * 0.35) * (0.25 + rnd() * 0.5) * (0.5 + centre * 0.8);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#1a2650'); g.addColorStop(1, '#0d1430');
    ctx.fillStyle = g;
    ctx.fillRect(bx, top - bh, bw, bh);
    // windows
    for (let wy = top - bh + 6; wy < top - 6; wy += Math.max(4, h * 0.018)) {
      for (let wx = bx + 3; wx < bx + bw - 3; wx += Math.max(4, w * 0.012)) {
        if (rnd() < 0.45) {
          ctx.fillStyle = rnd() < 0.75 ? 'rgba(62,240,255,0.7)' : 'rgba(255,215,106,0.8)';
          ctx.fillRect(wx, wy, Math.max(1.5, w * 0.005), Math.max(1.5, h * 0.006));
        }
      }
    }
    // antenna
    if (rnd() < 0.5) {
      ctx.strokeStyle = '#3a4a7a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx + bw / 2, top - bh); ctx.lineTo(bx + bw / 2, top - bh - h * 0.04); ctx.stroke();
      ctx.fillStyle = '#ff3b5c'; ctx.fillRect(bx + bw / 2 - 1, top - bh - h * 0.04 - 2, 2, 2);
    }
  }
  if (main) {
    // central spire holding the core
    const sx = w / 2;
    const g = ctx.createLinearGradient(sx - w * 0.05, 0, sx + w * 0.05, 0);
    g.addColorStop(0, '#2a3a6a'); g.addColorStop(0.5, '#3d528f'); g.addColorStop(1, '#141d3d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.06, top); ctx.lineTo(sx - w * 0.015, top - h * 0.55);
    ctx.lineTo(sx + w * 0.015, top - h * 0.55); ctx.lineTo(sx + w * 0.06, top);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,106,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  return cv;
}

export default function SkyCity() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0, last = 0, W = 0, H = 0, dpr = 1;
    let islands: Island[] = [];
    let stars: { x: number; y: number; r: number; p: number }[] = [];
    const motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.03, r: 0.5 + Math.random() * 1.8 }));
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: 0.55 + Math.random() * 0.4, w: 0.25 + Math.random() * 0.35, v: 0.004 + Math.random() * 0.006, a: 0.04 + (i % 3) * 0.02 }));

    const setup = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      const base = Math.min(W, H * 1.6);
      islands = [
        { canvas: makeIsland(Math.round(base * 0.28), 11), x: 0.12, y: 0.42, scale: 1, depth: 0.3, phase: 0 },
        { canvas: makeIsland(Math.round(base * 0.22), 23), x: 0.86, y: 0.36, scale: 1, depth: 0.25, phase: 1.3 },
        { canvas: makeIsland(Math.round(base * 0.18), 37), x: 0.7, y: 0.72, scale: 1, depth: 0.6, phase: 2.1 },
        { canvas: makeIsland(Math.round(base * 0.5), 5, true), x: 0.5, y: 0.5, scale: 1, depth: 0.5, phase: 0.7 },
        { canvas: makeIsland(Math.round(base * 0.2), 51), x: 0.24, y: 0.8, scale: 1, depth: 0.8, phase: 3.3 },
      ];
      stars = Array.from({ length: Math.round((W * H) / 5000) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.75, r: Math.random() * 1.3 + 0.2, p: Math.random() * 6 }));
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(cv);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;
      last = now;
      const t = reduce ? 0 : now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#040817'); sky.addColorStop(0.55, '#0b1736'); sky.addColorStop(1, '#1b0f3a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      for (const s of stars) {
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + s.p));
        ctx.fillStyle = '#cfe9ff';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      // Void Rift on the horizon
      const rx = W * 0.82, ry = H * 0.16, rr = Math.min(W, H) * 0.22;
      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      rg.addColorStop(0, 'rgba(10,0,20,0.95)'); rg.addColorStop(0.3, 'rgba(120,30,200,0.5)');
      rg.addColorStop(0.6, 'rgba(255,40,90,0.15)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 0.25);
      ctx.strokeStyle = 'rgba(190,110,255,0.45)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let a = 0; a < 2.6; a += 0.1) {
          const r = rr * 0.1 + a * rr * 0.22;
          const x = Math.cos(a + k * 1.57) * r, y = Math.sin(a + k * 1.57) * r * 0.55;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // aether beam from the main spire
      const main = islands[3];
      const mx = W * main.x, my = H * main.y + Math.sin(t * 0.6 + main.phase) * 8;
      const coreY = my - main.canvas.height * 0.5 + main.canvas.height * (0.62 - 0.55) - main.canvas.height * 0.0;
      const beamTop = 0;
      const beam = ctx.createLinearGradient(0, beamTop, 0, coreY);
      beam.addColorStop(0, 'rgba(62,240,255,0)'); beam.addColorStop(1, 'rgba(62,240,255,0.35)');
      ctx.fillStyle = beam;
      const bw = 8 + Math.sin(t * 3) * 3;
      ctx.fillRect(mx - bw / 2, beamTop, bw, coreY - beamTop);

      for (const c of clouds) {
        c.x = (c.x + c.v * (reduce ? 0 : 0.033)) % 1.4;
        const cx = (c.x - 0.2) * W, cy = c.y * H;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.w * W * 0.5);
        cg.addColorStop(0, `rgba(120,160,255,${c.a})`); cg.addColorStop(1, 'rgba(120,160,255,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(cx, cy, c.w * W * 0.5, c.w * W * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }

      const sorted = [...islands].sort((a, b) => a.depth - b.depth);
      for (const is of sorted) {
        const bob = Math.sin(t * 0.6 + is.phase) * (6 + is.depth * 6);
        const x = W * is.x - is.canvas.width / 2;
        const y = H * is.y - is.canvas.height / 2 + bob;
        ctx.globalAlpha = 0.55 + is.depth * 0.5;
        ctx.drawImage(is.canvas, x, y);
        ctx.globalAlpha = 1;
        if (is === main) {
          const cx = W * is.x, cy = y + is.canvas.height * (0.62 - 0.55) - 6;
          const pulse = 1 + Math.sin(t * 2.4) * 0.12;
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46 * pulse);
          cg.addColorStop(0, 'rgba(255,255,255,1)'); cg.addColorStop(0.2, 'rgba(62,240,255,0.9)'); cg.addColorStop(1, 'rgba(62,240,255,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 46 * pulse, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,215,106,0.7)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(cx, cy, 30, 9, Math.sin(t) * 0.2, 0, Math.PI * 2); ctx.stroke();
        }
      }

      for (const m of motes) {
        m.y -= m.v * (reduce ? 0 : 0.033);
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        ctx.fillStyle = m.r > 1.4 ? 'rgba(255,215,106,0.7)' : 'rgba(62,240,255,0.7)';
        ctx.beginPath(); ctx.arc(m.x * W + Math.sin(t + m.y * 10) * 6, m.y * H, m.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="skycity" aria-hidden="true" />;
}
