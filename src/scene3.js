
/* ---------------- people ---------------- */
function person(ctx,x,y,o){
  const s=o.s||1; ctx.save(); ctx.translate(x,y); ctx.scale(s*(o.face<0?-1:1),s);
  const sw=o.walk?Math.sin(o.ph)*2.6:0, bob=o.walk?Math.abs(Math.cos(o.ph))*1.2:0;
  ctx.lineCap='round';
  ctx.strokeStyle=o.pants||'#3d4f7a';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-1.6,-7);ctx.lineTo(-1.6-sw,-.5);ctx.moveTo(1.6,-7);ctx.lineTo(1.6+sw,-.5);ctx.stroke();
  ctx.fillStyle='#3a2a1a';ctx.fillRect(-3.2-sw,-1.2,3,1.6);ctx.fillRect(.4+sw,-1.2,3,1.6);
  ctx.translate(0,-bob);
  ctx.fillStyle=o.shirt||'#c84a32'; if(ctx.roundRect){ctx.beginPath();ctx.roundRect(-4.2,-16.5,8.4,10.5,3);ctx.fill();} else ctx.fillRect(-4.2,-16.5,8.4,10.5);
  if(o.vest){ctx.fillStyle=o.vest;ctx.fillRect(-4.2,-15,8.4,6.5);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(-4.2,-11.5,8.4,1.2);}
  // arms
  ctx.strokeStyle=o.vest||o.shirt||'#c84a32';ctx.lineWidth=2.4;
  if(o.action==='chop'||o.action==='saw'){
    const a=o.action==='chop'?(-1.9+Math.max(0,Math.sin(o.ph))*2.2):(-.2+Math.sin(o.ph*3)*.12);
    ctx.save();ctx.translate(2,-14);ctx.rotate(a);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(6,0);ctx.stroke();
    if(o.action==='chop'){ctx.fillStyle='#7a4a22';ctx.fillRect(5,-1,9,2);ctx.fillStyle='#c9d2da';ctx.beginPath();ctx.moveTo(12,-1);ctx.lineTo(16,-4);ctx.lineTo(16.5,2);ctx.lineTo(12,1);ctx.closePath();ctx.fill();}
    else {ctx.fillStyle='#f08a1a';ctx.fillRect(4,-2.5,5,5);ctx.fillStyle='#9aa4ae';ctx.fillRect(9,-1.4,9,2.8);ctx.strokeStyle='#5a6470';ctx.lineWidth=.8;ctx.strokeRect(9,-1.4,9,2.8);}
    ctx.restore();
    ctx.beginPath();ctx.moveTo(-2.5,-14);ctx.lineTo(1,-11);ctx.stroke();
  } else if(o.cargo){
    ctx.beginPath();ctx.moveTo(-3.5,-14);ctx.lineTo(-3,-20);ctx.moveTo(3.5,-14);ctx.lineTo(3,-20);ctx.stroke();
  } else {
    const as=o.walk?Math.sin(o.ph)*2:0;ctx.beginPath();ctx.moveTo(-3.6,-15);ctx.lineTo(-4.2+as,-9);ctx.moveTo(3.6,-15);ctx.lineTo(4.2-as,-9);ctx.stroke();
  }
  // head
  ctx.fillStyle=o.skin||'#f2c49a';ctx.beginPath();ctx.arc(0,-19.5,3.6,0,TAU);ctx.fill();
  if(o.beard){ctx.fillStyle=o.beard;ctx.beginPath();ctx.arc(0,-18.4,3.1,0,Math.PI);ctx.fill();}
  ctx.fillStyle='#2a1a10';ctx.fillRect(1.4,-20.4,1,1.2);
  if(o.hat==='hard'){ctx.fillStyle=o.hatc||'#f5c22e';ctx.beginPath();ctx.arc(0,-21,4.1,Math.PI,0);ctx.fill();ctx.fillRect(-5,-21.4,10,1.5);}
  else if(o.hat==='beanie'){ctx.fillStyle=o.hatc||'#c83a2e';ctx.beginPath();ctx.arc(0,-21,3.9,Math.PI,0);ctx.fill();ctx.fillRect(-4,-21.6,8,1.6);ctx.beginPath();ctx.arc(0,-25,1.3,0,TAU);ctx.fill();}
  if(o.cargo) cargoIcon(ctx,0,-24,o.cargo,1);
  if(o.zz){ctx.scale(o.face<0?-1:1,1);ctx.fillStyle='rgba(255,255,255,.95)';ctx.font='bold 8px system-ui';ctx.fillText('z',5,-27-Math.sin(scene.t*2)*2);ctx.font='bold 6px system-ui';ctx.fillText('z',9,-32-Math.sin(scene.t*2+1)*2);}
  ctx.restore();
}
function cargoIcon(ctx,x,y,res,s){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const c=RCOL[res]||'#a86';
  if(res==='logs'){ctx.fillStyle='#8a5a2c';ctx.fillRect(-6,-3,12,5);ell(ctx,6,-.5,2,2.5,'#e3b77a');ell(ctx,6,-.5,.8,1,'#a8743a');}
  else if(res==='planks'){ctx.fillStyle=c;ctx.fillRect(-7,-3,14,2.2);ctx.fillRect(-7,-.6,14,2.2);ctx.strokeStyle='rgba(120,70,20,.6)';ctx.lineWidth=.6;ctx.strokeRect(-7,-3,14,2.2);ctx.strokeRect(-7,-.6,14,2.2);}
  else if(res==='chips'){ctx.fillStyle='#a8864a';ctx.beginPath();ctx.moveTo(-5,2);ctx.lineTo(5,2);ctx.lineTo(4,-3);ctx.lineTo(-4,-3);ctx.closePath();ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-3,3.5,Math.PI,0);ctx.fill();}
  else if(res==='chairs'){ctx.fillStyle=c;ctx.fillRect(-3,-1,6,1.6);ctx.fillRect(-3,-6,1.4,6.6);ctx.fillRect(1.8,-1,1.2,3.5);ctx.fillRect(-3,-1,1.2,3.5);}
  else {ctx.fillStyle=c;ctx.fillRect(-4,-4,8,6);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(1.5,-4,2.5,6);ctx.strokeStyle='rgba(60,30,10,.5)';ctx.lineWidth=.6;ctx.strokeRect(-4,-4,8,6);}
  ctx.restore();
}

/* ---------------- vehicles ---------------- */
// axis-aligned vehicle parts. along = local coordinate on the driving axis (front = +), across = +-w
function vpart(ctx,ci,cj,axis,dir,a0,a1,w,z0,z1,col,o){
  let i0,i1,j0,j1; const lo=Math.min(a0*dir,a1*dir),hi=Math.max(a0*dir,a1*dir);
  if(axis==='i'){i0=ci+lo;i1=ci+hi;j0=cj-w;j1=cj+w;} else {j0=cj+lo;j1=cj+hi;i0=ci-w;i1=ci+w;}
  box(ctx,i0,j0,i1,j1,z0,z1,col,o); return {i0,i1,j0,j1};
}
function wheels(ctx,ci,cj,axis,dir,pos,w){
  for(const a of pos) for(const s of [-1,1]){const p=axis==='i'?P(ci+a*dir,cj+s*w,3):P(ci+s*w,cj+a*dir,3);ell(ctx,p[0],p[1],3.6,3.6,'#2a2a2e');ell(ctx,p[0],p[1],1.4,1.4,'#8a8a90');}
}
function truck(ctx,ci,cj,axis,dir,col,kind,load){
  shadowAt(ctx,ci,cj,40,16,.22);
  wheels(ctx,ci,cj,axis,dir,[-.85,.85],.5);
  const parts=[];
  parts.push(()=>{vpart(ctx,ci,cj,axis,dir,-1.35,.55,.52,4,9,'#4a4a50');
    if(kind==='logs'){
      const n=Math.max(0,Math.min(6,Math.round(load*6)));
      for(let k=0;k<n;k++){const row=k<3?0:1, col2=k%3; const off=(col2-1)*.3, z=9+row*6;
        const lo=-1.3,hi=.45; let i0,i1,j0,j1; if(axis==='i'){i0=ci+Math.min(lo*dir,hi*dir);i1=ci+Math.max(lo*dir,hi*dir);j0=cj+off-.15;j1=cj+off+.15;}else{j0=cj+Math.min(lo*dir,hi*dir);j1=cj+Math.max(lo*dir,hi*dir);i0=ci+off-.15;i1=ci+off+.15;}
        box(ctx,i0,j0,i1,j1,z,z+5.5,'#9a6234',{hl:false});
        const ep=axis==='i'?P(dir>0?i1:i1,(j0+j1)/2,z+2.7):P((i0+i1)/2,dir>0?j1:j1,z+2.7); ell(ctx,ep[0],ep[1],2.6,2.6,'#e2b67a');ell(ctx,ep[0],ep[1],1,1,'#a8743a');}
      // stakes
      for(const a of [-1.3,.45]) for(const s of [-1,1]){const p0=axis==='i'?P(ci+a*dir,cj+s*.5,9):P(ci+s*.5,cj+a*dir,9);ctx.strokeStyle='#3a3a40';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p0[0],p0[1]-11);ctx.stroke();}
    } else {
      vpart(ctx,ci,cj,axis,dir,-1.35,.5,.52,9,24,col,{});
      // stripe & logo on the visible side
      const side=axis==='i'?'J':'I', K=axis==='i'?cj+.52:ci+.52;
      const a0=axis==='i'?ci-1.25*dir:cj-1.25*dir, a1=axis==='i'?ci+.4*dir:cj+.4*dir;
      fillP(ctx,fq(side,K,Math.min(a0,a1),Math.max(a0,a1),13,15.5),'rgba(255,255,255,.75)');
      if(load>0){ // open back shows crates count
        const n=Math.ceil(load*4);ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='bold 7px system-ui';ctx.textAlign='center';
        const lp=side==='J'?P((a0+a1)/2,K,19):P(K,(a0+a1)/2,19);ctx.fillText('▮'.repeat(n),lp[0],lp[1]+2);
      }
    }});
  parts.push(()=>{const c=vpart(ctx,ci,cj,axis,dir,.6,1.4,.5,4,20,col,{});
    // windshield (front face) + side window
    if(dir>0){const f=axis==='i'?'I':'J', K=axis==='i'?c.i1:c.j1; const a0=axis==='i'?c.j0+.1:c.i0+.1, a1=axis==='i'?c.j1-.1:c.i1-.1; fillP(ctx,fq(f,K,a0,a1,12,18),'#a8d8ee');fillP(ctx,fq(f,K,a0,(a0+a1)/2,14,18),'rgba(255,255,255,.4)');}
    const sf=axis==='i'?'J':'I', SK=axis==='i'?c.j1:c.i1; const b0=axis==='i'?c.i0+.12:c.j0+.12, b1=axis==='i'?c.i1-.15:c.j1-.15;
    fillP(ctx,fq(sf,SK,b0,b1,12,18),'#a8d8ee');
    box(ctx,c.i0,c.j0,c.i1,c.j1,20,21.5,shade(col,.8),{edge:false});
  });
  if(dir<0) parts.reverse();
  for(const p of parts) p();
}
function forklift(ctx,i,j,hi,hj,cargo){
  const K=.74, vp=(a0,a1,w,z0,z1,c,o)=>vpart(ctx,i,j,axis,dir,a0*K,a1*K,w*K,z0*K,z1*K,c,o);
  shadowAt(ctx,i,j,12,5.5,.22);
  const axis=Math.abs(hi)>=Math.abs(hj)?'i':'j', dir=(axis==='i'?hi:hj)>=0?1:-1;
  const front=()=>{ // mast, forks, pallet
    const m=vp(.42,.5,.3,2,22,'#3a3a3e',{hl:false});
    vp(.5,.95,.24,2,3.5,'#9aa0a8',{edge:false});
    if(cargo){vp(.5,.98,.3,3.5,5,'#b88a52',{hl:false});vp(.55,.93,.25,5,11,RCOL[cargo]||'#c96',{});}
  };
  const body=()=>{wheels(ctx,i,j,axis,dir,[-.2*K,.3*K],.3*K);
    vp(-.45,.42,.32,3,11,'#f2b92e',{});
    vp(-.45,-.15,.3,11,15,'#3a3a3e',{hl:false});
    // cage posts + roof
    for(const a of [-.4,.35]) for(const s of [-1,1]){const p=axis==='i'?P(i+a*K*dir,j+s*.28*K,11*K):P(i+s*.28*K,j+a*K*dir,11*K);ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0],p[1]-11*K);ctx.stroke();}
    const s0=axis==='i'?P(i-.05*dir,j,17*K):P(i,j-.05*dir,17*K);
    person(ctx,s0[0],s0[1]+7,{s:.55,shirt:'#3a6ab0',hat:'hard',face:1});
    vp(-.45,.38,.32,22,23.5,'#2a2a2e',{edge:false});
  };
  if(dir>0){body();front();} else {front();body();}
}
function heli(ctx,x,y,alt,ph,carry){
  ctx.fillStyle='rgba(30,40,10,.18)';ctx.beginPath();ctx.ellipse(x+alt*.25,y,18,7,0,0,TAU);ctx.fill();
  const hy=y-alt;
  if(carry){ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,hy+6);ctx.lineTo(x,hy+26);ctx.stroke();ctx.fillStyle='#8a5a2c';ctx.fillRect(x-9,hy+26,18,6);ell(ctx,x+9,hy+29,2.2,3,'#e2b67a');ctx.fillRect(x-7,hy+21,14,5);}
  ctx.fillStyle='#d84a3a';ctx.beginPath();ctx.ellipse(x,hy,13,7,0,0,TAU);ctx.fill();
  ctx.fillStyle='#b83a2e';ctx.fillRect(x+8,hy-3,16,3.5);ctx.fillRect(x+21,hy-8,3,8);
  ctx.fillStyle='#a8d8ee';ctx.beginPath();ctx.ellipse(x-6,hy-1,5,4,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#333';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-8,hy+9);ctx.lineTo(x+8,hy+9);ctx.stroke();
  ctx.fillStyle='rgba(60,60,60,.35)';ctx.beginPath();ctx.ellipse(x,hy-9,26,5,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(40,40,40,.85)';ctx.lineWidth=2;ctx.beginPath();const r=Math.cos(ph*30)*26;ctx.moveTo(x-r,hy-9);ctx.lineTo(x+r,hy-9);ctx.stroke();
  ctx.fillStyle='#333';ctx.fillRect(x-1.5,hy-10,3,4);
}
function drone(ctx,x,y,alt,ph){
  ctx.fillStyle='rgba(30,40,10,.16)';ctx.beginPath();ctx.ellipse(x+alt*.2,y,9,4,0,0,TAU);ctx.fill();
  const hy=y-alt;
  ctx.strokeStyle='#5a6470';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-8,hy-3);ctx.lineTo(x+8,hy+3);ctx.moveTo(x+8,hy-3);ctx.lineTo(x-8,hy+3);ctx.stroke();
  for(const [dx,dy] of [[-8,-3],[8,-3],[-8,3],[8,3]]){ctx.fillStyle='rgba(180,240,255,.55)';ctx.beginPath();ctx.ellipse(x+dx,hy+dy-1,5,2,0,0,TAU);ctx.fill();}
  ctx.fillStyle='#3a5a7a';ctx.fillRect(x-4,hy-2.5,8,5);ctx.fillStyle=(Math.sin(ph*6)>0)?'#7dfc6a':'#2a6a2a';ctx.fillRect(x-1,hy-4,2,1.6);
}
function harvesterV(ctx,i,j,dir,ph){
  shadowAt(ctx,i,j,26,11,.22);
  wheels(ctx,i,j,'j',dir,[-.6,.6],.55);
  vpart(ctx,i,j,'j',dir,-.9,.9,.55,4,12,'#e6b52a',{});
  vpart(ctx,i,j,'j',dir,-.1,.8,.45,12,24,'#5a9a3a',{});
  fillP(ctx,fq('I',i+.45,Math.min(j,j+.7*dir),Math.max(j,j+.7*dir),15,22),'#a8d8ee');
  const a=P(i-.1,j-.4*dir,14); const ang=-1.1+Math.sin(ph*1.3)*.5;
  ctx.strokeStyle='#d8a020';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a[0],a[1]);const b=[a[0]-14*Math.cos(ang),a[1]+14*Math.sin(ang)-10];ctx.lineTo(b[0],b[1]);ctx.lineTo(b[0]-12,b[1]+8);ctx.stroke();
  ctx.fillStyle='#555';ctx.fillRect(b[0]-16,b[1]+6,8,6);
}
