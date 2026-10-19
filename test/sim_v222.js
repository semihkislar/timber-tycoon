// v2.22 pacing sim: greedy cheapest-first player (buildings incl. the workstations a gate needs, collectors, upgrade levels, trees, planters)
// returns income checkpoints, time spent capped at workstation gates and plank flow. Works on v2.21.1 too (no gates there).
(o)=>{
  window.toast=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{};window.milestoneHit=()=>{};window.save=()=>{};window.rebuildAll=()=>{};
  const gated=typeof wsHas==='function', cons=BUILDINGS.filter(b=>b.inp.planks);
  const bc_=id=>gated?bldNextCost(id):bulkCost(BMAP[id].cost,BMAP[id].scale,S.buildings[id].lvl,1);
  const upOk=u=>typeof upMax==='function'?upLvl(u.id)<upMax(u)&&upReqOk(u):!S.upgrades[u.id]&&(!u.req||u.req());
  const buy=()=>{for(let g=0;g<20&&forestEff()<.97;g++){let bi=null,bc=Infinity;for(const p of PLANTERS){const c=plCost(p.id,1)/p.rate;if(c<bc){bc=c;bi=p.id;}}if(plCost(bi,1)>S.coins||!buyPlanter(bi,1)) break;}
    if(S.collectors.lumberjack===0) buyCollector('lumberjack',1);if(typeof sawLogsOk==='function'&&sawLogsOk()) buyBuilding('sawmill',1,{logsOnly:true});
    let n=0;for(let g=0;g<300;g++){let best=null,bc=Infinity,kind='';
      for(const b of BUILDINGS){if(!bldUnlocked(b.id)||(b.id==='sawmill'&&typeof sawByLogs==='function'&&sawByLogs())) continue;const c=bc_(b.id);if(c<bc){bc=c;kind='b';best=()=>buyBuilding(b.id,1,{wsAuto:true});}}
      for(const c of COLLECTORS){const k=colCost(c.id,S.collectors[c.id],1);if(k<bc){bc=k;kind='c';best=()=>buyCollector(c.id,1);}}
      for(const u of UPGRADES){if(!upOk(u)) continue;const k=upCost(u);if(k<bc){bc=k;kind='u';best=()=>buyUpgrade(u.id);}}
      const nx=TREES[S.tree+1];if(nx&&treeCost(nx)<bc){bc=treeCost(nx);kind='t';best=()=>buyTree();}
      if(!best||bc>S.coins) break;if(!best()){R.fail++;break;}n++;if(kind==='u') R.upBuys++;}
    return n;};
  const R={reach:{},waits:[],cp:{},fail:0,upBuys:0,blockedS:0,longest:0,gatesPassed:0,idleMax:0,plank:{want:0,got:0,starve:0,t:0}};
  const since={};let T=0,lastBuy=0;
  while(T<o.min*60){
    if(S.totalEarned<2e4) for(let c=0;c<3;c++) chop();
    tick(1,false);T++;
    if(T%10===0) for(const b of BUILDINGS){const l=S.buildings[b.id].lvl;for(const m of [26,51,101]) if(l>=m&&R.reach[b.id+m]===undefined) R.reach[b.id+m]=Math.round(T/6)/10;}
    if(T%2===0){if(buy()>0) lastBuy=T;R.idleMax=Math.max(R.idleMax,T-lastBuy);}
    if(gated) for(const id in WS_DEF){const b=wsBlocked(id);if(b){R.blockedS++;if(since[id]===undefined) since[id]=T;}else if(since[id]!==undefined){R.longest=Math.max(R.longest,T-since[id]);R.gatesPassed++;R.waits.push(id+'@'+S.buildings[id].lvl+':'+(T-since[id])+'s');delete since[id];}}
    if(T>=180){let w=0,g=0,st=0;for(const b of cons){const s=S.buildings[b.id];if(!s.lvl||!s.on) continue;const bs=bstat[b.id];const x=b.inp.planks*bs.speed*(typeof mgrIn==='function'?mgrIn(b.id):1)*(typeof bInMult==='function'?bInMult(b.id)/Math.max(1e-9,typeof mgrIn==='function'?mgrIn(b.id):1):1);w+=x;g+=x*(bs.lim==='planks'?bs.f:1);if(bs.lim==='planks'&&bs.fs<.9) st=1;}
      R.plank.want+=w;R.plank.got+=g;R.plank.starve+=st;R.plank.t++;}
    if(o.cps.includes(T/60)) R.cp[T/60]={rate:+coinRate.toPrecision(3),earned:+S.totalEarned.toPrecision(3),saw:S.buildings.sawmill.lvl,carp:S.buildings.carpentry.lvl,
      ws:gated?Object.values(S.ws).reduce((a,w)=>a+w[0]+w[1]+w[2],0):0,up:typeof upLvl==='function'?UPGRADES.reduce((a,u)=>a+upLvl(u.id),0):Object.keys(S.upgrades).length};
  }
  for(const id in since){R.longest=Math.max(R.longest,T-since[id]);R.waits.push(id+'@'+S.buildings[id].lvl+':'+(T-since[id])+'s(open)');}
  R.supply=R.plank.want?+(R.plank.got/R.plank.want).toFixed(3):1;R.starve=+(R.plank.starve/Math.max(1,R.plank.t)).toFixed(3);delete R.plank;
  R.blockedShare=+(R.blockedS/Math.max(1,T)).toFixed(3);   // building-seconds capped / sim seconds (summed over buildings)
  R.lv=Object.fromEntries(BUILDINGS.filter(b=>S.buildings[b.id].lvl).map(b=>[b.id,S.buildings[b.id].lvl]));
  return R;
}
