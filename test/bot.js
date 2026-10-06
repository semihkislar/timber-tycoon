// greedy bot run in page; returns milestone log
window.runBot=function(totalSec,clickPerSec,clickUntil){
  const T=window.TT; const log=[]; const seen={};
  const mark=(k,t)=>{if(!seen[k]){seen[k]=t;log.push([Math.round(t),k]);}};
  const snaps=[];
  for(let t=0;t<totalSec;t++){
    if(t<clickUntil) for(let i=0;i<clickPerSec;i++) T.chop();
    T.simulate(1,0.25);
    const S=T.S;
    // purchases loop
    for(let guard=0;guard<20;guard++){
      const lr=T.logRate(); const cpl=lr>0?Math.max(T.price('logs'),T.coinRate/Math.max(lr,1)):1;
      const cands=[];
      for(const c of T.COLLECTORS){const own=S.collectors[c.id];const cost=T.bulkCost(c.cost,T.COL_SCALE,own,1);
        if(cost>S.totalEarned*3+200) continue; cands.push({k:'c:'+c.id,cost,gain:T.logRate()>=0?(c.rate*cpl):0,do:()=>T.buyCollector(c.id,1)});}
      for(const b of T.BUILDINGS){const st=S.buildings[b.id];const cost=T.bulkCost(b.cost,b.scale,st.lvl,1);
        if(cost>S.totalEarned*3+200) continue;
        // available surplus of inputs (being sold)
        let ok=1; for(const k in b.inp){const R=T.rates[k];const sur=R.s/(b.inp[k]*(T.bstat[b.id].speed/Math.max(st.lvl,1)||1)); ok=Math.min(ok,sur);}
        let val=0; for(const k in b.out) val+=b.out[k]*T.price(k); for(const k in b.inp) val-=b.inp[k]*T.price(k);
        const sp=st.lvl?T.bstat[b.id].speed/st.lvl:1;
        cands.push({k:'b:'+b.id,cost,gain:Math.max(0,Math.min(1,ok))*val*sp+ (ok<0.3?0:0),do:()=>T.buyBuilding(b.id,1)});}
      for(const u of T.UPGRADES){ if(S.upgrades[u.id]||!u.req()) continue; cands.push({k:'u:'+u.id,cost:u.cost,gain:Math.max(T.coinRate,1)*0.25,do:()=>T.buyUpgrade(u.id)});}
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
    if(T.pendingSeeds()>=1) mark('prestige>=1 seed',t);
    if([60,120,300,600,900,1200,1800,2700,3600].includes(t+1)) snaps.push({t:t+1,coins:Math.round(S.coins),earned:Math.round(S.totalEarned),income:Math.round(T.coinRate),logs:Math.round(T.logRate()),seeds:T.pendingSeeds(),
      cols:Object.entries(S.collectors).filter(x=>x[1]).map(x=>x[0]+':'+x[1]).join(' '),blds:Object.entries(S.buildings).filter(x=>x[1].lvl).map(x=>x[0]+':'+x[1].lvl+'@'+Math.round(T.bstat[x[0]].f*100)+'%').join(' '),
      upg:Object.keys(S.upgrades).length,tree:S.tree});
  }
  return {log,snaps};
};
