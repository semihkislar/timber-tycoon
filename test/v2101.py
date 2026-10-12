# v2.10.1 regression: the Fire Station (and every other buildable) can be built by real touch taps on phones and by
# mouse on desktop. Fire station via the scene lot -> Staff sheet (button must be on screen without scrolling),
# via More -> Staff, and via the needs-attention button. Plus the v2.10.1 chimney sprites are cached.
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
LATE='''(()=>{const S=TT.S;S.coins=1e15;S.totalEarned=1e16;TT.buyCollector("lumberjack",40);
 for(const b of BUILDINGS){S.buildings[b.id]&&b.id!=='lab'&&b.id!=='nursery'&&TT.buyBuilding(b.id,1);}S.coins=1e15;TT.rebuildAll();})()'''
LV={'station':'stationLvl()','premium':'S.premium.lvl','harbour':'harborLvl()','power':'pwLvl()','lab':'S.buildings.lab.lvl',
    'planter':'JSON.stringify(S.planters||S.plant||0)','kiln':'S.buildings.kiln.lvl'}
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for dev in [None,'iPhone 13','Pixel 7']:
        tag=dev or 'desktop'
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':800}}; d.pop('default_browser_type',None)
        ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page()
        pg.on('pageerror',lambda e,t=tag: errs.append(f'{t} {e}'))
        cdp=ctx.new_cdp_session(pg) if dev else None
        def tap(x,y):
            if dev:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); pg.wait_for_timeout(50)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            else: pg.mouse.click(x,y)
            pg.wait_for_timeout(450)
        def btn(sel,scroll=True):
            pg.wait_for_timeout(350)
            if scroll: pg.evaluate("s=>{const b=document.querySelector(s);if(!b) return;const B=document.getElementById('shBody');const r=b.getBoundingClientRect(),R=B.getBoundingClientRect();B.scrollTop+=r.top-R.top-R.height/2+r.height/2;}",sel); pg.wait_for_timeout(250)
            scroll=False
            return pg.evaluate("""([s,sc])=>{const b=document.querySelector(s);if(!b||b.offsetParent===null) return null;const B=document.getElementById('shBody');
              if(sc){const r=b.getBoundingClientRect(),R=B.getBoundingClientRect();B.scrollTop+=r.top-R.top-R.height/2+r.height/2;}
              const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,e=document.elementFromPoint(x,y);
              return {x,y,dis:b.disabled,top:!!e&&(e===b||b.contains(e))}}""",[sel,scroll])
        def fresh(kiln=True):
            pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate('document.querySelectorAll(".modal-bg").forEach(t=>t.remove())')
            pg.evaluate('TT.S.coins=2e5;'+('TT.buyBuilding("kiln",1);TT.S.coins=2e5;' if kiln else '')+'TT.fitCamera(true)'); pg.wait_for_timeout(500)
        def lv(k): return pg.evaluate(LV[k])
        # 1) scene lot -> staff sheet; button visible WITHOUT scrolling, tap builds
        fresh(); s=pg.evaluate('TT.stationScreen()'); tap(*s)
        ok(pg.evaluate('TT.curSheet')=='staff',f'{tag}: tapping the station lot opens Staff')
        q=btn('#stnBuy',scroll=False); ok(bool(q and q['top'] and not q['dis']),f'{tag}: Build Fire Station button on screen and enabled right away {q}')
        if q: tap(q['x'],q['y'])
        ok(lv('station')==1,f'{tag}: station built via scene lot')
        # 2) via Staff sheet (More on mobile)
        fresh()
        if dev:
            m=pg.evaluate("(()=>{const e=[...document.querySelectorAll('#bottombar .bb')].find(x=>x.dataset.s==='more');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); tap(*m)
            m=pg.evaluate("(()=>{const e=document.querySelector('#moreGrid [data-s=staff]');if(!e) return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
            ok(m is not None,f'{tag}: More menu lists Staff'); m and tap(*m)
        else: pg.evaluate("TT.openSheet('staff')")
        ok(pg.evaluate('TT.curSheet')=='staff',f'{tag}: Staff sheet open')
        q=btn('#stnBuy'); q and tap(q['x'],q['y']); ok(lv('station')==1,f'{tag}: station built via Staff sheet {q} {lv("station")} {pg.evaluate("[S.coins,curSheet]")}')
        # 3) not affordable: reason shown
        fresh(); pg.evaluate("TT.S.coins=100;TT.openSheet('staff')"); pg.wait_for_timeout(400)
        ok(pg.evaluate("!document.getElementById('stnNeed').classList.contains('hidden')&&/Need/.test(document.getElementById('stnNeed').textContent)"),f'{tag}: shortfall explained')
        # 4) attention list offers the station
        fresh(); ok(pg.evaluate("TT.attentionList().some(a=>a.id==='station')"),f'{tag}: attention list offers the affordable fire station')
        # 5) every other buildable, by tap
        pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate(LATE); pg.wait_for_timeout(300)
        for k,open,sel in [('premium',"TT.openSheet('prem')",'#pmBuy'),('harbour',"rndTab='trade';TT.openSheet('rnd')",'#hbBuy'),
                           ('power',"TT.openSheet('power')",'#pwBuy'),('lab',"TT.openSheet('bld','lab')",'#bpBuy'),
                           ('kiln',"TT.openSheet('bld','kiln')",'#bpBuy'),('planter',"TT.openSheet('crew')",'#plList .btn.buy'),
                           ('station',"TT.openSheet('staff')",'#stnBuy')]:
            pg.evaluate('S.coins=1e15;'+open); pg.wait_for_timeout(400); v0=lv(k); q=btn(sel)
            if q and not q['dis']: tap(q['x'],q['y'])
            ok(q is not None and lv(k)!=v0,f'{tag}: {k} buildable by tap ({v0} -> {lv(k)}) {q}')
        ctx.close()
    ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if os.path.isdir(ROOT+'/releases/v2.10.1'):
        from _server import BASE
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(f'rel {e}'))
        pg.goto(BASE+'releases/v2.10.1/index.html'); pg.wait_for_timeout(1500)
        ok(pg.evaluate('TT.VERSION')=='2.10.1' and pg.evaluate('TT.scene.fps')>5,'releases/v2.10.1/ snapshot runs'); ctx.close()
    # chimney sprites are pre-rendered once and reused (cache stays small and stops growing)
    ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(f'chim {e}'))
    pg.goto(URL); pg.wait_for_timeout(1200); pg.evaluate(LATE); pg.wait_for_timeout(2500); n1=pg.evaluate('CH_N'); pg.wait_for_timeout(2500); n2=pg.evaluate('CH_N')
    ok(0<n1<=60 and n2==n1,f'chimney sprites cached, no per-frame rebuilds ({n1} -> {n2})')
    ok(pg.evaluate('scene.smoke.length')>5 and pg.evaluate('S_POOL.length+scene.smoke.length')<400,f"smoke pooled ({pg.evaluate('scene.smoke.length')} live)")
    ctx.close()
    ok(not errs,f'no page errors {errs[:3]}')
print('FAILED' if FAILS else 'ALL PASS',len(FAILS)); sys.exit(1 if FAILS else 0)
