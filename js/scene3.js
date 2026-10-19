'use strict';

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
  else if(o.role==='planter'){L.shirt=['#6a8a4a','#7a9a5a','#5a7a3a','#8a7a4a'][Math.floor(R()*4)];L.plaid=null;L.hat=R()<.7?(R()<.5?'cap':'bucket'):null;L.hatc=['#c8a050','#6a8a4a','#e8e0c8'][Math.floor(R()*3)];L.pants=['#4a4030','#3a4a3a','#5a4a3a'][Math.floor(R()*3)];L.bag=true;L.gloves='#c89a5a';if(o.vest) L.vest=o.vest;}
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
   poses: stand walk carry(log on shoulder) box(crate at chest) chop saw plant sit drink brow look clip point hammer */
function humanRaw(ctx,x,y,o){
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
    case 'dig': { // spade: push the blade in with a foot, lever the soil, toss it aside
      const u=((o.t!==undefined?o.t:ph/TAU)%1+1)%1;
      const push=u<.42?ease(u/.42):u<.7?1:1-ease((u-.7)/.3), lever=u<.42?0:u<.7?ease((u-.42)/.28):1-ease((u-.7)/.3), toss=u>=.7?Math.sin((u-.7)/.3*Math.PI):0;
      hipY=HU.hip+1.2+push*.6; lean=1.6+lever*.6; legs=[[[hipF[0],hipY],[hipF[0]-1.4,hipY*.5],[hipF[0]-2.2,0]],[[hipN[0],hipY],[hipN[0]+4.2,hipY*.55-push*1.2],[6.6,-1.6-push*1.4+lever*1.2]]];
      const tip=[7.4,1.1*push-1.6-toss*3.5], a=-.12-lever*.55-toss*.25, L2=17;
      const top=[tip[0]+Math.sin(a)*L2,tip[1]-Math.cos(a)*L2], at=f=>[tip[0]+(top[0]-tip[0])*f,tip[1]+(top[1]-tip[1])*f];
      hand=[at(.93),at(.58)];
      props.push(()=>{limb(ctx,[at(.12),top],1.25,'#8a5a2c');limb(ctx,[[top[0]-1.4,top[1]],[top[0]+1.4,top[1]]],1.1,'#5a3a1c');
        const d=[Math.sin(a),-Math.cos(a)],n=[Math.cos(a),Math.sin(a)],bp=(p,q)=>[tip[0]+d[0]*p+n[0]*q,tip[1]+d[1]*p+n[1]*q];
        fillP(ctx,[bp(0,-1.6),bp(0,1.6),bp(4.2,1.4),bp(4.2,-1.4)],'#9aa4ae');limb(ctx,[bp(0,-1.6),bp(0,1.6)],.5,'#e8eef2');
        if(toss>.05||lever>.3) ell(ctx,tip[0]+d[0]*2.4,tip[1]+d[1]*2.4-1.2,2.4,1.3,'#6a4a2a');});
      break;}
    case 'water': { // watering can: tip it over the fresh sapling, drops fall from the rose
      lean=.7; legs=stance(1.1,.3);
      const tilt=.35+Math.sin(T*1.7+ph)*.08; hand=[[3.4,HU.hip-3.4],[6.2,HU.hip-1.4]];
      props.push(()=>{ctx.save();ctx.translate(5.6,HU.hip-1.2);ctx.rotate(tilt);
        ctx.fillStyle='#3f8a5a';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-2.6,-2.2,5.2,4.4,1.1);else ctx.rect(-2.6,-2.2,5.2,4.4);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-2.2,-1.8,1,3.6);ctx.strokeStyle='#2c6a42';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(-.6,-2.4,1.9,Math.PI,0);ctx.stroke();
        ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(2.4,.6);ctx.lineTo(6.4,-1.6);ctx.stroke();ell(ctx,6.7,-1.8,.9,1.3,'#2c6a42');ctx.restore();
        const sx=5.6+Math.cos(tilt)*6.7-Math.sin(tilt)*-1.8, sy=HU.hip-1.2+Math.sin(tilt)*6.7+Math.cos(tilt)*-1.8;
        for(let k=0;k<5;k++){const f=((T*2.4+k/5+ph)%1);ell(ctx,sx+.4+f*1.2+(k%2)*.6,sy+f*(-sy),.45,.75,`rgba(150,205,255,${.9-f*.5})`);}});
      break;}
    case 'hammer': { // v2.12 builders: claw hammer — raise it overhead, drive the nail, small rebound; the far hand steadies the board
      const u=((o.t!==undefined?o.t:ph/TAU)%1+1)%1;
      const a=u<.55?lerp(.3,-1.85,ease(u/.55)):u<.66?lerp(-1.85,.62,Math.pow((u-.55)/.11,2)):u<.76?.62-.2*Math.sin((u-.66)/.1*Math.PI):lerp(.62,.3,ease((u-.76)/.24));
      lean=.7+(a>0?.35:0); legs=stance(1.7,.4);
      const C=[ns*2.85+lean,HU.sh+1.1], d=[Math.cos(a),Math.sin(a)], n=[-d[1],d[0]], hd=[C[0]+d[0]*6.4+.8,C[1]+d[1]*6.4];
      hand=[[lean+3.6,HU.sh+5.4],hd];
      props.push(()=>{const e=[hd[0]+d[0]*4.6,hd[1]+d[1]*4.6];limb(ctx,[[hd[0]-d[0]*.8,hd[1]-d[1]*.8],e],1.2,'#8a5a2c');
        const hp=(p,q)=>[e[0]+d[0]*p+n[0]*q,e[1]+d[1]*p+n[1]*q];
        fillP(ctx,[hp(-.7,-1.9),hp(.8,-1.9),hp(.8,1.5),hp(-.7,1.5)],'#4a525c');fillP(ctx,[hp(-.7,1.5),hp(.8,1.5),hp(.2,2.6)],'#6a7480');
        ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(lean+3.1,HU.sh+4.4,.5,1.6);});
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
  if(pose==='spray'){const j=Math.sin(T*31)*.25;hand=[[4.6,SHY+4.2+j],[7.6,SHY+2.6+j]];lean=.9;
    props.push(()=>{limb(ctx,[[-2,HU.hip+1],[4.6,SHY+4.4+j]],1.3,'#c8b090');limb(ctx,[[4.6,SHY+4.2+j],[9.6,SHY+1.8+j]],1.1,'#3a3a40');ell(ctx,9.8,SHY+1.7+j,.8,.8,'#c8ced6');});}
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
  if(L.suit&&!back){ctx.fillStyle='#f6f4ee';ctx.beginPath();ctx.moveTo(-1.3,HU.sh+.1);ctx.lineTo(.1,HU.sh+4.2);ctx.lineTo(1.5,HU.sh+.1);ctx.closePath();ctx.fill();
    ctx.fillStyle=L.tie||'#c83a2e';ctx.beginPath();ctx.moveTo(-.25,HU.sh+.5);ctx.lineTo(.45,HU.sh+.5);ctx.lineTo(.7,HU.sh+3.6);ctx.lineTo(.1,HU.sh+4.6);ctx.lineTo(-.5,HU.sh+3.6);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-3.2,HU.sh+5.2,6.5,.5);}
  ctx.save();pth(ctx,tp);ctx.clip();ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(1.7,HU.sh,3,10);ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(-3.4,HU.sh,1.2,10);ctx.restore();
  ctx.fillStyle='rgba(30,20,10,.55)';ctx.fillRect(-2.7,HU.hip+.1,5.3,1);
  if(L.bag){limb(ctx,[[2.2,HU.sh+.6],[-2.6,HU.hip-1]],.8,'#7a6040');ctx.fillStyle='#b89a6a';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-5.2,HU.hip-3.2,3.8,4.4,1);else ctx.rect(-5.2,HU.hip-3.2,3.8,4.4);ctx.fill();
    ctx.fillStyle='#9a7e52';ctx.fillRect(-5.2,HU.hip-3.2,3.8,1.1);ctx.strokeStyle='#4f9a3a';ctx.lineWidth=.9;ctx.beginPath();
    for(const [x0,h] of [[-4.6,3.2],[-3.6,4.2],[-2.4,3.4]]){ctx.moveTo(x0,HU.hip-3.2);ctx.lineTo(x0-.3,HU.hip-3.2-h);}ctx.stroke();
    for(const [x0,h] of [[-4.6,3.2],[-3.6,4.2],[-2.4,3.4]]) ell(ctx,x0-.3,HU.hip-3.4-h,1.1,.8,'#7cc45e');}
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
    if(L.glasses){ctx.strokeStyle='#1e1e22';ctx.lineWidth=.32;ctx.beginPath();ctx.arc(1.25,-.15,.85,0,TAU);ctx.moveTo(.4,-.3);ctx.lineTo(-.9,-.5);ctx.stroke();}
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
  else if(L.hat==='bucket'){ctx.fillStyle=L.hatc;ctx.beginPath();ctx.ellipse(0,-1.3,2.4,2.1,0,Math.PI,0);ctx.closePath();ctx.fill();ctx.fillStyle=shade(L.hatc,.85);ctx.beginPath();ctx.ellipse(.1,-1.1,3.6,.9,0,0,TAU);ctx.fill();}
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

/* v2.8 art pass: cargo items are little outlined isometric objects (were flat side-view rectangles) */
function isoCrate(ctx,w,d,h,top,left,right,ol){ // w along -x/+y axis, d along +x/+y; origin = ground centre
  const A=[-w,-w*.5],B=[d,-d*.5],T=(p,z)=>[p[0],p[1]-z];
  const pts=[[A[0]+0,A[1]+0],[0,0]];
  ctx.fillStyle=ol;ctx.beginPath();ctx.moveTo(-w-.6,-w*.5);ctx.lineTo(-w-.6,-w*.5-h-.6);ctx.lineTo(-w+d,-(w+d)*.5-h-.9);ctx.lineTo(d+.6,-d*.5-h-.6);ctx.lineTo(d+.6,-d*.5);ctx.lineTo(0,.7);ctx.closePath();ctx.fill();
  ctx.fillStyle=left;ctx.beginPath();ctx.moveTo(-w,-w*.5);ctx.lineTo(0,0);ctx.lineTo(0,-h);ctx.lineTo(-w,-w*.5-h);ctx.closePath();ctx.fill();
  ctx.fillStyle=right;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(d,-d*.5);ctx.lineTo(d,-d*.5-h);ctx.lineTo(0,-h);ctx.closePath();ctx.fill();
  ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(-w,-w*.5-h);ctx.lineTo(-w+d,-(w+d)*.5-h);ctx.lineTo(d,-d*.5-h);ctx.closePath();ctx.fill();
}
function cargoIconRaw(ctx,x,y,res,s){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  const c=RCOL[res]||'#a86', OL='#3a2212';
  if(res==='logs'){for(const [dx,dy] of [[-1.6,.6],[1.6,.6],[0,-2.2]]){ctx.save();ctx.translate(dx,dy);
      ctx.fillStyle=OL;ctx.beginPath();ctx.moveTo(-6.4,-2.6);ctx.lineTo(3.2,2.2);ctx.lineTo(3.2,-.6+1.4);ctx.lineTo(-6.4,-5.4);ctx.closePath();ctx.fill();
      ctx.fillStyle='#8a5a2c';ctx.beginPath();ctx.moveTo(-6,-2.8);ctx.lineTo(3,1.7);ctx.lineTo(3,-1);ctx.lineTo(-6,-5.2);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,220,170,.3)';ctx.beginPath();ctx.moveTo(-6,-4.9);ctx.lineTo(3,-.6);ctx.lineTo(3,-.1);ctx.lineTo(-6,-4.4);ctx.closePath();ctx.fill();
      ell(ctx,3.1,.35,1.75,1.75,OL);ell(ctx,3.1,.35,1.4,1.4,'#e8c088');ell(ctx,3.1,.35,.6,.6,'#c39058');ctx.restore();}}
  else if(res==='planks'){for(let k=0;k<3;k++){ctx.save();ctx.translate(0,-k*1.5);isoCrate(ctx,6,3,1.2,shade(c,1.12),c,shade(c,.78),OL);ctx.restore();}
    ctx.strokeStyle='rgba(90,50,15,.5)';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(-4.5,-6.2);ctx.lineTo(1.5,-3.2);ctx.stroke();}
  else if(res==='chips'){ctx.fillStyle=OL;ctx.beginPath();ctx.ellipse(0,0,6.3,3,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(-6.2,0);ctx.quadraticCurveTo(-1,-8.5,0,-7.6);ctx.quadraticCurveTo(1,-8.5,6.2,0);ctx.fill();
    ctx.fillStyle='#b8925a';ctx.beginPath();ctx.moveTo(-5.6,0);ctx.quadraticCurveTo(-1,-7.6,0,-6.9);ctx.quadraticCurveTo(1,-7.6,5.6,0);ctx.quadraticCurveTo(0,2.6,-5.6,0);ctx.fill();
    ctx.fillStyle='#e0bc80';ctx.beginPath();ctx.moveTo(-3.6,-2.6);ctx.quadraticCurveTo(-1,-6.8,0,-6.6);ctx.lineTo(-.5,-3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8a6634';for(const [px,py] of [[-2.5,-1],[1.5,-2.5],[3,-.5],[-.5,-4]]) ctx.fillRect(px,py,1.1,.6);}
  else if(res==='chairs'){ctx.strokeStyle=OL;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-3,-1.5);ctx.lineTo(-3,2.5);ctx.moveTo(3,-1.5);ctx.lineTo(3,2.5);ctx.moveTo(0,0);ctx.lineTo(0,3.5);ctx.moveTo(-3,-1.5);ctx.lineTo(-3,-8);ctx.stroke();
    ctx.strokeStyle=c;ctx.lineWidth=.8;ctx.stroke();ctx.lineCap='butt';
    ctx.save();ctx.translate(0,-1);isoCrate(ctx,3.2,3.2,.9,shade(c,1.15),c,shade(c,.78),OL);ctx.restore();
    ctx.fillStyle=OL;ctx.fillRect(-3.6,-8.6,1.6,6);ctx.fillStyle=shade(c,1.05);ctx.fillRect(-3.4,-8.3,1.1,5.6);}
  else {isoCrate(ctx,4.6,4.6,5.6,shade(c,1.18),c,shade(c,.74),OL);
    ctx.strokeStyle='rgba(60,30,10,.35)';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(-4.6,-4.1);ctx.lineTo(0,-1.8);ctx.lineTo(4.6,-4.1);ctx.moveTo(-2.3,-1.15);ctx.lineTo(-2.3,-6.8);ctx.moveTo(2.3,-1.15);ctx.lineTo(2.3,-6.8);ctx.stroke();
    ctx.fillStyle='rgba(255,250,235,.85)';ctx.beginPath();ctx.moveTo(.8,-3.1);ctx.lineTo(3.8,-4.6);ctx.lineTo(3.8,-3);ctx.lineTo(.8,-1.5);ctx.closePath();ctx.fill();}
  ctx.restore();
}
function cargoIcon(ctx,x,y,res,s){sprite(ctx,'c'+res+'|'+s,x,y,[-10*s,-12*s,10*s,6*s],(g,ax,ay)=>cargoIconRaw(g,ax,ay,res,s));}


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
function logTruckRaw(ctx,i,j,yaw,o){
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
  vbox(ctx,V,-.04,.14,-.1,.1,10.5,38,'#c8961e',{edge:false});   // v2.13: crane pillar + hydraulic booms
  fvBoom(ctx,base,E,3,'#e8b52a',true);fvBoom(ctx,E,G,2.3,'#e8b52a',false);
  if(bm&&bm.carry){const W2=VF(V.i+g[0]*V.fi+g[1]*V.si,V.j+g[0]*V.fj+g[1]*V.sj,Math.atan2(V.fj,V.fi),0);vlog(ctx,W2,-.85,.85,0,g[2]-6+V.dz,4.2,'#8a5a2c');}
  ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(G[0]-3,G[1]+1);ctx.lineTo(G[0]-2,G[1]+5);ctx.moveTo(G[0]+3,G[1]+1);ctx.lineTo(G[0]+2,G[1]+5);ctx.stroke();
  return stack;
}
/* box truck for shipping; o: {col,box,stripe,load,doors,brake,logo} */
function boxTruckRaw(ctx,i,j,yaw,o){
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
function forkliftRaw(ctx,i,j,yaw,cargo,bounce){
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

/* v2.8 art pass: rounded, shaded and outlined 3/4-view helicopter and quad drone (were flat ellipses and rectangles) */
function heli(ctx,x,y,alt,ph,carry){
  ctx.fillStyle='rgba(30,40,10,.18)';ctx.beginPath();ctx.ellipse(x+alt*.25,y,20,7.5,0,0,TAU);ctx.fill();
  const hy=y-alt, OL='#3a1410';
  if(carry){ctx.strokeStyle='#2a2a2e';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,hy+7);ctx.lineTo(x-5,hy+22);ctx.moveTo(x,hy+7);ctx.lineTo(x+5,hy+22);ctx.stroke();
    for(let k=0;k<3;k++){const ly=hy+22+(k===2?-3.4:k*0),lx=x-8+(k===2?3.5:0)+(k===1?0:0);const yy=k===1?hy+25.4:ly;
      ctx.fillStyle='#4a2a12';ctx.fillRect(lx-.6,yy-.6,17.2,4.6);ctx.fillStyle=k===1?'#7a4a22':'#8a5a2c';ctx.fillRect(lx,yy,16,3.4);ctx.fillStyle='rgba(255,220,170,.25)';ctx.fillRect(lx,yy,16,.9);
      ell(ctx,lx+16,yy+1.7,1.9,2,'#4a2a12');ell(ctx,lx+16,yy+1.7,1.5,1.6,'#e8c088');}
    ctx.fillStyle='#c83a2a';ctx.fillRect(x-1.2,hy+21,2.4,8.5);}
  // tail boom + fin + tail rotor
  ctx.fillStyle=OL;ctx.beginPath();ctx.moveTo(x+6,hy-4.6);ctx.lineTo(x+25,hy-3.4);ctx.lineTo(x+25,hy+.4);ctx.lineTo(x+6,hy+3.4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c33a2c';ctx.beginPath();ctx.moveTo(x+6,hy-3.6);ctx.lineTo(x+24.4,hy-2.6);ctx.lineTo(x+24.4,hy-.4);ctx.lineTo(x+6,hy+2.4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f2efe6';ctx.fillRect(x+10,hy-2.2,12,1);
  ctx.fillStyle=OL;ctx.beginPath();ctx.moveTo(x+21,hy-2);ctx.lineTo(x+24,hy-11);ctx.lineTo(x+27,hy-11);ctx.lineTo(x+26,hy);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d84a3a';ctx.beginPath();ctx.moveTo(x+21.8,hy-2);ctx.lineTo(x+24.4,hy-10.2);ctx.lineTo(x+26.2,hy-10.2);ctx.lineTo(x+25.3,hy-.6);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(60,60,60,.3)';ctx.beginPath();ctx.ellipse(x+27.5,hy-6,1.3,5.5,0,0,TAU);ctx.fill();
  // skids
  ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-11,hy+10.5);ctx.lineTo(x+9,hy+10.5);ctx.quadraticCurveTo(x+11.5,hy+10.5,x+12,hy+8.8);
  ctx.moveTo(x-5,hy+5);ctx.lineTo(x-6,hy+10.5);ctx.moveTo(x+4,hy+5);ctx.lineTo(x+5,hy+10.5);ctx.stroke();ctx.lineCap='butt';
  // body
  ctx.fillStyle=OL;ctx.beginPath();ctx.ellipse(x-.5,hy,14.2,8.4,0,0,TAU);ctx.fill();
  const gr=ctx.createLinearGradient(0,hy-8,0,hy+8);gr.addColorStop(0,'#f06a55');gr.addColorStop(.55,'#d84a3a');gr.addColorStop(1,'#9e2c22');
  ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(x-.5,hy,13.2,7.4,0,0,TAU);ctx.fill();
  ctx.fillStyle='#f2efe6';ctx.beginPath();ctx.ellipse(x+1,hy+3.4,11,1.4,0,0,TAU);ctx.fill();
  ctx.fillStyle='#2a3a48';ctx.beginPath();ctx.ellipse(x-7,hy-1.2,6.4,5,-.15,0,TAU);ctx.fill();
  const gg=ctx.createLinearGradient(x-12,hy-6,x-3,hy+3);gg.addColorStop(0,'#d8f2ff');gg.addColorStop(1,'#6aa8c8');
  ctx.fillStyle=gg;ctx.beginPath();ctx.ellipse(x-7,hy-1.4,5.6,4.3,-.15,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(x-9,hy-3.2,2,1,-.5,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(x+2,hy-5,6,1.4,0,0,TAU);ctx.fill();
  // mast + rotor
  ctx.fillStyle='#2a2a2e';ctx.fillRect(x-1.6,hy-11,3.2,4.4);ctx.fillStyle='#55555c';ctx.fillRect(x-3.6,hy-8,7.2,1.6);
  ctx.fillStyle='rgba(50,50,56,.22)';ctx.beginPath();ctx.ellipse(x,hy-11,28,5.6,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(40,40,46,.85)';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();
  for(const o of [0,Math.PI/2]){const a=ph*30+o,c=Math.cos(a)*27,d=Math.sin(a)*5.2;ctx.moveTo(x-c,hy-11-d);ctx.lineTo(x+c,hy-11+d);}ctx.stroke();ctx.lineCap='butt';
  ell(ctx,x,hy-11.2,1.8,1.1,'#7a7a82');
}
function drone(ctx,x,y,alt,ph){
  ctx.fillStyle='rgba(30,40,10,.16)';ctx.beginPath();ctx.ellipse(x+alt*.2,y,10,4.2,0,0,TAU);ctx.fill();
  const hy=y-alt, arms=[[-9,-3.4],[9,-3.4],[-9,3.4],[9,3.4]];
  ctx.lineCap='round';ctx.strokeStyle='#1e2630';ctx.lineWidth=2.6;ctx.beginPath();for(const [dx,dy] of arms){ctx.moveTo(x,hy);ctx.lineTo(x+dx,hy+dy);}ctx.stroke();
  ctx.strokeStyle='#5a6878';ctx.lineWidth=1.4;ctx.beginPath();for(const [dx,dy] of arms){ctx.moveTo(x,hy);ctx.lineTo(x+dx,hy+dy);}ctx.stroke();ctx.lineCap='butt';
  for(const [dx,dy] of arms){ell(ctx,x+dx,hy+dy,1.6,1.1,'#1e2630');ctx.fillStyle='rgba(200,245,255,.45)';ctx.beginPath();ctx.ellipse(x+dx,hy+dy-1.6,5.6,2.1,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(30,40,50,.55)';ctx.lineWidth=.7;ctx.beginPath();const a=ph*40+dx,c=Math.cos(a)*5.2,d=Math.sin(a)*1.9;ctx.moveTo(x+dx-c,hy+dy-1.6-d);ctx.lineTo(x+dx+c,hy+dy-1.6+d);ctx.stroke();}
  ctx.fillStyle='#1e2630';rr(ctx,x-5,hy-3.4,10,6.4,2.4);ctx.fill();
  const gr=ctx.createLinearGradient(0,hy-3,0,hy+3);gr.addColorStop(0,'#5d8ab4');gr.addColorStop(1,'#2e4f72');ctx.fillStyle=gr;rr(ctx,x-4.3,hy-2.8,8.6,5.2,2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(x-3.2,hy-2.3,5,.9);
  ell(ctx,x+.4,hy+3.4,1.6,1.3,'#1e2630');ell(ctx,x+.7,hy+3.3,.7,.6,'#7fd0ff');
  ctx.fillStyle=(Math.sin(ph*6)>0)?'#7dfc6a':'#2a6a2a';ctx.fillRect(x-1,hy-4.4,2,1.4);
}

/* v2.21 town market van — shorter than the dock box truck; cart = canvas-roof early-game cart */
function mktVanRaw(ctx,i,j,yaw,o){
  o=o||{}; const cart=!!o.cart; const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0);
  const col=o.col||'#6a9ab8', boxc=o.box||'#f2eee4', stripe=o.stripe||'#5a8aa0', cargo=o.cargo||null;
  const load=Math.max(0,Math.min(1,o.load||0));
  vshadow(ctx,V0,cart?-0.9:-1.05,cart?.95:1.08,.36);
  const sv=(V.si+V.sj)>0?1:-1;
  const wheels=cart?[.52,-.55]:[.68,-.72];
  for(const a of wheels) vwheel(ctx,V0,a,-sv*.36,4.6,false);
  if(cart){
    // wooden cart bed + canvas hoop roof
    vbox(ctx,V,-.95,.85,-.34,.34,3.5,8.5,'#7a5a38',{left:'#6a4a2a',right:'#5a3a1e',top:'#8a6a42'});
    vbox(ctx,V,-.9,.55,-.32,.32,8.5,14,'#9a7348',{deco:(f,b)=>{
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,-.85,.5,10,11,stripe);if(load>.05){const n=Math.ceil(load*4);for(let k=0;k<n;k++){const a=-.7+k*.35;vquad(ctx,V,f,b,a,a+.28,9,13.2,RCOL[cargo]||'#c98a4a');}}}
      if(f==='B'){for(const cc of [-.28,.28]) vquad(ctx,V,'B',b,cc-.05,cc+.05,5,7.5,o.brake?'#ff3a2a':'#a8221a');}}});
    // canvas cover (arched)
    const z0=14,z1=22; for(let k=0;k<5;k++){const t=k/4,a=-.88+t*1.5,z=z0+(1-Math.pow(2*t-1,2))*8;
      const p0=VL(V,a,-.34,z+V.dz),p1=VL(V,a,.34,z+V.dz);ctx.strokeStyle=k%2?'#d8c8a8':'#c8b890';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();}
    // soft cab (driver bench under a short hood)
    vbox(ctx,V,.5,.95,-.32,.32,8.5,18,col,{deco:(f,b)=>{
      if(f==='F'){vquad(ctx,V,'F',b,-.28,.28,12,17,'#8ab8c8','rgba(30,40,50,.55)');for(const cc of [-.26,.26]) vquad(ctx,V,'F',b,cc-.04,cc+.04,10,12,'#fff6c8');}
      if(f==='R'||f==='L') vquad(ctx,V,f,b,.55,.9,12,17,'#8ab8c8','rgba(30,40,50,.55)');}});
  } else {
    // short soft-colour box van (no shipping-container look)
    vbox(ctx,V,-1.08,1.05,-.28,.28,3.5,7.5,'#34343a',{});
    // cargo box
    vbox(ctx,V,-1.05,.22,-.38,.38,7.5,28,boxc,{deco:(f,b)=>{
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,-1.0,.15,16,20,stripe);vquad(ctx,V,f,b,-1.0,.15,15.2,15.8,shade(stripe,1.25));
        ctx.save();const lp=VL(V,-.45,f==='R'?b.c1:b.c0,23+V.dz);const ax=VL(V,1,0,0),a0=VL(V,0,0,0);let tdx=(ax[0]-a0[0])/32,tdy=(ax[1]-a0[1])/32;if(tdx<0){tdx=-tdx;tdy=-tdy;}
        ctx.transform(tdx,tdy,0,1,lp[0],lp[1]);ctx.fillStyle=shade(stripe,.85);ctx.font='900 5.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.logo||'TOWN',0,0);ctx.restore();}
      if(f==='B'){if(load>.08){vquad(ctx,V,'B',b,-.34,.34,8,27,'#2a2622');const n=Math.ceil(load*5);for(let k=0;k<n;k++){const cc=-.26+(k%3)*.22,zz=9+Math.floor(k/3)*8;vquad(ctx,V,'B',b,cc,cc+.18,zz,zz+7,RCOL[cargo]||['#c98a4a','#e0b071','#b0703c'][k%3],'rgba(40,20,8,.45)');}}
        else{vquad(ctx,V,'B',b,-.34,-.01,8,27,shade(boxc,.9));vquad(ctx,V,'B',b,.01,.34,8,27,shade(boxc,.9));}
        for(const cc of [-.3,.3]) vquad(ctx,V,'B',b,cc-.045,cc+.045,5,7,o.brake?'#ff3a2a':'#a8221a');}}});
    // short cab
    vbox(ctx,V,.22,.98,-.36,.36,7.5,24,col,{deco:(f,b)=>{
      if(f==='F'){vquad(ctx,V,'F',b,-.3,.3,14,22,'#7fb4cc','rgba(30,40,50,.65)');vquad(ctx,V,'F',b,-.3,-.02,17,22,'rgba(255,255,255,.28)');
        for(const cc of [-.28,.28]) vquad(ctx,V,'F',b,cc-.045,cc+.045,10,12.2,'#fff6c8');for(const cc of [-.32,.32]) vquad(ctx,V,'F',b,cc-.02,cc+.02,8.5,9.8,'#f5a020');}
      if(f==='R'||f==='L'){vquad(ctx,V,f,b,.35,.9,14,22,'#86bcd2','rgba(30,40,50,.6)');vquad(ctx,V,f,b,.35,.62,17,22,'rgba(255,255,255,.22)');}
      if(f==='B') vquad(ctx,V,'B',b,-.22,.22,16,21,'#5a7a8a');},
      decoTop:(b,z)=>{for(const cc of [-.16,0,.16]){const p=VL(V,.7,cc,z);ell(ctx,p[0],p[1],1.1,.7,'#f5a020');}}});
    vbox(ctx,V,.85,1.02,-.36,.36,4.5,8,'#b8bec6',{});
  }
  for(const a of wheels) vwheel(ctx,V0,a,sv*.36,4.6,true);
  // exhaust tip (for smoke hook)
  return VL(V,cart?.4:-.15,sv*.3,(cart?19:26)+V.dz);
}
