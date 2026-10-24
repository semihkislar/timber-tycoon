# v2.28.1 maintenance day: damaged-save robustness, mobile market table fit, toasts clear of full sheets, stale mishap callouts,
# Replant advice text, renamed / clarified upgrade + research text, paper/chair recipe tweaks. Desktop + iPhone 13 / Pixel 7.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;})()"
LATE='''(()=>{const B=1e13;S.premium.lvl=1;for(const n of RNODES) S.research[n.id]=1;S.trade.lvl=Math.max(1,S.trade.lvl||0);
 for(const c of COLLECTORS) S.collectors[c.id]=300;
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.floor(Math.log(B/b.cost)/Math.log(b.scale));S.buildings[b.id].on=true;}
 S.coins=5e12;S.totalEarned=1e14;M=computeMods();for(let k=0;k<40;k++) tick(1,false);TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
SAVES={'nullblds':'{"version":"2.20","buildings":null,"coins":5}','strcoins':'{"version":"2.27","coins":"abc","totalEarned":null}',
 'inf':'{"version":"2.27","coins":1e400,"buildings":{"sawmill":{"lvl":-3}},"res":{"planks":"x"},"collectors":{"lumberjack":-4}}',
 'badsub':'{"version":"2.26","orders":5,"mish":"x","staff":null,"ws":[],"ship":7,"builders":null,"research":[]}','garbage':'{garb'}
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1300); return ctx,pg
    ctx,pg=page(); pg.evaluate(QUIET)
    ok(ver(pg.evaluate('TT.VERSION'))>=(2,28,1),f"VERSION >= 2.28.1 ({pg.evaluate('TT.VERSION')})")
    r=pg.evaluate("[BMAP.paper.inp.chips,BMAP.showroom.inp.chairs,BMAP.boatyard.inp.chairs,BMAP.paper.out.paper]")
    ok(r==[40,2,2,10],f"recipes: Showroom 2 chairs; Paper Mill and Boat Yard unchanged (lighter recipes starved plywood in the v224 sim) ({r})")
    ok(pg.evaluate("tierViolations().length")==0,'tier rule still holds')
    ok(pg.evaluate("UPGRADES.find(u=>u.id==='export').name")=='Export Licence','the price upgrade no longer shares a name with export contracts')
    ok('cabinets' in pg.evaluate("RNMAP.master.d"),'Masterworks lists what it boosts')
    r=pg.evaluate("(()=>{S.totalEarned=0;const a=rpAdvice();return a.t;})()")
    ok('% there' in r,f"Replant card shows progress to the first Seed ({r})")
    r=pg.evaluate("(()=>{scene.mishFx=[{id:'breakdown',at:'paper',t:0,v:0},{id:'breakdown',at:'sawmill',t:0,v:0}];S.buildings.paper.lvl=0;S.buildings.sawmill.lvl=3;})()"); pg.wait_for_timeout(300); r=pg.evaluate("scene.mishFx.map(f=>f.at)")
    ok(r==['sawmill'],f"breakdown callouts over emptied lots are dropped ({r})")
    pg.evaluate("(()=>{scene.mishFx=Array.from({length:9},()=>({id:'breakdown',at:'sawmill',t:0,v:0}));})()"); pg.wait_for_timeout(300); r=pg.evaluate("scene.mishFx.length")
    ok(r<=4,f"at most 4 mishap callouts at once ({r})")
    ctx.close()
    for k,v in SAVES.items():
        ctx,pg=page(tag=k+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.clear();localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(v))
        r=pg.evaluate("(()=>{for(let k=0;k<10;k++) tick(1,false);TT.render();return [typeof S.coins,isFinite(S.coins),S.coins>=0,BUILDINGS.every(b=>Number.isInteger(S.buildings[b.id].lvl)&&S.buildings[b.id].lvl>=0),typeof S.orders==='object',typeof S.mish==='object',Object.values(S.res).every(x=>x>=0),Object.values(S.collectors).every(x=>x>=0)];})()")
        ok(r==['number',True,True,True,True,True,True,True],f"damaged save '{k}' loads into a sane state ({r})")
        ctx.close()
    ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.clear();localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps('{"version":"2.27","coins":123,"buildings":{"sawmill":{"lvl":12},"kiln":{"lvl":3,"on":false}},"orders":{"done":7}}'))
    r=pg.evaluate("[S.coins,S.buildings.sawmill.lvl,S.buildings.kiln.lvl,S.buildings.kiln.on,S.orders.done]")
    ok(r==[123,12,3,False,7],f"a normal old save keeps its values ({r})"); ctx.close()
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); pg.evaluate(QUIET); pg.evaluate(LATE); pg.evaluate(QUIET)
        pg.evaluate("TT.openSheet('market')"); pg.wait_for_timeout(500); pg.evaluate("TT.setSheetState&&TT.setSheetState('full')"); pg.wait_for_timeout(500)
        r=pg.evaluate("(()=>{const t=document.querySelector('table.mkt').getBoundingClientRect();let o=0;document.querySelectorAll('#mktBody button').forEach(b=>{const r=b.getBoundingClientRect();if(r.width&&r.right>innerWidth+1) o++;});return [Math.round(t.right),innerWidth,o];})()")
        ok(r[0]<=r[1]+1 and r[2]==0,f"{dev}: late-game market table fits the phone, every Sell button visible ({r})")
        pg.evaluate("(()=>{const T=document.getElementById('toasts');const d=document.createElement('div');d.className='toast';d.textContent='test toast';T.appendChild(d);})()"); pg.wait_for_timeout(300)
        r=pg.evaluate("(()=>{const t=document.querySelector('#toasts .toast').getBoundingClientRect(),h=document.querySelector('#sheet .sh-head, #sheet header, #sheet h2')||document.getElementById('sheet');const s=h.getBoundingClientRect();return [document.body.classList.contains('sheet-full'),Math.round(t.top),Math.round(s.top),Math.round(s.bottom)];})()")
        ok(r[0] and (r[1]>r[2]+60),f"{dev}: with a full sheet open, toasts sit below the sheet's header ({r})")
        pg.evaluate("TT.setSheetState&&TT.setSheetState('half')"); pg.wait_for_timeout(300)
        ok(not pg.evaluate("document.body.classList.contains('sheet-full')"),f"{dev}: half sheet clears the full-sheet toast mode")
        pg.evaluate("TT.closeSheet()"); ctx.close()
    ok(not errs,f"no console errors ({errs[:4]})")
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S):\n- '+'\n- '.join(FAILS)))
sys.exit(1 if FAILS else 0)
