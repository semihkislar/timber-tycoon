# v2.17: Line specialisations — from Lv 50 (★3) each production building runs one of three lines (⚡ High-speed, ♻️ Lean, 💎 Master craft),
# tiers I/II/III at Lv 50/100/200, free first pick, 30 s retool when switching (two-tap confirm), advisor, banner in the scene, attention entry,
# trophies, Replant keeps the pick (costs still reset), v2.16 save migration, offline, phones, snapshot.
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
 for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,30);S.buildings.sawmill.lvl=30;S.buildings.carpentry.lvl=44;S.coins=3e9;M=computeMods();TT.rebuildAll();
 S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());})()'''
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove())"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,17),f"VERSION>=2.17 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,17),'sw cache bumped to >= v2.17')
    ok('js/spec.js' in open(ROOT+'/index.html').read() and E(pg,'typeof specPick')=='function','spec.js is loaded')
    ok(E(pg,'JSON.stringify(TT.S.spec)')=='{}' and E(pg,'TT.S.specStats.picks')==0,'fresh game: no specialisations')
    E(pg,SET); pg.wait_for_timeout(1500)
    # locked below Lv 50; teaser in the sheet from Lv 25
    ok(E(pg,"specPick('sawmill','speed')")==False and E(pg,'specTier("sawmill")')==0,'locked below Lv 50')
    E(pg,"TT.openSheet('bld','sawmill')"); pg.wait_for_timeout(500)
    ok(E(pg,"!document.getElementById('bpSpec').classList.contains('hidden')") and 'Lv 50' in pg.locator('#bpSpec').inner_text(),'sheet shows the Lv 50 teaser at Lv 30')
    E(pg,"S.buildings.sawmill.lvl=10;M=computeMods()"); pg.wait_for_timeout(400)
    ok(E(pg,"document.getElementById('bpSpec').classList.contains('hidden')"),'no specialisation block on a low-level building')
    # tiers & effects
    E(pg,"S.buildings.sawmill.lvl=50;M=computeMods()"); pg.wait_for_timeout(500)
    ok(E(pg,'specTier("sawmill")')==1 and E(pg,'specTierAt(99)')==1 and E(pg,'specTierAt(100)')==2 and E(pg,'specTierAt(200)')==3,'tiers I/II/III at Lv 50/100/200')
    ok(pg.locator('#bpSpec .bspec-o').count()==3,'three line options in the sheet')
    ok(any(x['id']=='sawmill' and x['k']=='spec' for x in E(pg,"attentionList().map(a=>({id:a.id,k:a.k}))")),'needs-attention lists the unpicked specialisation')
    sp0=E(pg,"TT.bSpeed('sawmill')"); in0=E(pg,"bInMult('sawmill')")
    pg.click('#bpSpec .bspec-o[data-k="speed"]'); pg.wait_for_timeout(400)
    ok(E(pg,"S.spec.sawmill&&S.spec.sawmill.k")=='speed' and E(pg,"S.spec.sawmill.rt")==0,'first pick by tap is instant (no retool)')
    rs=E(pg,"(()=>{const a=TT.bSpeed('sawmill'),ai=bInMult('sawmill');const s=S.spec.sawmill;delete S.spec.sawmill;M=computeMods();const b=TT.bSpeed('sawmill'),bi=bInMult('sawmill');S.spec.sawmill=s;M=computeMods();return [a/b,ai/bi];})()")
    ok(abs(rs[0]-1.4)<1e-6 and abs(rs[1]-1.15)<1e-6 and sp0>0 and in0>0,f'High-speed I: speed ×1.4, input ×1.15 ({rs[0]:.3f}, {rs[1]:.3f})')
    ok(E(pg,"TT.S.ach.spec1")>0,'trophy "Specialist" unlocked')
    ok(not any(x['id']=='sawmill' and x['k']=='spec' for x in E(pg,"attentionList().map(a=>({id:a.id,k:a.k}))")),'attention entry gone after picking')
    ok('⚡' in E(pg,"specTag('sawmill')"),'level tag carries the line icon')
    E(pg,"S.buildings.sawmill.lvl=100;M=computeMods()")
    r=E(pg,"TT.bSpeed('sawmill')/(TT.bSpeed('sawmill')/specSpd('sawmill'))"); ok(abs(r-1.6)<1e-6,f'High-speed II = ×1.6 ({r})')
    E(pg,"S.buildings.sawmill.lvl=50;M=computeMods()")
    # two-tap switch -> retool
    pg.click('#bpSpec .bspec-o[data-k="lean"]'); pg.wait_for_timeout(300)
    ok(E(pg,"S.spec.sawmill.k")=='speed' and 'again' in pg.locator('#bpSpec').inner_text().lower(),'switching asks for a second tap')
    pg.click('#bpSpec .bspec-o[data-k="lean"]'); pg.wait_for_timeout(300)
    ok(E(pg,"S.spec.sawmill.k")=='lean' and E(pg,"specRetool('sawmill')")>29,'second tap switches and starts a 30 s retool')
    ok(abs(E(pg,"specSpd('sawmill')")-0.25)<1e-9 and E(pg,"bInMult('sawmill')/mgrIn('sawmill')")==1,'retooling: 25% speed, no line effect yet')
    ok('Retooling' in pg.locator('#bpSpec').inner_text(),'sheet shows the retool countdown')
    E(pg,"(()=>{for(let k=0;k<31;k++){S.res.logs=1e9;tick(1,false);}})()")
    ok(E(pg,"specRetool('sawmill')")==0 and abs(E(pg,"bInMult('sawmill')/mgrIn('sawmill')")-0.8)<1e-9 and E(pg,"specSpd('sawmill')")==1,'after the retool: Lean I (input ×0.8, normal speed)')
    # lean saves real logs in the simulation
    def logs_used(spec):
        return E(pg,"(()=>{for(const b of BUILDINGS) S.buildings[b.id].on=b.id==='sawmill';S.spec.sawmill=%s;M=computeMods();for(let k=0;k<25;k++){S.res.logs=1e9;S.res.planks=0;tick(1,false);}return TT.rates.logs.c;})()"%spec)
    u0=logs_used('undefined'); u1=logs_used("{k:'lean',rt:0}")
    ok(u0>0 and abs(u1/u0-0.8)<0.02,f'lean line uses 20% fewer logs in the sim ({u1:.0f} vs {u0:.0f})')
    E(pg,"for(const b of BUILDINGS) S.buildings[b.id].on=true")
    # craft raises the price of its goods
    pr0=E(pg,"TT.price('planks')"); E(pg,"S.spec.sawmill={k:'craft',rt:0};M=computeMods()"); pr1=E(pg,"TT.price('planks')")
    ok(abs(pr1/pr0-1.25)<1e-6,f'Master craft I: planks sell ×1.25 ({pr1/pr0:.3f})')
    # advisor
    E(pg,"(()=>{S.spec={};S.buildings.carpentry.lvl=60;S.buildings.sawmill.lvl=1;S.res.planks=0;M=computeMods();for(let k=0;k<40;k++){S.res.logs=1e9;tick(1,false);}})()")
    ok(E(pg,"specSuggest('carpentry').k")=='lean','advisor: a starved building is told to go lean')
    E(pg,"(()=>{S.buildings.sawmill.lvl=60;S.buildings.furniture.lvl=0;M=computeMods();for(let k=0;k<30;k++){S.res.logs=1e9;tick(1,false);}})()")
    ok(E(pg,"specSuggest('kiln')&&specSuggest('kiln').k")=='craft','advisor: a building whose goods are sold is told to craft')
    # milestone toast mentions the unlock
    E(pg,"(()=>{"+CLEAN+";S.buildings.chipper.lvl=49;S.coins=1e15;TT.buyBuilding('chipper',1);})()"); pg.wait_for_timeout(200)
    ok('Specialisation unlocked' in pg.locator('#toasts').inner_text(),'Lv 50 milestone toast announces the unlock')
    # offline completes a retool
    E(pg,"(()=>{S.buildings.chipper.lvl=60;specPick('chipper','lean');specPick('chipper','speed');TT.simulateOffline(45);})()")
    ok(E(pg,"specRetool('chipper')")==0 and E(pg,"S.spec.chipper.k")=='speed','offline time finishes a retool')
    # scene: banner is drawn (cached sprite) and cheap
    E(pg,"(()=>{"+CLEAN+";TT.closeSheet();specPick('sawmill','speed');const L=TT.LOTS.sawmill;const p=TT.P(L.ci,L.cj,30);flyToWorld(p[0],p[1],1.6,10);})()"); pg.wait_for_timeout(2500)
    ok(E(pg,"[...SPR.map.keys()].some(k=>k.startsWith('spb'))"),'specialisation banner is drawn in the scene (cached sprite)')
    t=E(pg,"(()=>{const c=TT.scene.ctx;const L=TT.LOTS.sawmill,B=lotBox(L);const t0=performance.now();for(let k=0;k<300;k++) specBanner(c,L,B);return (performance.now()-t0)/300;})()")
    ok(t<0.3,f'banner draw cost {t*1000:.0f} µs')
    # Replant: picks kept, levels/costs reset, effect returns at Lv 50
    r=E(pg,"(()=>{S.spec.sawmill={k:'lean',rt:S.time+20};S.totalEarned=1e15;S.lifetimeEarned=1e15;TT.doPrestige(true);return {spec:S.spec.sawmill,lvl:S.buildings.sawmill.lvl,cost:Math.abs(TT.bulkCost(BMAP.sawmill.cost,BMAP.sawmill.scale,S.buildings.sawmill.lvl,1)/(BMAP.sawmill.cost*cs())-1)<1e-9,spd:specSpd('sawmill'),inm:specIn('sawmill')};})()")
    ok(r['spec']=={'k':'lean','rt':0} and r['lvl']==0 and r['cost'] and r['spd']==1 and r['inm']==1,f'Replant keeps the pick (retool dropped), resets levels and costs, no effect below Lv 50 ({r})')
    E(pg,"S.buildings.sawmill.lvl=50;M=computeMods()"); ok(abs(E(pg,"specIn('sawmill')")-0.8)<1e-9,'the kept pick switches back on at Lv 50')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})')
    ctx.close()
    # v2.16 save (no spec fields, plus a malformed one) loads
    ctx,pg,errs,bad=page()
    E(pg,"(()=>{const o=JSON.parse(JSON.stringify(TT.S));o.version='2.16';delete o.spec;delete o.specStats;localStorage.setItem(SAVE_KEY,JSON.stringify(o));})()")
    pg.reload(); pg.wait_for_timeout(1500)
    ok(ver(E(pg,'TT.S.version'))>=(2,17) and E(pg,'JSON.stringify(TT.S.spec)')=='{}' and E(pg,'TT.S.specStats.switches')==0,'v2.16 save loads with no specialisations')
    o=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(TT.S));o.spec={sawmill:{k:'turbo'},kiln:{k:'craft'},nope:{k:'lean',rt:0}};return migrateSave(o).spec;})()")
    ok(o=={'kiln':{'k':'craft','rt':0}},f'malformed entries are dropped on load ({o})')
    ok(not errs and not bad,f'migration: no errors ({errs[:3]})'); ctx.close()
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev); E(pg,SET); E(pg,"S.buildings.carpentry.lvl=55;M=computeMods()"); pg.wait_for_timeout(1500)
        E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(900)
        E(pg,"document.querySelector('#bpSpec .bspec-o[data-k=\"lean\"]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        bb=pg.locator('#bpSpec .bspec-o[data-k="lean"]').bounding_box(); vw=E(pg,'innerWidth')
        ok(bb and bb['height']>=48 and bb['x']>=0 and bb['x']+bb['width']<=vw+1,f'{dev}: line buttons are big and fit ({bb and round(bb["height"])} px)')
        pg.tap('#bpSpec .bspec-o[data-k="lean"]'); pg.wait_for_timeout(400)
        ok(E(pg,"S.spec.carpentry&&S.spec.carpentry.k")=='lean',f'{dev}: tap picks a line')
        if dev=='iPhone 13': pg.screenshot(path=ROOT+'/test/v217_mobile.png')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.17'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.17/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.17' and E(pg,'typeof specPick')=='function' and not errs and not bad,'releases/v2.17/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.17/ not yet built')
print('ALL PASS' if not FAILS else 'FAILS', len(FAILS), FAILS)
sys.exit(1 if FAILS else 0)
