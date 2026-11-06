import type { WaveDef } from '../engine/types';

// Level 1 – "Skyreach Outskirts". 10 waves, wave 10 is the boss fight.
export const WAVES: WaveDef[] = [
  { name: 'รอยแยกแรก', groups: [{ type: 'crawler', count: 8, interval: 1.1, delay: 0 }] },
  { name: 'ฝูงคลาน', groups: [{ type: 'crawler', count: 13, interval: 0.8, delay: 0 }] },
  {
    name: 'นักวิ่งเงา', groups: [
      { type: 'crawler', count: 8, interval: 0.9, delay: 0 },
      { type: 'runner', count: 8, interval: 0.55, delay: 6 },
    ],
  },
  {
    name: 'เสียงฝีเท้ายักษ์', groups: [
      { type: 'crawler', count: 12, interval: 0.8, delay: 0 },
      { type: 'brute', count: 3, interval: 3.5, delay: 4 },
    ],
  },
  {
    name: 'กระแสเร่งรีบ', groups: [
      { type: 'runner', count: 14, interval: 0.45, delay: 0 },
      { type: 'brute', count: 4, interval: 3, delay: 5 },
      { type: 'crawler', count: 10, interval: 0.7, delay: 9 },
    ],
  },
  {
    name: 'กำแพงโล่', groups: [
      { type: 'guardian', count: 6, interval: 2.2, delay: 0 },
      { type: 'crawler', count: 16, interval: 0.6, delay: 1 },
    ],
  },
  {
    name: 'พายุความว่าง', groups: [
      { type: 'runner', count: 20, interval: 0.4, delay: 0 },
      { type: 'brute', count: 6, interval: 2.4, delay: 3 },
      { type: 'guardian', count: 3, interval: 3, delay: 8 },
    ],
  },
  {
    name: 'ทัพหุ้มเกราะ', groups: [
      { type: 'guardian', count: 8, interval: 1.8, delay: 0 },
      { type: 'brute', count: 7, interval: 2.2, delay: 2 },
      { type: 'crawler', count: 16, interval: 0.5, delay: 6 },
    ],
  },
  {
    name: 'ก่อนพายุใหญ่', groups: [
      { type: 'runner', count: 24, interval: 0.35, delay: 0 },
      { type: 'guardian', count: 9, interval: 1.6, delay: 2 },
      { type: 'brute', count: 9, interval: 1.8, delay: 6 },
    ],
  },
  {
    name: 'จอมราชันตื่น', groups: [
      { type: 'crawler', count: 14, interval: 0.5, delay: 0 },
      { type: 'guardian', count: 6, interval: 1.6, delay: 4 },
      { type: 'overlord', count: 1, interval: 1, delay: 10 },
      { type: 'brute', count: 6, interval: 2.5, delay: 14 },
    ],
  },
];

/** HP multiplier applied to every enemy in a wave (1-based wave number). */
export const waveHpScale = (wave: number) => 1 + 0.17 * (wave - 1);

export const START_ENERGY = 230;
export const CORE_HP = 20;
export const INTERMISSION = 22; // seconds before the next wave auto-starts
export const waveClearBonus = (wave: number) => 20 + wave * 5;

export const SURGE = { damage: 320, radius: 2.4, cooldown: 40, stun: 1.2, bossStun: 0.35 };
