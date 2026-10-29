from playwright.sync_api import sync_playwright
import os
import sys as _s,os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); from shots import shot_dir
R=shot_dir('2.24')
URL=os.environ.get('TT_URL','http://localhost:9400/index.html')   # serve the repo root on :9400
ST='''(()=>{const B=1e10;window.toast=()=>{};S.premium.lvl=1;for(const n of RNODES) S.research[n.id]=1;S.trade.lvl=Math.max(1,S.trade.lvl||0);
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}
 for(const c of COLLECTORS) S.collectors[c.id]=400;S.forest.m=1e9;S.coins=5e10;S.totalEarned=1e12;S.power.lvl=4;S.power.logs='first';S.power.res=60;
 document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;
 M=computeMods();for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(ST); pg.wait_for_timeout(1500)
        tag='mobile' if dev else 'desktop'
        pg.evaluate("TT.openSheet('power')"); pg.wait_for_timeout(2500)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(800)
        pg.screenshot(path=R+f'{tag}-power.png')
        if dev:
            pg.evaluate("document.getElementById('pwKv').scrollIntoView({block:'end'})"); pg.wait_for_timeout(500)
            pg.screenshot(path=R+f'{tag}-power-logs.png')
        pg.evaluate("TT.closeSheet();TT.openSheet('bld','plymill')"); pg.wait_for_timeout(1500)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(800)
        pg.screenshot(path=R+f'{tag}-plymill.png')
        print(tag,errs)
        ctx.close()
