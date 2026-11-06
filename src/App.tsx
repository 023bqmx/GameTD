import { useApp } from "./state/appStore";
import MainMenu from "./ui/MainMenu";
import GameScreen from "./ui/GameScreen";
import { HowToModal, SettingsModal } from "./ui/Modals";

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
