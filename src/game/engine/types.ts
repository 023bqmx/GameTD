// Pure game-logic types. Nothing here knows about Phaser or React.

export type TowerType = 'pulse' | 'arc' | 'cryo' | 'mortar' | 'beacon';
export type EnemyType = 'crawler' | 'runner' | 'brute' | 'guardian' | 'overlord';
export type TargetMode = 'first' | 'last' | 'strong' | 'near';
export type Phase = 'prep' | 'wave' | 'victory' | 'defeat';

export interface Vec { x: number; y: number }
export interface Cell { c: number; r: number }

export interface TowerLevel {
  cost: number;          // build cost (level 0) or upgrade cost (level 1, 2)
  damage: number;
  rate: number;          // attacks per second
  range: number;         // in grid cells
  chains?: number;       // arc: max targets
  chainFalloff?: number; // arc: damage multiplier per jump
  slow?: number;         // cryo: speed multiplier while slowed
  slowDuration?: number;
  splash?: number;       // radius in cells
  buff?: number;         // beacon: attack-speed multiplier
}

export type AttackKind = 'projectile' | 'chain' | 'lob' | 'aura';

export interface TowerDef {
  type: TowerType;
  name: string;
  nameTh: string;
  role: string;
  description: string;
  color: string;
  attack: AttackKind;
  armorPierce: number; // 0..1, fraction of armor ignored
  projectileSpeed: number;
  levels: TowerLevel[];
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  nameTh: string;
  description: string;
  hp: number;
  speed: number;       // cells per second
  armor: number;       // 0..1 damage reduction
  reward: number;
  coreDamage: number;
  size: number;        // visual size in cells
  boss?: boolean;
  aura?: { radius: number; reduction: number };
  summon?: { every: number; type: EnemyType; count: number };
}

export interface Enemy {
  id: number;
  type: EnemyType;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  dist: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  slowFactor: number;
  slowTime: number;
  stunTime: number;
  summonTimer: number;
  alive: boolean;
  shielded: boolean;
}

export interface Tower {
  id: number;
  type: TowerType;
  level: number; // 0..2
  c: number;
  r: number;
  x: number;
  y: number;
  cooldown: number;
  mode: TargetMode;
  spent: number;
  buff: number;
  aimX: number;
  aimY: number;
  kills: number;
  damageDealt: number;
}

export interface Projectile {
  id: number;
  kind: 'pulse' | 'cryo' | 'mortar';
  towerId: number;
  level: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  targetId: number;
  speed: number;
  damage: number;
  splash: number;
  slow: number;
  slowDuration: number;
  pierce: number;
  t: number;
  flight: number;
  height: number; // visual arc height for mortar (cells)
}

export interface WaveGroup { type: EnemyType; count: number; interval: number; delay: number }
export interface WaveDef { groups: WaveGroup[]; name: string }

export type GameEvent =
  | { type: 'spawn'; enemyId: number; enemyType: EnemyType; x: number; y: number }
  | { type: 'fire'; towerId: number; towerType: TowerType; x: number; y: number; tx: number; ty: number }
  | { type: 'hit'; enemyId: number; x: number; y: number; kind: 'pulse' | 'cryo' }
  | { type: 'chain'; points: Vec[]; level: number }
  | { type: 'explode'; x: number; y: number; radius: number; kind: 'mortar' | 'cryo' }
  | { type: 'kill'; enemyId: number; enemyType: EnemyType; x: number; y: number; reward: number }
  | { type: 'leak'; enemyId: number; damage: number }
  | { type: 'build'; towerId: number; towerType: TowerType }
  | { type: 'upgrade'; towerId: number; level: number }
  | { type: 'sell'; towerId: number; x: number; y: number; refund: number }
  | { type: 'surge'; x: number; y: number; radius: number }
  | { type: 'summon'; x: number; y: number }
  | { type: 'waveStart'; wave: number; boss: boolean }
  | { type: 'waveClear'; wave: number; bonus: number }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface GameStats {
  kills: number;
  energySpent: number;
  energyEarned: number;
  leaks: number;
  surgeUses: number;
  towersBuilt: number;
  elapsed: number;
}
