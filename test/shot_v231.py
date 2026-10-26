# v2.31 screenshots: conveyor belts (logistics tier 2) across the lane, close-ups, the Logistics ladder in the Shipping sheet,
# Supply Flow and night, desktop + iPhone 13. Writes screenshot-v2.31.png (desktop overview) and screenshot-v231-*.png.
# Serve the repo root or set TT_URL; without it, test/_server.py is used.
from playwright.sync_api import sync_playwright
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
if 'TT_URL' in os.environ: URL=os.environ['TT_URL']
else:
    from _server import URL
ST='''(()=>{window.toast=()=>{};S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,30);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',20);
  for(const b of ['atelier','parquet','stationer','cabinetry','showroom','framer']) TT.buyBuilding(b,12);TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();TT.buyStation&&TT.buyStation();
  for(let k=0;k<4;k++) logiBuy();S.coins=1e15;const lv={sawmill:6,chipper:4,peeler:3,beamsaw:2};for(const l of BELT_LINKS) for(let k=0;k<lv[l.src];k++) beltBuy(l.src);
  S.coins=1e9;S.playTime=5000;S.time=5000;document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.mish.next=S.time+1e9;S.prefs.autoFocus=false;checkAch();for(const k in achFresh) delete achFresh[k];
  M=computeMods();TT.simulate(20);TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
CLEAN="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());scene.particles.length=0;S.orders.offers=[];if(TT.closeSheet) TT.closeSheet();})()"
def aim(pg,i,j,z):
    pg.evaluate(f"(()=>{{const c=scene.cam;const p=P({i},{j},0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*{z};}})()"); pg.wait_for_timeout(1300)
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(ST); pg.wait_for_timeout(2600); pg.evaluate(CLEAN)
        tag='mobile' if dev else 'desktop'
        aim(pg,16,15,1.25 if not dev else 1.7); pg.evaluate(CLEAN); pg.wait_for_timeout(300)
        pg.screenshot(path=R+('screenshot-v2.31.png' if not dev else 'screenshot-v2.31-mobile.png'))
        aim(pg,12,11,3.0 if not dev else 2.4); pg.evaluate(CLEAN); pg.screenshot(path=R+f'screenshot-v231-{tag}-belts.png')
        aim(pg,29,28,2.2 if not dev else 2.2); pg.evaluate(CLEAN); pg.screenshot(path=R+f'screenshot-v231-{tag}-southbelts.png')
        pg.evaluate("TT.openSheet('ship')"); pg.wait_for_timeout(900); pg.evaluate("(()=>{const e=$('lgBox');if(e) e.scrollIntoView({block:'start'});})()"); pg.wait_for_timeout(500)
        pg.screenshot(path=R+f'screenshot-v231-{tag}-ladder.png'); pg.evaluate(CLEAN)
        pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(600); pg.evaluate("toggleFlow(true)"); pg.wait_for_timeout(900)
        pg.screenshot(path=R+f'screenshot-v231-{tag}-flow.png'); pg.evaluate("toggleFlow(false)")
        pg.evaluate("TT.setClock&&TT.setClock(22*60)"); aim(pg,16,15,1.8); pg.wait_for_timeout(800); pg.screenshot(path=R+f'screenshot-v231-{tag}-night.png')
        pg.evaluate("TT.setClock&&TT.setClock(9*60)")
        print(tag,errs); ctx.close()
