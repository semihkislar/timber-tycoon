'use strict';

/* ===================== v2.3 LIGHTING, SEASONS & WEATHER (visuals) ===================== */
let SEAS=0;   // season the cached ground chunks / roofs / trees are drawn for
// ambient multiply colour across the day (0 = midnight). Night stays a readable moonlit blue, never black.
const AMB_KEYS=[[0,[124,138,196]],[.17,[124,138,196]],[.215,[196,160,190]],[.255,[248,232,218]],[.31,[255,255,255]],[.68,[255,255,255]],
  [.735,[255,222,176]],[.785,[238,164,122]],[.835,[150,140,190]],[.86,[124,138,196]],[1,[124,138,196]]];
function ambAt(p){for(let k=1;k<AMB_KEYS.length;k++){const [p1,c1]=AMB_KEYS[k];if(p<=p1){const [p0,c0]=AMB_KEYS[k-1];let t=(p-p0)/(p1-p0);t=t*t*(3-2*t);return [c0[0]+(c1[0]-c0[0])*t,c0[1]+(c1[1]-c0[1])*t,c0[2]+(c1[2]-c0[2])*t];}}return AMB_KEYS[0][1].slice();}
function dayState(){
  const p=dayPhase(), wv=scene.wxv; let a=ambAt(p);
  const oc=Math.max(wv.rain,wv.snow*.75);  // overcast
  a=[a[0]*(1-.2*oc),a[1]*(1-.17*oc),a[2]*(1-.09*oc)];
  const lum0=(a[0]+a[1]+a[2])/3, day=Math.max(0,Math.min(1,(lum0-170)/70));
  if(wv.sunny>0){const s=wv.sunny*day;a=[a[0],a[1]*(1-.025*s),a[2]*(1-.08*s)];}
  const lum=(a[0]+a[1]+a[2])/3, night=Math.max(0,Math.min(1,(246-lum)/(246-152)));
  return {p,amb:a,night,day,oc,lights:Math.max(night,oc*.5)};
}
scene.wxv={rain:0,snow:0,wind:0,sunny:0}; scene.wet=0; scene.lq=[]; scene.dn={p:.3,amb:[255,255,255],night:0,day:1,oc:0,lights:0};
function updateWorldVis(dt){
  const w=weatherId(), v=scene.wxv;
  for(const k in v){const tg=w===k?1:0;v[k]+=(tg-v[k])*Math.min(1,dt*(tg>v[k]?.35:.25));if(v[k]<.002) v[k]=0;}
  scene.wet=Math.max(0,Math.min(1,scene.wet+(v.rain>.3?dt*.06:-dt*.012)));
  const si=seasonIdx(); if(si!==SEAS){SEAS=si;scene.chunks.clear();scene.seasonFlash=1;}
  if(scene.seasonFlash>0) scene.seasonFlash=Math.max(0,scene.seasonFlash-dt*.5);
}
/* ---------- season palettes ---------- */
const SNOW='#eaf0f4';
const GRASS_S=[null,['#86c75a','#80c055','#8bcc60','#7dbd52'],['#b4b765','#adb05e','#b8bc6b','#a6aa58'],['#e9eff3','#e3eaef','#eef3f6','#dfe7ec']];
const FLOOR_S=[null,['#6cae4c','#68a948','#70b250','#64a645'],['#a3a254','#9c9b4e','#a8a85a','#96954a'],['#dde6eb','#d7e1e7','#e2eaee','#d2dde4']];
const AUT=[['#a8481c','#d0702a','#efa040'],['#a8801c','#d4aa2c','#f0d058'],['#86281e','#b23c28','#dc6036'],['#9a6a1e','#c8902c','#e8b84a']];
function treeColors(pal,t,tier){
  const c=pal.c, v=t.var;
  if(pal.cherry) return c;
  if(SEAS===2){ if(pal.k==='round') return AUT[Math.floor(v*3.999)%3]; if(v<.42) return AUT[3]; return c;}
  if(SEAS===3){ if(pal.k==='round') return ['#6d6255','#86796a','#a39584']; return [shade(c[0],.85),shade(c[1],.85),shade(c[2],.9)];}
  return c;
}
/* ---------- puddles (appear while it rains, dry slowly) ---------- */
function puddleSpots(){
  if(scene._pud) return scene._pud; const out=[];
  for(let u=14;u<=54;u+=1.7){const h=hash2(u*13,7);const v=(h-.5)*3.2;out.push({i:(u+v)/2,j:(u-v)/2,r:9+h*13,h});}
  for(let j=-8;j<44;j+=2.6){const h=hash2(j*7,3);out.push({i:30.15+h*.1,j:j+h,r:7+h*9,h});}
  for(let i=-12;i<5;i+=2.4){const h=hash2(i*5,11);out.push({i,j:DIRT_J+(h-.5)*1.2,r:8+h*10,h,mud:true});}
  return scene._pud=out;
}
function drawPuddles(ctx,inView){
  const w=scene.wet; if(w<.02) return; const t=scene.t, rain=scene.wxv.rain;
  for(const q of puddleSpots()){const [x,y]=P(q.i,q.j);if(!inView(x,y,40)) continue;const r=q.r*(.45+.55*w);
    ctx.fillStyle=q.mud?`rgba(110,80,45,${.45*w})`:`rgba(96,118,148,${.42*w})`;ctx.beginPath();ctx.ellipse(x,y,r,r*.5,0,0,TAU);ctx.fill();
    ctx.fillStyle=`rgba(225,236,250,${.28*w})`;ctx.beginPath();ctx.ellipse(x-r*.25,y-r*.12,r*.4,r*.12,0,0,TAU);ctx.fill();
    if(rain>.15){for(let k=0;k<2;k++){const ph=(t*1.4+q.h*7+k*.5)%1;ctx.strokeStyle=`rgba(235,242,255,${(1-ph)*.55*rain})`;ctx.lineWidth=.8;
      ctx.beginPath();ctx.ellipse(x+(hash2(k,q.i*9)-.5)*r,y+(hash2(q.j*9,k)-.5)*r*.4,ph*r*.45,ph*r*.22,0,0,TAU);ctx.stroke();}}}
}
/* ---------- light sprites ---------- */
const _glow={};
function glowSprite(col){let c=_glow[col];if(c) return c;c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,`rgba(${col},1)`);gr.addColorStop(.35,`rgba(${col},.55)`);gr.addColorStop(1,`rgba(${col},0)`);
  g.fillStyle=gr;g.fillRect(0,0,64,64);return _glow[col]=c;}
const LC={warm:'255,190,105',gold:'255,214,120',cool:'225,235,255',red:'255,55,35',fire:'255,130,40',glass:'255,226,160'};
function glow(g,x,y,rx,ry,col,a,rot){if(a<=.003) return;g.globalAlpha=Math.min(1,a);const sp=glowSprite(LC[col]||col);
  if(rot){g.save();g.translate(x,y);g.rotate(rot);g.drawImage(sp,-rx,-ry,rx*2,ry*2);g.restore();} else g.drawImage(sp,x-rx,y-ry,rx*2,ry*2);}
function vehLights(out,v,front,back,small){
  if(v.i===undefined||v.done) return; const V=VF(v.i,v.j,v.yaw||0,0);
  const d=P(V.fi,V.fj),o=P(0,0),rot=Math.atan2(d[1]-o[1],d[0]-o[0]);
  const b=VL(V,front+(small?.8:1.7),0,0);out.push({x:b[0],y:b[1],rx:small?30:66,ry:small?14:24,c:'warm',a:.75,rot});
  for(const cc of [-.3,.3]){const h=VL(V,front,cc*(small?.7:1),small?4:6);out.push({x:h[0],y:h[1],rx:7,ry:7,c:'cool',a:.95,core:1});}
  if(back) for(const cc of [-.32,.32]){const h=VL(V,back,cc,8.5);out.push({x:h[0],y:h[1],rx:v.brake?11:7,ry:v.brake?11:7,c:'red',a:v.brake?1:.7,core:1});}
}
function collectLights(){
  const out=[], t=scene.t;
  for(const l of scene.lamps){const [x,y]=P(l.i,l.j);out.push({x:x+5,y:y+2,rx:50,ry:25,c:'warm',a:.85});out.push({x:x+6,y:y-27,rx:15,ry:15,c:'warm',a:.9,core:1});}
  if(premOpen()) for(const [i,j] of [[24.75,.35],[24.75,8.7],[28.75,.3],[21.25,.3]]){const [x,y]=P(i,j);out.push({x,y:y+1,rx:42,ry:21,c:'gold',a:.8});out.push({x,y:y-27,rx:13,ry:13,c:'gold',a:.95,core:1});}
  for(const b of BUILDINGS){const st=S.buildings[b.id];if(!st.lvl||b.tech) continue;if(b.premium&&!premOpen()) continue;const L=LOTS[b.id];const d=doorOf(L);
    const [x,y]=P(d[0],d[1],0);out.push({x,y,rx:30,ry:15,c:b.premium?'gold':'warm',a:.6});const [hx,hy]=P(d[0],d[1],15);out.push({x:hx,y:hy,rx:9,ry:9,c:'warm',a:.8,core:1});
    if(b.id==='kiln'&&st.on){const fl=.75+.25*Math.sin(t*9)*Math.sin(t*5.3);const k=P(d[0],d[1]-.9,6);out.push({x:k[0],y:k[1],rx:48,ry:30,c:'fire',a:.7*fl});}}
  {const [x,y]=P(YARD.ci,YARD.cj,0);out.push({x,y,rx:80,ry:40,c:'warm',a:.45});}
  {const [x,y]=P(28.6,21,0);out.push({x,y,rx:70,ry:34,c:'warm',a:.55});}
  {const fl=.8+.2*Math.sin(t*11)*Math.sin(t*6.7);const [x,y]=P(CAMP.i,CAMP.j,0);out.push({x,y,rx:86,ry:48,c:'fire',a:.85*fl});out.push({x,y:y-6,rx:16,ry:16,c:'fire',a:1,core:1});}
  for(const v of scene.logTrucks) vehLights(out,v,1.62,-1.64);
  for(const v of scene.dockTrucks) vehLights(out,v,1.62,-1.64);
  for(const v of scene.marketVans||[]) vehLights(out,v,v.cart?.9:.98,v.cart?-0.9:-1.05);
  for(const v of scene.premTrucks||[]) vehLights(out,v,1.62,-1.64);
  if(scene.client&&scene.client.veh) vehLights(out,scene.client.veh,1.08,-1.06);
  for(const f of scene.forklifts) vehLights(out,f,.55,null,true);
  fvLights(out);
  for(const f of scene.plifts||[]) if(f.i!==undefined) vehLights(out,f,.55,null,true);   // v2.21.1: II→III lifts
  staffLights(out); techLights(out); powerLights(out); byLights(out);
  if(OFFICE.top){const [x,y]=P(OFFICE.ci,OFFICE.cj+0.4,0);out.push({x,y,rx:40,ry:20,c:'warm',a:.7});const [lx,ly]=P(OFFICE.ci,OFFICE.cj+.5,20);out.push({x:lx,y:ly-7,rx:12,ry:12,c:'warm',a:.9,core:1});}
  for(const v of scene.couriers||[]) vehLights(out,v,1.62,-1.64);
  return out;
}
/* ---------- lighting pass: half-res light map, multiplied over the world ---------- */
/* v2.8: the light map is rebuilt every other frame at 0.4x resolution, upscaled once into a full-size layer and then
   multiplied over the scene with an unscaled blit (a scaled multiply blit every frame was one of the costliest steps at night). */
function drawLighting(ctx){
  const D=scene.dn, a=D.amb; if(a[0]>253.5&&a[1]>253.5&&a[2]>253.5&&D.lights<.02){scene.lightCount=0;scene.lmSig='';return;}
  const W=scene.w,H=scene.h,dpr=scene.dpr,c=scene.cam,z=c.z,LR=.4;
  const cw=scene.canvas.width,ch=scene.canvas.height,lw=Math.ceil(cw*LR),lh=Math.ceil(ch*LR);
  if(!scene.lm||scene.lm.width!==lw||scene.lm.height!==lh){scene.lm=document.createElement('canvas');scene.lm.width=lw;scene.lm.height=lh;scene.lmx=scene.lm.getContext('2d');}
  if(!scene.lmUp||scene.lmUp.width!==cw||scene.lmUp.height!==ch){scene.lmUp=document.createElement('canvas');scene.lmUp.width=cw;scene.lmUp.height=ch;scene.lmUx=scene.lmUp.getContext('2d');scene.lmSig='';}
  const camSig=c.x.toFixed(2)+','+c.y.toFixed(2)+','+c.z.toFixed(4);
  scene.lmTick=(scene.lmTick||0)+1;
  let lights=scene.lmLights||null;
  if(!SPR.on||scene.lmTick%2===0||scene.lmSig!==camSig){
    const g=scene.lmx; g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='source-over'; g.globalAlpha=1;
    g.fillStyle=`rgb(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])})`; g.fillRect(0,0,lw,lh);
    lights=null;
    if(D.lights>.02){
      g.globalCompositeOperation='lighter'; const s=dpr*LR; g.setTransform(s*z,0,0,s*z,s*(W/2-c.x*z),s*(H/2-c.y*z));
      g.globalAlpha=1; g.fillStyle=`rgba(255,196,110,${.6*D.lights})`; for(const q of scene.lq){pth(g,q);g.fill();}
      lights=collectLights(); for(const l of lights) glow(g,l.x,l.y,l.rx,l.ry,l.c,l.a*D.lights,l.rot);
      g.globalAlpha=1;
    }
    const u=scene.lmUx; u.setTransform(1,0,0,1,0,0); u.globalCompositeOperation='copy'; u.drawImage(scene.lm,0,0,cw,ch); u.globalCompositeOperation='source-over';
    scene.lmSig=camSig; scene.lmLights=lights;
  }
  scene.lightCount=(lights?lights.length:0)+scene.lq.length;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='multiply'; ctx.drawImage(scene.lmUp,0,0); ctx.restore();
  // bright cores & halos on top (bulbs, head/tail lights, flames) so they read as light sources
  if(lights&&D.lights>.05){ctx.save();ctx.globalCompositeOperation='lighter';
    for(const l of lights) if(l.core) glow(ctx,l.x,l.y,l.rx*1.1,l.ry*1.1,l.c,.55*D.lights);
    ctx.restore();}
}
/* ---------- sky band with stars & moon at night ---------- */
function drawSky(ctx){
  const D=scene.dn, n=D.night*(1-D.oc*.8); if(n<.03) return; const W=scene.w,H=scene.h, tb=barH()[0], t=scene.t;
  const g=ctx.createLinearGradient(0,0,0,H*.32);g.addColorStop(0,`rgba(12,18,48,${.62*n})`);g.addColorStop(1,'rgba(12,18,48,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.32);
  for(let k=0;k<90;k++){const x=hash2(k,3)*W,y=tb+hash2(5,k)*H*.24;const tw=.55+.45*Math.sin(t*(1.3+hash2(k,k)*2)+k);const a=n*tw*(1-(y-tb)/(H*.26));if(a<.05) continue;
    ctx.fillStyle=`rgba(255,252,235,${a})`;const r=hash2(k,9)>.9?1.6:.9;ctx.fillRect(x-r/2,y-r/2,r,r);}
  if(W>600){const mx=W*.66,my=tb+16;ctx.save();ctx.globalAlpha=n;ctx.globalCompositeOperation='lighter';glow(ctx,mx,my,46,46,'cool',.35);ctx.restore();
    ctx.globalAlpha=n;ell(ctx,mx,my,12,12,'#f4f1e2');ell(ctx,mx+5,my-3,10.5,10.5,`rgb(${Math.round(30+12*(1-n))},${Math.round(40+10*(1-n))},${Math.round(80)})`);ctx.globalAlpha=1;}
}
/* ---------- weather particles (screen space) ---------- */
function drawWeather(ctx,dt){
  const W=scene.w,H=scene.h,v=scene.wxv,t=scene.t,D=scene.dn, dim=1-.35*D.night;
  const wx=-60-v.wind*260; // wind drift px/s
  const P2=scene.wp||(scene.wp={rain:[],snow:[],leaf:[],streak:[],splash:[]});
  const area=W*H/1e6;
  const sync=(arr,n,mk)=>{while(arr.length<n) arr.push(mk(true));if(arr.length>n) arr.length=n;};
  // rain
  const nr=Math.round(Math.min(340,260*area)*v.rain);
  sync(P2.rain,nr,()=>({x:Math.random()*(W+300),y:Math.random()*H,s:900+Math.random()*350,l:15+Math.random()*12}));
  if(nr){ctx.strokeStyle=`rgba(210,225,248,${.62*dim})`;ctx.lineWidth=1.3;ctx.beginPath();
    for(const d of P2.rain){d.y+=d.s*dt;d.x+=wx*1.4*dt;if(d.y>H){if(Math.random()<.5) P2.splash.push({x:d.x,y:H*(.3+Math.random()*.7),l:0});d.y=-20-Math.random()*60;d.x=Math.random()*(W+300);}
      const k=d.l/d.s;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-wx*1.4*k,d.y-d.l);}ctx.stroke();}
  if(P2.splash.length){ctx.strokeStyle=`rgba(225,235,255,${.55*dim})`;ctx.lineWidth=.9;
    for(const s of P2.splash){s.l+=dt*4;const r=2+s.l*5;ctx.globalAlpha=Math.max(0,1-s.l);ctx.beginPath();ctx.ellipse(s.x,s.y,r,r*.4,0,0,TAU);ctx.stroke();}
    ctx.globalAlpha=1;P2.splash=P2.splash.filter(s=>s.l<1).slice(-80);}
  // snow
  const ns=Math.round(Math.min(260,200*area)*v.snow);
  sync(P2.snow,ns,()=>({x:Math.random()*W,y:Math.random()*H,s:35+Math.random()*55,r:1.1+Math.random()*1.9,ph:Math.random()*9}));
  if(ns){ctx.fillStyle=`rgba(255,255,255,${.92*dim})`;for(const f of P2.snow){f.y+=f.s*dt;f.x+=(Math.sin(t*1.3+f.ph)*22+wx*.35)*dt;if(f.y>H+5){f.y=-5;f.x=Math.random()*W;}if(f.x<-10) f.x+=W+20;if(f.x>W+10) f.x-=W+20;
    ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill();}}
  // autumn leaves / spring petals
  const lv=SEAS===2?(.4+v.wind*.9)*(1-v.snow):SEAS===0?(.3+v.wind*.7):0;
  const nl=Math.round(Math.min(60,46*area)*lv);
  const LCOL=SEAS===2?['#d8702a','#e8a43a','#b8402a','#f0c850']:['#ffc0d4','#ffd8e4','#fff0f4','#f7a8c4'];
  sync(P2.leaf,nl,()=>({x:Math.random()*W,y:Math.random()*H,s:30+Math.random()*35,ph:Math.random()*9,c:Math.floor(Math.random()*4),r:Math.random()*6}));
  for(const f of P2.leaf){f.y+=f.s*dt;f.x+=(Math.sin(t*1.1+f.ph)*30+wx*.7)*dt;f.r+=dt*(1.5+Math.sin(f.ph));if(f.y>H+8){f.y=-8;f.x=Math.random()*W*1.2;}if(f.x<-12) f.x+=W+24;
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.r);ctx.scale(1,Math.abs(Math.cos(f.r*1.7))*.8+.2);ctx.globalAlpha=dim;ctx.fillStyle=LCOL[f.c];
    ctx.beginPath();ctx.ellipse(0,0,SEAS===2?4.2:3,SEAS===2?2.4:2.2,0,0,TAU);ctx.fill();ctx.restore();}
  // wind streaks
  const nw=Math.round(9*v.wind);
  sync(P2.streak,nw,()=>({x:Math.random()*W,y:Math.random()*H*.9+H*.05,l:80+Math.random()*120,s:500+Math.random()*300,ph:Math.random()*9}));
  if(nw){ctx.lineCap='round';ctx.lineWidth=1.6;for(const s of P2.streak){s.x-=s.s*dt;if(s.x<-s.l-40){s.x=W+40;s.y=Math.random()*H*.9+H*.05;}
    ctx.strokeStyle=`rgba(255,255,255,${.28*v.wind*dim})`;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.bezierCurveTo(s.x+s.l*.3,s.y-6*Math.sin(t*2+s.ph),s.x+s.l*.7,s.y+6,s.x+s.l,s.y-3);ctx.stroke();}ctx.lineCap='butt';}
  // sunbeams
  const sb=v.sunny*D.day*(1-v.rain);
  if(sb>.02){ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<3;k++){const x0=W*(.05+k*.28)+Math.sin(t*.2+k)*30;const a=.075*sb*(.7+.3*Math.sin(t*.5+k*2));
    const g=ctx.createLinearGradient(x0,0,x0+H*.5,H);g.addColorStop(0,`rgba(255,240,190,${a})`);g.addColorStop(1,'rgba(255,240,190,0)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(x0+90+k*30,0);ctx.lineTo(x0+H*.62+140,H);ctx.lineTo(x0+H*.62,H);ctx.closePath();ctx.fill();}ctx.restore();}
  scene.wxParts=P2.rain.length+P2.snow.length+P2.leaf.length+P2.streak.length;
}
function setClock(c){S.wx.clock=c;M=computeMods();wxSig='';updateWorldVis(0);}
