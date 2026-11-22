'use strict';
/* ===================== v2.41 INSURANCE CLAIMS & SAFETY DRILLS (maintenance proposal 7) =====================
   Bad luck becomes a decision, not only a loss.
   - Claims: with Insurance Lv 1+, every setback that hits you (not the ones stopped) leaves a claim (≤ CL_MAX open, CL_TTL s).
     File it for a payout now (CL_PAY + CL_PAY_LV × insurance level of the claim value), or bank it as a no-claims discount
     (CL_DISC per claim, ≤ CL_DISC_MAX) on your next Safety drill or Insurance upgrade. Claim value = the coins lost, at least a few
     seconds of this run's income (CL_SEC), so it scales with forest value and never shows tiny numbers after a Replant.
   - Safety drills: once setbacks are possible, pay ~DR_SEC s of income (≥ DR_MIN × cs()) to drill the crews for DR_DUR s of play:
     every setback has a DR_DODGE chance to be stopped and breakdown / storm repair times are ×DR_REPAIR. Cooldown DR_COOL s.
   - Replant keeps the banked discount and the stats; open claims and a running drill end. Old saves start with an empty state. */
const CL_MAX=3, CL_TTL=600, CL_PAY=.4, CL_PAY_LV=.1, CL_DISC=.2, CL_DISC_MAX=.6, CL_MIN=20;
const CL_SEC={gale:30,flood:25,theft:20,breakdown:30,lightning:30,audit:10,crash:25};
const DR_SEC=90, DR_MIN=200, DR_DUR=480, DR_COOL=240, DR_DODGE=.4, DR_REPAIR=.75;
function clFresh(){return {list:[],disc:0,dr:{until:0,cool:0},st:{filed:0,banked:0,paid:0,drills:0,stopped:0},seq:0};}
function clState(){const m=mishState();let c=m.cl;if(!c||typeof c!=='object') c=m.cl=clFresh();
  if(!Array.isArray(c.list)) c.list=[]; c.list=c.list.filter(x=>x&&isFinite(x.v)&&x.v>0&&MISH_DEF[x.id]).slice(0,CL_MAX);
  if(!(c.disc>=0)) c.disc=0; c.disc=Math.min(CL_DISC_MAX,c.disc);
  if(!c.dr||typeof c.dr!=='object') c.dr={until:0,cool:0}; if(!isFinite(c.dr.until)) c.dr.until=0; if(!isFinite(c.dr.cool)) c.dr.cool=0;
  if(!c.st||typeof c.st!=='object') c.st={}; for(const k of ['filed','banked','paid','drills','stopped']) if(!(c.st[k]>=0)) c.st[k]=0;
  if(!(c.seq>=0)) c.seq=0; return c;}
function clDisc(){return (S.mish&&S.mish.cl&&S.mish.cl.disc)||0;}
function clPayShare(ins){return CL_PAY+CL_PAY_LV*Math.max(1,ins||insLvl());}
function clPay(x){return x.v*clPayShare(x.ins);}
function clOpen(){return insLvl()>0;}
/* a setback that hit you leaves a claim */
function clAdd(id,v){if(!clOpen()) return null;const c=clState();
  const val=Math.max(v||0,(CL_SEC[id]||20)*mishInc(),CL_MIN*cs());
  const x={n:++c.seq,id,v:val,at:S.time,ins:insLvl()};c.list.unshift(x);if(c.list.length>CL_MAX) c.list.length=CL_MAX;mishSig='';
  if(typeof toast==='function') toast(`📝 <b>Claim ready</b>: file it for 🪙${fmt(clPay(x))} now, or bank a −${Math.round(CL_DISC*100)} % discount. Open 🛡️ Safety.`,4200);
  return x;}
function clFile(n){const c=clState(),i=c.list.findIndex(x=>x.n===n);if(i<0) return false;const x=c.list[i];c.list.splice(i,1);
  const p=clPay(x);earn(p);c.st.filed++;c.st.paid+=p;mishSig='';if(typeof sfx==='function') sfx('buy');
  if(typeof toast==='function') toast(`📝 <b>Claim paid</b>: +🪙${fmt(p)}.`,3000);return p;}
function clBank(n){const c=clState(),i=c.list.findIndex(x=>x.n===n);if(i<0||c.disc>=CL_DISC_MAX-1e-9) return false;c.list.splice(i,1);
  c.disc=Math.min(CL_DISC_MAX,c.disc+CL_DISC);c.st.banked++;mishSig='';if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🏷️ <b>No-claims discount −${Math.round(c.disc*100)} %</b> on your next drill or Insurance upgrade.`,3200);return true;}
/* safety drills */
function drActive(){const c=S.mish&&S.mish.cl;return !!(c&&c.dr&&c.dr.until>S.time);}
function drLeft(){const c=S.mish&&S.mish.cl;return c&&c.dr?Math.max(0,c.dr.until-S.time):0;}
function drCool(){const c=S.mish&&S.mish.cl;return c&&c.dr&&!drActive()?Math.max(0,c.dr.cool-S.time):0;}
function drBase(){return Math.max(DR_MIN*cs(),DR_SEC*mishInc());}
function drCost(){return drBase()*(1-clDisc());}
function drCan(){return mishActive()&&!drActive()&&drCool()<=0;}
function runDrill(){if(!drCan()) return false;const c=clState(),k=drCost();if(S.coins+1e-9<k) return false;
  S.coins-=k;c.disc=0;c.dr.until=S.time+DR_DUR;c.dr.cool=c.dr.until+DR_COOL;c.st.drills++;mishSig='';if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🦺 <b>Safety drill</b>: for ${Math.round(DR_DUR/60)} min crews stop ${Math.round(DR_DODGE*100)} % of setbacks and repair ${Math.round((1-DR_REPAIR)*100)} % faster.`,4000,'ms-toast');
  return true;}
/* hooks into v2.26 */
const _clLog=mishLog;
mishLog=function(id,txt,v,dodged){_clLog(id,txt,v,dodged);if(!dodged) clAdd(id,v);};
const _clDodge=mishDodge;
mishDodge=function(id){const [p,who]=_clDodge(id);if(!drActive()) return [p,who];
  if(Math.random()<DR_DODGE){clState().st.stopped++;return [1,'🦺 Your drilled crews'];}return [p,who];};
const _clBld=mishBldMult;
mishBldMult=function(bid){return _clBld(bid)*(drActive()?DR_REPAIR:1);};
const _clIns=insCost;
insCost=function(l){return l===undefined?_clIns()*(1-clDisc()):_clIns(l);};
const _clBuyIns=buyInsurance;
buyInsurance=function(){const r=_clBuyIns();if(r) clState().disc=0;return r;};
const _clTick=mishTick;
mishTick=function(dt,offline){_clTick(dt,offline);const c=S.mish&&S.mish.cl;if(c&&c.list&&c.list.length){const n=c.list.length;c.list=c.list.filter(x=>S.time-x.at<CL_TTL);if(c.list.length!==n) mishSig='';}};
const _clKeep=mishKeep;
mishKeep=function(){const c=clState(),k=_clKeep();k.cl={list:[],disc:c.disc,dr:{until:0,cool:0},st:Object.assign({},c.st),seq:c.seq};return k;};
const _clVis=mishVisible;
mishVisible=function(){return _clVis()||drActive()||!!(S.mish&&S.mish.cl&&S.mish.cl.list&&S.mish.cl.list.length);};
ACH.push({id:'clm5',g:'sys',t:'silver',e:'📝',n:'Paperwork Pro',d:'Settle 5 insurance claims (file or bank)',p:()=>{const c=S.mish&&S.mish.cl&&S.mish.cl.st;return [c?(c.filed||0)+(c.banked||0):0,5];}},
  {id:'drill5',g:'sys',t:'gold',e:'🦺',n:'Safety First',d:'Run 5 safety drills',p:()=>[(S.mish&&S.mish.cl&&S.mish.cl.st&&S.mish.cl.st.drills)||0,5]});

/* ---------- Safety sheet block ---------- */
let clSig='';
function clHtml(){const c=clState(),now=S.time;let h=`<div id="riskClaims">`;
  h+=`<h4>🦺 Safety drill</h4><div class="risk-ins cl-drill"><div><b>${drActive()?`Drill on · <span class="dr-left"></span> left`:drCool()>0?'Crews resting':'Drill your crews'}</b><div class="legend" style="margin:2px 0 0">For ${Math.round(DR_DUR/60)} min of play, crews stop <b>${Math.round(DR_DODGE*100)} %</b> of all setbacks and repair breakdowns and storm damage ${Math.round((1-DR_REPAIR)*100)} % faster. Costs about ${DR_SEC} s of income.${!mishActive()?' Opens once setbacks can happen.':''}</div></div><button class="btn gold big" id="drBuy"></button></div>`;
  h+=`<h4>📝 Claims <small>(${c.st.filed} paid · ${c.st.banked} banked${c.disc>0?` · discount −${Math.round(c.disc*100)} % ready`:''})</small></h4>`;
  if(!clOpen()) h+=`<div class="legend">With insurance, every setback that hits you leaves a claim: take a payout now, or bank it as a −${Math.round(CL_DISC*100)} % discount (up to −${Math.round(CL_DISC_MAX*100)} %) on your next drill or Insurance upgrade.</div>`;
  else if(!c.list.length) h+=`<div class="legend">No open claims. A setback leaves one here for ${Math.round(CL_TTL/60)} min.</div>`;
  else h+=`<div class="risk-list">${c.list.map(x=>`<div class="risk-row cl-row"><span>${MISH_DEF[x.id].e} <b>${MISH_DEF[x.id].n}</b> · claim 🪙${fmt(x.v)} · <small data-cl-left="${x.n}"></small></span><span class="cl-btns"><button class="btn gold small" data-cl-file="${x.n}">📝 File +🪙${fmt(clPay(x))}</button><button class="btn small" data-cl-bank="${x.n}" ${c.disc>=CL_DISC_MAX-1e-9?'disabled':''}>🏷️ Bank −${Math.round(CL_DISC*100)} %</button></span></div>`).join('')}</div>`;
  return h+'</div>';}
const _clUpd=updateRisk;
updateRisk=function(){_clUpd();if(curSheet!=='risk') return;const body=$('riskBody');if(!body) return;const c=clState();
  const sig=c.list.map(x=>x.n).join()+'|'+c.disc+'|'+drActive()+'|'+(drCool()>0)+'|'+clOpen()+'|'+mishActive()+'|'+c.st.filed+'|'+c.st.banked;
  let el=$('riskClaims');
  if(!el||sig!==clSig){clSig=sig;const tmp=document.createElement('div');tmp.innerHTML=clHtml();const nw=tmp.firstChild;
    if(el) el.replaceWith(nw); else {const a=body.querySelector('.risk-now');if(a) a.after(nw); else body.prepend(nw);}el=nw;
    $('drBuy').onclick=()=>{if(runDrill()){clSig='';render();}};
    el.querySelectorAll('[data-cl-file]').forEach(b=>b.onclick=()=>{if(clFile(+b.dataset.clFile)){clSig='';render();}});
    el.querySelectorAll('[data-cl-bank]').forEach(b=>b.onclick=()=>{if(clBank(+b.dataset.clBank)){clSig='';render();}});}
  const b=$('drBuy');if(b){const k=drCost(),bh=drActive()?'🦺 Drill running':drCool()>0?`Next drill in ${fmtTime(drCool())}`:costBtnHtml(`🦺 Run a drill${clDisc()>0?` (−${Math.round(clDisc()*100)} %)`:''}`,k);
    if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=!drCan()||S.coins+1e-9<k;}
  const dl=el.querySelector('.dr-left');if(dl) dl.textContent=fmtTime(drLeft());
  el.querySelectorAll('[data-cl-left]').forEach(x=>{const it=c.list.find(q=>q.n===+x.dataset.clLeft);x.textContent=it?`expires in ${fmtTime(Math.max(0,CL_TTL-(S.time-it.at)))}`:'';});
  const dot=$('riskDot');if(dot&&c.list.length) dot.classList.add('hidden');};
const _clUpd2=updateRisk;
updateRisk=function(){_clUpd2();const dot=$('riskDot'),c=S.mish&&S.mish.cl;if(dot&&curSheet!=='risk'&&c&&c.list&&c.list.length) dot.classList.remove('hidden');};
