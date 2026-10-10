# Short frame-cost benchmark (late game, day + night, zoomed-out and zoomed-in). Frame cost = rAF callback incl. raster flush.
# usage: python3 tools/bench.py <url> [label] [shotprefix]
import sys,json
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; LABEL=sys.argv[2] if len(sys.argv)>2 else URL; SHOT=sys.argv[3] if len(sys.argv)>3 else None
HOOK='''(()=>{window.__fc=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{const t0=performance.now();cb(t);
  if(cb.name==='sceneLoop'&&window.TT&&TT.scene.ctx){TT.scene.ctx.getImageData(0,0,1,1);window.__fc.push(performance.now()-t0);}});})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script(HOOK); pg.goto(URL); pg.wait_for_timeout(600); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
    pg.evaluate('Math.random=(()=>{let a=12345;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();runBot(3600,3,300);TT.S.orders.next=1e12;TT.S.nextEvent=1e12;TT.S.fireCool=1e12;TT.S.fires={};')
    res={}
    for clock,lab in [(420*.45,'day'),(420*.93,'night')]:
        for zl,zf in [('fit',1.0),('zoom',2.2)]:
            pg.evaluate(f'(()=>{{TT.setClock({clock});TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.fitCamera(true);const c=TT.cam;c.z=c.tz=c.fitZ*{zf};}})()'); pg.wait_for_timeout(1500)
            pg.evaluate('window.__fc=[]'); pg.wait_for_timeout(4000)
            a=sorted(pg.evaluate('window.__fc')); n=len(a)
            res[lab+'-'+zl]={'avg':round(sum(a)/n,2),'p50':round(a[n//2],2),'p95':round(a[int(n*.95)],2),'max':round(a[-1],1),'n':n}
            if SHOT: pg.screenshot(path=f'{SHOT}-{lab}-{zl}.png')
    spr=pg.evaluate('TT.SPR?{n:TT.SPR.map.size,px:TT.SPR.px,hits:TT.SPR.hits,miss:TT.SPR.miss,direct:TT.SPR.direct}:null')
    print(LABEL,json.dumps(res),spr,errs[:3])
    b.close()
