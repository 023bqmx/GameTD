import type { ReactNode } from 'react';
import type { EnemyType, TowerType } from '../game/engine/types';
import { enemyIcon, towerIcon } from '../game/render/art';

// Cached data-URL icons rendered from the same procedural art as the game.
const towerCache = new Map<string, string>();
const enemyCache = new Map<string, string>();

export function towerImg(type: TowerType, level = 0) {
  const k = `${type}_${level}`;
  if (!towerCache.has(k)) towerCache.set(k, towerIcon(type, level, 112));
  return towerCache.get(k)!;
}
export function enemyImg(type: EnemyType) {
  if (!enemyCache.has(type)) enemyCache.set(type, enemyIcon(type, 80));
  return enemyCache.get(type)!;
}

type P = { size?: number; className?: string };
const svg = (size: number, className: string | undefined, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const IconCore = ({ size = 20, className }: P) => svg(size, className, <>
  <path d="M12 2 18 10 12 22 6 10Z" fill="currentColor" fillOpacity={0.25} /><path d="M6 10h12M12 2v20" strokeOpacity={0.6} />
</>);
export const IconEnergy = ({ size = 20, className }: P) => svg(size, className, <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" fillOpacity={0.3} />);
export const IconWave = ({ size = 20, className }: P) => svg(size, className, <>
  <path d="M2 8c3-3 5 3 8 0s5-3 8 0 4 0 4 0" /><path d="M2 15c3-3 5 3 8 0s5-3 8 0 4 0 4 0" strokeOpacity={0.6} />
</>);
export const IconSkull = ({ size = 20, className }: P) => svg(size, className, <>
  <path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14Z" fill="currentColor" fillOpacity={0.2} />
  <circle cx={9} cy={11} r={1.6} fill="currentColor" /><circle cx={15} cy={11} r={1.6} fill="currentColor" />
</>);
export const IconPause = ({ size = 20, className }: P) => svg(size, className, <><rect x={6} y={5} width={4} height={14} rx={1} fill="currentColor" /><rect x={14} y={5} width={4} height={14} rx={1} fill="currentColor" /></>);
export const IconPlay = ({ size = 20, className }: P) => svg(size, className, <path d="M7 4v16l13-8Z" fill="currentColor" />);
export const IconSurge = ({ size = 20, className }: P) => svg(size, className, <>
  <circle cx={12} cy={12} r={9} strokeOpacity={0.5} /><circle cx={12} cy={12} r={4} fill="currentColor" fillOpacity={0.4} />
  <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
</>);
export const IconStar = ({ size = 20, className }: P) => svg(size, className, <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9Z" fill="currentColor" />);
export const IconClose = ({ size = 20, className }: P) => svg(size, className, <path d="M6 6l12 12M18 6 6 18" />);
export const IconUp = ({ size = 20, className }: P) => svg(size, className, <path d="M12 19V5M5 12l7-7 7 7" />);
export const IconCoin = ({ size = 20, className }: P) => svg(size, className, <><circle cx={12} cy={12} r={9} /><path d="M9 12h6M12 9v6" /></>);
export const IconGear = ({ size = 20, className }: P) => svg(size, className, <>
  <circle cx={12} cy={12} r={3} /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
</>);
export const IconBook = ({ size = 20, className }: P) => svg(size, className, <><path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z" /><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7Z" /></>);
export const IconHome = ({ size = 20, className }: P) => svg(size, className, <path d="M3 11 12 3l9 8v10H15v-6H9v6H3Z" />);
export const IconRestart = ({ size = 20, className }: P) => svg(size, className, <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /></>);
export const IconTarget = ({ size = 20, className }: P) => svg(size, className, <><circle cx={12} cy={12} r={8} /><circle cx={12} cy={12} r={3} /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></>);
