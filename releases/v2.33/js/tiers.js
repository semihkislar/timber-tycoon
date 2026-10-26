'use strict';
/* ===================== v2.20 FACTORY TIERS =====================
   Phase 1 (primary, right side of the lane): logs only → planks, veneer + bark, chips, charcoal (+ glue).
   Phase 2 (secondary, left side + Plywood Mill): fed only by phase-1 goods → chairs, pellets, paper, furniture, plywood.
   Phase 3 (premium area, toy workshop, boat yard): fed only by phase-2 goods.
   Every tier can export; value per unit rises by tier. Forklifts shuttle pallets across the lane from phase 1 to phase 2.
   Design: docs/tiers-v2.20.md */
const BTIER={peeler:1,sawmill:1,chipper:1,kiln:1,beamsaw:1, carpentry:2,pellet:2,paper:2,furniture:2,glulam:2,panelpress:2,plymill:2,
  atelier:3,parquet:3,stationer:3,cabinetry:3,showroom:3,framer:3,decorstudio:3,toyshop:3,boatyard:3, lab:0};   // v2.28: Beam Saw (I), Glulam Plant (II), Timber-frame Houses (III)
const TIER_N=['Raw','Phase 1 · Primary','Phase 2 · Secondary','Phase 3 · Premium'];
const TIER_S=['Raw','I','II','III'];
const TIER_C=['#8a6a48','#c8742e','#3f86c8','#a8508a'];
const TIER_D=['raw material · not for sale, feeds Phase 1','from logs only · exports start here','made from phase-1 goods','made from phase-2 goods'];
function resTier(k){if(k==='logs') return 0;if(k==='glue') return 1;const b=BUILDINGS.find(b=>b.out[k]);return b?(BTIER[b.id]||0):0;}
/* every building may only take goods from exactly the tier below (lab excepted) */
function tierViolations(){const v=[];for(const b of BUILDINGS){const t=BTIER[b.id];if(!t) continue;for(const k in b.inp){const rt=resTier(k);if(rt!==t-1) v.push(`${b.id}:${k}(${rt})`);}}return v;}
/* processing margin per second: goods out minus what the inputs would sell for raw */
function bMargin(id){const b=BMAP[id],bs=bstat[id];if(!b||!bs||!S.buildings[id].lvl) return 0;const sp=(bs.speed||0)*(bs.f||0);
  let o=0,i=0;for(const k in b.out) o+=b.out[k]*price(k)*bOutK(id,k);for(const k in b.inp) i+=b.inp[k]*saleValue(k)*bInMult(id);return (o-i)*sp;}
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
// v2.28: Beam Saw (phase 1) — logs squared into heavy timber beams on a twin band saw
function bBeamSaw(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#b9a27a',roof='#7a4a2c',h=24+ms*4;
  bShadow(ctx,B.i0,B.j0,B.i1,B.j1,.24);
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{top:false});
  wallFace(ctx,B,lf,0,h,wall,'plank');wallFace(ctx,B,of,0,h,wall,'plank');
  fillP(ctx,fq(lf,fK(B,lf),fA(B,lf,0),fA(B,lf,1),0,2.5),'#7a6444');fillP(ctx,fq(of,fK(B,of),fA(B,of,0),fA(B,of,1),0,2.5),'#6a5638');
  rollerDoor(ctx,B,lf,.08,.56,h-9,true);
  winFramed(ctx,B,of,.2,.22,h-16,9,true);winFramed(ctx,B,of,.6,.22,h-16,9,true);
  if(ms>=1) winFramed(ctx,B,lf,.68,.18,h-14,8,true);
  const ax=lf==='I'?'i':'j',top=roofGable(ctx,B.i0,B.j0,B.i1,B.j1,h,15+ms,ax,roof,wall,'tile');
  signBand(ctx,B,of,h-7,5,'BEAMS','#4a2c18','#f6e6c8');
  // twin band-saw wheels in the open bay, a squared log running through
  ctx.save();fxf(ctx,lf,fK(B,lf)+(lf==='I'?.06:0),fA(B,lf,.32),10);
  const ang=run?t*9:0;for(const dx of [-6,6]){ctx.fillStyle='#5a6068';ctx.beginPath();ctx.arc(dx,-3,4.6,0,TAU);ctx.fill();ctx.strokeStyle='#cfd5da';ctx.lineWidth=1;ctx.beginPath();ctx.arc(dx,-3,4.6,ang,ang+4);ctx.stroke();}
  ctx.fillStyle='#c79a5e';ctx.fillRect(-13,3,26,5);ctx.fillStyle='#a87a42';ctx.fillRect(-13,3,26,1.2);ctx.fillStyle='#e8eef2';ctx.fillRect(-.5,-8,1,16);
  ctx.restore();
  if(run&&Math.random()<scene.dtF*4){const p=fPt(B,lf,.34,4,.15);emitP(p[0],p[1],'dust');}
  // stacked beams with spacer sticks beside the shed
  const si=of==='J'?B.i0+.15:B.i1+.15, sj=of==='J'?B.j1+.15:B.j0+.15, n=2+Math.min(4,ms), li=of==='J'?1.05:.5, lj=of==='J'?.5:1.05;
  for(let k=0;k<n;k++){box(ctx,si,sj,si+li,sj+lj,k*2.4,k*2.4+2,k%2?'#c9955a':'#d6a86c',{});}
  tierExtras(ctx,L,B,ms,h,top,wall,roof,'plank','#c9955a');
  return top+10;
}
// v2.28: Glulam Plant (phase 2) — finger-jointed beams glued and clamped into long laminated members
function bGlulam(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#d8ccb4',roof='#3f5566',h=30+ms*4;
  bShadow(ctx,B.i0,B.j0,B.i1,B.j1,.26);
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{top:false});
  wallFace(ctx,B,lf,0,h,wall,'metal');wallFace(ctx,B,of,0,h,wall,'metal');
  fillP(ctx,fq(lf,fK(B,lf),fA(B,lf,0),fA(B,lf,1),0,2.5),'#8a8070');fillP(ctx,fq(of,fK(B,of),fA(B,of,0),fA(B,of,1),0,2.5),'#7a7060');
  rollerDoor(ctx,B,lf,.1,.5,h-12,true);
  for(const a of [.12,.42,.72]) winFramed(ctx,B,of,a,.18,h-18,11,true);
  if(ms>=1) winFramed(ctx,B,lf,.66,.22,h-17,10,true);
  const ax=lf==='I'?'i':'j',top=sawtooth(ctx,B.i0+.05,B.j0+.05,B.i1-.05,B.j1-.05,h,9,3,ax==='i'?'j':'i','#34485a',wall);
  signBand(ctx,B,of,h-8,5,'GLULAM','#2a3a48','#eef2f6');
  // the laminated beam in the clamp press, layers showing
  ctx.save();fxf(ctx,lf,fK(B,lf)+(lf==='I'?.06:0),fA(B,lf,.3),6);
  const sq=run?Math.sin(t*2.2)*.6:0;for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#d9b07a':'#c99a60';ctx.fillRect(-14,-k*2.2+sq*k*.2,28,2.1);}
  ctx.fillStyle='#d03a2a';for(const dx of [-10,-3,4,11]) ctx.fillRect(dx,-11,2,13);
  ctx.restore();
  // finished curved glulam members on the yard side
  const ci=of==='J'?(B.i0+B.i1)/2:B.i1+.55, cj=of==='J'?B.j1+.55:(B.j0+B.j1)/2;
  for(let k=0;k<Math.min(3,1+ms);k++){const p=P(ci+(of==='J'?0:k*.12),cj+(of==='J'?k*.12:0),2+k*2.2);ctx.save();ctx.translate(p[0],p[1]);if(of==='J') ctx.transform(1,-.5,0,1,0,0);else ctx.transform(1,.5,0,1,0,0);
    ctx.strokeStyle='#a87444';ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(-17,2);ctx.quadraticCurveTo(0,-9,17,2);ctx.stroke();ctx.strokeStyle='#e0b880';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();}
  tierExtras(ctx,L,B,ms,h,top,wall,roof,'metal','#e0b880');
  return top+10;
}
if(typeof BDRAW==='object'){BDRAW.beamsaw=bBeamSaw;BDRAW.glulam=bGlulam;}
// v2.33: Veneer Panel Press (phase 2) — figured veneer laid on a plank core and cured in a multi-daylight hot press
function bPanelPress(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#e6d6b8',roof='#6a3a2a',h=28+ms*4;
  bShadow(ctx,B.i0,B.j0,B.i1,B.j1,.25);
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{top:false});
  wallFace(ctx,B,lf,0,h,wall,'plank');wallFace(ctx,B,of,0,h,wall,'plank');
  fillP(ctx,fq(lf,fK(B,lf),fA(B,lf,0),fA(B,lf,1),0,3),'#8a5a3a');fillP(ctx,fq(of,fK(B,of),fA(B,of,0),fA(B,of,1),0,3),'#7a4a2c');
  rollerDoor(ctx,B,lf,.08,.54,h-10,true);
  for(const a of [.14,.44,.74]) winFramed(ctx,B,of,a,.16,h-17,10,true);
  if(ms>=1) winFramed(ctx,B,lf,.68,.2,h-15,9,true);
  const ax=lf==='I'?'i':'j',top=roofGable(ctx,B.i0,B.j0,B.i1,B.j1,h,13+ms,ax,roof,wall,'tile');
  signBand(ctx,B,of,h-7,5,'PANELS','#3a2418','#f3e2c0');
  // the hot press in the open bay: steel frame, heated platens closing on a panel (light face veneer over a darker core)
  ctx.save();fxf(ctx,lf,fK(B,lf)+(lf==='I'?.06:0),fA(B,lf,.31),8);
  const cl=run?(.5+.5*Math.sin(t*1.6)):1, gap=1.6+cl*2.2;
  ctx.fillStyle='#3a3e46';ctx.fillRect(-13,-14,2.4,22);ctx.fillRect(10.6,-14,2.4,22);ctx.fillRect(-13,-15,26,2.4);
  ctx.fillStyle='#8a9098';for(let k=0;k<3;k++) ctx.fillRect(-11,-10+k*(gap+2.4),22,1.6);
  for(let k=0;k<2;k++){const y=-8.4+k*(gap+2.4);ctx.fillStyle='#e8c48c';ctx.fillRect(-10,y,20,1.1);ctx.fillStyle='#8a5a34';ctx.fillRect(-10,y+1.1,20,1);}
  ctx.fillStyle=run?'#e86a2a':'#7a5a4a';ctx.fillRect(-12.6,4,1.6,1.6);
  ctx.restore();
  if(run&&Math.random()<scene.dtF*3){const p=fPt(B,lf,.3,h-6,.1);emitP(p[0],p[1],'dust');}
  // finished panels stacked on stickers beside the shed: face veneer on top, edge banding showing
  const si=of==='J'?B.i0+.2:B.i1+.15, sj=of==='J'?B.j1+.15:B.j0+.2, n=2+Math.min(4,ms), li=of==='J'?1.1:.62, lj=of==='J'?.62:1.1;
  for(let k=0;k<n;k++){box(ctx,si,sj,si+li,sj+lj,k*2.2,k*2.2+1.6,k%2?'#8a5a34':'#d9a865',{top:k===n-1?'#e8c48c':undefined});}
  tierExtras(ctx,L,B,ms,h,top,wall,roof,'plank','#d9a865');
  return top+10;
}
if(typeof BDRAW==='object') BDRAW.panelpress=bPanelPress;
/* ---------- scene: forklifts shuttling pallets from phase 1 to phase 2 ---------- */
function tierLinks(){const out=[];
  for(const b of MAIN_BLD){if(BTIER[b.id]!==2||!S.buildings[b.id].lvl) continue;
    for(const k in b.inp){const src=SRC_OF[k];if(!src||BTIER[src]!==1||!S.buildings[src].lvl||!LOTS[src]||!LOTS[b.id]) continue;
      if(typeof beltOnEdge==='function'&&beltOnEdge(src,b.id)) continue;   // v2.31: a conveyor belt carries this link, no forklifts
      const bs=bstat[b.id],rate=bs?b.inp[k]*(bs.speed||0)*(bs.f||0):0;out.push({src,dst:b.id,k,rate});}}
  return out;}
function tierLiftsFor(rate){return rate<=0?0:Math.min(3,(rate<500?1:2)+(typeof logiLvl==='function'&&logiLvl()>=LOGI_MORE?1:0));}   // ≤ 3 per link keeps the sprite cache warm (v2.30: +1 from Forklift Depot Lv 4)
function syncTierLifts(){
  const L=tierLinks(),sig=L.map(l=>l.src+'>'+l.dst+':'+tierLiftsFor(l.rate)).join(',');
  if(scene._tsig===sig) return; scene._tsig=sig; const old=scene.tierLifts||[]; scene.tierLifts=[];
  for(const l of L){const n=tierLiftsFor(l.rate);for(let k=0;k<n;k++){
    const from=convOf(LOTS[l.src]).end,to=doorOf(LOTS[l.dst]),off=(k-1)*.42+(l.k.length%3-1)*.18;
    const prev=old.find(o=>o.src===l.src&&o.dst===l.dst&&o.k===k);
    scene.tierLifts.push({src:l.src,dst:l.dst,k,res:l.k,p:prev?prev.p:Math.random()*2,path:fkPath([from,lanePt(from,off),lanePt(to,off),to])});}}
}
function tierLiftTick(dt){if(!scene.tierLifts) scene.tierLifts=[];if(!scene._tl||scene.t-scene._tl>1.5){scene._tl=scene.t;syncTierLifts();}
  for(const fl of scene.tierLifts) fkStep(fl,dt,FK_V*(bstat[fl.dst]&&bstat[fl.dst].f>.01?1:.6));}   // v2.30 calm motion
function tierLiftDraw(ctx,objs,inView){for(const fl of (scene.tierLifts||[])){if(fl.i===undefined) continue;const [x,y]=P(fl.i,fl.j);if(!inView(x,y,40)) continue;
  const big=typeof logiBig==='function'&&logiBig();objs.push({k:fl.i+fl.j,f:()=>forklift(ctx,fl.i,fl.j,fl.yaw||0,fkCargo(fl),fkBounce(fl),big)});}}
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
