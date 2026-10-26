'use strict';
/* ===================== v2.21 Town Market Fleet =====================
   Small delivery vans that make auto-sell / market sales visible near Phase 1–2 stock piles.
   Separate from dockTrucks (shipping yard) and couriers (daily contracts). Cosmetic only —
   does not change coinRate, flowEdges, or log sell rules. */

const MKT_COLS=[
  ['#6a9ab8','#f2eee4','#5a8aa0'],
  ['#7a9a6a','#f0f2e8','#5a7a4a'],
  ['#b88a6a','#f4efe6','#9a6a4a'],
  ['#8a7ab0','#f1eef6','#6a5a9a'],
  ['#c09060','#f6f0e4','#a07040']
];
function mktFleetWant(){
  if(!(coinRate>0.05)) return 0;
  if(coinRate<8) return 1;
  if(coinRate<80) return 2;
  if(coinRate<800) return 2;
  return 3;
}
function mktSellBids(){
  const out=[];
  for(const b of MAIN_BLD){
    if(!S.buildings[b.id]||!S.buildings[b.id].lvl||!S.buildings[b.id].on) continue;
    const L=LOTS[b.id]; if(!L||L.prem) continue; if(L.ci+L.cj>MKT_LANE_END+1) continue;   // v2.33: the Panel Press (past the south gate) ships by forklift only
    let best=null,bestS=0;
    for(const k in b.out){ if(!canSell(k)) continue; const s=(rates[k]&&rates[k].s)||0; const as=!!S.autosell[k];
      if((as||s>0.01)&&s+ (as?0.1:0)>=bestS){best=k;bestS=s+(as?0.1:0);} }
    if(best) out.push({bid:b.id,res:best});
  }
  return out;
}
function mktPickupOf(bid){
  const L=LOTS[bid]; if(!L) return [12,12];
  const end=convOf(L).end;
  // apron just south of the stock / conveyor end (not the dock bay road)
  if(L.side==='R') return [end[0]+1.05, end[1]+.65];
  return [end[0]+.65, end[1]+1.05];
}
/* v2.27: vans use the factory lane (in from the highway at the south end of the lane, out the same way) instead of cutting
   across the helper strip on the right or the Phase II/III columns. In on the outer side of the lane, out on the inner side,
   so a van never meets itself; forklifts keep the middle (±0.55). */
const MKT_LANE_END=63.6;   // v2.28: the lane runs on to the Beam Saw / Glulam row; vans use the south gate road (SGATE_J) to the highway
function mktVanLegs(pick, fromEast){
  const [pi,pj]=pick, u=pi+pj, sg=(pi-pj)>=0?1:-1, vin=sg*1.65, vout=sg*1.05, uu=Math.min(u,MKT_LANE_END-2), G=SGATE_J;
  const hold=(v,dt)=>{const sell=coinRate>0.05;v.load=Math.min(1,(v.load||0)+dt*(sell?.7:.12));return v.load<1||v.wait<(sell?1.4:2.4);};
  return [
    {pa:crPath([[hwN(G+9),G+9],[hwN(G+1.6),G+1.6],[hwN(G)-.9,G+.35],[33.4,G+.35],lpt(MKT_LANE_END,vin),lpt(uu+1.2,vin),[pi,pj]],8),vmax:3.1},
    {pa:densePath([[pi,pj],[pi+.001,pj]]),vmax:.45,hold},
    {pa:crPath([[pi,pj],lpt(uu+1.6,vout),lpt(MKT_LANE_END,vout),[33.4,G-.35],[hwS(G)-1.2,G-.35],[hwS(G),G+.9],[hwS(58),58]],8),vmax:3.5}
  ];
}
function mkMktVan(slot){
  const sells=mktSellBids(); const pick=sells.length?sells[slot%sells.length]:{bid:'sawmill',res:'planks'};
  const pt=mktPickupOf(pick.bid); const fromEast=(slot%2)===1;
  const c=MKT_COLS[slot%MKT_COLS.length];
  // early game: canvas cart until a few buildings are up / income is tiny
  const built=MAIN_BLD.filter(b=>S.buildings[b.id].lvl>0).length;
  const cart=built<3||coinRate<2;
  const v={kind:'mkt',legs:mktVanLegs(pt,fromEast),li:0,s:0,v:0,col:c[0],box:c[1],stripe:c[2],load:0,cargo:pick.res,bid:pick.bid,cart,logo:cart?'CART':'TOWN',acc:0};
  return v;
}
function mktFleetSync(){
  if(!scene.marketVans) scene.marketVans=[];
  const want=mktFleetWant();
  // spawn gently: at most one new van per sync when under target; drop finished ones
  scene.marketVans=scene.marketVans.filter(v=>!v.done);
  if(want===0) return;
  if(scene.marketVans.length<want&&(!scene._mktCD||scene._mktCD<=0)){
    scene._mktN=(scene._mktN||0)+1; scene.marketVans.push(mkMktVan(scene.marketVans.length+scene._mktN));
    scene._mktCD=2.2+Math.random()*1.8;
  }
}
function mktFleetUpdate(dt){
  if(scene._mktCD>0) scene._mktCD-=dt;
  mktFleetSync();
  const selling=coinRate>0.05;
  const earnShare=selling&&scene.marketVans.length? (Math.max(0,(S.totalEarned-(scene._mktLastEarn||S.totalEarned))) / Math.max(1,scene.marketVans.filter(v=>v.li===1).length||1)) :0;
  scene._mktLastEarn=S.totalEarned;
  for(const v of scene.marketVans){
    const wasLi=v.li;
    if(v.li===1) v.acc=(v.acc||0)+earnShare;
    stepVeh(v,dt);
    if(wasLi===1&&v.li===2){
      const p=P(v.i,v.j,42); const amt=Math.max(v.acc||0, coinRate*1.2);
      if(amt>0.4) scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(amt),coin:true,t:0,dur:1.4,col:'#ffe08a'});
      v.acc=0;
    }
    // when not selling, vans already loading finish slowly then leave; idle vans waiting to load turn around faster
    if(!selling&&v.li===1&&v.load>.15){ /* let hold finish via load climb */ }
  }
  scene.marketVans=scene.marketVans.filter(v=>!v.done);
  // if we want 0, let remaining vans finish their current trip (don't despawn mid-route)
}
function mktFleetDraw(ctx,objs,inView){
  for(const v of scene.marketVans||[]){
    if(v.i===undefined) continue; const [x,y]=P(v.i,v.j); if(!inView(x,y,90)) continue;
    objs.push({k:v.i+v.j,f:()=>{
      const st=mktVan(ctx,v.i,v.j,v.yaw,{col:v.col,box:v.box,stripe:v.stripe,load:v.load,cargo:v.cargo,cart:v.cart,logo:v.logo,brake:v.brake,bounce:0});
      exhaust(st,v);
    }});
  }
}
