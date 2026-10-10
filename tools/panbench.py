# v2.9 pan / pinch frame-cost benchmark on an emulated phone (late game). Frame cost = rAF callback incl. raster flush.
#   python3 tools/panbench.py <url> [label] [device]
# Drives real CDP touch events: a 4 s continuous one-finger pan (back and forth) and a 3 s pinch in/out, then reports
# avg / p95 / max frame cost and the share of frames over the 16.7 ms budget.
import sys,json
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; LABEL=sys.argv[2] if len(sys.argv)>2 else URL; DEV=sys.argv[3] if len(sys.argv)>3 else 'Pixel 7'
HOOK='''(()=>{window.__fc=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{const t0=performance.now();cb(t);
  if(cb.name==='sceneLoop'&&window.TT&&TT.scene.ctx){TT.scene.ctx.getImageData(0,0,1,1);window.__fc.push(performance.now()-t0);}});})()'''
def stats(a):
    a=sorted(a); n=len(a)
    return {'avg':round(sum(a)/n,2),'p95':round(a[int(n*.95)],2),'max':round(a[-1],1),'over16':round(sum(1 for x in a if x>16.7)/n*100,1),'n':n}
with sync_playwright() as p:
    b=p.chromium.launch(); d=dict(p.devices[DEV]); d.pop('default_browser_type',None)
    ctx=b.new_context(**d); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.add_init_script(HOOK); pg.goto(URL); pg.wait_for_timeout(600); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
    pg.evaluate("Math.random=(()=>{let a=12345;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();runBot(3600,3,300);TT.S.orders.next=1e12;")
    pg.evaluate('document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove());TT.setClock(420*.45);TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.fitCamera(true);const c=TT.cam;c.z=c.tz=c.fitZ*1.6;')
    pg.wait_for_timeout(2500)
    W,H=pg.evaluate('[innerWidth,innerHeight]'); cdp=ctx.new_cdp_session(pg)
    T=lambda t,pts: cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
    res={}
    # idle reference
    pg.evaluate('window.__fc=[]'); pg.wait_for_timeout(2000); res['idle']=stats(pg.evaluate('window.__fc'))
    # continuous pan: finger sweeps left/right/up/down for ~4 s
    pg.evaluate('window.__fc=[]'); T('touchStart',[(W/2,H/2)])
    import math
    for k in range(240):
        a=k/240*math.pi*4; T('touchMove',[(W/2+math.sin(a)*W*.35,H/2+math.sin(a*.5)*H*.2)]); pg.wait_for_timeout(16)
    T('touchEnd',[]); res['pan']=stats(pg.evaluate('window.__fc'))
    pg.wait_for_timeout(1500)
    # pinch in / out for ~3 s
    pg.evaluate('window.__fc=[]'); cx,cy=W/2,H/2
    T('touchStart',[(cx-60,cy),(cx+60,cy)])
    for k in range(180):
        d=120+100*math.sin(k/180*math.pi*3); T('touchMove',[(cx-d/2,cy),(cx+d/2,cy)]); pg.wait_for_timeout(16)
    T('touchEnd',[]); res['pinch']=stats(pg.evaluate('window.__fc'))
    print(LABEL,DEV,json.dumps(res),errs[:3])
    b.close()
