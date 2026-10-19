'use strict';

/* =====================================================================
   ISOMETRIC FACTORY SCENE (v2.0)
   World grid (i,j); P(i,j,z) projects to "world pixels": x=(i-j)*32, y=(i+j)*16-z.
   Production lane runs straight down the screen (the i=j diagonal); lots sit in two
   columns either side of it. Forest top/left, log yard at the top of the lane,
   shipping dock + road at the bottom right.
   ===================================================================== */
const HW=32, HH=16, TAU=Math.PI*2;
function P(i,j,z){return [(i-j)*HW,(i+j)*HH-(z||0)];}
function toGrid(x,y){const a=y/HH,b=x/HW;return [(a+b)/2,(a-b)/2];}
function hash2(i,j){let h=(Math.imul(i|0,374761393)+Math.imul(j|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function rng(seed){let a=seed|0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* v2.8: the shade cache used to be keyed by the raw float factor (animated faces pass a new float every frame), so it grew by
   ~1,000 strings per second without bound: 50+ MB after a few minutes and ever-longer GC pauses. Factors are now quantised to
   1/128 and the cache is a bounded Map. rgb()/rgba() inputs are parsed too (they used to come out as rgb(NaN,…)). */
const _sh=new Map();
function _rgbOf(h){if(h.charCodeAt(0)===35){let x=h.slice(1);if(x.length===3) x=x[0]+x[0]+x[1]+x[1]+x[2]+x[2];const n=parseInt(x,16);return [n>>16&255,n>>8&255,n&255];}
  const m=h.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2]]:[128,128,128];}
function shade(h,f){const q=Math.round(f*128),k=h+'|'+q;let r=_sh.get(k);if(r) return r;f=q/128;let c=_rgbOf(h);
  c=f>=1?c.map(x=>Math.round(x+(255-x)*(f-1))):c.map(x=>Math.round(x*f));r=`rgb(${c[0]},${c[1]},${c[2]})`;if(_sh.size>4000) _sh.clear();_sh.set(k,r);return r;}
function pth(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();}
function fillP(ctx,pts,fill,stroke,lw){pth(ctx,pts);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke();}}
function pip(pts,x,y){let c=false;for(let a=0,b=pts.length-1;a<pts.length;b=a++){const [xa,ya]=pts[a],[xb,yb]=pts[b];if(((ya>y)!==(yb>y))&&(x<(xb-xa)*(y-ya)/(yb-ya)+xa))c=!c;}return c;}
const EDGE='rgba(58,30,12,.5)';
/* shaded iso box: top / +j face (left, lit) / +i face (right, shade) */
function box(ctx,i0,j0,i1,j1,z0,z1,col,o){
  o=o||{};
  const a=P(i1,j0,z0),b=P(i1,j1,z0),c=P(i0,j1,z0),at=P(i1,j0,z1),bt=P(i1,j1,z1),ct=P(i0,j1,z1),dt=P(i0,j0,z1);
  fillP(ctx,[b,c,ct,bt],o.left||shade(col,.9));
  fillP(ctx,[a,b,bt,at],o.right||shade(col,.7));
  if(o.top!==false) fillP(ctx,[dt,at,bt,ct],SEAS===3&&z1>=9&&!o.nosnow?SNOW:(o.top||shade(col,1.1)));
  if(o.edge!==false){ctx.strokeStyle=o.edgeCol||EDGE;ctx.lineWidth=o.lw||1;ctx.beginPath();
    ctx.moveTo(c[0],c[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(a[0],a[1]);ctx.lineTo(at[0],at[1]);if(o.top!==false){ctx.lineTo(dt[0],dt[1]);ctx.lineTo(ct[0],ct[1]);}else ctx.moveTo(ct[0],ct[1]);ctx.lineTo(c[0],c[1]);
    ctx.moveTo(b[0],b[1]);ctx.lineTo(bt[0],bt[1]);ctx.stroke();
    if(o.top!==false&&o.hl!==false){ctx.strokeStyle='rgba(255,250,235,.35)';ctx.beginPath();ctx.moveTo(ct[0],ct[1]+.5);ctx.lineTo(bt[0],bt[1]+.5);ctx.lineTo(at[0],at[1]+.5);ctx.stroke();}}
}
function boxHit(i0,j0,i1,j1,z1){return [P(i0,j0,z1),P(i1,j0,z1),P(i1,j0,0),P(i1,j1,0),P(i0,j1,0),P(i0,j1,z1)];}
/* faces: 'I' = +i face at i=K (param a = j), 'J' = +j face at j=K (param a = i) */
function fq(face,K,a0,a1,z0,z1){return face==='I'?[P(K,a0,z0),P(K,a1,z0),P(K,a1,z1),P(K,a0,z1)]:[P(a0,K,z0),P(a1,K,z0),P(a1,K,z1),P(a0,K,z1)];}
function fxf(ctx,face,K,a,z){const o=face==='I'?P(K,a,z):P(a,K,z);if(face==='I') ctx.transform(1,-.5,0,1,o[0],o[1]);else ctx.transform(1,.5,0,1,o[0],o[1]);}
function win(ctx,face,K,a,w,z,h,lit,frame){
  const D=scene.dn; if(D&&D.night>.35) lit=true;   // v2.3: every window is lit after dusk
  if(D&&D.lights>.03&&lit) scene.lq.push(fq(face,K,a+w*.14,a+w*.86,z+h*.14,z+h*.86));
  fillP(ctx,fq(face,K,a,a+w,z,z+h),frame||'#f4ead8');
  const g=lit?'#ffd98a':'#8fc3dc';
  fillP(ctx,fq(face,K,a+w*.14,a+w*.86,z+h*.14,z+h*.86),g);
  if(!lit){fillP(ctx,fq(face,K,a+w*.14,a+w*.45,z+h*.5,z+h*.86),'rgba(255,255,255,.35)');}
  else fillP(ctx,fq(face,K,a+w*.48,a+w*.52,z+h*.14,z+h*.86),frame||'#f4ead8');
}
function gable(ctx,i0,j0,i1,j1,z,rise,axis,roof,wall,ov){
  ov=ov===undefined?.2:ov; if(SEAS===3) roof=SNOW;
  if(axis==='i'){const jm=(j0+j1)/2,I0=i0-ov,I1=i1+ov,J0=j0-ov,J1=j1+ov;
    const r0=P(I0,jm,z+rise),r1=P(I1,jm,z+rise);
    fillP(ctx,[r0,r1,P(I1,J0,z-3),P(I0,J0,z-3)],shade(roof,1.15),EDGE);
    fillP(ctx,[P(i1,j0,z),P(i1,j1,z),P(i1,jm,z+rise)],shade(wall,.7),EDGE);
    fillP(ctx,[r0,r1,P(I1,J1,z-3),P(I0,J1,z-3)],shade(roof,.95),EDGE);
    fillP(ctx,[r1,P(I1,J1,z-3),P(I1,J1,z-6),P(I1,jm,z+rise-3)],shade(roof,.6));
    ctx.strokeStyle='rgba(255,240,220,.35)';ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();
    // shingle lines
    ctx.strokeStyle='rgba(0,0,0,.12)';ctx.beginPath();for(let k=1;k<4;k++){const t=k/4,jj=jm+(J1-jm)*t,zz=z+rise-(rise+3)*t;const p0=P(I0,jj,zz),p1=P(I1,jj,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
    return z+rise;}
  else{const im=(i0+i1)/2,I0=i0-ov,I1=i1+ov,J0=j0-ov,J1=j1+ov;
    const r0=P(im,J0,z+rise),r1=P(im,J1,z+rise);
    fillP(ctx,[r0,r1,P(I0,J1,z-3),P(I0,J0,z-3)],shade(roof,1.15),EDGE);
    fillP(ctx,[P(i0,j1,z),P(i1,j1,z),P(im,j1,z+rise)],shade(wall,.9),EDGE);
    fillP(ctx,[r0,r1,P(I1,J1,z-3),P(I1,J0,z-3)],shade(roof,.75),EDGE);
    fillP(ctx,[r1,P(I0,J1,z-3),P(I0,J1,z-6),P(im,J1,z+rise-3)],shade(roof,.85));
    ctx.strokeStyle='rgba(255,240,220,.35)';ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.12)';ctx.beginPath();for(let k=1;k<4;k++){const t=k/4,ii=im+(I1-im)*t,zz=z+rise-(rise+3)*t;const p0=P(ii,J0,zz),p1=P(ii,J1,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
    return z+rise;}
}
/* sawtooth roof: teeth step along `axis`, glass faces toward + of that axis */
function sawtooth(ctx,i0,j0,i1,j1,z,rise,n,axis,roof,wall){
  if(SEAS===3) roof=SNOW; const lit=scene.dn&&scene.dn.lights>.03;
  for(let k=0;k<n;k++){
    if(axis==='i'){const a=i0+(i1-i0)*k/n,b=i0+(i1-i0)*(k+1)/n;
      fillP(ctx,[P(a,j0,z),P(b,j0,z+rise),P(b,j1,z+rise),P(a,j1,z)],shade(roof,1.05),EDGE);
      fillP(ctx,[P(a,j1,z),P(b,j1,z),P(b,j1,z+rise)],shade(wall,.88),EDGE);
      fillP(ctx,[P(b,j0,z),P(b,j1,z),P(b,j1,z+rise),P(b,j0,z+rise)],lit&&scene.dn.night>.35?'#ffd98a':'#7fb6cf',EDGE);if(lit) scene.lq.push([P(b,j0,z),P(b,j1,z),P(b,j1,z+rise),P(b,j0,z+rise)]);
      fillP(ctx,[P(b,j0+(j1-j0)*.1,z+rise*.25),P(b,j0+(j1-j0)*.45,z+rise*.25),P(b,j0+(j1-j0)*.45,z+rise*.8),P(b,j0+(j1-j0)*.1,z+rise*.8)],'rgba(255,255,255,.3)');
    } else {const a=j0+(j1-j0)*k/n,b=j0+(j1-j0)*(k+1)/n;
      fillP(ctx,[P(i0,a,z),P(i0,b,z+rise),P(i1,b,z+rise),P(i1,a,z)],shade(roof,1.05),EDGE);
      fillP(ctx,[P(i1,a,z),P(i1,b,z),P(i1,b,z+rise)],shade(wall,.7),EDGE);
      fillP(ctx,[P(i0,b,z),P(i1,b,z),P(i1,b,z+rise),P(i0,b,z+rise)],lit&&scene.dn.night>.35?'#ffd98a':'#8cc4dc',EDGE);if(lit) scene.lq.push([P(i0,b,z),P(i1,b,z),P(i1,b,z+rise),P(i0,b,z+rise)]);
      fillP(ctx,[P(i0+(i1-i0)*.1,b,z+rise*.25),P(i0+(i1-i0)*.45,b,z+rise*.25),P(i0+(i1-i0)*.45,b,z+rise*.8),P(i0+(i1-i0)*.1,b,z+rise*.8)],'rgba(255,255,255,.3)');
    }
  }
  return z+rise;
}
function cyl(ctx,ci,cj,r,z0,h,col,top){
  const [cx,cy]=P(ci,cj,z0);const rx=r*45.25,ry=r*22.63;
  const g=ctx.createLinearGradient(cx-rx,0,cx+rx,0);g.addColorStop(0,shade(col,1.12));g.addColorStop(.4,shade(col,.98));g.addColorStop(1,shade(col,.6));
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx-rx,cy-h);ctx.lineTo(cx-rx,cy);ctx.ellipse(cx,cy,rx,ry,0,Math.PI,0,true);ctx.lineTo(cx+rx,cy-h);ctx.closePath();ctx.fill();
  ctx.strokeStyle=EDGE;ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=top||shade(col,1.18);ctx.beginPath();ctx.ellipse(cx,cy-h,rx,ry,0,0,TAU);ctx.fill();ctx.stroke();
  return [cx,cy-h];
}
function cone(ctx,cx,cy,rx,ry,h,col){
  ctx.fillStyle=shade(col,1.05);ctx.beginPath();ctx.moveTo(cx-rx,cy);ctx.ellipse(cx,cy,rx,ry,0,Math.PI,0,true);ctx.lineTo(cx,cy-h);ctx.closePath();ctx.fill();
  ctx.fillStyle=shade(col,.72);ctx.beginPath();ctx.moveTo(cx,cy-h);ctx.lineTo(cx+rx,cy);ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*.5,false);ctx.closePath();ctx.fill();
  ctx.strokeStyle=EDGE;ctx.beginPath();ctx.moveTo(cx-rx,cy);ctx.lineTo(cx,cy-h);ctx.lineTo(cx+rx,cy);ctx.stroke();
}
function ell(ctx,x,y,rx,ry,col){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);ctx.fill();}
function shadowAt(ctx,i,j,rx,ry,a){const [x,y]=P(i,j,0);ctx.fillStyle=`rgba(30,40,10,${a||.2})`;ctx.beginPath();ctx.ellipse(x+3,y+1,rx,ry,0,0,TAU);ctx.fill();}

/* ---------------- world layout ---------------- */
const ROWC=[9,14,19,24];
function mkLot(id,c,side){return side==='L'?{id,ci:c-3,cj:c+3,side,face:'I'}:{id,ci:c+3,cj:c-3,side,face:'J'};}
// v2.20 factory tiers: right side (R) = phase 1, logs only · left side (L) = phase 2, fed by phase 1 · Premium Area = phase 3
const LOTS={peeler:{id:'peeler',ci:7.45,cj:1.3,side:'R',face:'J'},sawmill:mkLot('sawmill',9,'R'),chipper:mkLot('chipper',14,'R'),kiln:mkLot('kiln',19,'R'),
  carpentry:mkLot('carpentry',9,'L'),pellet:mkLot('pellet',14,'L'),paper:mkLot('paper',19,'L'),furniture:mkLot('furniture',24,'L')};
// v2.21.1 Phase 3 row: the Premium Area is its own fenced row beyond Phase 2 (left of the lane), parallel to rows I and II.
// The row is a band in lane coordinates u=i+j (along the lane) / v=i-j (across it): rows I (v=+6), II (v=-6), III (v=-17.6).
const PROW={u0:17.0,u1:57,v0:-21.8,v1:-12.6,vl:-17.6,va:-13.95};
function uvIJ(u,v){return [(u+v)/2,(u-v)/2];}
function inPremRow(i,j,pad){pad=pad||0;const u=i+j,v=i-j;return u>=PROW.u0-pad&&u<PROW.u1+pad&&v>=PROW.v0-pad&&v<PROW.v1+pad;}
// PREM stays an i/j bounding box of the row (centre + extents) for callers that only need "roughly where"
const PREM=(()=>{const c=[uvIJ(PROW.u0,PROW.v0),uvIJ(PROW.u1,PROW.v0),uvIJ(PROW.u1,PROW.v1),uvIJ(PROW.u0,PROW.v1)];
  return {i0:Math.min(...c.map(p=>p[0])),i1:Math.max(...c.map(p=>p[0])),j0:Math.min(...c.map(p=>p[1])),j1:Math.max(...c.map(p=>p[1])),
    ci:uvIJ((PROW.u0+PROW.u1)/2,PROW.vl)[0],cj:uvIJ((PROW.u0+PROW.u1)/2,PROW.vl)[1],corners:c};})();
function mkPLot(id,u,bs0){const [ci,cj]=uvIJ(u,PROW.vl);return {id,ci,cj,u,side:'P',face:'I',prem:true,bs0:bs0||2.45};}
// unlock order runs down the row, like rows I and II: gift box → parquet → stationery → cabinets → showroom
Object.assign(LOTS,{atelier:mkPLot('atelier',20.3),parquet:mkPLot('parquet',27.2),stationer:mkPLot('stationer',34.1),
  cabinetry:mkPLot('cabinetry',41.0),showroom:mkPLot('showroom',48.4,2.75)});
const PDOCK=(()=>{const [ci,cj]=uvIJ(60.5,-18.6);return {id:'pdock',ci,cj};})();   // premium dock just past the south end of row III
const PROAD_J=41.2;          // access road from the highway to the premium dock (runs along i)
// Phase 2 → Phase 3 forklift gates: one per phase-2 building, opposite its outbound rack
const PGATES={carpentry:20.7,pellet:30.7,paper:40.7,furniture:50.7};
const YARD={id:'yard',ci:4,cj:4,face:'I'}, DOCK={id:'dock',ci:27,cj:21,side:'R',face:'J'};
const LOGPICK=[6.35,6.35];
const ROAD_I=30.9;           // asphalt road centre line (runs along j)
const DIRT_J=8;              // dirt log road centre (runs along i)
const RCOL={logs:'#9a6234',planks:'#e0b071',veneer:'#ecd3a2',bark:'#5e3c22',chips:'#d2a35e',charcoal:'#3a3634',chairs:'#b0703c',pellets:'#8a5a34',paper:'#f6f3ea',furniture:'#d0764e',
  giftbox:'#2a2a30',flooring:'#8a5428',stationery:'#1f3a5a',cabinets:'#4a2c1c',luxfurn:'#6a1f3a'};
const OUT_OF={peeler:'veneer',sawmill:'planks',chipper:'chips',kiln:'charcoal',carpentry:'chairs',pellet:'pellets',paper:'paper',furniture:'furniture',
  atelier:'giftbox',parquet:'flooring',stationer:'stationery',cabinetry:'cabinets',showroom:'luxfurn'};
const SRC_OF={planks:'sawmill',chips:'chipper',chairs:'carpentry',veneer:'peeler',charcoal:'kiln',pellets:'pellet',paper:'paper'};
const VEST={peeler:'#7ab04a',sawmill:'#e8742a',chipper:'#3aa0d8',kiln:'#d84a3a',carpentry:'#e8c43a',pellet:'#9a6ad8',paper:'#4ac0a0',furniture:'#e85a9a'};
function msOf(id){return msCount(S.buildings[id].lvl);}
function lotBox(L){
  const ms=L.id==='dock'||L.id==='yard'?0:msOf(L.id);
  let bs=Math.min(3.5,2.8+0.14*ms); if(L.prem) bs=Math.min(L.bs0+.42,L.bs0+.07*ms); else if(L.tech) bs=Math.min(L.bs0+.3,L.bs0+.05*ms); else if(L.id==='furniture') bs=Math.min(3.65,3.05+0.12*ms); else if(L.id==='peeler') bs=Math.min(2.95,2.45+0.1*ms); if(L.id==='dock') bs=3.0;
  const hb=bs/2; return {i0:L.ci-hb,i1:L.ci+hb,j0:L.cj-hb,j1:L.cj+hb,bs,ms};
}
function doorOf(L){const b=lotBox(L);return L.face==='I'?[b.i1+.38,b.j0+b.bs*.28]:[b.i0+b.bs*.28,b.j1+.38];}
function convOf(L){const b=lotBox(L);
  if(L.face==='I'){const j=b.j0+b.bs*.74;return {axis:'i',a0:b.i1,a1:j-2.35,k:j,end:[j-2.0,j]};}
  const i=b.i0+b.bs*.74;return {axis:'j',a0:b.j1,a1:i-2.35,k:i,end:[i,i-2.0]};}
function lanePt(p,off){const u=p[0]+p[1];return [(u+off)/2,(u-off)/2];}
function dockDrop(){const b=lotBox(DOCK);return [b.i0+b.bs*.3,b.j1+.42];}

/* ground zones */
function yardTile(i,j){const v=i-j,u=i+j+1;return Math.abs(v)<=11&&u>=5&&u<=57&&!(u<=6&&Math.abs(v)>=9)&&!(u>=56&&Math.abs(v)>=9);}
function laneTile(i,j){const v=i-j,u=i+j+1;return Math.abs(v)<=2&&u>=12&&u<=56;}
function inFactory(u,v){const i=(u+v)/2,j=(u-v)/2;return yardTile(Math.floor(i),Math.floor(j));}
function premApron(i,j){ // dock apron + access road + spur (paved, no grass/trees)
  if(j>=PROAD_J-.75&&j<PROAD_J+.75&&i>=PDOCK.ci-1&&i<30) return true;
  const u=i+j,v=i-j; if(u>=PROW.u1&&u<64.2&&v>=-21.8&&v<-12.6) return true;
  if(u>=PROW.u0&&u<PROW.u1&&v>=-12.6&&v<-11.2) return true;   // II → III transfer lane
  return i>=PDOCK.ci-1&&i<PDOCK.ci+4.2&&j>=PDOCK.cj-2&&j<PROAD_J;}
function zoneAt(i,j){
  if(i>=30&&i<32) return 'road';
  if(j>=7&&j<9&&i<6.2) return 'dirt';
  if(inPremRow(i,j)||premApron(i,j)) return 'prem';
  // v2.5: R&D campus (north of the kiln row) and harbour across the highway
  if(i>=14.2&&i<19.6&&j>=-1.4&&j<3.5) return 'campus';
  if(i>=32.4&&i<40.4&&j>=11.5&&j<17.2) return 'harbor';
  if(i>=32.2&&j>=17.1&&j<20) return 'river';
  const u=i+j,v=i-j;
  if(inFactory(u,v)) return 'yard';
  return 'grass';
}
function isForestPt(i,j){
  const u=i+j,v=i-j;
  if(zoneAt(i,j)!=='grass') return false;
  if(i>=27.5&&i<34.6) return false;
  if(j>=4.8&&j<11.2&&i<7.5) return false;
  if(Math.abs(v)<=13&&u>=1&&u<=58.5) return false;
  if(v>=-23.4&&v<=-11&&u>=16&&u<=66) return false;   // v2.21.1: clearing round the Phase 3 row
  if(i>=13.8&&i<20&&j>=-1.8&&j<3.9) return false;
  if(i>=31.4&&i<41&&j>=11&&j<17.6) return false;
  if(i>=6.2&&i<10.6&&j>=-8.4&&j<-4.4) return false;   // v2.7: tree-nursery clearing
  if(i>=20.7&&i<28&&j>=-7.6&&j<-.6) return false;     // v2.10: power-plant clearing
  if(i>=32&&j>=16.8&&j<20.4) return false;
  return true;
}
function isLumberZone(i,j){const u=i+j,v=i-j;return (v>=-28&&v<=-22.5&&u>=-3&&u<=36)||(v>=-18&&v<=-12.5&&u>=-3&&u<=15.5)||(u>=-6&&u<=2.6&&Math.abs(v)<=17);}

/* ---------------- scene state ---------------- */
const scene={
  canvas:null,ctx:null,w:800,h:600,dpr:1,t:0,lastRAF:0,visible:true,running:false,
  cam:{x:0,y:400,z:1,tx:0,ty:400,tz:1,fitZ:1,minZ:.3,maxZ:2.5},
  trees:[],dynTrees:[],staticTrees:[],deco:[],particles:[],smoke:[],floats:[],axes:[],
  jacks:[],saws:[],logTrucks:[],harvesters:[],drones:[],helis:[],
  workers:[],forklifts:[],dockTrucks:[],marketVans:[],lamps:[],
  chunks:new Map(),chunkTier:-1,
  msFlash:null,buildAnim:{},earnAcc:0,lastEarned:0,floatTimer:0,
  hover:null,fps:60,frameMs:16,objCount:0
};
function initWorld(){
  const R=rng(20261008);
  scene.trees=[]; scene.stumps=[];
  for(let i=-34;i<=62;i++) for(let j=-34;j<=62;j++){
    const [x,y]=P(i+.5,j+.5,0); if(x<-1250||x>1250||y<-560||y>1500) continue;
    if(!isForestPt(i+.5,j+.5)) continue;
    const u=i+j,v=i-j; const edge=Math.abs(v)<=15&&u>=-1&&u<=60;
    const dens=edge?0.5:0.68;
    if(R()>dens) continue;
    if(i>=-3&&i<=3.6&&j>=11.4&&j<=18.4){ if(R()<.45) scene.stumps.push({i:i+.3+R()*.4,j:j+.3+R()*.4}); continue; }
    const ti=i+.2+R()*.6, tj=j+.2+R()*.6;
    const t={i:ti,j:tj,s:.82+R()*.45,var:R(),shake:0,fall:0,stump:0,grow:1,dyn:isLumberZone(ti,tj)};
    scene.trees.push(t);
  }
  scene.trees.sort((a,b)=>(a.i+a.j)-(b.i+b.j));
  scene.dynTrees=scene.trees.filter(t=>t.dyn); scene.staticTrees=scene.trees.filter(t=>!t.dyn);
  // decorations on grass verges & forest floor
  scene.deco=[];
  for(let i=-34;i<=62;i++) for(let j=-34;j<=62;j++){
    const [x,y]=P(i+.5,j+.5,0); if(x<-1250||x>1250||y<-560||y>1500) continue;
    const z=zoneAt(i+.5,j+.5); if(z!=='grass'||inPremRow(i+.5,j+.5,.9)) continue;
    const h=hash2(i*7+3,j*13+5);
    if(h<0.05) scene.deco.push({t:'rock',i:i+.3+hash2(i,j)*.4,j:j+.3+hash2(j,i)*.4,s:.6+h*8});
    else if(h<0.11&&!isForestPt(i+.5,j+.5)) scene.deco.push({t:'bush',i:i+.5,j:j+.5,s:.7+hash2(j,i)*.5});
    else if(h<0.2&&!isForestPt(i+.5,j+.5)) scene.deco.push({t:'flowers',i:i+.5,j:j+.5,c:['#fff4f0','#ffd84a','#ff9ab0','#c9a8ff'][Math.floor(hash2(i+9,j)*4)]});
  }
  // lamps along the lane
  scene.lamps=[];
  for(let u=14;u<=54;u+=8){if(u>14) scene.lamps.push({i:(u-2.25)/2,j:(u+2.25)/2});scene.lamps.push({i:(u+4+2.25)/2,j:(u+4-2.25)/2});}
}
/* lumberjack work spots: front-row trees near the log yard first (top band, then left band) */
function jackSpots(){
  if(scene._spots) return scene._spots;
  const top=scene.dynTrees.filter(t=>t.i+t.j>=-1&&t.i+t.j<=2.6&&Math.abs(t.i-t.j)<=11).sort((a,b)=>Math.abs(a.i-a.j)-Math.abs(b.i-b.j));
  const left=scene.dynTrees.filter(t=>t.i-t.j>=-25.5&&t.i-t.j<=-22.5&&t.i+t.j>=12&&t.i+t.j<=32).sort((a,b)=>(a.i+a.j)-(b.i+b.j));
  const out=[];const n=Math.max(top.length,left.length);
  for(let k=0;k<n;k++){if(top[k*2]) out.push({tree:top[k*2],side:'top'}); if(left[k]) out.push({tree:left[k],side:'left'}); if(top[k*2+1]) out.push({tree:top[k*2+1],side:'top'});}
  return scene._spots=out;
}
