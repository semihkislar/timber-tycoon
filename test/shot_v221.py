# Feature screenshots for v2.21 Town Market Fleet (+ peeler manager card).
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT
from shots import shot_dir; OUT=shot_dir('2.21')
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;"
MID="S.coins=1e12;S.totalEarned=5e9;for(const c of COLLECTORS) TT.buyCollector(c.id,15);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,18);M=computeMods();for(const r of RES) if(canSell(r.id)) S.autosell[r.id]=true;TT.simulate(30);"
with sync_playwright() as p:
    br=p.chromium.launch()
    # desktop: vans mid-route over the factory lane
    ctx=br.new_context(viewport={'width':1280,'height':860},device_scale_factor=1,service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
    pg=ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1600)
    pg.evaluate(CLEAN+MID)
    pg.evaluate("(()=>{scene._mktCD=0;for(let i=0;i<50;i++) mktFleetUpdate(0.2);const v=(scene.marketVans||[]).find(x=>x.i!==undefined)||scene.marketVans[0];if(v&&v.i!==undefined){const [x,y]=P(v.i,v.j);scene.cam.tx=x;scene.cam.ty=y;scene.cam.x=x;scene.cam.y=y;scene.cam.tz=1.15;scene.cam.z=1.15;}else TT.fitCamera(true);})()")
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+'market-vans.png')
    print('desktop vans',OUT+'market-vans.png')
    # peeler manager on staff sheet
    pg.evaluate("hireMgr('aylin');openSheet('staff'); if(typeof staffTab!=='undefined'){try{staffTab='mgr';}catch(e){} } renderStaff&&renderStaff(true);")
    pg.wait_for_timeout(700)
    # try to scroll Aylin into view
    pg.evaluate("(()=>{const el=[...document.querySelectorAll('#staffBody .nm,#staffList .nm,b,.card')].find(e=>/Aylin|Peeler|peeler/i.test(e.textContent||'')); if(el) el.scrollIntoView({block:'center'});})()")
    pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'peeler-manager.png')
    print('peeler mgr',OUT+'peeler-manager.png')
    ctx.close()
    # mobile
    d=dict(p.devices['iPhone 13']); d.pop('default_browser_type',None)
    ctx=br.new_context(**d,service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
    pg=ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1600)
    pg.evaluate(CLEAN+MID+"scene._mktCD=0;for(let i=0;i<45;i++) mktFleetUpdate(0.22);const v=(scene.marketVans||[]).find(x=>x.i!==undefined);if(v){const [x,y]=P(v.i,v.j);scene.cam.tx=x;scene.cam.ty=y;scene.cam.x=x;scene.cam.y=y;scene.cam.tz=1.05;scene.cam.z=1.05;}TT.fitCamera&&null;")
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT+'mobile-vans.png')
    print('mobile',OUT+'mobile-vans.png')
    ctx.close(); br.close()
print('done')
