# v2.16: Supply flow view — isometric overlay of the production chain (producer → consumer arcs, rate labels, health colours,
# sold goods to the dock), 🔀 fab + F key, legend, persisted in localStorage only (save untouched), Replant unchanged, phones, snapshot.
from playwright.sync_api import sync_playwright
import sys,os,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
SET='''(()=>{const S=TT.S;S.coins=5e12;S.totalEarned=6e12;for(const c of COLLECTORS) TT.buyCollector(c.id,40);for(const p of PLANTERS) buyPlanter(p.id,20);
 for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,30);S.buildings.sawmill.lvl=26;S.buildings.carpentry.lvl=44;S.coins=3e9;M=computeMods();TT.rebuildAll();
 S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());})()'''
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,16),f"VERSION>=2.16 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,16),'sw cache bumped to >= v2.16')
    ok(E(pg,'flowOn')==False and E(pg,"document.getElementById('flowLegend').classList.contains('hidden')"),'flow view off by default, legend hidden')
    E(pg,SET); pg.wait_for_timeout(4000)
    s0=E(pg,'JSON.stringify(TT.S.prefs)')
    pg.click('#flowBtn'); pg.wait_for_timeout(500)
    ok(E(pg,'flowOn')==True and E(pg,"document.body.classList.contains('flow-on')") and E(pg,"document.getElementById('flowBtn').getAttribute('aria-pressed')")=='true','🔀 button turns the flow view on')
    ok(not E(pg,"document.getElementById('flowLegend').classList.contains('hidden')") and 'Supply flow' in pg.locator('#flowLegend').inner_text(),'legend shows')
    st=E(pg,'flowStats()'); print('   ',st)
    ok(st['n']>=8 and st['sell']>=1,'edges cover the chain and sold goods to the dock')
    ed=E(pg,"flowEdges().map(e=>e.from+'>'+e.to+':'+e.k+':'+e.state)")
    ok('yard>sawmill:logs:ok' in ed or 'yard>sawmill:logs:bad' in ed or any(x.startswith('yard>sawmill:logs') for x in ed),'logs flow from the Log Yard to the Sawmill')
    ok(any(x.startswith('sawmill>carpentry:planks') for x in ed),'planks flow from the Sawmill to the Carpentry')
    # health colours follow the smoothed shortage: starve carpentry hard
    E(pg,"(()=>{S.buildings.sawmill.lvl=1;S.buildings.carpentry.lvl=60;S.res.planks=0;M=computeMods();for(let k=0;k<40;k++){S.res.logs=1e9;tick(1,false);}})()")
    ok(any(x.startswith('sawmill>carpentry:planks:bad') for x in E(pg,"flowEdges().map(e=>e.from+'>'+e.to+':'+e.k+':'+e.state)")),'a starved link is drawn as short (red)')
    ok(E(pg,'flowStats().bad')>=1 and 'short' in pg.locator('#flowLegend').inner_text(),'legend counts short links')
    # draws pixels: compare a canvas sample with the view off vs on
    def sig():
        return E(pg,"(()=>{const c=document.querySelector('canvas');const g=c.getContext('2d');const d=g.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=4096) s+=d[i]+d[i+1]*3+d[i+2]*7;return s;})()")
    E(pg,'TT.setPaused&&TT.setPaused(true)'); a=sig(); E(pg,'toggleFlow(false)'); pg.wait_for_timeout(400); b=sig()
    ok(abs(a-b)>1000,f'overlay changes the rendered scene ({a} vs {b})')
    ok(E(pg,"localStorage.getItem('tt_flow')")=='0','choice persisted in localStorage')
    pg.keyboard.press('f'); pg.wait_for_timeout(200); ok(E(pg,'flowOn')==True,'F key toggles the view')
    ok(E(pg,'JSON.stringify(TT.S.prefs)')==s0 and 'flow' not in E(pg,'Object.keys(TT.S)'),'save state untouched by the view')
    # buildings still tappable with the view on
    pt=E(pg,'TT.lotScreen("sawmill")'); E(pg,'TT.closeSheet()'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(300)
    ok(E(pg,'TT.curSheet')=='bld','buildings stay tappable with the flow view on')
    # Replant unchanged (costs reset like before), view survives
    r=E(pg,"(()=>{S.totalEarned=1e15;S.lifetimeEarned=1e15;const s0=S.seeds;try{TT.doPrestige(true)}catch(e){return 'err '+e}return {lvl:S.buildings.sawmill.lvl,seeds:S.seeds>=s0,flow:flowOn};})()")
    ok(isinstance(r,dict) and r['lvl']==0 and r['flow'],f'Replant still resets buildings; view stays on ({r})')
    # perf: frame cost with the view on stays reasonable
    E(pg,SET); E(pg,'toggleFlow(true)'); pg.wait_for_timeout(1500)
    t=E(pg,"(()=>{const t0=performance.now();for(let k=0;k<30;k++) flowOverlay(TT.scene.ctx||document.querySelector('canvas').getContext('2d'));return (performance.now()-t0)/30;})()")
    ok(t<6,f'flow overlay draw cost {t:.2f} ms/frame')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})')
    ctx.close()
    # old save (v2.15.1 shape) loads unchanged, view off
    ctx,pg,errs,bad=page()
    E(pg,"(()=>{const o=JSON.parse(JSON.stringify(TT.S));o.version='2.15.1';localStorage.setItem(Object.keys(localStorage).find(k=>/save/i.test(k))||'timberTycoonSave',JSON.stringify(o));localStorage.removeItem('tt_flow');})()")
    pg.reload(); pg.wait_for_timeout(1500)
    ok(ver(E(pg,'TT.S.version'))>=(2,16) and E(pg,'flowOn')==False and E(pg,"TT.S.prefs.plankMode")=='fair','v2.15.1 save loads, view off by default')
    ok(not errs and not bad,f'migration: no errors ({errs[:3]})'); ctx.close()
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev); E(pg,SET); pg.wait_for_timeout(2500)
        bb=pg.locator('#flowBtn').bounding_box(); ok(bb and bb['height']>=44,f'{dev}: 🔀 button is a big touch target ({bb and bb["height"]})')
        pg.tap('#flowBtn'); pg.wait_for_timeout(600); ok(E(pg,'flowOn')==True,f'{dev}: tap turns the view on')
        lg=pg.locator('#flowLegend').bounding_box(); vw=E(pg,'innerWidth')
        ok(lg and lg['x']>=0 and lg['x']+lg['width']<=vw+1,f'{dev}: legend fits the screen')
        if dev=='iPhone 13': pg.screenshot(path=ROOT+'/test/v216_mobile.png')
        pg.tap('#flowBtn'); pg.wait_for_timeout(300); ok(E(pg,'flowOn')==False,f'{dev}: tap again turns it off')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.16'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.16/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.16' and E(pg,'typeof flowOverlay')=='function' and not errs,'releases/v2.16/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.16/ not yet built')
print('ALL PASS' if not FAILS else 'FAILS', len(FAILS), FAILS)
sys.exit(1 if FAILS else 0)
