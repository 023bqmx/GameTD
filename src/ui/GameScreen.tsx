import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { GameController } from '../state/GameController';
import { appStore, useApp } from '../state/appStore';
import { createGame, bestPortrait, type GameHandle } from '../game/render/createGame';
import { TOWER_ORDER } from '../game/data/towers';
import Hud from './Hud';
import ActionBar from './ActionBar';
import TowerCards, { ArmedHint } from './TowerCards';
import TowerInfo from './TowerInfo';
import PauseMenu from './PauseMenu';
import ResultScreen from './ResultScreen';

export type LayoutMode = 'side' | 'bottom';

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return vp;
}

export function useCtrl(ctrl: GameController) {
  useSyncExternalStore(ctrl.subscribe, ctrl.getVersion);
  return ctrl;
}

function Field({ ctrl }: { ctrl: GameController }) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<GameHandle | null>(null);

  useEffect(() => {
    const el = host.current!;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      const r = el.getBoundingClientRect();
      handle.current = createGame(el, ctrl, bestPortrait(r.width, r.height));
    };
    // wait for web fonts so in-game text uses the right face
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) Promise.race([fonts.ready, new Promise((res) => setTimeout(res, 1200))]).then(start);
    else start();
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) handle.current?.setPortrait(bestPortrait(r.width, r.height));
    });
    ro.observe(el);
    return () => {
      cancelled = true;
      ro.disconnect();
      handle.current?.destroy();
      handle.current = null;
    };
  }, [ctrl]);

  return <div className="field-host" ref={host} />;
}

export default function GameScreen() {
  const { runId, modal } = useApp();
  const ctrl = useMemo(() => new GameController(), [runId]);
  useCtrl(ctrl);
  const { w, h } = useViewport();
  const layout: LayoutMode = w / h > 1.12 && w >= 560 ? 'side' : 'bottom';
  const compact = Math.min(w, h) < 540;
  const tiny = layout === 'side' && h < 460;

  useEffect(() => {
    // debug hook for automated testing: append ?debug to the URL
    if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __aether: GameController }).__aether = ctrl;
    return () => ctrl.dispose();
  }, [ctrl]);

  // auto-pause when the tab is hidden
  useEffect(() => {
    const on = () => { if (document.hidden) ctrl.setPaused(true); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [ctrl]);

  // keyboard shortcuts
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (appStore.state.modal || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
      if (ctrl.result) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (ctrl.armed || ctrl.surgeTargeting || ctrl.selection.kind !== 'none') ctrl.clearSelection();
        else ctrl.setPaused(!ctrl.paused);
        e.preventDefault();
        return;
      }
      if (k === 'p') { ctrl.setPaused(!ctrl.paused); return; }
      if (ctrl.paused) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TOWER_ORDER.length) { ctrl.armTower(TOWER_ORDER[n - 1]); return; }
      if (k === ' ' || k === 'enter' || k === 'n') {
        if ((target?.tagName === 'BUTTON') && k !== 'n') return; // let focused buttons handle Space/Enter
        ctrl.startWave(); e.preventDefault(); return;
      }
      if (k === 'q') ctrl.toggleSurge();
      else if (k === 'f') ctrl.toggleSpeed();
      else if (k === 'u') ctrl.upgradeSelected();
      else if (k === 's' || k === 'delete' || k === 'backspace') ctrl.sellSelected();
      else if (k === 't') ctrl.cycleTargetMode();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [ctrl]);

  const towerSelected = ctrl.selection.kind === 'tower';
  const showCards = layout === 'side' ? !(tiny && towerSelected) : !towerSelected;

  return (
    <div className={`game layout-${layout}${compact ? ' compact' : ''}${tiny ? ' tiny' : ''}`}>
      <Hud ctrl={ctrl} compact={compact} />
      <div className="game-body">
        <div className="field-wrap">
          <Field ctrl={ctrl} />
          <FieldOverlays ctrl={ctrl} />
        </div>
        <aside className="panel glass" aria-label="แผงควบคุมป้อม">
          <ActionBar ctrl={ctrl} layout={layout} />
          {towerSelected && <TowerInfo ctrl={ctrl} layout={layout} />}
          {showCards && <TowerCards ctrl={ctrl} layout={layout} />}
        </aside>
      </div>
      {ctrl.paused && !ctrl.result && !modal && <PauseMenu ctrl={ctrl} />}
      {ctrl.result && <ResultScreen ctrl={ctrl} />}
    </div>
  );
}

function FieldOverlays({ ctrl }: { ctrl: GameController }) {
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!ctrl.toast) return;
    setToastVisible(true);
    const t = setTimeout(() => setToastVisible(false), 1600);
    return () => clearTimeout(t);
  }, [ctrl.toast?.id]);
  const hurt = performance.now() - ctrl.coreHitAt < 400;
  return (
    <>
      {ctrl.banner && (
        <div key={ctrl.banner.id} className={`banner banner-${ctrl.banner.tone}`} role="status">
          <div className="banner-title">{ctrl.banner.title}</div>
          <div className="banner-sub">{ctrl.banner.sub}</div>
        </div>
      )}
      <ArmedHint ctrl={ctrl} />
      {ctrl.surgeTargeting && (
        <div className="hint hint-surge">
          แตะจุดบนสนามเพื่อปล่อย <b>Aether Surge</b>
          <button className="hint-x" onClick={() => ctrl.clearSelection()}>ยกเลิก</button>
        </div>
      )}
      {ctrl.selection.kind === 'pad' && !ctrl.armed && (
        <div className="hint">เลือกป้อมจากแผงเพื่อสร้างตรงช่องนี้</div>
      )}
      {toastVisible && ctrl.toast && <div key={ctrl.toast.id} className="toast">{ctrl.toast.text}</div>}
      {hurt && <div className="hurt-vignette" />}
    </>
  );
}
