import Phaser from 'phaser';
import { BattleScene, CELL } from './BattleScene';
import type { GameController } from '../../state/GameController';
import { COLS, ROWS } from '../data/map';

export interface GameHandle {
  game: Phaser.Game;
  scene: BattleScene;
  setPortrait: (portrait: boolean) => void;
  destroy: () => void;
}

/** Picks the orientation that renders the field biggest inside a w×h box. */
export function bestPortrait(w: number, h: number): boolean {
  const land = Math.min(w / COLS, h / ROWS);
  const port = Math.min(w / ROWS, h / COLS);
  return port > land * 1.04;
}

export function createGame(parent: HTMLElement, ctrl: GameController, portrait: boolean): GameHandle {
  const scene = new BattleScene(ctrl);
  scene.portrait = portrait;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#050915',
    width: (portrait ? ROWS : COLS) * CELL,
    height: (portrait ? COLS : ROWS) * CELL,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60, smoothStep: true },
    input: { activePointers: 2 },
    banner: false,
    scene: [scene],
  });
  return {
    game,
    scene,
    setPortrait: (p: boolean) => {
      if (scene.sys?.isActive()) scene.applyOrientation(p);
      else scene.portrait = p;
      game.scale.refresh();
    },
    destroy: () => game.destroy(true),
  };
}
