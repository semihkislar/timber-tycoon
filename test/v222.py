# v2.22: leveled upgrades (Lv 1..N, Lv 2+ unlock with progress) and building workstations (3 per building, own levels,
# milestone gates Lv 25/50/100/200/400, Workstations tab with an iso interior). Migration, Replant reset, cs scaling, phones.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;S.lifetimeClicks=99;S.weather&&(S.weather.k='clear');"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.on('response',lambda r: r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1600); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,22),f"VERSION>=2.22 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,22),'sw cache bumped to >= v2.22')
    # ---------------- (1) leveled upgrades ----------------
    E(pg,CLEAN)
    r=E(pg,"""(()=>{const u=UPGRADES.find(x=>x.id==='steamsaw');S.coins=1e15;S.upgrades={};S.ws={};S.buildings.sawmill.lvl=10;S.buildings.sawmill.on=true;M=computeMods();const s0=bSpeed('sawmill');
      const c1=upCost(u);TT.buyUpgrade('steamsaw');const L1=upLvl('steamsaw'),s1=bSpeed('sawmill');
      const tryNoReq=TT.buyUpgrade('steamsaw');   // Lv 2 needs Sawmill Lv 25
      S.buildings.sawmill.lvl=24;wsGrandfather();const r2=upReqOk(u);S.buildings.sawmill.lvl=25;const r3=upReqOk(u);const c2=upCost(u);
      TT.buyUpgrade('steamsaw');const L2=upLvl('steamsaw'),s2=bSpeed('sawmill');
      return {c1,c2,L1,L2,tryNoReq,r2,r3,s1r:s1/s0,max:upMax(u),txt:upReqTxt(u,3),d2:upDesc(u,2),d5:upDesc(u,5)};})()""")
    ok(r['L1']==1 and abs(r['s1r']-2)<.01,f"Lv 1 is exactly the old upgrade (Steam Saw ×2 sawmill speed) ({r['s1r']:.3f})")
    ok(r['tryNoReq'] is False and r['r2'] is False and r['r3'] is True,'Lv 2 is locked until the Sawmill reaches Lv 25')
    ok(r['L2']==2 and abs(r['c2']/r['c1']-12)<.01,f"Lv 2 costs ×12 Lv 1 ({r['c2']/r['c1']:.2f})")
    ok(r['max']==5 and r['d2']=='Sawmill speed ×2.1' and r['d5']=='Sawmill speed ×2.4',f"5 levels, effect text scales (Lv2 '{r['d2']}', Lv5 '{r['d5']}')")
    ok('Sawmill Lv 50' in r['txt'],f"next-level requirement text ({r['txt']})")
    r=E(pg,"""(()=>{const sp=x=>{const m=computeMods();return m.bld.sawmill;};S.upgrades={steamsaw:1};const a=sp();S.upgrades={steamsaw:2};const b=sp();S.upgrades={steamsaw:5};const c=sp();
      S.upgrades={alarm:3};const f=computeMods().fire;S.upgrades={fert:4};const g=computeMods().grow;S.upgrades={};M=computeMods();
      return {a,b,c,f,g,amax:upMax(UPGRADES.find(u=>u.id==='alarm')),sd:upMax(UPGRADES.find(u=>u.id==='sawdust'))};})()""")
    ok(abs(r['a']-2)<1e-9 and abs(r['b']-2.1)<1e-9 and abs(r['c']-2.4)<1e-9,f"multiplier scales 1+(f−1)·g(L) ({r['a']},{r['b']},{r['c']})")
    ok(abs(r['f']-.7)<1e-9 and r['amax']==3 and r['sd']==1,f"Smoke Detectors Lv 3: risk ×0.70 (max 3), Sawdust stays one-time ({r})")
    ok(abs(r['g']-1.65)<1e-9,f"additive % scales too (Fertilizer Lv 4 grow ×{r['g']})")
    r=E(pg,"""(()=>{S.upgrades={};S.coins=1e15;S.buildings.chipper.lvl=10;const u=UPGRADES.find(x=>x.id==='sawdust');TT.buyUpgrade('sawdust');const a=TT.buyUpgrade('sawdust');
      S.runCS=4;const c=upCost(UPGRADES[0],1)/UPGRADES[0].cost;S.runCS=1;return {a,c,l:upLvl('sawdust')}})()""")
    ok(r['a'] is False and r['l']==1,'cannot buy past max level')
    ok(abs(r['c']-E(pg,"(()=>{S.runCS=4;const v=cs();S.runCS=1;return v})()"))<1e-6,f"upgrade cost scales with forest value ({r['c']})")
    # panel
    E(pg,CLEAN+"S.upgrades={sharp:1,steamsaw:2};S.coins=1e9;S.buildings.sawmill.lvl=30;wsGrandfather();M=computeMods();openSheet('upg');")
    pg.wait_for_timeout(500)
    t=E(pg,"document.getElementById('upgList').innerText")
    ok('Lv 2/5' in t and 'Lv 3' in t,'Upgrades panel shows "Lv X/N" and the next level')
    ok('Next levels unlock with progress' in t and 'Sawmill Lv 50' in t,'locked next levels list their requirement')
    o=E(pg,"document.getElementById('upgOwned').textContent"); ok(o.startswith('Levels 3/'),f'owned summary counts levels ({o[:40]})')
    E(pg,"closeSheet&&closeSheet()")
    # trophy
    r=E(pg,"(()=>{S.upgrades={};for(const u of UPGRADES) S.upgrades[u.id]=1;const a=ACH.find(x=>x.id==='upgall').p();S.upgrades={};return a})()")
    ok(r[0]==r[1],f'Fully Tooled counts every upgrade line at Lv 1+ ({r})')
    # ---------------- (2) workstations ----------------
    r=E(pg,"""(()=>{const o={};for(const b of BUILDINGS){if(b.id==='lab'||b.tech&&!WS_DEF[b.id]) continue;o[b.id]=WS_DEF[b.id]?WS_DEF[b.id].map(x=>x[3]).join(','):null;}return o;})()""")
    ok(all(v and len(v.split(','))==3 and v.split(',')[1]=='spd' for v in r.values()),f'every production building has 3 stations, #2 is the speed station ({len(r)})')
    ok(E(pg,"WS_DEF.sawmill.map(x=>x[1]).join('|')")=='Debarker|Bandsaw|Edger & Planer','Sawmill: Debarker, Bandsaw, Edger & Planer')
    r=E(pg,CLEAN+"""(()=>{S.coins=1e15;S.ws={};S.buildings.sawmill.lvl=20;M=computeMods();
      const a=TT.buyBuildingRaw('sawmill',10),l1=S.buildings.sawmill.lvl,room=wsRoom('sawmill'),blk=wsBlocked('sawmill'),no=TT.buyBuildingRaw('sawmill',1);
      const g=wsGate('sawmill');const s0=bSpeed('sawmill'),i0=bInMult('sawmill'),o0=bOutMult('sawmill'),p0=computeMods().price.planks;
      buyWs('sawmill',1);buyWs('sawmill',1);const s1=bSpeed('sawmill');const room2=wsRoom('sawmill');buyWs('sawmill',0);buyWs('sawmill',2);
      const i1=bInMult('sawmill'),o1=bOutMult('sawmill');S.ws.carpentry=[0,0,4];const p1=computeMods().price.furniture/ (S.ws.carpentry=[0,0,0],computeMods().price.furniture);
      return {a,l1,room,blk,no,g,ss:s1/s0,room2,ii:i1/i0,oo:o1/o0,p1};})()""")
    ok(r['a'] is True and r['l1']==25 and r['room']==0 and r['blk'] and r['no'] is False,f"Sawmill ×10 from Lv 20 stops at the Lv 25 gate ({r['l1']}, room {r['room']})")
    ok(r['g']=={'lv':25,'k':1,'n':2},f"gate: pass Lv 25 needs the Bandsaw Lv 2 ({r['g']})")
    ok(abs(r['ss']-1.1)<1e-9 and r['room2']==25,f"Bandsaw Lv 2: ×1.10 speed and the cap moves to Lv 50 ({r['ss']:.3f}, room {r['room2']})")
    ok(abs(r['ii']-.97)<1e-9 and abs(r['oo']-1.04)<1e-9,f"Debarker Lv1 −3% input, Edger Lv1 ×1.04 output ({r['ii']:.3f},{r['oo']:.3f})")
    furn_out=E(pg,"Object.keys(BMAP.carpentry.out)[0]")
    r2=E(pg,f"(()=>{{S.ws.carpentry=[0,0,4];const a=computeMods().price['{furn_out}'];S.ws.carpentry=[0,0,0];const b=computeMods().price['{furn_out}'];M=computeMods();return a/b}})()")
    ok(abs(r2-1.2)<1e-9,f'Finishing Bench Lv 4: ×1.20 price on carpentry goods ({r2:.3f})')
    r=E(pg,"""(()=>{S.ws={};S.buildings.sawmill.lvl=25;const c=wsCost('sawmill',1,1),b=bulkCost(BMAP.sawmill.cost,BMAP.sawmill.scale,10,1);S.runCS=4;const c4=wsCost('sawmill',1,1);S.runCS=1;
      const nf=wsNeedFor('sawmill',120);return {r:c/b,cs:c4/c,nf:nf.list,nc:bldNextCost('sawmill')>bulkCost(BMAP.sawmill.cost,BMAP.sawmill.scale,25,1)}})()""")
    ok(abs(r['r']-1)<1e-6,f"station Lv 1 costs the building's Lv-10 level ({r['r']:.3f})")
    ok(abs(r['cs']-E(pg,"(()=>{S.runCS=4;const v=cs();S.runCS=1;return v})()"))<1e-6,'station costs scale with forest value')
    ok(r['nf']==[[1,1],[1,2],[0,1],[0,2],[0,3],[2,1],[2,2],[2,3],[2,4]] and r['nc'],f"wsNeedFor lists the levels to Lv 120 ({r['nf']})")
    r=E(pg,CLEAN+"""(()=>{S.coins=1e15;S.ws={};S.buildings.sawmill.lvl=24;TT.buyBuilding('sawmill',30);return {l:S.buildings.sawmill.lvl,w:S.ws.sawmill.slice()}})()""")
    ok(r['l']==54 and r['w']==[3,2,0],f"dev/test API (wsAuto) buys the stations a purchase needs ({r})")
    # builders' yard fits the station at a cap
    r=E(pg,CLEAN+"""(()=>{S.coins=1e12;S.ws={};S.buildings.sawmill.lvl=25;const nx=wsNext('sawmill');return {k:nx.k,L:nx.L,c:nx.cost>0}})()""")
    ok(r['k']==1 and r['L']==1,f'next station for a capped Sawmill is Bandsaw Lv 1 ({r})')
    # Replant resets stations; staff/spec intact
    r=E(pg,CLEAN+"""(()=>{S.coins=1e15;S.totalEarned=1e15;S.ws={sawmill:[3,2,1]};S.upgrades={steamsaw:3};const ok1=JSON.stringify(S.ws);doPrestige(true);return {ws:JSON.stringify(S.ws),up:JSON.stringify(S.upgrades),ok1}})()""")
    ok(r['ws'] in ('{}','{"sawmill":[0,0,0]}') and r['up']=='{}',f'Replant resets workstations and upgrade levels ({r})')
    # building sheet UI: lock + tab
    E(pg,CLEAN+"S.coins=1e15;S.ws={};S.buildings.sawmill.lvl=25;S.buildings.sawmill.on=true;M=computeMods();openSheet('bld','sawmill');bpTab('ov');")
    pg.wait_for_timeout(500)
    bt=E(pg,"document.getElementById('bpBuy').innerText"); ok('Upgrade Bandsaw to Lv 2' in bt and 'capped at Lv 25' in bt,f"gated Upgrade button reads 'locked: upgrade Bandsaw to Lv 2' ({bt!r})")
    ok(E(pg,"!document.getElementById('bpWsGo').classList.contains('hidden')&&document.getElementById('bpWsGo').classList.contains('alert')"),'🛠 Stations chip shown (pulsing 🔒) for a capped building')
    E(pg,"document.getElementById('bpBuy').click()"); pg.wait_for_timeout(400)
    ok(E(pg,"document.getElementById('bpMain').classList.contains('ws-mode')&&!document.getElementById('bpWs').classList.contains('hidden')"),'tapping the locked button opens the Workstations tab')
    ok(E(pg,"getComputedStyle(document.getElementById('bpTabs')).display!=='none'"),'Overview / Workstations tab row in the Workstations view')
    t=E(pg,"document.getElementById('bpWs').innerText"); ok('Capped at Lv 25' in t and 'Bandsaw' in t and 'Lv 0/10' in t,f'Workstations tab: gate line + station cards')
    ok(E(pg,"(()=>{const c=document.getElementById('bpWsCv');return c&&c.width>100})()"),'iso mini interior canvas drawn')
    E(pg,"document.querySelector('#bpWs button[data-k=\"1\"]').click()"); pg.wait_for_timeout(200); E(pg,"document.querySelector('#bpWs button[data-k=\"1\"]').click()"); pg.wait_for_timeout(300)
    ok(E(pg,"wsLvl('sawmill',1)")==2 and E(pg,"wsRoom('sawmill')")==25,'buying the Bandsaw twice from the card opens the gate')
    E(pg,"bpTab('ov')"); pg.wait_for_timeout(300); bt=E(pg,"document.getElementById('bpBuy').innerText"); ok('Upgrade' in bt and 'Bandsaw' not in bt,'Upgrade button is back to normal')
    # Max clip + lot tag
    r=E(pg,CLEAN+"(()=>{S.coins=1e15;S.ws={};S.buildings.chipper.lvl=20;const n=buyMaxBld('chipper');return [n,S.buildings.chipper.lvl]})()")
    ok(r==[5,25],f'Max is clipped at the gate ({r})')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # ---------------- migration ----------------
    ctx,pg,errs,bad=page()
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.21.1';delete o.ws;o.upgrades={sharp:true,steamsaw:true,alarm:true};o.buildings.sawmill={lvl:120,on:true};o.buildings.chipper={lvl:40,on:true};return JSON.stringify(o);})()")
    ctx.close()
    ctx,pg,errs,bad=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    r=E(pg,"({u:S.upgrades,w:S.ws,saw:S.buildings.sawmill.lvl,room:wsRoom('sawmill'),ch:wsRoom('chipper')})")
    ok(r['u']=={'sharp':1,'steamsaw':1,'alarm':1},f"v2.21.1 save: owned upgrades become Lv 1 ({r['u']})")
    ok(r['w'].get('sawmill')==[3,2,4] and r['saw']==120 and r['room']>0 and r['ch']==10,f"old save grandfathered: free minimum stations, no level lost ({r['w']}, room {r['room']})")
    ok(not errs,f'migration: no errors ({errs[:3]})'); ctx.close()
    # ---------------- phones ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev)
        E(pg,CLEAN+"S.coins=1e15;S.ws={};TT.buyBuilding('sawmill',1);S.buildings.sawmill.lvl=25;M=computeMods();openSheet('bld','sawmill');bpTab('ov');")
        pg.wait_for_timeout(700)
        bb=pg.locator('#bpBuy').bounding_box(); vh=E(pg,'innerHeight')
        ok(bb and bb['y']+bb['height']<=vh,f'{dev}: Upgrade button still fully visible ({bb and round(bb["y"]+bb["height"])} <= {vh})')
        pg.locator('#bpWsGo').click(); pg.wait_for_timeout(600)
        cv=pg.locator('#bpWsCv').bounding_box(); ok(cv and cv['width']>200,f'{dev}: Workstations tab shows the interior ({cv and cv["width"]})')
        b1=pg.locator('#bpWs button[data-k="1"]'); b1.scroll_into_view_if_needed(); b1.click(); pg.wait_for_timeout(300)
        ok(E(pg,"wsLvl('sawmill',1)")==1,f'{dev}: station card buy works by tap')
        pg.screenshot(path=f'/tmp/v222-{dev.replace(" ","")}.png')
        ok(not errs,f'{dev}: no errors ({errs[:3]})'); ctx.close()
    br.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): '+'; '.join(FAILS)))
sys.exit(1 if FAILS else 0)
