'use strict';

/* ===================== v2.14 STAFF SYSTEM =====================
   Roles, candidates, wages, training, assignment, fatigue.
   Existing managers migrate to founding foremen (wage waived).
   Legacy mgrSpd/mgrIn/mgrOut/mgrSto/mgrOrders stay authoritative for
   founding foremen via S.mgr; new hires add staff* bonuses on top. */

/* v2.23: per-skill effects in one table (was 1–4% per skill, so a training level looked like nothing).
   p = bonus per skill level; cap = team-wide (or per-building for mill/engineer) ceiling. */
const STAFF_FX={
  lumberjack:{p:.03,cap:.6}, driver:{p:.04,cap:.75}, mill:{p:.05,cap:.6}, engineer:{p:.03,cap:.4,fire:.02,fcap:.4},
  forklift:{p:.05,cap:.8}, dock:{p:.015,cap:.25,tp:.03,tcap:.5}, firefighter:{p:.04,cap:.6,dl:.5,dcap:8},
};
const _pc=x=>{const v=Math.round(x*1000)/10;return (v%1?v.toFixed(1):String(v));};
const STAFF_ROLES={
  lumberjack:{id:'lumberjack',n:'Lumberjack',e:'🪓',area:'forest',auto:true,
    effect:(sk)=>`+${_pc(sk*STAFF_FX.lumberjack.p)}% chop / collector output`},
  driver:{id:'driver',n:'Driver',e:'🚛',area:'haul',auto:true,
    effect:(sk)=>`+${_pc(sk*STAFF_FX.driver.p)}% log haul rate`},
  mill:{id:'mill',n:'Mill worker',e:'🏭',area:'building',auto:false,
    effect:(sk)=>`+${_pc(sk*STAFF_FX.mill.p)}% building speed`},
  engineer:{id:'engineer',n:'Engineer',e:'🔧',area:'building',auto:false,
    effect:(sk)=>`−${_pc(sk*STAFF_FX.engineer.p)}% input · −${_pc(sk*STAFF_FX.engineer.fire)}% fire risk`},
  forklift:{id:'forklift',n:'Forklift operator',e:'🚜',area:'shipping',auto:true,
    effect:(sk)=>`+${_pc(sk*STAFF_FX.forklift.p)}% loading · +contract progress`},
  dock:{id:'dock',n:'Dock worker',e:'⚓',area:'shipping',auto:true,
    effect:(sk)=>`+${_pc(sk*STAFF_FX.dock.p)}% export premium · +${_pc(sk*STAFF_FX.dock.tp)}% truck capacity`},
  firefighter:{id:'firefighter',n:'Firefighter',e:'🚒',area:'station',auto:true,
    effect:(sk)=>`faster response · −${_pc(sk*STAFF_FX.firefighter.p)}% fire risk`},
};
const STAFF_ROLE_IDS=Object.keys(STAFF_ROLES);
const STAFF_TRAITS={
  nightowl:{id:'nightowl',n:'Night owl',e:'🦉',d:'+20% effect at night'},
  fastlearner:{id:'fastlearner',n:'Fast learner',e:'📚',d:'Training ×2 speed'},
  steady:{id:'steady',n:'Steady',e:'🧘',d:'No fatigue'},
  localhero:{id:'localhero',n:'Local hero',e:'⭐',d:'+morale (team energy refill +10%)'},
  // Manager skills become traits on founding foremen
  speed:{id:'speed',n:'Pace Setter',e:'⚡',d:'Legacy speed skill (via manager bridge)'},
  double:{id:'double',n:'Lucky Batch',e:'🎲',d:'Legacy double-batch skill'},
  thrift:{id:'thrift',n:'Lean Line',e:'♻️',d:'Legacy thrift skill'},
  storage:{id:'storage',n:'Stock Master',e:'📦',d:'Legacy storage skill'},
  orders:{id:'orders',n:'Client Charmer',e:'🤝',d:'Legacy orders skill'},
  safety:{id:'safety',n:'Fire Marshal',e:'🧯',d:'Legacy safety skill'},
};
const STAFF_NAMES=[
  'Ada Berg','Barış Kılıç','Cemre Arslan','Diego Santos','Elin Norberg','Farah Haddad',
  'Gina Park','Hiro Sato','Ines Vidal','Jonas Meyer','Kira Novak','Leila Rahman',
  'Mateo Cruz','Nora Lind','Omar Farouk','Pia Schulz','Quinn Blake','Ravi Patel',
  'Sena Yılmaz','Theo Blanc','Uma Desai','Viktor Holm','Willa Frost','Xin Chen',
  'Yara Nasser','Zoltan Kovacs','Ayşe Demir','Bruno Costa','Chloe Dubois','Deniz Aksoy',
];
const STAFF_LOOKS=[
  {f:0,skin:0,hair:0,style:'short',beard:1,out:'vest',col:'#e8742a'},
  {f:1,skin:1,hair:1,style:'pony',out:'vest',col:'#3aa0d8'},
  {f:0,skin:2,hair:2,style:'crew',beard:2,out:'vest',col:'#d84a3a'},
  {f:1,skin:0,hair:3,style:'long',out:'suit',col:'#6a3a2a',tie:'#e8c43a'},
  {f:0,skin:5,hair:6,style:'bald',beard:1,out:'vest',col:'#9a6ad8',glasses:1},
  {f:1,skin:3,hair:0,style:'bun',out:'suit',col:'#2a4a5a',tie:'#4ac0a0'},
  {f:0,skin:1,hair:5,style:'short',beard:1,out:'suit',col:'#3a2418',tie:'#d8a930',glasses:1},
  {f:1,skin:2,hair:7,style:'long',out:'suit',col:'#2e2e3a',tie:'#e85a9a'},
];
const STAFF_SKILL_MAX=10;
const STAFF_CAND_MIN=3, STAFF_CAND_MAX=5;
const STAFF_REFRESH=180;      // candidate pool refresh (s)
const STAFF_REROLL_CD=600;    // free reroll cooldown (s)
const STAFF_ENERGY_DRAIN=.08; // /s while working
const STAFF_ENERGY_REFILL=.22;// /s when resting / campfire
const STAFF_FATIGUE_THR=30;   // below this: 80% work
const STAFF_FATIGUE_MULT=.8;
/* v2.15: real campfire breaks. Below STAFF_BREAK_AT energy a worker walks to the campfire and rests (no output) until fully
   rested, then goes back to work at 100%. (v2.14 kept tired workers hovering around 15% at 80% output forever.) */
const STAFF_BREAK_AT=15;
const STAFF_BREAK_REFILL=1.2;  // energy/s at the campfire (Local hero on the team: +10%)
function staffBreakRate(){const t=staffState().team;return STAFF_BREAK_REFILL*(t.some(w=>(w.traits||[]).includes('localhero'))?1.1:1);}
function staffOnBreak(w){return !!(w&&w.brk)&&!(S.prefs&&S.prefs.fatigue===false)&&!(w.traits||[]).includes('steady');}

function staffState(){
  if(!S.staff||typeof S.staff!=='object') S.staff={team:[],candidates:[],nextRefresh:0,nextReroll:0,seq:0,unpaid:false};
  const st=S.staff;
  if(!Array.isArray(st.team)) st.team=[];
  if(!Array.isArray(st.candidates)) st.candidates=[];
  if(typeof st.seq!=='number') st.seq=0;
  if(typeof st.nextRefresh!=='number') st.nextRefresh=0;
  if(typeof st.nextReroll!=='number') st.nextReroll=0;
  if(typeof st.unpaid!=='boolean') st.unpaid=false;
  return st;
}
function staffFresh(){return {team:[],candidates:[],nextRefresh:40,nextReroll:0,seq:0,unpaid:false};}

function staffRarityRoll(){
  const r=Math.random();
  if(r<.02) return 'L';
  if(r<.10) return 'E';
  if(r<.35) return 'R';
  return 'C';
}
function staffTraitRoll(n){
  const pool=['nightowl','fastlearner','steady','localhero'];
  const out=[]; const copy=pool.slice();
  n=Math.max(1,Math.min(2,n|0));
  for(let i=0;i<n&&copy.length;i++){const j=Math.floor(Math.random()*copy.length);out.push(copy.splice(j,1)[0]);}
  return out;
}
function staffNameRoll(used){
  used=used||new Set((S.staff&&S.staff.team||[]).map(w=>w.name).concat((S.staff&&S.staff.candidates||[]).map(c=>c.name)));
  for(let i=0;i<30;i++){const n=STAFF_NAMES[Math.floor(Math.random()*STAFF_NAMES.length)];if(!used.has(n)){used.add(n);return n;}}
  return STAFF_NAMES[Math.floor(Math.random()*STAFF_NAMES.length)]+' '+((S.staff&&S.staff.seq)||0);
}
function staffLookRoll(){return STAFF_LOOKS[Math.floor(Math.random()*STAFF_LOOKS.length)];}

/* v2.23 economy scale. v2.14 – v2.22.1 priced staff in fixed coins (training 40·skill, wage 0.35·skill/s), so after a Replant
   (or ten minutes into any run) they were rounding errors next to a 🪙1M/s income. Staff now scale like the rest of
   Replant 2.0: with the forest value cs() as a floor, and with this run's income once that is larger.
   staffIncRef() = the run's best smoothed income (EMA ~60 s, never drops within a run, resets on Replant).
   staffEco(R0) = max(cs(), income/R0): R0 is the income at which a price starts following income.
     training  40·skill·rarity × staffEco(6)   → ≈ 6.7·skill·rarity seconds of income (floor: 40·skill·rarity·cs)
     wage     0.35·skill·rarity × staffEco(350) → ≈ 0.1%·skill·rarity of income per worker (floor ×cs)
     hiring    25·skill·rarity × staffEco(4)    → ≈ 6·skill·rarity seconds of income */
const STAFF_R0={train:6,wage:350,hire:4}, STAFF_INC_TAU=60;
function staffIncRef(){const r=S&&S.run;return r&&isFinite(r.inc)&&r.inc>0?r.inc:0;}
function staffEco(R0){return Math.max(typeof cs==='function'?cs():1,staffIncRef()/R0);}
function staffIncTick(dt){const r=S&&S.run;if(!r||typeof r!=='object') return;const cr=isFinite(coinRate)?Math.max(0,coinRate):0;
  if(!isFinite(r.incE)) r.incE=0; r.incE+=(cr-r.incE)*Math.min(1,dt/STAFF_INC_TAU); if(!(r.inc>=r.incE)) r.inc=r.incE;}
function staffRm(w){return (RARITY[w&&w.rarity]||RARITY.C).rm;}
function staffWageOf(w){
  if(!w||w.founding) return 0;
  return .35*Math.max(1,w.skill||1)*staffRm(w)*staffEco(STAFF_R0.wage);   // coins/s — skill × rarity × economy
}
function staffHireCostOf(w){return 25*Math.max(1,w.skill||1)*staffRm(w)*staffEco(STAFF_R0.hire);}
function staffTrainCost(w){return 40*Math.max(1,w.skill||1)*staffRm(w)*staffEco(STAFF_R0.train);}
function staffTrainTime(w){return 25+12*Math.max(1,w.skill);}   // seconds; Fast learner halves via tick

function staffEff(w){
  if(!w) return 0;
  if(staffOnBreak(w)) return 0;   // v2.15: resting at the campfire
  let e=1;
  if(staffState().unpaid&&!w.founding) e*=.5;
  const fatigueOn=!(S.prefs&&S.prefs.fatigue===false);
  if(fatigueOn&&!(w.traits||[]).includes('steady')&&(typeof w.energy==='number'?w.energy:100)<STAFF_FATIGUE_THR) e*=STAFF_FATIGUE_MULT;
  if((w.traits||[]).includes('nightowl')&&typeof isNight==='function'&&isNight()) e*=1.2;
  return e;
}
function staffSkillEff(w){return (w.skill||1)*staffEff(w);}

function staffByRole(role){return staffState().team.filter(w=>w.role===role);}
function staffAtBuilding(bid){return staffState().team.filter(w=>(w.role==='mill'||w.role==='engineer')&&w.assign===bid);}
function staffSlots(bid){
  const n=msCount((S.buildings[bid]&&S.buildings[bid].lvl)||0);
  if(n>=4) return 3; if(n>=2) return 2; return 1;
}
function staffSlotUsed(bid){return staffAtBuilding(bid).length;}
function staffCanAssign(w,bid){
  if(!w||(w.role!=='mill'&&w.role!=='engineer')) return false;
  if(!S.buildings[bid]||!S.buildings[bid].lvl) return false;
  if(w.assign===bid) return true;
  const used=staffAtBuilding(bid).filter(x=>x.id!==w.id).length;
  return used<staffSlots(bid);
}

/* ---- effect hooks (modest stacking, founding excluded from mill/eng to avoid double-count with mgr*) ---- */
function staffMillSpd(bid){
  let b=1;
  for(const w of staffAtBuilding(bid)) if(w.role==='mill'&&!w.founding) b+=STAFF_FX.mill.p*staffSkillEff(w);
  return Math.min(1+STAFF_FX.mill.cap,b);   // v2.23: +5%/skill, cap +60%
}
function staffEngIn(bid){
  let cut=0;
  for(const w of staffAtBuilding(bid)) if(w.role==='engineer') cut+=STAFF_FX.engineer.p*staffSkillEff(w);
  return 1-Math.min(STAFF_FX.engineer.cap,cut);
}
function staffEngFire(bid){
  let cut=0;
  for(const w of staffAtBuilding(bid)) if(w.role==='engineer') cut+=STAFF_FX.engineer.fire*staffSkillEff(w);
  return 1-Math.min(STAFF_FX.engineer.fcap,cut);
}
function staffChopBonus(){
  let b=0; for(const w of staffByRole('lumberjack')) b+=STAFF_FX.lumberjack.p*staffSkillEff(w);
  return Math.min(STAFF_FX.lumberjack.cap,b);
}
function staffHaulBonus(){
  let b=0; for(const w of staffByRole('driver')) b+=STAFF_FX.driver.p*staffSkillEff(w);
  return Math.min(STAFF_FX.driver.cap,b);
}
function staffForkBonus(){
  let b=0; for(const w of staffByRole('forklift')) b+=STAFF_FX.forklift.p*staffSkillEff(w);
  return Math.min(STAFF_FX.forklift.cap,b);
}
function staffDockPrem(){
  let b=0; for(const w of staffByRole('dock')) b+=STAFF_FX.dock.p*staffSkillEff(w);
  return Math.min(STAFF_FX.dock.cap,b);
}
function staffDockCap(){
  let b=0; for(const w of staffByRole('dock')) b+=STAFF_FX.dock.tp*staffSkillEff(w);
  return Math.min(STAFF_FX.dock.tcap,b);
}
function staffFireCut(){
  let b=0; for(const w of staffByRole('firefighter')) b+=STAFF_FX.firefighter.p*staffSkillEff(w);
  return Math.min(STAFF_FX.firefighter.cap,b);
}
function staffFireDelayCut(){
  let s=0; for(const w of staffByRole('firefighter')) s+=STAFF_FX.firefighter.dl*staffSkillEff(w);
  return Math.min(STAFF_FX.firefighter.dcap,s);   // seconds shaved off response
}
function staffHiredCount(){
  const n=staffState().team.length;
  const m=Object.keys(S.mgr||{}).length;
  return Math.max(n,m);
}

/* output estimate for profit bar (coins/s attributed to staff) */
function staffOutputRate(){
  let v=0;
  for(const w of staffState().team){
    const e=staffEff(w), sk=w.skill||1;
    const F=STAFF_FX[w.role]||{p:0};   // v2.23: same per-skill numbers as the effects (value share as before)
    if(w.role==='mill'&&w.assign){if(!w.founding){const base=bldValueRate(w.assign)||0; v+=base*F.p*sk*e;}}
    else if(w.role==='engineer'&&w.assign){const base=bldValueRate(w.assign)||0; v+=base*F.p*.5*sk*e;}
    else if(w.role==='lumberjack') v+=(coinRate||0)*F.p*.5*sk*e;
    else if(w.role==='driver') v+=(coinRate||0)*F.p*.3*sk*e;
    else if(w.role==='forklift'||w.role==='dock') v+=(coinRate||0)*F.p*.25*sk*e;
    else if(w.role==='firefighter') v+=(coinRate||0)*F.p*.1*sk*e;
  }
  return v;
}
function staffWageTotal(){let t=0;for(const w of staffState().team) t+=staffWageOf(w);return t;}

/* ---- v2.22.1 hiring limits ----
   v2.14 had no limit at all: every candidate could be hired, forever. Now each role has a cap that grows with the part of
   the factory it works in. Mill workers and engineers share one cap: the open staff slots in your buildings (1 per building,
   2 at ★2 = Lv 25, 3 at ★4 = Lv 100; a founding foreman holds his own slot), so every hire can always get a building.
   Caps never drop: the highest cap reached is remembered (S.staff.capHi), so a Replant (buildings and collectors reset,
   staff stay) never pushes your team over its limits. Founding foremen never count.
   Saves already above a limit (hired before v2.22.1) keep everyone working; only hiring that role is paused until the team
   is under the cap again or the cap grows. A worker can be let go by hand (two taps); nobody is removed automatically. */
let staffCapAcc=1;
const STAFF_DRIVER_MACH=['truck','harvester','drone','heli'];
const STAFF_CAPS={
  lumberjack:{k:'lumberjack',n:'Lumberjacks',e:'🪓',why:'+1 per collector type you own (Crew)'},
  driver:{k:'driver',n:'Drivers',e:'🚛',why:'+1 per machine type: truck, harvester, drone, helicopter'},
  crew:{k:'crew',n:'Mill crew',e:'🏭',why:'one per open building slot (★2 and ★4 add a slot)'},
  forklift:{k:'forklift',n:'Forklift operators',e:'🚜',why:'one per forklift (Shipping · Forklift Fleet)'},
  dock:{k:'dock',n:'Dock workers',e:'⚓',why:'1 + one per loading bay (Dock Lv 4 and Lv 8 add bays)'},
  firefighter:{k:'firefighter',n:'Firefighters',e:'🚒',why:'1 + your Fire Station level'},
};
const STAFF_CAP_KEYS=Object.keys(STAFF_CAPS);
function staffCapKey(role){return role==='mill'||role==='engineer'?'crew':role;}
function staffCapNow(k){
  const own=id=>((S.collectors&&S.collectors[id])|0)>0;
  if(k==='lumberjack') return 2+COLLECTORS.filter(c=>own(c.id)).length;
  if(k==='driver') return 1+STAFF_DRIVER_MACH.filter(own).length;
  if(k==='crew'){let n=0;const team=staffState().team;
    for(const b of BUILDINGS){if(!S.buildings[b.id]||!S.buildings[b.id].lvl) continue;
      let f=0;for(const w of team) if(w.founding&&w.assign===b.id&&(w.role==='mill'||w.role==='engineer')) f++;
      n+=Math.max(0,staffSlots(b.id)-f);}
    return n;}
  if(k==='forklift') return (S.ship&&S.ship.fork)|0||2;
  if(k==='dock') return 1+(typeof shBays==='function'&&S.ship?shBays():1);
  if(k==='firefighter') return 1+(typeof stationLvl==='function'?stationLvl():0);
  return 0;
}
function staffCap(k){
  const st=staffState(); if(!st.capHi||typeof st.capHi!=='object') st.capHi={};
  const n=staffCapNow(k); if(!(st.capHi[k]>=n)) st.capHi[k]=n;
  return st.capHi[k];
}
function staffCapCount(k){let n=0;for(const w of staffState().team) if(!w.founding&&staffCapKey(w.role)===k) n++;return n;}
function staffCapRoom(role){const k=staffCapKey(role);return staffCap(k)-staffCapCount(k);}
function staffCapsAll(){return STAFF_CAP_KEYS.map(k=>{const cap=staffCap(k),n=staffCapCount(k);return {k,n,cap,over:Math.max(0,n-cap),full:n>=cap};});}
function staffOverCap(){return staffCapsAll().filter(c=>c.over>0);}
/* let a (non-founding) worker go by hand: no refund, wage stops */
function staffLetGo(wid){
  const st=staffState(), i=st.team.findIndex(x=>x.id===wid); if(i<0) return false;
  const w=st.team[i]; if(w.founding) return false;
  st.team.splice(i,1); M=computeMods(); staffSig=''; bpSig='';
  toast(`👋 <b>${w.name}</b> left the team · wage 🪙 ${fr(staffWageOf(w))}/s saved`);
  return true;
}

/* ---- candidates ---- */
function staffMakeCandidate(forced){
  // v2.22.1: roll roles that still have room under their hiring limit (any role if all are full)
  const open=STAFF_ROLE_IDS.filter(r=>staffCapRoom(r)>0), pool=open.length?open:STAFF_ROLE_IDS;
  const role=forced&&forced.role||pool[Math.floor(Math.random()*pool.length)];
  const rarity=forced&&forced.rarity||staffRarityRoll();
  const skill=forced&&forced.skill||(1+Math.floor(Math.random()*(rarity==='L'?5:rarity==='E'?4:rarity==='R'?3:2)));
  const traits=forced&&forced.traits||staffTraitRoll(Math.random()<.35?2:1);
  const st=staffState();
  const id='c'+(++st.seq);
  return {id,name:staffNameRoll(),role,skill:Math.min(5,skill),rarity,traits,look:staffLookRoll()};
}
function staffRefreshCandidates(force){
  const st=staffState();
  const n=STAFF_CAND_MIN+Math.floor(Math.random()*(STAFF_CAND_MAX-STAFF_CAND_MIN+1));
  st.candidates=[];
  for(let i=0;i<n;i++) st.candidates.push(staffMakeCandidate());
  st.nextRefresh=(S.time||0)+STAFF_REFRESH;
  if(force) st.nextReroll=(S.time||0)+STAFF_REROLL_CD;
  staffSig='';
}
function staffRerollFree(){
  const st=staffState();
  if((S.time||0)<(st.nextReroll||0)) return false;
  staffRefreshCandidates(true);
  toast('🔄 Candidate pool refreshed');
  return true;
}
function staffHireCandidate(cid){
  const st=staffState();
  const i=st.candidates.findIndex(c=>c.id===cid);
  if(i<0) return false;
  const c=st.candidates[i];
  // v2.22.1: hiring limits (per role; mill workers + engineers share the open building slots)
  if(staffCapRoom(c.role)<=0){const k=staffCapKey(c.role),d=STAFF_CAPS[k];
    toast(`🔒 <b>${d.n}</b> are at the limit (${staffCapCount(k)}/${staffCap(k)}). ${d.why[0].toUpperCase()+d.why.slice(1)}.`,3800); return false;}
  const cost=staffHireCostOf({skill:c.skill,rarity:c.rarity,founding:false});
  if(S.coins+1e-9<cost) return false;
  S.coins-=cost;
  st.candidates.splice(i,1);
  const w={id:'w'+(++st.seq),name:c.name,role:c.role,skill:c.skill,rarity:c.rarity,traits:(c.traits||[]).slice(),
    assign:null,energy:100,brk:false,founding:false,train:null,look:c.look};
  // auto-assign area roles; mill/engineer wait for assignment
  if(STAFF_ROLES[w.role]&&STAFF_ROLES[w.role].auto) w.assign=STAFF_ROLES[w.role].area;
  st.team.push(w);
  M=computeMods(); sfx('unlock'); staffSig='';
  toast(`${STAFF_ROLES[w.role].e} <b>${w.name}</b> hired · ${STAFF_ROLES[w.role].n} (skill ${w.skill}) · wage 🪙 ${fr(staffWageOf(w))}/s`,3800,'ms-toast');
  checkAch&&checkAch();
  return true;
}

function staffAssign(wid,bid){
  const w=staffState().team.find(x=>x.id===wid);
  if(!w||!staffCanAssign(w,bid)) return false;
  w.assign=bid; M=computeMods(); staffSig='';bpSig='';
  toast(`${STAFF_ROLES[w.role].e} <b>${w.name}</b> → ${BMAP[bid].name}`);
  return true;
}
function staffUnassign(wid){
  const w=staffState().team.find(x=>x.id===wid);
  if(!w||(w.role!=='mill'&&w.role!=='engineer')) return false;
  w.assign=null; M=computeMods(); staffSig=''; return true;
}

function staffStartTrain(wid){
  const w=staffState().team.find(x=>x.id===wid);
  if(!w||w.train||(w.skill||1)>=STAFF_SKILL_MAX) return false;
  const cost=staffTrainCost(w), t=staffTrainTime(w);
  if(S.coins+1e-9<cost) return false;
  S.coins-=cost;
  w.train={left:t,total:t,to:(w.skill||1)+1};
  staffSig=''; sfx('buy');
  toast(`🎓 <b>${w.name}</b> started training → skill ${w.train.to} (${fmtTime(t)})`);
  return true;
}

/* v2.23: what the next training level actually adds (team caps included), for cards and the Train-all sheet */
function staffFxNow(w){const F=STAFF_FX[w.role];if(!F) return 0;
  if(w.role==='mill') return w.founding?0:staffMillSpd(w.assign)-1;
  if(w.role==='engineer') return w.assign?1-staffEngIn(w.assign):0;
  return {lumberjack:staffChopBonus,driver:staffHaulBonus,forklift:staffForkBonus,dock:staffDockPrem,firefighter:staffFireCut}[w.role]();}
function staffTrainGain(w){
  const F=STAFF_FX[w.role]||{p:0},sk=w.skill||1,nx=Math.min(STAFF_SKILL_MAX,sk+1);
  if(w.founding&&w.role==='mill'){return {own:'',delta:0,v:0,capped:false,txt:'Foreman: training raises his legacy skill level'};}
  const placed=!((w.role==='mill'||w.role==='engineer')&&!w.assign);
  const a=staffFxNow(w); w.skill=nx; const b=staffFxNow(w); w.skill=sk; const d=Math.max(0,b-a);
  const own=`${_pc(F.p*sk)}% → ${_pc(F.p*nx)}%`;
  const cap=STAFF_FX[w.role].cap, capped=placed&&d<1e-9;
  let v=0;if(placed&&d>0){const cr=coinRate||0;
    v=w.role==='mill'?(bldValueRate(w.assign)||0)*d/Math.max(1e-9,1+a):w.role==='engineer'?(bldValueRate(w.assign)||0)*d*.5:
      cr*d/(1+a)*({lumberjack:.5,driver:.3,forklift:.25,dock:.25,firefighter:.1}[w.role]||0);}
  const what={lumberjack:'chop / collector output',driver:'log haul',mill:w.assign&&BMAP[w.assign]?BMAP[w.assign].name+' speed':'building speed',
    engineer:'input saved'+(w.assign&&BMAP[w.assign]?' at the '+BMAP[w.assign].name:''),forklift:'loading',dock:'export premium',firefighter:'fire risk cut'}[w.role]||'';
  const txt=!placed?`+${_pc(F.p)}% per level once assigned`:capped?`team bonus is at its +${_pc(cap)}% cap`:`+${_pc(d)}% ${what}${v>=.05?` ≈ +🪙${fr(v)}/s`:''}`;
  return {own,delta:d,v,capped,txt};}
function staffTrainable(w){return w&&!w.train&&(w.skill||1)<STAFF_SKILL_MAX;}
/* Train all: every staff member you can afford, cheapest first (stops at the first one the coins don't cover) */
function staffTrainAllPlan(){
  const L=staffState().team.filter(staffTrainable).map(w=>({w,c:staffTrainCost(w)})).sort((a,b)=>a.c-b.c);
  const out=[];let sum=0;for(const x of L){if(sum+x.c>S.coins+1e-9) break;sum+=x.c;out.push(x);}
  return {list:out,cost:sum,n:out.length,all:L.length,next:L[out.length]||null};}
/* ids/shown: the confirm sheet passes who it listed and the total it showed; if prices rose since (income reference grew),
   nothing is charged and the caller re-shows the sheet (never charge more than the player saw) */
function staffTrainAll(ids,shown){
  let P=staffTrainAllPlan();
  if(ids){const set=new Set(ids);const L=staffState().team.filter(w=>set.has(w.id)&&staffTrainable(w)).map(w=>({w,c:staffTrainCost(w)}));
    const cost=L.reduce((a,x)=>a+x.c,0);if(shown!==undefined&&cost>shown*(1+1e-9)+1e-6||cost>S.coins+1e-9) return {n:0,spent:0,changed:true};P={list:L,cost};}
  let n=0,spent=0;
  for(const {w} of P.list){const c=staffTrainCost(w);if(S.coins+1e-9<c) break;S.coins-=c;spent+=c;const t=staffTrainTime(w);w.train={left:t,total:t,to:(w.skill||1)+1};n++;}
  if(n){staffSig='';sfx('buy');toast(`🎓 <b>${n}</b> staff started training · 🪙 ${fmt(spent)}`);}
  return {n,spent};}

/* ---- migrate managers → founding foremen ---- */
function staffMigrateFromMgr(o){
  o=o||S;
  if(!o.staff||typeof o.staff!=='object') o.staff=staffFresh();
  if(!Array.isArray(o.staff.team)) o.staff.team=[];
  if(!o.mgr||typeof o.mgr!=='object') return o;
  const have=new Set(o.staff.team.filter(w=>w.mgrId).map(w=>w.mgrId));
  for(const m of MANAGERS){
    const lvl=o.mgr[m.id]|0; if(!lvl||have.has(m.id)) continue;
    const skill=Math.min(5,Math.ceil(lvl/2));
    // Legendary/Epic Foreman: bump Common/Rare founding to at least Epic presentation
    let rarity=m.r; if(rarity==='C'||rarity==='R') rarity=lvl>=6?'L':'E';
    o.staff.seq=(o.staff.seq||0)+1;
    o.staff.team.push({
      id:'w'+o.staff.seq, name:m.name, role:'mill', skill, rarity, traits:[m.skill,'steady'],
      assign:m.bid, energy:100, founding:true, mgrId:m.id, train:null, look:m.look,
      from:m.from, title:'Foreman',
    });
  }
  return o;
}

/* ---- tick: wages, fatigue, training, candidate refresh ---- */
function staffTick(dt,offline){
  const st=staffState();
  staffIncTick(dt);   // v2.23: this run's income reference for staff prices
  // keep the candidate pool warm even with an empty team, but skip wage/fatigue work when idle
  if(!st.candidates.length&&(S.time||0)>=10) staffRefreshCandidates(false);
  else if((S.time||0)>=(st.nextRefresh||0)) staffRefreshCandidates(false);
  if(!st.team.length){st.unpaid=false;return;}
  // v2.22.1: remember the highest caps (about once a second) and tell an over-cap save once, gently
  staffCapAcc+=dt; if(!offline&&staffCapAcc>=1){staffCapAcc=0;const over=staffOverCap();
    if(over.length&&!st.capNoted){st.capNoted=1;const n=over.reduce((a,c)=>a+c.over,0);
      toast(`👥 Team limits are new in v${VERSION}: <b>${n} of your staff</b> are above a limit. Everyone stays and keeps working; hiring for ${over.map(c=>STAFF_CAPS[c.k].n).join(', ')} is paused until there's room.`,6500,'ms-toast');}}

  // wages
  const wage=staffWageTotal();
  if(wage>0){
    const pay=wage*dt;
    if(S.coins>=pay){S.coins-=pay; st.unpaid=false;}
    else {S.coins=Math.max(0,S.coins-S.coins); st.unpaid=true;}  // drain what's left, flag unpaid
  } else st.unpaid=false;

  const fatigueOn=!(S.prefs&&S.prefs.fatigue===false);
  const hero=st.team.some(w=>(w.traits||[]).includes('localhero'));
  const refill=STAFF_ENERGY_REFILL*(hero?1.1:1);

  for(const w of st.team){
    // training (offline counts)
    if(w.train){
      let spd=1; if((w.traits||[]).includes('fastlearner')) spd=2;
      w.train.left-=dt*spd;
      if(w.train.left<=0){
        w.skill=Math.min(STAFF_SKILL_MAX,w.train.to||((w.skill||1)+1));
        // keep S.mgr in sync for founding foremen so legacy bonuses track training
        if(w.founding&&w.mgrId&&S.mgr) S.mgr[w.mgrId]=Math.min(MGR_MAX,Math.max(S.mgr[w.mgrId]|0,w.skill*2));
        w.train=null; st.trained=(st.trained|0)+1;   // v2.27: counted for the Night School trophy
        if(!offline) toast(`🎓 <b>${w.name}</b> reached skill ${w.skill}!`);
        staffSig=''; M=computeMods();
      }
    }
    if(!fatigueOn||(w.traits||[]).includes('steady')){w.energy=100; w.brk=false; continue;}
    let en=typeof w.energy==='number'&&isFinite(w.energy)?w.energy:100;
    // v2.15: on a campfire break → refill fast, back to work once fully rested
    if(w.brk){en=Math.min(100,en+STAFF_BREAK_REFILL*(hero?1.1:1)*dt); if(en>=100){w.brk=false; staffSig='';} w.energy=en; continue;}
    // working → drain; idle (unassigned) → slow refill
    const working=w.founding||w.assign||STAFF_ROLES[w.role]&&STAFF_ROLES[w.role].auto;
    if(working){en=Math.max(0,en-STAFF_ENERGY_DRAIN*dt); if(en<STAFF_BREAK_AT){w.brk=true; staffSig='';}}
    else en=Math.min(100,en+refill*dt);
    w.energy=en;
  }
}

/* ---- portrait helper for generic staff (reuse manager SVG) ---- */
function staffPortrait(w,size){
  const fake={id:w.id||'x',r:w.rarity||'C',look:w.look||STAFF_LOOKS[0]};
  return portraitSVG(fake,size||52);
}

/* ---- wire legacy production hooks ---- */
(function patchStaffHooks(){
  // bSpeed / mgrIn already call mgr*; we multiply staff mill/eng on top via wrappers installed after staff.js loads
})();

function staffApplyToLogRate(base){return base*(1+staffChopBonus())*(1+staffHaulBonus());}
function staffApplyLoadF(base){return base*(1+staffForkBonus());}
function staffApplyCap(base){return base*(1+staffDockCap());}

/* wrap legacy mgrIn so engineers stack with manager thrift */
(function(){
  if(typeof mgrIn==='function'){const _in=mgrIn; mgrIn=function(bid){return _in(bid)*(typeof staffEngIn==='function'?staffEngIn(bid):1);};}
})();
