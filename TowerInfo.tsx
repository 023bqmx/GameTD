import type { GameController } from '../state/GameController';
import type { LayoutMode } from './GameScreen';
import { TOWERS, MAX_LEVEL } from '../game/data/towers';
import type { TargetMode } from '../game/engine/types';
import { IconClose, IconCoin, IconTarget, IconUp, towerImg } from './icons';

const MODES: { id: TargetMode; label: string }[] = [
  { id: 'first', label: 'หน้าสุด' },
  { id: 'last', label: 'ท้ายสุด' },
  { id: 'strong', label: 'แข็งสุด' },
  { id: 'near', label: 'ใกล้สุด' },
];

function Stat({ label, now, next }: { label: string; now: string | number; next?: string | number }) {
  const changed = next !== undefined && next !== now;
  return (
    <div className="istat">
      <span>{label}</span>
      <b>{now}{changed && <em> → {next}</em>}</b>
    </div>
  );
}

export default function TowerInfo({ ctrl, layout }: { ctrl: GameController; layout: LayoutMode }) {
  if (ctrl.selection.kind !== 'tower') return null;
  const t = ctrl.engine.getTower(ctrl.selection.id);
  if (!t) return null;
  const def = TOWERS[t.type];
  const lv = def.levels[t.level];
  const nx = t.level + 1 < MAX_LEVEL ? def.levels[t.level + 1] : undefined;
  const upCost = ctrl.engine.upgradeCost(t);
  const canUp = upCost !== null && ctrl.engine.energy >= upCost;
  const aura = def.attack === 'aura';
  const dps = aura ? 0 : lv.damage * lv.rate * t.buff;

  return (
    <section className={`tinfo tinfo-${layout}`} aria-label={`ข้อมูล ${def.name}`} style={{ ['--tc' as string]: def.color }}>
      <div className="tinfo-head">
        <img src={towerImg(t.type, t.level)} alt="" />
        <div className="tinfo-title">
          <b>{def.name}</b>
          <span>
            LV {t.level + 1}/{MAX_LEVEL} · {def.role}
            {t.buff > 1 && <em className="buffed"> · เร่ง +{Math.round((t.buff - 1) * 100)}%</em>}
          </span>
        </div>
        {!aura && (
          <button className="mode-cycle" onClick={() => ctrl.cycleTargetMode()} aria-label="เปลี่ยนโหมดเล็งเป้า (T)">
            <IconTarget size={16} />{MODES.find((m) => m.id === t.mode)?.label}
          </button>
        )}
        <button className="icon-btn sm" onClick={() => ctrl.clearSelection()} aria-label="ปิด"><IconClose size={18} /></button>
      </div>

      <div className="istats">
        {aura ? (
          <>
            <Stat label="บัฟความเร็วโจมตี" now={`+${Math.round(((lv.buff ?? 1) - 1) * 100)}%`} next={nx ? `+${Math.round(((nx.buff ?? 1) - 1) * 100)}%` : undefined} />
            <Stat label="RANGE" now={lv.range} next={nx?.range} />
            <Stat label="ป้อมที่ได้รับบัฟ" now={ctrl.engine.towers.filter((o) => o !== t && TOWERS[o.type].attack !== 'aura' && Math.hypot(o.x - t.x, o.y - t.y) <= lv.range + 0.05).length} />
          </>
        ) : (
          <>
            <Stat label="DAMAGE" now={lv.damage} next={nx?.damage} />
            <Stat label="ATK SPEED" now={`${lv.rate}/s`} next={nx ? `${nx.rate}/s` : undefined} />
            <Stat label="RANGE" now={lv.range} next={nx?.range} />
            {lv.chains !== undefined && <Stat label="CHAIN" now={lv.chains} next={nx?.chains} />}
            {lv.slow !== undefined && <Stat label="SLOW" now={`${Math.round((1 - lv.slow) * 100)}%`} next={nx?.slow !== undefined ? `${Math.round((1 - nx.slow) * 100)}%` : undefined} />}
            {def.attack === 'lob' && <Stat label="SPLASH" now={lv.splash ?? 0} next={nx?.splash} />}
            <Stat label="DPS" now={Math.round(dps)} />
            <Stat label="KILLS" now={t.kills} />
          </>
        )}
      </div>

      {!aura && (
        <div className="seg" role="radiogroup" aria-label="โหมดเลือกเป้า (T)">
          {MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={t.mode === m.id} className={t.mode === m.id ? 'on' : ''} onClick={() => ctrl.setTargetMode(m.id)}>{m.label}</button>
          ))}
        </div>
      )}

      <div className="tinfo-actions">
        <button className="btn btn-up" disabled={!canUp} onClick={() => ctrl.upgradeSelected()} aria-label="อัปเกรด (U)">
          <IconUp size={18} />
          {upCost === null ? <span>ระดับสูงสุด</span> : <span>อัปเกรด <b>⚡{upCost}</b></span>}
        </button>
        <button className="btn btn-sell" onClick={() => ctrl.sellSelected()} aria-label="ขาย (S)">
          <IconCoin size={18} /><span>ขาย <b>+{ctrl.engine.sellValue(t)}</b></span>
        </button>
      </div>
    </section>
  );
}
