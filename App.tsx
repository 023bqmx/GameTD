import { useApp } from "./appStore";
import MainMenu from "./MainMenu";
import GameScreen from "./GameScreen";
import { HowToModal, SettingsModal } from "./Modals";

export default function App() {
  const { screen, modal, runId } = useApp();
  return (
    <div className="app">
      {screen === 'menu' ? <MainMenu /> : <GameScreen key={runId} />}
      {modal === 'settings' && <SettingsModal />}
      {modal === 'howto' && <HowToModal />}
    </div>
  );
}
