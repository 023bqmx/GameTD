import type { GameController } from '../state/GameController';
import { appStore } from '../state/appStore';
import { IconGear, IconHome, IconPlay, IconRestart } from './icons';

export default function PauseMenu({ ctrl }: { ctrl: GameController }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="หยุดเกม">
      <div className="modal glass pause">
        <h2 className="modal-title">หยุดชั่วคราว</h2>
        <p className="muted center">Wave {Math.max(1, ctrl.engine.wave)} / {ctrl.engine.totalWaves} · Core {ctrl.engine.coreHp} HP</p>
        <div className="stack">
          <button className="btn btn-primary" autoFocus onClick={() => ctrl.setPaused(false)}><IconPlay /> เล่นต่อ</button>
          <button className="btn btn-glass" onClick={() => ctrl.restart()}><IconRestart /> เริ่มใหม่</button>
          <button className="btn btn-glass" onClick={() => appStore.openModal('settings')}><IconGear /> ตั้งค่า</button>
          <button className="btn btn-glass" onClick={() => appStore.toMenu()}><IconHome /> เมนูหลัก</button>
        </div>
      </div>
    </div>
  );
}
