import type { GameController } from '../state/GameController';
import type { LayoutMode } from './GameScreen';
import { TOWERS, TOWER_ORDER } from '../game/data/towers';
import { towerImg } from './icons';
import type { TowerDef } from '../game/engine/types';

export function towerStatLine(def: TowerDef, level: number) {
  const lv = def.levels[level];
  if (def.attack === 'aura') return [`บัฟ +${Math.round(((lv.buff ?? 1) - 1) * 100)}%`, `ระยะ ${lv.range}`];
  const parts = [`DMG ${lv.damage}`, `SPD ${lv.rate}/s`, `RNG ${lv.range}`];
  if (lv.chains) parts.push(`${lv.chains} เป้า`);
  if (lv.slow) parts.push(`ช้า ${Math.round((1 - lv.slow) * 100)}%`);
  if (lv.splash && def.attack === 'lob') parts.push(`วง ${lv.splash}`);
  return parts;
}

export default function TowerCards({ ctrl, layout }: { ctrl: GameController; layout: LayoutMode }) {
  const energy = ctrl.engine.energy;
  const armedDef = ctrl.armed ? TOWERS[ctrl.armed] : null;
  return (
    <div className={`towercards towercards-${layout}`}>
      <div className="towercards-scroll" role="toolbar" aria-label="เลือกป้อม">
        {TOWER_ORDER.map((type, i) => {
          const def = TOWERS[type];
          const cost = def.levels[0].cost;
          const afford = energy >= cost;
          const armed = ctrl.armed === type;
          return (
            <button
              key={type}
              className={`tcard${armed ? ' armed' : ''}${afford ? '' : ' poor'}`}
              onClick={() => ctrl.armTower(type)}
              aria-pressed={armed}
              aria-label={`${def.name} ราคา ${cost} Energy (ปุ่ม ${i + 1})`}
              style={{ ['--tc' as string]: def.color }}
            >
              <span className="tcard-key">{i + 1}</span>
              <img src={towerImg(type)} alt="" draggable={false} />
              <span className="tcard-name">{def.name}</span>
              <span className="tcard-cost">⚡{cost}</span>
            </button>
          );
        })}
      </div>
      {layout === 'side' && (
        <div className="tdetail">
          {armedDef ? (
            <>
              <div className="tdetail-head">
                <b style={{ color: armedDef.color }}>{armedDef.name}</b>
                <span>{armedDef.nameTh} · {armedDef.role}</span>
              </div>
              <p>{armedDef.description}</p>
              <div className="chips">{towerStatLine(armedDef, 0).map((s) => <span key={s} className="chip">{s}</span>)}</div>
            </>
          ) : (
            <p className="muted">แตะการ์ดป้อมเพื่อดูรายละเอียด แล้วแตะช่องหกเหลี่ยมข้างทางเพื่อสร้าง</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Floating detail for the armed tower – used on bottom layouts where the panel is short. */
export function ArmedHint({ ctrl }: { ctrl: GameController }) {
  if (!ctrl.armed) return null;
  const def = TOWERS[ctrl.armed];
  return (
    <div className="hint hint-armed">
      <img src={towerImg(ctrl.armed)} alt="" />
      <div>
        <b style={{ color: def.color }}>{def.name}</b> <span className="muted">· {def.role} · ⚡{def.levels[0].cost}</span>
        <div className="hint-desc">{def.description}</div>
        <div className="chips">{towerStatLine(def, 0).map((s) => <span key={s} className="chip">{s}</span>)}</div>
      </div>
      <button className="hint-x" onClick={() => ctrl.clearSelection()} aria-label="ยกเลิก">✕</button>
    </div>
  );
}
