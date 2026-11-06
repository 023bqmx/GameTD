import { Engine } from '../src/game/engine/Engine';
import { PADS, PATH_CELLS } from '../src/game/data/map';
import { TOWERS } from '../src/game/data/towers';
import { pathPoint, PATH_LENGTH } from '../src/game/engine/Engine';
import type { TowerType } from '../src/game/engine/types';

function coverage(c:number,r:number,range:number){let n=0;for(let d=0;d<PATH_LENGTH;d+=0.25){const p=pathPoint(d);if(Math.hypot(p.x-c-0.5,p.y-r-0.5)<=range)n++;}return n;}
let VERB=false;
function run(strategy: TowerType[], skill: number, label: string, rnd=false){
  const e = new Engine();
  let seed=7;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;const pads=rnd?[...PADS].sort(()=>R()-0.5):[...PADS].sort((a,b)=>coverage(b.c,b.r,2.4)-coverage(a.c,a.r,2.4));
  let i=0; let steps=0;
  const spend=()=>{
    for(let k=0;k<20;k++){
      // upgrade if cheaper path else build
      const want=strategy[i%strategy.length];
      const up=e.towers.filter(t=>e.upgradeCost(t)!==null).sort((a,b)=>a.level-b.level)[0];
      if(e.towers.length>=skill && up){ if(e.energy>=e.upgradeCost(up)!){e.upgrade(up.id);continue;} else break; }
      const pad=pads.find(p=>!e.towerAt(p.c,p.r));
      if(pad && e.energy>=TOWERS[want].levels[0].cost){e.build(want,pad.c,pad.r);i++;continue;}
      break;
    }
  };
  while(!e.isOver && steps<200000){
    spend();
    if(e.canStartWave && (e.intermission===null)) e.startWave();
    if(e.surgeCooldown===0 && e.enemies.length>8){const t=e.enemies.reduce((a,b)=>a.dist>b.dist?a:b);e.castSurge(t.x,t.y);}
    e.step(1/30); for(const ev of e.drainEvents()){ if(ev.type==='leak') console.log('  leak w',e.wave,'dmg',ev.damage,'hp',e.coreHp, e.enemies.find(x=>x.def.boss)? 'bossHP '+Math.round(e.enemies.find(x=>x.def.boss)!.hp):''); if(ev.type==='waveClear' && VERB) console.log('  clear',ev.wave,'hp',e.coreHp,'energy',Math.round(e.energy),'towers',e.towers.length, 'lv', e.towers.map(t=>t.level).join(''));} steps++;
  }
  console.log(label.padEnd(28), e.phase, 'wave',e.wave,'hp',e.coreHp,'kills',e.stats.kills,'towers',e.towers.length,'stars',e.stars(),'score',e.score());
}
console.log('pads',PADS.length,'pathcells',PATH_CELLS.size,'len',PATH_LENGTH.toFixed(1));
VERB=false;run(['pulse','arc','cryo','mortar','beacon'],6,'mixed 6 verbose');VERB=false;
run(['pulse'],6,'pulse only, few towers');
run(['pulse'],10,'pulse spam');
run(['pulse','arc','cryo','mortar','beacon'],6,'mixed 6');
run(['pulse','cryo','mortar','arc','pulse','beacon'],9,'mixed 9');
run(['pulse','pulse','arc','cryo','mortar','mortar','beacon'],12,'mixed 12');
run(['mortar','arc','cryo'],8,'aoe 8');

run(['pulse','arc','cryo','mortar','beacon'],6,'RANDOM mixed 6',true);run(['pulse','cryo','mortar'],9,'RANDOM 9',true);run(['pulse'],5,'RANDOM pulse 5',true);
