# Renders a contact sheet of the procedural assets at 3x (for art review and before/after comparisons).
# usage: python3 tools/asset_sheet.py <url> <out.png> [title]
import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','test'))
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; OUT=sys.argv[2]; TITLE=sys.argv[3] if len(sys.argv)>3 else ''
JS=r'''(title)=>{
 const raw=(n)=>window[n+'Raw']||window[n];
 const cells=[
  ['Lumberjack walk',g=>{raw('human')(g,0,0,{look:scene.jacks[0]?scene.jacks[0].look:undefined,pose:'walk',ph:1});raw('human')(g,26,4,{look:(scene.workers[0]||{}).look,pose:'box',ph:2.2,cargo:'planks',fx:-1});}],
  ['Chop / saw',g=>{raw('human')(g,-6,0,{look:(scene.jacks[1]||{}).look,pose:'chop',t:.3});raw('human')(g,26,4,{look:(scene.jacks[2]||{}).look,pose:'saw',fx:-1});}],
  ['Planter dig / water',g=>{const L=(scene.planters&&scene.planters[0]||{}).look;raw('human')(g,-6,0,{look:L,pose:'dig',t:.4});raw('human')(g,26,4,{look:L,pose:'water',t:.5,fx:-1});}],
  ['Pine (summer/winter)',g=>{raw('drawTree')(g,-14,6,{s:1,var:.6},0);SEAS=3;raw('drawTree')(g,22,10,{s:1,var:.3},0);SEAS=1;}],
  ['Oak (spring/autumn)',g=>{SEAS=0;raw('drawTree')(g,-14,6,{s:1,var:.6},1);SEAS=2;raw('drawTree')(g,22,10,{s:1,var:.3},1);SEAS=1;}],
  ['Saplings & stump',g=>{const drawTreeRaw=window.drawTreeRaw||drawTree;drawTreeRaw(g,-26,4,{s:1,grow:.16,var:.4},0);drawTreeRaw(g,-6,6,{s:1,grow:.3,var:.4},1);drawTreeRaw(g,14,8,{s:1,grow:.6,var:.4},1);drawTreeRaw(g,32,4,{s:1,stump:1,var:.4},1);}],
  ['Log truck',g=>{raw('logTruck')(g,0,0,0,{col:'#c8402e',load:1});}],
  ['Box truck',g=>{raw('boxTruck')(g,0,0,Math.PI/2,{col:'#2e6fc8',box:'#e8e4da',stripe:'#2e6fc8',load:0});}],
  ['Forklift',g=>{raw('forklift')(g,-.7,.7,0,'planks',0);raw('forklift')(g,.9,-.9,Math.PI/2,null,0);}],
  ['Street lamps',g=>{const f=window.lampPostRaw||((g,x,y)=>{ell(g,x+2,y+1,5,2.5,'rgba(0,0,0,.2)');g.fillStyle='#4a4f56';g.fillRect(x-1.2,y-30,2.4,30);g.fillRect(x-1.2,y-30,7,2);g.fillStyle='#fff3c0';g.beginPath();g.arc(x+6,y-27,2.4,0,TAU);g.fill();});f(g,-18,8);f(g,14,14);}],
  ['Drone / heli',g=>{drone(g,-22,30,30,1);heli(g,20,40,40,1,true);}],
  ['Stumps (felled forest)',g=>{for(const [x,y] of [[-20,0],[4,6],[22,-4],[-4,-10]]) (window.drawTreeRaw||drawTree)(g,x,y,{s:1,stump:1,var:.4},1);}],
  ['Cargo icons',g=>{let x=-30;for(const r of RES.slice(0,7)){(window.cargoIconRaw||cargoIcon)(g,x,(x%2?3:0),r.id,1);x+=10;}}],
 ];
 const C=3, cw=150, ch=120, cols=5, rows=Math.ceil(cells.length/cols);
 const cv=document.createElement('canvas');cv.width=cols*cw*C;cv.height=(rows*ch+26)*C;const g=cv.getContext('2d');
 g.fillStyle='#2b1d10';g.fillRect(0,0,cv.width,cv.height);
 g.setTransform(C,0,0,C,0,0);g.fillStyle='#fff3d6';g.font='800 14px system-ui';g.fillText(title,10,18);
 cells.forEach(([name,f],k)=>{const cx=(k%cols)*cw, cy=26+Math.floor(k/cols)*ch;
   g.save();g.beginPath();g.rect(cx+3,cy+3,cw-6,ch-6);g.clip();const gr=g.createLinearGradient(0,cy,0,cy+ch);gr.addColorStop(0,'#a6cf86');gr.addColorStop(1,'#7fb062');g.fillStyle=gr;g.fillRect(cx,cy,cw,ch);
   g.translate(cx+cw/2,cy+ch*.68);const sc=/truck|Forklift|Harvester/i.test(name)?.6:/Cargo/.test(name)?2.2:1.25;g.scale(sc,sc);try{f(g);}catch(e){g.fillStyle='red';g.fillText(String(e).slice(0,30),-60,0);}g.restore();
   g.fillStyle='rgba(30,20,10,.75)';g.fillRect(cx+3,cy+ch-19,cw-6,16);g.fillStyle='#fff';g.font='700 10px system-ui';g.fillText(name,cx+8,cy+ch-7);});
 return cv.toDataURL('image/png');}'''
with sync_playwright() as p:
    import base64
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':800}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(600); pg.add_script_tag(path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','test','bot.js'))
    pg.evaluate('runBot(2400,3,300)'); pg.wait_for_timeout(800)
    d=pg.evaluate(JS,TITLE); open(OUT,'wb').write(base64.b64decode(d.split(',')[1])); print('wrote',OUT,errs)
    b.close()
