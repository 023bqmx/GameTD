# AETHERKEEP: ผู้พิทักษ์แกนฟ้า

เกม Tower Defense แนว Fantasy Sci-fi / Cyberpunk — React + TypeScript + Vite + Phaser 3
กราฟิกทั้งหมดวาดด้วยโค้ด (Canvas 2D → Phaser texture) ไม่ต้องใช้ไฟล์ภาพหรือเสียงภายนอก

## เริ่มใช้งาน
```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm run build    # ไฟล์พร้อม deploy อยู่ใน dist/
```

## โครงสร้าง
```
src/
  game/
    engine/     Engine.ts, types.ts   ← Logic ล้วน ไม่รู้จัก Phaser/React (ทดสอบแบบ headless ได้)
    data/       towers.ts enemies.ts waves.ts map.ts   ← ค่าทั้งหมดแบบ data-driven
    render/     BattleScene.ts (Phaser), art.ts (วาดสไปรต์), createGame.ts
    audio/      Sfx.ts (Web Audio synth)
  state/        GameController.ts (สะพานเชื่อม Engine ↔ Phaser ↔ React), appStore.ts, persist.ts (LocalStorage)
  ui/           หน้าจอ React: MainMenu, Hud, ActionBar, TowerCards, TowerInfo, PauseMenu, ResultScreen, Modals
tests/sim.ts    บอทเล่นอัตโนมัติสำหรับปรับสมดุล
```

## เพิ่มป้อมใหม่
1. เพิ่ม type ใน `engine/types.ts` (`TowerType`)
2. เพิ่มข้อมูลใน `data/towers.ts` และใส่ลงใน `TOWER_ORDER`
3. เพิ่มการวาดใน `render/art.ts` (`drawTurret`, สี `TOWER_COLORS`)
4. ถ้าเป็นรูปแบบโจมตีใหม่ เพิ่ม branch ใน `Engine.fire()`

## เพิ่มศัตรูใหม่
เพิ่มใน `EnemyType`, `data/enemies.ts`, `ENEMY_TEX` + `drawEnemy` ใน `art.ts` แล้วใส่ลงใน Wave ที่ `data/waves.ts`

## Responsive
- จอกว้าง (สัดส่วน > 1.12): แผงควบคุมด้านขวา / จอแคบ: แผงด้านล่างความสูงคงที่ ไม่บังสนาม
- สนามสลับเป็นแนวนอน 16×9 หรือแนวตั้ง 9×16 อัตโนมัติตามพื้นที่ โดย Logic ใช้พิกัดเดียวกัน ตำแหน่งวัตถุจึงไม่เพี้ยนเมื่อหมุนจอ

## ปุ่มลัด
`1–5` เลือกป้อม · `Space` เริ่ม Wave · `Q` Surge · `U` อัปเกรด · `S` ขาย · `T` โหมดเล็ง · `F` 1x/2x · `P/Esc` หยุด
