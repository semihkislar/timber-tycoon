// multi-run prestige sim
(o)=>{
  window.toast=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{};window.milestoneHit=()=>{};window.save=()=>{};window.rebuildAll=()=>{};
  const H=o.hook?eval('('+o.hook+')'):{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),spend:()=>{},want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=120};
  const buy=()=>{if(H.hold&&H.hold()) return 0;for(let g=0;g<20&&forestEff()<.97;g++){let bi=null,bc=Infinity;for(const p of PLANTERS){const c=plCost(p.id,1)/p.rate;if(c<bc){bc=c;bi=p.id;}}if(plCost(bi,1)>S.coins||!buyPlanter(bi,1)) break;}
    if(typeof colCost==='function'&&S.collectors.lumberjack===0) buyCollector('lumberjack',1);if(typeof sawLogsOk==='function'&&sawLogsOk()) buyBuilding('sawmill',1,{logsOnly:true});   // v2.20.1
    let n=0;for(let g=0;g<200;g++){let best=null,bc=Infinity;
      for(const b of BUILDINGS){if(!bldUnlocked(b.id)||(b.id==='sawmill'&&typeof sawByLogs==='function'&&sawByLogs())) continue;const c=bulkCost(b.cost,b.scale,S.buildings[b.id].lvl,1);if(c<bc){bc=c;best=()=>buyBuilding(b.id,1);}}
      for(const c of COLLECTORS){const k=typeof colCost==='function'?colCost(c.id,S.collectors[c.id],1):bulkCost(c.cost,COL_SCALE,S.collectors[c.id],1);if(k<bc){bc=k;best=()=>buyCollector(c.id,1);}}
      for(const u of UPGRADES){if(S.upgrades[u.id]) continue;if(u.req&&!u.req()) continue;if(upCost(u)<bc){bc=upCost(u);best=()=>buyUpgrade(u.id);}}
      const nx=TREES[S.tree+1];if(nx&&treeCost(nx)<bc){bc=treeCost(nx);best=()=>buyTree();}
      if(!best||bc>S.coins||!best()) break;n++;}
    return n;};
  const runs=[];
  for(let r=0;r<o.runs;r++){
    H.spend();
    const R={run:r+1,cur0:H.cur(),buys60:0,firstCarp:null,firstFurn:null,hit1e7:null,ratio:[]};
    let T=0;
    while(T<o.maxMin*60){
      if(S.totalEarned<2e4) for(let c=0;c<3;c++) chop();
      tick(1,false);T++;
      if(T%2===0){const n=buy();if(T<=60) R.buys60+=n;}
      if(T%30===0&&T<=600){let c=Infinity;for(const b of BUILDINGS){if(!bldUnlocked(b.id)) continue;c=Math.min(c,bulkCost(b.cost,b.scale,S.buildings[b.id].lvl,1));}
        R.ratio.push(+(c/Math.max(1e-9,coinRate)).toFixed(2));}
      if(R.firstCarp===null&&S.buildings.carpentry.lvl>0) R.firstCarp=T;
      if(R.firstFurn===null&&S.buildings.furniture.lvl>0) R.firstFurn=T;
      if(R.hit1e7===null&&S.totalEarned>=1e7) R.hit1e7=T;
      if(T%10===0&&H.want(H.gain(),H.cur(),T)) break;
    }
    R.min=Math.round(T/6)/10;R.gain=H.gain();R.earned=+S.totalEarned.toPrecision(3);R.saw=S.buildings.sawmill.lvl;R.furn=S.buildings.furniture.lvl;
    R.lv60s=R.buys60;R.r0=R.ratio.slice(0,4);R.rMed=R.ratio.slice().sort((a,b)=>a-b)[Math.floor(R.ratio.length/2)];delete R.ratio;delete R.buys60;
    if(o.extra) R.x=eval(o.extra);
    runs.push(R);
    if(!H.prestige()){R.note='no prestige';break;}
  }
  return runs;
}
