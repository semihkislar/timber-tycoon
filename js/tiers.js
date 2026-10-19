'use strict';
/* ===================== v2.20 FACTORY TIERS =====================
   Phase 1 (primary, right side of the lane): logs only → planks, veneer + bark, chips, charcoal (+ glue).
   Phase 2 (secondary, left side + Plywood Mill): fed only by phase-1 goods → chairs, pellets, paper, furniture, plywood.
   Phase 3 (premium area, toy workshop, boat yard): fed only by phase-2 goods.
   Every tier can export; value per unit rises by tier. Forklifts shuttle pallets across the lane from phase 1 to phase 2.
   Design: docs/tiers-v2.20.md */
const BTIER={peeler:1,sawmill:1,chipper:1,kiln:1, carpentry:2,pellet:2,paper:2,furniture:2,plymill:2,
  atelier:3,parquet:3,stationer:3,cabinetry:3,showroom:3,toyshop:3,boatyard:3, lab:0};
const TIER_N=['Raw','Phase 1 · Primary','Phase 2 · Secondary','Phase 3 · Premium'];
const TIER_S=['Raw','I','II','III'];
const TIER_C=['#8a6a48','#c8742e','#3f86c8','#a8508a'];
const TIER_D=['raw material · not for sale, feeds Phase 1','from logs only · exports start here','made from phase-1 goods','made from phase-2 goods'];
function resTier(k){if(k==='logs') return 0;if(k==='glue') return 1;const b=BUILDINGS.find(b=>b.out[k]);return b?(BTIER[b.id]||0):0;}
/* every building may only take goods from exactly the tier below (lab excepted) */
function tierViolations(){const v=[];for(const b of BUILDINGS){const t=BTIER[b.id];if(!t) continue;for(const k in b.inp){const rt=resTier(k);if(rt!==t-1) v.push(`${b.id}:${k}(${rt})`);}}return v;}
/* processing margin per second: goods out minus what the inputs would sell for raw */
function bMargin(id){const b=BMAP[id],bs=bstat[id];if(!b||!bs||!S.buildings[id].lvl) return 0;const sp=(bs.speed||0)*(bs.f||0);
  let o=0,i=0;for(const k in b.out) o+=b.out[k]*price(k)*bOutMult(id);for(const k in b.inp) i+=b.inp[k]*saleValue(k)*bInMult(id);return (o-i)*sp;}
function unitMargin(id){const b=BMAP[id];let o=0,i=0;for(const k in b.out) o+=b.out[k]*RMAP[k].price;for(const k in b.inp) i+=b.inp[k]*(canSell(k)?RMAP[k].price:0);const n=Object.values(b.out).reduce((a,x)=>a+x,0)||1;return (o-i)/n;}
function tierBadge(id){const t=BTIER[id];return t?`<span class="tier-b t${t}" title="${TIER_N[t]}">${TIER_S[t]}</span>`:'';}
function tierIntro(){if(S.tierNote) return;S.tierNote=1;
  if((S.totalEarned||0)>1e4||(S.prestiges||0)>0) setTimeout(()=>toast('🏭 <b>Factory tiers!</b> Phase 1 (right) turns logs into planks, veneer, chips & charcoal · Phase 2 (left) uses only those · the Premium Area uses only phase-2 goods. New: 📃 Veneer Peeler.',7000,'ms-toast'),2500);}
/* ---------- scene: the Veneer Peeler (rotary lathe shed) ---------- */
function bPeeler(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#a9b08a',roof='#4f7a52',h=26+ms*4;
  bShadow(ctx,B.i0,B.j0,B.i1,B.j1,.24);
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{top:false});
  wallFace(ctx,B,lf,0,h,wall,'plank');wallFace(ctx,B,of,0,h,wall,'plank');
  fillP(ctx,fq(lf,fK(B,lf),fA(B,lf,0),fA(B,lf,1),0,2.5),'#6a7050');
  fillP(ctx,fq(of,fK(B,of),fA(B,of,0),fA(B,of,1),0,2.5),'#5a6044');
  rollerDoor(ctx,B,lf,.08,.52,h-10,true);
  winFramed(ctx,B,of,.15,.22,h-17,10,true);winFramed(ctx,B,of,.58,.22,h-17,10,true);
  if(ms>=1) winFramed(ctx,B,lf,.62,.2,h-15,9,true);
  const ax=lf==='I'?'i':'j',top=roofGable(ctx,B.i0,B.j0,B.i1,B.j1,h,18+ms,ax,roof,wall,'tile');
  signBand(ctx,B,of,h-8,5,'VENEER','#2f4a30','#f2f6e4');
  // the log spinning on the lathe in the open bay, a veneer ribbon peeling off
  ctx.save();fxf(ctx,lf,fK(B,lf)+(lf==='I'?.06:0),fA(B,lf,.3),9);
  const ang=run?t*6:0;ctx.fillStyle='#b07a42';ctx.beginPath();ctx.arc(0,0,8.5,0,TAU);ctx.fill();ctx.strokeStyle='#6b4226';ctx.lineWidth=1;ctx.stroke();
  ctx.strokeStyle='#d9b77e';ctx.lineWidth=.8;for(let r=2.5;r<8;r+=2.2){ctx.beginPath();ctx.arc(0,0,r,ang,ang+4.6);ctx.stroke();}
  ctx.fillStyle='#ecd3a2';ctx.beginPath();ctx.moveTo(7.5,-2);ctx.quadraticCurveTo(14,-1,17,4+Math.sin(t*5)*.8);ctx.lineTo(16,6);ctx.quadraticCurveTo(12,2,7.5,2);ctx.closePath();ctx.fill();
  ctx.restore();
  if(run&&Math.random()<scene.dtF*4){const p=fPt(B,lf,.32,4,.15);emitP(p[0],p[1],'dust');}
  // stacked veneer sheets beside the shed
  const si=of==='J'?B.i0+.2:B.i1+.15, sj=of==='J'?B.j1+.15:B.j0+.2, n=2+Math.min(4,ms);
  for(let k=0;k<n;k++) box(ctx,si,sj,si+(of==='J'?.7:.42),sj+(of==='J'?.42:.7),k*1.6,k*1.6+1.4,k%2?'#e2c48c':'#ecd3a2',{});
  tierExtras(ctx,L,B,ms,h,top,wall,roof,'plank','#7ab04a');
  return top+10;
}
if(typeof BDRAW==='object') BDRAW.peeler=bPeeler;
/* ---------- scene: forklifts shuttling pallets from phase 1 to phase 2 ---------- */
function tierLinks(){const out=[];
  for(const b of MAIN_BLD){if(BTIER[b.id]!==2||!S.buildings[b.id].lvl) continue;
    for(const k in b.inp){const src=SRC_OF[k];if(!src||BTIER[src]!==1||!S.buildings[src].lvl||!LOTS[src]||!LOTS[b.id]) continue;
      const bs=bstat[b.id],rate=bs?b.inp[k]*(bs.speed||0)*(bs.f||0):0;out.push({src,dst:b.id,k,rate});}}
  return out;}
function tierLiftsFor(rate){return rate<=0?0:rate<500?1:2;}   // ≤ 2 per link keeps the sprite cache warm
function syncTierLifts(){
  const L=tierLinks(),sig=L.map(l=>l.src+'>'+l.dst+':'+tierLiftsFor(l.rate)).join(',');
  if(scene._tsig===sig) return; scene._tsig=sig; const old=scene.tierLifts||[]; scene.tierLifts=[];
  for(const l of L){const n=tierLiftsFor(l.rate);for(let k=0;k<n;k++){
    const from=convOf(LOTS[l.src]).end,to=doorOf(LOTS[l.dst]),off=(k-1)*.42+(l.k.length%3-1)*.18;
    const prev=old.find(o=>o.src===l.src&&o.dst===l.dst&&o.k===k);
    scene.tierLifts.push({src:l.src,dst:l.dst,k,res:l.k,p:prev?prev.p:Math.random()*2,path:mkPath([from,lanePt(from,off),lanePt(to,off),to])});}}
}
function tierLiftTick(dt){if(!scene.tierLifts) scene.tierLifts=[];if(!scene._tl||scene.t-scene._tl>1.5){scene._tl=scene.t;syncTierLifts();}
  const v=(typeof shForkSpeed==='function'?shForkSpeed():1.7)*.8;
  for(const fl of scene.tierLifts){fl.p=(fl.p+dt*v/fl.path.tot)%2;const f=fl.p<1?fl.p:2-fl.p;const q=pathAt(fl.path,f),sg=fl.p<1?1:-1;
    fl.i=q[0];fl.j=q[1];if(Math.abs(q[2])+Math.abs(q[3])>1e-6){const y=Math.atan2(q[3]*sg,q[2]*sg);fl.yaw=Math.round(y/(Math.PI/8))*(Math.PI/8);}fl.ph=(fl.ph||0)+dt*6;}}
function tierLiftDraw(ctx,objs,inView){for(const fl of (scene.tierLifts||[])){if(fl.i===undefined) continue;const [x,y]=P(fl.i,fl.j);if(!inView(x,y,40)) continue;
  objs.push({k:fl.i+fl.j,f:()=>forklift(ctx,fl.i,fl.j,fl.yaw||0,fl.p<1?fl.res:null,0)});}}
/* ---------- scene: phase signs at the head of each side of the lane ---------- */
const TIER_SIGNS=[{i:8.7,j:6.0,t:1,txt:'PHASE 1 · PRIMARY'},{i:6.0,j:8.7,t:2,txt:'PHASE 2 · SECONDARY'},
  {i:uvIJ(PROW.u0-.9,PROW.va)[0],j:uvIJ(PROW.u0-.9,PROW.va)[1],t:3,txt:'PHASE 3 · PREMIUM',show:()=>premVisible()||S.premium.lvl>0}];   // v2.21.1: head of row III
function tierSignDraw(ctx,objs,inView){
  if(!MAIN_BLD.some(b=>S.buildings[b.id].lvl>0)) return;
  for(const s of TIER_SIGNS){if(s.show&&!s.show()) continue;const [x,y]=P(s.i,s.j);if(!inView(x,y,80)) continue;
    objs.push({k:1e6,f:()=>{const [bx,by]=P(s.i,s.j,0);ctx.save();ctx.fillStyle='#5a4028';ctx.fillRect(bx-13,by-26,2.4,26);ctx.fillRect(bx+11,by-26,2.4,26);
      ctx.font='900 8.5px system-ui,sans-serif';const w=ctx.measureText(s.txt).width+12;ctx.fillStyle=TIER_C[s.t];ctx.strokeStyle='#2a1c10';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(bx-w/2,by-40,w,15,3):ctx.rect(bx-w/2,by-40,w,15);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.txt,bx,by-32.3);ctx.restore();}});}
}
