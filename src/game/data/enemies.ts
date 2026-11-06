import type { EnemyDef, EnemyType } from '../engine/types';

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  crawler: {
    type: 'crawler', name: 'Void Crawler', nameTh: 'ตัวคลานแห่งความว่าง',
    description: 'ศัตรูพื้นฐาน ความเร็วและพลังชีวิตปานกลาง',
    hp: 78, speed: 1.0, armor: 0, reward: 7, coreDamage: 1, size: 0.55,
  },
  runner: {
    type: 'runner', name: 'Void Runner', nameTh: 'นักวิ่งความว่าง',
    description: 'เคลื่อนที่เร็วมาก แต่พลังชีวิตต่ำ',
    hp: 38, speed: 1.9, armor: 0, reward: 5, coreDamage: 1, size: 0.46,
  },
  brute: {
    type: 'brute', name: 'Void Brute', nameTh: 'ยักษ์ความว่าง',
    description: 'เกราะหนา พลังชีวิตสูง แต่เดินช้า',
    hp: 360, speed: 0.6, armor: 0.2, reward: 16, coreDamage: 2, size: 0.78,
  },
  guardian: {
    type: 'guardian', name: 'Void Guardian', nameTh: 'ผู้พิทักษ์ความว่าง',
    description: 'เกราะ 45% และกางโล่ลดความเสียหายให้พวกที่อยู่ใกล้ 20%',
    hp: 210, speed: 0.8, armor: 0.45, reward: 14, coreDamage: 2, size: 0.7,
    aura: { radius: 1.3, reduction: 0.2 },
  },
  overlord: {
    type: 'overlord', name: 'Void Overlord', nameTh: 'จอมราชันความว่าง',
    description: 'บอสยักษ์ พลังชีวิตมหาศาล เรียก Runner ออกมาเรื่อย ๆ หากถึงแกนพลังงานจะทำความเสียหาย 12 หน่วย',
    hp: 5400, speed: 0.36, armor: 0.25, reward: 300, coreDamage: 12, size: 1.45, boss: true,
    summon: { every: 7, type: 'runner', count: 3 },
  },
};

export const ENEMY_ORDER: EnemyType[] = ['crawler', 'runner', 'brute', 'guardian', 'overlord'];
