# v2.52: the maintenance regression. Version and service-worker cache, a clean boot on desktop
# and on iPhone 13 / Pixel 7 (a real click or touch, no console errors, no 404s), and saves from
# v2.51, v2.50 and v2.39 still load. Release shots: desktop.png and mobile.png.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT,ver
from _pace import STOP,ready,paint,touch_at
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
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
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type',None)
            ctx=b.new_context(**d,service_workers='block')
        else:
            ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(STOP+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL,wait_until='domcontentloaded'); ready(pg); return pg
    def tap_sel(pg, sel):
        loc=pg.locator(sel).first
        loc.scroll_into_view_if_needed(); box=loc.bounding_box()
        if not box: return False
        touch_at(pg, box['x']+box['width']/2, box['y']+min(box['height']/2, 22))
        paint(pg); return True
    pg=page(); E(pg,QUIET)
    ok(ver(E(pg,'TT.VERSION'))==(2,52),f"VERSION is 2.52 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read())
    ok(m and m.group(1)=='2.52','service-worker cache is timber-tycoon-v2.52')
    ok(E(pg,'canSell("logs")') is False,'logs stay unsellable')
    E(pg,SHOW); paint(pg)
    pg.locator('#bbCrew').click(); paint(pg)
    ok(E(pg,"TT.curSheet")=='crew','desktop: click opens the Crew sheet')
    E(pg,"closeSheet();fitCamera(true);TT.render()"); paint(pg)
    pg.screenshot(path=shot_path('desktop.png'))
    n_err,n_miss=len(errs),len(missing)
    ok(n_err==0 and n_miss==0,f'desktop boot: no console errors or 404s ({errs[:2]}, {missing[:2]})')
    pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        before=len(errs); before_m=len(missing)
        pg=page(dev); E(pg,QUIET); E(pg,SHOW); paint(pg)
        ok(tap_sel(pg,'#bbCrew') and E(pg,"TT.curSheet")=='crew',f'{dev}: touch opens the Crew sheet')
        E(pg,"closeSheet();fitCamera(true);TT.render();document.querySelectorAll('.toast,.modal-bg').forEach(e=>e.remove());")
        paint(pg)
        if dev=='Pixel 7': pg.screenshot(path=shot_path('mobile.png'))
        ok(len(errs)==before and len(missing)==before_m,f'{dev}: boot and touch, no console errors or 404s ({errs[before:before+2]}, {missing[before_m:before_m+2]})')
        pg.close()
    for ver_s,lvl in (('2.51',8),('2.50',6),('2.39',4)):
        raw={'version':ver_s,'coins':24000,'legacy':0,'upgrades':{'sharp':1},
             'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':40,'planks':8}}
        pg=page(init=save_js(raw))
        r=E(pg,'''()=>{let n=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);n++;}
          return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell('logs'),coin:S.coins,n:n,ok:isFinite(S.coins)&&isFinite(S.res.logs)};}''')
        ok(r['ok'] and r['n']==5 and r['logs'] is False and r['saw']==lvl and ver(r['v'])>=(2,52) and r['coin']>0,
           f'{ver_s} save loads and runs ({r})')
        pg.close()
    ok(not errs,'no console errors '+str(errs[:3]))
    ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
sys.exit(1 if FAILS else 0)
