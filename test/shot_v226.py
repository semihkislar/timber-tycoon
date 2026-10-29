# v2.26 screenshots: bad-luck events - scene with a broken-down building + storm damage, the building sheet's Repair panel,
# and the Safety & Insurance sheet (odds now, repairs, insurance, event log). Serve the repo root on :9400 or set TT_URL.
from playwright.sync_api import sync_playwright
import os
import sys as _s,os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); from shots import shot_dir
R=shot_dir('2.26')
URL=os.environ.get('TT_URL','http://localhost:9400/index.html')
ST='''(()=>{window.toast=()=>{};S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture']) TT.buyBuilding(b,15);S.coins=1e9;S.playTime=5000;S.time=5000;
  document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;
  M=computeMods();TT.simulate(30);S.res.logs=Math.max(S.res.logs,1e5);for(const k of ['planks','chips','charcoal','pellets']) S.res[k]=Math.max(S.res[k],5000);
  S.mish.ins=1;
  for(const id of ['audit','theft','flood']){mishApply(id);S.time+=600;}
  for(const k in S.mish.broke) delete S.mish.broke[k];
  const P=mishPickBld;window.mishPickBld=()=>BUILDINGS.find(b=>b.id==='sawmill');mishApply('gale');window.mishPickBld=()=>BUILDINGS.find(b=>b.id==='kiln');mishApply('breakdown');window.mishPickBld=P;
  S.mish.next=S.time+437;TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(ST); pg.wait_for_timeout(600)
        tag='mobile' if dev else 'desktop'
        pg.evaluate("TT.focusLot('kiln',true)"); pg.wait_for_timeout(1800)
        pg.screenshot(path=R+f'{tag}-scene.png')
        pg.evaluate("TT.openSheet('bld','kiln')"); pg.wait_for_timeout(900)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(600); pg.evaluate("document.getElementById('bpRepair').scrollIntoView({block:'center'})"); pg.wait_for_timeout(400)
        pg.screenshot(path=R+f'{tag}-repair.png')
        pg.evaluate("TT.closeSheet();TT.openSheet('risk')"); pg.wait_for_timeout(900)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(600)
        pg.screenshot(path=R+f'{tag}-safety.png')
        pg.evaluate("document.querySelector('#riskBody .risk-log').scrollIntoView({block:'end'})"); pg.wait_for_timeout(400)
        pg.screenshot(path=R+f'{tag}-log.png')
        print(tag,errs)
        ctx.close()
