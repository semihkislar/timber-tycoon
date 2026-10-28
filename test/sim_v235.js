// v2.35 blueprint pacing sim: the same Replant played by a greedy player (buys the cheapest thing every 2 s, all coins)
// and by the blueprint office alone (plan = the factory at the end of the previous run), at the same forest value.
(o)=>{
  window.toast=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{};window.milestoneHit=()=>{};window.save=()=>{};window.rebuildAll=()=>{};
  const quiet=()=>{S.events=[];S.nextEvent=S.time+1e12;S.fires={};S.fireCool=1e12;if(S.mish) S.mish.next=S.time+1e12;S.orders.next=S.time+1e12;S.orders.chNext=S.time+1e12;};
  const greedy=()=>{for(let g=0;g<20&&forestEff()<.97;g++){let bi=null,bc=Infinity;for(const p of PLANTERS){const c=plCost(p.id,1)/p.rate;if(c<bc){bc=c;bi=p.id;}}if(plCost(bi,1)>S.coins||!buyPlanter(bi,1)) break;}
    if(S.collectors.lumberjack===0) buyCollector('lumberjack',1);if(sawLogsOk()) buyBuilding('sawmill',1,{logsOnly:true});
    let n=0;for(let g=0;g<200;g++){let best=null,bc=Infinity;
      for(const b of BUILDINGS){if(!bldUnlocked(b.id)||(b.id==='sawmill'&&sawByLogs())) continue;const c=bldNextCost(b.id);if(c<bc){bc=c;best=()=>buyBuilding(b.id,1,{wsAuto:true});}}
      for(const c of COLLECTORS){const k=colCost(c.id,S.collectors[c.id],1);if(k<bc){bc=k;best=()=>buyCollector(c.id,1);}}
      for(const u of UPGRADES){if(upLvl(u.id)>=upMax(u)||!upReqOk(u)) continue;if(upCost(u)<bc){bc=upCost(u);best=()=>buyUpgrade(u.id);}}
      const nx=TREES[S.tree+1];if(nx&&treeCost(nx)<bc){bc=treeCost(nx);best=()=>buyTree();}
      if(!best||bc>S.coins||!best()) break;n++;}
    return n;};
  const lv=()=>BUILDINGS.reduce((a,b)=>a+S.buildings[b.id].lvl,0)+COLLECTORS.reduce((a,c)=>a+S.collectors[c.id],0);
  const ratio=()=>{let c=Infinity;for(const b of BUILDINGS){if(!bldUnlocked(b.id)||(b.id==='sawmill'&&sawByLogs())) continue;c=Math.min(c,bulkCost(b.cost,b.scale,S.buildings[b.id].lvl,1));}return c/Math.max(1e-9,coinRate);};
  const R0=Math.random;let seed=o.seed||12345;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};Math.random=rnd;
  // 1. build the "previous run": greedy play for o.prevMin minutes from a fresh game (+ an optional Legacy head start)
  S=freshState();if(o.legacy){S.legacy=o.legacy;S.seeds=0;S.prestiges=3;for(const [k,v] of Object.entries(o.shop||{})) S.shop[k]=v;rpStartRun();}
  M=computeMods();quiet();
  for(let T=0;T<o.prevMin*60;T++){if(S.totalEarned<2e4) for(let c=0;c<3;c++) chop();tick(1,false);if(T%2===0) greedy();}
  S.research.science=1;S.research.blueprint=1;if(o.master) S.research.masterplan=1;S.prestiges=Math.max(1,S.prestiges);M=computeMods();
  bpCapture(0);const plan=JSON.parse(JSON.stringify(bpPlan()));
  if(pendingSeeds()<1) S.totalEarned=Math.max(S.totalEarned,RPC.first*cs()*4);
  const S0=JSON.stringify(S);
  const out={plan:{n:Object.keys(plan.b).length,lv:Object.values(plan.b).reduce((a,x)=>a+x,0)},modes:{}};
  for(const mode of o.modes){
    seed=o.seed||12345;Math.random=rnd;   // the same luck (events, weather, candidates) for every mode
    S=JSON.parse(S0);S=sanitizeState(merge(freshState(),S));M=computeMods();bpState();
    doPrestige();quiet();M=computeMods();
    const B=bpB();B.run=mode!=='greedy';B.budget=mode==='bp100'?1:mode==='bp25'?.25:.5;
    const R={mode,cs:cs(),earned:{},lv60:0,ratio:[],first:[],full:null,minCost:Infinity,steps:0};const lv0=lv();
    const marks=new Set(o.marks.map(m=>m*60));
    for(let T=1;T<=o.runMin*60;T++){
      if(S.totalEarned<2e4) for(let c=0;c<3;c++) chop();
      // what the queue would buy next: never a tiny number (only free first lumberjack / log-built sawmill may be 0)
      if(B.run&&T%5===0){const s=bpSteps()[0];if(s&&s.cost>0) R.minCost=Math.min(R.minCost,s.cost/(cs()));}
      tick(1,false);
      if(mode==='greedy'&&T%2===0) greedy();
      if(T===60) R.lv60=lv()-lv0;
      if(T%30===0&&T<=600) R.ratio.push(+ratio().toFixed(2));
      if(R.full===null&&B.run&&!bpLeft()) R.full=T;
      if(marks.has(T)) R.earned[T/60]=+S.totalEarned.toPrecision(4);
    }
    R.rMed=R.ratio.slice(2).sort((a,b)=>a-b)[Math.floor((R.ratio.length-2)/2)];R.steps=B.stats.steps;R.prog=+bpProgress().k.toFixed(3);R.coinsLeft=+S.coins.toPrecision(3);
    R.saw=S.buildings.sawmill.lvl;delete R.ratio;
    out.modes[mode]=R;
  }
  Math.random=R0;return out;
}
