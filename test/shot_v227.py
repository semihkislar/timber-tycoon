# v2.27 screenshots: the new factory layout (overview, helper strip on the right, bottom of the Phase 1 column with the
# Veneer Peeler + dock aisle, night), the quick-jump chips and the Trophies sheet with the new "Factory systems" section.
# Serve the repo root on :9400 or set TT_URL; without either, test/_server.py is used.
from playwright.sync_api import sync_playwright
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
if 'TT_URL' in os.environ: URL=os.environ['TT_URL']
else:
    from _server import URL
ST='''(()=>{window.toast=()=>{};S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture']) TT.buyBuilding(b,30);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const b of ['atelier','parquet','stationer']) TT.buyBuilding(b,12);TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();TT.buyStation&&TT.buyStation();
  S.coins=1e9;S.playTime=5000;S.time=5000;document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.mish.next=S.time+1e9;S.ws.sawmill=[4,3,2];S.mish.stats.n=3;checkAch();for(const k in achFresh) delete achFresh[k];
  M=computeMods();TT.simulate(20);TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
CLEAN="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());scene.particles.length=0;S.orders.offers=[];if(TT.closeSheet) TT.closeSheet();})()"
def aim(pg,i,j,z):
    pg.evaluate(f"(()=>{{const c=scene.cam;const p=P({i},{j},0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*{z};}})()"); pg.wait_for_timeout(1200)
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(ST); pg.wait_for_timeout(2600); pg.evaluate(CLEAN)
        tag='mobile' if dev else 'desktop'
        pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(1400); pg.evaluate(CLEAN); pg.wait_for_timeout(300)
        pg.screenshot(path=R+f'screenshot-v227-{tag}-layout.png')
        aim(pg,21.5,9.5,1.6 if not dev else 2.0); pg.evaluate(CLEAN); pg.screenshot(path=R+f'screenshot-v227-{tag}-helpers.png')
        aim(pg,24.5,20.5,1.6 if not dev else 2.0); pg.evaluate(CLEAN); pg.screenshot(path=R+f'screenshot-v227-{tag}-peeler.png')
        pg.evaluate("TT.setClock&&TT.setClock(22*60)"); aim(pg,20,14,1.15 if not dev else 1.5); pg.wait_for_timeout(800); pg.screenshot(path=R+f'screenshot-v227-{tag}-night.png')
        pg.evaluate("TT.setClock&&TT.setClock(9*60)"); pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(600)
        if dev: pg.locator('#jumpBtn').tap()
        else: pg.locator('#jumpBtn').click()
        pg.wait_for_timeout(500); pg.screenshot(path=R+f'screenshot-v227-{tag}-jump.png')
        pg.evaluate("TT.openSheet('ach')"); pg.wait_for_timeout(700)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('#achGrid .ach-h').scrollIntoView({block:'start'})"); pg.wait_for_timeout(400)
        pg.screenshot(path=R+f'screenshot-v227-{tag}-trophies.png')
        print(tag,errs); ctx.close()
