import SkyCity from './SkyCity';
import { appStore, useApp } from '../state/appStore';
import { IconBook, IconGear, IconPlay, IconStar } from './icons';

export default function MainMenu() {
  const { progress } = useApp();
  return (
    <div className="menu">
      <SkyCity />
      <div className="menu-veil" />
      <main className="menu-content">
        <div className="logo">
          <div className="logo-kicker">FANTASY · SCI-FI · TOWER DEFENSE</div>
          <h1 className="logo-title" aria-label="AETHERKEEP">
            <span>AETHER</span><span className="logo-keep">KEEP</span>
          </h1>
          <div className="logo-sub">ผู้พิทักษ์แกนฟ้า</div>
        </div>
        <p className="menu-story">
          ประตูมิติ <b className="t-void">Void Rift</b> แตกออกเหนือเมืองลอยฟ้า สัตว์ประหลาดหลั่งไหลเข้าหา
          <b className="t-core"> Aether Core</b> — สร้างป้อม วางกลยุทธ์ และปกป้องแกนพลังงานให้รอดครบ 10 Wave
        </p>
        <nav className="menu-buttons">
          <button className="btn btn-primary btn-xl" onClick={() => appStore.play()} autoFocus>
            <IconPlay size={22} /> เริ่มเล่น
          </button>
          <div className="menu-row">
            <button className="btn btn-glass" onClick={() => appStore.openModal('howto')}><IconBook /> วิธีเล่น</button>
            <button className="btn btn-glass" onClick={() => appStore.openModal('settings')}><IconGear /> ตั้งค่า</button>
          </div>
        </nav>
        {progress.games > 0 && (
          <div className="menu-progress glass">
            <div><span>คะแนนสูงสุด</span><b>{progress.bestScore.toLocaleString()}</b></div>
            <div><span>ดาวสูงสุด</span><b className="stars-inline">{[0, 1, 2].map((i) => <IconStar key={i} size={16} className={i < progress.bestStars ? 'on' : 'off'} />)}</b></div>
            <div><span>ชนะ / เล่น</span><b>{progress.wins} / {progress.games}</b></div>
            <div><span>Wave ไกลสุด</span><b>{progress.highestWave}</b></div>
          </div>
        )}
      </main>
    </div>
  );
}
