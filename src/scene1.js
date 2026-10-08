
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
const _sh={};
function shade(h,f){const k=h+'|'+f;let r=_sh[k];if(r) return r;const n=parseInt(h.slice(1),16);let c=[n>>16&255,n>>8&255,n&255];
  c=f>=1?c.map(x=>Math.round(x+(255-x)*(f-1))):c.map(x=>Math.round(x*f));return _sh[k]=`rgb(${c[0]},${c[1]},${c[2]})`;}
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
  if(o.top!==false) fillP(ctx,[dt,at,bt,ct],o.top||shade(col,1.1));
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
  fillP(ctx,fq(face,K,a,a+w,z,z+h),frame||'#f4ead8');
  const g=lit?'#ffd98a':'#8fc3dc';
  fillP(ctx,fq(face,K,a+w*.14,a+w*.86,z+h*.14,z+h*.86),g);
  if(!lit){fillP(ctx,fq(face,K,a+w*.14,a+w*.45,z+h*.5,z+h*.86),'rgba(255,255,255,.35)');}
  else fillP(ctx,fq(face,K,a+w*.48,a+w*.52,z+h*.14,z+h*.86),frame||'#f4ead8');
}
function gable(ctx,i0,j0,i1,j1,z,rise,axis,roof,wall,ov){
  ov=ov===undefined?.2:ov;
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
  for(let k=0;k<n;k++){
    if(axis==='i'){const a=i0+(i1-i0)*k/n,b=i0+(i1-i0)*(k+1)/n;
      fillP(ctx,[P(a,j0,z),P(b,j0,z+rise),P(b,j1,z+rise),P(a,j1,z)],shade(roof,1.05),EDGE);
      fillP(ctx,[P(a,j1,z),P(b,j1,z),P(b,j1,z+rise)],shade(wall,.88),EDGE);
      fillP(ctx,[P(b,j0,z),P(b,j1,z),P(b,j1,z+rise),P(b,j0,z+rise)],'#7fb6cf',EDGE);
      fillP(ctx,[P(b,j0+(j1-j0)*.1,z+rise*.25),P(b,j0+(j1-j0)*.45,z+rise*.25),P(b,j0+(j1-j0)*.45,z+rise*.8),P(b,j0+(j1-j0)*.1,z+rise*.8)],'rgba(255,255,255,.3)');
    } else {const a=j0+(j1-j0)*k/n,b=j0+(j1-j0)*(k+1)/n;
      fillP(ctx,[P(i0,a,z),P(i0,b,z+rise),P(i1,b,z+rise),P(i1,a,z)],shade(roof,1.05),EDGE);
      fillP(ctx,[P(i1,a,z),P(i1,b,z),P(i1,b,z+rise)],shade(wall,.7),EDGE);
      fillP(ctx,[P(i0,b,z),P(i1,b,z),P(i1,b,z+rise),P(i0,b,z+rise)],'#8cc4dc',EDGE);
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
const LOTS={sawmill:mkLot('sawmill',9,'L'),chipper:mkLot('chipper',9,'R'),kiln:mkLot('kiln',14,'L'),carpentry:mkLot('carpentry',14,'R'),
  pellet:mkLot('pellet',19,'L'),paper:mkLot('paper',19,'R'),furniture:mkLot('furniture',24,'L')};
const YARD={id:'yard',ci:4,cj:4,face:'I'}, DOCK={id:'dock',ci:27,cj:21,side:'R',face:'J'};
const LOGPICK=[6.35,6.35];
const ROAD_I=30.9;           // asphalt road centre line (runs along j)
const DIRT_J=8;              // dirt log road centre (runs along i)
const RCOL={logs:'#9a6234',planks:'#e0b071',chips:'#d2a35e',charcoal:'#3a3634',chairs:'#b0703c',pellets:'#8a5a34',paper:'#f6f3ea',furniture:'#d0764e'};
const OUT_OF={sawmill:'planks',chipper:'chips',kiln:'charcoal',carpentry:'chairs',pellet:'pellets',paper:'paper',furniture:'furniture'};
const SRC_OF={planks:'sawmill',chips:'chipper',chairs:'carpentry'};
const VEST={sawmill:'#e8742a',chipper:'#3aa0d8',kiln:'#d84a3a',carpentry:'#e8c43a',pellet:'#9a6ad8',paper:'#4ac0a0',furniture:'#e85a9a'};
function msOf(id){return msCount(S.buildings[id].lvl);}
function lotBox(L){
  const ms=L.id==='dock'||L.id==='yard'?0:msOf(L.id);
  let bs=Math.min(3.5,2.8+0.14*ms); if(L.id==='furniture') bs=Math.min(3.65,3.05+0.12*ms); if(L.id==='dock') bs=3.0;
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
function zoneAt(i,j){
  if(i>=30&&i<32) return 'road';
  if(j>=7&&j<9&&i<6.2) return 'dirt';
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
  return true;
}
function isLumberZone(i,j){const u=i+j,v=i-j;return (v>=-18&&v<=-12.5&&u>=-3&&u<=34)||(u>=-6&&u<=2.6&&Math.abs(v)<=17);}

/* ---------------- scene state ---------------- */
const scene={
  canvas:null,ctx:null,w:800,h:600,dpr:1,t:0,lastRAF:0,visible:true,running:false,
  cam:{x:0,y:400,z:1,tx:0,ty:400,tz:1,fitZ:1,minZ:.3,maxZ:2.5},
  trees:[],dynTrees:[],staticTrees:[],deco:[],particles:[],smoke:[],floats:[],axes:[],
  jacks:[],saws:[],logTrucks:[],harvesters:[],drones:[],helis:[],
  workers:[],forklifts:[],dockTrucks:[],lamps:[],
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
    const z=zoneAt(i+.5,j+.5); if(z!=='grass') continue;
    const h=hash2(i*7+3,j*13+5);
    if(h<0.05) scene.deco.push({t:'rock',i:i+.3+hash2(i,j)*.4,j:j+.3+hash2(j,i)*.4,s:.6+h*8});
    else if(h<0.11&&!isForestPt(i+.5,j+.5)) scene.deco.push({t:'bush',i:i+.5,j:j+.5,s:.7+hash2(j,i)*.5});
    else if(h<0.2&&!isForestPt(i+.5,j+.5)) scene.deco.push({t:'flowers',i:i+.5,j:j+.5,c:['#fff4f0','#ffd84a','#ff9ab0','#c9a8ff'][Math.floor(hash2(i+9,j)*4)]});
  }
  // lamps along the lane
  scene.lamps=[];
  for(let u=14;u<=54;u+=8){scene.lamps.push({i:(u-2.25)/2,j:(u+2.25)/2});scene.lamps.push({i:(u+4+2.25)/2,j:(u+4-2.25)/2});}
}
/* lumberjack work spots: front-row trees near the log yard first (top band, then left band) */
function jackSpots(){
  if(scene._spots) return scene._spots;
  const top=scene.dynTrees.filter(t=>t.i+t.j>=-1&&t.i+t.j<=2.6&&Math.abs(t.i-t.j)<=11).sort((a,b)=>Math.abs(a.i-a.j)-Math.abs(b.i-b.j));
  const left=scene.dynTrees.filter(t=>t.i-t.j>=-15&&t.i-t.j<=-12.5&&t.i+t.j>=3&&t.i+t.j<=26).sort((a,b)=>(a.i+a.j)-(b.i+b.j));
  const out=[];const n=Math.max(top.length,left.length);
  for(let k=0;k<n;k++){if(top[k*2]) out.push({tree:top[k*2],side:'top'}); if(left[k]) out.push({tree:left[k],side:'left'}); if(top[k*2+1]) out.push({tree:top[k*2+1],side:'top'});}
  return scene._spots=out;
}
