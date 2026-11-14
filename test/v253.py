# v2.53: desktop cold start. The backing store (front buffer and ground layer) stays within 4 MP.
# Phones keep the old DPR-2 cap. A splash is up before boot. Desktop click and iPhone 13 / Pixel 7
# tap, no console errors or 404s. Saves from v2.52, v2.51 and v2.39 still load.
# Shots: desktop.png (1280x800), mobile.png, desktop-hidpi.png.
from playwright.sync_api import sync_playwright
from PIL import Image
import sys,os,json,re,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT,ver
from _pace import STOP,ready,paint,touch_at,until,FOREST
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
MAX=4_000_000
def expect_dpr(w,h,dev):
    return min(dev, 2, math.sqrt(MAX/max(1,w*h)))
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET=r'''()=>{if(S.ob)S.ob.st='skip';S.events=[];S.nextEvent=S.time+1e9;if(S.wx)S.wx.next=1e15;
  if(S.orders)S.orders.next=S.time+1e9;if(S.mish)S.mish.next=S.time+1e9;S.prefs.autoFocus=false;
  document.querySelectorAll('.toast,.modal-bg').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear();}'''
SHOW=r'''()=>{if(S.ob)S.ob.st='skip';S.events=[];S.nextEvent=S.time+1e9;if(S.wx)S.wx.next=1e15;
  if(S.orders)S.orders.next=S.time+1e9;if(S.mish)S.mish.next=S.time+1e9;S.prefs.autoFocus=false;
  document.querySelectorAll('.toast,.modal-bg').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear();
  S.coins=8000;S.collectors.lumberjack=3;S.buildings.sawmill.lvl=3;S.buildings.sawmill.on=true;
  S.buildings.chipper.lvl=1;S.buildings.chipper.on=true;S.res.logs=30;S.res.planks=12;M=computeMods();
  if(typeof fitCamera==='function')fitCamera(true);TT.render();}'''
def save_js(obj):
    return 'localStorage.setItem("timberTycoon_save_v1",'+json.dumps(json.dumps(obj))+');'
def buf(pg):
    return E(pg,'''()=>{const c=document.getElementById('scene'); const g=TT.ground&&TT.ground.c;
      return {bw:c.width,bh:c.height,dpr:TT.scene.dpr,sw:TT.scene.w,sh:TT.scene.h,
        gw:g?g.width:0,gh:g?g.height:0};}''')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, vw=None, dpr=None, init=CLEAR):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type',None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport=vw or {'width':1280,'height':800}, device_scale_factor=dpr or 1, service_workers='block')
        ctx.add_init_script(STOP+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        return ctx,pg
    def tap_sel(pg, sel):
        loc=pg.locator(sel).first
        loc.scroll_into_view_if_needed(); box=loc.bounding_box()
        if not box: return False
        touch_at(pg, box['x']+box['width']/2, box['y']+min(box['height']/2, 22))
        paint(pg); return True
    def settle(pg):
        until(pg, "()=>TT.scene && TT.scene.groundBoot===false && !document.getElementById('boot')", timeout=8000)
        E(pg,"document.querySelectorAll('.toast,.modal-bg').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear();scene.floats.length=0;")
        paint(pg)
    ctx,pg=page(); pg.goto(URL, wait_until='domcontentloaded')
    ok(E(pg,'window.__splashShown')==1, 'splash was on screen before the game booted')
    ready(pg)
    ok(ver(E(pg,'TT.VERSION'))>=(2,53), f"VERSION >= 2.53 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'", open(ROOT+'/sw.js').read())
    ok(m and ver(m.group(1))>=(2,53), 'service-worker cache is timber-tycoon-v2.53 or newer')
    sw=open(ROOT+'/sw.js').read()
    ok('screenshots/' in sw and 'releases/' in sw, 'service worker still skips releases/ and screenshots/')
    ok(E(pg,'canSell("logs")') is False, 'logs stay unsellable')
    ok(E(pg,'TT.MAX_BACKING')==MAX, f'backing cap is {MAX}')
    E(pg,QUIET); E(pg,SHOW); settle(pg)
    pg.locator('#bbCrew').click(); paint(pg)
    ok(E(pg,"TT.curSheet")=='crew', 'desktop: click opens the Crew sheet')
    E(pg,"closeSheet();fitCamera(true);TT.render();scene.floats.length=0;"); settle(pg)
    desk=shot_path('desktop.png'); pg.screenshot(path=desk)
    im=Image.open(desk); ok(im.size==(1280,800), f'desktop.png is 1280x800 ({im.size})')
    n_err,n_miss=len(errs),len(missing)
    ok(n_err==0 and n_miss==0, f'desktop boot: no console errors or 404s ({errs[:2]}, {missing[:2]})')
    pg.close(); ctx.close()
    for w,h,d in ((1280,800,1),(1920,1080,1),(1920,1080,1.25),(1920,1080,2),(2560,1440,1),(2560,1440,2),(3840,2160,1),(3840,2160,2)):
        ctx,pg=page(vw={'width':w,'height':h}, dpr=d)
        pg.goto(URL, wait_until='domcontentloaded'); ready(pg); E(pg,QUIET); E(pg,SHOW); settle(pg)
        r=buf(pg); ed=expect_dpr(w,h,d)
        px=r['bw']*r['bh']; gpx=r['gw']*r['gh']
        ok(abs(r['dpr']-ed)<=max(1e-4, ed*1e-3) and r['sw']==w and r['sh']==h, f'{w}x{h}@{d} dpr {r["dpr"]:.4f} (expected {ed:.4f})')
        ok(px<=MAX*1.02 and (gpx==0 or gpx<=MAX*1.02), f'{w}x{h}@{d} front {px/1e6:.2f} MP, ground {gpx/1e6:.2f} MP')
        old=min(d,2)
        if old*w*old*h<=MAX*1.001:
            ok(abs(r['dpr']-old)<1e-3 and r['bw']==round(w*old), f'{w}x{h}@{d} stays at the old backing ({r["bw"]}x{r["bh"]})')
        z0=E(pg,'TT.cam.z'); E(pg,f'zoomAt({w/2},{h/2}, TT.cam.z*1.4)'); paint(pg)
        hit=E(pg,"(()=>{const pt=TT.lotScreen('sawmill'); return {z:TT.cam.z, dpr:TT.scene.dpr, h:TT.hitTest(pt[0],pt[1])};})()")
        ok(hit['z']>z0*1.05 and abs(hit['dpr']-ed)<1e-3 and hit['h'] and hit['h']['id']=='sawmill', f'{w}x{h}@{d} zoom and hit-test ({hit})')
        pg.close(); ctx.close()
    for dev in ('iPhone 13','Pixel 7'):
        desc=p.devices[dev]
        vw,vh,dd=desc['viewport']['width'], desc['viewport']['height'], desc['device_scale_factor']
        old=min(dd,2)
        ok(expect_dpr(vw,vh,dd)==old, f'{dev} formula stays at DPR {old} (device {dd})')
        before,before_m=len(errs),len(missing)
        ctx,pg=page(dev); pg.goto(URL, wait_until='domcontentloaded'); ready(pg); E(pg,QUIET); E(pg,SHOW); settle(pg)
        r=buf(pg)
        ok(abs(r['dpr']-old)<1e-3 and r['bw']==round(r['sw']*old) and r['bw']*r['bh']<=MAX, f'{dev}: backing {r["bw"]}x{r["bh"]} at dpr {r["dpr"]:.3f}')
        ok(tap_sel(pg,'#bbCrew') and E(pg,"TT.curSheet")=='crew', f'{dev}: touch opens the Crew sheet')
        E(pg,"closeSheet();fitCamera(true);TT.render();scene.floats.length=0;document.querySelectorAll('.toast,.modal-bg').forEach(e=>e.remove());")
        settle(pg)
        if dev=='Pixel 7':
            mob=shot_path('mobile.png'); pg.screenshot(path=mob)
            im=Image.open(mob); ok(im.size[0]>=800, f'mobile.png is a hi-dpi phone shot ({im.size})')
        forest=E(pg,"()=>{const pt=%s; if(!pt) return null; const logs=S.res.logs; const n=forestChop(pt[0],pt[1]); return {n, h:hitTest(pt[0],pt[1]).type};}"%FOREST)
        ok(forest and forest['h']=='forest' and forest['n']>=0, f'{dev}: a tap on the forest still hits ({forest})')
        ok(len(errs)==before and len(missing)==before_m, f'{dev}: boot and touch, no console errors or 404s ({errs[before:before+2]}, {missing[before_m:before_m+2]})')
        pg.close(); ctx.close()
    ctx,pg=page(vw={'width':1600,'height':1000}, dpr=2)
    pg.goto(URL, wait_until='domcontentloaded'); ready(pg); E(pg,QUIET); E(pg,SHOW); settle(pg)
    r=buf(pg)
    ok(r['bw']*r['bh']<=MAX*1.02 and r['dpr']<2, f'1600x1000@2 capped ({r["bw"]}x{r["bh"]} dpr {r["dpr"]:.3f})')
    hid=shot_path('desktop-hidpi.png'); pg.screenshot(path=hid)
    im=Image.open(hid); ok(im.size==(3200,2000), f'desktop-hidpi.png is 1600x1000 at DPR 2 ({im.size})')
    pg.close(); ctx.close()
    for ver_s,lvl in (('2.52',8),('2.51',6),('2.39',4)):
        raw={'version':ver_s,'coins':24000,'legacy':0,'upgrades':{'sharp':1},
             'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':40,'planks':8}}
        ctx,pg=page(init=save_js(raw))
        pg.goto(URL, wait_until='domcontentloaded'); ready(pg)
        r=E(pg,'''()=>{let n=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);n++;}
          return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell('logs'),coin:S.coins,n:n,ok:isFinite(S.coins)&&isFinite(S.res.logs)};}''')
        ok(r['ok'] and r['n']==5 and r['logs'] is False and r['saw']==lvl and ver(r['v'])>=(2,53) and r['coin']>0,
           f'{ver_s} save loads and runs ({r})')
        pg.close(); ctx.close()
    ok(not errs, 'no console errors '+str(errs[:3]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
sys.exit(1 if FAILS else 0)
