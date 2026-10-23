'use strict';
/* ===================== v2.9 MOBILE-FIRST UI =====================
   quick-jump location chips, "needs attention" cycling, auto-focus on events, the 'More' overflow, draggable bottom sheets with
   half/full snap points, compact HUD, hold-to-repeat + Buy max, haptics, landscape rail layout and PWA registration. */
UI_ICONS.more=`<svg viewBox="0 0 32 32"><rect x="3" y="3" width="11" height="11" rx="3" fill="#5fb441"/><rect x="18" y="3" width="11" height="11" rx="3" fill="#3e86c8"/><rect x="3" y="18" width="11" height="11" rx="3" fill="#f5b52e"/><rect x="18" y="18" width="11" height="11" rx="3" fill="#e85a4a"/><path d="M21 23.5h5M23.5 21v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
SHEETS.more={title:'More',icon:'more'};
const OVF=['ship','staff','rnd','power','build','risk','ach','co','set'];
const OVF_LBL={ship:['Shipping','Docks, forklifts & contracts'],staff:['Staff','Team, hires & fire'],rnd:['R&D','Research & trade'],power:['Power','Biomass power plant'],build:['Builders','Construction crews'],risk:['Safety','Insurance & bad luck'],ach:['Trophies','Achievements'],co:['Replant','Prestige & stats'],set:['Settings','Sound, camera, save']};
function prefs(){if(!S.prefs||typeof S.prefs!=='object') S.prefs={autoFocus:true,haptics:true,fatigue:true};if(typeof S.prefs.fatigue!=='boolean') S.prefs.fatigue=true;return S.prefs;}
function haptic(ms){try{if(prefs().haptics&&navigator.vibrate) navigator.vibrate(ms||8);}catch(_){}}
function railMode(){return window.matchMedia('(max-height:520px) and (orientation:landscape)').matches;}
function compactMode(){return window.innerWidth<=720||railMode();}
function moreShown(){const b=$('bbMore');return !!(b&&b.offsetParent);}

/* ---------- quick-jump locations ---------- */
// v2.27: production columns first (top → bottom of the screen, left → right), then the helper strip on the right
const JUMPS=[
  {id:'forest',ic:'🌲',l:'Forest',pt:()=>P(-3,15,0),z:1.6},
  {id:'yard',ic:'🪵',l:'Log Yard',pt:()=>P(YARD.ci,YARD.cj,20),z:1.7},
  {id:'factory',ic:'🏭',l:'Factory',pt:()=>P(15.5,15.5,20),z:1.15},
  {id:'p1',ic:'🪚',l:'Phase 1',pt:()=>P(...colMid('R'),20),z:1.2},
  {id:'p2',ic:'🔨',l:'Phase 2',pt:()=>P(...colMid('L'),20),z:1.2,lock:()=>!MAIN_BLD.some(b=>BTIER[b.id]===2&&S.buildings[b.id].lvl>0)},
  {id:'prem',ic:'💎',l:'Phase 3',pt:()=>P(PREM.ci,PREM.cj,20),z:1.05,lock:()=>!S.premium.lvl},   // v2.21.1: the Phase 3 row
  {id:'rnd',ic:'🔬',l:'R&D',pt:()=>P(16.9,1,20),z:1.7,lock:()=>!campusOpen()},
  {id:'power',ic:'⚡',l:'Power',pt:()=>P(PWZ.ci,PWZ.cj,24),z:1.6,lock:()=>!pwVisible()},
  {id:'office',ic:'📅',l:'Contracts',pt:()=>P(OFFICE.ci,OFFICE.cj,14),z:1.8},
  {id:'build',ic:'🏗️',l:'Builders',pt:()=>P(BYZ.ci,BYZ.cj,22),z:1.7,lock:()=>!byVisible()},
  {id:'dock',ic:'🚚',l:'Dock',pt:()=>P(DOCK.ci,DOCK.cj,20),z:1.7},
  {id:'harbor',ic:'⚓',l:'Harbour',pt:()=>P(34.6,14.4,10),z:1.6,lock:()=>!(harborOpen()||harborAvail())},
];
/* centre of a production column (all its lots, built or not) */
function colMid(side){const L=Object.values(LOTS).filter(l=>l.side===side);if(!L.length) return [15.5,15.5];
  return [L.reduce((a,l)=>a+l.ci,0)/L.length,L.reduce((a,l)=>a+l.cj,0)/L.length];}
let jumpSig='';
function buildJumpBar(){
  const bar=$('jumpBar'); const sig=JUMPS.map(j=>j.lock&&j.lock()?0:1).join('');
  if(sig===jumpSig&&bar.children.length) return; jumpSig=sig;
  bar.innerHTML=JUMPS.map(j=>`<button class="jchip${j.lock&&j.lock()?' locked':''}" data-j="${j.id}"><span class="ji">${j.ic}</span><span>${j.l}</span>${j.lock&&j.lock()?'<small>🔒</small>':''}</button>`).join('');
  bar.querySelectorAll('.jchip').forEach(b=>b.onclick=()=>jumpTo(b.dataset.j));
}
function jumpTo(id){
  const j=JUMPS.find(x=>x.id===id); if(!j) return false; const c=scene.cam;
  const [wx,wy]=j.pt(); const z=Math.min(c.maxZ,Math.max(c.minZ,c.fitZ*j.z*(scene.w<700?1:0.8)));
  if(curSheet&&curSheet!=='bld') closeSheet();
  GI.touchedAt=camNow(); flyToWorld(wx,wy,z); haptic(6);
  document.querySelectorAll('#jumpBar .jchip').forEach(b=>b.classList.toggle('on',b.dataset.j===id));
  scene.lastJump=id; return true;
}
function toggleJump(on){const b=document.body;on=on===undefined?!b.classList.contains('jump-on'):on;b.classList.toggle('jump-on',on);
  $('jumpBtn').setAttribute('aria-expanded',on?'true':'false');$('jumpBar').setAttribute('aria-hidden',on?'false':'true');if(on) buildJumpBar();haptic(5);return on;}

/* ---------- needs attention ---------- */
let attnIdx=-1, attnSig='';
function attentionList(){
  const out=[],short={};   // v2.15.1: shortages are grouped per input, pointing at the building that makes it
  for(const b of BUILDINGS){const st=S.buildings[b.id]; if(!st||!LOTS[b.id]) continue; if(LOTS[b.id].prem&&!S.premium.lvl) continue;
    if(st.lvl&&onFire(b.id)){out.push({id:b.id,k:'fire',p:0,t:`🔥 ${b.name} is on fire`});continue;}
    if(st.lvl&&typeof mishBroken==='function'&&mishBroken(b.id)){out.push({id:b.id,k:'fire',p:1,t:`${S.mish.broke[b.id].slow?'⛈️':'🔧'} ${b.name} ${S.mish.broke[b.id].slow?'storm-damaged (half speed)':'broke down'} · repair now or wait ${Math.ceil(S.mish.broke[b.id].left)}s`});continue;}   // v2.26
    if(st.lvl&&st.on){const bs=bstat[b.id];
      if(bs.full&&bs.f<0.9){out.push({id:b.id,k:'full',p:1,t:`⛔ ${b.name}: storage full`});continue;}
      const fs=isFinite(bs.fs)?bs.fs:bs.f;if(bs.lim&&fs<0.6){(short[bs.lim]=short[bs.lim]||[]).push([b,fs]);continue;}}
    if(st.lvl&&wsBlocked(b.id)){const nx=wsNext(b.id);if(nx&&S.coins+1e-9>=nx.cost) out.push({id:b.id,k:'upg',p:3,t:`🔒 ${b.name} capped at Lv ${nx.gate.lv} · ${wsIcon(b.id,nx.k)} ${wsName(b.id,nx.k)} Lv ${nx.L} affordable`,open:()=>{openSheet('bld',b.id);bpTab('ws');focusLot(b.id,true);}});continue;}   // v2.22
    if(bVisible(b)&&bldUnlocked(b.id)&&(st.lvl?S.coins+1e-9>=bulkCost(b.cost,b.scale,st.lvl,1):canFirstBuild(b.id))) out.push({id:b.id,k:'upg',p:3,t:`⬆ ${b.name}: ${st.lvl?'upgrade':'build'} affordable`});
  }
  if(typeof yardFull==='function'&&yardFull()&&logRatePot()>0) out.push({id:'sawmill',k:'starved',p:2,t:`🪵 Log Yard full · collectors idle. Logs can't be sold: build or upgrade Phase-1 mills`,open:()=>{const id=['sawmill','peeler','chipper','kiln'].find(i=>bldUnlocked(i)&&S.coins+1e-9>=bulkCost(BMAP[i].cost,BMAP[i].scale,S.buildings[i].lvl,1))||'sawmill';openSheet('bld',id);focusLot(id,true);}});   // v2.20.1
  for(const k in short){const L=short[k],si=shortInfo(k),src=si.src;const who=L.length>2?`${L.length} buildings`:L.map(([b,f])=>`${b.name} ${Math.round(f*100)}%`).join(', ');
    out.push({id:src&&S.buildings[src].lvl?src:L[0][0].id,k:'starved',p:2,t:`${RMAP[k].icon} Short on ${RMAP[k].name} (${who})${src?` · upgrade the ${BMAP[src].name}`:''}`,open:()=>{const id=src&&S.buildings[src].lvl?src:L[0][0].id;openSheet('bld',id);focusLot(id,true);}});}
  // v2.10 power plant: out of fuel / low fuel / affordable build or upgrade
  if(pwLvl()&&pwState().on!==false){const s=pwStatus();if(s.k==='nofuel'||s.k==='low') out.push({id:'power',k:'power',p:2,t:s.k==='nofuel'?'⛔ Power Plant: no fuel running':'⚠ Power Plant: low on fuel',open:()=>{openSheet('power');focusLot('power',true);}});}
  if(stationVisible()&&stationLvl()<STATION_MAX&&S.coins+1e-9>=stationCost()) out.push({id:'station',k:'upg',p:3,t:`🚒 Fire Station: ${stationLvl()?'upgrade':'build'} affordable`,open:()=>{openSheet('staff');const b=document.getElementById('shBody');if(b) b.scrollTop=0;}});
  if(pwUnlocked()&&pwLvl()<PW_MAX&&S.coins+1e-9>=pwCost()) out.push({id:'power',k:'upg',p:3,t:`⬆ Power Plant: ${pwLvl()?'upgrade':'build'} affordable`,open:()=>{openSheet('power');focusLot('power',true);}});
  if(S.ship&&S.ship.offer&&!S.ship.contract) out.push({id:'ship',k:'upg',p:3,t:`📜 Export contract offer from ${cityOf(S.ship.offer.city).name}`,open:()=>{openSheet('ship');focusLot('dock');}});
  if(byUnlocked()&&byLvl()<BY_MAX&&S.coins+1e-9>=byCost()) out.push({id:'build',k:'upg',p:3,t:`🏗️ Builders' Yard: ${byLvl()?'upgrade':'build'} affordable`,open:()=>{openSheet('build');focusLot('build',true);}});   // v2.12
  if(typeof specPending==='function') for(const b of specPending()) out.push({id:b.id,k:'spec',p:3,t:`🎛️ ${b.name}: pick a specialisation`,open:()=>{openSheet('bld',b.id);focusLot(b.id,true);setTimeout(()=>{const e=document.getElementById('bpSpec');if(e&&e.scrollIntoView) e.scrollIntoView({block:'nearest',behavior:'smooth'});},60);}});   // v2.17
  out.sort((a,b)=>a.p-b.p); return out;
}
function updateAttn(){
  const L=attentionList(), btn=$('attnBtn'); const bad=L.filter(x=>x.p<3).length;
  const sig=L.length+'|'+bad+'|'+(L[0]?L[0].k:''); if(sig===attnSig) return L; attnSig=sig;
  $('attnN').textContent=L.length>99?'99+':String(L.length);
  btn.classList.toggle('none',!L.length); btn.classList.toggle('bad',bad>0); btn.classList.toggle('fire',!!(L[0]&&L[0].k==='fire'));
  btn.querySelector('.fi').textContent=L[0]&&L[0].k==='fire'?'🔥':bad?'⚠️':'⬆️';
  btn.title=L.length?`${L.length} building${L.length>1?'s':''} need attention (tap to cycle)`:'Everything is running smoothly';
  return L;
}
function nextAttention(){
  const L=attentionList(); if(!L.length){attnTip('✔ Everything is running smoothly');return null;}
  attnIdx=(attnIdx+1)%L.length; const a=L[attnIdx]; GI.touchedAt=camNow();
  if(a.open) a.open(); else {openSheet('bld',a.id); focusLot(a.id,true);} attnTip(`${a.t} <small>${attnIdx+1}/${L.length}</small>`); haptic(a.k==='fire'?[10,40,10]:8);
  return a;
}
let attnT=0;
function attnTip(html){const t=$('attnTip');t.innerHTML=html;t.classList.remove('hidden');clearTimeout(attnT);attnT=setTimeout(()=>t.classList.add('hidden'),2200);}

/* ---------- auto-focus on events ---------- */
function autoFocus(wx,wy,why){
  if(!prefs().autoFocus||!scene.cam||document.hidden) return false;
  if(camBusy()||camNow()-GI.touchedAt<6000) return false;
  if(curSheet&&SH.state==='full') return false;
  const s=w2s(wx,wy),[,bot]=viewBand(),[x0,x1]=viewBandX(),top=($('topbar').offsetHeight||48); if(s[0]>x0+20&&s[0]<x1-20&&s[1]>top+10&&s[1]<bot+8) return false;   // already on screen
  const c=scene.cam; flyToWorld(wx,wy,Math.max(c.tz,Math.min(c.maxZ,c.fitZ*1.2))); scene.autoFocused=(scene.autoFocused||0)+1; scene.lastAutoFocus=why; return true;
}
(function hookEvents(){
  const sf=startFire; startFire=function(bid){const r=sf.apply(this,arguments);try{const L=LOTS[bid];if(L&&S.fires[bid]){const p=P(L.ci,L.cj,30);autoFocus(p[0],p[1],'fire');haptic([12,50,12]);}}catch(_){}return r;};
  const sg=spawnGolden; spawnGolden=function(){const g=sg.apply(this,arguments);try{if(g) autoFocus(g.wx,g.wy,'golden');}catch(_){}return g;};
  const of=orderFx; orderFx=function(kind){const r=of.apply(this,arguments);try{if(kind==='offer'){const p=P(CLIENT_PARK[0],CLIENT_PARK[1],20);autoFocus(p[0],p[1],'order');}}catch(_){}return r;};
})();

/* ---------- bottom sheet: snap points, drag, swipe-down ---------- */
const SH={state:'half',drag:null,snaps:0};
function shSnaps(){
  const sh=$('sheet'), H=window.innerHeight, tb=$('topbar').offsetHeight||48;
  const bottom=parseFloat(getComputedStyle(sh).bottom)||0;
  const full=Math.max(220,Math.round(H-bottom-tb-6));
  const half=Math.min(full,Math.round(compactMode()?Math.max(300,H*.52):H*.6));
  return {half,full};
}
function applySheetState(st){
  const sh=$('sheet'); SH.state=st; sh.dataset.snap=st;
  if(railMode()){sh.style.height='';sh.style.maxHeight='';return;}
  const {half,full}=shSnaps();
  if(st==='full'){sh.style.height=full+'px';sh.style.maxHeight=full+'px';} else {sh.style.height='';sh.style.maxHeight=half+'px';}
  $('shSize').textContent=st==='full'?'▾':'▴';
}
function setSheetState(st){const sh=$('sheet');sh.classList.add('snapping');applySheetState(st);SH.snaps++;setTimeout(()=>sh.classList.remove('snapping'),260);
  requestAnimationFrame(()=>{if(curSheet==='bld'&&sheetBld&&st==='half') focusLot(sheetBld);});}
function sheetDragStart(y){const sh=$('sheet');SH.drag={y0:y,h0:sh.getBoundingClientRect().height,samples:[{y,t:camNow()}],moved:false};sh.classList.add('dragging');}
function sheetDragMove(y){const d=SH.drag;if(!d) return;const dy=y-d.y0;if(Math.abs(dy)>4) d.moved=true;
  const sh=$('sheet');if(railMode()){sh.style.transform=`translateY(${Math.max(0,dy)}px)`;}
  else{const {full}=shSnaps();const h=Math.max(60,Math.min(full,d.h0-dy));sh.style.height=h+'px';sh.style.maxHeight=h+'px';}
  const t=camNow();d.samples.push({y,t});while(d.samples.length>2&&t-d.samples[0].t>120) d.samples.shift();}
function sheetDragEnd(){
  const d=SH.drag;if(!d) return null;SH.drag=null;const sh=$('sheet');sh.classList.remove('dragging');
  const a=d.samples[0],b=d.samples[d.samples.length-1];const v=b.t>a.t?(b.y-a.y)/(b.t-a.t):0;   // px/ms, + = down
  const dy=b.y-d.y0;
  if(railMode()){sh.style.transform='';if(dy>90||v>.7){closeSheet();return 'closed';}return SH.state;}
  if(!d.moved){return null;}
  const {half,full}=shSnaps();const h=sh.getBoundingClientRect().height;
  let st;
  if(v>.55||dy>Math.min(140,d.h0*.38)) st=SH.state==='full'&&h>half*.5&&v<1.4?'half':'closed';
  else if(v<-.55||h>(Math.min(half,d.h0)+full)/2) st='full';
  else st='half';
  if(st==='closed'){closeSheet();haptic(5);return st;}
  setSheetState(st);haptic(4);return st;
}
function setupSheetGestures(){
  const head=$('shHead'), body=$('shBody');
  head.addEventListener('pointerdown',e=>{if(e.target.closest('button')||(e.pointerType==='mouse'&&e.button!==0)) return;try{head.setPointerCapture(e.pointerId);}catch(_){}sheetDragStart(e.clientY);});
  head.addEventListener('pointermove',e=>{if(SH.drag) sheetDragMove(e.clientY);});
  const up=e=>{if(!SH.drag) return;const moved=SH.drag.moved;const r=sheetDragEnd();if(!moved&&e.type==='pointerup'&&r===null&&!railMode()) setSheetState(SH.state==='full'?'half':'full');};
  head.addEventListener('pointerup',up);head.addEventListener('pointercancel',up);
  // pulling the content down while it is scrolled to the top drags the sheet (swipe-down to close)
  let BS=null;
  body.addEventListener('touchstart',e=>{if(e.touches.length!==1){BS=null;return;}BS={y0:e.touches[0].clientY,top:body.scrollTop<=0,active:false};},{passive:true});
  body.addEventListener('touchmove',e=>{if(!BS||!BS.top) return;const y=e.touches[0].clientY,dy=y-BS.y0;
    if(!BS.active){if(dy<-4){BS.top=false;return;} if(dy>10&&body.scrollTop<=0){BS.active=true;sheetDragStart(BS.y0+10);}}
    if(BS.active){if(e.cancelable) e.preventDefault();sheetDragMove(y);}},{passive:false});
  const tend=()=>{if(BS&&BS.active) sheetDragEnd();BS=null;};
  body.addEventListener('touchend',tend);body.addEventListener('touchcancel',tend);
  $('shSize').onclick=()=>setSheetState(SH.state==='full'?'half':'full');
}

/* ---------- 'More' overflow ---------- */
let moreSig='';
function renderMore(force){
  const items=OVF.filter(k=>!$('bb'+k[0].toUpperCase()+k.slice(1)).classList.contains('hidden'));
  const dot=k=>{const d=$(k+'Dot');return d&&!d.classList.contains('hidden');};
  const sig=items.map(k=>k+(dot(k)?1:0)).join(',');
  const md=$('moreDot'); if(md) md.classList.toggle('hidden',!items.some(dot));
  if(!force&&sig===moreSig) return; moreSig=sig;
  $('moreGrid').innerHTML=items.map(k=>`<button class="mtile" data-s="${k}">${dot(k)?'<span class="dot"></span>':''}<span class="mi">${UI_ICONS[k]||''}</span><b>${OVF_LBL[k][0]}</b><small>${OVF_LBL[k][1]}</small></button>`).join('');
  $('moreGrid').querySelectorAll('.mtile').forEach(b=>b.onclick=()=>{haptic(5);openSheet(b.dataset.s);});
}
function closeMore(){if(curSheet==='more'){closeSheet();return true;}return false;}

/* ---------- hold-to-repeat + Buy max ---------- */
const HOLD_SEL='.hold, #colList .btn.buy, #plList .btn.buy, #bpStBuy';
const HOLD={el:null,t:0,n:0,swallow:null,total:0};
function holdStop(){clearTimeout(HOLD.t);HOLD.t=0;if(HOLD.el) HOLD.el.classList.remove('holding');HOLD.el=null;}
function holdStep(){const el=HOLD.el;if(!el||!el.isConnected||el.disabled){holdStop();return;}
  el.click();HOLD.n++;HOLD.total++;haptic(4);HOLD.t=setTimeout(holdStep,Math.max(45,170-HOLD.n*14));}
function setupHold(){
  document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest(HOLD_SEL);if(!el||el.disabled) return;
    holdStop();HOLD.el=el;HOLD.n=0;HOLD.x=e.clientX;HOLD.y=e.clientY;el.classList.add('holding');HOLD.t=setTimeout(()=>{HOLD.swallow=el;holdStep();},420);},true);
  document.addEventListener('pointermove',e=>{if(HOLD.el&&Math.hypot(e.clientX-HOLD.x,e.clientY-HOLD.y)>14) holdStop();},true);
  for(const ev of ['pointerup','pointercancel']) document.addEventListener(ev,()=>holdStop(),true);
  // the click that ends a hold must not buy one more
  document.addEventListener('click',e=>{if(HOLD.swallow&&e.isTrusted&&e.target.closest&&e.target.closest(HOLD_SEL)===HOLD.swallow){e.stopPropagation();e.preventDefault();HOLD.swallow=null;return;}
    if(e.isTrusted) HOLD.swallow=null;},true);
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest(HOLD_SEL)) e.preventDefault();});
}
function buyMaxBld(id){id=id||sheetBld;if(!id) return 0;if(id==='sawmill'&&sawByLogs()) return buyBuilding(id,1,{logsOnly:true})?(render(),1):0;const b=BMAP[id],st=S.buildings[id];const n=Math.min(maxAfford(b.cost,b.scale,st.lvl),st.lvl&&wsHas(id)?wsRoom(id):1e9);   // v2.22: clipped at the workstation gate
  if(n<1||!bldUnlocked(id)) return 0; if(buyBuilding(id,n)){haptic([8,30,8]);render();return n;} return 0;}
function updateBuyMax(){
  if(curSheet!=='bld'||!sheetBld) return; const b=BMAP[sheetBld],st=S.buildings[sheetBld],n=sheetBld==='sawmill'&&sawByLogs()?0:bldUnlocked(sheetBld)?Math.min(maxAfford(b.cost,b.scale,st.lvl),st.lvl&&wsHas(sheetBld)?wsRoom(sheetBld):1e9):0;
  const el=$('bpMax'); const h=n>0?`Max<small>+${n}</small>`:'Max<small>—</small>'; if(el._h!==h){el.innerHTML=h;el._h=h;} el.disabled=n<1;
}

/* ---------- compact HUD ---------- */
function toggleHud(on){const b=document.body;on=on===undefined?!b.classList.contains('hud-x'):on;b.classList.toggle('hud-x',on);$('hudX').setAttribute('aria-expanded',on?'true':'false');$('hudX').textContent=on?'▴':'▾';
  requestAnimationFrame(()=>{if(typeof resizeScene==='function'){const r=document.documentElement.style;r.setProperty('--tb',($('topbar').offsetHeight||52)+'px');}});haptic(4);return on;}

/* ---------- layout classes ---------- */
function updateLayoutClasses(){const b=document.body;b.classList.toggle('compact',compactMode());b.classList.toggle('rail',railMode());if(curSheet) applySheetState(SH.state);}

/* ---------- glue ---------- */
const _openSheet=openSheet, _closeSheet=closeSheet;
openSheet=function(name,arg){
  const was=curSheet; _openSheet(name,arg);
  if(!was) applySheetState(compactMode()&&name==='more'?'half':'half'); else applySheetState(SH.state);
  if(name==='more') renderMore(true);
  const ovf=OVF.includes(name)||name==='more'; const mb=$('bbMore'); if(mb) mb.classList.toggle('on',ovf&&moreShown());
  if(name!=='bld') toggleJumpQuiet(false);
};
closeSheet=function(){_closeSheet();const mb=$('bbMore');if(mb) mb.classList.remove('on');const sh=$('sheet');sh.style.height='';sh.style.maxHeight='';sh.style.transform='';SH.state='half';};
function toggleJumpQuiet(on){document.body.classList.toggle('jump-on',on);$('jumpBtn').setAttribute('aria-expanded',on?'true':'false');}
function setupMobile(){
  updateLayoutClasses();
  window.addEventListener('resize',updateLayoutClasses);
  $('bbMore').querySelector('.bi').innerHTML=UI_ICONS.more;
  $('jumpBtn').onclick=()=>toggleJump();
  $('attnBtn').onclick=()=>nextAttention();
  $('hudX').onclick=()=>toggleHud();
  $('hudChips').addEventListener('click',()=>{if(compactMode()) toggleHud();});
  $('bpMax').onclick=()=>buyMaxBld();
  $('afToggle').onchange=()=>{prefs().autoFocus=$('afToggle').checked;save(true);};
  $('hapToggle').onchange=()=>{prefs().haptics=$('hapToggle').checked;if(prefs().haptics) haptic(15);save(true);};
  if($('fatToggle')) $('fatToggle').onchange=()=>{prefs().fatigue=$('fatToggle').checked;save(true);};
  // building sheet prev/next fly the camera
  $('bpPrev').onclick=()=>{cycleBuilding(-1);if(sheetBld) focusLot(sheetBld,true);haptic(5);};
  $('bpNext').onclick=()=>{cycleBuilding(1);if(sheetBld) focusLot(sheetBld,true);haptic(5);};
  // light haptic tick on bottom bar / buttons
  document.addEventListener('click',e=>{if(e.isTrusted&&e.target.closest&&e.target.closest('.bb,.btn:not(:disabled),.fab,.jchip')) haptic(5);},true);
  setupSheetGestures(); setupHold(); buildJumpBar();
  registerSW();
}
function mobileRender(){
  updateAttn(); updateBuyMax(); renderMore(false);
  if(document.body.classList.contains('jump-on')) buildJumpBar();
  if(curSheet==='set'){$('afToggle').checked=!!prefs().autoFocus;$('hapToggle').checked=!!prefs().haptics;if($('fatToggle')) $('fatToggle').checked=!!prefs().fatigue;}
}
/* ---------- PWA ---------- */
function registerSW(){
  try{if(!('serviceWorker' in navigator)||location.protocol!=='https:'||/\/releases\//.test(location.pathname)) return;
    navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(_){}
}
