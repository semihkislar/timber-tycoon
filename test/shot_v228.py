# v2.28 screenshots: the south yard (Beam Saw + Glulam Plant at the bottom of Phase 1 / 2, south gate road, bent highway),
# the Timber-frame Houses workshop at the end of the Phase 3 row, the fit view, supply flow and night.
# Serve the repo root on :9400 or set TT_URL; without either, test/_server.py is used.
from playwright.sync_api import sync_playwright
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import sys as _s,os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); from shots import shot_dir
R=shot_dir('2.28')
if 'TT_URL' in os.environ: URL=os.environ['TT_URL']
else:
    from _server import URL
ST='''(()=>{window.toast=()=>{};S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,30);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',20);
  for(const b of ['atelier','parquet','stationer','cabinetry','showroom','framer']) TT.buyBuilding(b,12);TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();TT.buyStation&&TT.buyStation();
  S.coins=1e9;S.playTime=5000;S.time=5000;document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.mish.next=S.time+1e9;checkAch();for(const k in achFresh) delete achFresh[k];
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
        pg.screenshot(path=R+f'{tag}-layout.png')
        aim(pg,31,30,1.7 if not dev else 2.1); pg.evaluate(CLEAN); pg.screenshot(path=R+f'{tag}-southyard.png')
        aim(pg,36,25,.95 if not dev else 1.2); pg.evaluate(CLEAN); pg.screenshot(path=R+f'{tag}-highway.png')
        pg.evaluate("(()=>{const L=LOTS.framer;window._fp=[L.ci,L.cj];})()"); fi,fj=pg.evaluate("window._fp")
        aim(pg,fi,fj,1.7 if not dev else 2.1); pg.evaluate(CLEAN); pg.screenshot(path=R+f'{tag}-houses.png')
        pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(600); pg.evaluate("toggleFlow(true)"); pg.wait_for_timeout(900)
        pg.screenshot(path=R+f'{tag}-flow.png'); pg.evaluate("toggleFlow(false)")
        pg.evaluate("TT.setClock&&TT.setClock(22*60)"); aim(pg,29,29,1.3 if not dev else 1.6); pg.wait_for_timeout(800); pg.screenshot(path=R+f'{tag}-night.png')
        pg.evaluate("TT.setClock&&TT.setClock(9*60)")
        print(tag,errs); ctx.close()
