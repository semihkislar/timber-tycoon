// greedy bot run in page; returns milestone log
window.runBot=function(totalSec,clickPerSec,clickUntil){
  const T=window.TT; const log=[]; const seen={};
  const mark=(k,t)=>{if(!seen[k]){seen[k]=t;log.push([Math.round(t),k]);}};
  const snaps=[];
  for(let t=0;t<totalSec;t++){
    if(t<clickUntil) for(let i=0;i<clickPerSec;i++) T.chop();
    T.simulate(1,0.25); if(T.checkAch) T.checkAch(true);   // real play checks trophies every second (main loop)
    if(T.S.orders&&T.S.orders.offer&&window.BOT_ORDERS!==false) T.acceptOrder();
    const S=T.S;
    if(S.fires&&window.BOT_FIRE!==false) for(const bid in S.fires){const c0=S.coins;for(let k=0;k<14&&S.fires[bid];k++) T.tapFire(bid);(window.FIRE_LOG=window.FIRE_LOG||[]).push([t,bid,Math.round(S.coins-c0),Math.round(T.coinRate)]);}
    if(T.doResearch&&window.BOT_V25!==false&&window.BOT_RES!==false){const av=T.RNODES.filter(n=>T.canResearch(n.id)).sort((a,b)=>a.rp-b.rp); if(av[0]&&T.doResearch(av[0].id)) mark('R:'+av[0].id,t);}
    if(T.dispatch&&window.BOT_V25!==false&&window.BOT_TRADE!==false&&T.harborLvl()){ // load the best good for each free vessel
      for(const mode of ['train','ship']){ if(!T.freeSlot(mode)) continue; let best=null;
        for(const c of T.CITIES){ if(c.mode!==mode||!T.routeOpen(c.id)) continue; for(const r of T.tradeGoods()){const v=T.tradeMult(c.id,r.id)*T.price(r.id)*Math.min(1,T.rates[r.id]?T.rates[r.id].s/Math.max(1e-9,T.rates[r.id].p||1e-9):0)*(T.rates[r.id]?T.rates[r.id].p:0)/c.trip; if(!best||v>best.v) best={v,c:c.id,g:r.id};}}
        if(best&&T.dispatch(best.c,best.g)) mark('ship:'+best.c,t);}}
    // v2.20.1: the first Lumberjack is free and the first Sawmill is built with logs
    if(T.colCost&&S.collectors.lumberjack===0) T.buyCollector('lumberjack',1);
    if(T.sawLogsOk&&T.sawLogsOk()) T.buyBuilding('sawmill',1,{logsOnly:true});
    // purchases loop
    for(let guard=0;guard<20;guard++){
      const lr=T.logRate(); const cpl=lr>0?Math.max(T.price('logs'),T.coinRate/Math.max(lr,1)):1;
      const cands=[];
      for(const c of T.COLLECTORS){const own=S.collectors[c.id];const cost=T.colCost?Math.max(1e-9,T.colCost(c.id,own,1)):T.bulkCost(c.cost,T.COL_SCALE,own,1);
        if(cost>S.totalEarned*3+200) continue; cands.push({k:'c:'+c.id,cost,gain:T.logRate()>=0?(c.rate*cpl):0,do:()=>T.buyCollector(c.id,1)});}
      // v2.7: keep the planting crew ahead of the loggers (each sapling/s sustains logPot/D logs/s)
      if(T.PLANTERS&&window.BOT_PLANT!==false){const D=T.fellDemand(),cap=T.plantCap(),pot=T.logRatePot();
        const F=S.forest,ttd=(F.m-D*10)/Math.max(1e-9,D-cap),need=D>0&&cap<D*1.2&&(cap<D?ttd<300:F.m<T.forestPlots()*.7); window.__plNeed=need;
        if(need) for(const p of T.PLANTERS){const cost=T.plCost(p.id,1);if(cost>S.totalEarned*3+200) continue;const r=T.plRate(p.id);
          cands.push({k:'pl:'+p.id,cost,gain:Math.min(r,D*1.2-cap)*(pot/D)*cpl*(cap<D?3:1),do:()=>T.buyPlanter(p.id,1)});}}
      for(const b of T.BUILDINGS){const st=S.buildings[b.id];const cost=T.bldNextCost?T.bldNextCost(b.id):T.bulkCost(b.cost,b.scale,st.lvl,1);   // v2.22: includes the workstation a gate needs
        if(cost>S.totalEarned*3+200) continue; if(T.bldUnlocked&&!T.bldUnlocked(b.id)) continue;
        if(b.id==='lab'){if(window.BOT_V25===false||window.BOT_RES===false) continue; const left=T.RNODES.filter(n=>!T.hasRes(n.id)).length; if(left&&st.lvl<12) cands.push({k:'b:lab',cost,gain:Math.max(T.coinRate,1)*(st.lvl?.02:.12),do:()=>T.buyBuilding('lab',1)}); continue;}
        // available surplus of inputs (being sold)
        let ok=1; for(const k in b.inp){const R=T.rates[k];const raw=T.canSell&&!T.canSell(k);const sur=raw&&S.res[k]>20?1e9:(raw?Math.max(0,R.p-R.c):R.s)/(b.inp[k]*(T.bstat[b.id].speed/Math.max(st.lvl,1)||1)); ok=Math.min(ok,sur);}
        let val=0; for(const k in b.out) val+=b.out[k]*T.price(k); for(const k in b.inp) val-=b.inp[k]*(T.saleValue?T.saleValue(k):T.price(k));
        const sp=st.lvl?T.bstat[b.id].speed/st.lvl:1;
        cands.push({k:'b:'+b.id,cost,gain:Math.max(0,Math.min(1,ok))*val*sp+ (ok<0.3?0:0),do:()=>T.buyBuilding(b.id,1)});}
      for(const u of T.UPGRADES){ const uL=T.upLvl?T.upLvl(u.id):(S.upgrades[u.id]?1:0); if(T.upMax?(uL>=T.upMax(u)||!T.upReqOk(u)||window.BOT_UPLV===false&&uL):S.upgrades[u.id]) continue; if(!u.req()) continue; const plU=['spades','fert','elite','irrig'].includes(u.id); if(plU&&!window.__plNeed) continue; cands.push({k:'u:'+u.id+uL,cost:T.upCost?T.upCost(u):u.cost,gain:Math.max(T.coinRate,1)*(plU?.15:0.25)*(uL?.6:1),do:()=>T.buyUpgrade(u.id)});}
      // v2.22: optional workstation levels beyond the gates (+3..5% each)
      if(T.WS_DEF&&window.BOT_WS!==false) for(const id in T.WS_DEF){const st=S.buildings[id];if(!st||!st.lvl||!T.bstat[id]) continue;const b=T.BUILDINGS.find(x=>x.id===id);let val=0;for(const k in b.out) val+=b.out[k]*T.price(k);
        const pr=Math.max(0,val)*T.bstat[id].speed*Math.min(1,T.bstat[id].f||0);for(let k=0;k<3;k++){const L=T.wsLvl(id,k);if(L>=T.WS_MAX) continue;cands.push({k:'w:'+id+k+L,cost:T.wsCost(id,k),gain:pr*.04,do:()=>T.buyWs(id,k,true)});}}
      // v2.2: premium area (unlock + showroom levels) and stock-area upgrades (+10% speed each)
      if(T.premCost&&window.BOT_PREM!==false&&S.premium.lvl<5){const pc=T.premCost(); if(pc<S.totalEarned*3) cands.push({k:'p:area'+(S.premium.lvl+1),cost:pc,gain:S.premium.lvl?Math.max(T.coinRate,1)*0.1:Math.max(T.coinRate,1)*0.3,do:()=>T.buyPremium()});}
      if(T.buyStorage&&window.BOT_STORAGE!==false) for(const b of T.BUILDINGS){const st=S.buildings[b.id]; if(!st.lvl||T.stoLvl(b.id)>=8) continue; let val=0; for(const k in b.out) val+=b.out[k]*T.price(k); for(const k in b.inp) val-=b.inp[k]*T.price(k);
        cands.push({k:'s:'+b.id+T.stoLvl(b.id),cost:T.stoCost(b.id),gain:Math.max(0,val)*T.bstat[b.id].speed*0.1*Math.min(1,T.bstat[b.id].f||0),do:()=>T.buyStorage(b.id)});}
      // v2.4: managers (hire + level) and the fire station
      if(T.MANAGERS&&window.BOT_MGR!==false) for(const m of T.MANAGERS){const b=T.BUILDINGS.find(x=>x.id===m.bid),st=S.buildings[m.bid];if(!st.lvl) continue;
        let val=0; for(const k in b.out) val+=b.out[k]*T.price(k); for(const k in b.inp) val-=b.inp[k]*T.price(k); const pr=Math.max(0,val)*T.bstat[b.id].speed*Math.min(1,T.bstat[b.id].f||0);
        const l=T.mgrLvl(m.bid); if(!l) cands.push({k:'m:'+m.id,cost:T.mgrHireCost(m),gain:pr*.15,do:()=>T.hireMgr(m.id)});
        else if(l<10){const c=T.mgrUpCost(m,l); if(S.seeds>=c.seeds+5||!c.seeds) cands.push({k:'m:'+m.id+l,cost:c.coins,gain:pr*.05,do:()=>T.levelMgr(m.id)});}}
      if(T.buyStation&&window.BOT_STATION!==false&&T.stationLvl()<5&&S.buildings.kiln.lvl) cands.push({k:'f:station'+T.stationLvl(),cost:T.stationCost(),gain:Math.max(T.coinRate,1)*0.03,do:()=>T.buyStation()});
      // v2.10: power plant (each level +5% to every building while fuelled)
      if(T.buyPower&&window.BOT_POWER!==false&&T.pwUnlocked()&&T.pwLvl()<T.PW_MAX){const pc=T.pwCost(); if(pc<S.totalEarned*3) cands.push({k:'pw:'+(T.pwLvl()+1),cost:pc,gain:Math.max(T.coinRate,1)*.04,do:()=>T.buyPower()});}
      // v2.5: harbour levels + trade routes (research is bought outside this loop)
      if(T.buyHarbor&&window.BOT_V25!==false&&window.BOT_TRADE!==false&&T.harborAvail()&&T.harborLvl()<5){const hc=T.harborCost(); if(hc<S.totalEarned*3) cands.push({k:'h:harbor'+(T.harborLvl()+1),cost:hc,gain:Math.max(T.coinRate,1)*(T.harborLvl()?.04:.1),do:()=>T.buyHarbor()});}
      if(T.openRoute&&window.BOT_V25!==false&&T.harborLvl()) for(const c of T.CITIES){if(T.routeOpen(c.id)||c.cost>S.totalEarned*3) continue; cands.push({k:'r:'+c.id,cost:c.cost,gain:Math.max(T.coinRate,1)*.06,do:()=>T.openRoute(c.id)});}
      const nt=T.TREES[S.tree+1]; if(nt) cands.push({k:'t:'+nt.name,cost:nt.cost,gain:Math.max(T.coinRate,1)*(nt.mult/T.TREES[S.tree].mult-1),do:()=>T.buyTree()});
      cands.forEach(c=>c.r=c.gain/c.cost);
      cands.sort((a,b)=>b.r-a.r);
      const best=cands[0]; if(!best||best.gain<=0) break;
      let pick=null;
      if(S.coins>=best.cost) pick=best;
      else { const alt=cands.find(c=>S.coins>=c.cost&&c.r>=best.r*0.4&&c.gain>0); if(alt&&best.cost-S.coins> T.coinRate*20) pick=alt; }
      if(!pick) break;
      if(!pick.do()) break;
      mark(pick.k,t);
    }
    if(T.S.orders&&T.S.orders.done&&!seen['order#'+T.S.orders.done]) mark('order#'+T.S.orders.done+' done (missed '+T.S.orders.failed+')',t);
    if(T.pendingSeeds()>=1) mark('prestige>=1 seed',t);
    if([60,120,300,600,900,1200,1800,2700,3600].includes(t+1)) snaps.push({t:t+1,coins:Math.round(S.coins),earned:Math.round(S.totalEarned),income:Math.round(T.coinRate),logs:Math.round(T.logRate()),seeds:T.pendingSeeds(),
      cols:Object.entries(S.collectors).filter(x=>x[1]).map(x=>x[0]+':'+x[1]).join(' '),blds:Object.entries(S.buildings).filter(x=>x[1].lvl).map(x=>x[0]+':'+x[1].lvl+'@'+Math.round(T.bstat[x[0]].f*100)+'%').join(' '),
      upg:Object.keys(S.upgrades).length,forest:S.forest?Object.values(S.planters).join('/')+' eff'+Math.round(T.forestEff()*100)+' m'+Math.round(S.forest.m):'',res:S.research?Object.keys(S.research).length:0,rp:Math.round(S.rp||0),trade:S.trade?S.trade.lvl+'/'+Object.keys(S.trade.routes).length+'/'+S.trade.stats.trips+'/'+Math.round(S.trade.stats.earned):'',tree:S.tree,prem:S.premium?S.premium.lvl:0,orders:S.orders?S.orders.done+'/'+(S.orders.done+S.orders.failed):''});
  }
  return {log,snaps};
};
