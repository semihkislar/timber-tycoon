# v2.32 logistics tiers, part 3 (item 8): cargo drones (logistics tier 3). A Drone Port on the Shipping dock's roof: unlocks at
# Forklift Depot Lv 6 with a conveyor belt and the Premium Area; Lv 0–10, Phase III +8 % output per level from the same inputs,
# long range from Lv 5 (Phase II +4 % per level from there), no extra demand; forest-value costs; Replant reset; calm animated
# drones (take off, cruise, hover over the roof, carry a crate back, land on the pad) with shadows and hover bob, cached sprites,
# flat frame cost; Bottleneck Advisor; Shipping sheet + Supply Flow; trophies; saves (v2.31 / damaged). Desktop + iPhone 13 + Pixel 7.
from playwright.sync_api import sync_playwright
import sys,os,re,json,statistics
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;})()"
# a mid/late factory: all main lines, the Premium Area with four workshops, Forklift Depot Lv 6 and one belt (drones unlocked)
WORLD='''(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
 for(const id of ['sawmill','chipper','kiln','peeler','carpentry','pellet','paper','furniture','beamsaw','glulam']) S.buildings[id].lvl=30;S.buildings.chipper.lvl=48;S.buildings.plymill.lvl=18;
 S.premium.lvl=1;for(const id of ['atelier','parquet','stationer','cabinetry']) S.buildings[id].lvl=10;for(const c of COLLECTORS) S.collectors[c.id]=90;
 S.coins=1e15;S.logi.fk=6;S.logi.belt={sawmill:1,chipper:0,peeler:0,beamsaw:0};S.logi.drone=0;M=computeMods();for(let k=0;k<30;k++){S.res.logs=1e9;tick(1,false);}
 scene._fsig='';scene._tsig='';scene._pfsig='';return true;})()'''
CAM="(([i,j,z])=>{const c=scene.cam;const p=P(i,j,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*z;})"
# steady state: average fed fraction per building and coins earned, at a given drone level
STEADY='''(L=>{S.logi.drone=L;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;M=computeMods();for(const k in S.res) if(k!=='logs') S.res[k]=0;const f={};let n=0,e0=S.totalEarned;
  let v=0;for(let k=0;k<240;k++){S.res.logs=Math.max(S.res.logs,1e6);tick(.5,false);if(k>=120){n++;for(const b of BUILDINGS) if(S.buildings[b.id].lvl) f[b.id]=(f[b.id]||0)+bstat[b.id].f;
    for(const r of RES){const R=rates[r.id];if(R&&R.s>0) v+=R.s*r.price*.5;}}}   // sales at list prices (market drift and trade demand left out)
  for(const id in f) f[id]/=n;return {f,earned:v};})'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate(QUIET); return ctx,pg
    E=lambda pg,js: pg.evaluate(js)
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,32),f"VERSION >= 2.32 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,32),'sw cache bumped')
    ok('js/drones.js' in open(ROOT+'/index.html').read(),'js/drones.js is in the script list')
    ok(E(pg,"S.logi.drone")==0 and E(pg,"!cdUnlocked()&&cdLvl()===0&&cdCount()===0"),'fresh game: no Drone Port, locked, no drones')
    ok(E(pg,"(()=>{S.coins=1e15;return cdBuy()===false&&cdLvl()===0;})()"),'buying while locked does nothing')
    # ---- unlock ----
    E(pg,WORLD)
    r=E(pg,'''(()=>{const o=[];S.logi.fk=5;o.push(cdUnlocked());S.logi.fk=6;S.logi.belt.sawmill=0;o.push(cdUnlocked());S.logi.belt.sawmill=1;
      S.premium.lvl=0;o.push(cdUnlocked());S.premium.lvl=1;o.push(cdUnlocked());return o;})()''')
    ok(r==[False,False,False,True],f'unlocks at Forklift Depot Lv 6 with a belt built and the Premium Area open (not before) ({r})')
    # ---- multipliers ----
    r=E(pg,'''(()=>{const o={};for(const L of [0,1,4,5,10]){S.logi.drone=L;o[L]=[cdOut('atelier'),cdOut('toyshop'),cdOut('pellet'),cdOut('plymill'),cdOut('sawmill'),cdOut('lab')];}S.logi.drone=0;return o;})()''')
    ok(all(abs(a-b)<1e-9 for a,b in zip(r['1'],[1.08,1.08,1,1,1,1])) and all(abs(a-b)<1e-9 for a,b in zip(r['4'],[1.32,1.32,1,1,1,1])),f"Lv 1–4: Phase III ×1.08 per level, Phase II not yet in range ({r['1']}, {r['4']})")
    ok(all(abs(a-b)<1e-9 for a,b in zip(r['5'],[1.4,1.4,1.04,1.04,1,1])) and all(abs(a-b)<1e-9 for a,b in zip(r['10'],[1.8,1.8,1.24,1.24,1,1])),f"Lv 5: long range, Phase II joins; Lv 10: III ×1.8, II ×1.24, Phase I untouched ({r['5']}, {r['10']})")
    r=E(pg,'''(()=>{const keep={};for(const b of BUILDINGS){keep[b.id]=S.buildings[b.id].lvl;S.buildings[b.id].lvl=0;}S.buildings.atelier.lvl=20;S.buildings.pellet.lvl=1;S.buildings.paper.lvl=1;for(const k in S.autosell) S.autosell[k]=false;
      const run=L=>{S.logi.drone=L;S.buildings.pellet.lvl=0;S.buildings.paper.lvl=0;S.res.pellets=1e12;S.res.paper=1e12;S.res.giftbox=0;M=computeMods();const a=S.res.pellets,c=S.res.paper;tick(1,false);
        S.buildings.pellet.lvl=1;S.buildings.paper.lvl=1;return [S.res.giftbox,a-S.res.pellets,c-S.res.paper];};
      const a=run(0),c=run(10);S.logi.drone=0;for(const id in keep) S.buildings[id].lvl=keep[id];return {a,c};})()''')
    ok(abs(r['a'][1]-r['c'][1])/r['a'][1]<1e-9 and abs(r['a'][2]-r['c'][2])/r['a'][2]<1e-9 and abs(r['c'][0]/r['a'][0]-1.8)<1e-6,f"Drone Port Lv 10: same pellets and paper in, ×1.8 gift boxes out of the Atelier ({r})")
    # ---- balance: drones only add supply, nothing ends up less fed (sim) ----
    E(pg,"for(const k in S.autosell) S.autosell[k]=true")
    a=E(pg,STEADY+'(0)'); c5=E(pg,STEADY+'(5)'); c=E(pg,STEADY+'(10)'); E(pg,"S.logi.drone=0;M=computeMods()")
    for nm,x in [('Lv 5',c5),('Lv 10',c)]:
        worse=[f"{k}:{a['f'][k]:.3f}→{x['f'][k]:.3f}" for k in a['f'] if x['f'][k]<a['f'][k]-1e-3]
        ok(not worse,f'Drone Port {nm} (120 s steady state): no building is less fed than without drones ({worse})')
    starved=[k for k,v in a['f'].items() if v>.97 and c['f'][k]<.97]
    ok(not starved,f'no line that was fed starts starving ({starved})')
    g5,g10=c5['earned']/a['earned'],c['earned']/a['earned']
    ok(1.1<g5<1.5 and 1.3<g10<2.1,f"meaningful but balanced: the factory earns ×{g5:.2f} at Lv 5 and ×{g10:.2f} at Lv 10 (sales at list prices {a['earned']:.3g} → {c['earned']:.3g} / 60 s)")
    # ---- costs ----
    r=E(pg,"(()=>{const c1=cdCost(0);S.runCS=100;const c2=cdCost(0);S.runCS=1;return [c1,c2,cdCost(1),cdCost(9),cdCost(10)];})()")
    ok(abs(r[0]-4e8)<1 and abs(r[1]/r[0]-100)<1e-6,f'Drone Port Lv 1 costs 400M × forest value ({r[0]:.4g}; ×100 after a big Replant: {r[1]:.4g})')
    ok(abs(r[2]/r[0]-3)<1e-9 and abs(r[3]/r[0]-3**9)<1e-3*3**9 and (r[4] is None or r[4]>1e300),'×3 per level, MAX at Lv 10')
    r=E(pg,"(()=>{S.coins=1e15;const c=cdCost(),c0=S.coins;const a=cdBuy();return [a,cdLvl(),c0-S.coins,c,!!S.ach.drone1];})()")
    ok(r[0] and r[1]==1 and abs(r[2]-r[3])/r[3]<1e-9 and r[4],f'building the Drone Port spends its cost and earns Air Freight ({r})')
    r=E(pg,"(()=>{S.coins=1e30;for(let k=0;k<4;k++) cdBuy();const a=!!S.ach.drone5&&!S.ach.drone10;for(let k=0;k<20;k++) cdBuy();return [cdLvl(),a,!!S.ach.drone10];})()")
    ok(r==[10,True,True],f'Long Range at Lv 5, Sky Highway at Lv 10, caps at Lv 10 ({r})')
    ok(E(pg,"(()=>{const a=ACH.filter(x=>/^drone(1|5|10)$/.test(x.id));return a.length===3&&a.every(x=>x.g==='sys');})()"),'3 drone trophies among the system trophies')
    # ---- the scene: fleet, pad, calm flights, shadows, cached sprites ----
    r=E(pg,"(()=>{const o=[];for(const L of [0,1,3,7,10]){S.logi.drone=L;o.push(cdCount());}return o;})()")
    ok(r==[0,2,4,8,8],f'fleet: 1 + level drones, at most 8 ({r})')
    E(pg,"(()=>{S.logi.drone=6;scene.cdr=[];for(let k=0;k<5;k++) stepScene(1/30);})()")
    r=E(pg,"(()=>{const sv=cdServed(),d=cdDebug();return [d.length,sv,d.every(x=>x.route===undefined||x.route===null||sv.includes(x.route)),sv.every(id=>BTIER[id]===3||BTIER[id]===2)];})()")
    ok(r[0]==7 and set(['atelier','parquet','stationer','cabinetry','pellet','paper']).issubset(set(r[1])) and r[2] and r[3],f'Lv 6: 7 drones serve the Phase III workshops and (long range) the Phase II buildings ({r[1]})')
    r=E(pg,'''(()=>{let vh=0,vz=0,seen={},cargo={},hover=[],pad=0,bob=0;const prev=new Map();
      for(let n=0;n<30*150;n++){stepScene(1/30);for(const d of scene.cdr){const q=prev.get(d.k);if(q){vh=Math.max(vh,Math.hypot(d.i-q.i,d.j-q.j)*30);vz=Math.max(vz,Math.abs(d.z-q.z)*30);}
        prev.set(d.k,{i:d.i,j:d.j,z:d.z});if(d.route) seen[d.route]=1;if(d.ph==='hover'&&d.t>0) hover.push(d.z-cdRoofZ(d.route));
        if(d.home&&d.cargo&&d.route) cargo[d.route]=d.cargo;if(d.ph==='pad'&&d.trips>1) pad++;}}
      const mism=Object.entries(cargo).filter(([id,k])=>!BMAP[id].out[k]);
      return {vh,vz,seen:Object.keys(seen).length,cargo:Object.keys(cargo).length,mism:mism.length,hmin:Math.min(...hover),pad};})()''')
    ok(r['vh']<=1.3,f"calm cruising speed: at most {r['vh']:.2f} tiles/s (the same at every level)")
    ok(r['vz']<=45,f"gentle climbs and descents (≤ {r['vz']:.0f} px/s)")
    ok(r['seen']>=5 and r['cargo']>=4 and r['mism']==0,f"they visit the workshops and carry each one's own product back ({r['seen']} visited, {r['cargo']} carried, {r['mism']} wrong crates)")
    ok(r['hmin']>=10,f"hover above the roof while hooking a crate (≥ {r['hmin']:.0f} px clearance)")
    ok(r['pad']>0,'and land back on the pad')
    r=E(pg,'''(()=>{const o=[];for(const d of scene.cdr){const s=cdSpot(d.slot===undefined?0:d.slot);if(d.ph==='pad') o.push([Math.hypot(d.i-s[0],d.j-s[1]),d.z]);}return o;})()''')
    ok(all(x[0]<1e-6 and abs(x[1]-E(pg,'CD_PADZ'))<1e-6 for x in r),f'drones on the pad sit on its landing spots ({len(r)} on the pad)')
    r=E(pg,'''(()=>{const occ={};let clash=0;for(let n=0;n<30*60;n++){stepScene(1/30);const m={};for(const d of scene.cdr) if(d.ph==='pad'){if(m[d.slot]) clash++;m[d.slot]=1;}}return clash;})()''')
    ok(r==0,f'no two drones share a pad spot ({r} clashes in 60 s)')
    ok(E(pg,"CD_V<=1.3&&CD_CRUISE>=90&&cdGroundZ(CD_PAD[0],CD_PAD[1])===CD_PADZ&&cdGroundZ(LOTS.atelier.ci,LOTS.atelier.cj)>0&&cdGroundZ(14,14)===0"),'shadows land on the pad, on roofs and on the ground')
    E(pg,f"{CAM}([24,16,2.2])"); pg.wait_for_timeout(1200)
    r=E(pg,'''(()=>{for(let k=0;k<60;k++) stepScene(1/30);const pad=[...SPR.map.keys()].filter(k=>k.startsWith('cdpad')).length;let calls=0,draws=0;const raw=cdPadRaw,dr=cdDroneRaw,dd=cdDrone;
      window.cdPadRaw=cdPadRaw=function(){calls++;return raw.apply(this,arguments);};let dcalls=0;window.cdDroneRaw=cdDroneRaw=function(){dcalls++;return dr.apply(this,arguments);};window.cdDrone=cdDrone=function(){draws++;return dd.apply(this,arguments);};
      for(let k=0;k<60;k++) stepScene(1/30);window.cdPadRaw=cdPadRaw=raw;window.cdDroneRaw=cdDroneRaw=dr;window.cdDrone=cdDrone=dd;return [pad,calls,dcalls,draws];})()''')
    ok(r[0]>=1 and r[1]==0,f'the pad is a cached sprite, never redrawn in steady state ({r[0]} cached, {r[1]} redraws)')
    ok(r[3]>0 and r[2]<=max(8,r[3]*.15),f'drone poses come from the sprite cache ({r[2]} renders for {r[3]} drone draws in 60 frames)')
    # perf: frame cost with the full fleet vs none (same view)
    r=E(pg,'''(()=>{const t=L=>{S.logi.drone=L;scene.cdr=[];for(let k=0;k<90;k++) stepScene(1/30);const a=[];for(let k=0;k<150;k++){const t0=performance.now();stepScene(1/30);a.push(performance.now()-t0);}a.sort((x,y)=>x-y);return a[75];};
      const x0=t(0),x1=t(10),x2=t(0),x3=t(10);return [Math.min(x0,x2),Math.min(x1,x3)];})()''')
    ok(r[1]<=r[0]*1.2+1.0,f'flat frame cost: median {r[0]:.2f} ms without drones → {r[1]:.2f} ms with 8 drones and the pad on screen')
    ok(E(pg,"scene.objCount>0"),'scene renders with the drones on screen')
    # ---- Bottleneck Advisor ----
    r=E(pg,'''(()=>{S.logi.drone=4;S.buildings.pellet.lvl=130;S.buildings.paper.lvl=130;S.buildings.chipper.lvl=400;S.buildings.atelier.lvl=400;M=computeMods();
      for(let k=0;k<30;k++){S.res.logs=1e12;S.res.chips=1e12;tick(1,false);}const w=advWait('atelier');S.coins=1e15;const f1=advFix(w?w.k:'pellets');
      S.coins=0;const f2=advFix(w?w.k:'pellets');S.coins=1e15;S.logi.drone=3;const f3=advFix(w?w.k:'pellets');S.logi.drone=4;
      const mk=w&&w.k==='paper'?'paper':'pellet';return [w&&w.k,f1&&f1.kind,f1&&f1.label,f2&&f2.kind,f3&&f3.kind,cdCost(4)<=bulkCost(BMAP[mk].cost,BMAP[mk].scale,S.buildings[mk].lvl,1)];})()''')
    ok(r[0] in ('pellets','paper') and r[1]=='drone' and 'Drone Port (Lv 5)' in (r[2] or '') and r[3]=='upg' and r[4]=='upg',f'Advisor: the Atelier waits on a Phase II good → "upgrade the Drone Port" when Lv 5 (long range) is affordable and no dearer than the maker; else "upgrade the maker" ({r})')
    r=E(pg,"(()=>{S.logi.drone=4;const L=advList(true);const e=L.find(x=>x.fix&&x.fix.kind==='drone');return e?[e.fix.btn,typeof e.fix.open]:null;})()")
    ok(r and r[0]=='🚁 Drone Port' and r[1]=='function','Top bottlenecks: the drone fix has a button that opens the Drone Port row')
    E(pg,WORLD)
    # ---- Shipping sheet + Supply Flow, desktop ----
    E(pg,"(()=>{S.logi.fk=5;S.logi.drone=0;TT.openSheet('ship');})()"); pg.wait_for_timeout(700)
    t=pg.locator('#lgDrone').inner_text()
    ok('Cargo drones' in t and 'Forklift Depot Lv 6' in t and pg.locator('#lgDB').count()==0,'Depot Lv 5: the Drone Port shows as locked (with the unlock rule)')
    E(pg,"(()=>{S.logi.fk=6;S.coins=1e15;})()"); pg.wait_for_timeout(900)
    t=pg.locator('#lgDrone').inner_text()
    ok(pg.locator('#lgDB').count()==1 and 'Drone Port' in t and 'Lv 0/10' in t and 'Phase III output ×1.00 → ×1.08' in t,f'Depot Lv 6: the Drone Port row with the next level\'s gain ({t[:120]!r})')
    ok(not re.search(r'NaN|undefined|Infinity',pg.locator('#shipBody').inner_text()),'no NaN / undefined in the sheet')
    pg.locator('#lgDB').click(); pg.wait_for_timeout(300)
    ok(E(pg,"cdLvl()")==1 and 'Lv 1/10' in pg.locator('#lgDL').inner_text(),'clicking 🚁 builds the Drone Port (Lv 1/10)')
    E(pg,"S.logi.drone=4"); pg.wait_for_timeout(600)
    t=pg.locator('#lgDrone').inner_text()
    ok('Phase II ×1.00 → ×1.04' in t and 'Lv 5: Phase II too' in t,f'the row announces the long range at Lv 5 ({t[-90:]!r})')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
    lg=pg.locator('#flowLegend').inner_text()
    ok('drones Lv' in lg and '4' in lg,f'Supply Flow shows the drones ({lg[lg.find("Forklifts"):][:110]!r})')
    ok(E(pg,"cdServes('atelier')&&!cdServes('pellet')&&!cdServes('sawmill')&&(S.logi.drone=5,cdServes('pellet'))"),'Supply Flow marks drone-served arcs (🚁 on their labels)')
    E(pg,"closeSheet();toggleFlow(false);S.logi.drone=0")
    # ---- save / load ----
    ctx.close()
    for name,mut,exp in [('round trip','',6),('v2.31 save (no drones)','o.version="2.31";delete o.logi.drone',0),('drone null','o.logi.drone=null',0),
                         ('drone text','o.logi.drone="x"',0),('drone 99','o.logi.drone=99',10),('drone -3','o.logi.drone=-3',0),('drone 2.7','o.logi.drone=2.7',2),('drone array','o.logi.drone=[5]',5 if False else None)]:
        ctx,pg=page(tag=name+': ')
        E(pg,WORLD)
        E(pg,f"(()=>{{S.logi.drone=6;const o=JSON.parse(JSON.stringify(S));{mut};localStorage.setItem(SAVE_KEY,JSON.stringify(o));sessionStorage.setItem('_c','1');}})()")
        pg.reload(); pg.wait_for_timeout(1300)
        r=E(pg,"[S.logi.drone,cdLvl(),S.logi.fk,TT.VERSION]")
        okv=(r[0]==exp) if exp is not None else (r[0] in (0,5))
        ok(okv and r[0]==r[1] and isinstance(r[0],int),f'{name}: loads with a sane Drone Port level ({r})')
        E(pg,QUIET); E(pg,"for(let k=0;k<20;k++) stepScene(1/30)")
        ctx.close()
    # ---- Replant ----
    ctx,pg=page(); E(pg,WORLD)
    r=E(pg,"(()=>{S.logi.drone=5;checkAch(true);S.totalEarned=1e20;const ok=doPrestige();for(let k=0;k<5;k++) stepScene(1/30);return [ok,S.logi.fk,cdLvl(),!!S.ach.drone1,(scene.cdr||[]).length];})()")
    ok(r[0] and r[1]==0 and r[2]==0 and r[3] and r[4]==0,f'Replant: the Drone Port is rebuilt at the new run prices, the drones land for good (trophies stay) ({r})')
    ctx.close()
    # ---- phones (touch) ----
    for dev,W in [('iPhone 13',390),('Pixel 7',412)]:
        ctx,pg=page(dev,dev+': '); E(pg,WORLD)
        E(pg,"(()=>{S.logi.drone=0;TT.openSheet('ship');})()"); pg.wait_for_timeout(900)
        btn=pg.locator('#lgDB'); btn.scroll_into_view_if_needed(); pg.wait_for_timeout(300); bb=btn.bounding_box()
        ok(bb and bb['height']>=40 and bb['x']+bb['width']<=W+1,f'{dev}: the Drone Port button is a full touch target on screen ({bb})')
        nm=pg.locator('#lgDrone .nm').inner_text()
        ok('Drones' in nm and 'Drone Port' not in nm,f'{dev}: short name on phones ({nm!r})')
        btn.tap(); pg.wait_for_timeout(400)
        ok(E(pg,"cdLvl()")==1,f'{dev}: tapping 🚁 builds the Drone Port')
        w=E(pg,"Math.max(...[...document.querySelectorAll('#shipBody *')].map(e=>e.getBoundingClientRect().right))")
        ok(w<=W+1,f'{dev}: nothing in the sheet runs off the screen ({w:.0f}px)')
        E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
        g=pg.locator('#lgFlowGo'); bb=g.bounding_box()
        ok(bb and bb['height']>=34 and 'drones' in pg.locator('#flowLegend').inner_text(),f'{dev}: Supply Flow shows the drone line and the Logistics button')
        g.tap(); pg.wait_for_timeout(900)
        ok(E(pg,"TT.curSheet")=='ship',f'{dev}: tapping it opens Logistics')
        E(pg,"closeSheet();toggleFlow(false);S.logi.drone=7")
        E(pg,f"{CAM}([20,20,1.4])"); pg.wait_for_timeout(800)
        a=E(pg,"cdDebug()"); pg.wait_for_timeout(2500); c=E(pg,"cdDebug()")
        moved=sum(1 for x,y in zip(a,c) if abs(x['i']-y['i'])+abs(x['j']-y['j'])+abs(x['z']-y['z'])>.2)
        ok(len(c)==8 and moved>=3,f'{dev}: the drones fly in the live scene ({moved}/{len(c)} moved in 2.5 s)')
        sp=max(abs(x['v']) for x in c)
        ok(sp<=1.26,f'{dev}: at a calm speed ({sp:.2f} tiles/s)')
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
print('\nALL PASS' if not FAILS else f'\n{len(FAILS)} FAIL(S): {FAILS}')
sys.exit(1 if FAILS else 0)
