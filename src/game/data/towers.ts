import type { TowerDef, TowerType } from '../engine/types';

// Data-driven tower catalogue. To add a tower: add an entry here, a draw
// function in render/art.ts, and (if it needs a new attack kind) a branch in Engine.fire().
export const TOWERS: Record<TowerType, TowerDef> = {
  pulse: {
    type: 'pulse',
    name: 'Pulse Cannon',
    nameTh: 'ปืนพัลส์',
    role: 'โจมตีเดี่ยว',
    description: 'ยิงกระสุนพลังงานรัวเร็ว ความเสียหายปานกลาง เหมาะเป็นป้อมหลักทุกจุด',
    color: '#3ef0ff',
    attack: 'projectile',
    armorPierce: 0,
    projectileSpeed: 10,
    levels: [
      { cost: 60, damage: 13, rate: 2.4, range: 2.3 },
      { cost: 75, damage: 23, rate: 2.9, range: 2.5 },
      { cost: 130, damage: 40, rate: 3.4, range: 2.8 },
    ],
  },
  arc: {
    type: 'arc',
    name: 'Arc Tower',
    nameTh: 'หอสายฟ้า',
    role: 'สายฟ้าลูกโซ่',
    description: 'ปล่อยสายฟ้ากระโดดต่อเนื่องหลายเป้าหมาย ทะลุเกราะได้ครึ่งหนึ่ง',
    color: '#b78cff',
    attack: 'chain',
    armorPierce: 0.5,
    projectileSpeed: 0,
    levels: [
      { cost: 100, damage: 22, rate: 0.9, range: 2.2, chains: 3, chainFalloff: 0.78 },
      { cost: 130, damage: 36, rate: 1.0, range: 2.4, chains: 4, chainFalloff: 0.8 },
      { cost: 190, damage: 58, rate: 1.15, range: 2.6, chains: 6, chainFalloff: 0.82 },
    ],
  },
  cryo: {
    type: 'cryo',
    name: 'Cryo Tower',
    nameTh: 'หอเยือกแข็ง',
    role: 'ชะลอศัตรู',
    description: 'ยิงผลึกน้ำแข็งลดความเร็วศัตรู ระดับสูงแช่แข็งเป็นวงกว้าง',
    color: '#8fe8ff',
    attack: 'projectile',
    armorPierce: 0,
    projectileSpeed: 8,
    levels: [
      { cost: 80, damage: 6, rate: 1.4, range: 2.2, slow: 0.55, slowDuration: 1.6, splash: 0 },
      { cost: 90, damage: 10, rate: 1.5, range: 2.4, slow: 0.45, slowDuration: 2.0, splash: 0.7 },
      { cost: 140, damage: 16, rate: 1.6, range: 2.6, slow: 0.35, slowDuration: 2.4, splash: 1.05 },
    ],
  },
  mortar: {
    type: 'mortar',
    name: 'Solar Mortar',
    nameTh: 'ปืนครกสุริยะ',
    role: 'ระเบิดวงกว้าง',
    description: 'ยิงลูกระเบิดสุริยะโค้งข้ามสนาม สร้างความเสียหายรุนแรงเป็นวงกว้าง',
    color: '#ffc14d',
    attack: 'lob',
    armorPierce: 0.2,
    projectileSpeed: 0,
    levels: [
      { cost: 130, damage: 45, rate: 0.55, range: 3.2, splash: 0.95 },
      { cost: 150, damage: 76, rate: 0.6, range: 3.5, splash: 1.1 },
      { cost: 220, damage: 122, rate: 0.66, range: 3.8, splash: 1.35 },
    ],
  },
  beacon: {
    type: 'beacon',
    name: 'Aether Beacon',
    nameTh: 'ประภาคารอีเธอร์',
    role: 'สนับสนุน',
    description: 'ไม่โจมตีเอง แต่เร่งความเร็วโจมตีให้ป้อมทุกป้อมที่อยู่ในรัศมี',
    color: '#ffd76a',
    attack: 'aura',
    armorPierce: 0,
    projectileSpeed: 0,
    levels: [
      { cost: 120, damage: 0, rate: 0, range: 1.6, buff: 1.2 },
      { cost: 120, damage: 0, rate: 0, range: 1.9, buff: 1.32 },
      { cost: 180, damage: 0, rate: 0, range: 2.2, buff: 1.45 },
    ],
  },
};

export const TOWER_ORDER: TowerType[] = ['pulse', 'arc', 'cryo', 'mortar', 'beacon'];
export const SELL_RATIO = 0.7;
export const MAX_LEVEL = 3;
