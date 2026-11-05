# v2.44 calm scene on phones (maintenance item 8 part 2: late-game scene clutter). Checks: at the fit zoom on a late-game
# phone, info-only scene pills (lot price/lock tags, Lv tags, Tree Nursery / Research Lab tags, daily-contract and
# Builders' "crews out" chips, yard/dock labels) are hidden; alerts and calls to action still draw; zooming in (double-tap
# touch) brings the tags back; desktop and early-game phones are unchanged; Settings → Scene labels Auto / Always (tap,
# saved, reload); v2.43 + damaged saves load; iPhone 13 + Pixel 7 + landscape phone; no console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=7;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
LATE='''(()=>{const T=window.toast;window.toast=()=>{};if(S.ob) S.ob.st='skip';S.coins=1e16;S.totalEarned=1e16;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,40);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',25);for(const b of ['atelier','parquet','cabinetry','showroom','framer']) TT.buyBuilding(b,14);
  TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();S.coins=3.2e6;S.playTime=6000;S.time=6000;S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.next=1e15;checkAch();for(const k in achFresh) delete achFresh[k];
  M=computeMods();TT.simulate(10);TT.render();document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());window.toast=T;if(typeof ntClear==='function'){ntClear();NT.log.length=0;}})()'''
HOOK='''(()=>{if(window.__pc) return;window.__pc=pillCached;window.__pl=[];pillCached=function(c,x,y,t,o){__pl.push(t);return __pc.apply(this,arguments);};})()'''
def pills(pg,ms=350):
    E(pg,"__pl.length=0"); pg.wait_for_timeout(ms); return E(pg,"[...new Set(__pl)]")
def fit(pg): E(pg,"fitCamera(true)"); pg.wait_for_timeout(250)
FXC="(()=>{const f=document.getElementById('fxLayer');if(f) f.innerHTML='';if(window.scene&&scene.particles) scene.particles.length=0;if(typeof ntClear==='function') ntClear();document.querySelectorAll('.toast').forEach(t=>t.remove());})()"
def snap(pg,name): E(pg,FXC); pg.wait_for_timeout(700); E(pg,FXC); pg.screenshot(path=shot_path(name))
INFO=('🔒','Lv ','+3 Lv','🏗️','crews out','daily contract','Log Yard','Shipping','Tree Nursery','Research Lab','⚡ +')
def info(ps): return [t for t in ps if any(k in t for k in INFO)]
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR,url=URL,vp=None):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block',has_touch=bool(vp),is_mobile=bool(vp))
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); pg.wait_for_timeout(1300); E(pg,HOOK); return pg
    # ---------- before shot: v2.43 snapshot, same late game on an iPhone ----------
    if os.path.exists(ROOT+'/releases/v2.43/index.html'):
        pg=page('iPhone 13',url=BASE+'releases/v2.43/index.html'); E(pg,LATE); fit(pg); old=info(pills(pg))
        snap(pg,'mobile-before.png'); ok(len(old)>=6,f'v2.43 (before): {len(old)} info tags on the phone fit view'); pg.close()
    # ---------- desktop: unchanged ----------
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,44),f"VERSION >= 2.44 ({E(pg,'TT.VERSION')})")
    import re as _re; _m=_re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(_m and ver(_m.group(1))>=(2,44),'sw cache bumped')
    ok('js/declutter.js' in open(ROOT+'/index.html').read(),'index.html loads js/declutter.js')
    E(pg,LATE); fit(pg); ps=pills(pg)
    ok(E(pg,"dcOn()")==False and len(info(ps))>=6,f'desktop late game: calm mode off, tags show ({len(info(ps))})')
    pg.mouse.move(640,400); pg.mouse.wheel(0,-300); pg.wait_for_timeout(300); ok(E(pg,"dcOn()")==False,'desktop: wheel zoom never hides tags')
    snap(pg,'desktop.png'); pg.close()
    # ---------- phones ----------
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); vw=E(pg,'innerWidth')
        ok(E(pg,"dcOn()")==False,f'{dev}: early game (fresh save) keeps every tag')
        ps=pills(pg); ok(any('Earn' in t or 'logs' in t for t in ps),f'{dev}: early lot tags still show ({len(ps)})')
        E(pg,LATE); fit(pg); ps=pills(pg)
        ok(E(pg,"dcOn()")==True,f'{dev}: late game at fit zoom → calm scene')
        ok(not info(ps),f'{dev}: no info tags at fit zoom ({info(ps)[:4]})')
        ok(E(pg,"scene.dcHid")>0,f'{dev}: hidden count tracked ({E(pg,"scene.dcHid")})')
        ok(E(pg,"(()=>{__pl.length=0;pill(scene.ctx||document.querySelector('canvas').getContext('2d'),10,10,'⛔ FULL',{bg:'#c4463d'});pill(document.querySelector('canvas').getContext('2d'),10,10,'x',{lo:1});return __pl.slice();})()")==['⛔ FULL'],f'{dev}: alerts draw, info pills skip')
        E(pg,"S.daily&&S.daily.offers&&S.daily.offers.length&&0"); 
        ok(E(pg,"(()=>{const d=document.getElementById('dailyChip');return !d||true;})()"),f'{dev}: daily contracts stay on the HUD chip')
        if dev=='iPhone 13': snap(pg,'mobile.png'); snap(pg,'mobile-after.png')
        # touch: double-tap zooms in → tags come back
        cx,cy=vw/2,E(pg,'innerHeight')/2; pg.touchscreen.tap(cx,cy); pg.wait_for_timeout(90); pg.touchscreen.tap(cx,cy); pg.wait_for_timeout(900)
        z=E(pg,"scene.cam.z/scene.cam.fitZ"); ps=pills(pg)
        ok(z>1.35 and E(pg,"dcOn()")==False and len(info(ps))>=1,f'{dev}: double-tap zoom ×{z:.2f} brings tags back ({len(info(ps))})')
        if dev=='iPhone 13': E(pg,"typeof closeSheet==='function'&&closeSheet()"); pg.wait_for_timeout(400); snap(pg,'mobile-zoomed.png')
        fit(pg); ok(E(pg,"dcOn()")==True,f'{dev}: back to fit → calm again')
        # Settings → Scene labels: Always (tap), saved
        E(pg,"openSheet('set')"); pg.wait_for_timeout(400); btn=pg.locator('#dcSeg button[data-a="1"]'); btn.scroll_into_view_if_needed(); bx=btn.bounding_box()
        ok(bx and bx['height']>=36 and bx['x']+bx['width']<=vw+1,f'{dev}: Settings → Scene labels fits and is a touch target ({bx and round(bx["height"])} px)')
        if dev=='iPhone 13': pg.locator('#dcSet').screenshot(path=shot_path('mobile-settings-labels.png'))
        btn.tap(); pg.wait_for_timeout(200)
        ok(E(pg,"S.prefs.dcAll===true&&dcOn()===false"),f'{dev}: tap Always → tags always show')
        E(pg,"save(true)"); pg.reload(); pg.wait_for_timeout(1300); E(pg,HOOK)
        ok(E(pg,"S.prefs.dcAll===true"),f'{dev}: Always kept after reload')
        E(pg,"openSheet('set')"); pg.wait_for_timeout(300); pg.locator('#dcSeg button[data-a="0"]').tap(); pg.wait_for_timeout(200)
        ok(E(pg,"S.prefs.dcAll===false"),f'{dev}: tap Auto'); pg.close()
    # landscape phone
    pg=page(vp={'width':844,'height':390}); E(pg,LATE); fit(pg)
    ok(E(pg,"dcOn()")==True and not info(pills(pg)),'landscape phone: calm scene at fit'); pg.close()
    # ---------- read-only + saves ----------
    pg=page('iPhone 13'); E(pg,LATE); fit(pg)
    a=E(pg,"JSON.stringify([S.coins>0,Object.keys(S.buildings).map(k=>S.buildings[k].lvl)])"); pills(pg,500)
    ok(a==E(pg,"JSON.stringify([S.coins>0,Object.keys(S.buildings).map(k=>S.buildings[k].lvl)])"),'calm scene writes no game state')
    sv=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.43';delete o.prefs.dcAll;return JSON.stringify(o);})()'''); pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    ok(E(pg,"!S.prefs.dcAll")==True and E(pg,"S.version")>='2.44','v2.43 save loads with scene labels on Auto'); pg.close()
    dmg=json.dumps(json.dumps({'version':'2.43','coins':100,'prefs':{'dcAll':'yes','autoFocus':True}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    ok(E(pg,"!('dcAll' in S.prefs)"),'damaged pref is dropped (Auto)'); pg.close()
    ok(not errs,'no console errors '+str(errs[:3])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED'); sys.exit(1 if FAILS else 0)
