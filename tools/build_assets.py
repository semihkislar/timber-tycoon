# Asset pipeline: renders the game's own procedural drawing code (drawTreeRaw) in headless Chromium at 2x and packs the frames
# into a PNG atlas + JSON frame map in assets/. Re-run after changing tree art:  python3 tools/build_assets.py
# Frames: 5 tree tiers x 4 seasons x 11 colour variants (mature, s=1) + saplings (13 growth steps) + stumps.
import sys,os,json,base64
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,R+'/test')
from _server import BASE
from playwright.sync_api import sync_playwright
JS=r'''()=>{
 const A=2, frames=[], BOX=[-30,-66,30,8];
 for(let tier=0;tier<5;tier++) for(let seas=0;seas<4;seas++){
   for(let v=0;v<=10;v++) frames.push({key:treeAtlasKey(tier,seas,v/10,1,false),seas,f:g=>drawTreeRaw(g,0,0,{s:1,var:v/10},tier)});
   for(let q=7;q<=19;q++) frames.push({key:treeAtlasKey(tier,seas,.5,q/50,false),seas,f:g=>drawTreeRaw(g,0,0,{s:1,grow:q/50,var:.5},tier)});
   // saplings use var too (colour); keep every variant for the most common growth steps would bloat the atlas -> var .5 only, runtime falls back otherwise
 }
 frames.push({key:treeAtlasKey(0,0,0,1,true),seas:0,f:g=>drawTreeRaw(g,0,0,{s:1,stump:1,var:.4},1)});
 for(let s=1;s<4;s++) frames.push({key:treeAtlasKey(0,s,0,1,true),seas:s,f:g=>drawTreeRaw(g,0,0,{s:1,stump:1,var:.4},1)});
 // render each frame into its own canvas, trimmed to its painted bounds
 const out=[];const S0=SEAS;
 for(const fr of frames){SEAS=fr.seas;const w=(BOX[2]-BOX[0])*A,h=(BOX[3]-BOX[1])*A;const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
   g.setTransform(A,0,0,A,-BOX[0]*A,-BOX[1]*A);fr.f(g);const d=g.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
   for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>2){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
   if(x1<0) continue; x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(w-1,x1+1);y1=Math.min(h-1,y1+1);
   out.push({key:fr.key,c,x0,y0,w:x1-x0+1,h:y1-y0+1});}
 SEAS=S0;
 // shelf packing
 out.sort((a,b)=>b.h-a.h);const MW=2048;let x=0,y=0,rowH=0;for(const o of out){if(x+o.w>MW){x=0;y+=rowH+1;rowH=0;}o.ax=x;o.ay=y;x+=o.w+1;rowH=Math.max(rowH,o.h);}
 const H=y+rowH;const at=document.createElement('canvas');at.width=MW;at.height=H;const ag=at.getContext('2d');
 const map={};for(const o of out){ag.drawImage(o.c,o.x0,o.y0,o.w,o.h,o.ax,o.ay,o.w,o.h);map[o.key]=[o.ax,o.ay,o.w,o.h,+(BOX[0]+o.x0/A).toFixed(3),+(BOX[1]+o.y0/A).toFixed(3)];}
 return {png:at.toDataURL('image/png'),frames:map,n:out.length,w:MW,h:H};}'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(BASE+'index.html?noatlas'); pg.wait_for_timeout(800)
    r=pg.evaluate(JS); os.makedirs(R+'/assets',exist_ok=True)
    open(R+'/assets/atlas-trees.png','wb').write(base64.b64decode(r['png'].split(',')[1]))
    json.dump({'image':'atlas-trees.png','scale':2,'w':r['w'],'h':r['h'],'frames':r['frames']},open(R+'/assets/atlas-trees.json','w'),separators=(',',':'))
    print('atlas',r['n'],'frames',r['w'],'x',r['h'],os.path.getsize(R+'/assets/atlas-trees.png')//1024,'KB',errs)
    b.close()
