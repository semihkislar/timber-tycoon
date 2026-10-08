
/* ---------------- people (v2.1: proportioned iso humans with real poses) ---------------- */
const SKINS=['#f6d3b3','#efbf98','#dca373','#c08453','#94603a','#6e4428'];
const HAIRS=['#2a1a10','#4a2c18','#6e4222','#a8743a','#d8b468','#8c8c8c','#151010','#8a3a1c'];
const PLAIDS=[['#c43a2e','#5a1a14'],['#2f6fb0','#173a60'],['#3d7a3a','#1d401c'],['#d08a2a','#6a4010'],['#7a3a8a','#3a1a44'],['#2a2a2e','#c43a2e']];
function mkLook(seed,o){
  const R=rng(seed*7919+13); o=o||{};
  const female=o.female!==undefined?o.female:R()<.42;
  const L={female,skin:SKINS[Math.floor(R()*SKINS.length)],hair:HAIRS[Math.floor(R()*HAIRS.length)],
    style:female?['long','pony','bun','pony'][Math.floor(R()*4)]:['short','crew','short','bald'][Math.floor(R()*4)],
    beard:null,hat:null,hatc:'#f5c22e',shirt:'#5a6a7a',plaid:null,vest:null,pants:['#33476e','#3a3a40','#4a3a2a','#2e3e5a','#55603a'][Math.floor(R()*5)],boots:['#3a2414','#2a1a10','#5a3a1c'][Math.floor(R()*3)]};
  if(!female&&R()<.5) L.beard=R()<.7?L.hair:'#5a4a40';
  if(o.role==='jack'){const p=PLAIDS[Math.floor(R()*PLAIDS.length)];L.shirt=p[0];L.plaid=p[1];L.hat=R()<.5?'beanie':R()<.5?'hard':'cap';L.hatc=['#c83a2e','#2e6ac8','#f08a1a','#3a7a3a','#e8c43a'][Math.floor(R()*5)];if(L.hat==='hard')L.hatc=R()<.5?'#f5c22e':'#f08a1a';}
  else if(o.role==='saw'){L.shirt=PLAIDS[Math.floor(R()*PLAIDS.length)][0];L.vest=R()<.5?'#f2d21a':'#f58a1a';L.hat='hard';L.hatc=R()<.5?'#f08a1a':'#f5f2ea';L.pants='#3a3f48';}
  else if(o.role==='worker'){L.shirt=['#5a6a7a','#e8e2d4','#3a4a5a','#7a8a6a'][Math.floor(R()*4)];L.vest=o.vest||'#f2d21a';L.hat='hard';L.hatc=o.hatc||'#f5c22e';}
  else if(o.role==='foreman'){L.shirt='#e8e4dc';L.vest='#f2d21a';L.hat='hard';L.hatc='#f7f7f2';L.pants='#2e3440';}
  else if(o.role==='planter'){L.shirt='#6a8a4a';L.plaid=null;L.hat=R()<.6?'cap':null;L.hatc='#c8a050';L.pants='#4a4030';}
  else if(o.role==='casual'){const p=PLAIDS[Math.floor(R()*PLAIDS.length)];L.shirt=p[0];L.plaid=R()<.6?p[1]:null;L.hat=R()<.4?'beanie':null;L.hatc=['#c83a2e','#2e6ac8','#e8c43a'][Math.floor(R()*3)];}
  return L;
}
const DEF_LOOK=mkLook(1,{role:'worker'});
const HU={hip:-13.2,sh:-21.6,hc:-25.1,hr:2.3};
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
function lerp(a,b,t){return a+(b-a)*t;}
function limb(ctx,pts,w,col){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.stroke();}
function axeAngle(u){ // two-handed swing: wind-up, strike, recoil, return
  if(u<.46) return lerp(.35,-2.55,ease(u/.46));
  if(u<.57){const e=(u-.46)/.11;return lerp(-2.55,1.45,e*e);}
  if(u<.69) return 1.45-.28*Math.sin((u-.57)/.12*Math.PI);
  return lerp(1.45,.35,ease((u-.69)/.31));
}
/* o: {look,fx(+1 right/-1 left),back,pose,ph,t,s,cargo,zz,lift}
   poses: stand walk carry(log on shoulder) box(crate at chest) chop saw plant sit drink brow look clip point */
function human(ctx,x,y,o){
  const L=o.look||DEF_LOOK, s=o.s||1.15, fx=o.fx||1, back=!!o.back, pose=o.pose||'stand', ph=o.ph||0, T=scene.t;
  const sit=pose==='sit'||pose==='sitdrink';
  if(!o.noShadow) ell(ctx,x+1.2*s,y+.6*s,(sit?7.5:6)*s,2.5*s,'rgba(25,35,10,.27)');
  ctx.save();ctx.translate(x,y-(o.lift||0));ctx.scale(s*fx,s);ctx.lineCap='round';ctx.lineJoin='round';
  const ns=back?1:-1, fw=[1,back?-.42:.42];
  let hipY=HU.hip, lean=0, bob=0, legs, hand=[null,null], props=[], headTurn=1;
  const hipF=[-ns*1.15,0], hipN=[ns*1.15,0];
  const stance=(spread,bend)=>{const kb=bend||0;return [[[hipF[0],hipY],[hipF[0]-spread*.5+kb,hipY*.5],[hipF[0]-spread,0]],[[hipN[0],hipY],[hipN[0]+spread*.5+kb,hipY*.5],[hipN[0]+spread,0]]];};
  const walkLegs=(amp)=>{const out=[];for(const k of [0,1]){const p=ph+(k?0:Math.PI);const sw=Math.sin(p),lift=Math.max(0,Math.cos(p))*1.5;const hx=k?hipN[0]:hipF[0];
      const fxp=hx+sw*amp*fw[0], fyp=sw*amp*fw[1]*.6-lift; out.push([[hx,hipY],[(hx+fxp)/2+.8+lift*.3,(hipY+fyp)/2-lift*.4],[fxp,fyp]]);}return out;};
  const shoulderN=()=>[ns*2.85+lean,HU.sh+1.1+bob], shoulderF=()=>[-ns*2.85+lean,HU.sh+.9+bob];
  switch(pose){
    case 'walk': case 'carry': case 'box': {
      const amp=pose==='walk'?3.1:2.4; bob=-Math.abs(Math.cos(ph))*.8+.4; legs=walkLegs(amp);
      if(pose==='walk'){const sw=Math.sin(ph)*2.6;hand=[[-ns*3.2+sw*fw[0]+.2,HU.hip+.6+sw*fw[1]*.5],[ns*3.2-sw*fw[0]+.2,HU.hip+.6-sw*fw[1]*.5]];}
      break;}
    case 'chop': {
      const u=((o.t!==undefined?o.t:ph/(Math.PI*2))%1+1)%1; const a=axeAngle(u);
      lean=a>0?1.1*Math.sin(Math.min(1,a/1.45)*Math.PI/2):-.5*Math.min(1,-a/2.5); hipY=HU.hip+.6; legs=stance(2.2,.6);
      const C=[lean+.4,HU.sh+1.6], d=[Math.sin(a),-Math.cos(a)], n=[Math.cos(a),Math.sin(a)];
      hand=[[C[0]+d[0]*4.2,C[1]+d[1]*4.2],[C[0]+d[0]*6.2,C[1]+d[1]*6.2]];
      props.push(()=>{const h0=[C[0]+d[0]*3.2,C[1]+d[1]*3.2],e=[C[0]+d[0]*15.2,C[1]+d[1]*15.2];
        limb(ctx,[h0,e],1.5,'#8a5a2c');limb(ctx,[[h0[0]+n[0]*.4,h0[1]+n[1]*.4],[e[0]+n[0]*.4,e[1]+n[1]*.4]],.5,'rgba(255,220,160,.5)');
        const bp=(p,q)=>[e[0]+d[0]*p+n[0]*q,e[1]+d[1]*p+n[1]*q];
        fillP(ctx,[bp(-1.3,.3),bp(1.1,.3),bp(1.9,3.6),bp(-2.1,3.6)],'#c4ccd4');
        limb(ctx,[bp(1.9,3.6),bp(-2.1,3.6)],.8,'#eef4f8');fillP(ctx,[bp(-1,-.3),bp(.9,-.3),bp(.9,-1.6),bp(-1,-1.6)],'#4a525c');});
      break;}
    case 'saw': {
      hipY=HU.hip+1.8; lean=1.2; legs=stance(2.4,1.4);
      const jx=Math.sin(T*97)*.45, jy=Math.cos(T*83)*.35;
      hand=[[3.0+jx,HU.hip-2.6+jy],[4.6+jx,HU.hip-.6+jy]];
      props.push(()=>{const bx=4.2+jx,by=HU.hip-2.2+jy;
        ctx.save();ctx.translate(bx,by);ctx.rotate(.32);
        ctx.fillStyle='#9aa4ae';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(3.4,-.9,10,1.8,.9);else ctx.rect(3.4,-.9,10,1.8);ctx.fill();
        ctx.strokeStyle='#4a525c';ctx.lineWidth=.5;ctx.setLineDash([.8,.8]);ctx.lineDashOffset=-T*40;ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#f07a1a';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-2.2,-2.4,6,4.4,1);else ctx.rect(-2.2,-2.4,6,4.4);ctx.fill();
        ctx.fillStyle='#2a2a2e';ctx.fillRect(-1.6,-3.6,3.6,1.3);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(-1.8,-2,5,.8);ctx.restore();});
      break;}
    case 'plant': {
      hipY=-7.2; lean=2.2; legs=[[[hipF[0],hipY],[hipF[0]+3.6,-6.5],[hipF[0]+1.6,0]],[[hipN[0],hipY],[hipN[0]+4.2,-4],[hipN[0]-1.8,-.4]]];
      const dig=Math.sin(ph*2)*.8; hand=[[3.8,-6.5],[5.8+dig,-1.6]];
      props.push(()=>{const k=o.t||0;ctx.strokeStyle='#5a3a1c';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(6.4,0);ctx.lineTo(6.4,-3.4-k*2);ctx.stroke();
        ell(ctx,6.4,-4-k*2.4,1.8+k,1.2+k*.6,'#4f9a3a');ell(ctx,5.6,-4.6-k*2.4,1,.8,'#7cc45e');ell(ctx,6.2,.2,2.4,.9,'#6a4a2a');});
      break;}
    case 'sit': case 'sitdrink': {
      hipY=-7.4; legs=[[[hipF[0]-1,hipY],[hipF[0]+3.4,hipY-.4],[hipF[0]+3.8,0]],[[hipN[0]-1,hipY],[hipN[0]+3.8,hipY-.2],[hipN[0]+4.4,0]]];
      hand=[[1.6,hipY-1.8],[2.8,hipY-1.2]]; break;}
    default: legs=stance(.35,0);
  }
  const dh=hipY-HU.hip; // body offset for crouch/sit
  // arm targets for the remaining poses (computed with dh)
  const SHY=HU.sh+dh+bob, HCY=HU.hc+dh+bob;
  if(pose==='carry'){hand=[[-ns*1.2+lean+3.2,SHY-1.6],[ns*1.6+lean+1.8,SHY-1.2]];}
  if(pose==='box'){hand=[[3.6,SHY+4.6],[3.4,SHY+5.4]];}
  if(pose==='brow'){const w=Math.sin(T*5)*1.3;hand=[[-ns*3+.2,HU.hip+.6],[1.8+w,HCY-1.4]];}
  if(pose==='clip'){const w=Math.sin(T*9)*.6;hand=[[2.8,SHY+4.4],[3.6+w,SHY+5.6+Math.cos(T*7)*.4]];
    props.push(()=>{ctx.save();ctx.translate(3.6,SHY+5.2);ctx.rotate(-.18);ctx.fillStyle='#8a5a2c';ctx.fillRect(-2.6,-3.4,5.4,7);ctx.fillStyle='#fafaf2';ctx.fillRect(-2,-2.6,4.2,5.6);
      ctx.fillStyle='#9aa0a8';for(let k=0;k<3;k++)ctx.fillRect(-1.4,-1.6+k*1.6,3,.45);ctx.fillStyle='#c0c4c8';ctx.fillRect(-.9,-3.8,2,1);ctx.restore();});}
  if(pose==='point'){hand=[[-ns*3+.2,HU.hip+.6],[8.2,SHY-3.6]];}
  if(pose==='look'){headTurn=Math.sin(T*1.3+ph)>0?1:-1;}
  let mug=null;
  if(pose==='drink'||pose==='sitdrink'){const k=Math.max(0,Math.sin(T*1.1+ph*3));const sip=k>.8?1:k/.8;const rest=pose==='sitdrink'?[3.4,hipY-2.4]:[3.1,HU.hip-1];
    const mouth=[2.5,HCY+1.6];const hp=[lerp(rest[0],mouth[0],ease(sip)),lerp(rest[1],mouth[1],ease(sip))];hand=[hand[0]||[-ns*3+.2,HU.hip+.6],hp];mug=hp;}
  if(!hand[0]) hand[0]=[-ns*3.2+.2+lean*.5,HU.hip+.6+dh*.6];
  if(!hand[1]) hand[1]=[ns*3.2+.2+lean*.5,HU.hip+.6+dh*.6];
  const sleeve=L.shirt, armW=2.05;
  const drawArm=(sh,hd,dark)=>{const mx=(sh[0]+hd[0])/2,my=(sh[1]+hd[1])/2;const dx=hd[0]-sh[0],dy=hd[1]-sh[1],len=Math.hypot(dx,dy)||1;const bend=Math.max(0,8.4-len)*.55;
      const el=[mx-.5,my+bend];
      const col=dark?shade(sleeve,.78):sleeve;limb(ctx,[sh,el,hd],armW,col);ell(ctx,hd[0],hd[1],1.05,1.05,dark?shade(L.skin,.85):L.skin);};
  const legCol=L.pants, bootC=L.boots;
  const drawLeg=(lg,dark)=>{const c=dark?shade(legCol,.78):legCol;limb(ctx,[lg[0],lg[1]],2.7,c);limb(ctx,[lg[1],lg[2]],2.4,c);
      const f=lg[2];ctx.fillStyle=dark?shade(bootC,.8):bootC;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(f[0]-1.4,f[1]-1.5,3.6,2,1);else ctx.rect(f[0]-1.4,f[1]-1.5,3.6,2);ctx.fill();};
  if(back) for(const p of props) p();
  drawArm(shoulderF(),hand[0],true);
  drawLeg(legs[0],true); drawLeg(legs[1],false);
  // torso
  ctx.save(); ctx.translate(lean,dh+bob);
  const tp=[[-3.2,HU.sh+.9],[-2.8,HU.sh],[2.5,HU.sh],[3.4,HU.sh+1.1],[3.0,HU.hip+1.2],[2.5,HU.hip+.2],[-2.6,HU.hip+.2],[-3.0,HU.hip+1.6]];
  pth(ctx,tp);ctx.fillStyle=L.shirt;ctx.fill();
  if(L.plaid){ctx.save();pth(ctx,tp);ctx.clip();ctx.globalAlpha=.55;ctx.fillStyle=L.plaid;for(const vx of [-2.2,-.2,1.8])ctx.fillRect(vx,HU.sh,.9,9);for(const vy of [HU.sh+2.4,HU.sh+5.4])ctx.fillRect(-3.5,vy,7,.9);ctx.globalAlpha=.25;ctx.fillStyle='#fff';ctx.fillRect(-3.5,HU.sh+3.6,7,.4);ctx.restore();}
  if(L.vest){ctx.save();pth(ctx,tp);ctx.clip();ctx.fillStyle=L.vest;
    if(back){ctx.fillRect(-3.5,HU.sh+.4,7,9);ctx.fillStyle='#e9eef2';ctx.fillRect(-3.5,HU.hip+2.2,7,.9);ctx.fillRect(-3.5,HU.hip+4.4,7,.9);}
    else {ctx.beginPath();ctx.moveTo(-3.5,HU.sh+.3);ctx.lineTo(-.4,HU.sh+.3);ctx.lineTo(.1,HU.sh+3.6);ctx.lineTo(.6,HU.sh+.3);ctx.lineTo(3.6,HU.sh+.3);ctx.lineTo(3.6,HU.hip+.2);ctx.lineTo(-3.5,HU.hip+.2);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e9eef2';ctx.fillRect(-3.5,HU.hip+2.4,7.1,.9);ctx.fillRect(-3.5,HU.hip+4.6,7.1,.9);}
    ctx.restore();}
  ctx.save();pth(ctx,tp);ctx.clip();ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(1.7,HU.sh,3,10);ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(-3.4,HU.sh,1.2,10);ctx.restore();
  ctx.fillStyle='rgba(30,20,10,.55)';ctx.fillRect(-2.7,HU.hip+.1,5.3,1);
  // neck + head
  const hx=back?-.1:.35, hy=HU.hc;
  ctx.fillStyle=shade(L.skin,.88);ctx.fillRect(-.7+hx*.5,HU.sh-1.7,1.7,2);
  const long=L.style==='long';
  if(long){ctx.fillStyle=shade(L.hair,.9);ctx.beginPath();ctx.moveTo(hx-2.6,hy-1);ctx.lineTo(hx-2.9,HU.sh+2.6);ctx.lineTo(hx+(back?2.8:-.2),HU.sh+2.2);ctx.lineTo(hx+(back?2.6:.4),hy);ctx.closePath();ctx.fill();}
  if(L.style==='pony'&&!back){ctx.fillStyle=shade(L.hair,.92);ctx.beginPath();ctx.ellipse(hx-2.9,hy+1.4,1.1,2.4,.35,0,TAU);ctx.fill();}
  ctx.fillStyle=L.skin;ctx.beginPath();ctx.ellipse(hx,hy,HU.hr,HU.hr*1.1,0,0,TAU);ctx.fill();
  ctx.save();ctx.translate(hx,hy);if(headTurn<0)ctx.scale(-1,1);
  if(back){ctx.fillStyle=L.style==='bald'?shade(L.skin,.95):L.hair;ctx.beginPath();ctx.ellipse(0,-.2,HU.hr+.15,HU.hr*1.1+.1,0,0,TAU);ctx.fill();
    ell(ctx,-HU.hr,.3,.55,.75,shade(L.skin,.9));ell(ctx,HU.hr,.3,.55,.75,shade(L.skin,.9));
    if(L.style==='pony'){ctx.fillStyle=shade(L.hair,.92);ctx.beginPath();ctx.ellipse(0,2.2,1.1,2.4,0,0,TAU);ctx.fill();}
    if(L.style==='bun') ell(ctx,0,-2.2,1.3,1.2,shade(L.hair,.95));}
  else{
    if(L.style!=='bald'){ctx.fillStyle=L.hair;ctx.beginPath();ctx.ellipse(-.25,-.55,HU.hr+.2,HU.hr*1.05,0,Math.PI*.42,Math.PI*1.95);ctx.closePath();ctx.fill();
      if(L.style==='crew'){ctx.fillStyle=shade(L.skin,1);ctx.beginPath();ctx.ellipse(.6,.3,1.7,1.9,0,0,TAU);ctx.fill();}}
    else{ctx.fillStyle='rgba(0,0,0,.08)';ctx.beginPath();ctx.ellipse(-.6,-.4,HU.hr*.8,HU.hr*.9,0,0,TAU);ctx.fill();}
    if(L.style==='bun') ell(ctx,-1.9,-1.7,1.25,1.15,L.hair);
    ell(ctx,-.75,.35,.55,.75,shade(L.skin,.86));
    ctx.fillStyle='#2a1a12';ctx.beginPath();ctx.arc(1.25,-.15,.42,0,TAU);ctx.fill();
    ctx.fillStyle=shade(L.hair,.8);ctx.fillRect(.75,-1.05,1.1,.35);
    ctx.fillStyle=shade(L.skin,.92);ctx.beginPath();ctx.moveTo(2.15,-.2);ctx.lineTo(2.75,.75);ctx.lineTo(2.05,.85);ctx.closePath();ctx.fill();
    if(L.beard){ctx.fillStyle=L.beard;ctx.beginPath();ctx.moveTo(-.6,.5);ctx.quadraticCurveTo(-.2,2.9,1.2,2.7);ctx.quadraticCurveTo(2.4,2.4,2.3,1.2);ctx.lineTo(1.4,1.4);ctx.lineTo(.2,.6);ctx.closePath();ctx.fill();}
    else{ctx.strokeStyle='rgba(120,50,40,.6)';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(1.2,1.45);ctx.lineTo(1.9,1.4);ctx.stroke();}
    if(L.female&&!L.hat&&L.style!=='bun'){ctx.fillStyle=L.hair;ctx.beginPath();ctx.ellipse(.6,-1.6,1.9,.9,-.2,0,TAU);ctx.fill();}
  }
  // hats
  if(L.hat==='hard'){ctx.fillStyle=L.hatc;ctx.beginPath();ctx.ellipse(.1,-1.2,2.75,2.45,0,Math.PI,0);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(L.hatc,.82);ctx.beginPath();ctx.ellipse(.35,-1.05,3.45,.85,0,0,TAU);ctx.fill();ctx.fillStyle=L.hatc;ctx.fillRect(-2.6,-1.6,5.4,.6);
    ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-.6,-2.6,.9,.55,-.4,0,TAU);ctx.fill();ctx.fillStyle=shade(L.hatc,.85);ctx.fillRect(-.25,-3.6,.6,2.3);}
  else if(L.hat==='beanie'){ctx.fillStyle=L.hatc;ctx.beginPath();ctx.ellipse(0,-1.1,2.55,2.6,0,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle=shade(L.hatc,.82);ctx.fillRect(-2.6,-1.5,5.2,1.2);ell(ctx,0,-3.9,.9,.8,shade(L.hatc,1.15));}
  else if(L.hat==='cap'){ctx.fillStyle=L.hatc;ctx.beginPath();ctx.ellipse(0,-1.1,2.5,2.2,0,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle=shade(L.hatc,.78);ctx.beginPath();ctx.ellipse(back?-2.2:2.3,-1.0,1.9,.55,0,0,TAU);ctx.fill();}
  ctx.restore();
  ctx.restore();
  // cargo in hands
  if(pose==='box'&&o.cargo&&!back){cargoIcon(ctx,3.6,SHY+4.6,o.cargo,.95);}
  if(pose==='box'&&o.cargo&&back){/* hidden in front of body */}
  if(pose==='carry'){const a=[-ns*1.0+lean-5.6,SHY-1.0-(back?-1.6:1.6)*-.2],b=[-ns*1.0+lean+7.4,SHY-2.2+(back?-2.4:2.4)*.15];
    const r=2.1;ctx.fillStyle='#7a4a24';ctx.strokeStyle='#5a3418';ctx.lineWidth=r*2;limb(ctx,[a,b],r*2,'#7a4a24');limb(ctx,[[a[0],a[1]-r*.55],[b[0],b[1]-r*.55]],.7,'rgba(255,220,170,.35)');
    ell(ctx,b[0],b[1],r*.55,r,'#e2b67a');ell(ctx,b[0],b[1],r*.25,r*.45,'#b8864a');}
  drawArm(shoulderN(),hand[1],false);
  if(mug){ctx.fillStyle='#f4f1ea';ctx.fillRect(mug[0]-.4,mug[1]-1.8,2,2.2);ctx.fillStyle='#c84a3a';ctx.fillRect(mug[0]-.4,mug[1]-1.1,2,.6);
    if(Math.sin(T*2+ph)>0){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(mug[0]+.6,mug[1]-2.2);ctx.quadraticCurveTo(mug[0]+1.6,mug[1]-3.6,mug[0]+.6,mug[1]-5);ctx.stroke();}}
  if(pose==='box'&&o.cargo&&back) {}
  if(!back) for(const p of props) p();
  if(o.zz){ctx.scale(fx,1);ctx.fillStyle='rgba(255,255,255,.95)';ctx.font='bold 8px system-ui';ctx.fillText('z',4,HU.hc-6-Math.sin(T*2)*2);ctx.font='bold 6px system-ui';ctx.fillText('z',8,HU.hc-11-Math.sin(T*2+1)*2);}
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


/* ---------------- vehicles (v2.1: true 3D models, any heading) ----------------
   A vehicle frame V = {i,j,fi,fj,si,sj,dz}: forward f=(fi,fj), across s=(-fj,fi) in grid units.
   Local coords: a = along (front +), c = across, z = height px. Faces whose normal points toward the
   viewer (+i+j) are drawn, so each heading shows the correct front/back/side. */
function VF(i,j,yaw,dz){const fi=Math.cos(yaw),fj=Math.sin(yaw);return {i,j,fi,fj,si:-fj,sj:fi,dz:dz||0};}
function VL(V,a,c,z){return P(V.i+a*V.fi+c*V.si,V.j+a*V.fj+c*V.sj,z);}
function vdepth(V,a,c){return a*(V.fi+V.fj)+c*(V.si+V.sj);}
function fshade(ni,nj){return .8+.1*(nj-ni);}
function vface(V,f,b,u0,u1,z0,z1){ // quad on a face of box b={a0,a1,c0,c1}
  if(f==='F') return [VL(V,b.a1,u0,z0),VL(V,b.a1,u1,z0),VL(V,b.a1,u1,z1),VL(V,b.a1,u0,z1)];
  if(f==='B') return [VL(V,b.a0,u0,z0),VL(V,b.a0,u1,z0),VL(V,b.a0,u1,z1),VL(V,b.a0,u0,z1)];
  if(f==='R') return [VL(V,u0,b.c1,z0),VL(V,u1,b.c1,z0),VL(V,u1,b.c1,z1),VL(V,u0,b.c1,z1)];
  return [VL(V,u0,b.c0,z0),VL(V,u1,b.c0,z0),VL(V,u1,b.c0,z1),VL(V,u0,b.c0,z1)];
}
function vvis(V,f){const n=f==='F'?[V.fi,V.fj]:f==='B'?[-V.fi,-V.fj]:f==='R'?[V.si,V.sj]:[-V.si,-V.sj];return n[0]+n[1]>0.015?n:null;}
/* draw an oriented box; deco(face) is called for each visible face so details land on the right side */
function vbox(ctx,V,a0,a1,c0,c1,z0,z1,col,o){
  o=o||{}; const b={a0,a1,c0,c1}; z0+=V.dz; z1+=V.dz;
  for(const f of ['F','B','R','L']){const n=vvis(V,f);if(!n) continue;
    const q=f==='F'||f==='B'?vface(V,f,b,c0,c1,z0,z1):vface(V,f,b,a0,a1,z0,z1);
    fillP(ctx,q,shade(col,fshade(n[0],n[1])*(o.dk||1)),o.edge===false?null:'rgba(30,20,12,.45)',.7);
    if(o.deco) o.deco(f,b,z0,z1);}
  if(o.top!==false){const t=[VL(V,a0,c0,z1),VL(V,a1,c0,z1),VL(V,a1,c1,z1),VL(V,a0,c1,z1)];fillP(ctx,t,o.topc||shade(col,1.12),o.edge===false?null:'rgba(30,20,12,.4)',.7);if(o.decoTop) o.decoTop(b,z1);}
  return b;
}
function vquad(ctx,V,f,b,u0,u1,z0,z1,col,st){fillP(ctx,vface(V,f,b,u0,u1,z0+V.dz,z1+V.dz),col,st,.6);}
function ellPts(V,a,c,zc,r,plane,n){const out=[];n=n||14;const rt=r/32;for(let k=0;k<n;k++){const t=k/n*TAU;
  out.push(plane==='s'?VL(V,a+rt*Math.cos(t),c,zc+r*Math.sin(t)):VL(V,a,c+rt*Math.cos(t),zc+r*Math.sin(t)));}return out;}
function vwheel(ctx,V,a,c,R,outer){ // tyre in the plane spanned by forward & up
  const sv=(V.si+V.sj)>0?1:-1, cin=c-Math.sign(c||1)*.07;
  fillP(ctx,ellPts(V,a,cin,R,R,'s'),'#18181a');
  fillP(ctx,ellPts(V,a,c,R,R,'s'),'#2a2a2e');
  if(outer){fillP(ctx,ellPts(V,a,c,R,R*.5,'s',10),'#9aa2ac');fillP(ctx,ellPts(V,a,c,R,R*.22,'s',8),'#5a626c');
    const p=VL(V,a-R/32*.3,c,R+R*.35);ell(ctx,p[0],p[1],R*.2,R*.12,'rgba(255,255,255,.35)');}
}
function vshadow(ctx,V,a0,a1,w,al){
  for(const [e,k] of [[.22,.09],[.08,.16]]){const q=[VL(V,a0-e,-w-e,0),VL(V,a1+e,-w-e,0),VL(V,a1+e,w+e,0),VL(V,a0-e,w+e,0)].map(p=>[p[0]+3,p[1]+1.5]);fillP(ctx,q,`rgba(20,30,10,${k*(al||1)})`);}
}
/* horizontal cylinder (a log) lying along the vehicle's forward axis */
function vlog(ctx,V,a0,a1,c,zc,r,bark){
  zc+=V.dz; const E0=ellPts(V,a0,c,zc,r,'c',16),E1=ellPts(V,a1,c,zc,r,'c',16);
  const A=VL(V,a0,c,zc),B=VL(V,a1,c,zc);let nx=-(B[1]-A[1]),ny=B[0]-A[0];const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  const ext=(E,C)=>{let mx=-1e9,mn=1e9,pM,pm;for(const p of E){const d=(p[0]-C[0])*nx+(p[1]-C[1])*ny;if(d>mx){mx=d;pM=p;}if(d<mn){mn=d;pm=p;}}return [pM,pm];};
  const [a1M,a1m]=ext(E0,A),[b1M,b1m]=ext(E1,B);
  fillP(ctx,[a1M,b1M,b1m,a1m],bark||'#8a5a2c','rgba(40,20,8,.55)',.6);
  const up=ny<0?[a1M,b1M]:[a1m,b1m];ctx.strokeStyle='rgba(255,225,180,.28)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(lerp(up[0][0],A[0],.3),lerp(up[0][1],A[1],.3));ctx.lineTo(lerp(up[1][0],B[0],.3),lerp(up[1][1],B[1],.3));ctx.stroke();
  const front=(V.fi+V.fj)>0; const E=front?E1:E0, C=front?B:A;
  fillP(ctx,E,'#e3b87c','rgba(70,40,15,.6)',.6);
  const inner=front?ellPts(V,a1,c,zc,r*.55,'c',12):ellPts(V,a0,c,zc,r*.55,'c',12);ctx.strokeStyle='rgba(160,110,60,.7)';ctx.lineWidth=.5;pth(ctx,inner);ctx.stroke();
  ell(ctx,C[0],C[1],.6,.6,'#9a6a38');
}
const TRUCK_SPEC={len0:-1.5,len1:1.42,w:.44};
function truckCab(ctx,V,col,parts,o){
  const W=TRUCK_SPEC.w;
  parts.push({d:vdepth(V,1.28,0),f:()=>{
    vbox(ctx,V,.98,1.5,-.38,.38,7,19,col,{deco:(f,b)=>{if(f==='F'){
      vquad(ctx,V,'F',b,-.22,.22,9,17,'#c9d0d6','rgba(40,40,40,.5)');ctx.strokeStyle='rgba(40,40,40,.45)';ctx.lineWidth=.5;ctx.beginPath();for(let k=1;k<5;k++){const q=vface(V,'F',b,-.22+k*.088,-.22+k*.088,9+V.dz,17+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[2][0],q[2][1]);}ctx.stroke();
      for(const cc of [-.31,.31]){vquad(ctx,V,'F',b,cc-.06,cc+.06,12,15.2,'#fff6c8','rgba(60,50,20,.6)');}
      for(const cc of [-.36,.36]) vquad(ctx,V,'F',b,cc-.025,cc+.025,10,11.6,'#f5a020');}
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,1.02,1.4,16,17.5,'rgba(255,255,255,.25)');}}});
    vbox(ctx,V,1.5,1.6,-W,W,5,9.5,'#b8bec6',{});}});
  parts.push({d:vdepth(V,.62,0),f:()=>{
    vbox(ctx,V,.28,.98,-W,W,7,36,col,{deco:(f,b)=>{
      if(f==='F'){vquad(ctx,V,'F',b,-.37,.37,21,32.5,'#7fb4cc','rgba(30,40,50,.7)');vquad(ctx,V,'F',b,-.37,-.05,26,32.5,'rgba(255,255,255,.28)');}
      if(f==='B'){vquad(ctx,V,'B',b,-.25,.25,25,32,'#5a7a8a');}
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,.52,.92,21,32,'#86bcd2','rgba(30,40,50,.7)');vquad(ctx,V,f,b,.52,.7,26,32,'rgba(255,255,255,.25)');
        vquad(ctx,V,f,b,.34,.94,9,10,'rgba(0,0,0,.18)');ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=.5;pth(ctx,vface(V,f,b,.44,.94,10+V.dz,33+V.dz));ctx.stroke();
        vquad(ctx,V,f,b,.47,.55,18,19.2,'#d8dde2');vquad(ctx,V,f,b,.3,.96,13,15,shade(col,.75));}},
      decoTop:(b,z)=>{for(const cc of [-.2,0,.2]){const p=VL(V,.9,cc,z);ell(ctx,p[0],p[1],1.3,.8,'#f5a020');}}});
    // visor + roof fairing
    vbox(ctx,V,.92,1.02,-W,W,33,34.5,shade(col,.7),{edge:false});}});
  // mirrors on arms, both sides
  for(const sc of [-1,1]) parts.push({d:vdepth(V,1.0,sc*.6),f:()=>{const p0=VL(V,.98,sc*W,27+V.dz),p1=VL(V,1.0,sc*.58,27+V.dz);ctx.strokeStyle='#2a2a2e';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
    vbox(ctx,V,.96,1.03,sc*.56-.04,sc*.56+.04,21,28,'#2e3034',{edge:false});}});
  // exhaust stack (chrome) behind the cab
  const sv=(V.si+V.sj)>0?1:-1;
  parts.push({d:vdepth(V,.22,sv*.33),f:()=>{vbox(ctx,V,.17,.25,sv*.33-.04,sv*.33+.04,10,41,'#c8ced6',{edge:false});vbox(ctx,V,.16,.26,sv*.33-.05,sv*.33+.05,30,36,'#8a9098',{edge:false});}});
  return VL(V,.21,sv*.33,42+V.dz);
}
function truckWheels(ctx,V,pos,near){const sv=(V.si+V.sj)>0?1:-1;const c=TRUCK_SPEC.w+.03;for(const a of pos) vwheel(ctx,V,a,near?sv*c:-sv*c,6.2,near);}
function drawParts(ctx,parts){parts.sort((a,b)=>a.d-b.d);for(const p of parts) p.f();}
/* log truck with a self-loading knuckle-boom crane; o: {col,load,boom:{t,carry}|null,brake} */
function logTruck(ctx,i,j,yaw,o){
  const bounce=o.bounce||0; const V=VF(i,j,yaw,bounce), V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-1.6,1.6,.46);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],false);
  const parts=[];
  parts.push({d:vdepth(V,-.6,0)-.3,f:()=>{vbox(ctx,V,-1.62,1.45,-.3,.3,4,8,'#34343a',{});vbox(ctx,V,-1.62,.22,-.44,.44,8,10.5,'#4a4a52',{});
    if(vvis(V,'B')){const b={a0:-1.62,a1:.22,c0:-.44,c1:.44};for(const cc of [-.36,.36]) vquad(ctx,V,'B',b,cc-.05,cc+.05,8.2,10.2,o.brake?'#ff3a2a':'#a8221a');}}});
  // headboard (ladder rack) behind cab
  parts.push({d:vdepth(V,.18,0),f:()=>{vbox(ctx,V,.14,.22,-.44,.44,10.5,30,'#3a3a40',{deco:(f,b)=>{if(f==='F'||f==='B'){ctx.strokeStyle='rgba(200,205,210,.35)';ctx.lineWidth=.6;ctx.beginPath();for(let z=14;z<30;z+=4){const q=vface(V,f,b,-.44,.44,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();}}});}});
  // stakes
  for(const a of [-1.52,-.72,.06]) for(const sc of [-1,1]) parts.push({d:vdepth(V,a,sc*.42)+(sc*(V.si+V.sj)>0?.4:-.4),f:()=>vbox(ctx,V,a-.035,a+.035,sc*.42-.035,sc*.42+.035,10.5,27,'#2c2c32',{edge:false})});
  // logs: 3-2-1 pyramid
  const n=Math.max(0,Math.min(6,Math.round((o.load||0)*6))), r=4.4;
  const LG=[[-.27,0],[0,0],[.27,0],[-.135,1],[.135,1],[0,2]];
  const sv=(V.si+V.sj)>0?1:-1;
  for(let k=0;k<n;k++){const [c,row]=LG[k];const zc=10.5+r+row*r*1.72;parts.push({d:vdepth(V,-.7,c)*.2+row*.05-.15+sv*c*.15,f:()=>vlog(ctx,V,-1.78,.1,c,zc,r,k%2?'#8a5a2c':'#7a4e26')});}
  const stack=truckCab(ctx,V,o.col,parts,o);
  drawParts(ctx,parts);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],true);
  // knuckle-boom loader
  const bm=o.boom; const base=VL(V,.05,0,38+V.dz);
  let g; if(bm){const k=bm.t;const out=Math.sin(Math.min(1,k)*Math.PI);g=[lerp(-.8,-.45,out),lerp(0,-2.0,out),lerp(30,24,out)];}else g=[-.35,0,41];
  const G=VL(V,g[0],g[1],g[2]+V.dz), E=VL(V,lerp(.05,g[0],.45),lerp(0,g[1],.45),Math.max(g[2],38)+15+V.dz);
  const col0=VL(V,.05,0,10.5+V.dz);ctx.lineCap='round';limb(ctx,[col0,base],3.2,'#c8961e');limb(ctx,[base,E],2.8,'#e8b52a');limb(ctx,[E,G],2.2,'#e8b52a');ctx.lineCap='butt';
  ell(ctx,E[0],E[1],1.6,1.6,'#a87a14');
  if(bm&&bm.carry){const W2=VF(V.i+g[0]*V.fi+g[1]*V.si,V.j+g[0]*V.fj+g[1]*V.sj,Math.atan2(V.fj,V.fi),0);vlog(ctx,W2,-.85,.85,0,g[2]-6+V.dz,4.2,'#8a5a2c');}
  ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(G[0]-3,G[1]+1);ctx.lineTo(G[0]-2,G[1]+5);ctx.moveTo(G[0]+3,G[1]+1);ctx.lineTo(G[0]+2,G[1]+5);ctx.stroke();
  return stack;
}
/* box truck for shipping; o: {col,box,stripe,load,doors,brake,logo} */
function boxTruck(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0), V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-1.6,1.6,.47);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],false);
  const parts=[], bx=o.box||'#f3f0e8', st=o.stripe||'#2f6f9a';
  parts.push({d:vdepth(V,-.7,0),f:()=>{
    vbox(ctx,V,-1.62,1.45,-.3,.3,4,8,'#34343a',{});
    vbox(ctx,V,-1.62,.2,-.46,.46,8.5,43,bx,{deco:(f,b,z0)=>{
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,-1.55,.13,25,30,st);vquad(ctx,V,f,b,-1.55,.13,23.8,24.6,shade(st,1.3));
        ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=.6;ctx.beginPath();for(let a=-1.32;a<.15;a+=.3){const q=vface(V,f,b,a,a,9+V.dz,42+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[2][0],q[2][1]);}ctx.stroke();
        // logo: little tree + wordmark on the side
        const lp=VL(V,-.75,f==='R'?b.c1:b.c0,35+V.dz), F=VL(V,-.74,f==='R'?b.c1:b.c0,35+V.dz);
        ctx.save();const ax=VL(V,1,0,0),a0=VL(V,0,0,0);let tdx=(ax[0]-a0[0])/32,tdy=(ax[1]-a0[1])/32;if(tdx<0){tdx=-tdx;tdy=-tdy;}ctx.transform(tdx,tdy,0,1,lp[0],lp[1]);
        ctx.fillStyle=shade(st,.9);ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.logo||'TIMBER CO.',0,0);ctx.restore();
        if(o.doors>0){const sign=f==='R'?1:-1;const dk=Math.min(1,o.doors);vquad(ctx,V,f,b,-1.62,-1.62+.44*dk,9.5,42,shade(bx,.82),'rgba(30,20,12,.5)');vquad(ctx,V,f,b,-1.6,-1.6+.4*dk,25,30,shade(st,.85));}}
      if(f==='B'){if(o.doors>0){vquad(ctx,V,'B',b,-.42,.42,9.5,42,'#2a2622');const nc=Math.ceil((o.load||0)*6);for(let k=0;k<nc;k++){const cc=-.32+(k%3)*.22,zz=10+Math.floor(k/3)*9;vquad(ctx,V,'B',b,cc,cc+.2,zz,zz+8,['#c98a4a','#e0b071','#b0703c'][k%3],'rgba(40,20,8,.5)');}}
        else{vquad(ctx,V,'B',b,-.42,-.01,9.5,42,shade(bx,.9),'rgba(30,20,12,.4)');vquad(ctx,V,'B',b,.01,.42,9.5,42,shade(bx,.9),'rgba(30,20,12,.4)');
          for(const cc of [-.06,.06]) vquad(ctx,V,'B',b,cc-.015,cc+.015,14,36,'#8a9098');vquad(ctx,V,'B',b,-.42,.42,10,11.2,'#d84a3a');}
        for(const cc of [-.38,.38]) vquad(ctx,V,'B',b,cc-.05,cc+.05,6,8.4,o.brake?'#ff3a2a':'#a8221a');}
    },decoTop:(b,z)=>{ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=.6;ctx.beginPath();for(let a=-1.32;a<.15;a+=.3){const p0=VL(V,a,-.46,z),p1=VL(V,a,.46,z);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();}});
    if(vvis(V,'B')) vbox(ctx,V,-1.68,-1.62,-.44,.44,6,8.5,'#3a3a40',{edge:false});}});
  const stack=truckCab(ctx,V,o.col,parts,o);
  drawParts(ctx,parts);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],true);
  return stack;
}
/* forklift; o: {cargo,yaw} */
function forklift(ctx,i,j,yaw,cargo,bounce){
  const V=VF(i,j,yaw,bounce||0),V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-.45,.9,.3,.9);
  const sv=(V.si+V.sj)>0?1:-1;
  for(const a of [.22,-.28]) vwheel(ctx,V0,a,-sv*.27,3.6,false);
  const parts=[];
  parts.push({d:vdepth(V,-.1,0),f:()=>{vbox(ctx,V,-.45,.36,-.27,.27,3,10,'#f2b92e',{});vbox(ctx,V,-.47,-.24,-.27,.27,3,13,'#d89a1e',{deco:(f,b)=>{if(f==='B'){vquad(ctx,V,'B',b,-.2,.2,6,8,'#2a2a2e');}}});
    vbox(ctx,V,-.2,.1,-.15,.15,10,12.5,'#2a2a2e',{});}});
  parts.push({d:vdepth(V,-.06,0)+.01,f:()=>{const p=VL(V,-.08,0,12+V.dz);const fwd=VL(V,1,0,0),o0=VL(V,0,0,0);const fxs=(fwd[0]-o0[0])>=0?1:-1;
    human(ctx,p[0],p[1]+7.2,{look:FORK_LOOK,fx:fxs,back:(V.fi+V.fj)<0,pose:'sit',s:.72,noShadow:true});}});
  parts.push({d:vdepth(V,-.05,0)+.02,f:()=>{for(const a of [-.3,.22]) for(const sc of [-1,1]) vbox(ctx,V,a-.025,a+.025,sc*.25-.025,sc*.25+.025,10,27,'#2a2a2e',{edge:false});
    vbox(ctx,V,-.33,.25,-.27,.27,27,28.2,'#2a2a2e',{edge:false});}});
  parts.push({d:vdepth(V,.46,0),f:()=>{for(const sc of [-1,1]) vbox(ctx,V,.38,.46,sc*.18-.04,sc*.18+.04,2,29,'#3a3a40',{edge:false});vbox(ctx,V,.38,.46,-.2,.2,4,6,'#4a4a52',{edge:false});
    for(const sc of [-1,1]) vbox(ctx,V,.46,.9,sc*.12-.03,sc*.12+.03,2,3.2,'#9aa0a8',{edge:false});
    if(cargo){vbox(ctx,V,.48,.92,-.2,.2,3.2,5.2,'#b88a52',{});vbox(ctx,V,.5,.9,-.18,.18,5.2,13,RCOL[cargo]||'#c96',{});}}});
  drawParts(ctx,parts);
  for(const a of [.22,-.28]) vwheel(ctx,V0,a,sv*.27,3.6,true);
}
const FORK_LOOK=mkLook(77,{role:'worker',vest:'#f2d21a'});
/* forestry harvester (6 wheels, cab, boom with felling head) */
function harvesterV(ctx,i,j,yaw,ph){
  const V=VF(i,j,yaw,Math.sin(ph*9)*.3),V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-1.1,1.1,.46);
  for(const a of [.75,-.2,-.75]) vwheel(ctx,V0,a,-(V.si+V.sj>0?1:-1)*.46,6.6,false);
  const parts=[];
  parts.push({d:vdepth(V,0,0),f:()=>{vbox(ctx,V,-1.1,1.05,-.42,.42,5,13,'#e6b52a',{});vbox(ctx,V,-1.1,-.15,-.4,.4,13,24,'#d8a520',{deco:(f,b)=>{if(f==='R'||f==='L'){ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=.6;ctx.beginPath();for(let z=15;z<23;z+=2.5){const q=vface(V,f,b,-.95,-.35,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();}}});}});
  parts.push({d:vdepth(V,.55,0),f:()=>{vbox(ctx,V,.2,.95,-.4,.4,13,36,'#4f8a3a',{deco:(f,b)=>{if(f==='F') vquad(ctx,V,'F',b,-.34,.34,17,33,'#8cc4dc','rgba(20,40,50,.6)');if(f==='R'||f==='L') vquad(ctx,V,f,b,.28,.88,18,33,'#8cc4dc','rgba(20,40,50,.6)');if(f==='B') vquad(ctx,V,'B',b,-.3,.3,22,33,'#7ab0c8');}});
    vbox(ctx,V,.15,1.0,-.44,.44,36,38,'#2a2a2e',{edge:false});}});
  drawParts(ctx,parts);
  for(const a of [.75,-.2,-.75]) vwheel(ctx,V0,a,(V.si+V.sj>0?1:-1)*.46,6.6,true);
  const sw=Math.sin(ph*1.1)*.9, base=VL(V,.6,0,38+V.dz), tip=[1.9+Math.cos(ph*1.1)*.2,sw*1.4,14+Math.sin(ph*2.3)*4];
  const E=VL(V,1.2,sw*.6,52+V.dz),G=VL(V,tip[0],tip[1],tip[2]+V.dz);
  ctx.lineCap='round';limb(ctx,[base,E],3,'#e6b52a');limb(ctx,[E,G],2.4,'#e6b52a');ctx.lineCap='butt';
  ctx.fillStyle='#3a3a40';ctx.fillRect(G[0]-4,G[1]-1,8,6);ctx.fillStyle='#c84a2a';ctx.fillRect(G[0]-4,G[1]+3,8,1.6);
  const W2=VF(V.i+tip[0]*V.fi+tip[1]*V.si,V.j+tip[0]*V.fj+tip[1]*V.sj,Math.atan2(V.fj,V.fi)+Math.PI/2,0);
  vlog(ctx,W2,-.55,.55,0,tip[2]-2+V.dz,3.6,'#7a4e26');
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
