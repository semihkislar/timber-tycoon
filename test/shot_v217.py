# v2.17 screenshots: line specialisations (desktop scene + sheet, phone sheet). Usage: python3 test/shot_v217.py
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT
SET='''(()=>{const S=TT.S;S.coins=5e12;S.totalEarned=6e12;for(const c of COLLECTORS) TT.buyCollector(c.id,60);for(const p of PLANTERS) buyPlanter(p.id,25);
 for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,30);
 Object.assign(S.buildings.sawmill,{lvl:120});Object.assign(S.buildings.chipper,{lvl:205});Object.assign(S.buildings.kiln,{lvl:210});Object.assign(S.buildings.carpentry,{lvl:58});
 Object.assign(S.buildings.pellet,{lvl:52});Object.assign(S.buildings.paper,{lvl:60});Object.assign(S.buildings.furniture,{lvl:40});
 for(const u of UPGRADES) S.upgrades[u.id]=true; S.coins=4.2e9;M=computeMods();TT.rebuildAll();
 S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;
 specPick('sawmill','speed');specPick('kiln','craft');specPick('chipper','lean');specPick('paper','craft');specPick('pellet','lean');
 for(const k in S.ach) S.ach[k]=S.ach[k]||1;checkAch(true);
 setTimeout(()=>document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove()),50);})()'''
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove())"
with sync_playwright() as p:
    br=p.chromium.launch()
    ctx=br.new_context(viewport={'width':1400,'height':900},service_workers='block'); pg=ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(SET); pg.wait_for_timeout(2500); pg.evaluate(CLEAN)
    pg.evaluate("(()=>{const L=TT.LOTS.carpentry;const p=TT.P(L.ci-1.5,L.cj-2.5,30);flyToWorld(p[0],p[1],1.25,10);})()"); pg.wait_for_timeout(1500)
    pg.screenshot(path=ROOT+'/screenshot-v217-banners.png')
    pg.evaluate("TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(1500); pg.evaluate(CLEAN)
    pg.evaluate("document.getElementById('bpSpec').scrollIntoView({block:'end'})"); pg.wait_for_timeout(600); pg.evaluate(CLEAN)
    pg.screenshot(path=ROOT+'/screenshot-v217.png'); ctx.close()
    d=dict(p.devices['iPhone 13']); d.pop('default_browser_type',None)
    ctx=br.new_context(**d,service_workers='block'); pg=ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate(SET); pg.wait_for_timeout(2500)
    pg.evaluate("TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(1500); pg.evaluate(CLEAN)
    pg.evaluate("(()=>{const b=document.getElementById('shBody'),e=document.getElementById('bpSpec');b.scrollTop+=e.getBoundingClientRect().top-b.getBoundingClientRect().top-6;})()"); pg.wait_for_timeout(600); pg.evaluate(CLEAN)
    pg.screenshot(path=ROOT+'/screenshot-v217-mobile.png'); ctx.close()
print('ok')
