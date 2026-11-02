# README highlight screenshots of the current build (late game with every line, logistics tiers, decor line and
# workstation sets, seasonal export contracts, v2.39 Plywood Mill sheet, v2.40 Log Yard overflow (Supply Flow + Market); v2.38 copies the First steps shots that test/v238.py writes). Writes screenshots/highlights/*.png and copies the overview shots to screenshots/history/v<VERSION>/.
#   python3 test/shot_highlights.py            (set TT_URL to shoot another server, e.g. the live Pages site)
from playwright.sync_api import sync_playwright
import os,sys,shutil
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from shots import shot_dir,highlight_path,version
if 'TT_URL' in os.environ: URL=os.environ['TT_URL']
else:
    from _server import URL
ST='''(()=>{window.toast=()=>{};S.coins=1e16;S.totalEarned=1e16;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,40);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',25);TT.buyBuilding('panelpress',15);
  for(const b of ['atelier','parquet','stationer','cabinetry','showroom','framer','decorstudio']) TT.buyBuilding(b,14);TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();TT.buyStation&&TT.buyStation();
  S.coins=1e16;for(let k=0;k<7;k++) logiBuy();for(const l of BELT_LINKS) for(let k=0;k<4;k++) beltBuy(l.src);for(let k=0;k<4;k++) cdBuy();
  S.ws.sawmill=[10,10,10];S.ws.carpentry=[5,5,5];S.ws.chipper=[5,5,5];S.ws.kiln=[6,5,7];
  S.coins=3.2e11;S.playTime=6000;S.time=6000;document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.clock=600;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;
  checkAch();for(const k in achFresh) delete achFresh[k];M=computeMods();TT.simulate(25);TT.rebuildAll&&TT.rebuildAll();TT.render();
  return {fk:S.logi.fk,drone:S.logi.drone,belt:JSON.stringify(S.logi.belt),ws:wsSetTier('sawmill')};})()'''
CLEAN="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());scene.particles.length=0;S.orders.offers=[];if(TT.closeSheet) TT.closeSheet();})()"
def aim(pg,i,j,z):
    pg.evaluate(f"(()=>{{const c=scene.cam;const p=P({i},{j},0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*{z};}})()"); pg.wait_for_timeout(1300)
H=shot_dir(); errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1440,'height':900},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_timeout(1500); print(pg.evaluate(ST)); pg.wait_for_timeout(2500); pg.evaluate(CLEAN)
        tag='mobile' if dev else 'desktop'
        I,J,Z=[float(x) for x in os.environ.get('AIM_'+tag.upper(),'18,16,1.15' if not dev else '16,15,1.6').split(',')]
        aim(pg,I,J,Z); pg.evaluate(CLEAN); pg.wait_for_timeout(400)
        pg.screenshot(path=highlight_path(f'{tag}.png'))
        pg.evaluate("TT.setClock&&TT.setClock(21*60+30)"); aim(pg,I,J,Z*1.25); pg.evaluate(CLEAN); pg.wait_for_timeout(900)
        pg.screenshot(path=highlight_path(f'{tag}-night.png')); pg.evaluate("TT.setClock&&TT.setClock(10*60)"); pg.wait_for_timeout(500)
        pg.evaluate("openSheet('bld','sawmill');bpTab('ws')"); pg.wait_for_timeout(800)
        pg.evaluate("(()=>{const e=document.querySelector('#bpWs .ws-sets');if(e) e.scrollIntoView({block:'center'});document.querySelectorAll('.toast').forEach(t=>t.remove());})()"); pg.wait_for_timeout(400)
        pg.screenshot(path=highlight_path(f'{tag}-workstation-sets.png')); pg.evaluate(CLEAN)
        # v2.37 seasonal export contracts: winter, signed and part filled, Orders → Season tab
        pg.evaluate('''(()=>{TT.setClock(TT.DAY_LEN*TT.SEASON_DAYS*3+600);S.seas.key=-1;S.seas.next=0;tick(.1,false);S.seas.next=0;S.time+=1;tick(.1,false);
          if(S.seas.st==='offer') scAccept();for(let k=0;k<30;k++){S.forest.m=1e9;tick(1,false);}TT.setClock(TT.DAY_LEN*TT.SEASON_DAYS*3+640);openSeason();})()''')
        pg.wait_for_timeout(900); pg.evaluate("(()=>{document.querySelectorAll('.toast').forEach(t=>t.remove());scene.particles.length=0;const f=document.getElementById('fxLayer');if(f) f.innerHTML='';if(innerWidth<=720&&TT.setSheetState) TT.setSheetState('full');document.getElementById('shBody').scrollTop=0;})()"); pg.wait_for_timeout(400)
        pg.screenshot(path=highlight_path(f'{tag}-seasonal.png')); pg.evaluate(CLEAN); pg.evaluate("TT.setClock&&TT.setClock(10*60)")
        if not dev:
            pg.evaluate("TT.fitCamera(true)"); pg.wait_for_timeout(700); pg.evaluate("toggleFlow(true)"); pg.wait_for_timeout(1000)
            pg.screenshot(path=highlight_path('desktop-supply-flow.png')); pg.evaluate("toggleFlow(false)")
        # v2.39 late-game plywood balance: the Plywood Mill sheet (press yield, balance and supply-parity lines)
        aim(pg,I,J,Z)
        pg.evaluate("(()=>{TT.setClock&&TT.setClock(10*60);S.coins=1e16;TT.buyBuilding('peeler',30);for(const b of ['parquet','cabinetry','framer','decorstudio']) TT.buyBuilding(b,8);S.coins=3.2e11;M=computeMods();for(let k=0;k<30;k++){S.forest.m=1e9;tick(1,false);}TT.render();openSheet('bld','plymill');bpTab('ov');})()"); pg.wait_for_timeout(800)
        pg.evaluate("(()=>{document.querySelectorAll('.toast').forEach(t=>t.remove());scene.particles.length=0;const f=document.getElementById('fxLayer');if(f) f.innerHTML='';for(const k in achFresh) delete achFresh[k];if(innerWidth<=720&&TT.setSheetState) TT.setSheetState('full');const e=document.getElementById('plyBal');if(e) e.scrollIntoView({block:'center'});})()"); pg.wait_for_timeout(500)
        pg.screenshot(path=highlight_path(f'{tag}-plywood.png')); pg.evaluate(CLEAN)
        # v2.40 Log Yard overflow: collectors well past what the mills use, full yard, Supply Flow on (HUD ↪ rate, overflow line, teal arcs)
        pg.evaluate('''(()=>{TT.closeSheet&&TT.closeSheet();S.coins=1e16;S.power.logs='surplus';for(const c of COLLECTORS) S.collectors[c.id]=0;S.collectors.lumberjack=1;M=computeMods();
          S.collectors.lumberjack=Math.round(1.25*pwLogUse()/logRatePot());M=computeMods();S.res.logs=logCap();for(let k=0;k<40;k++){S.forest.m=1e9;tick(.5,false);}S.coins=3.2e11;TT.render();})()''')
        if dev: pg.evaluate("(()=>{const c=scene.cam;const a=P(YARD.ci,YARD.cj,0),b=P(LOTS.chipper.ci,LOTS.chipper.cj,0);c.fly=null;c.x=c.tx=(a[0]+b[0])/2;c.y=c.ty=(a[1]+b[1])/2+60;c.z=c.tz=c.fitZ*1.25;})()")
        else: pg.evaluate("TT.fitCamera(true)")
        pg.wait_for_timeout(900); pg.evaluate("toggleFlow(true)"); pg.wait_for_timeout(1600); pg.evaluate(CLEAN)
        pg.screenshot(path=highlight_path(f'{tag}-overflow.png')); pg.evaluate("toggleFlow(false)")
        pg.evaluate("openSheet('market')"); pg.wait_for_timeout(800)
        pg.evaluate("(()=>{document.querySelectorAll('.toast').forEach(t=>t.remove());if(innerWidth<=720&&TT.setSheetState) TT.setSheetState('full');const e=document.querySelector('#mktBody tr.raw');if(e) e.scrollIntoView({block:'center'});})()"); pg.wait_for_timeout(500)
        pg.screenshot(path=highlight_path(f'{tag}-overflow-market.png')); pg.evaluate(CLEAN)
        ctx.close()
    b.close()
for n in ['desktop','mobile','mobile-seasonal']:
    shutil.copy(highlight_path(n+'.png'),H+n+'.png')
shutil.copy(highlight_path('desktop-seasonal.png'),H+'seasonal.png')
shutil.copy(highlight_path('desktop-plywood.png'),H+'plywood.png'); shutil.copy(highlight_path('mobile-plywood.png'),H+'mobile-plywood.png')
for n in ['overflow','overflow-market']:   # v2.40 Log Yard overflow
    shutil.copy(highlight_path('desktop-'+n+'.png'),H+n+'.png'); shutil.copy(highlight_path('mobile-'+n+'.png'),H+'mobile-'+n+'.png')
for n in ['onboarding','mobile-onboarding']:   # v2.38: the First steps guide shots come from test/v238.py (a fresh save)
    for src in [H+n+'.png',shot_dir('2.38')+n+'.png']:   # newest release that has them (v2.38 wrote them to its own folder)
        if os.path.exists(src): shutil.copy(src,highlight_path(n+'.png')); break
print('errors:',errs[:5]); print('wrote',os.path.dirname(highlight_path('x')),'and',H)
