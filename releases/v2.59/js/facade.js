'use strict';
/* v2.11 factory facelift helpers.
   Materials (plank / brick / metal walls, shingle / corrugated / tile roofs), framed windows, roller doors,
   soft contact shadows, level-tier extras (wing @ Lv25, vents/solar @ Lv50/100), and stock-yard goods that
   show fill in a few discrete steps so liveSprite caches stay flat. */
function stockStep(f){return Math.max(0,Math.min(4,Math.round((f||0)*4)));}
function bShadow(ctx,i0,j0,i1,j1,a){
  a=a===undefined?.22:a; const [x,y]=P((i0+i1)/2,(j0+j1)/2,0);
  const rx=Math.max(14,((i1-i0)+(j1-j0))*18), ry=rx*.42;
  const g=ctx.createRadialGradient(x+4,y+2,2,x+4,y+2,rx);
  g.addColorStop(0,`rgba(28,22,12,${a})`);g.addColorStop(.55,`rgba(28,22,12,${a*.45})`);g.addColorStop(1,'rgba(28,22,12,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x+4,y+2,rx,ry,0,0,TAU);ctx.fill();
}
/* plank cladding: horizontal boards with kerf lines + slight colour variation on each face */
function wallPlank(ctx,B,f,z0,z1,col){
  const K=fK(B,f),a0=fA(B,f,0),a1=fA(B,f,1);
  fillP(ctx,fq(f,K,a0,a1,z0,z1),f==='I'?shade(col,.92):shade(col,.72));
  ctx.strokeStyle='rgba(60,30,10,.22)';ctx.lineWidth=.8;ctx.beginPath();
  for(let z=z0+5;z<z1-2;z+=5.5){const p=f==='I'?[P(K,a0,z),P(K,a1,z)]:[P(a0,K,z),P(a1,K,z)];ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);}
  ctx.stroke();
}
/* brick courses with mortar + slight colour noise */
function wallBrick(ctx,B,f,z0,z1,col){
  const K=fK(B,f),a0=fA(B,f,0),a1=fA(B,f,1);
  fillP(ctx,fq(f,K,a0,a1,z0,z1),f==='I'?shade(col,.95):shade(col,.7));
  ctx.strokeStyle='rgba(70,25,12,.28)';ctx.lineWidth=.65;ctx.beginPath();
  let r=0;for(let z=z0+4;z<z1-1;z+=4,r++){const p=f==='I'?[P(K,a0,z),P(K,a1,z)]:[P(a0,K,z),P(a1,K,z)];ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);
    for(let q=(r%2?.1:.22);q<.95;q+=.22){const a=fA(B,f,q);const p0=f==='I'?P(K,a,z):P(a,K,z);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p0[0],p0[1]-4);}}
  ctx.stroke();
}
/* corrugated / ribbed metal cladding */
function wallMetal(ctx,B,f,z0,z1,col){
  const K=fK(B,f),a0=fA(B,f,0),a1=fA(B,f,1);
  fillP(ctx,fq(f,K,a0,a1,z0,z1),f==='I'?shade(col,.95):shade(col,.68));
  ctx.strokeStyle='rgba(20,30,40,.2)';ctx.lineWidth=.75;ctx.beginPath();
  for(let q=.1;q<.95;q+=.14){const a=fA(B,f,q);const p0=f==='I'?P(K,a,z0):P(a,K,z0),p1=f==='I'?P(K,a,z1):P(a,K,z1);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}
  ctx.stroke();
}
function wallFace(ctx,B,f,z0,z1,col,kind){
  if(kind==='brick') wallBrick(ctx,B,f,z0,z1,col);
  else if(kind==='metal') wallMetal(ctx,B,f,z0,z1,col);
  else wallPlank(ctx,B,f,z0,z1,col);
}
/* richer gable: ridge cap, denser shingles / corrugations / tiles, eaves overhang, winter snow */
function roofGable(ctx,i0,j0,i1,j1,z,rise,axis,roof,wall,kind,ov){
  ov=ov===undefined?.28:ov;
  const top=gable(ctx,i0,j0,i1,j1,z,rise,axis,roof,wall,ov);
  // ridge highlight on top of the shared gable
  if(axis==='i'){const jm=(j0+j1)/2,r0=P(i0-ov,jm,z+rise),r1=P(i1+ov,jm,z+rise);
    ctx.strokeStyle=SEAS===3?'rgba(200,210,220,.55)':'rgba(40,20,10,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();}
  else{const im=(i0+i1)/2,r0=P(im,j0-ov,z+rise),r1=P(im,j1+ov,z+rise);
    ctx.strokeStyle=SEAS===3?'rgba(200,210,220,.55)':'rgba(40,20,10,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();}
  return top;
}
function _roofTex(ctx,A0,A1,ridge,B0,B1,z,rise,axis,kind,snow){
  const n=kind==='tile'?7:kind==='corrugated'?10:6;
  ctx.strokeStyle=snow?'rgba(140,160,180,.18)':'rgba(0,0,0,.16)';ctx.lineWidth=kind==='corrugated'?.7:1;ctx.beginPath();
  for(let k=1;k<=n;k++){const t=k/(n+1);
    if(axis==='i'){const jj=ridge+(B1-ridge)*t,zz=z+rise-(rise+4)*t;const p0=P(A0,jj,zz),p1=P(A1,jj,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);
      // other slope
      const jj2=ridge+(B0-ridge)*t,zz2=z+rise-(rise+4)*t;const q0=P(A0,jj2,zz2),q1=P(A1,jj2,zz2);ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q1[0],q1[1]);}
    else{const ii=ridge+(B1-ridge)*t,zz=z+rise-(rise+4)*t;const p0=P(ii,A0,zz),p1=P(ii,A1,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);
      const ii2=ridge+(B0-ridge)*t;const q0=P(ii2,A0,zz),q1=P(ii2,A1,zz);ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q1[0],q1[1]);}}
  ctx.stroke();
  if(kind==='corrugated'){ctx.strokeStyle=snow?'rgba(255,255,255,.2)':'rgba(255,255,255,.12)';ctx.lineWidth=.5;ctx.beginPath();
    for(let k=1;k<=n;k++){const t=k/(n+1)+.03;
      if(axis==='i'){const jj=ridge+(B1-ridge)*t,zz=z+rise-(rise+4)*t;const p0=P(A0,jj,zz),p1=P(A1,jj,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}
      else{const ii=ridge+(B1-ridge)*t,zz=z+rise-(rise+4)*t;const p0=P(ii,A0,zz),p1=P(ii,A1,zz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}}
    ctx.stroke();}

}
/* framed window with sill, muntins, night glow */
function winFramed(ctx,B,f,q,w,z,h,lit){
  const K=fK(B,f),a0=fA(B,f,q),a1=fA(B,f,q+w);
  const D=scene.dn; if(D&&D.night>.35) lit=true;
  if(D&&D.lights>.03&&lit) scene.lq.push(fq(f,K,Math.min(a0,a1)+Math.abs(a1-a0)*.12,Math.max(a0,a1)-Math.abs(a1-a0)*.12,z+h*.12,z+h*.88));
  // outer frame
  fillP(ctx,fq(f,K,a0,a1,z,z+h),'#f2e8d4');
  // sill ledge
  fillP(ctx,fq(f,K,a0-.02,a1+.02,z-1.4,z),'#d8c8a8');
  const pane=lit?'#ffd98a':'#7eb6d4';
  fillP(ctx,fq(f,K,Math.min(a0,a1)+Math.abs(a1-a0)*.12,Math.max(a0,a1)-Math.abs(a1-a0)*.12,z+h*.12,z+h*.88),pane);
  // muntin cross
  const mid=fA(B,f,q+w*.5), zm=z+h*.5;
  fillP(ctx,fq(f,K,mid-.015,mid+.015,z+h*.12,z+h*.88),'#f2e8d4');
  fillP(ctx,fq(f,K,Math.min(a0,a1)+Math.abs(a1-a0)*.12,Math.max(a0,a1)-Math.abs(a1-a0)*.12,zm-.7,zm+.7),'#f2e8d4');
  if(!lit) fillP(ctx,fq(f,K,Math.min(a0,a1)+Math.abs(a1-a0)*.12,fA(B,f,q+w*.42),zm,z+h*.88),'rgba(255,255,255,.32)');
}
/* roller / loading door with ribs, frame, yellow hazard bar */
function rollerDoor(ctx,B,f,q0,q1,z1,open){
  const K=fK(B,f),a0=fA(B,f,q0),a1=fA(B,f,q1);
  fillP(ctx,fq(f,K,a0,a1,0,z1),'#5a6068'); // frame
  fillP(ctx,fq(f,K,fA(B,f,q0+.02),fA(B,f,q1-.02),0,z1-1.5),open?'#2a2218':'#c5ccd4');
  if(!open){ctx.strokeStyle='rgba(50,55,60,.45)';ctx.lineWidth=.8;ctx.beginPath();
    for(let z=2;z<z1-2;z+=2.4){const p=fq(f,K,fA(B,f,q0+.02),fA(B,f,q1-.02),z,z);ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);}ctx.stroke();
    // highlight rib
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=.5;ctx.beginPath();
    for(let z=1.2;z<z1-2;z+=2.4){const p=fq(f,K,fA(B,f,q0+.02),fA(B,f,q1-.02),z,z);ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);}ctx.stroke();}
  // top housing
  fillP(ctx,fq(f,K,a0,a1,z1-1.5,z1+2),'#3a4048');
  fillP(ctx,fq(f,K,a0,a1,z1+2,z1+3.4),'#f2c230');
}
function woodDoor(ctx,B,f,q0,q1,z1){
  const K=fK(B,f);
  fillP(ctx,fq(f,K,fA(B,f,q0),fA(B,f,q1),0,z1),'#6a4024');
  fillP(ctx,fq(f,K,fA(B,f,q0+.03),fA(B,f,q1-.03),0,z1-1.5),'#8a5a32');
  // panels
  const mid=fA(B,f,(q0+q1)/2);
  fillP(ctx,fq(f,K,fA(B,f,q0+.08),mid-.02,2,z1*.48),'#7a4a28');
  fillP(ctx,fq(f,K,mid+.02,fA(B,f,q1-.08),2,z1*.48),'#7a4a28');
  fillP(ctx,fq(f,K,fA(B,f,q0+.08),mid-.02,z1*.55,z1-3),'#7a4a28');
  fillP(ctx,fq(f,K,mid+.02,fA(B,f,q1-.08),z1*.55,z1-3),'#7a4a28');
  // handle
  const hp=fPt(B,f,q1-.06,z1*.45,.02);ell(ctx,hp[0],hp[1],1.4,1.4,'#d8b060');
}
function signBand(ctx,B,f,z,h,txt,bg,fg){
  const K=fK(B,f),a0=fA(B,f,.1),a1=fA(B,f,.9);
  fillP(ctx,fq(f,K,a0,a1,z,z+h),bg||'#2a3a4a',EDGE);
  ctx.save();fxf(ctx,f,K,fA(B,f,.5),z+h*.55);
  ctx.fillStyle=fg||'#fff6e0';ctx.font='900 5.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(txt,0,0);ctx.restore();
}
/* Lv25: lean-to wing on the side face */
function tierWing(ctx,L,B,h,wall,roof,kind){
  const lf=L.face,of=lf==='I'?'J':'I';
  let wi0,wi1,wj0,wj1;
  if(of==='J'){wi0=B.i0+.15;wi1=B.i0+B.bs*.55;wj0=B.j1;wj1=B.j1+.55;}
  else{wi0=B.i1;wi1=B.i1+.55;wj0=B.j0+.15;wj1=B.j0+B.bs*.55;}
  const wh=h*.62;
  bShadow(ctx,wi0,wj0,wi1,wj1,.12);
  box(ctx,wi0,wj0,wi1,wj1,0,wh,wall,{});
  gable(ctx,wi0,wj0,wi1,wj1,wh,8,lf==='I'?'i':'j',roof,wall,.12);
  winOn(ctx,{i0:wi0,i1:wi1,j0:wj0,j1:wj1,bs:Math.max(wi1-wi0,wj1-wj0)},lf,.25,.4,wh*.35,7,true);
}
/* Lv50: rooftop vents / AC / machinery */
function tierVents(ctx,B,top,n){
  n=n||2;
  for(let k=0;k<n;k++){
    const i=B.i0+.35+k*((B.i1-B.i0-.7)/Math.max(1,n-1||1)), j=B.j0+.35+k*.15;
    box(ctx,i-.18,j-.18,i+.18,j+.18,top-2,top+5,'#9aa2aa',{});
    const [x,y]=P(i,j,top+5);ell(ctx,x,y,4.5,2.2,'#6a7278');ell(ctx,x,y-1,3.2,1.5,'#4a5056');
    ctx.strokeStyle='#c9d0d6';ctx.lineWidth=1;ctx.beginPath();for(let a=0;a<3;a++){const ang=a*TAU/3+.4;ctx.moveTo(x,y-1);ctx.lineTo(x+Math.cos(ang)*2.8,y-1+Math.sin(ang)*1.3);}ctx.stroke();
  }
}
/* Lv100: solar panels on roof */
function tierSolar(ctx,B,top,axis){
  const panels=[[.25,.35],[.55,.35],[.25,.65],[.55,.65]];
  for(const [u,v] of panels){
    const i=B.i0+(B.i1-B.i0)*u, j=B.j0+(B.j1-B.j0)*v;
    const di=.28,dj=.2, z0=top+1,z1=top+2.2;
    fillP(ctx,[P(i-di,j-dj,z1),P(i+di,j-dj,z1),P(i+di,j+dj,z1),P(i-di,j+dj,z1)],'#1a3a6a',EDGE);
    fillP(ctx,[P(i-di,j-dj,z0),P(i+di,j-dj,z0),P(i+di,j-dj,z1),P(i-di,j-dj,z1)],'#0e2848');
    ctx.strokeStyle='rgba(180,210,255,.35)';ctx.lineWidth=.6;ctx.beginPath();
    for(let k=1;k<3;k++){const t=k/3;const a=P(i-di+(2*di)*t,j-dj,z1),b=P(i-di+(2*di)*t,j+dj,z1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    for(let k=1;k<2;k++){const t=k/2;const a=P(i-di,j-dj+(2*dj)*t,z1),b=P(i+di,j-dj+(2*dj)*t,z1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.stroke();
  }
}
/* apply shared tier extras after the building body */
function tierExtras(ctx,L,B,ms,h,top,wall,roof,kind,col){
  if(ms>=2) tierWing(ctx,L,B,h,wall,roof,kind);
  if(ms>=3) tierVents(ctx,B,top,ms>=5?3:2);
  if(ms>=4){tierSolar(ctx,B,top); flag(ctx,...P(B.i0+.1,B.j0+.1,top+2),col||'#e8473c');}
  if(ms>=6) goldTrim(ctx,B,h);
}
/* ---------- stock yard: metal rack + real goods, fill quantised to 5 steps ---------- */
function rackFrame(ctx,i0,j0,sz,zr,lvl){
  const posts=[[i0,j0],[i0+sz,j0],[i0,j0+sz],[i0+sz,j0+sz]];
  // soft pad + contact shadow
  const [cx,cy]=P(i0+sz/2,j0+sz/2,0);
  const sg=ctx.createRadialGradient(cx+2,cy+1,1,cx+2,cy+1,sz*28);
  sg.addColorStop(0,'rgba(30,22,12,.2)');sg.addColorStop(1,'rgba(30,22,12,0)');
  ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(cx+2,cy+1,sz*26,sz*12,0,0,TAU);ctx.fill();
  fillP(ctx,[P(i0-.05,j0-.05),P(i0+sz+.05,j0-.05),P(i0+sz+.05,j0+sz+.05),P(i0-.05,j0+sz+.05)],SEAS===3?'#dfe4e8':'#b8a888');
  // steel posts with base plates
  for(const [a,b] of posts){const p=P(a,b,0);ctx.fillStyle='#3a424a';ctx.fillRect(p[0]-2.2,p[1]-1.5,4.4,2);
    ctx.fillStyle='#5a6570';ctx.fillRect(p[0]-1.2,p[1]-zr,2.4,zr);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(p[0]-1.2,p[1]-zr,.9,zr);
    ctx.fillStyle='#2a3038';ctx.fillRect(p[0]-1.2,p[1]-zr,2.4,1.4);}
  const layers=1+Math.min(3,Math.floor((lvl+1)/2));
  for(let L=0;L<=layers;L++){const z=2.4+L*((zr-3.2)/Math.max(1,layers));
    // wooden shelf plank
    fillP(ctx,[P(i0+.04,j0+.04,z),P(i0+sz-.04,j0+.04,z),P(i0+sz-.04,j0+sz-.04,z),P(i0+.04,j0+sz-.04,z)],'#a87848');
    fillP(ctx,[P(i0+.04,j0+sz-.04,z),P(i0+sz-.04,j0+sz-.04,z),P(i0+sz-.04,j0+sz-.04,z-1.6),P(i0+.04,j0+sz-.04,z-1.6)],'#8a6038');
    // steel front rail
    ctx.strokeStyle='#7a8690';ctx.lineWidth=1.8;ctx.beginPath();
    const a=P(i0,j0+sz,z+1.2),b=P(i0+sz,j0+sz,z+1.2),c=P(i0+sz,j0,z+1.2);
    ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(a[0],a[1]-1);ctx.lineTo(b[0],b[1]-1);ctx.stroke();}
  // corrugated steel back panel
  fillP(ctx,[P(i0,j0,2.4),P(i0+sz,j0,2.4),P(i0+sz,j0,zr),P(i0,j0,zr)],'rgba(90,100,110,.35)');
  ctx.strokeStyle='rgba(40,50,60,.35)';ctx.lineWidth=.7;ctx.beginPath();
  for(let t=0;t<=6;t++){const u=t/6;const p0=P(i0+sz*u,j0,2.4),p1=P(i0+sz*u,j0,zr);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
  if(lvl>=4){const z=zr+2;fillP(ctx,[P(i0-.04,j0-.04,z),P(i0+sz+.04,j0-.04,z),P(i0+sz+.04,j0+sz+.04,z),P(i0-.04,j0+sz+.04,z)],lvl>=6?'#3a3430':'#5a6470',lvl>=6?(typeof GOLD!=='undefined'?GOLD:'#d8a930'):'rgba(0,0,0,.3)');}
}
function goodsItem(ctx,x,y,z,res,s){
  s=s||1; const p=P(x,y,z);
  if(res==='planks'){
    for(let k=0;k<3;k++){box(ctx,x-.28,y-.1+k*.02,x+.28,y+.08+k*.02,z+k*1.7,z+k*1.7+1.5,'#d8a868',{hl:false,lw:.5});
      const e=P(x+.28,y,z+k*1.7+.7);ell(ctx,e[0],e[1],1.6,1.4,'#e8c890');}
  } else if(res==='chips'){
    ell(ctx,p[0]+1,p[1]+1,7*s,3.5*s,'rgba(0,0,0,.18)');
    ell(ctx,p[0],p[1]-2,6.5*s,4*s,'#c9a060');ell(ctx,p[0]-2,p[1]-4,4*s,2.5*s,'#d8b078');ell(ctx,p[0]+2,p[1]-3,3.5*s,2*s,'#b88848');
  } else if(res==='charcoal'){
    ell(ctx,p[0]+1,p[1]+1,5.5*s,2.8*s,'rgba(0,0,0,.2)');
    ctx.fillStyle='#2e2a28';ctx.beginPath();ctx.ellipse(p[0],p[1]-5*s,4.2*s,5.5*s,0,0,TAU);ctx.fill();
    ctx.fillStyle='#4a4642';ctx.beginPath();ctx.ellipse(p[0],p[1]-10*s,3*s,1.4*s,0,0,TAU);ctx.fill();
    ctx.fillStyle='#d8c8a8';ctx.fillRect(p[0]-2.5*s,p[1]-7*s,5*s,1.6*s);
  } else if(res==='pellets'){
    ell(ctx,p[0]+1,p[1]+1,5.5*s,2.8*s,'rgba(0,0,0,.2)');
    ctx.fillStyle='#e8dcc0';ctx.fillRect(p[0]-4*s,p[1]-9*s,8*s,9*s);
    ctx.fillStyle='#8a5a34';ctx.fillRect(p[0]-4*s,p[1]-5.5*s,8*s,2.2*s);
    ctx.strokeStyle='rgba(60,40,20,.3)';ctx.strokeRect(p[0]-4*s,p[1]-9*s,8*s,9*s);
  } else if(res==='paper'){
    box(ctx,x-.22,y-.16,x+.22,y+.16,z,z+4.5,'#f6f3ea',{hl:false,top:'#fffdf6'});
    ctx.strokeStyle='rgba(180,160,120,.5)';ctx.lineWidth=.6;
    const a=P(x-.2,y,z+1.5),b=P(x+.2,y,z+1.5);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    fillP(ctx,[P(x-.18,y-.14,z+3.2),P(x+.18,y-.14,z+3.2),P(x+.18,y+.14,z+3.2),P(x-.18,y+.14,z+3.2)],'#4a7a9a');
  } else if(res==='chairs'){
    box(ctx,x-.2,y-.2,x+.2,y+.2,z,z+3.5,'#a87040',{hl:false});
    // tiny chair silhouette on top
    const q=P(x,y,z+3.5);ctx.fillStyle='#6a4020';ctx.fillRect(q[0]-3,q[1]-5,6,3);ctx.fillRect(q[0]-3,q[1]-9,1.5,4);ctx.fillRect(q[0]+1.5,q[1]-5,1.5,2);
  } else if(res==='furniture'){
    box(ctx,x-.26,y-.22,x+.26,y+.22,z,z+6,'#c87848',{hl:false,top:'#e09060'});
    fillP(ctx,[P(x-.22,y+.22,z+2),P(x+.22,y+.22,z+2),P(x+.22,y+.22,z+4.5),P(x-.22,y+.22,z+4.5)],'#2a4a6a');
    ctx.save();fxf(ctx,'J',y+.22,x,z+3.2);ctx.fillStyle='#fff';ctx.font='900 3.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FURN',0,0);ctx.restore();
  } else {
    // generic branded crate
    const col=RCOL[res]||'#c98a4a';
    box(ctx,x-.22,y-.22,x+.22,y+.22,z,z+5,col,{hl:false,top:shade(col,1.2)});
    ctx.strokeStyle='rgba(40,20,10,.35)';ctx.lineWidth=.7;
    const a=P(x-.2,y,z+2.5),b=P(x+.2,y,z+2.5);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  }
}
function palletStackFancy(ctx,i0,j0,sz,res,step,lvl,full){
  const layers=1+Math.min(2,Math.floor((lvl+1)/2));
  const zr=2.5+layers*6.5+(lvl>=2?layers:0);
  rackFrame(ctx,i0,j0,sz,Math.max(zr,16),lvl);
  if(step<=0) return;
  if(res==='logs'){logPile(ctx,i0+sz*.5,j0+sz*.2,'i',Math.min(6,1+step),sz*.9); }
  else{
    const n=Math.min(6,step*2); // 2,4,6,8 capped at 6
    for(let q=0;q<n;q++){
      const L=Math.floor(q/3),r=q%3;
      const x=i0+sz*(.2+r*.3), y=j0+sz*(.25+L*.35), z=2.8+L*6;
      const p=P(x,y,z); cargoIcon(ctx,p[0],p[1]-1,res,.85);
    }
  }
  if(full){const p=P(i0+sz*.5,j0+sz,zr+(lvl>=4?10:6));ctx.fillStyle='#c4463d';rr(ctx,p[0]-11,p[1]-6,22,10,3);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FULL',p[0],p[1]-1);}
}
