'use strict';
/* v2.10.1: chimneys + smoke.
   stack(ctx,i,j,o)  square brick / stone / metal stack seated on a roof (or the ground) in iso perspective:
     light left face, dark right face, brick courses or seams, corbelled cap with a dark flue opening, soot
     gradient near the top, lead flashing that follows the roof slope and a soft ambient-occlusion shadow on the roof.
   rstack(ctx,i,j,o) round brick / metal stack (kiln, paper mill, power plant, chipper vent).
   Both are pre-rendered once into a small offscreen sprite (keyed by shape + render scale bucket) and stamped with
   drawImage, so a building cache rebuild costs one blit per chimney. Return the screen-space top centre (smoke origin).
   gableZ(...) = the height of a gable() roof surface at (i,j), used to seat a stack on the slope. */
const CH_SPR=new Map(); let CH_N=0;
function gableZ(i0,j0,i1,j1,z,rise,axis,i,j,ov){ov=ov===undefined?.2:ov;
  const d=axis==='i'?Math.abs(j-(j0+j1)/2)/((j1-j0)/2+ov):Math.abs(i-(i0+i1)/2)/((i1-i0)/2+ov);return z+rise-(rise+3)*Math.min(1,d);}
const CH_STYLE={
  brick:{body:'#a4523a',mortar:'rgba(60,24,14,.30)',cap:'#8c8378',lip:'#b9b0a4'},
  redbrick:{body:'#b24a32',mortar:'rgba(60,20,12,.32)',cap:'#7d746b',lip:'#aaa196'},
  stone:{body:'#8f8a84',mortar:'rgba(40,36,32,.28)',cap:'#6f6a64',lip:'#b6b0a8'},
  darkbrick:{body:'#5a2a1e',mortar:'rgba(20,8,4,.35)',cap:'#3e3a38',lip:'#c9a24a'},
  metal:{body:'#a9b3bb',band:'rgba(40,48,56,.38)',cap:'#6e7880',lip:'#d2d8dc'},
  steel:{body:'#d9dde0',band:'rgba(40,48,56,.30)',cap:'#7a838a',lip:'#eef0f2'},
  white:{body:'#e8e4dc',band:'rgba(60,60,60,.22)',cap:'#8a8680',lip:'#f4f2ee'},
};
function chScale(ctx){const m=ctx.getTransform();const s=Math.hypot(m.a,m.b)||1;return s>2.6?4:s>1.3?3:2;}
function chBlit(ctx,key,w,h,ax,ay,draw){
  const R=chScale(ctx),k=key+'@'+R;let c=CH_SPR.get(k);
  if(!c){c=document.createElement('canvas');c.width=Math.ceil(w*R);c.height=Math.ceil(h*R);const g=c.getContext('2d');g.scale(R,R);g.translate(ax,ay);draw(g);
    CH_SPR.set(k,c);CH_N++;if(CH_SPR.size>260){const f=CH_SPR.keys().next().value;CH_SPR.delete(f);}}
  ctx.drawImage(c,-ax,-ay,w,h);
}
function _lp(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
/* square stack. o:{r, top(z of the rim), base:[zW,zS,zE] roof heights at the three front corners (or z0 for flat ground), style} */
function stack(ctx,i,j,o){
  const r=o.r||.16,st=CH_STYLE[o.style||'brick'],zt=o.top;
  const zb=o.base||[o.z0||0,o.z0||0,o.z0||0];const snow=SEAS===3;
  const zmax=Math.max(zb[0],zb[1],zb[2]);
  const key='s|'+(o.style||'brick')+'|'+r.toFixed(3)+'|'+zb.map(z=>Math.round((zt-z)*2)).join(',')+'|'+(snow?1:0)+'|'+(o.soot===false?0:1);
  const [ox,oy]=P(i,j,0);const W=64*r*1.25+10,dep=zt-Math.min(...zb);
  ctx.save();ctx.translate(ox,oy-zt);
  // local frame: origin = stack centre at rim height; corners of the footprint diamond
  chBlit(ctx,key,W*2,64*r+dep+20,W,32*r+10,g=>{
    const N=[0,-32*r],E=[64*r,0],S=[0,32*r],Wc=[-64*r,0],h=k=>zt-zb[k];   // heights below the rim of W,S,E corners
    const bW=[Wc[0],Wc[1]+h(0)],bS=[S[0],S[1]+h(1)],bE=[E[0],E[1]+h(2)];
    // ambient occlusion on the roof (down-slope + away from the light)
    g.save();g.globalAlpha=.9;
    for(const [e,a] of [[5,.07],[3,.1],[1.5,.13]]){g.fillStyle=`rgba(20,12,6,${a})`;g.beginPath();g.moveTo(bW[0]-e,bW[1]+e*.3);g.lineTo(bS[0],bS[1]+e*.9);g.lineTo(bE[0]+e*1.6,bE[1]+e*.5);
      g.lineTo(bE[0]+e*.4,bE[1]-e*.6);g.lineTo(bS[0],bS[1]-e*.4);g.lineTo(bW[0],bW[1]-e*.4);g.closePath();g.fill();}
    g.restore();
    // faces
    const lf=g.createLinearGradient(Wc[0],0,S[0],0);lf.addColorStop(0,shade(st.body,1.0));lf.addColorStop(1,shade(st.body,.88));
    g.fillStyle=lf;g.beginPath();g.moveTo(Wc[0],Wc[1]);g.lineTo(S[0],S[1]);g.lineTo(bS[0],bS[1]);g.lineTo(bW[0],bW[1]);g.closePath();g.fill();
    const rf=g.createLinearGradient(S[0],0,E[0],0);rf.addColorStop(0,shade(st.body,.68));rf.addColorStop(1,shade(st.body,.58));
    g.fillStyle=rf;g.beginPath();g.moveTo(S[0],S[1]);g.lineTo(E[0],E[1]);g.lineTo(bE[0],bE[1]);g.lineTo(bS[0],bS[1]);g.closePath();g.fill();
    // texture: brick courses (staggered joints) or metal seams, clipped to each face
    const face=(A,B,bA,bB,flip)=>{g.save();g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.lineTo(bB[0],bB[1]);g.lineTo(bA[0],bA[1]);g.closePath();g.clip();
      const hmax=Math.max(bA[1]-A[1],bB[1]-B[1]);
      if(st.mortar){g.strokeStyle=st.mortar;g.lineWidth=.55;g.beginPath();let row=0;
        for(let z=4.2;z<hmax+2;z+=2.6,row++){const p=[A[0],A[1]+z],q=[B[0],B[1]+z];g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);
          for(let t=(row%2?.17:0.0)+.33;t<1;t+=.34){const m=_lp(p,q,t);g.moveTo(m[0],m[1]);g.lineTo(m[0],m[1]-2.6);}}
        g.stroke();
        g.fillStyle=flip?'rgba(255,230,210,.05)':'rgba(255,230,210,.10)';for(let z=4.2,row=0;z<hmax;z+=5.2,row++){const p=_lp([A[0],A[1]+z],[B[0],B[1]+z],(row*.37)%1);g.fillRect(p[0]-1,p[1]+.3,2,1.6);}}
      else{g.strokeStyle=st.band;g.lineWidth=.9;g.beginPath();for(let z=6;z<hmax;z+=7){g.moveTo(A[0],A[1]+z);g.lineTo(B[0],B[1]+z);}g.stroke();
        g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.5;g.beginPath();for(let z=6.9;z<hmax;z+=7){g.moveTo(A[0],A[1]+z);g.lineTo(B[0],B[1]+z);}g.stroke();}
      if(o.soot!==false){const sg=g.createLinearGradient(0,Math.min(A[1],B[1]),0,Math.min(A[1],B[1])+Math.min(14,hmax*.55));sg.addColorStop(0,'rgba(24,20,18,.62)');sg.addColorStop(.45,'rgba(24,20,18,.25)');sg.addColorStop(1,'rgba(24,20,18,0)');
        g.fillStyle=sg;g.fillRect(-80,-80,160,200);}
      g.restore();};
    face(Wc,S,bW,bS,false);face(S,E,bS,bE,true);
    // outline + front edge highlight
    g.strokeStyle='rgba(40,20,10,.55)';g.lineWidth=.8;g.beginPath();g.moveTo(bW[0],bW[1]);g.lineTo(Wc[0],Wc[1]);g.moveTo(bE[0],bE[1]);g.lineTo(E[0],E[1]);g.stroke();
    g.strokeStyle='rgba(255,240,225,.22)';g.beginPath();g.moveTo(S[0],S[1]+1);g.lineTo(bS[0],bS[1]-1);g.stroke();
    // lead flashing following the roof line
    if(o.flash!==false){const fl=2.2;g.fillStyle=shade('#6c7076',.95);g.beginPath();g.moveTo(bW[0]-1.2,bW[1]+.4);g.lineTo(bS[0],bS[1]+1);g.lineTo(bE[0]+1.2,bE[1]+.4);
      g.lineTo(bE[0]+1.2,bE[1]-fl);g.lineTo(bS[0],bS[1]-fl+.5);g.lineTo(bW[0]-1.2,bW[1]-fl);g.closePath();g.fill();
      g.strokeStyle='rgba(230,235,240,.45)';g.lineWidth=.5;g.beginPath();g.moveTo(bW[0]-1.2,bW[1]-fl);g.lineTo(bS[0],bS[1]-fl+.5);g.stroke();
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.moveTo(bS[0],bS[1]-fl+.5);g.lineTo(bE[0]+1.2,bE[1]-fl);g.lineTo(bE[0]+1.2,bE[1]+.4);g.lineTo(bS[0],bS[1]+1);g.closePath();g.fill();}
    // corbelled cap: a slightly wider slab, then the opening
    const k=1.22,cN=[0,-32*r*k],cE=[64*r*k,0],cS=[0,32*r*k],cW=[-64*r*k,0],ch=2.6;
    g.fillStyle=shade(st.cap,.95);g.beginPath();g.moveTo(cW[0],cW[1]);g.lineTo(cS[0],cS[1]);g.lineTo(cS[0],cS[1]+ch);g.lineTo(cW[0],cW[1]+ch);g.closePath();g.fill();
    g.fillStyle=shade(st.cap,.7);g.beginPath();g.moveTo(cS[0],cS[1]);g.lineTo(cE[0],cE[1]);g.lineTo(cE[0],cE[1]+ch);g.lineTo(cS[0],cS[1]+ch);g.closePath();g.fill();
    g.fillStyle=snow?'#f4f8fa':st.lip;g.beginPath();g.moveTo(cN[0],cN[1]);g.lineTo(cE[0],cE[1]);g.lineTo(cS[0],cS[1]);g.lineTo(cW[0],cW[1]);g.closePath();g.fill();
    g.strokeStyle='rgba(40,20,10,.5)';g.lineWidth=.6;g.stroke();
    // flue opening with a dark, slightly glowing-free interior (inner walls catch a little light at the back)
    const q=.62,oN=[0,-32*r*q],oE=[64*r*q,0],oS=[0,32*r*q],oW=[-64*r*q,0];
    const og=g.createLinearGradient(0,oN[1],0,oS[1]);og.addColorStop(0,'#3a322e');og.addColorStop(.55,'#141110');og.addColorStop(1,'#0a0808');
    g.fillStyle=og;g.beginPath();g.moveTo(oN[0],oN[1]);g.lineTo(oE[0],oE[1]);g.lineTo(oS[0],oS[1]);g.lineTo(oW[0],oW[1]);g.closePath();g.fill();
    g.fillStyle='rgba(120,100,90,.35)';g.beginPath();g.moveTo(oN[0],oN[1]);g.lineTo(oE[0],oE[1]);g.lineTo(oE[0]*.6,oE[1]+1.2);g.lineTo(0,oN[1]+1.4);g.closePath();g.fill();
  });
  ctx.restore();
  return [ox,oy-zt-1];
}
/* roof heights under the three visible footprint corners (W, S, E) of a square stack at (ci,cj) on a gable() roof */
function roofSeat(B,z,rise,axis,ci,cj,r){return [[ci-r,cj+r],[ci+r,cj+r],[ci+r,cj-r]].map(([i,j])=>gableZ(B.i0,B.j0,B.i1,B.j1,z,rise,axis,i,j));}
/* round stack. o:{r, z0 (base), top, style, bands:[[z0,z1,col],...] optional colour bands, rim:true, ring:z (platform ring) } */
function rstack(ctx,i,j,o){
  const r=o.r||.2,st=CH_STYLE[o.style||'metal'],z0=o.z0||0,zt=o.top,H=zt-z0,rx=r*45.25,ry=r*22.63,snow=SEAS===3;
  const key='r|'+(o.style||'metal')+'|'+r.toFixed(3)+'|'+Math.round(H*2)+'|'+(o.bands?o.bands.map(b=>b.join(':')).join(';'):'')+'|'+(snow?1:0)+'|'+(o.taper||0)+'|'+(o.ao===false?0:1);
  const [ox,oy]=P(i,j,0);const W=rx*1.3+6;
  ctx.save();ctx.translate(ox,oy-zt);
  chBlit(ctx,key,W*2+10,H+ry*2+16,W+5,ry*1.4+6,g=>{
    const tp=o.taper||0,rt=rx*(1-tp),rtY=ry*(1-tp);   // top radius (slight taper on tall stacks)
    if(o.ao!==false){const sg=g.createRadialGradient(rx*.4,H+ry*.3,1,rx*.4,H+ry*.3,rx*1.9);sg.addColorStop(0,'rgba(20,12,6,.32)');sg.addColorStop(1,'rgba(20,12,6,0)');g.fillStyle=sg;g.beginPath();g.ellipse(rx*.4,H+ry*.3,rx*1.9,ry*1.7,0,0,TAU);g.fill();}
    const body=(col,za,zb)=>{ // za,zb = distance below the rim (za<zb)
      const fa=1-tp*(1-za/H),fb=1-tp*(1-zb/H),ra=rx*fa,rb=rx*fb,ya=ry*fa,yb=ry*fb;
      const gr=g.createLinearGradient(-rx,0,rx,0);gr.addColorStop(0,shade(col,.92));gr.addColorStop(.28,shade(col,1.08));gr.addColorStop(.62,shade(col,.86));gr.addColorStop(1,shade(col,.56));
      g.fillStyle=gr;g.beginPath();g.moveTo(-ra,za);g.ellipse(0,za,ra,ya,0,Math.PI,0,true);g.lineTo(rb,zb);g.ellipse(0,zb,rb,yb,0,0,Math.PI,false);g.closePath();g.fill();};
    body(st.body,0,H);
    if(o.bands) for(const [a,b,col] of o.bands) body(col,Math.max(0,zt-b),Math.min(H,zt-a));
    const rAt=d=>[rx*(1-tp*(1-d/H)),ry*(1-tp*(1-d/H))];
    // texture
    g.save();g.beginPath();g.moveTo(-rx,0);g.ellipse(0,0,rt,rtY,0,Math.PI,0,true);g.lineTo(rx,H);g.ellipse(0,H,rx,ry,0,0,Math.PI,false);g.closePath();g.clip();
    if(st.mortar){g.strokeStyle=st.mortar;g.lineWidth=.55;g.beginPath();let row=0;
      for(let d=3.4;d<H+ry;d+=2.6,row++){const [a,b]=rAt(Math.min(H,d));g.moveTo(-a,d);g.ellipse(0,d,a,b,0,Math.PI,0,true);
        for(let k=0;k<7;k++){const th=Math.PI*(k+(row%2?.5:0)+.25)/7,x=-Math.cos(th)*a,y=d+Math.sin(th)*b;g.moveTo(x,y);g.lineTo(x,y-2.6);}}
      g.stroke();}
    else{g.lineWidth=1;for(let d=7;d<H-1;d+=o.bandStep||9){const [a,b]=rAt(d);g.strokeStyle=st.band;g.beginPath();g.ellipse(0,d,a,b,0,0,Math.PI);g.stroke();
        g.strokeStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(0,d-1,a,b,0,.15*Math.PI,.55*Math.PI);g.stroke();}}
    // soot near the top
    if(o.soot!==false){const sg=g.createLinearGradient(0,0,0,Math.min(18,H*.4));sg.addColorStop(0,'rgba(24,20,18,.6)');sg.addColorStop(.5,'rgba(24,20,18,.22)');sg.addColorStop(1,'rgba(24,20,18,0)');g.fillStyle=sg;g.fillRect(-rx-2,-ry-2,rx*2+4,H+ry*2);}
    g.restore();
    g.strokeStyle='rgba(40,24,14,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(-rt,0);g.lineTo(-rx,H);g.moveTo(rt,0);g.lineTo(rx,H);g.stroke();
    // platform ring (power plant)
    if(o.ring){const d=zt-o.ring,[a,b]=rAt(d);g.strokeStyle='#4f555c';g.lineWidth=1.3;g.beginPath();g.ellipse(0,d,a*1.28,b*1.28,0,0,Math.PI);g.stroke();
      g.strokeStyle='rgba(80,86,92,.6)';g.lineWidth=.7;g.beginPath();for(let k=1;k<8;k++){const th=Math.PI*k/8;g.moveTo(-Math.cos(th)*a*1.28,d+Math.sin(th)*b*1.28);g.lineTo(-Math.cos(th)*a*1.28,d+Math.sin(th)*b*1.28-4);}g.moveTo(-a*1.28,d-4);g.ellipse(0,d-4,a*1.28,b*1.28,0,Math.PI,0,false);g.stroke();}
    // base flashing / plinth
    if(o.flash!==false){g.fillStyle=o.z0>0?'#6c7076':shade(st.cap,.9);g.beginPath();g.moveTo(-rx-1.2,H-2.2);g.ellipse(0,H-2.2,rx+1.2,ry+.6,0,Math.PI,0,true);g.lineTo(rx+1.2,H);g.ellipse(0,H,rx+1.2,ry+.6,0,0,Math.PI,false);g.closePath();g.fill();}
    // rim: thick lip band + top ring, then the opening
    const lr=rt*1.14,lrY=rtY*1.14,lh=2.6;
    const lg=g.createLinearGradient(-lr,0,lr,0);lg.addColorStop(0,shade(st.cap,1.05));lg.addColorStop(.3,shade(st.cap,1.2));lg.addColorStop(1,shade(st.cap,.62));
    g.fillStyle=lg;g.beginPath();g.moveTo(-lr,0);g.ellipse(0,0,lr,lrY,0,Math.PI,0,true);g.lineTo(lr,lh);g.ellipse(0,lh,lr,lrY,0,0,Math.PI,false);g.closePath();g.fill();
    g.fillStyle=snow?'#f4f8fa':st.lip;g.beginPath();g.ellipse(0,0,lr,lrY,0,0,TAU);g.fill();g.strokeStyle='rgba(40,24,14,.45)';g.lineWidth=.6;g.stroke();
    const og=g.createLinearGradient(0,-rtY,0,rtY);og.addColorStop(0,'#3d3532');og.addColorStop(.5,'#15110f');og.addColorStop(1,'#080606');
    g.fillStyle=og;g.beginPath();g.ellipse(0,0,rt*.86,rtY*.86,0,0,TAU);g.fill();
    g.fillStyle='rgba(130,110,98,.35)';g.beginPath();g.ellipse(0,-rtY*.32,rt*.86,rtY*.5,0,Math.PI,0,false);g.ellipse(0,0,rt*.86,rtY*.86,0,0,Math.PI,true);g.fill();
  });
  ctx.restore();
  return [ox,oy-zt-1];
}

/* ---------- smoke: soft pre-rendered puffs, tinted by kind + time of day ---------- */
const SMK={tex:new Map()};
const SMK_COL={grey:[150,146,142,.46],dark:[74,66,62,.6],light:[246,244,240,.52],steam:[252,252,252,.5],white:[248,248,246,.5],exh:[140,138,135,.34]};
function smokeTex(kind,nb){const k=kind+nb;let c=SMK.tex.get(k);if(c) return c;
  const [r0,g0,b0]=SMK_COL[kind]||SMK_COL.grey,n=nb/4;
  // night: darker, cooler, a touch of warm under-glow
  const r=Math.round(r0*(1-.5*n)+30*n),g=Math.round(g0*(1-.5*n)+31*n),b=Math.round(b0*(1-.48*n)+38*n);
  c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  // three overlapping lobes give a cauliflower puff instead of a flat disc
  for(const [cx,cy,rr,a] of [[32,34,26,.75],[24,28,15,.5],[40,27,14,.45],[33,22,12,.4]]){const gr=x.createRadialGradient(cx-3,cy-4,1,cx,cy,rr);
    gr.addColorStop(0,`rgba(${Math.min(255,r+18)},${Math.min(255,g+18)},${Math.min(255,b+18)},${a})`);gr.addColorStop(.55,`rgba(${r},${g},${b},${a*.6})`);gr.addColorStop(1,`rgba(${r-20},${g-20},${b-16},0)`);
    x.fillStyle=gr;x.beginPath();x.arc(cx,cy,rr,0,TAU);x.fill();}
  SMK.tex.set(k,c);return c;}
function smokeStep(s,dt){const w=(scene.wxv&&scene.wxv.wind)||0;s.life+=dt;const k=s.life/s.max;
  s.vx+=dt*(2.4+w*16);s.vy*=Math.pow(.62,dt);s.x+=s.vx*dt+Math.sin(s.ph+s.life*1.7)*dt*2.2;s.y+=s.vy*dt;return k<1;}
function drawSmoke(ctx){const A=scene.smoke;if(!A.length) return;const nb=Math.round(((scene.dn&&scene.dn.night)||0)*4);const ga=ctx.globalAlpha;
  for(let q=0;q<A.length;q++){const s=A[q],k=s.life/s.max;const ex=s.kind==='exh';
    const R=(ex?2.2+k*7:(3.4+k*16)*(s.sz||1))*(1+.15*Math.sin(s.ph));
    const a=(k<.12?k/.12:1)*Math.pow(1-k,1.35)*(SMK_COL[s.kind]||SMK_COL.grey)[3]*2.5;
    if(a<.01) continue;ctx.globalAlpha=Math.min(1,a);ctx.drawImage(smokeTex(s.kind,nb),s.x-R,s.y-R,R*2,R*2);}
  ctx.globalAlpha=ga;}
