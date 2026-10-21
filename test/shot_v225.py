# v2.25 screenshots: the client order board (several offers + running orders) and the day's contracts after a Replant.
# Serve the repo root on :9400 (python3 -m http.server 9400) or set TT_URL.
from playwright.sync_api import sync_playwright
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
URL=os.environ.get('TT_URL','http://localhost:9400/index.html')
ST='''(()=>{const B=1e10;window.toast=()=>{};S.premium.lvl=1;for(const n of RNODES) S.research[n.id]=1;S.trade.lvl=Math.max(1,S.trade.lvl||0);
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}
 for(const c of COLLECTORS) S.collectors[c.id]=400;S.forest.m=1e9;S.coins=5e10;S.totalEarned=1e12;S.power.lvl=4;
 document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;
 M=computeMods();for(let k=0;k<90;k++){S.forest.m=1e9;tick(1,false);}
 const O=S.orders;O.offer=null;O.active=null;offerOrder('cabinets');offerOrder('furniture');acceptOrder();acceptOrder();offerOrder('flooring');offerOrder('chairs');
 for(const o of O.acts){o.got=o.amt*(.3+Math.random()*.4);o.amt*=1;}O.next=S.time+1e6;
 TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch()
    for dev in [None,'iPhone 13']:
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");localStorage.clear()}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(ST); pg.wait_for_timeout(2500)
        tag='mobile' if dev else 'desktop'
        pg.evaluate("for(const o of S.orders.acts) o.amt=Math.max(o.amt,o.got*1.6)")
        pg.screenshot(path=R+f'screenshot-v225-{tag}-scene.png')
        pg.evaluate("TT.ordTab='clients';TT.openSheet('ord')"); pg.wait_for_timeout(1800)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(800)
        pg.screenshot(path=R+f'screenshot-v225-{tag}-board.png')
        if dev:
            pg.evaluate("document.querySelector('#ordBody .ord-card.offer').scrollIntoView({block:'start'})"); pg.wait_for_timeout(500)
            pg.screenshot(path=R+f'screenshot-v225-{tag}-offers.png')
        # the day's contracts right after a Replant (forest value ×90), once the first lines run
        pg.evaluate('''(()=>{TT.closeSheet();S.totalEarned=1e15;S.seeds=0;S.legacy=Math.max(S.legacy||0,2000);doPrestige();window.toast=()=>{};S.orders.next=S.time+1e6;
          buyBuilding('sawmill',1,{logsOnly:true});S.coins=1e9*cs();buyCollector('lumberjack',40);
          for(const [b,n] of [['sawmill',30],['chipper',15],['kiln',10],['peeler',10]]){S.coins=1e30;buyBuilding(b,n);}S.coins=2e9*cs();M=computeMods();
          for(let k=0;k<90;k++){S.forest.m=1e9;tick(1,false);}S.coins=coinRate*45;TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''); pg.wait_for_timeout(1500)
        pg.evaluate("TT.ordTab='daily';TT.openSheet('ord')"); pg.wait_for_timeout(1800)
        if dev: pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(800)
        pg.screenshot(path=R+f'screenshot-v225-{tag}-daily.png')
        print(tag,errs)
        ctx.close()
