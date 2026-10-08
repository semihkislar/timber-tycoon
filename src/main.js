
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
  if(curSheet==='set'){const t=$('sndToggle'); t.checked=!S.muted;}
}
function rebuildAll(){cSig='';bpSig='';mktSig='';upgSig='';treeSig='';evSig='';achSig='';yardSigV='';scene._fsig='';M=computeMods();render();}
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
  updateMuteBtn();
}
function dockSale(v){scene.earnAcc+=0;const p=P(DOCK.ci+.4,DOCK.cj+.2,74);scene.floats.push({x:p[0],y:p[1]-14,text:'+'+fmt(v),coin:true,t:0,dur:1.4,big:true});scene.lastEarned=S.totalEarned;}

/* ===================== LOOP ===================== */
let lastNow=Date.now(), lastSaveAt=Date.now(), lastAchAt=Date.now();
function loop(){
  const now=Date.now(); let dt=(now-lastNow)/1000; lastNow=now;
  if(dt>15){
    const r=simulateOffline(Math.min(dt,OFFLINE_CAP)); if(r.coins>0) toast(`⏱️ Caught up ${fmtTime(dt)}: +🪙${fmt(r.coins)}`);
  } else if(dt>0){ while(dt>0){const d=Math.min(dt,0.25);tick(d,false);dt-=d;} }
  chopRateEma*=0.9; chopRateDisplay+=(chopRateEma-chopRateDisplay)*0.2;
  if(now-lastAchAt>1000){lastAchAt=now;checkAch();}
  render();
  if(now-lastSaveAt>10000){lastSaveAt=now;save(true);}
}
function welcomeBack(elapsed,r){
  const capped=elapsed>OFFLINE_CAP;
  const lines=RES.filter(x=>r.p[x.id]>0.5).map(x=>`<div>${x.icon} ${x.name} produced</div><div>${fmt(r.p[x.id])}</div>`).join('');
  modal('🌲 Welcome back, Tycoon!',`You were away for <b>${fmtTime(elapsed)}</b>${capped?` (offline progress capped at 8h)`:''}.<br>Your crews kept working and earned <b style="color:#b06a00">🪙 ${fmt(r.coins)}</b>.
    ${lines?`<div class="gainlist">${lines}</div>`:''}`,[{label:'Back to work!',cls:'gold'}]);
}
function hardResetScene(){scene.workers=[];scene.jacks=[];scene.forklifts=[];yardSigV='';scene._fsig='';scene.lastEarned=S.totalEarned;}
function init(){
  const loaded=load();
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
  forestPeople:()=>{const [tb,bb]=barH();const all=[...scene.jacks,...(scene.foreman?[scene.foreman]:[]),...(scene.planter?[scene.planter]:[])];
    return all.map(p=>{const q=P(p.i,p.j);const s=w2s(q[0],q[1]);return {st:p.st,type:p.type||'crew',pose:p.pose,i:p.i,j:p.j,sx:s[0],sy:s[1],vis:s[0]>8&&s[0]<scene.w-8&&s[1]>tb+20&&s[1]<scene.h-bb-4};});},
  vehicles:()=>({log:scene.logTrucks.map(v=>({li:v.li,s:v.s,v:v.v,load:v.load,done:!!v.done,i:v.i,j:v.j,yaw:v.yaw})),dock:scene.dockTrucks.map(v=>({li:v.li,s:v.s,v:v.v,load:v.load,i:v.i,j:v.j,yaw:v.yaw})),forklifts:scene.forklifts.length,harvesters:scene.harvesters.length}),
  get cam(){return scene.cam;}};
init();
})();
</script>
</body>
</html>
