'use strict';

/* ===================== v2.14 STAFF SYSTEM =====================
   Roles, candidates, wages, training, assignment, fatigue.
   Existing managers migrate to founding foremen (wage waived).
   Legacy mgrSpd/mgrIn/mgrOut/mgrSto/mgrOrders stay authoritative for
   founding foremen via S.mgr; new hires add staff* bonuses on top. */

const STAFF_ROLES={
  lumberjack:{id:'lumberjack',n:'Lumberjack',e:'🪓',area:'forest',auto:true,
    effect:(sk)=>`+${(sk*2).toFixed(0)}% chop / collector output`},
  driver:{id:'driver',n:'Driver',e:'🚛',area:'haul',auto:true,
    effect:(sk)=>`+${(sk*3).toFixed(0)}% log haul rate`},
  mill:{id:'mill',n:'Mill worker',e:'🏭',area:'building',auto:false,
    effect:(sk)=>`+${(sk*3).toFixed(0)}% building speed`},
  engineer:{id:'engineer',n:'Engineer',e:'🔧',area:'building',auto:false,
    effect:(sk)=>`−${(sk*2.5).toFixed(1)}% input · −${(sk*2).toFixed(0)}% fire risk`},
  forklift:{id:'forklift',n:'Forklift operator',e:'🚜',area:'shipping',auto:true,
    effect:(sk)=>`+${(sk*4).toFixed(0)}% loading · +contract progress`},
  dock:{id:'dock',n:'Dock worker',e:'⚓',area:'shipping',auto:true,
    effect:(sk)=>`+${(sk*1).toFixed(0)}% export premium · +${(sk*2).toFixed(0)}% truck capacity`},
  firefighter:{id:'firefighter',n:'Firefighter',e:'🚒',area:'station',auto:true,
    effect:(sk)=>`faster response · −${(sk*3).toFixed(0)}% fire risk`},
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

function staffWageOf(w){
  if(!w||w.founding) return 0;
  const rm=(RARITY[w.rarity]||RARITY.C).rm;
  return .35*Math.max(1,w.skill||1)*rm;   // coins/s — scales with skill+rarity, not headcount
}
function staffHireCostOf(w){return staffWageOf(w)*60;}   // ≈ 1 minute of wage
function staffTrainCost(w){const rm=(RARITY[w.rarity]||RARITY.C).rm;return 40*Math.max(1,w.skill)*rm;}
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
  for(const w of staffAtBuilding(bid)) if(w.role==='mill'&&!w.founding) b+=.03*staffSkillEff(w);
  return Math.min(1.45,b);   // cap +45%
}
function staffEngIn(bid){
  let cut=0;
  for(const w of staffAtBuilding(bid)) if(w.role==='engineer') cut+=.025*staffSkillEff(w);
  return Math.max(.55,1-Math.min(.4,cut));
}
function staffEngFire(bid){
  let cut=0;
  for(const w of staffAtBuilding(bid)) if(w.role==='engineer') cut+=.02*staffSkillEff(w);
  return Math.max(.5,1-Math.min(.4,cut));
}
function staffChopBonus(){
  let b=0; for(const w of staffByRole('lumberjack')) b+=.02*staffSkillEff(w);
  return Math.min(.4,b);
}
function staffHaulBonus(){
  let b=0; for(const w of staffByRole('driver')) b+=.03*staffSkillEff(w);
  return Math.min(.5,b);
}
function staffForkBonus(){
  let b=0; for(const w of staffByRole('forklift')) b+=.04*staffSkillEff(w);
  return Math.min(.6,b);
}
function staffDockPrem(){
  let b=0; for(const w of staffByRole('dock')) b+=.01*staffSkillEff(w);
  return Math.min(.2,b);
}
function staffDockCap(){
  let b=0; for(const w of staffByRole('dock')) b+=.02*staffSkillEff(w);
  return Math.min(.4,b);
}
function staffFireCut(){
  let b=0; for(const w of staffByRole('firefighter')) b+=.03*staffSkillEff(w);
  return Math.min(.5,b);
}
function staffFireDelayCut(){
  let s=0; for(const w of staffByRole('firefighter')) s+=.4*staffSkillEff(w);
  return Math.min(8,s);   // seconds shaved off response
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
    if(w.role==='mill'&&w.assign){const base=bldValueRate(w.assign)||0; v+=base*.03*sk*e;}
    else if(w.role==='engineer'&&w.assign){const base=bldValueRate(w.assign)||0; v+=base*.015*sk*e;}
    else if(w.role==='lumberjack') v+=(coinRate||0)*.01*sk*e;
    else if(w.role==='driver') v+=(coinRate||0)*.012*sk*e;
    else if(w.role==='forklift'||w.role==='dock') v+=(coinRate||0)*.01*sk*e;
    else if(w.role==='firefighter') v+=(coinRate||0)*.004*sk*e;
  }
  return v;
}
function staffWageTotal(){let t=0;for(const w of staffState().team) t+=staffWageOf(w);return t;}

/* ---- candidates ---- */
function staffMakeCandidate(forced){
  const role=forced&&forced.role||STAFF_ROLE_IDS[Math.floor(Math.random()*STAFF_ROLE_IDS.length)];
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
  // keep the candidate pool warm even with an empty team, but skip wage/fatigue work when idle
  if(!st.candidates.length&&(S.time||0)>=10) staffRefreshCandidates(false);
  else if((S.time||0)>=(st.nextRefresh||0)) staffRefreshCandidates(false);
  if(!st.team.length){st.unpaid=false;return;}

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
        w.train=null; if(!offline) toast(`🎓 <b>${w.name}</b> reached skill ${w.skill}!`);
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
