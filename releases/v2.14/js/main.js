'use strict';

/* ===================== MAIN RENDER (HUD + open sheet) ===================== */
let chopRateDisplay=0;
function render(){
  if(!M) M=computeMods();
  const target=S.coins;
  if(Math.abs(dispCoins-target)>0.5){dispCoins+=(target-dispCoins)*0.25;if(Math.abs(dispCoins-target)<1) dispCoins=target;} else dispCoins=target;
  const coinEl=$('hCoins'); const shown=fmt(dispCoins);
  if(coinEl.textContent!==shown){coinEl.textContent=shown;
    if(target>lastDispCoins+0.5){coinEl.classList.remove('tick');void coinEl.offsetWidth;coinEl.classList.add('tick');}
    lastDispCoins=target;}
  $('hIncome').textContent='+'+fr(coinRate)+'/s';
  $('hLogs').textContent=fr(logRate()+chopRateDisplay*chopPower())+'/s';
  $('hSeeds').textContent=S.seeds+(S.seeds?` (+${S.seeds*10}%)`:'');
  const L=$('sceneLabel'); if(!golden.cur){const tx=sceneLabelText(); if(L.textContent!==tx) L.textContent=tx;}
  updateBuildingSheet(); updateCollectors(); updateMarket(); updateUpgrades(); updateTrees(); updateCompany(); updateAch(); renderEvents();
  renderOrderCard(); renderDailyChip(); updateOrders(); updatePrem(); updateWx(); updateStaff(); updateRnd(); updateForestUI(); updatePower(); updateBuilders(); updateShip();
  if(curSheet==='set'){const t=$('sndToggle'); t.checked=!S.muted;}
  mobileRender();
}
function rebuildAll(){cSig='';plSig='';bpSig='';mktSig='';upgSig='';treeSig='';evSig='';achSig='';yardSigV='';scene._fsig='';ordSig='';dailySig='';dailyChipSig='';premSig='';ordCardSig='';wxSig='';staffSig='';resSig='';tradeSig='';pwSig='';bySig='';M=computeMods();render();}
function toggleMute(){S.muted=!S.muted; updateMuteBtn(); save(true);}
function updateMuteBtn(){const b=$('muteBtn'); if(b) b.textContent=S.muted?'🔇':'🔊'; const t=$('sndToggle'); if(t) t.checked=!S.muted;}

/* ===================== INPUT (HUD) ===================== */
function setupUI(){
  $('kCoins').innerHTML=svgIcon('coins',24);
  $('kLogs').innerHTML=svgIcon('logs',24);
  $('kSeeds').innerHTML=svgIcon('seeds',24);
  $('logoIcon').innerHTML=svgIcon('tree',24);
  $('verBadge').textContent='v'+VERSION; $('footerVer').textContent='v'+VERSION;
  document.querySelectorAll('#bottombar .bb').forEach(b=>{b.querySelector('.bi').innerHTML=UI_ICONS[b.dataset.s];
    b.onclick=()=>{if(curSheet===b.dataset.s) closeSheet(); else openSheet(b.dataset.s);};});
  $('shClose').onclick=closeSheet;
  document.querySelectorAll('.seg.mult button').forEach(b=>b.onclick=()=>setMult(b.dataset.m));
  $('bpBuy').onclick=()=>{if(sheetBld){buyBuilding(sheetBld);render();}};
  $('bpOn').onchange=()=>{if(sheetBld){S.buildings[sheetBld].on=$('bpOn').checked;render();}};
  $('bpPrev').onclick=()=>cycleBuilding(-1); $('bpNext').onclick=()=>cycleBuilding(1);
  $('saveBtn').onclick=()=>save();
  $('muteBtn').onclick=()=>toggleMute();
  $('sndToggle').onchange=()=>{S.muted=!$('sndToggle').checked;updateMuteBtn();save(true);};
  $('fitBtn').onclick=()=>{fitCamera(false);};
  $('resetBtn').onclick=()=>confirmModal('Reset everything?','This permanently wipes your save, including Seeds. This cannot be undone.','Wipe save',hardReset);
  $('prestigeBtn').onclick=()=>{const g=pendingSeeds(); if(g<1) return;
    confirmModal('🌱 Replant the Forest?',`You will sell the company and start over with <b>+${g} Seeds</b> (total ${S.seeds+g}, giving <b>+${(S.seeds+g)*10}%</b> production).<br><br>Coins, stock, collectors, buildings, upgrades and trees reset.`,'Replant',()=>{if(doPrestige()!==false){closeSheet();fitCamera();}});};
  document.addEventListener('visibilitychange',()=>{if(document.hidden) save(true);});
  window.addEventListener('beforeunload',()=>save(true));
  setupPremiumUI(); setupWx(); setupRndUI();
  $('forestChip').onclick=()=>{if(curSheet==='crew') closeSheet(); else openSheet('crew');};
  setupMobile();
  updateMuteBtn();
}
function dockSale(v){scene.earnAcc+=0;const p=P(DOCK.ci+.4,DOCK.cj+.2,74);scene.floats.push({x:p[0],y:p[1]-14,text:'+'+fmt(v),coin:true,t:0,dur:1.4,big:true});scene.lastEarned=S.totalEarned;}

/* ===================== LOOP ===================== */
let lastNow=Date.now(), lastSaveAt=Date.now(), lastAchAt=Date.now();
let lastRenderAt=0;
function loop(){
  if(document.hidden) return;   // v2.8: no tick/DOM work while hidden; the elapsed time is caught up (offline sim) on return
  const now=Date.now(); let dt=(now-lastNow)/1000; lastNow=now;
  if(dt>15){
    const r=simulateOffline(Math.min(dt,OFFLINE_CAP)); if(r.coins>0) toast(`⏱️ Caught up ${fmtTime(dt)}: +🪙${fmt(r.coins)}`);
  } else if(dt>0){ while(dt>0){const d=Math.min(dt,0.25);tick(d,false);dt-=d;} }
  chopRateEma*=0.9; chopRateDisplay+=(chopRateEma-chopRateDisplay)*0.2;
  if(now-lastAchAt>1000){lastAchAt=now;checkAch();}
  if(now-lastRenderAt>=240){lastRenderAt=now;render();}
  if(now-lastSaveAt>30000){lastSaveAt=now;save(true);}
}
function welcomeBack(elapsed,r){
  const capped=elapsed>OFFLINE_CAP;
  const lines=RES.filter(x=>r.p[x.id]>0.5).map(x=>`<div>${x.icon} ${x.name} produced</div><div>${fmt(r.p[x.id])}</div>`).join('');
  const bl=r.built>0?`<br>🏗️ Your builders added <b>${fmt(r.built)}</b> building level${r.built>1?'s':''}.`:'';
  const pl=r.planted>0.5?`<br>🌱 Your planters put <b>${fmt(r.planted)}</b> saplings in the ground; the forest now stands at <b>${Math.round((1-S.forest.st/forestPlots())*100)}%</b> covered.`:'';
  modal('🌲 Welcome back, Tycoon!',`You were away for <b>${fmtTime(elapsed)}</b>${capped?` (offline progress capped at 8h)`:''}.<br>Your crews kept working and earned <b style="color:#b06a00">🪙 ${fmt(r.coins)}</b>.${pl}${bl}
    ${lines?`<div class="gainlist">${lines}</div>`:''}`,[{label:'Back to work!',cls:'gold'}]);
}
function hardResetScene(){scene.workers=[];scene.jacks=[];scene.forklifts=[];yardSigV='';scene._fsig='';scene.lastEarned=S.totalEarned;}
function init(){
  loadAtlas();
  const loaded=load();
  if(typeof staffMigrateFromMgr==='function'){staffMigrateFromMgr(); if(S._needStaffMig) delete S._needStaffMig;}
  if(S.staff&&!(S.staff.candidates&&S.staff.candidates.length)&&typeof staffRefreshCandidates==='function') staffRefreshCandidates(false);
  M=computeMods();
  setupUI();
  initScene();
  if(loaded){
    const elapsed=(Date.now()-S.lastSave)/1000;
    if(elapsed>10){const sec=Math.min(elapsed,OFFLINE_CAP);const r=simulateOffline(sec);welcomeBack(elapsed,r);}
    tick(0.1,false);
    checkAch(true);
  }
  scene.lastEarned=S.totalEarned;
  rebuildAll();
  lastNow=Date.now();
  setInterval(loop,100);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save(true);lastSaveAt=Date.now();} else loop();});
  window.addEventListener('pagehide',()=>save(true));
}

// test / debug hook
window.TT={get S(){return S;},set S(v){S=v;},simulate,simulateOffline,tick,chop,buyCollector,buyBuilding,buyUpgrade,buyTree,sellAll,doPrestige,hardReset,save,load,
  pendingSeeds,logRate:()=>{M=computeMods();return logRate();},price:id=>{M=computeMods();return price(id);},bstat,rates,get coinRate(){return coinRate;},
  triggerEvent,render,rebuildAll,ACH,checkAch,achCount,spawnGolden,catchGolden,golden,get M(){return M;},COLLECTORS,BUILDINGS,UPGRADES,TREES,bulkCost,COL_SCALE,setBuyMult:m=>{buyMult=m;},VERSION,migrateSave,scene,MILESTONES,msCount,nextMs,totStars,bSpeed,workersFor,
  // v2.0 iso scene helpers
  LOTS,YARD,DOCK,P,w2s,s2w,hitTest,sceneTap,fitCamera,zoomAt,openSheet,closeSheet,get curSheet(){return curSheet;},get sheetBld(){return sheetBld;},
  lotScreen:id=>{const L=id==='yard'?YARD:id==='dock'?DOCK:LOTS[id];const p=P(L.ci,L.cj,14);return w2s(p[0],p[1]);},
  forestScreen:()=>{const [tb,bb]=barH();for(let y=tb+60;y<scene.h-bb-40;y+=23) for(let x=40;x<scene.w-40;x+=29){const h=hitTest(x,y);if(h.type==='forest'&&!(golden.cur&&Math.hypot(x-golden.cur.x,y-golden.cur.y)<80)) return [x,y];} return null;},
  // v2.1 entity helpers
  LANDINGS,
  forestPeople:()=>{const [tb,bb]=barH();const all=[...scene.jacks,...(scene.foreman?[scene.foreman]:[]),...(scene.planters||[])];
    return all.map(p=>{const q=P(p.i,p.j);const s=w2s(q[0],q[1]);return {st:p.st,type:p.type||'crew',pose:p.pose,i:p.i,j:p.j,sx:s[0],sy:s[1],vis:s[0]>8&&s[0]<scene.w-8&&s[1]>tb+20&&s[1]<scene.h-bb-4};});},
  vehicles:()=>({log:scene.logTrucks.map(v=>({li:v.li,s:v.s,v:v.v,load:v.load,done:!!v.done,i:v.i,j:v.j,yaw:v.yaw})),dock:scene.dockTrucks.map(v=>({li:v.li,s:v.s,v:v.v,load:v.load,i:v.i,j:v.j,yaw:v.yaw})),forklifts:scene.forklifts.length,harvesters:scene.harvesters.length}),
  // v2.2 premium / orders / storage helpers
  MAIN_BLD,PREM_BLD,PREM,buyPremium,premCost,buyStorage,stoCost,stoLvl,stockCaps,bldCap,offerOrder,acceptOrder,declineOrder,deliverFromStock,makeOrder,prodRate,focusPrem,
  premScreen:()=>{const p=P((PREM.i0+PREM.i1)/2,(PREM.j0+PREM.j1)/2,10);return w2s(p[0],p[1]);},
  // v2.3 world clock / seasons / weather helpers
  DAY_LEN,SEASON_DAYS,SEASONS,WEATHER,dayPhase,dayNum,seasonIdx,weatherId,setWeather,setClock,clockStr,dayState,isNight,
  // v2.5 research / trade helpers
  RNODES,CITIES,CMAP,bldUnlocked,freeSlot,harborAvail,labBuilt,nodeAvail,openResearch,openTrade,vesselPose,hasRes,doResearch,canResearch,labRP,buyHarbor,openRoute,dispatch,departNow,harborLvl,harborCost,routeOpen,tradeMult,tradeGoods,campusOpen,harborOpen,HOME,
  // v2.6 daily contracts
  dailyOpen,makeDailyOffers,acceptDaily,declineDaily,deliverDaily,makeDailyContract,dayKey,streakMult,openDaily,dailyAwaiting,dailyActiveN,DAILY_MAX_ACTIVE,DAILY_DIFFS,OFFICE,spawnCourierVan,get ordTab(){return ordTab;},set ordTab(v){ordTab=v;},

  // v2.4 managers / fire helpers
  MANAGERS,RARITY,SKILLS,portraitSVG,mgrLvl,hireMgr,levelMgr,mgrHireCost,mgrUpCost,mgrSpd,mgrIn,mgrOut,mgrSto,mgrOrders,startFire,tapFire,fireRisk,buyStation,stationCost,stationLvl,onFire,STATION,
  // v2.14 staff system
  STAFF_ROLES,STAFF_TRAITS,staffState,staffFresh,staffHireCandidate,staffAssign,staffUnassign,staffStartTrain,staffMigrateFromMgr,staffRefreshCandidates,staffRerollFree,
  staffWageOf,staffHireCostOf,staffWageTotal,staffOutputRate,staffMillSpd,staffEngIn,staffForkBonus,staffChopBonus,staffHaulBonus,staffSlots,staffCanAssign,staffAtBuilding,staffHiredCount,staffTick,
  get staffTabCur(){return staffTab;},set staffTabCur(v){staffTab=v;},
  fireScreen:bid=>{const L=LOTS[bid];return L.top?w2s(L.top[0],L.top[1]):null;},stationScreen:()=>{const p=P(STATION.ci,STATION.cj,12);return w2s(p[0],p[1]);},
  // v2.7 forest / planting crew helpers
  PLANTERS,PMAP,buyPlanter,plCost,plRate,plantCap,fellDemand,forestPlots,forestEff,growMult,logRatePot:()=>{M=computeMods();return logRatePot();},forestState,FELL,FOREST_BASE,LAND_PER,planterPeople:()=>scene.planters||[],forestScreenAt:(i,j)=>{const p=P(i,j);return w2s(p[0],p[1]);},
  SPR,sprClear,shadeCacheSize:()=>_sh.size,
  // v2.9 mobile / camera helpers
  GI,flyTo,flyToWorld,camLimits,camBusy,camOut,focusLot,JUMPS,jumpTo,toggleJump,attentionList,nextAttention,autoFocus,SH,shSnaps,setSheetState,applySheetState,
  HOLD,buyMaxBld,toggleHud,railMode,compactMode,haptic,prefs,viewBand,sceneTapAt:(x,y)=>handleTap(x,y),get ground(){return scene.gl;},
  // v2.10 power plant helpers
  PW_MAX,PW_FUELS,PW_PERKS,PWZ,pwLvl,pwCost,pwUnlocked,pwVisible,pwShare,pwEff,pwBoost,pwNeed,pwCapacity,pwStatus,buyPower,setPowerFuel,setPowerOn,openPower,
  powerScreen:()=>{const p=P(PWZ.ci,PWZ.cj,20);return w2s(p[0],p[1]);},
  // v2.12 builders' yard helpers
  BY_MAX,BY_LV,BY_PLANS,BY_BUDGETS,BY_PERKS,BY_WAIT,BYZ,byLvl,byCost,byUnlocked,byVisible,byCrews,byBatch,byDur,byBudget,byAfford,byPick,byStatus,byJobOf,byAllowed,
  buyBuilders,setBuildersOn,setBuildersPlan,setBuildersBudget,setBuildersAllow,byTrucks:()=>(scene.by?scene.by.trucks:[]).map(t=>({id:t.job,bid:t.bid,li:t.li,s:t.s,v:t.v,i:t.i,j:t.j,crew:t.crew,done:!!t.done,walk:!!t.walk})),
  byScreen:()=>{const p=P(BYZ.ci,BYZ.cj,16);return w2s(p[0],p[1]);},byPeople:()=>scene.by?scene.by.people:[],
  get cam(){return scene.cam;}};
init();
