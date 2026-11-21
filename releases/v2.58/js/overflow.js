'use strict';
/* ===================== v2.40 LOG YARD OVERFLOW (UI) =====================
   The economy lives in js/logic_a.js (OVF_CHIP, ovfChipCap, ovfToChipper, the overflow block in tick) and js/power.js
   (overflow logs burn first in powerTick). This file only shows it:
   - ovfState(): 'none' (yard not full) · 'ovf' (overflow is used, collectors keep working) · 'part' (overflow used, but both sinks are
     full, so some collectors idle) · 'idle' (no sink: collectors idle as before v2.40)
   - the HUD log chip, the Log Yard bar (Market), the Supply Flow line and arcs, the Advisor row / phone attention line, the
     Wood Chipper sheet's chute line, the Log Yard label in the scene and a calm "↪" float every few seconds. Read-only. */
function ovfUsed(){return YOVF.chip+YOVF.pow;}
function ovfState(){
  const u=ovfUsed(),full=yardFull(),th=Math.max(1e-6,.005*logRatePot());   // ignore the smoothed tail once the yard has room again
  if(u>th&&YOVF.in>th) return full?'part':'ovf';
  return full&&logRatePot()>0?'idle':'none';}
/* the one action that lets a full yard's overflow find a use */
function ovfFix(){
  const ch=S.buildings.chipper,pwOk=typeof pwLvl==='function'&&pwLvl()>0;
  const go=id=>()=>{openSheet('bld',id);if(typeof focusLot==='function') focusLot(id,true);if(typeof advPing==='function') advPing(id);};
  const gp=()=>{openSheet('power');if(typeof focusLot==='function') focusLot('power',true);};
  if(!ch.lvl&&bldUnlocked('chipper')) return {btn:'🔨 Chipper',label:'🔨 Build the Wood Chipper',short:'build the Wood Chipper: overflow logs become chips',open:go('chipper')};
  if(ch.lvl&&!ovfChipOk()) return {btn:'🌀 Chipper',label:'🌀 Check the Wood Chipper',short:'the Wood Chipper is stopped: overflow logs need it running',open:go('chipper')};
  if(!pwOk&&typeof pwUnlocked==='function'&&pwUnlocked()) return {btn:'⚡ Power',label:'⚡ Build the Power Plant',short:'build the Power Plant: it burns overflow logs as fuel',open:gp};
  if(pwOk&&(S.power.on===false||pwLogMode()==='off')) return {btn:'⚡ Log fuel',label:'⚡ Allow log fuel',short:'the Power Plant has log fuel off: turn it on to burn overflow logs',open:gp};
  if(ch.lvl) return {btn:'⬆ Chipper',label:'⬆ Upgrade the Wood Chipper',short:'upgrade the Wood Chipper: a bigger chute takes more overflow',open:go('chipper')};
  return {btn:'⬆ Sawmill',label:'⬆ Upgrade Phase-1 mills',short:'upgrade the Sawmill: logs can\'t be sold',open:go('sawmill')};}
function ovfSplitTxt(sep){const a=[];if(YOVF.chip>1e-6) a.push(`🌀 Chipper ${fr(YOVF.chip)}/s`);if(YOVF.pow>1e-6) a.push(`⚡ Power ${fr(YOVF.pow)}/s`);return a.join(sep||' · ');}
/* HUD log chip: [text, class, title] */
function ovfHud(){const st=ovfState();
  if(st==='ovf'||st==='part') return [`↪ ${fr(ovfUsed())}/s`,st==='part'?'yardovf part':'yardovf',`Log Yard full: overflow logs go on to ${ovfSplitTxt(' and ')}${st==='part'?`. ${fr(YOVF.w)}/s find no use, so some collectors idle`:'. Collectors keep working'}`];
  if(st==='idle') return ['Yard full','yardfull',`Log Yard full: collectors are idle (logs can't be sold). Fix: ${ovfFix().short}`];
  return null;}
/* Market → Log Yard bar text: [text, class] */
function ovfYardTxt(cap){const st=ovfState();
  if(st==='ovf') return [`Full (${fmt(cap)}) · overflow ↪ ${ovfSplitTxt()}`,'ovf'];
  if(st==='part') return [`Full (${fmt(cap)}) · overflow ↪ ${ovfSplitTxt()} · ${fr(YOVF.w)}/s idle`,'ovf part'];
  if(st==='idle') return [`Log Yard full (${fmt(cap)}) · collectors idle · ${ovfFix().short.split(':')[0]}`,'full'];
  return null;}
/* Supply Flow legend line */
function ovfFlowLine(){const st=ovfState();if(st==='none') return '';
  if(st==='idle') return `<div class="ovf-flow idle">🪵 Log Yard full · collectors idle · <button class="ovf-go" data-ovf="1">${ovfFix().label} →</button></div>`;
  return `<div class="ovf-flow${st==='part'?' part':''}">↪ <b>Overflow</b> ${fr(ovfUsed())}/s: ${ovfSplitTxt()}${st==='part'?` · <span class="ovf-w">${fr(YOVF.w)}/s idle</span>`:''}</div>`;}
/* the Advisor: a full yard with idle collectors is a bottleneck of its own (wasted collector upgrades) */
function ovfAdvRow(){const st=ovfState();if(st!=='idle'&&!(st==='part'&&YOVF.w>.1*Math.max(1e-9,logRate()))) return null;const f=ovfFix();   // a small idle share is not worth a row
  return {st,f,txt:st==='idle'?`🪵 <b>Log Yard full</b> · collectors idle`:`🪵 <b>Log Yard</b> · overflow sinks full <small>${fr(YOVF.w)}/s idle</small>`};}
/* Wood Chipper sheet: the chute */
function ovfChuteHtml(){const st=S.buildings.chipper;if(!st||!st.lvl) return '';const cap=ovfChipCap();
  return `<div class="bp-yield" id="ovfChute">↪ Overflow chute: up to <b>${fr(cap)}</b> logs/s from a full Log Yard${YOVF.chip>1e-6?` · now <b>${fr(YOVF.chip)}</b>/s → ${fr(YOVF.chips)} chips/s`:''}</div>`;}
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-ovf]');if(!b) return;e.preventDefault();e.stopPropagation();ovfFix().open();if(typeof haptic==='function') haptic(8);});
/* ---- scene: a calm float over the sinks every few seconds while overflow runs ---- */
let ovfFT=2;
function ovfFrame(dt){
  if((ovfFT-=dt)>0) return;ovfFT=3.2;const st=ovfState();if(st!=='ovf'&&st!=='part') return;
  const to=[];if(YOVF.chip>1e-6&&LOTS.chipper) to.push(['chipper',`↪ 🪵→🍂 +${fmt(YOVF.chips)}/s`]);if(YOVF.pow>1e-6) to.push(['power',`↪ 🪵→⚡ ${fmt(YOVF.pow)}/s`]);if(!to.length) return;
  const [id,txt]=to[(ovfFrame.n=(ovfFrame.n||0)+1)%to.length],p=id==='power'?P(PWZ.ci,PWZ.cj,70):P(LOTS.chipper.ci,LOTS.chipper.cj,(LOTS.chipper.H||44)+26);
  scene.floats.push({x:p[0],y:p[1],text:txt,t:0,dur:2.2,col:'#bff3e6',sm:true});}
