import type { GameController } from '../state/GameController';
import type { LayoutMode } from './GameScreen';
import { enemyImg, IconPlay, IconSurge } from './icons';
import { ENEMIES } from '../game/data/enemies';

export default function ActionBar({ ctrl, layout }: { ctrl: GameController; layout: LayoutMode }) {
  const e = ctrl.engine;
  const canStart = e.canStartWave;
  const nextWave = e.phase === 'wave' ? e.wave + 1 : e.wave + 1;
  const preview = nextWave <= e.totalWaves ? e.waveComposition(nextWave) : [];
  const isBoss = preview.some((p) => ENEMIES[p.type].boss);
  const cd = e.surgeCooldown;
  const ready = cd <= 0;
  const pct = 1 - cd / e.surgeMax;

  const startLabel = canStart
    ? `เริ่ม Wave ${e.wave + 1}`
    : e.phase === 'wave' ? `Wave ${e.wave} บุก!` : 'จบเกม';
  const startSub = canStart
    ? e.intermission !== null ? `อัตโนมัติใน ${Math.ceil(e.intermission)}s · เริ่มเร็ว +${Math.floor(e.intermission)}⚡` : 'พร้อมเมื่อไหร่กดได้เลย'
    : e.phase === 'wave' ? `ศัตรูเหลือ ${e.enemiesRemaining}` : '';

  return (
    <div className={`actionbar actionbar-${layout}`}>
      <button
        className={`btn btn-start${canStart ? ' ready' : ''}${isBoss && canStart ? ' boss' : ''}`}
        disabled={!canStart}
        onClick={() => ctrl.startWave()}
        aria-label={`${startLabel} (Space)`}
      >
        <IconPlay size={18} />
        <span className="btn-start-text">
          <b>{startLabel}</b>
          {startSub && <small>{startSub}</small>}
        </span>
      </button>

      <button
        className={`btn btn-surge${ready ? ' ready' : ''}${ctrl.surgeTargeting ? ' active' : ''}`}
        onClick={() => ctrl.toggleSurge()}
        disabled={!ready && !ctrl.surgeTargeting}
        aria-label={ready ? 'ใช้ Aether Surge (Q)' : `Aether Surge คูลดาวน์ ${Math.ceil(cd)} วินาที`}
        style={{ ['--cd' as string]: `${pct * 360}deg` }}
      >
        <span className="surge-ring"><IconSurge size={20} /></span>
        <span className="btn-surge-text">
          <b>Surge</b>
          <small>{ready ? (ctrl.surgeTargeting ? 'เลือกจุด' : 'พร้อม') : `${Math.ceil(cd)}s`}</small>
        </span>
      </button>

      {preview.length > 0 && (
        <div className={`next-wave${isBoss ? ' boss' : ''}`} aria-label={`ศัตรูใน Wave ${nextWave}`}>
          <span className="next-label">{e.phase === 'wave' ? 'ถัดไป' : 'Wave'} {nextWave}</span>
          <div className="next-icons">
            {preview.map((p) => (
              <span key={p.type} className="next-chip" title={ENEMIES[p.type].name}>
                <img src={enemyImg(p.type)} alt={ENEMIES[p.type].name} />
                <small>×{p.count}</small>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
