import type { GameController } from '../state/GameController';
import { IconCore, IconEnergy, IconPause, IconSkull, IconWave } from './icons';

export default function Hud({ ctrl, compact }: { ctrl: GameController; compact: boolean }) {
  const e = ctrl.engine;
  const hpK = e.coreHp / e.maxCoreHp;
  const status =
    e.phase === 'wave' ? 'กำลังรุกราน'
      : e.phase === 'victory' ? 'ชนะ!'
        : e.phase === 'defeat' ? 'แกนพลังงานแตก'
          : e.intermission !== null ? `Wave ถัดไปใน ${Math.ceil(e.intermission)}s` : 'เตรียมพร้อม';
  return (
    <header className="hud glass">
      <div className="hud-group">
        <div className={`stat stat-core${hpK <= 0.3 ? ' danger' : ''}`} title="HP ของ Aether Core">
          <IconCore size={compact ? 18 : 22} />
          <div className="stat-col">
            {!compact && <span className="stat-label">AETHER CORE</span>}
            <div className="hp-row">
              <div className="hp-bar"><div className="hp-fill" style={{ width: `${hpK * 100}%` }} /></div>
              <b className="num">{e.coreHp}</b>
            </div>
          </div>
        </div>
        <div className="stat stat-energy" title="Energy">
          <IconEnergy size={compact ? 18 : 22} />
          <div className="stat-col">
            {!compact && <span className="stat-label">ENERGY</span>}
            <b className="num">{Math.floor(e.energy)}</b>
          </div>
        </div>
      </div>

      <div className="hud-group hud-center">
        <div className="stat stat-wave">
          <IconWave size={compact ? 18 : 22} />
          <div className="stat-col">
            {!compact && <span className="stat-label">WAVE</span>}
            <b className="num">{Math.max(1, e.wave)}<small>/{e.totalWaves}</small></b>
          </div>
        </div>
        <div className="stat stat-enemy" title="ศัตรูที่เหลือใน Wave นี้">
          <IconSkull size={compact ? 18 : 22} />
          <div className="stat-col">
            {!compact && <span className="stat-label">ENEMIES</span>}
            <b className="num">{e.phase === 'wave' ? e.enemiesRemaining : 0}</b>
          </div>
        </div>
        {!compact && <div className={`hud-status phase-${e.phase}`}>{status}</div>}
      </div>

      <div className="hud-group hud-right">
        <div className="speed-toggle" role="group" aria-label="ความเร็วเกม">
          <button className={ctrl.speed === 1 ? 'on' : ''} onClick={() => ctrl.setSpeed(1)} aria-pressed={ctrl.speed === 1}>1x</button>
          <button className={ctrl.speed === 2 ? 'on' : ''} onClick={() => ctrl.setSpeed(2)} aria-pressed={ctrl.speed === 2}>2x</button>
        </div>
        <button className="icon-btn" onClick={() => ctrl.setPaused(true)} aria-label="หยุดเกม (P)"><IconPause /></button>
      </div>
    </header>
  );
}
