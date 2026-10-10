'use strict';

/* ---------------- buildings ---------------- */
function fK(B,f){return f==='I'?B.i1:B.j1;}
function fA(B,f,q){return f==='I'?B.j0+q*B.bs:B.i0+q*B.bs;}
function fPt(B,f,q,z,out){out=out||0;return f==='I'?P(B.i1+out,B.j0+q*B.bs,z):P(B.i0+q*B.bs,B.j1+out,z);}
function planks(ctx,B,f,z0,z1,step,col){ctx.strokeStyle=col||'rgba(90,50,20,.22)';ctx.lineWidth=1;ctx.beginPath();const K=fK(B,f),a0=fA(B,f,0),a1=fA(B,f,1);
  for(let z=z0+step;z<z1-1;z+=step){const p=f==='I'?[P(K,a0,z),P(K,a1,z)]:[P(a0,K,z),P(a1,K,z)];ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);}ctx.stroke();}
function bricks(ctx,B,f,z0,z1){planks(ctx,B,f,z0,z1,4,'rgba(80,30,15,.25)');const K=fK(B,f);ctx.strokeStyle='rgba(80,30,15,.2)';ctx.beginPath();
  let r=0;for(let z=z0;z<z1-2;z+=4,r++){for(let q=(r%2?.06:.12);q<1;q+=.12){const a=fA(B,f,q);const p0=f==='I'?P(K,a,z):P(a,K,z);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p0[0],p0[1]-4);}}ctx.stroke();}
function hazard(ctx,B,f,z0,z1){const K=fK(B,f);for(let k=0;k<10;k++){const q0=k/10,q1=(k+.5)/10;fillP(ctx,fq(f,K,fA(B,f,q0),fA(B,f,q1),z0,z1),'#f2c230');fillP(ctx,fq(f,K,fA(B,f,q1),fA(B,f,(k+1)/10),z0,z1),'#3a3a3a');}}
function doorOn(ctx,B,f,q0,q1,z1,col,frame){const K=fK(B,f);fillP(ctx,fq(f,K,fA(B,f,q0),fA(B,f,q1),0,z1),frame||'#6a4024');fillP(ctx,fq(f,K,fA(B,f,q0+.025),fA(B,f,q1-.025),0,z1-2),col||'#3a2414');}
function winOn(ctx,B,f,q,w,z,h,lit){const K=fK(B,f);const a0=fA(B,f,q),a1=fA(B,f,q+w);win(ctx,f,K,Math.min(a0,a1),Math.abs(a1-a0),z,h,lit);}
function chimneySmoke(x,y,kind,rate){if(Math.random()<rate*scene.dtF) emitSmoke(x,y,kind);}
function flag(ctx,x,y,col){ctx.strokeStyle='#5a5a5a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-22);ctx.stroke();const w=Math.sin(scene.t*4)*1.5;
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y-22);ctx.quadraticCurveTo(x+6,y-23+w,x+12,y-20+w);ctx.lineTo(x+12,y-14+w);ctx.quadraticCurveTo(x+6,y-17+w,x,y-15);ctx.closePath();ctx.fill();}
function goldTrim(ctx,B,z){ctx.strokeStyle='#f5c84c';ctx.lineWidth=2;const a=P(B.i0,B.j1,z),b=P(B.i1,B.j1,z),c=P(B.i1,B.j0,z);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();}
function logPile(ctx,i,j,axis,n,len){ // small stack of logs lying along axis (ends face +axis)
  const rows=[[0,0],[.26,0],[.52,0],[.13,1],[.39,1],[.26,2]];
  for(let k=0;k<Math.min(n,6);k++){const [o,r]=rows[k];const z=r*5;
    if(axis==='i'){box(ctx,i,j+o,i+len,j+o+.24,z,z+5,'#93602f',{hl:false});const e=P(i+len,j+o+.12,z+2.5);ell(ctx,e[0],e[1],3,2.6,'#e2b67a');ell(ctx,e[0],e[1],1.1,1,'#b07a40');}
    else {box(ctx,i+o,j,i+o+.24,j+len,z,z+5,'#93602f',{hl:false});const e=P(i+o+.12,j+len,z+2.5);ell(ctx,e[0],e[1],3,2.6,'#e2b67a');ell(ctx,e[0],e[1],1.1,1,'#b07a40');}}
}

function bSawmill(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#c98d58',roof='#b8492f',h=28+ms*4;
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  planks(ctx,B,lf,0,h,4.5);planks(ctx,B,of,0,h,4.5);
  // big saw opening on the lane face
  doorOn(ctx,B,lf,.1,.55,h-8,'#2e1d10','#7a4a26');
  winOn(ctx,B,of,.18,.22,h-17,10,true);winOn(ctx,B,of,.6,.22,h-17,10,true);
  if(ms>=2){winOn(ctx,B,lf,.68,.2,h-15,9,true);}
  const top=gable(ctx,B.i0,B.j0,B.i1,B.j1,h,20+ms,lf==='I'?'i':'j',roof,wall);
  // chimney
  const ci=B.i0+B.bs*.3,cj=B.j0+B.bs*.3; box(ctx,ci-.16,cj-.16,ci+.16,cj+.16,h,top+8,'#7a7470',{});
  const cp=P(ci,cj,top+9); if(run) chimneySmoke(cp[0],cp[1],'grey',1.6);
  if(ms>=3){const vi=(B.i0+B.i1)/2,vj=(B.j0+B.j1)/2;box(ctx,vi-.22,vj-.22,vi+.22,vj+.22,top-4,top+6,'#e8d2a8',{});gable(ctx,vi-.22,vj-.22,vi+.22,vj+.22,top+6,6,lf==='I'?'i':'j',roof,'#e8d2a8',.06);}
  // saw blade spinning in the opening
  ctx.save();fxf(ctx,lf,fK(B,lf)+(lf==='I'?.06:0),fA(B,lf,.32),9);
  const ang=run?t*14:0; ctx.rotate(ang);
  ctx.fillStyle='#d8dee4';ctx.beginPath();for(let k=0;k<16;k++){const a=k/16*TAU,r1=10.5,r2=8.6;ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a+TAU/32)*r2,Math.sin(a+TAU/32)*r2);}ctx.closePath();ctx.fill();
  ctx.strokeStyle='#6a747e';ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle='#aab4bd';ctx.beginPath();ctx.arc(0,0,5,0,TAU);ctx.fill();ctx.fillStyle='#3a3a3a';ctx.beginPath();ctx.arc(0,0,1.6,0,TAU);ctx.fill();
  ctx.restore();
  if(run&&Math.random()<scene.dtF*6){const p=fPt(B,lf,.32,4,.15);emitP(p[0],p[1],'dust');}
  // log pile by the side wall
  if(of==='J') logPile(ctx,B.i0+.15,B.j1+.12,'i',3+Math.min(3,ms),.9); else logPile(ctx,B.i1+.12,B.j0+.2,'j',3+Math.min(3,ms),.9);
  if(ms>=4) flag(ctx,...P(B.i0,B.j0,top-2),'#e8473c');
  if(ms>=6) goldTrim(ctx,B,h);
  return top+10;
}
function bChipper(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#7f97a8',h=24+ms*3;
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  hazard(ctx,B,lf,0,4);hazard(ctx,B,of,0,4);
  planks(ctx,B,lf,4,h,6,'rgba(30,50,70,.18)');planks(ctx,B,of,4,h,6,'rgba(30,50,70,.18)');
  box(ctx,B.i0+.1,B.j0+.1,B.i1-.1,B.j1-.1,h,h+1.5,'#6a8090',{hl:false});
  winOn(ctx,B,of,.55,.3,h-13,8,false);
  // hopper
  const ci=(B.i0+B.i1)/2-.1,cj=(B.j0+B.j1)/2-.1,a=.32,b=.7+ms*.03,z0=h+1,z1=h+17+ms;
  fillP(ctx,[P(ci-a,cj+a,z0),P(ci+a,cj+a,z0),P(ci+b,cj+b,z1),P(ci-b,cj+b,z1)],'#e8952f',EDGE);
  fillP(ctx,[P(ci+a,cj-a,z0),P(ci+a,cj+a,z0),P(ci+b,cj+b,z1),P(ci+b,cj-b,z1)],'#b86e1e',EDGE);
  fillP(ctx,[P(ci-b,cj-b,z1),P(ci+b,cj-b,z1),P(ci+b,cj+b,z1),P(ci-b,cj+b,z1)],'#f2a640',EDGE);
  fillP(ctx,[P(ci-b+.12,cj-b+.12,z1),P(ci+b-.12,cj-b+.12,z1),P(ci+b-.12,cj+b-.12,z1),P(ci-b+.12,cj+b-.12,z1)],'#5a3a1a');
  if(run){const [x,y]=P(ci,cj,z1);ell(ctx,x,y+1,b*28,b*12,'#c99a5a');}
  // drum on the lane face
  ctx.save();fxf(ctx,lf,fK(B,lf),fA(B,lf,.3),11);ctx.fillStyle='#3a3f45';ctx.beginPath();ctx.arc(0,0,8.5,0,TAU);ctx.fill();
  ctx.rotate(run?-t*9:0);ctx.strokeStyle='#c9d2da';ctx.lineWidth=2;ctx.beginPath();for(let k=0;k<4;k++){const an=k/4*TAU;ctx.moveTo(0,0);ctx.lineTo(Math.cos(an)*7,Math.sin(an)*7);}ctx.stroke();
  ctx.fillStyle='#f2c230';ctx.beginPath();ctx.arc(0,0,2.4,0,TAU);ctx.fill();ctx.restore();
  // vent pipe
  const vp=cyl(ctx,B.i0+.45,B.j0+.45,.13,h,18+ms*2,'#a8b4be');
  if(run) chimneySmoke(vp[0],vp[1],'steam',1.2);
  if(run&&Math.random()<scene.dtF*8){const p=fPt(B,lf,.74,6,.1);emitP(p[0],p[1],'chip');}
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,h),'#3aa0d8');
  if(ms>=6) goldTrim(ctx,B,h);
  return z1+4;
}
function bKiln(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#b9603f',h=24+ms*3;
  // tall chimney behind
  const top=cyl(ctx,B.i0+.42,B.j0+.42,.26,0,h+40+ms*5,'#a8503a','#3a2a24');
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  bricks(ctx,B,lf,0,h);bricks(ctx,B,of,0,h);
  // glowing arches
  const glow=run?.65+.35*Math.sin(t*5+Math.sin(t*13)*.6):0;
  for(const q of [.12,.48]){const K=fK(B,lf);
    const a0=fA(B,lf,q),a1=fA(B,lf,q+.3);
    ctx.save();fxf(ctx,lf,K,lf==='I'?a1:a0,0);
    const w=Math.abs(a1-a0)*32;
    ctx.fillStyle='#4a2418';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-10);ctx.arc(w/2,-10,w/2,Math.PI,0);ctx.lineTo(w,0);ctx.closePath();ctx.fill();
    const g=ctx.createRadialGradient(w/2,-6,1,w/2,-6,w*.7);g.addColorStop(0,`rgba(255,${200+40*glow|0},90,${.25+glow*.75})`);g.addColorStop(1,`rgba(220,60,20,${.15+glow*.5})`);
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(2,-10);ctx.arc(w/2,-10,w/2-2,Math.PI,0);ctx.lineTo(w-2,0);ctx.closePath();ctx.fill();
    ctx.restore();}
  if(glow>0){const p=fPt(B,lf,.45,0,.6);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(p[0],p[1],2,p[0],p[1],46);g.addColorStop(0,`rgba(255,150,50,${.28*glow})`);g.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p[0],p[1],46,24,0,0,TAU);ctx.fill();ctx.restore();}
  const rt=gable(ctx,B.i0,B.j0,B.i1,B.j1,h,12+ms,lf==='I'?'i':'j','#5d5853',wall);
  if(run) chimneySmoke(top[0],top[1],'dark',2.6);
  // charcoal sacks
  for(let k=0;k<2+Math.min(3,ms);k++){const p=of==='J'?P(B.i0+.3+k*.32,B.j1+.35,0):P(B.i1+.35,B.j0+.3+k*.32,0);ell(ctx,p[0]+1,p[1]+1,6,3,'rgba(0,0,0,.2)');ctx.fillStyle='#d8c8a8';ctx.beginPath();ctx.ellipse(p[0],p[1]-4,5,6,0,0,TAU);ctx.fill();ctx.fillStyle='#3a3634';ctx.beginPath();ctx.ellipse(p[0],p[1]-9,3.6,1.6,0,0,TAU);ctx.fill();}
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,h),'#d84a3a');
  if(ms>=6) goldTrim(ctx,B,h);
  return Math.max(rt,h+40+ms*5)+4;
}
function bCarpentry(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#efd9ab',beam='#8a5a32',h=26+ms*4;
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  for(const f of [lf,of]){const K=fK(B,f);
    for(const q of [0,.33,.66,1]){const a=fA(B,f,Math.min(.985,Math.max(.015,q)));fillP(ctx,fq(f,K,a-.03,a+.03,0,h),beam);}
    fillP(ctx,fq(f,K,fA(B,f,0),fA(B,f,1),h*.55,h*.55+2.2),beam);fillP(ctx,fq(f,K,fA(B,f,0),fA(B,f,1),0,3),'#9a8a70');}
  doorOn(ctx,B,lf,.08,.3,15,'#7a4a26','#5a3418');
  winOn(ctx,B,lf,.42,.18,h*.55+4,9,true);winOn(ctx,B,lf,.72,.18,h*.55+4,9,true);
  winOn(ctx,B,of,.12,.18,5,9,true);winOn(ctx,B,of,.42,.18,5,9,true);winOn(ctx,B,of,.72,.18,5,9,true);
  if(ms>=2){winOn(ctx,B,of,.3,.18,h*.55+4,8,true);winOn(ctx,B,of,.6,.18,h*.55+4,8,true);}
  const top=gable(ctx,B.i0,B.j0,B.i1,B.j1,h,20+ms,lf==='I'?'i':'j','#5e9a4a',wall);
  const ci=B.i1-B.bs*.3,cj=B.j0+B.bs*.3; box(ctx,ci-.15,cj-.15,ci+.15,cj+.15,h+4,top+4,'#9a948c',{});
  const cp=P(ci,cj,top+5); if(run) chimneySmoke(cp[0],cp[1],'light',.9);
  // workbench with a chair on the lane side
  const wb=lf==='J'?[B.i0+B.bs*.62,B.j1+.55]:[B.i1+.55,B.j0+B.bs*.62];
  box(ctx,wb[0]-.32,wb[1]-.18,wb[0]+.32,wb[1]+.18,0,7,'#a86a38',{});
  const cp2=P(wb[0],wb[1],7);cargoIcon(ctx,cp2[0],cp2[1]-1,'chairs',.9);
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,h),'#e8c43a');
  if(ms>=6) goldTrim(ctx,B,h);
  return top+6;
}
function bPellet(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#5d9b96',h=24+ms*3;
  const st=cyl(ctx,B.i0+.5,B.j0+.5,.5,0,h+26+ms*4,'#d9dde0');
  const [sx,sy]=st; cone(ctx,sx,sy,.5*45.25,.5*22.63,10,'#c4c9cc');
  ctx.strokeStyle='rgba(0,0,0,.12)';for(let k=1;k<5;k++){ctx.beginPath();ctx.ellipse(sx,sy+k*(h+26)/5,22.6,11.3,0,0,Math.PI);ctx.stroke();}
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  hazard(ctx,B,lf,0,3);planks(ctx,B,lf,3,h,7,'rgba(20,50,50,.18)');planks(ctx,B,of,3,h,7,'rgba(20,50,50,.18)');
  box(ctx,B.i0+.08,B.j0+.08,B.i1-.08,B.j1-.08,h,h+1.5,'#4a807c',{hl:false});
  winOn(ctx,B,of,.2,.25,h-12,7,false);winOn(ctx,B,of,.6,.25,h-12,7,false);
  // AC unit
  box(ctx,B.i1-.85,B.j1-.85,B.i1-.3,B.j1-.3,h+1.5,h+7,'#c9cdd0',{});
  // press with moving piston on the lane face
  const pz=Math.max(0,Math.sin(t*(run?6:0)))*6;
  const q0=.2,q1=.48; const K=fK(B,lf);
  if(lf==='I'){box(ctx,K,fA(B,lf,q0),K+.35,fA(B,lf,q1),0,10,'#e0a030',{});box(ctx,K+.1,fA(B,lf,q0)+.12,K+.25,fA(B,lf,q1)-.12,10+pz,22,'#9aa4ae',{});box(ctx,K,fA(B,lf,q0),K+.35,fA(B,lf,q1),22,25,'#e0a030',{});}
  else {box(ctx,fA(B,lf,q0),K,fA(B,lf,q1),K+.35,0,10,'#e0a030',{});box(ctx,fA(B,lf,q0)+.12,K+.1,fA(B,lf,q1)-.12,K+.25,10+pz,22,'#9aa4ae',{});box(ctx,fA(B,lf,q0),K,fA(B,lf,q1),K+.35,22,25,'#e0a030',{});}
  // bags
  for(let k=0;k<2+Math.min(3,ms);k++){const p=of==='J'?P(B.i0+.35+k*.3,B.j1+.32,0):P(B.i1+.32,B.j0+.35+k*.3,0);ell(ctx,p[0]+1,p[1]+1,6,3,'rgba(0,0,0,.2)');ctx.fillStyle='#e8dcc0';ctx.fillRect(p[0]-4.5,p[1]-9,9,9);ctx.fillStyle='#8a5a34';ctx.fillRect(p[0]-4.5,p[1]-6,9,2.5);}
  if(run&&Math.random()<scene.dtF*1.2) emitSmoke(sx,sy-10,'light');
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,h),'#9a6ad8');
  if(ms>=6) goldTrim(ctx,B,h);
  return h+40+ms*4;
}
function bPaper(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#e6dfcf',h=28+ms*4;
  const s1=cyl(ctx,B.i0+.4,B.j0+.4,.2,0,h+30+ms*4,'#e8e4dc','#555');
  const s2=cyl(ctx,B.i0+.4,B.j0+1.1,.2,0,h+24+ms*4,'#e8e4dc','#555');
  for(const s of [s1,s2]){ctx.fillStyle='#d84a3a';ctx.fillRect(s[0]-9,s[1]+4,18,4);}
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  planks(ctx,B,lf,0,h,7,'rgba(90,80,60,.15)');planks(ctx,B,of,0,h,7,'rgba(90,80,60,.15)');
  for(const q of [.1,.4,.7]) winOn(ctx,B,of,q,.2,h-14,9,false);
  winOn(ctx,B,lf,.72,.18,h-14,9,false);
  const top=sawtooth(ctx,B.i0,B.j0,B.i1,B.j1,h,10+ms,3,'i','#6f7f8c',wall);
  // roller line on the lane face
  const K=fK(B,lf);
  if(lf==='J'){box(ctx,fA(B,lf,.08),K,fA(B,lf,.62),K+.3,0,7,'#5f6b78',{});}
  else box(ctx,K,fA(B,lf,.08),K+.3,fA(B,lf,.62),0,7,'#5f6b78',{});
  for(let k=0;k<3;k++){const q=.14+k*.16;const p=fPt(B,lf,q+.04,11,.15);
    ell(ctx,p[0],p[1],6,6,'#3f4852');ell(ctx,p[0],p[1],4.6,4.6,'#c9d2da');const a=run?t*8+k:k;ctx.strokeStyle='#5a6470';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p[0]+Math.cos(a)*4.4,p[1]+Math.sin(a)*4.4);ctx.lineTo(p[0]-Math.cos(a)*4.4,p[1]-Math.sin(a)*4.4);ctx.stroke();}
  const pa=fPt(B,lf,.12,13,.2),pb=fPt(B,lf,.6,8,.2);ctx.strokeStyle='#fffdf6';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.stroke();
  if(run){chimneySmoke(s1[0],s1[1],'steam',2);chimneySmoke(s2[0],s2[1],'steam',1.6);}
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,top),'#4ac0a0');
  if(ms>=6) goldTrim(ctx,B,h);
  return Math.max(top,h+30+ms*4)+4;
}
function bFurniture(ctx,L,B,run,t){
  const lf=L.face,of=lf==='I'?'J':'I',ms=B.ms,wall='#d27a50',h=34+ms*4;
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,h,wall,{});
  bricks(ctx,B,of,0,h);planks(ctx,B,lf,0,h,8,'rgba(90,30,10,.18)');
  // roll-up door
  const K=fK(B,lf);fillP(ctx,fq(lf,K,fA(B,lf,.12),fA(B,lf,.5),0,22),'#5a5a60');
  for(let z=2;z<21;z+=3) fillP(ctx,fq(lf,K,fA(B,lf,.14),fA(B,lf,.48),z,z+1.6),'#b8bec6');
  winOn(ctx,B,lf,.6,.14,h-16,10,true);winOn(ctx,B,lf,.8,.14,h-16,10,true);
  for(const q of [.1,.32,.54,.76]) winOn(ctx,B,of,q,.14,h-16,10,true);
  if(ms>=2) for(const q of [.1,.32,.54,.76]) winOn(ctx,B,of,q,.14,8,9,true);
  const top=sawtooth(ctx,B.i0,B.j0,B.i1,B.j1,h,11+ms,3,'j','#5a5f68',wall);
  // rooftop sign
  const si=B.i0+.2,sj=B.j1-.35;
  for(const a of [.3,1.5+ms*.05]){const p=P(si+a,sj,top-4);ctx.strokeStyle='#4a4a4a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0],p[1]-6);ctx.stroke();}
  const sw=1.9+ms*.05;fillP(ctx,fq('J',sj,si+.1,si+.1+sw,top+1,top+12),'#fff3dc',EDGE);
  ctx.save();fxf(ctx,'J',sj,si+.1,top+6.5);ctx.fillStyle='#b8401c';ctx.font='900 7.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FURNITURE',sw*16,0);ctx.restore();
  // sofa display on the lane side
  const sp=lf==='I'?[B.i1+.6,B.j0+B.bs*.78]:[B.i0+B.bs*.78,B.j1+.6];
  box(ctx,sp[0]-.25,sp[1]-.42,sp[0]+.25,sp[1]+.42,0,6,'#4a8ac8',{});box(ctx,sp[0]-.25,sp[1]-.42,sp[0]-.08,sp[1]+.42,6,12,'#3a7ab8',{});
  const cp=P(B.i0+.5,B.j0+.5,top);if(run) chimneySmoke(cp[0],cp[1]-2,'light',.8);
  if(ms>=4) flag(ctx,...P(B.i1,B.j0,top),'#e85a9a');
  if(ms>=6) goldTrim(ctx,B,h);
  return top+14;
}
function drawYardLot(ctx,t){
  const ci=YARD.ci,cj=YARD.cj;
  // office cabin at the back
  const B={i0:ci-1.85,i1:ci-.55,j0:cj-1.85,j1:cj-.75,bs:1.3,ms:0};
  box(ctx,B.i0,B.j0,B.i1,B.j1,0,20,'#a8794a',{});planks(ctx,B,'J',0,20,4);planks(ctx,B,'I',0,20,4);
  winOn(ctx,B,'J',.2,.3,9,7,true);doorOn(ctx,{...B,bs:B.i1-B.i0},'J',.62,.88,14);
  gable(ctx,B.i0,B.j0,B.i1,B.j1,20,10,'j','#4a7a9a','#a8794a',.12);
  // log stacks (grow with stock)
  const stock=S.res.logs, lr=Math.max(1,logRate());
  const fill=Math.max(.15,Math.min(1,stock/(lr*4+20)+(S.collectors.lumberjack>0?.3:0)));
  const nst=[Math.ceil(6*fill),Math.ceil(6*Math.max(0,fill-.2)/0.8),Math.ceil(6*Math.max(0,fill-.45)/.55)];
  logPile(ctx,ci-.1,cj-1.75,'i',nst[0],1.5);
  logPile(ctx,ci-.1,cj-.95,'i',nst[1],1.5);
  logPile(ctx,ci-1.75,cj+.15,'i',nst[2],1.4);
  // debarker drum
  const di=ci+.55,dj=cj+.95;
  box(ctx,di-.75,dj-.32,di+.95,dj+.32,0,5,'#6a7480',{});
  box(ctx,di-.6,dj-.27,di+.8,dj+.27,5,15,'#3f8fbf',{});
  const rot=(scene.t*3)%1;ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.2;ctx.beginPath();for(let k=0;k<4;k++){const a=di-.6+((k+rot)/4)*1.4;const p0=P(a,dj+.27,5),p1=P(a,dj+.27,15);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
  const ep=P(di+.8,dj,10);ell(ctx,ep[0],ep[1],5,5.5,'#2f6f9a');ell(ctx,ep[0],ep[1],2,2.2,'#1a3a5a');
  if(S.collectors.lumberjack>0&&Math.random()<scene.dtF*4){emitP(ep[0]+3,ep[1],'bark');}
  // gantry crane
  const g0=P(ci-1.9,cj-1.9,0),g1=P(ci-1.9,cj+.5,0),gz=40;
  const cx=ci-1.9,crane=Math.sin(scene.t*.6)*.5+.5, cj2=cj-1.6+crane*1.8;
  for(const jj of [cj-1.95,cj+.55]){const a=P(cx-.05,jj,0),b=P(cx+2.25,jj,0);ctx.strokeStyle='#d8a020';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[0],a[1]-gz);ctx.moveTo(b[0],b[1]);ctx.lineTo(b[0],b[1]-gz);ctx.stroke();}
  const bA=P(cx-.05,cj2,gz),bB=P(cx+2.25,cj2,gz);
  const r0=P(cx-.05,cj-1.95,gz),r1=P(cx-.05,cj+.55,gz),r2=P(cx+2.25,cj-1.95,gz),r3=P(cx+2.25,cj+.55,gz);
  ctx.strokeStyle='#c08a18';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.moveTo(r2[0],r2[1]);ctx.lineTo(r3[0],r3[1]);ctx.stroke();
  ctx.strokeStyle='#e8b52a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bA[0],bA[1]);ctx.lineTo(bB[0],bB[1]);ctx.stroke();
  const hk=P(cx+1.1,cj2,gz);ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hk[0],hk[1]);ctx.lineTo(hk[0],hk[1]+16);ctx.stroke();ctx.fillStyle='#555';ctx.fillRect(hk[0]-4,hk[1]+15,8,3);
  ctx.fillStyle='#8a5a2c';ctx.fillRect(hk[0]-8,hk[1]+18,16,4);
  YARD.hit=[P(ci-2,cj-2,46),P(ci+2,cj-2,46),P(ci+2,cj-2,0),P(ci+2,cj+2,0),P(ci-2,cj+2,0),P(ci-2,cj+2,46)];
  YARD.top=P(ci,cj,48);
}
function drawDockLot(ctx,t){
  const ci=DOCK.ci,cj=DOCK.cj;
  box(ctx,ci-1.9,cj-1.9,ci+1.95,cj+1.9,0,7,'#c8c0b0',{});
  for(let k=0;k<4;k++){const p=P(ci+1.95,cj-1.4+k*.95,4);ctx.fillStyle='#2a2a2a';ctx.fillRect(p[0]-1,p[1]-3,3,6);}
  const B={i0:ci-1.75,i1:ci+1.2,j0:cj-1.75,j1:cj+.6,bs:2.95,ms:0};
  box(ctx,B.i0,B.j0,B.i1,B.j1,7,40,'#7d93a8',{});
  planks(ctx,{...B,bs:B.j1-B.j0},'I',7,40,5,'rgba(20,40,60,.18)');planks(ctx,B,'J',7,40,5,'rgba(20,40,60,.18)');
  for(const q of [.12,.56]){const K=B.i1,a0=B.j0+q*(B.j1-B.j0),a1=a0+.36*(B.j1-B.j0);fillP(ctx,fq('I',K,a0,a1,7,28),'#2c3036');fillP(ctx,fq('I',K,a0+.08,a1-.08,7,14),'#b88a52');}
  fillP(ctx,fq('J',B.j1,B.i0+.25,B.i0+2.2,18,27),'#fff3dc',EDGE);
  ctx.save();fxf(ctx,'J',B.j1,B.i0+.25,22.5);ctx.fillStyle='#2f5f8a';ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SHIPPING',1.95*16,0);ctx.restore();
  const top=gable(ctx,B.i0,B.j0,B.i1,B.j1,40,14,'i','#3f6e9a','#7d93a8');
  // goods crates waiting on the platform (front strip)
  const pal=['#d0764e','#e0b071','#f6f3ea','#8a5a34','#3a3634'];
  const n=Math.min(8,1+Math.floor((scene.dockStock||0)*7));
  for(let k=0;k<n;k++){const a=ci-1.5+(k%4)*.78,b=cj+1.05+Math.floor(k/4)*.42;box(ctx,a,b,a+.55,b+.34,7,14,pal[k%5],{});}
  DOCK.hit=[P(ci-2,cj-2,58),P(ci+2,cj-2,58),P(ci+2,cj-2,0),P(ci+2,cj+2,0),P(ci-2,cj+2,0),P(ci-2,cj+2,58)];
  DOCK.top=P(ci,cj,top+6);
}
const BDRAW={sawmill:bSawmill,chipper:bChipper,kiln:bKiln,carpentry:bCarpentry,pellet:bPellet,paper:bPaper,furniture:bFurniture};
function drawConstruction(ctx,L,vis,can){
  const {ci,cj}=L; const e=1.75;
  ctx.save();ctx.setLineDash([6,5]);ctx.lineDashOffset=-scene.t*12*(can?1:0);ctx.strokeStyle=can?'#3f9a2a':'rgba(120,100,70,.7)';ctx.lineWidth=2.2;
  pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.stroke();ctx.restore();
  if(can){ctx.fillStyle=`rgba(120,220,90,${.12+.08*Math.sin(scene.t*4)})`;pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.fill();}
  if(!vis){ // brambles
    for(const [a,b,s] of [[-.8,-.6,1],[.5,-.9,.8],[-.3,.6,.9],[.8,.5,.75],[0,0,1.1]]){const [x,y]=P(ci+a,cj+b);ell(ctx,x+2,y+1,9*s,4*s,'rgba(30,50,10,.2)');ell(ctx,x-3*s,y-4*s,6*s,5*s,'#4f8a35');ell(ctx,x+3*s,y-4*s,6*s,5*s,'#47803a');ell(ctx,x,y-7*s,6*s,5*s,'#5a9a40');}
  } else {
    // cones + materials
    for(const [a,b] of [[-e,-e],[e,-e],[e,e],[-e,e]]){const [x,y]=P(ci+a*.92,cj+b*.92);ctx.fillStyle='#f07a1a';ctx.beginPath();ctx.moveTo(x-3.5,y);ctx.lineTo(x,y-10);ctx.lineTo(x+3.5,y);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x-2.2,y-5.5,4.4,1.6);}
    box(ctx,ci-.9,cj+.2,ci+.3,cj+.6,0,4,'#d9a86a',{hl:false});box(ctx,ci-.8,cj+.25,ci+.2,cj+.55,4,7,'#e0b071',{hl:false});
    box(ctx,ci+.4,cj-.8,ci+.9,cj-.3,0,6,'#b0a090',{hl:false});
  }
  // sign post
  const sp=P(ci-.3,cj-.9,0);ctx.fillStyle='#7a4a26';ctx.fillRect(sp[0]-1.5,sp[1]-24,3,24);
  fillP(ctx,fq('J',cj-.85,ci-.75,ci+.15,16,27),'#f7e3c0',EDGE);
  ctx.save();fxf(ctx,'J',cj-.85,ci-.75,21.5);ctx.font='9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(vis?'🔨':'🔒',14.4,0);ctx.restore();
  L.hit=[P(ci-2,cj-2,30),P(ci+2,cj-2,30),P(ci+2,cj-2,0),P(ci+2,cj+2,0),P(ci-2,cj+2,0),P(ci-2,cj+2,30)];
  L.top=P(ci,cj,34);
}
function drawLot(ctx,L){
  const id=L.id, st=S.buildings[id];
  if(!st.lvl){const b=BMAP[id];drawConstruction(ctx,L,bVisible(b),S.coins+1e-9>=bulkCost(b.cost,b.scale,0,1));return;}
  const B=lotBox(L); const run=st.on&&bstat[id].f>0.01;
  const anim=scene.buildAnim[id]; let k=1;
  ctx.save();
  if(anim!==undefined&&anim<1){k=anim<.6?.4+anim:1+Math.sin((anim-.6)/.4*Math.PI)*.08;const [cx,cy]=P(L.ci,L.cj,0);ctx.translate(cx,cy);ctx.scale(k,k);ctx.translate(-cx,-cy);}
  const lh=L.H||120, bx=[Math.floor((B.i0-B.j1)*32-46),Math.floor((B.i0+B.j0)*16-lh-80),Math.ceil((B.i1-B.j0)*32+46),Math.ceil((B.i1+B.j1)*16+26)];
  const D=scene.dn, sig=st.lvl+'|'+(run?1:0)+'|'+(st.on?1:0)+'|'+SEAS+'|'+Math.round((scene.wet||0)*4)+'|'+Math.round(D.lights*8)+'|'+msOf(id)+'|'+(scene.hover===id?1:0)+'|'+S.tree;
  const H=(anim!==undefined&&anim<1)?BDRAW[id](ctx,L,B,run,scene.t):liveSprite(ctx,'lot:'+id,bx,sig,run?15:3,g=>BDRAW[id](g,L,B,run,scene.t));
  ctx.restore();
  L.hit=boxHit(B.i0-.1,B.j0-.1,B.i1+.15,B.j1+.15,H);
  L.top=P(L.ci,L.cj,H+4); L.H=H;
  if(!st.on){ctx.fillStyle='rgba(40,40,60,.32)';pth(ctx,boxHit(B.i0,B.j0,B.i1,B.j1,Math.min(H,B.ms*4+40)));ctx.fill();}
}
function drawConveyor(ctx,L){
  const st=S.buildings[L.id]; if(!st.lvl) return;
  const c=convOf(L), run=st.on&&bstat[L.id].f>0.01, res=OUT_OF[L.id];
  const w=.2, len=Math.abs(c.a1-c.a0);
  let i0,i1,j0,j1; if(c.axis==='i'){i0=c.a0;i1=c.a1;j0=c.k-w;j1=c.k+w;} else {j0=c.a0;j1=c.a1;i0=c.k-w;i1=c.k+w;}
  // legs
  for(let s=.3;s<len;s+=.9){const p=c.axis==='i'?P(c.a0+s,c.k+w):P(c.k+w,c.a0+s);ctx.fillStyle='#4a4f56';ctx.fillRect(p[0]-1,p[1]-5,2,5);}
  box(ctx,i0,j0,i1,j1,4,7,'#7a828c',{top:'#3f454c'});
  // moving belt stripes
  const off=run?(scene.t*1.1)%.3:0; ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.beginPath();
  for(let s=off;s<len;s+=.3){const a=c.axis==='i'?[P(c.a0+s,c.k-w,7),P(c.a0+s,c.k+w,7)]:[P(c.k-w,c.a0+s,7),P(c.k+w,c.a0+s,7)];ctx.moveTo(a[0][0],a[0][1]);ctx.lineTo(a[1][0],a[1][1]);}ctx.stroke();
  // items
  const f=run?bstat[L.id].f:0; const n=3;
  for(let k=0;k<n;k++){const s=((scene.t*.55*(run?1:0)+k/n)%1)*len; if(!run&&k>0) break; const p=c.axis==='i'?P(c.a0+s,c.k,7):P(c.k,c.a0+s,7); if(f>.01||k===0) cargoIcon(ctx,p[0],p[1]-1,res,.85);}
  // output pallet at the end
  const e=c.end; const pp=P(e[0],e[1],0); ell(ctx,pp[0]+2,pp[1]+1,13,6,'rgba(0,0,0,.18)');
  box(ctx,e[0]-.28,e[1]-.28,e[0]+.28,e[1]+.28,0,3,'#b88a52',{hl:false});
  const stack=Math.min(3,1+Math.floor((S.res[res]||0)>5?2:0)+(run?1:0));
  for(let k=0;k<stack;k++){const q=P(e[0],e[1],3+k*5);cargoIcon(ctx,q[0],q[1]+1,res,.9);}
}
