# PWA icons (v2.9): renders the in-game logo (svgIcon('tree')) on a rounded wooden badge into assets/icon-*.png.
#   python3 tools/build_icons.py
import os,sys,base64
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'test'))
from _server import URL
from playwright.sync_api import sync_playwright
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS='''async ([size,mask])=>{const svg=svgIcon('tree',64).replace(/width="[^"]*"/,'width="64"').replace(/height="[^"]*"/,'height="64"');
  const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.includes('xmlns')?svg:svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));await img.decode();
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');const s=size;
  const bg=g.createLinearGradient(0,0,0,s);bg.addColorStop(0,'#fff6dc');bg.addColorStop(1,'#f0c27a');
  if(mask){g.fillStyle=bg;g.fillRect(0,0,s,s);} else {const r=s*.22;g.fillStyle='#7a4e2a';g.beginPath();g.roundRect(0,0,s,s,r);g.fill();
    g.fillStyle=bg;g.beginPath();g.roundRect(s*.045,s*.045,s*.91,s*.91,r*.82);g.fill();}
  g.fillStyle='rgba(30,50,15,.25)';g.beginPath();g.ellipse(s/2,s*.8,s*.27,s*.06,0,0,Math.PI*2);g.fill();
  const k=mask?.56:.72;g.drawImage(img,s*(1-k)/2,s*(1-k)/2-s*.02,s*k,s*k);
  return c.toDataURL('image/png');}'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto(URL); pg.wait_for_timeout(500)
    for size,mask,name in [(192,False,'icon-192.png'),(512,False,'icon-512.png'),(180,False,'icon-180.png'),(512,True,'icon-maskable-512.png')]:
        d=pg.evaluate(JS,[size,mask]); open(f'{R}/assets/{name}','wb').write(base64.b64decode(d.split(',')[1])); print('wrote',name)
    b.close()
