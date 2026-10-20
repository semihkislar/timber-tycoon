'use strict';
/* ===================== v2.5 R&D campus, harbour, trade map ===================== */
const CAMPUS={i0:14.2,i1:19.6,j0:-1.4,j1:3.5};
const HARBOR={i0:32.4,i1:40.4,j0:11.5,j1:17.2};
Object.assign(LOTS,{
  lab:    {id:'lab',    ci:15.4,cj:.2, side:'T',face:'I',tech:true,bs0:1.9},
  plymill:{id:'plymill',ci:17.7,cj:.2, side:'T',face:'I',tech:true,bs0:1.9},
  toyshop:{id:'toyshop',ci:16.55,cj:2.35,side:'T',face:'J',tech:true,bs0:1.9},
  boatyard:{id:'boatyard',ci:38.9,cj:15.0,side:'H',face:'J',tech:true,bs0:2.2},
});
const OUT_OF_TECH={plymill:'plywood',toyshop:'toys',boatyard:'boats'};
Object.assign(OUT_OF,OUT_OF_TECH);
Object.assign(RCOL,{glue:'#c8a030',plywood:'#b8864a',toys:'#e07050',boats:'#3a6aaa'});
Object.assign(ICONS,{
  glue:()=>`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="22" rx="7" ry="5" fill="#c8a030"/><path d="M10 18 Q16 6 22 18" fill="#e8c45a" stroke="#a88220"/><ellipse cx="16" cy="10" rx="3" ry="2" fill="#f5d87a"/></svg>`,
  plywood:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="7" width="24" height="5" rx="1" fill="#c08a4f"/><rect x="4" y="13" width="24" height="5" rx="1" fill="#a36d38"/><rect x="4" y="19" width="24" height="5" rx="1" fill="#8b5a2b"/><line x1="6" y1="9.5" x2="26" y2="9.5" stroke="#d8b070" stroke-width=".6"/><line x1="6" y1="15.5" x2="26" y2="15.5" stroke="#c08a4f" stroke-width=".6"/></svg>`,
  toys:()=>`<svg viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="12" rx="2" fill="#e07050"/><circle cx="12" cy="20" r="2.5" fill="#fff"/><circle cx="20" cy="20" r="2.5" fill="#fff"/><rect x="11" y="8" width="10" height="7" rx="1" fill="#f5c84c"/><circle cx="16" cy="11" r="1.6" fill="#2a2a2e"/></svg>`,
  boats:()=>`<svg viewBox="0 0 32 32"><path d="M4 22 Q16 28 28 22 L24 16 H8 Z" fill="#3a6aaa" stroke="#1a3e66"/><rect x="14" y="6" width="3" height="12" fill="#e8e4dc"/><path d="M17 7 L26 14 L17 14 Z" fill="#f5f0e0" stroke="#c9b28c"/></svg>`,
  lab:()=>UI_ICONS.rnd,
});
ICONS.plywood_b=ICONS.plywood; ICONS.toys_b=ICONS.toys; ICONS.boats_b=ICONS.boats;

function campusOpen(){return labAvail()||TECH_BLD.some(b=>S.buildings[b.id].lvl>0)||Object.keys(S.research||{}).length>0;}
function harborOpen(){return harborLvl()>0||S.buildings.boatyard.lvl>0;}
let _campWas=false,_harbWas=false;
function techVisTick(){const c=campusOpen(),h=harborOpen();if(c!==_campWas||h!==_harbWas){scene.chunks.clear();_campWas=c;_harbWas=h;}}

/* ---------- tech building drawings ---------- */
function bLab(ctx,L,B,run,t){
  const {i0,i1,j0,j1,bs,ms}=B; const h=22+ms*2;
  box(ctx,i0,j0,i1,j1,0,h,'#6a8a9a',{top:'#d8e8f0'});
  // glass atrium
  glassFace(ctx,'I',i1,j0+.15,j1-.15,6,h-4,run?'#bfe8ff':'#7a9aaa');
  glassFace(ctx,'J',j1,i0+.15,i1-.15,6,h-4,run?'#bfe8ff':'#7a9aaa');
  // rooftop dish
  const [cx,cy]=P((i0+i1)/2,(j0+j1)/2,h);
  ctx.strokeStyle='#cfd8e0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy-4,10,4,0,0,Math.PI);ctx.stroke();
  ctx.fillStyle=run?'#ffd34a':'#8a8a70';ctx.beginPath();ctx.arc(cx,cy-8,3,0,TAU);ctx.fill();
  if(run){ctx.fillStyle=`rgba(180,230,255,${.15+.1*Math.sin(t*3)})`;ctx.beginPath();ctx.arc(cx,cy-8,8+3*Math.sin(t*2),0,TAU);ctx.fill();}
  win(ctx,'I',i1,j0+bs*.25,bs*.2,h-10,7,run,'#1a2a3a');
  fillP(ctx,fq('J',j1-.05,i0+bs*.15,i1-bs*.15,h+1,h+9),'#1a2a3a','#7ec8e8');
  ctx.save();fxf(ctx,'J',j1-.05,i0+bs*.15,h+5);ctx.fillStyle='#cfe8ff';ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('LAB',(i1-i0-bs*.3)*16,0);ctx.restore();
  if(ms>=4) flag(ctx,...P(i1,j0,h),'#5ac08a');
  return h+10;
}
function bPly(ctx,L,B,run,t){
  const {i0,i1,j0,j1,bs,ms}=B; const h=20+ms*2;
  box(ctx,i0,j0,i1,j1,0,h,'#8a6a4a',{top:'#c9a06a'});
  // layered plywood stacks on the roof
  for(let k=0;k<3;k++) box(ctx,i0+.2+k*.15,j0+.25+k*.1,i0+1.1+k*.15,j0+.55+k*.1,h+k*2,h+2.4+k*2,['#c08a4f','#a36d38','#8b5a2b'][k],{hl:false});
  // press arms
  const mid=(j0+j1)/2; box(ctx,i1-.15,mid-.5,i1+.35,mid+.5,4,h-2,'#5a5a66',{});
  if(run){const p=P(i1+.1,mid,h-6);ctx.fillStyle=`rgba(255,200,80,${.3+.2*Math.sin(t*6)})`;ctx.beginPath();ctx.arc(p[0],p[1],4,0,TAU);ctx.fill();}
  win(ctx,'J',j1,i0+bs*.3,bs*.25,h-9,7,run,'#2a1a10');
  fillP(ctx,fq('J',j1-.05,i0+bs*.18,i1-bs*.18,h+1,h+9),'#3a2a1a','#c08a4f');
  ctx.save();fxf(ctx,'J',j1-.05,i0+bs*.18,h+5);ctx.fillStyle='#f5e0b8';ctx.font='900 6px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PLYWOOD',(i1-i0-bs*.36)*16,0);ctx.restore();
  return h+10;
}
function bToys(ctx,L,B,run,t){
  const {i0,i1,j0,j1,bs,ms}=B; const h=18+ms*2;
  box(ctx,i0,j0,i1,j1,0,h,'#e07050',{top:'#f5c84c'});
  // striped awning
  for(let k=0;k<5;k++){const a=i0+k*(bs/5),b=a+bs/5;fillP(ctx,[P(a,j1,h),P(b,j1,h),P(b,j1+.4,h-2),P(a,j1+.4,h-2)],k%2?'#f5c84c':'#e07050');}
  // toy blocks on the roof
  box(ctx,i0+.3,j0+.3,i0+.7,j0+.7,h,h+4,'#5ac08a',{}); box(ctx,i0+.8,j0+.35,i1-.3,j0+.75,h,h+3,'#5aa6e8',{});
  win(ctx,'I',i1,j0+bs*.3,bs*.22,h-8,6,run,'#3a1a10');
  fillP(ctx,fq('J',j1-.05,i0+bs*.2,i1-bs*.2,h+1,h+8),'#2a1a10','#f5c84c');
  ctx.save();fxf(ctx,'J',j1-.05,i0+bs*.2,h+4.5);ctx.fillStyle='#fff';ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('TOYS',(i1-i0-bs*.4)*16,0);ctx.restore();
  if(run){const p=P((i0+i1)/2,j1+.2,8);ctx.fillStyle='#fff';ctx.font='10px system-ui';ctx.fillText('🧸',p[0]-5,p[1]-6+Math.sin(t*3)*2);}
  return h+10;
}
function bBoat(ctx,L,B,run,t){
  const {i0,i1,j0,j1,bs,ms}=B; const h=16+ms*1.5;
  // slipway shed
  box(ctx,i0,j0,i1,j1,0,h,'#3a5a7a',{top:'#cfd8e0'});
  // open bay facing the water (+j)
  fillP(ctx,[P(i0+.15,j1,2),P(i1-.15,j1,2),P(i1-.15,j1,h-2),P(i0+.15,j1,h-2)],'#1a2a3a');
  // boat on the slipway, bow toward the river (+j); it rocks gently while the yard is working
  const bj=j1+.95, ci=(i0+i1)/2, rk=run?Math.sin(t*.9)*.06:0;
  const V=VF(ci,bj+rk,Math.PI/2,1);
  fillP(ctx,[P(ci-.5,j1,0),P(ci+.5,j1,0),P(ci+.5,j1+1.9,-2),P(ci-.5,j1+1.9,-2)],'#8a7a66');            // slip rails
  vbox(ctx,V,-.85,.55,-.34,.34,0,3,'#2f5a8a',{top:false});
  vbox(ctx,V,-.85,.55,-.34,.34,3,6,'#f4f1ea',{topc:'#c8a070'});
  fillP(ctx,[VL(V,.55,-.34,6+V.dz),VL(V,1.05,0,6.5+V.dz),VL(V,.55,.34,6+V.dz)],'#c8a070','rgba(30,20,12,.4)',.7);
  fillP(ctx,[VL(V,.55,.34,V.dz),VL(V,1.05,0,V.dz+1),VL(V,1.05,0,6.5+V.dz),VL(V,.55,.34,6+V.dz)],'#e8e4dc','rgba(30,20,12,.4)',.7);
  vbox(ctx,V,-.6,-.05,-.22,.22,6,11,'#f4f1ea',{deco:(fc,bb)=>{if(fc==='F'||fc==='R'||fc==='L') vquad(ctx,V,fc,bb,fc==='F'?-.16:-.5,fc==='F'?.16:-.15,8,10,'#2a3a4a');}});
  {const m0=VL(V,.15,0,6+V.dz),m1=VL(V,.15,0,26+V.dz);ctx.strokeStyle='#5a4a3a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(m0[0],m0[1]);ctx.lineTo(m1[0],m1[1]);ctx.stroke();
   fillP(ctx,[m1,VL(V,.15,0,9+V.dz),VL(V,.75,0,9+V.dz)],'rgba(250,248,240,.92)','rgba(120,110,90,.5)',.6);}
  // gantry crane over the slip
  box(ctx,i1-.2,j0+.2,i1+.15,j0+.5,0,h+14,'#e8a020',{});
  const a=P(i1,j0+.35,h+14),b=P(ci,bj,14);
  ctx.strokeStyle='#666';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  fillP(ctx,fq('J',j1-.04,i0+.2,i1-.2,h+1,h+8),'#1a2a3a','#7ec8e8');
  ctx.save();fxf(ctx,'J',j1-.04,i0+.2,h+4.5);ctx.fillStyle='#cfe8ff';ctx.font='900 6px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOAT YARD',(i1-i0-.4)*16,0);ctx.restore();
  return h+16;
}
BDRAW.lab=bLab; BDRAW.plymill=bPly; BDRAW.toyshop=bToys; BDRAW.boatyard=bBoat;

/* ---------- campus / harbour ground + buildings ---------- */
const RAIL_I=32.78, RIVER_J0=17.2, RIVER_J1=19.9, BERTH=[35.7,18.55], PLATFORM_J=14.3;
function drawCampusGround(ctx){
  if(!campusOpen()) return;
  const {i0,i1,j0,j1}=CAMPUS;
  fillP(ctx,[P(i0,j1),P(i1,j1),P(i1,j1,-4),P(i0,j1,-4)],'#8e9a7c');
  fillP(ctx,[P(i1,j0),P(i1,j1),P(i1,j1,-4),P(i1,j0,-4)],'#7e8a6c');
  fillP(ctx,[P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)],SEAS===3?'#e4e8ea':'#cdd3c0');
  // paving grid + path
  ctx.strokeStyle='rgba(90,100,80,.18)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=Math.ceil(i0);i<i1;i++){const A=P(i,j0),B=P(i,j1);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}
  for(let j=Math.ceil(j0);j<j1;j++){const A=P(i0,j),B=P(i1,j);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}ctx.stroke();
  fillP(ctx,[P(15.1,1.35),P(19.4,1.35),P(19.4,1.15+.2),P(15.1,1.35)],'#b8c0a8');
  fillP(ctx,[P(14.7,1.25),P(18.9,1.25),P(18.9,1.55),P(14.7,1.55)],'#e8e4d8');
  // lawn patches
  for(const [a,c] of [[[14.4,2.9],[15.4,3.4]],[[18.1,2.9],[19.4,3.4]]]) fillP(ctx,[P(a[0],a[1]),P(c[0],a[1]),P(c[0],c[1]),P(a[0],c[1])],SEAS===3?'#f2f6f8':'#8cc761');
}
function drawRiver(ctx){
  // river mouth / harbour basin: always part of the landscape from v2.5
  const j0=RIVER_J0,j1=RIVER_J1;
  fillP(ctx,[P(32.2,j0-.15),P(90,j0-.15),P(90,j1+.15),P(32.2,j1+.15)],SEAS===3?'#d8dcd0':'#c8b888');   // banks
  fillP(ctx,[P(32.35,j0),P(90,j0),P(90,j1),P(32.35,j1)],SEAS===3?'#7aa0b8':'#4a8ab8');
  fillP(ctx,[P(32.35,(j0+j1)/2-.35),P(90,(j0+j1)/2-.35),P(90,(j0+j1)/2+.35),P(32.35,(j0+j1)/2+.35)],SEAS===3?'#6a92ac':'#3f7eac');
  // culvert under the highway
  fillP(ctx,[P(32.2,j0-.15),P(32.4,j0-.15),P(32.4,j1+.15),P(32.2,j1+.15)],'#9a958a');
  fillP(ctx,[P(32.4,j0-.15),P(32.4,j1+.15),P(32.4,j1+.15,-5),P(32.4,j0-.15,-5)],'#6a665e');
}
function drawRail(ctx){
  if(!harborOpen()) return;
  fillP(ctx,[P(RAIL_I-.42,-70),P(RAIL_I+.42,-70),P(RAIL_I+.42,100),P(RAIL_I-.42,100)],'#8a8278');
  ctx.strokeStyle='#5a4a3a';ctx.lineWidth=1.6;ctx.beginPath();
  for(let j=-70;j<100;j+=.42){const a=P(RAIL_I-.3,j),b=P(RAIL_I+.3,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  ctx.strokeStyle='#cfd4da';ctx.lineWidth=1.3;ctx.beginPath();
  for(const d of [-.17,.17]){const a=P(RAIL_I+d,-70),b=P(RAIL_I+d,100);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  // rail bridge over the river
  fillP(ctx,[P(RAIL_I-.45,RIVER_J0-.1),P(RAIL_I+.45,RIVER_J0-.1),P(RAIL_I+.45,RIVER_J1+.1),P(RAIL_I-.45,RIVER_J1+.1)],'#6a6a70');
}
function drawHarborGround(ctx){
  drawRiver(ctx);
  if(!harborOpen()) return;
  drawRail(ctx);
  const {i0,i1,j0,j1}=HARBOR;
  // quay deck (concrete) with a timber edge
  fillP(ctx,[P(33.2,j1),P(i1,j1),P(i1,j1,-6),P(33.2,j1,-6)],'#6a6258');
  fillP(ctx,[P(33.2,j0),P(i1,j0),P(i1,j1),P(33.2,j1)],SEAS===3?'#e2e4e2':'#b9b3a6');
  ctx.strokeStyle='rgba(80,70,60,.2)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=34;i<i1;i++){const A=P(i,j0),B=P(i,j1);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}ctx.stroke();
  // yellow quay edge line + bollards
  ctx.strokeStyle='#f2c230';ctx.lineWidth=2;ctx.beginPath();{const A=P(33.3,j1-.18),B=P(i1-.1,j1-.18);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}ctx.stroke();
  for(let i=33.8;i<i1;i+=1.3){const p=P(i,j1-.08);ell(ctx,p[0],p[1],2.2,1.2,'#2a2a2e');}
  // platform
  fillP(ctx,[P(33.18,12),P(33.75,12),P(33.75,16.6),P(33.18,16.6)],'#d8d0c0');
  ctx.strokeStyle='#f2c230';ctx.lineWidth=1.5;ctx.beginPath();{const A=P(33.24,12),B=P(33.24,16.6);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}ctx.stroke();
  // highway access
  fillP(ctx,[P(32,11.6),P(33.2,11.6),P(33.2,12.0),P(32,12.0)],'#73777e');
}
function harborObjs(ctx,objs,inView){
  const [cx,cy]=P(35,14);if(!inView(cx,cy,300)) return;
  const lvl=harborLvl(), t=scene.t;
  if(!lvl){ // construction site
    objs.push({k:35+14,f:()=>{ctx.save();ctx.setLineDash([5,4]);ctx.lineDashOffset=-t*10;ctx.strokeStyle=harborAvail()?'#5aa6e8':'rgba(90,166,232,.45)';ctx.lineWidth=2;
      pth(ctx,[P(33.3,11.8),P(36.6,11.8),P(36.6,17),P(33.3,17)]);ctx.stroke();ctx.restore();
      box(ctx,34.2,13,34.9,13.5,0,5,'#6a4026',{hl:false});box(ctx,35.2,14.2,35.8,14.8,0,9,'#2f6fb0',{hl:false});
      const sp=P(33.8,12.4,0);ctx.fillStyle='#1a2a3a';ctx.fillRect(sp[0]-1.2,sp[1]-24,2.4,24);
      fillP(ctx,fq('J',12.35,33.4,34.9,16,25),'#1a2a3a','#7ec8e8');ctx.save();fxf(ctx,'J',12.35,33.4,20.5);ctx.fillStyle='#cfe8ff';ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚓ HARBOUR',24,0);ctx.restore();
      HARBOR.hit=[P(33.3,11.8,30),P(36.6,11.8,30),P(36.6,11.8,0),P(36.6,17,0),P(33.3,17,0),P(33.3,17,30)];}});
    return;
  }
  // warehouse
  objs.push({k:34.8+12.8,f:()=>{const i0=33.95,i1=35.75,j0=11.75,j1=13.85,h=16+lvl*2;
    box(ctx,i0,j0,i1,j1,0,h,'#5a7a96',{top:'#8aa6bc'});
    // corrugated stripes
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();for(let a=i0+.15;a<i1;a+=.2){const A=P(a,j1,2),B=P(a,j1,h-2);ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);}ctx.stroke();
    fillP(ctx,fq('J',j1,i0+.35,i0+1.05,0,11),'#2a3a4a'); fillP(ctx,fq('J',j1,i0+1.2,i1-.15,0,11),'#33485c');
    win(ctx,'I',i1,j0+.3,.4,h-8,5,true,'#1a2a3a');win(ctx,'I',i1,j0+1.2,.4,h-8,5,true,'#1a2a3a');
    fillP(ctx,fq('J',j1-.04,i0+.2,i1-.2,h+1,h+9),'#1a2a3a','#7ec8e8');ctx.save();fxf(ctx,'J',j1-.04,i0+.2,h+5);ctx.fillStyle='#cfe8ff';ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚓ HARBOUR',(i1-i0-.4)*16,0);ctx.restore();
    if(lvl>=3) flag(ctx,...P(i1,j0,h),'#2f6fb0');
    HARBOR.hit=boxHit(33.3,11.6,36.8,17.2,h+20);}});
  // station canopy on the platform
  objs.push({k:33.5+14.3,f:()=>{for(const jj of [12.6,15.9]) box(ctx,33.42,jj-.06,33.54,jj+.06,0,16,'#3a3a40',{hl:false});
    box(ctx,33.2,12.3,33.78,16.3,16,18,'#c8452a',{top:'#e05a3a'});
    const p=P(33.48,PLATFORM_J,18);fillP(ctx,fq('I',33.78,13.6,15.0,18,25),'#1a1a1e','#f5c84c');ctx.save();fxf(ctx,'I',33.78,13.6,21.5);ctx.fillStyle='#ffe27a';ctx.font='900 6px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('RAIL',22.4,0);ctx.restore();}});
  // container stacks
  const CC=['#e8742a','#3aa0d8','#5ac08a','#e8c43a','#c8452a','#6a4a9a'];
  objs.push({k:34.5+15.6,f:()=>{let n=0;for(let a=0;a<2;a++) for(let b=0;b<3;b++){const h=1+((a*3+b+lvl)%3);for(let z=0;z<Math.min(h,1+Math.floor(lvl/2));z++){const i=34.0+a*.62,j=14.55+b*.62;box(ctx,i,j,i+.55,j+.55,z*6,z*6+6,CC[(n++)%CC.length],{});}}}});
  // container crane on the quay edge, boom over the water
  objs.push({k:36.3+16.4,f:()=>{const ci=36.0,cj=16.4,H=44;
    for(const d of [[-.45,-.35],[.45,-.35],[-.45,.45],[.45,.45]]) box(ctx,ci+d[0]-.06,cj+d[1]-.06,ci+d[0]+.06,cj+d[1]+.06,0,H,'#e8a020',{hl:false});
    box(ctx,ci-.55,cj-.45,ci+.55,cj+.55,H,H+5,'#f0b030',{});
    box(ctx,ci-.12,cj-1.2,ci+.12,cj+2.6,H+5,H+8,'#f0b030',{});   // boom along +j over the water
    box(ctx,ci-.3,cj-.4,ci+.3,cj+.2,H+8,H+14,'#d8d0c0',{});      // cab
    const load=S.trade.fleet.some(v=>v.mode==='ship'&&v.state==='load');
    const u=load?(Math.sin(t*.9)*.5+.5):.3, tj=cj+.2+u*2.2, tz=load?H-6-Math.abs(Math.sin(t*.9))*18:H-6;
    const a=P(ci,tj,H+5),b=P(ci,tj,tz+5);ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a[0]-2,a[1]);ctx.lineTo(b[0]-2,b[1]);ctx.moveTo(a[0]+2,a[1]);ctx.lineTo(b[0]+2,b[1]);ctx.stroke();
    if(load) box(ctx,ci-.27,tj-.27,ci+.27,tj+.27,tz-1,tz+5,CC[Math.floor(t/7)%CC.length],{});}});
}
const HB_LAMPS=[[34.3,16.95],[37.0,16.95],[39.7,16.95]], CAMP_LAMPS=[[14.75,1.75],[18.95,1.75]];
function techLamp(ctx,objs,i,j){objs.push({k:i+j,f:()=>{const [x,y]=P(i,j);ell(ctx,x+2,y+1,5,2.5,'rgba(0,0,0,.2)');ctx.fillStyle='#4a4f56';ctx.fillRect(x-1.2,y-30,2.4,30);ctx.fillRect(x-1.2,y-30,7,2);
  ctx.fillStyle=isNight()?'#fff2b0':'#e8e4d0';ctx.fillRect(x+3.5,y-29,4,2.5);}});}
function techDraw(ctx,objs,inView){
  if(campusOpen()) for(const [i,j] of CAMP_LAMPS) techLamp(ctx,objs,i,j);
  if(harborLvl()) for(const [i,j] of HB_LAMPS) techLamp(ctx,objs,i,j);
  if(campusOpen()) for(const b of TECH_BLD){if(b.id==='boatyard') continue;const L=LOTS[b.id];
    const [x,y]=P(L.ci,L.cj); if(!inView(x,y,120)) continue; objs.push({k:L.ci+L.cj,f:()=>drawTechLot(ctx,L)});}
  harborObjs(ctx,objs,inView);
  if(harborOpen()){const L=LOTS.boatyard;const [x,y]=P(L.ci,L.cj);if(inView(x,y,160)) objs.push({k:L.ci+L.cj,f:()=>drawTechLot(ctx,L)});}
  for(const v of S.trade.fleet){const p=vesselPose(v);if(!p) continue;const [x,y]=P(p.i,p.j);if(!inView(x,y,200)) continue;
    objs.push({k:p.i+p.j,f:()=>drawVessel(ctx,v,p)});}
}
function drawTechLot(ctx,L){
  const st=S.buildings[L.id];
  if(!st.lvl){techConstruction(ctx,L);return;}
  drawLot(ctx,L);
}
function techConstruction(ctx,L){
  const b=BMAP[L.id],unl=bldUnlocked(L.id),can=unl&&S.coins+1e-9>=bulkCost(b.cost,b.scale,0,1),e=(L.bs0+.3)/2,{ci,cj}=L;
  ctx.save();ctx.setLineDash([5,4]);ctx.lineDashOffset=-scene.t*10*(can?1:0);ctx.strokeStyle=can?'#5ac08a':unl?'rgba(90,192,138,.6)':'rgba(120,120,110,.45)';ctx.lineWidth=2;
  pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.stroke();ctx.restore();
  if(can){ctx.fillStyle=`rgba(90,192,138,${.1+.07*Math.sin(scene.t*4)})`;pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.fill();}
  if(unl){box(ctx,ci-.5,cj-.3,ci+.1,cj+.1,0,4,'#6a4026',{hl:false});box(ctx,ci+.15,cj+.15,ci+.5,cj+.5,0,7,'#5a6a7a',{hl:false});}
  L.hit=[P(ci-e,cj-e,26),P(ci+e,cj-e,26),P(ci+e,cj-e,0),P(ci+e,cj+e,0),P(ci-e,cj+e,0),P(ci-e,cj+e,26)];L.top=P(ci,cj,14);L.H=14;
}
function techGround(ctx){drawCampusGround(ctx);drawHarborGround(ctx);}
function techOverlays(ctx){
  const showTags=scene.cam.z>=scene.cam.fitZ*.8;
  const tags=[];   // unbuilt-lot price/lock tags: collected first, then nudged apart so neighbouring lots never stack their labels
  if(campusOpen()) for(const b of TECH_BLD){const L=LOTS[b.id];if(!L.top) continue;if(b.id==='boatyard'&&!harborOpen()) continue;const st=S.buildings[b.id];
    let [sx,sy]=w2s(L.top[0],L.top[1]);if(sx<-60||sx>scene.w+60||sy<-40||sy>scene.h+40) continue;
    if(!st.lvl){const unl=bldUnlocked(b.id),c=bulkCost(b.cost,b.scale,0,1);
      const txt=unl?`${b.icon} ${b.name} · ${fmt(c)}`:`🔒 ${b.icon} ${b.id==='lab'?'Needs Paper Mill':'Research '+RNMAP[TECH_UNLOCK[b.id]].name}`;
      ctx.font='800 10px system-ui,sans-serif';tags.push({x:sx,y:sy-4,w:ctx.measureText(txt).width+18,txt,bg:unl?(S.coins>=c?'rgba(40,120,70,.88)':'rgba(30,70,90,.78)'):'rgba(43,27,14,.55)'});}
    else if(showTags){const ms=msCount(st.lvl);pill(ctx,sx,sy-2,`${b.icon} Lv ${st.lvl}${ms?' '+'★'.repeat(Math.min(ms,6)):''}${typeof specTag==='function'?specTag(b.id):''}`,{fs:10,bg:'rgba(30,60,80,.8)',fg:ms?'#ffe27a':'#fff6e0'});
      const bs=bstat[b.id];if(st.on&&bs&&bs.lim&&(isFinite(bs.fs)?bs.fs:bs.f)<.6){pill(ctx,sx,sy+16,'⚠ needs '+(bs.lim?RMAP[bs.lim].name:'input'),{fs:9.5,bg:'#c4463d'});}}}
  tags.sort((a,b)=>a.y-b.y);
  for(let k=1;k<tags.length;k++) for(let m=0;m<k;m++){const a=tags[m],t=tags[k];if(Math.abs(a.x-t.x)<(a.w+t.w)/2+4&&Math.abs(a.y-t.y)<21) t.y=a.y+21;}
  for(const t of tags) pill(ctx,t.x,t.y,t.txt,{fs:10,bg:t.bg});
  if(harborAvail()&&!harborLvl()){const p=P(35,14.4,30);const [sx,sy]=w2s(p[0],p[1]);
    pill(ctx,sx,sy,'⚓ Build Harbour · '+fmt(harborCost()),{fs:11,bg:S.coins>=harborCost()?'rgba(40,120,70,.88)':'rgba(20,50,90,.8)'});}
  if(harborLvl()&&showTags){const p=P(33.5,PLATFORM_J,34);const [sx,sy]=w2s(p[0],p[1]);
    // departures board
    const rows=S.trade.fleet.slice(0,3).map(v=>`${v.mode==='ship'?'🚢':'🚂'} ${CMAP[v.city].name} ${v.state==='load'?Math.round(v.got/v.cap*100)+'%':v.state==='out'?'→ '+fmtTime(v.trip/2-v.t):'← '+fmtTime(v.trip-v.t)}`);
    const txt=rows.length?rows.join('  ·  '):'⚓ Harbour · Lv '+harborLvl()+' — tap to trade';
    pill(ctx,sx,sy,txt,{fs:10,bg:'rgba(20,30,50,.85)',fg:'#ffe27a'});}
}
function techLights(out){
  if(labBuilt()){const L=LOTS.lab,[x,y]=P(L.ci,L.cj,18);out.push({x,y,rx:40,ry:22,c:'cool',a:.55});}
  if(harborLvl()){for(const [i,j] of [[34.8,14],[33.5,14.3]]){const [x,y]=P(i,j,6);out.push({x,y,rx:46,ry:22,c:'warm',a:.45});}}
  const lamps=(campusOpen()?CAMP_LAMPS:[]).concat(harborLvl()?HB_LAMPS:[]);
  for(const [i,j] of lamps){const [x,y]=P(i,j);out.push({x:x+5,y:y+2,rx:50,ry:25,c:'warm',a:.85});out.push({x:x+6,y:y-27,rx:15,ry:15,c:'warm',a:.9,core:1});}
}
function harborPoof(){const p=P(35,14.3,10);for(let k=0;k<30;k++) emitP(p[0]+(Math.random()-.5)*100,p[1]+(Math.random()-.5)*40,'poof');}

/* vessels: ships berth on the river, trains stand at the platform; then they leave the map */
function vesselPose(v){
  const half=v.trip/2, slot=(S.trade.fleet.filter(x=>x.mode===v.mode&&x.state==='load').indexOf(v));
  let u=0; if(v.state==='out') u=Math.min(1,v.t/Math.min(18,half)); else if(v.state==='back') u=Math.max(0,1-(v.t-(v.trip-Math.min(18,half)))/Math.min(18,half));
  if(v.state!=='load'&&u>=1) return null;
  const e=u*u;
  // ships berth along the quay; under way they steer out to the far fairway so they never sail through a berthed ship
  if(v.mode==='ship'){const lane=v.state==='load'?0:Math.min(1,u*4);const s0=v.state==='load'?Math.max(0,slot):0;
    return {i:BERTH[0]+s0*5.4+e*32,j:BERTH[1]-.35+lane*1.15,yaw:0,a:1-Math.max(0,e-.6)/.4};}
  return {i:RAIL_I,j:PLATFORM_J-Math.max(0,slot)*0+e*44,yaw:Math.PI/2,a:1-Math.max(0,e-.6)/.4};
}
function drawVessel(ctx,v,p){
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,p.a));
  const CC=['#e8742a','#3aa0d8','#5ac08a','#e8c43a','#c8452a'];
  if(v.mode==='ship'){
    const V=VF(p.i,p.j,p.yaw,-3);
    // wake
    const w0=VL(V,-2.6,0,3),w1=VL(V,-4.5,0,3);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w0[0],w0[1]);ctx.lineTo(w1[0],w1[1]);ctx.stroke();
    vbox(ctx,V,-2.3,2.1,-.58,.58,0,3,'#b8402a',{top:false});
    vbox(ctx,V,-2.3,2.1,-.58,.58,3,9,'#2f4a6a',{topc:'#a8a090'});
    // bow
    fillP(ctx,[VL(V,2.1,-.58,9+V.dz),VL(V,2.95,0,10+V.dz),VL(V,2.1,.58,9+V.dz)],'#a8a090','rgba(30,20,12,.4)',.7);
    fillP(ctx,[VL(V,2.1,.58,V.dz),VL(V,2.95,0,V.dz+1),VL(V,2.95,0,10+V.dz),VL(V,2.1,.58,9+V.dz)],'#26405c','rgba(30,20,12,.4)',.7);
    // cargo: containers proportional to the load (or full when sailing)
    const f=v.state==='load'?v.got/v.cap:1, n=Math.round(f*8);
    for(let k=0;k<n;k++){const a=-1.25+(k%4)*.78,c=k<4?-.24:.24;vbox(ctx,V,a,a+.7,c-.22,c+.22,9,14.5,v.good==='boats'?'#e8e4dc':CC[(k+v.id)%CC.length],{});}
    // bridge + funnel at the stern
    vbox(ctx,V,-2.2,-1.55,-.5,.5,9,24,'#f0ece4',{deco:(fc,b)=>{if(fc==='F'||fc==='R'||fc==='L') vquad(ctx,V,fc,b,fc==='F'?-.4:-2.1,fc==='F'?.4:-1.65,19,22,'#2a3a4a');}});
    vbox(ctx,V,-2.05,-1.75,-.14,.14,24,31,'#c8452a',{});
  } else {
    const V=VF(p.i,p.j,p.yaw,0), parts=[];
    // locomotive (front = +j, away from platform) and two wagons behind
    parts.push({d:vdepth(V,.6,0),f:()=>{vbox(ctx,V,-.2,1.6,-.36,.36,3,22,'#2f6fb0',{deco:(fc,b)=>{if(fc==='F') vquad(ctx,V,'F',b,-.26,.26,13,20,'#9fd0ec','rgba(30,40,50,.6)');if(fc==='R'||fc==='L') vquad(ctx,V,fc,b,.9,1.45,13,19,'#9fd0ec');}});
      vbox(ctx,V,-.2,1.6,-.38,.38,22,24,'#e8e4dc',{});}});
    for(let w=0;w<2;w++){const a0=-1.85-w*1.9;parts.push({d:vdepth(V,a0+.8,0),f:()=>{vbox(ctx,V,a0,a0+1.7,-.36,.36,3,6,'#3a3a40',{});
      const f=v.state==='load'?v.got/v.cap:1;vbox(ctx,V,a0+.08,a0+1.62,-.32,.32,6,6+12*Math.max(.15,f),RCOL[v.good]||'#8b5a2b',{});}});}
    parts.sort((a,b)=>a.d-b.d).forEach(q=>q.f());
  }
  ctx.restore();
}

/* ---------- stylised world trade map (canvas) ---------- */
function drawTradeMap(cv){
  const dpr=Math.min(2,devicePixelRatio||1), W=cv.clientWidth||360, H=Math.round(Math.min(W*.5,215));
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.height=H+'px';}
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  // ocean
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7eb8e0');g.addColorStop(1,'#3a7aaa');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // continents (stylised blobs)
  // smooth blobs through control points (stylised, not to scale)
  const land=(pts,col,water)=>{ctx.beginPath();const n=pts.length,q=i=>pts[(i+n)%n];
    for(let i=0;i<=n;i++){const p=q(i),r=q(i+1),mx=(p[0]+r[0])/2*W,my=(p[1]+r[1])/2*H;if(!i) ctx.moveTo(mx,my); else ctx.quadraticCurveTo(p[0]*W,p[1]*H,mx,my);}
    ctx.closePath();ctx.fillStyle=col;ctx.fill();if(!water){ctx.strokeStyle='rgba(40,70,40,.3)';ctx.lineWidth=1;ctx.stroke();}};
  const sea=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x*W,y*H,rx*W,ry*H,0,0,TAU);ctx.fillStyle='#5f9fcc';ctx.fill();};
  land([[.06,.12],[.24,.07],[.34,.17],[.3,.3],[.25,.4],[.18,.5],[.12,.42],[.05,.28]],'#8cbf68');                    // N America
  land([[.21,.55],[.32,.56],[.34,.7],[.27,.93],[.22,.8],[.18,.62]],'#9aca6e');                                        // S America
  land([[.36,.2],[.42,.09],[.55,.05],[.72,.05],[.86,.08],[.88,.2],[.86,.34],[.8,.48],[.79,.62],[.73,.7],[.67,.56],[.6,.47],[.52,.45],[.44,.42],[.38,.32]],'#8cbf68'); // Eurasia
  land([[.43,.5],[.6,.5],[.68,.62],[.64,.8],[.56,.94],[.5,.86],[.46,.66],[.41,.58]],'#a2cc72');                       // Africa
  land([[.9,.25],[.945,.28],[.95,.4],[.915,.46],[.895,.36]],'#7aaa58');                                               // Japan
  sea(.68,.29,.045,.055); sea(.54,.465,.075,.028);                                                                    // Black Sea, Med
  // home
  const hx=HOME.x*W,hy=HOME.y*H;
  ctx.fillStyle='#c45a2a';ctx.beginPath();ctx.arc(hx,hy,5,0,TAU);ctx.fill();
  ctx.fillStyle='#2a2a2e';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('🏠 '+HOME.name,hx+7,hy+4);
  // routes + cities
  for(const c of CITIES){
    const x=c.x*W,y=c.y*H,open=routeOpen(c.id);
    // great-circle-ish arc
    ctx.beginPath();ctx.moveTo(hx,hy);const mx=(hx+x)/2,my=(hy+y)/2-(open?18:10);
    ctx.quadraticCurveTo(mx,my,x,y);
    ctx.strokeStyle=open?(c.mode==='ship'?'#1f4a7a':'#6a3a10'):'rgba(40,40,40,.25)';
    ctx.lineWidth=open?2.2:1.2;ctx.setLineDash(open?[]:[4,4]);ctx.stroke();ctx.setLineDash([]);
    // animated vessel on open routes with a trip in progress
    const trip=S.trade.fleet.find(v=>v.city===c.id&&v.state!=='load');
    if(trip){const u=trip.state==='out'?Math.min(1,trip.t/(trip.trip/2)):Math.max(0,1-(trip.t-trip.trip/2)/(trip.trip/2));
      const t=u,px=(1-t)*(1-t)*hx+2*(1-t)*t*mx+t*t*x,py=(1-t)*(1-t)*hy+2*(1-t)*t*my+t*t*y;
      ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(trip.mode==='ship'?'🚢':'🚂',px,py+4);}
    // city pin
    ctx.fillStyle=open?'#fff': '#d8d0c0';ctx.beginPath();ctx.arc(x,y,open?6:4.5,0,TAU);ctx.fill();
    ctx.strokeStyle=open?'#1f4a7a':'#888';ctx.lineWidth=1.5;ctx.stroke();
    ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(c.flag,x,y-10);
    ctx.fillStyle='#1a1a1e';ctx.font='800 9.5px system-ui';ctx.fillText(c.name,x,y+16);
    if(S.trade.spike&&S.trade.spike.city===c.id&&S.trade.spike.ends>S.time){
      ctx.fillStyle='#e8473c';ctx.font='900 9px system-ui';ctx.fillText('📈 SPIKE',x,y+26);}
  }
}
