
/* ---------------- ground (cached in chunks) ---------------- */
const CHUNK=512;
const GRASS=['#8cc761','#88c35d','#90cb65','#85c05a'], FOREST_FLOOR=['#74b052','#70ab4e','#78b455','#6ca84b'];
function drawGround(ctx,x0,y0,x1,y1){
  const GR=GRASS_S[SEAS]||GRASS, FF=FLOOR_S[SEAS]||FOREST_FLOOR;
  ctx.fillStyle=SEAS===3?'#e6edf1':SEAS===2?'#b0b462':'#89c45e';ctx.fillRect(x0,y0,x1-x0,y1-y0);
  const u0=Math.floor(y0/HH)-2,u1=Math.ceil(y1/HH)+1,v0=Math.floor(x0/HW)-2,v1=Math.ceil(x1/HW)+2;
  for(let u=u0;u<=u1;u++) for(let v=v0;v<=v1;v++){
    if((u+v)&1) continue; const i=(u+v)/2,j=(u-v)/2;
    const z=zoneAt(i+.5,j+.5); if(z!=='grass') continue;
    const h=hash2(i,j); const pal=isForestPt(i+.5,j+.5)?FF:GR;
    let c=pal[Math.floor(h*4)]; if((i+j)&1) c=shade(c,1.03);
    fillP(ctx,[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],c);
    if(SEAS===2&&h>.4){const [x,y]=P(i+.2+h*.6,j+.3+hash2(j,i)*.5);ell(ctx,x,y,2.2,1.2,AUT[Math.floor(h*10)%4][2]);ell(ctx,x+6,y+2,1.8,1,AUT[Math.floor(h*7)%4][1]);}
    if(SEAS===0&&h>.82){const [x,y]=P(i+.3+h*.4,j+.4);ell(ctx,x,y,1.6,1.2,'#ffb8cc');ell(ctx,x+4,y+1.5,1.4,1,'#fff4f8');}
    if(h>0.55&&SEAS!==3){const [x,y]=P(i+.3+h*.4,j+.5);ctx.strokeStyle=SEAS===2?'rgba(120,100,30,.35)':'rgba(50,100,30,.35)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-3,y-3);ctx.lineTo(x,y+1);ctx.lineTo(x+3,y-4);ctx.moveTo(x+5,y-2);ctx.lineTo(x+6,y+1);ctx.stroke();}
  }
  // faint tile grid over grass
  ctx.strokeStyle='rgba(40,80,20,.07)';ctx.lineWidth=1;ctx.beginPath();
  const [gi0,gj0]=toGrid(x0,y0);const [gi1]=toGrid(x1,y1);
  const iMin=Math.floor(Math.min(toGrid(x0,y0)[0],toGrid(x0,y1)[0]))-1,iMax=Math.ceil(Math.max(toGrid(x1,y0)[0],toGrid(x1,y1)[0]))+1;
  const jMin=Math.floor(Math.min(toGrid(x1,y0)[1],toGrid(x1,y1)[1]))-1,jMax=Math.ceil(Math.max(toGrid(x0,y0)[1],toGrid(x0,y1)[1]))+1;
  for(let i=iMin;i<=iMax;i++){const a=P(i,jMin),b=P(i,jMax);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
  for(let j=jMin;j<=jMax;j++){const a=P(iMin,j),b=P(iMax,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
  ctx.stroke();
  // factory yard: tile-aligned packed-earth platform (raised lip), paved lane
  if(!(x1<-13*HW||x0>13*HW||y1<3*HH||y0>59*HH)){
    const tiles=[];
    for(let u=Math.max(u0,3);u<=Math.min(u1,58);u++) for(let v=Math.max(v0,-13);v<=Math.min(v1,13);v++){
      if((u+v)&1) continue; const i=(u+v)/2,j=(u-v)/2; if(yardTile(i,j)) tiles.push([i,j]);
    }
    // lip (side faces) first, below front edges
    for(const [i,j] of tiles){
      if(!yardTile(i+1,j)) fillP(ctx,[P(i+1,j),P(i+1,j+1),P(i+1,j+1,-5),P(i+1,j,-5)],SEAS===3?'#b4bfc8':'#a98a5c');
      if(!yardTile(i,j+1)) fillP(ctx,[P(i,j+1),P(i+1,j+1),P(i+1,j+1,-5),P(i,j+1,-5)],SEAS===3?'#cdd5db':'#c2a274');
    }
    for(const [i,j] of tiles){
      const h=hash2(i+50,j+50), lane=laneTile(i,j);
      let c=lane?(((i+j)&1)?'#d3cdbf':'#cbc4b4'):(((i+j)&1)?'#dcc598':'#d6be8f');
      if(!lane&&h>.86) c='#d1b886';
      if(SEAS===3) c=lane?(((i+j)&1)?'#dfe2e4':'#d8dcdf'):(h>.55?'#eef2f5':((i+j)&1)?'#e4e9ed':'#dde3e8');
      fillP(ctx,[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],c);
      if(lane){ // paver joints
        ctx.strokeStyle='rgba(120,110,95,.22)';ctx.lineWidth=1;ctx.beginPath();
        let p=P(i+.5,j),q=P(i+.5,j+1);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);p=P(i,j+.5);q=P(i+1,j+.5);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
      } else if(h>.7){const [x,y]=P(i+h*.8,j+.3+h*.4);ell(ctx,x,y,1.8,1.1,'rgba(120,90,50,.35)');ell(ctx,x+5,y+2,1.1,.7,'rgba(120,90,50,.3)');}
    }
    // tile grid
    ctx.strokeStyle='rgba(120,85,40,.12)';ctx.lineWidth=1;ctx.beginPath();
    for(const [i,j] of tiles){const a=P(i,j),b=P(i+1,j),c=P(i,j+1);ctx.moveTo(c[0],c[1]);ctx.lineTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.stroke();
    // lane curbs + yard rim highlight
    ctx.lineCap='round';
    for(const [i,j] of tiles){
      const lane=laneTile(i,j);
      const E=[[i+1,j,P(i+1,j),P(i+1,j+1)],[i,j+1,P(i,j+1),P(i+1,j+1)],[i-1,j,P(i,j),P(i,j+1)],[i,j-1,P(i,j),P(i+1,j)]];
      for(const [ni,nj,a,b] of E){
        if(!yardTile(ni,nj)){ctx.strokeStyle='rgba(255,245,220,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
        else if(lane&&!laneTile(ni,nj)){ctx.strokeStyle='#9d968a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a[0],a[1]+1);ctx.lineTo(b[0],b[1]+1);ctx.stroke();ctx.strokeStyle='#ece8de';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
      }
    }
    ctx.lineCap='butt';
    // lane center dashes (walkway markings)
    ctx.fillStyle='rgba(255,255,255,.72)';for(let u=13;u<56;u+=2){const a=P(u/2,u/2);if(a[1]<y0-20||a[1]>y1+20)continue;ctx.fillRect(a[0]-2,a[1]+4,4,13);}
  }
  // concrete pads for every lot + yard + dock
  drawPremGround(ctx,x0,y0,x1,y1);
  if(typeof techGround==='function') techGround(ctx);
  if(typeof forestGround==='function') forestGround(ctx);
  for(const L of [...Object.values(LOTS),YARD,DOCK]){
    if(L.prem||L.tech) continue;
    const {ci,cj}=L; const e=2.15;
    const pts=[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)];
    const bb=[pts[3][0],pts[0][1],pts[1][0],pts[2][1]]; if(bb[2]<x0-10||bb[0]>x1+10||bb[3]<y0-10||bb[1]>y1+10) continue;
    fillP(ctx,pts.map(p=>[p[0],p[1]+4]),'#a59a86');
    fillP(ctx,[pts[3],pts[2],[pts[2][0],pts[2][1]+4],[pts[3][0],pts[3][1]+4]],'#b8ad98');
    fillP(ctx,[pts[2],pts[1],[pts[1][0],pts[1][1]+4],[pts[2][0],pts[2][1]+4]],'#9c917d');
    fillP(ctx,pts,L.id==='yard'?'#d2b98d':'#e4ddcd');
    ctx.strokeStyle=L.id==='yard'?'rgba(120,85,40,.18)':'rgba(110,100,85,.22)';ctx.lineWidth=1;ctx.beginPath();
    for(let k=1;k<4;k++){const t=-e+k*(2*e/4);let a=P(ci+t,cj-e),b=P(ci+t,cj+e);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);a=P(ci-e,cj+t);b=P(ci+e,cj+t);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.moveTo(pts[3][0],pts[3][1]);ctx.lineTo(pts[0][0],pts[0][1]);ctx.lineTo(pts[1][0],pts[1][1]);ctx.stroke();
  }
  // dirt log road
  fillP(ctx,[P(-40,DIRT_J-1.05),P(6.4,DIRT_J-1.05),P(6.4,DIRT_J+1.05),P(-40,DIRT_J+1.05)],'#c49a66');
  ctx.strokeStyle='rgba(120,80,40,.35)';ctx.lineWidth=3;ctx.beginPath();
  for(const dj of [-.42,.42]){const a=P(-40,DIRT_J+dj),b=P(5.8,DIRT_J+dj);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  ctx.strokeStyle='rgba(90,130,50,.5)';ctx.lineWidth=1.5;ctx.beginPath();
  for(const dj of [-1.05,1.05]){const a=P(-40,DIRT_J+dj),b=P(6.4,DIRT_J+dj);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  // asphalt road + dock apron
  fillP(ctx,[P(28.6,18.6),P(30,18.6),P(30,23.4),P(28.6,23.4)],'#73777e');
  fillP(ctx,[P(30,-70),P(32,-70),P(32,100),P(30,100)],'#62666d');
  ctx.strokeStyle='#f0ede4';ctx.lineWidth=2;ctx.beginPath();
  for(const ii of [30.1,31.9]){const a=P(ii,-70),b=P(ii,100);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  ctx.strokeStyle='#f2c230';ctx.lineWidth=2.4;ctx.beginPath();
  for(let j=-70;j<100;j+=1.2){const a=P(31,j),b=P(31,j+.6);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();
  for(let j=19.2;j<23;j+=.55){const a=P(29.05,j),b=P(29.75,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  // decorations
  for(const d of scene.deco){
    const [x,y]=P(d.i,d.j); if(x<x0-20||x>x1+20||y<y0-20||y>y1+20) continue;
    if(d.t==='rock'){ell(ctx,x+2,y+2,6*d.s,3*d.s,'rgba(30,40,10,.2)');ell(ctx,x,y,5.5*d.s,3.6*d.s,'#9a9890');ell(ctx,x-1.2*d.s,y-1.2*d.s,3.4*d.s,2*d.s,'#c4c2ba');}
    else if(d.t==='bush'){const B=SEAS===3?['#5f7a5a','#566f52','#f4f8fa','#ffffff']:SEAS===2?['#b0702c','#9c5e24','#d08a36','#e8b050']:['#4f9a3a','#468f34','#5aa843','#7cc45e'];
      ell(ctx,x+3,y+2,10*d.s,4.5*d.s,'rgba(30,50,10,.22)');ell(ctx,x-4*d.s,y-3*d.s,6*d.s,5*d.s,B[0]);ell(ctx,x+4*d.s,y-3*d.s,6*d.s,5*d.s,B[1]);ell(ctx,x,y-6*d.s,6.5*d.s,5.5*d.s,B[2]);ell(ctx,x-2*d.s,y-8*d.s,3*d.s,2.4*d.s,B[3]);
      if(SEAS===0){ell(ctx,x-3*d.s,y-7*d.s,1.4,1.2,'#ffc2d6');ell(ctx,x+3*d.s,y-5*d.s,1.4,1.2,'#fff');ell(ctx,x+1*d.s,y-9*d.s,1.4,1.2,'#ffc2d6');}}
    else if(d.t==='flowers'){if(SEAS===3) continue; for(let k=0;k<4;k++){const fx=x+(hash2(k,d.i*9)-.5)*18,fy=y+(hash2(d.j*9,k)-.5)*8;ell(ctx,fx,fy-1,1.8,1.4,d.c);ell(ctx,fx,fy-1,.7,.6,'#e8a020');}}
  }
  for(const s of scene.stumps||[]){const [x,y]=P(s.i,s.j); if(x<x0-20||x>x1+20||y<y0-20||y>y1+20) continue; ell(ctx,x+2,y+1.5,6,2.8,'rgba(30,40,10,.22)');ctx.fillStyle='#7a5230';ctx.fillRect(x-4,y-5,8,5);ell(ctx,x,y,4,2,'#7a5230');ell(ctx,x,y-5,4,2,'#e2be86');ell(ctx,x,y-5,1.6,.8,'#c99a5e');}
  // tire tracks in the harvest clearing
  ctx.strokeStyle='rgba(110,80,40,.18)';ctx.lineWidth=3;ctx.beginPath();for(const di of [-1.55,-.85,.65,1.35]){const a=P(di,12),b=P(di,18.2);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  // static trees
  const tier=S.tree;
  for(const t of scene.staticTrees){const [x,y]=P(t.i,t.j); if(x<x0-40||x>x1+40||y<y0-10||y>y1+90) continue; treeShadow(ctx,x,y,t.s);}
  for(const t of scene.staticTrees){const [x,y]=P(t.i,t.j); if(x<x0-40||x>x1+40||y<y0-10||y>y1+90) continue; drawTree(ctx,x,y,t,tier);}
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect) ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function chunkScale(){const w=scene.cam.z*scene.dpr;const L=[.5,.75,1,1.25,1.5,2,2.5];for(const s of L) if(w<=s*1.08) return s;return 2.5;}
function getChunk(cx,cy,cs,allowRender){
  const key=cx+','+cy+','+cs; let c=scene.chunks.get(key);
  if(c){scene.chunks.delete(key);scene.chunks.set(key,c);return c;}
  if(!allowRender) return null;
  const pad=2, size=Math.ceil((CHUNK+pad*2)*cs);
  const cv=document.createElement('canvas'); cv.width=size; cv.height=size;
  const g=cv.getContext('2d'); g.setTransform(cs,0,0,cs,(-cx*CHUNK+pad)*cs,(-cy*CHUNK+pad)*cs);
  drawGround(g,cx*CHUNK-pad,cy*CHUNK-pad,(cx+1)*CHUNK+pad,(cy+1)*CHUNK+pad);
  c={cv,pad,cs}; scene.chunks.set(key,c);
  while(scene.chunks.size>42){const k=scene.chunks.keys().next().value;scene.chunks.delete(k);}
  return c;
}
function drawChunks(ctx,vx0,vy0,vx1,vy1,force){
  if(scene.chunkTier!==S.tree*10+SEAS){scene.chunks.clear();scene.chunkTier=S.tree*10+SEAS;force=true;}
  const cs=chunkScale(); let budget=force?99:2;
  for(let cy=Math.floor(vy0/CHUNK);cy<=Math.floor(vy1/CHUNK);cy++) for(let cx=Math.floor(vx0/CHUNK);cx<=Math.floor(vx1/CHUNK);cx++){
    let c=getChunk(cx,cy,cs,false);
    if(!c){
      // fallback to any cached resolution of this chunk while the sharp one renders
      let fb=null; for(const s of [2.5,2,1.5,1.25,1,.75,.5]){fb=getChunk(cx,cy,s,false); if(fb) break;}
      if(budget>0||!fb){c=getChunk(cx,cy,cs,true);budget--;} else c=fb;
    }
    ctx.drawImage(c.cv,cx*CHUNK-c.pad,cy*CHUNK-c.pad,c.cv.width/c.cs,c.cv.height/c.cs);
  }
}

/* ---------------- trees ---------------- */
const TREE_PAL=[
  {k:'cone',c:['#2f6e3c','#3f8a47','#5eaa58']},
  {k:'round',c:['#3a7a2c','#4f9c38','#79c250']},
  {k:'round',c:['#b0442a','#d8692c','#f3a440']},
  {k:'round',c:['#6a2a22','#8e3d2a','#b8603e']},
  {k:'cone',c:['#20242f','#30374a','#56607e']},
];
const CHERRY={k:'round',cherry:true,c:['#c86a8e','#e891b2','#ffc4d8']};
function drawSapling(ctx,x,y,t,pal,tier){
  const g=t.grow, TC=treeColors(pal,t,tier), h=7+g*30, r=2.6+g*10, snowy=SEAS===3;
  ell(ctx,x,y+.4,4.6+g*4,2+g*1.6,'#6a4a2a'); ell(ctx,x-.6,y-.2,3+g*3,1.2+g*1,'#7d5a34');
  ctx.fillStyle='#c8a26a';ctx.fillRect(x+2.6,y-h*.9,1,h*.9);ctx.strokeStyle='rgba(240,230,200,.8)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x+2.6,y-h*.55);ctx.lineTo(x+.4,y-h*.55);ctx.stroke();
  ctx.fillStyle='#7a4a26';ctx.fillRect(x-.6,y-h,1.3,h);
  if(pal.k==='cone'){for(let k=0;k<2;k++){const top=y-h-2-r*.2+k*r*.75,w=r*(.55+k*.25);ctx.fillStyle=k?TC[1]:TC[2];ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x-w,top+r*1.05);ctx.lineTo(x+w,top+r*1.05);ctx.closePath();ctx.fill();
      ctx.fillStyle=TC[0];ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+w,top+r*1.05);ctx.lineTo(x+1,top+r*1.05);ctx.closePath();ctx.fill();}
    if(snowy){ctx.fillStyle='#f4f8fb';ctx.beginPath();ctx.moveTo(x,y-h-2-r*.2);ctx.lineTo(x-r*.35,y-h+r*.3);ctx.lineTo(x+r*.35,y-h+r*.3);ctx.closePath();ctx.fill();}}
  else{ell(ctx,x+.8,y-h+.6,r*.85,r*.7,TC[0]);ell(ctx,x-.3,y-h,r*.75,r*.62,TC[1]);ell(ctx,x-r*.3,y-h-r*.25,r*.35,r*.3,TC[2]);if(snowy) ell(ctx,x-.3,y-h-r*.45,r*.55,r*.22,'#f4f8fb');}
}
function treeShadow(ctx,x,y,s){ctx.fillStyle='rgba(30,50,10,.2)';ctx.beginPath();ctx.ellipse(x+5*s,y+1,13*s,6*s,0,0,TAU);ctx.fill();}
function drawTree(ctx,x,y,t,tier){
  let pal=TREE_PAL[tier]||TREE_PAL[0]; if(SEAS===0&&t.var<.17) pal=CHERRY; const s=t.s*(t.grow===undefined?1:t.grow);
  if(t.stump>0){ // stump
    ell(ctx,x,y,4.5,2.4,'#7a4a24'); ctx.fillStyle='#8a5a2c';ctx.fillRect(x-4.5,y-4,9,4); ell(ctx,x,y-4,4.5,2.4,'#e0b67a'); ell(ctx,x,y-4,2,1,'#b8864a'); return;
  }
  if(t.grow!==undefined&&t.grow<.4&&!t.down&&!(t.fall>0)){drawSapling(ctx,x,y,t,pal,tier);return;}   // v2.7: freshly planted sapling
  const fd=t.fdir||(t.var>.5?1:-1);
  if(t.down||t.fall>0){ell(ctx,x,y,4.2*t.s,2.2*t.s,'#7a4a24');ctx.fillStyle='#8a5a2c';ctx.fillRect(x-4.2*t.s,y-3.5*t.s,8.4*t.s,3.5*t.s);ell(ctx,x,y-3.5*t.s,4.2*t.s,2.2*t.s,'#e0b67a');}
  ctx.save(); ctx.translate(x,y);
  if(t.down){ctx.translate(fd*3,-2);ctx.scale(1,.58);ctx.rotate(fd*1.5);}
  else if(t.fall>0){const f=t.fall,a=Math.min(1.5,f*f*1.5);ctx.translate(0,-3.5*t.s*f);ctx.scale(1,1-.42*f*f);ctx.rotate(a*fd);}
  if(t.shake>0){ctx.rotate(Math.sin(t.shake*40)*0.06*t.shake);}
  else if(t.dyn&&scene.wxv&&scene.wxv.wind>.05){ctx.rotate(Math.sin(scene.t*2.3+t.var*9)*.045*scene.wxv.wind);}
  ctx.scale(s,s);
  if(t.down){ctx.fillStyle='#7a4a26';ctx.fillRect(-2.6,-40,5.2,40);ctx.fillStyle='#5e3618';ctx.fillRect(.8,-40,1.8,40);ctx.fillStyle='#e0b67a';ctx.fillRect(-2.6,-1,5.2,1.6);ctx.globalAlpha=Math.max(0,1-(t.buck||0)*1.1);if(ctx.globalAlpha<=0.01){ctx.restore();return;}}
  const v=t.var; const TC=treeColors(pal,t,tier); const c0=TC[0],c1=TC[1],c2=TC[2]; const snowy=SEAS===3;
  ctx.fillStyle='#7a4a26';ctx.fillRect(-2.2,-10,4.4,10);ctx.fillStyle='#5e3618';ctx.fillRect(.6,-10,1.6,10);
  if(pal.k==='cone'){
    const H=[[-44,13],[-32,16],[-20,18.5]];
    for(let k=0;k<3;k++){const top=H[k][0]-(k?0:4),w=H[k][1]*(0.95+v*.1),base=top+(k===0?20:18)+(k===2?4:0);
      ctx.fillStyle=c1;ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(-w,base);ctx.quadraticCurveTo(0,base+4,w,base);ctx.closePath();ctx.fill();
      ctx.fillStyle=c0;ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(w,base);ctx.quadraticCurveTo(w*.5,base+3,1,base+3.5);ctx.closePath();ctx.fill();
      ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(0,top+2);ctx.lineTo(-w*.55,base-4);ctx.lineTo(-w*.2,base-3);ctx.closePath();ctx.fill();
      if(snowy){const sb=top+(base-top)*.5;ctx.fillStyle='#f4f8fb';ctx.beginPath();ctx.moveTo(0,top-.5);ctx.lineTo(-w*.52,sb);ctx.quadraticCurveTo(-w*.25,sb-2.5,0,sb+1);ctx.quadraticCurveTo(w*.25,sb-1,w*.5,sb+.5);ctx.closePath();ctx.fill();
        ctx.fillStyle='#d8e3ea';ctx.beginPath();ctx.moveTo(0,top-.5);ctx.lineTo(w*.5,sb+.5);ctx.quadraticCurveTo(w*.25,sb-1,0,sb+1);ctx.closePath();ctx.fill();}
      else if(SEAS===0&&v>.5){ctx.fillStyle='#a6dc6a';ctx.fillRect(-w*.5,base-3,2.4,2);ctx.fillRect(w*.3,base-2.5,2.4,2);}
    }
  } else {
    const blobs=[[0,-24,13],[-8,-18,9],[8,-18,9.5],[-5,-31,8.5],[5,-30,8]];
    for(const [bx,by,r] of blobs){ell(ctx,bx+1.5,by+1.5,r,r*.92,c0);}
    for(const [bx,by,r] of blobs){ell(ctx,bx,by,r*.9,r*.82,c1);}
    ell(ctx,-4,-30,6,5,c2); ell(ctx,-9,-21,4,3.4,c2); ell(ctx,3,-35,3.5,2.6,shade(c2,1.15));
    if(snowy){ell(ctx,-4,-33,7.5,3.4,'#f4f8fb');ell(ctx,5,-33,5.5,2.6,'#eef3f7');ell(ctx,-9,-24,4.5,2.2,'#f4f8fb');ell(ctx,8,-23,4.5,2.1,'#e4ecf1');}
    else if(pal.cherry){for(let k=0;k<9;k++){ell(ctx,-11+((k*7.3+v*40)%22),-37+((k*5.1)%22),1.5,1.3,k%3?'#fff4f8':'#ffd8e6');}}
    else if(SEAS===0&&v<.62){const BC=v<.3?'#ffb6cc':'#fff2f6';for(let k=0;k<7;k++){ell(ctx,-10+((k*7.3+v*20)%20),-36+((k*5.1)%20),1.7,1.5,BC);}}
    if(tier===2&&SEAS<2){ctx.fillStyle='#f7c95a';for(let k=0;k<4;k++){ctx.fillRect(-8+k*5+v*3,-26+((k*7)%10),1.8,1.8);}}
  }
  ctx.restore();
}
