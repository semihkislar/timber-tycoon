# v2.9 phone screenshots (iPhone 13 class: 390x844 @3x, touch). Mid/late game via the balance bot.
#   python3 test/shot_mobile.py  -> mobile.png, mobile-sheet.png, mobile-jump.png, mobile-landscape.png
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL
from playwright.sync_api import sync_playwright
import sys as _s,os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); from shots import shot_dir
OUT=shot_dir()  # screenshots/history/v<VERSION>/
CLEAN='document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove())'
SETUP='''(()=>{Math.random=(()=>{let a=777;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();
  runBot(2400,3,300);TT.S.events=[];TT.S.nextEvent=TT.S.time+999;TT.S.orders.next=TT.S.time+999;TT.checkAch(true);TT.setClock(420*.45);TT.setWeather('clear',900);TT.S.wx.next=1e9;
  const v=TT.scene.wxv;for(const k in v) v[k]=0;TT.fitCamera(true);TT.GI.touchedAt=performance.now()+1e9;})()'''
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(w,h):
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=3,is_mobile=True,has_touch=True,
          user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(400); pg.add_script_tag(path=OUT+'test/bot.js'); pg.evaluate(SETUP); pg.wait_for_timeout(2500); pg.evaluate(CLEAN); return ctx,pg
    # portrait main view
    ctx,pg=page(390,844)
    pg.evaluate('TT.fitCamera(true)'); pg.wait_for_timeout(1500); pg.evaluate(CLEAN); pg.evaluate('TT.spawnGolden()'); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+'mobile.png'); print('mobile.png')
    # half-open building sheet (the camera flies the lot above the sheet)
    pg.evaluate("TT.closeSheet();TT.openSheet('bld','kiln')"); pg.wait_for_timeout(1400); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'mobile-sheet.png'); print('mobile-sheet.png')
    # quick-jump chips open, camera at the Log Yard
    pg.evaluate("TT.closeSheet();TT.fitCamera(true)"); pg.wait_for_timeout(600); pg.evaluate("TT.toggleJump(true);TT.jumpTo('yard')"); pg.wait_for_timeout(1500); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'mobile-jump.png'); print('mobile-jump.png')
    ctx.close()
    # landscape phone with the side sheet
    ctx,pg=page(844,390)
    pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(800); pg.evaluate("TT.openSheet('bld','kiln')"); pg.wait_for_timeout(1400); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'mobile-landscape.png'); print('mobile-landscape.png')
    ctx.close(); b.close()
print('errs',errs)
