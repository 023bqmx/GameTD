import { useEffect, useState, type ReactNode } from 'react';
import { appStore, useApp } from "./appStore";
import { TOWERS, TOWER_ORDER } from "./towers";
import { ENEMIES, ENEMY_ORDER } from "./enemies";
import { SURGE } from "./waves";
import { enemyImg, IconClose, towerImg } from './icons';
import { sfx } from "./Sfx";

function Shell({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); appStore.closeModal(); } };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, []);
  return (
    <div className="overlay top" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) appStore.closeModal(); }}>
      <div className={`modal glass${wide ? ' wide' : ''}`}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-btn" onClick={() => appStore.closeModal()} aria-label="ปิด" autoFocus><IconClose /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="setting">
      <span>{label}</span>
      <input type="range" min={0} max={100} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <b className="num">{Math.round(value * 100)}</b>
    </label>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`setting toggle${value ? ' on' : ''}`} role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span className="toggle-text"><span>{label}</span>{desc && <small>{desc}</small>}</span>
      <span className="switch"><span /></span>
    </button>
  );
}

export function SettingsModal() {
  const { settings, progress } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <Shell title="ตั้งค่า">
      <div className="settings">
        <Slider label="เสียงเอฟเฟกต์" value={settings.sfxVolume} onChange={(v) => { appStore.updateSettings({ sfxVolume: v }); sfx.unlock(); sfx.play('click'); }} />
        <Slider label="เพลงประกอบ" value={settings.musicVolume} onChange={(v) => appStore.updateSettings({ musicVolume: v })} />
        <div className="setting">
          <span>คุณภาพกราฟิก</span>
          <div className="seg">
            <button className={settings.quality === 'high' ? 'on' : ''} onClick={() => appStore.updateSettings({ quality: 'high' })}>สูง</button>
            <button className={settings.quality === 'low' ? 'on' : ''} onClick={() => appStore.updateSettings({ quality: 'low' })}>ประหยัด</button>
          </div>
        </div>
        <Toggle label="แสดงออร่าบัฟ" desc="เรืองแสงสีทองใต้ป้อมที่ได้รับพลังจาก Beacon" value={settings.showRanges} onChange={(v) => appStore.updateSettings({ showRanges: v })} />
        <Toggle label="นับถอยหลัง Wave อัตโนมัติ" desc="ปิดเพื่อเริ่มแต่ละ Wave ด้วยตัวเองเท่านั้น" value={settings.autoNextWave} onChange={(v) => appStore.updateSettings({ autoNextWave: v })} />
        <div className="setting danger-zone">
          <span>ข้อมูลที่บันทึก <small className="muted">({progress.games} เกม · สูงสุด {progress.bestScore.toLocaleString()})</small></span>
          {confirm ? (
            <div className="row tight">
              <button className="btn btn-danger sm" onClick={() => { appStore.resetProgress(); setConfirm(false); }}>ยืนยันลบ</button>
              <button className="btn btn-glass sm" onClick={() => setConfirm(false)}>ยกเลิก</button>
            </div>
          ) : (
            <button className="btn btn-glass sm" onClick={() => setConfirm(true)}>ล้างความคืบหน้า</button>
          )}
        </div>
      </div>
    </Shell>
  );
}

export function HowToModal() {
  return (
    <Shell title="วิธีเล่น" wide>
      <div className="howto">
        <section>
          <h3>เป้าหมาย</h3>
          <p>สัตว์ประหลาดจาก <b className="t-void">Void Rift</b> จะเดินตามเส้นทางเรืองแสงไปยัง <b className="t-core">Aether Core</b> ทุกตัวที่ถึงแกนจะลด HP — รอดให้ครบ 10 Wave (Wave 10 คือบอส) เพื่อชนะ</p>
        </section>
        <section className="howto-steps">
          <div><b>1</b><p>แตะการ์ดป้อม แล้วแตะช่องหกเหลี่ยมข้างทาง — หรือแตะช่องก่อนแล้วค่อยเลือกป้อม</p></div>
          <div><b>2</b><p>แตะป้อมที่สร้างแล้วเพื่อดูระยะ อัปเกรด (3 ระดับ) เปลี่ยนโหมดเล็งเป้า หรือขายคืน 70%</p></div>
          <div><b>3</b><p>กด <b>เริ่ม Wave</b> เมื่อพร้อม เริ่มก่อนนับถอยหลังจบจะได้ Energy โบนัส</p></div>
          <div><b>4</b><p>กด <b>Surge</b> แล้วแตะจุดบนสนาม: ความเสียหาย {SURGE.damage} ทะลุเกราะ + ทำให้มึนงง รัศมี {SURGE.radius} ช่อง คูลดาวน์ {SURGE.cooldown} วินาที</p></div>
        </section>
        <section>
          <h3>ป้อมปราการ</h3>
          <div className="howto-list">
            {TOWER_ORDER.map((t) => (
              <div key={t} className="howto-item">
                <img src={towerImg(t, 1)} alt="" />
                <div><b style={{ color: TOWERS[t].color }}>{TOWERS[t].name}</b> <span className="muted">· ⚡{TOWERS[t].levels[0].cost}</span><p>{TOWERS[t].description}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>ศัตรู</h3>
          <div className="howto-list">
            {ENEMY_ORDER.map((e) => (
              <div key={e} className="howto-item">
                <img src={enemyImg(e)} alt="" />
                <div><b className="t-void">{ENEMIES[e].name}</b><p>{ENEMIES[e].description}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>ปุ่มลัดคีย์บอร์ด</h3>
          <div className="keys">
            <span><kbd>1</kbd>–<kbd>5</kbd> เลือกป้อม</span>
            <span><kbd>Space</kbd> เริ่ม Wave</span>
            <span><kbd>Q</kbd> Aether Surge</span>
            <span><kbd>U</kbd> อัปเกรด</span>
            <span><kbd>S</kbd> ขาย</span>
            <span><kbd>T</kbd> โหมดเล็ง</span>
            <span><kbd>F</kbd> สลับ 1x/2x</span>
            <span><kbd>P</kbd>/<kbd>Esc</kbd> หยุด/ยกเลิก</span>
          </div>
        </section>
      </div>
    </Shell>
  );
}
