import type { GameController } from '../state/GameController';
import { appStore } from '../state/appStore';
import { IconHome, IconRestart, IconStar } from './icons';

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function ResultScreen({ ctrl }: { ctrl: GameController }) {
  const r = ctrl.result!;
  return (
    <div className="overlay result-overlay" role="dialog" aria-modal="true" aria-label={r.victory ? 'ชนะ' : 'แพ้'}>
      <div className={`modal glass result ${r.victory ? 'win' : 'lose'}`}>
        <div className="result-kicker">{r.victory ? 'AETHER CORE SECURED' : 'AETHER CORE DESTROYED'}</div>
        <h2 className="result-title">{r.victory ? 'VICTORY' : 'DEFEAT'}</h2>
        <p className="result-sub">{r.victory ? 'เมืองลอยฟ้ารอดพ้นจากความว่างเปล่า' : `แกนพลังงานแตกสลายใน Wave ${r.wave}`}</p>
        <div className="result-stars" aria-label={`${r.stars} ดาว`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`rstar${i < r.stars ? ' on' : ''}`} style={{ animationDelay: `${0.25 + i * 0.25}s` }}>
              <IconStar size={48} />
            </span>
          ))}
        </div>
        <div className="result-grid">
          <div><span>ศัตรูที่กำจัด</span><b>{r.kills}</b></div>
          <div><span>Energy ที่ใช้</span><b>{r.energySpent.toLocaleString()}</b></div>
          <div><span>Core HP ที่เหลือ</span><b>{r.coreHp}/{r.maxCoreHp}</b></div>
          <div><span>Wave</span><b>{r.victory ? r.totalWaves : r.wave}/{r.totalWaves}</b></div>
          <div><span>เวลา</span><b>{fmtTime(r.time)}</b></div>
          <div className="score"><span>คะแนน</span><b>{r.score.toLocaleString()}</b>{r.best && <em className="best">NEW BEST</em>}</div>
        </div>
        <div className="row">
          <button className="btn btn-primary" autoFocus onClick={() => ctrl.restart()}><IconRestart /> เล่นอีกครั้ง</button>
          <button className="btn btn-glass" onClick={() => appStore.toMenu()}><IconHome /> เมนูหลัก</button>
        </div>
      </div>
    </div>
  );
}
