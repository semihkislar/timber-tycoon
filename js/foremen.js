'use strict';
/* ===================== v2.59 STAFF CAREERS, PART 1: PHASE FOREMEN =====================
   A hired worker at skill 5 or higher can be promoted to run one phase column
   (Phase 1, 2 or 3). One foreman per phase. The column gets a small speed aura:
   +5% at skill 5, +10% at skill 10, and never more than +10%. It multiplies with
   managers, workstation sets and research. While they run the column they are not
   also working their old job, so a mill worker's own speed bonus does not stack
   on top of the aura.
   The promotion is a coin cost: the sticker times forest value, and after a Replant
   at least FM_SEC seconds of income (keptCoin). A first run pays the sticker.
   It opens in the mid game (Sawmill Lv 25, a Phase 2 line at Lv 10, or any Replant),
   so a fresh run's first minutes do not promote anyone and do not change output.
   Replant keeps the staff, and the phase foreman stays with them (docs/replant-v2.18.md).
   The aura only reaches buildings that exist this run. Founding foremen (the old
   managers) are a different job and cannot take a column.
   In the world they walk that column. The name tag is a cached pill. Low graphics
   draws no tag and no extra hat. Late-game phones at the fit zoom hide the tag
   the same way other info pills do ({lo:1} / dcOn). */
const FM_SKILL=5, FM_LO=.05, FM_HI=.10, FM_CAP=.10, FM_BASE=80000, FM_SEC=40;
const FM_PHASE_K={1:1,2:1.5,3:2};
const FM={drawn:0};
function fmOpen(){
  if(!S) return false;
  if((S.prestiges||0)>0) return true;
  if(S.buildings&&S.buildings.sawmill&&(S.buildings.sawmill.lvl||0)>=25) return true;
  if(typeof BUILDINGS==='undefined'||typeof BTIER!=='object') return false;
  for(const b of BUILDINGS){if(BTIER[b.id]===2&&S.buildings[b.id]&&S.buildings[b.id].lvl>=10) return true;}
  return false;
}
function fmEligible(w){
  if(!w||w.founding||w.train) return false;
  if(typeof STAFF_ROLES==='undefined'||!STAFF_ROLES[w.role]) return false;
  const sk=+w.skill;
  return isFinite(sk)&&sk>=FM_SKILL;
}
function fmPhase(w){const ph=w&&+w.fm;return ph===1||ph===2||ph===3?ph:0;}
function fmOf(ph){
  ph=+ph; if(ph!==1&&ph!==2&&ph!==3) return null;
  const t=staffState().team;
  for(let i=0;i<t.length;i++) if(fmPhase(t[i])===ph) return t[i];
  return null;
}
function fmCount(){let n=0;for(let ph=1;ph<=3;ph++) if(fmOf(ph)) n++;return n;}
function fmPct(w){
  if(!w) return 0;
  const sk=Math.max(FM_SKILL,Math.min(typeof STAFF_SKILL_MAX==='number'?STAFF_SKILL_MAX:10,+w.skill||FM_SKILL));
  const span=(typeof STAFF_SKILL_MAX==='number'?STAFF_SKILL_MAX:10)-FM_SKILL;
  const t=span>0?(sk-FM_SKILL)/span:1;
  const p=FM_LO+(FM_HI-FM_LO)*t;
  return (p>0&&isFinite(p))?Math.min(FM_CAP,p):0;
}
function fmAura(id){
  const t=typeof BTIER==='object'?(BTIER[id]||0):0;
  if(t<1||t>3) return 1;
  const w=fmOf(t); if(!w) return 1;
  const p=fmPct(w);
  return 1+(p>0&&isFinite(p)?Math.min(FM_CAP,p):0);
}
function fmPhaseBuilt(ph){
  ph=+ph; if(ph!==1&&ph!==2&&ph!==3||typeof BUILDINGS==='undefined') return false;
  for(const b of BUILDINGS){
    if(BTIER[b.id]!==ph) continue;
    const st=S.buildings[b.id];
    if(!st||!(st.lvl>0)) continue;
    if(b.premium&&!(S.premium&&S.premium.lvl>0)) continue;
    return true;
  }
  return false;
}
function fmCost(ph){
  ph=+ph; if(ph!==1&&ph!==2&&ph!==3) return Infinity;
  const base=FM_BASE*(FM_PHASE_K[ph]||1);
  return typeof keptCoin==='function'?keptCoin(base,FM_SEC):base*(typeof cs==='function'?cs():1);
}
function fmPromote(wid,ph){
  ph=+ph;
  if(ph!==1&&ph!==2&&ph!==3) return false;
  if(!fmOpen()) return false;
  const w=staffState().team.find(x=>x&&x.id===wid);
  if(!fmEligible(w)) return false;
  if(!fmPhaseBuilt(ph)) return false;
  const holder=fmOf(ph);
  if(holder&&holder.id!==w.id) return false;
  if(fmPhase(w)===ph) return false;
  const cost=fmCost(ph);
  if(!(cost>0)||!isFinite(cost)||S.coins+1e-9<cost) return false;
  S.coins-=cost;
  w.fm=ph;
  if(w.assign&&(w.role==='mill'||w.role==='engineer')) w.assign=null;
  if(typeof computeMods==='function') M=computeMods();
  if(typeof staffSig!=='undefined') staffSig='';
  if(typeof SW!=='undefined') SW.sig='';
  const pct=Math.round(fmPct(w)*1000)/10;
  const label=typeof TIER_S!=='undefined'?TIER_S[ph]:String(ph);
  if(typeof toast==='function') toast(`🧢 <b>${w.name}</b> runs Phase ${label} · +${pct}% speed on that column`);
  if(typeof sfx==='function') sfx('unlock');
  if(typeof checkAch==='function') checkAch();
  return true;
}
function fmDemote(wid){
  const w=staffState().team.find(x=>x&&x.id===wid);
  if(!w||!fmPhase(w)) return false;
  const ph=w.fm; w.fm=0;
  if(typeof computeMods==='function') M=computeMods();
  if(typeof staffSig!=='undefined') staffSig='';
  if(typeof SW!=='undefined') SW.sig='';
  const label=typeof TIER_S!=='undefined'?TIER_S[ph]:String(ph);
  if(typeof toast==='function') toast(`🧢 <b>${w.name}</b> steps down from Phase ${label}`);
  if(typeof sfx==='function') sfx('buy');
  return true;
}
/* door-side points along a phase column, in chain order. Empty when that phase has no building. */
function fmSpots(ph){
  const out=[];
  if(typeof BUILDINGS==='undefined'||typeof swBldPts!=='function') return out;
  ph=+ph;
  for(const b of BUILDINGS){
    if(BTIER[b.id]!==ph) continue;
    const st=S.buildings[b.id];
    if(!st||!(st.lvl>0)) continue;
    const L=typeof LOTS!=='undefined'?LOTS[b.id]:null;
    if(L&&L.prem&&!(S.premium&&S.premium.lvl)) continue;
    const P2=swBldPts(b.id,0);
    if(P2&&P2.c) out.push(P2.c);
  }
  return out;
}
/* full-speed supply and demand per good (logs left out: they are not sold). Tests and the balance note read this. */
function fmBalance(){
  const made={},need={};
  if(typeof BUILDINGS==='undefined') return {};
  for(const b of BUILDINGS){
    const st=S.buildings[b.id];
    if(!st||!(st.lvl>0)||st.on===false) continue;
    if(b.premium&&!(S.premium&&S.premium.lvl)) continue;
    const sp=bSpeed(b.id);
    if(!(sp>0)||!isFinite(sp)) continue;
    for(const k in b.out){if(!(b.out[k]>0)) continue; made[k]=(made[k]||0)+b.out[k]*sp*bOutK(b.id,k);}
    for(const k in b.inp){if(!(b.inp[k]>0)) continue; need[k]=(need[k]||0)+b.inp[k]*sp*bInMult(b.id);}
  }
  const goods={};
  const keys={}; for(const k in made) keys[k]=1; for(const k in need) keys[k]=1;
  for(const k in keys){
    if(k==='logs') continue;
    const m=made[k]||0, n=need[k]||0;
    goods[k]={made:m,need:n,r:n>1e-12?m/n:null};
  }
  goods.logs={made:0,need:need.logs||0,r:null};
  return goods;
}
/* name tags. Cached pills. Low graphics and the late-game phone fit zoom draw none. */
function fmTagsDraw(ctx){
  if(typeof gfxLow==='function'&&gfxLow()) return;
  if(typeof dcOn==='function'&&dcOn()) return;
  if(typeof SW==='undefined'||!SW.hits) return;
  const z=scene.cam.z;
  for(const a of SW.hits){
    const w=a.w; if(!w||!fmPhase(w)) continue;
    const p=P(a.i,a.j), s=w2s(p[0],p[1]);
    const y=s[1]-62*z;
    if(s[0]<-80||s[0]>scene.w+80||y<-40||y>scene.h+40) continue;
    const name=(w.name||'Foreman').split(' ')[0];
    pill(ctx,s[0],y,name,{lo:1,fs:10,bg:'#fff8e4',fg:'#3a2410',stroke:'#e0b040',lw:1.5,padX:8,padY:3});
    FM.drawn++;
  }
}
function fmFlowLine(){
  if(typeof fmCount!=='function'||!fmCount()) return '';
  const bits=[];
  for(let ph=1;ph<=3;ph++){
    const w=fmOf(ph); if(!w) continue;
    const label=typeof TIER_S!=='undefined'?TIER_S[ph]:String(ph);
    const pct=Math.round(fmPct(w)*1000)/10;
    bits.push(`${label} ${(w.name||'').split(' ')[0]} +${pct}%`);
  }
  if(!bits.length) return '';
  return `<div class="lg-flow fm-flow">🧢 <b>Foremen</b> ${bits.join(' · ')}</div>`;
}
/* old and damaged saves: one foreman per phase, only a trained hired worker, never a bad value */
function fmNorm(o){
  const st=o&&o.staff; if(!st||!Array.isArray(st.team)) return o;
  const seen={};
  for(const w of st.team){
    if(!w||typeof w!=='object') continue;
    const ph=+w.fm;
    const sk=+w.skill;
    if(ph!==1&&ph!==2&&ph!==3){w.fm=0; continue;}
    if(w.founding||!(sk>=FM_SKILL)||!isFinite(sk)){w.fm=0; continue;}
    if(seen[ph]){w.fm=0; continue;}
    seen[ph]=1; w.fm=ph;
  }
  return o;
}
