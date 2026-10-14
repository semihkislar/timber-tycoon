# v2.12 Builders' Yard: version, v2.11 + v2.10.1 save load, unlock/cost, crew jobs (plans, budget, pay-on-completion,
# waiting, opt-out, off switch, fires, crews cap), offline building, Replant keeps the yard and still resets costs, trophies,
# scene (trucks, builders, scaffolding), sheet controls, taps on desktop + iPhone 13 + Pixel 7, no 404s/errors, release snapshot.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)

LATE='''(()=>{const S=TT.S;S.coins=1e18;S.totalEarned=1e19;
 for(const c of COLLECTORS) TT.buyCollector(c.id,60);
 for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,25);}
 if(!S.premium.lvl) buyPremium();
 for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,15);}
 S.coins=1e18; TT.rebuildAll();})()'''
# a quiet logic sandbox: buildings at given levels, no production noise (byTick is driven directly)
SET='''((lv,coins)=>{const S=TT.S;for(const b of BUILDINGS) S.buildings[b.id].lvl=0;for(const k in lv) S.buildings[k].lvl=lv[k];
  S.coins=coins;S.fires={};const B=S.builders;B.jobs=[];B.cool=0;B.off={};B.on=true;return true;})'''

with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)

    # 1) version + helpers + service-worker cache name
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200)
    ok(E(pg,'TT.VERSION')=='2.12',f"VERSION==2.12 ({E(pg,'TT.VERSION')})")
    ok(E(pg,'typeof byTick==="function"&&typeof buyBuilders==="function"&&typeof byDraw==="function"&&typeof byScaffoldRaw==="function"&&typeof byTruckRaw==="function"'),'builders logic + scene loaded')
    sw=E(pg,'fetch("sw.js").then(r=>r.text())')
    ok("timber-tycoon-v2.12" in sw,'sw.js cache bumped to v2.12')
    fs=E(pg,'JSON.stringify(TT.S.builders)')
    ok(json.loads(fs)['lvl']==0 and json.loads(fs)['plan']=='ms' and json.loads(fs)['budget']==.25,f'fresh state has an unbuilt yard ({fs[:80]})')

    # 2) old saves load and migrate (v2.11 and v2.10.1 have no builders field)
    for oldv in ['2.11','2.10.1']:
        old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']=oldv; old.pop('builders',None)
        old['buildings']['sawmill']['lvl']=12; old['coins']=5e5
        pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old)
        pg.reload(); pg.wait_for_timeout(1400)
        S=E(pg,'TT.S')
        ok(ver(S['version'])==(2,12) and S['builders']['lvl']==0 and S['builders']['jobs']==[] and S['buildings']['sawmill']['lvl']>=12,
           f"v{oldv} save migrated (S.version={S['version']}, builders={S['builders']['lvl']}, sawmill Lv {S['buildings']['sawmill']['lvl']})")
        ok(E(pg,'TT.scene.fps')>5,f'scene running after v{oldv} migrate')
    # a broken builders field is repaired
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.11'; old['builders']={'lvl':'x','plan':'zzz','budget':7,'off':[],'jobs':None}
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1200)
    B=E(pg,'TT.S.builders')
    ok(B['lvl']==0 and B['plan']=='ms' and B['budget']==.25 and B['jobs']==[] and isinstance(B['off'],dict),f'corrupt builders field repaired ({B})')
    ctx.close()

    # 3) logic
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg,'logic ')
    pg.goto(URL); pg.wait_for_timeout(1000)
    r=E(pg,f'''(()=>{{const set={SET};const o={{}};
      set({{sawmill:1}},0);o.v1=TT.byVisible();o.u1=TT.byUnlocked();
      set({{sawmill:1,chipper:1}},0);o.v2=TT.byVisible();o.u2=TT.byUnlocked();
      set({{sawmill:1,chipper:1,kiln:1}},0);o.u3=TT.byUnlocked();o.c0=TT.byCost();o.c1=TT.byCost(1);
      o.noBuy=TT.buyBuilders();TT.S.coins=3e4;o.buy=TT.buyBuilders();o.left=TT.S.coins;o.lvl=TT.byLvl();
      o.crews=[1,2,3,4,5,6].map(l=>TT.byCrews(l));o.batch=[1,2,3,4,5,6].map(l=>TT.byBatch(l));o.dur=[1,2,3,4,5,6].map(l=>TT.byDur(l));return o;}})()''')
    ok(not r['v1'] and r['v2'] and not r['u2'] and r['u3'],f'yard shows at 2 buildings, unlocks at 3 ({r})')
    ok(abs(r['c0']-2.5e4)<1e-6 and abs(r['c1']-3e5)<1e-6,f"cost 25K then ×12 ({r['c0']},{r['c1']})")
    ok(r['noBuy']==False and r['buy']==True and r['lvl']==1 and abs(r['left']-5e3)<1e-6,f"build needs the coins and charges exactly ({r['left']})")
    ok(r['crews']==[1,2,2,3,3,4] and r['batch']==[1*3,5,10,25,50,100] and all(r['dur'][k]>=r['dur'][k+1] for k in range(5)),f"crews/batch/duration table {r['crews']} {r['batch']} {r['dur']}")
    # job lifecycle: reserve → work → pay at the normal price on completion
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:5,chipper:3,kiln:1}},1e6);const B=TT.S.builders;TT.setBuildersPlan('cheap');TT.setBuildersBudget(1);
      const o={{}};const nx=id=>{{const b=BMAP[id];return TT.bulkCost(b.cost,b.scale,TT.S.buildings[id].lvl,1);}};o.want=['sawmill','chipper','kiln'].sort((a,b)=>nx(a)-nx(b))[0];byTick(.1,false);o.jobs=B.jobs.map(j=>({{bid:j.bid,n:j.n,dur:j.dur}}));const j=B.jobs[0];
      o.lvlBefore=TT.S.buildings[j.bid].lvl;o.coinsBefore=TT.S.coins;byTick(j.dur*.5,false);o.lvlMid=TT.S.buildings[j.bid].lvl;o.coinsMid=TT.S.coins;
      const b=BMAP[j.bid];o.expect=TT.bulkCost(b.cost,b.scale,o.lvlBefore,j.n);byTick(j.dur*.6,false);o.lvlAfter=TT.S.buildings[j.bid].lvl;o.spent=o.coinsBefore-TT.S.coins;
      o.stats=Object.assign({{}},B.stats);o.left=B.jobs.filter(x=>x.id===j.id).length;return o;}})()''')
    print('job',r,flush=True)
    j0=r['jobs'][0] if r['jobs'] else {}
    ok(len(r['jobs'])==1 and j0.get('bid')==r['want'],f"Cheapest plan sends the crew to the cheapest next level ({r['want']}: {r['jobs']})")
    ok(r['lvlMid']==r['lvlBefore'] and r['coinsMid']==r['coinsBefore'],'nothing is paid or built while the crew works')
    ok(r['lvlAfter']==r['lvlBefore']+j0.get('n',0) and abs(r['spent']-r['expect'])<=r['expect']*1e-9+1e-6,f"on completion: +{j0.get('n')} Lv for exactly bulkCost ({r['spent']} vs {r['expect']})")
    ok(r['stats']['lv']==j0.get('n') and r['stats']['jobs']==1 and r['left']==0,f"stats count the job ({r['stats']})")
    # milestone plan: cheapest to reach the next ×2 milestone, never overshoots it
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:8,chipper:24,kiln:3}},1e9);const B=TT.S.builders;TT.S.builders.lvl=3;TT.setBuildersPlan('ms');TT.setBuildersBudget(1);
      const cap=TT.byBatch(),key=id=>{{const b=BMAP[id],l=TT.S.buildings[id].lvl,nx=TT.nextMs(l);return TT.bulkCost(b.cost,b.scale,l,Math.min(cap,nx-l));}};
      const want=['sawmill','chipper','kiln'].sort((a,b)=>key(a)-key(b))[0],w=TT.S.buildings[want].lvl;return Object.assign(TT.byPick()||{{}},{{want,need:TT.nextMs(w)-w}});}})()''')
    ok(r and r.get('bid')==r['want'] and r['n']<=r['need'],f"Milestones plan: cheapest way to the next milestone, never past it ({r})")
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:8,chipper:24,kiln:3}},1e9);TT.S.builders.lvl=3;TT.setBuildersPlan('ms');const p=TT.byPick();return p&&TT.S.buildings[p.bid].lvl+p.n;}})()''')
    ok(r in (10,25,50,100,200,400),f'Milestones plan lands on a milestone when affordable (→ Lv {r})')
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:8,chipper:24,kiln:3}},1e9);TT.setBuildersPlan('low');return TT.byPick();}})()''')
    ok(r and r['bid']=='kiln',f'Lowest-level plan picks the kiln ({r})')
    # budget share caps what one job may spend
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:40}},1e7);const B=TT.S.builders;B.lvl=6;TT.setBuildersPlan('cheap');TT.setBuildersBudget(.1);
      const c0=TT.S.coins;byTick(.1,false);const j=B.jobs[0];byTick(j.dur+.1,false);return {{spent:c0-TT.S.coins,cap:c0*.1,n:TT.S.buildings.sawmill.lvl-40}};}})()''')
    ok(r['n']>=1 and r['spent']<=r['cap']*(1+1e-9),f"10% budget: spent {r['spent']:.4g} ≤ {r['cap']:.4g} for {r['n']} levels")
    # not enough coins at completion → waits; coins arrive → completes; never comes → cancelled after the wait
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:10}},1e5);const B=TT.S.builders;B.lvl=1;TT.setBuildersPlan('cheap');TT.setBuildersBudget(1);
      byTick(.1,false);const o={{n:B.jobs.length}};const j=B.jobs[0];TT.S.coins=0;byTick(j.dur+.1,false);o.st=j.st;o.lvl=TT.S.buildings.sawmill.lvl;
      TT.S.coins=1e9;byTick(.1,false);o.lvl2=TT.S.buildings.sawmill.lvl;
      byTick(.1,false);const j2=B.jobs[0];TT.S.coins=0;byTick(j2.dur+BY_WAIT+1,false);o.gone=B.jobs.filter(x=>x.id===j2.id).length;o.lvl3=TT.S.buildings.sawmill.lvl;return o;}})()''')
    ok(r['n']==1 and r['st']=='wait' and r['lvl']==10,f"no coins at completion → job waits ({r})")
    ok(r['lvl2']>10,f"coins arrive → the waiting job completes (Lv {r['lvl2']})")
    ok(r['gone']==0 and r['lvl3']==r['lvl2'],f'job cancelled after {30}s without coins ({r})')
    # opt-out, off switch, fires, crews cap
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:10,chipper:10,kiln:10,carpentry:10}},1e200);const B=TT.S.builders;B.lvl=6;TT.setBuildersPlan('cheap');TT.setBuildersBudget(1);
      const o={{}};TT.setBuildersAllow('sawmill',false);TT.setBuildersAllow('chipper',false);TT.startFire('kiln');
      for(let k=0;k<20;k++) byTick(.7,false);o.bids=B.jobs.map(j=>j.bid);o.n=B.jobs.length;
      TT.setBuildersAllow('carpentry',false);byTick(.1,false);o.afterOff=B.jobs.map(j=>j.bid);
      TT.S.fires={{}};TT.setBuildersAllow('sawmill',true);TT.setBuildersAllow('chipper',true);TT.setBuildersAllow('carpentry',true);TT.setBuildersAllow('kiln',true);B.jobs=[];
      for(let k=0;k<8;k++) byTick(.7,false);o.cap=B.jobs.length;o.uniq=new Set(B.jobs.map(j=>j.bid)).size;
      B.jobs=[];TT.setBuildersOn(false);for(let k=0;k<10;k++) byTick(.7,false);o.offJobs=B.jobs.length;TT.setBuildersOn(true);return o;}})()''')
    print('rules',r,flush=True)
    ok(all(x not in ('sawmill','chipper','kiln') for x in r['bids']),f"opted-out and burning buildings are skipped ({r['bids']})")
    ok('carpentry' not in r['afterOff'],f"opting a building out drops its running job ({r['afterOff']})")
    ok(r['cap']==4 and r['uniq']==4,f"Lv 6: at most 4 crews at once, one per building ({r['cap']},{r['uniq']})")
    ok(r['offJobs']==0,'switched off → no new jobs')
    # buildings that are not built are never started by the crews
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:3,chipper:3,kiln:3}},1e15);const B=TT.S.builders;B.lvl=6;for(let k=0;k<40;k++) byTick(1,false);
      return BUILDINGS.filter(b=>!['sawmill','chipper','kiln'].includes(b.id)).every(b=>TT.S.buildings[b.id].lvl===0);}})()''')
    ok(r,'crews only upgrade built buildings (never build new ones)')
    # offline: crews keep building, welcome-back counts the levels
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:10,chipper:10,kiln:10}},1e8);const B=TT.S.builders;B.lvl=2;TT.setBuildersBudget(.5);const l0=B.stats.lv;
      const res=TT.simulateOffline(1800);return {{built:res.built,stat:B.stats.lv-l0}};}})()''')
    ok(r['built']>0 and r['built']==r['stat'],f"offline 30 min: crews built {r['built']} levels (stats +{r['stat']})")
    # trophies
    r=E(pg,'''(()=>{TT.checkAch(true);const a=TT.S.ach;const o={b1:!!a.build1};TT.S.builders.stats.lv=1000;TT.checkAch(true);o.b1k=!!TT.S.ach.build1k;return o;})()''')
    ok(r['b1'] and r['b1k'],f'trophies Hard Hats On + Skyline ({r})')
    # Replant keeps the yard + settings, drops jobs, buildings and their costs reset
    r=E(pg,f'''(()=>{{const set={SET};set({{sawmill:60,chipper:30,kiln:20}},1e12);const B=TT.S.builders;B.lvl=4;TT.setBuildersPlan('low');TT.setBuildersBudget(.5);TT.setBuildersAllow('kiln',false);
      byTick(.1,false);const jobs0=B.jobs.length;TT.S.totalEarned=1e12;const st0=B.stats.lv;const okp=TT.doPrestige();const N=TT.S.builders;
      const b=BMAP.sawmill;return {{okp,jobs0,lvl:N.lvl,plan:N.plan,budget:N.budget,off:N.off,jobs:N.jobs.length,st:N.stats.lv===st0,
        saw:TT.S.buildings.sawmill.lvl,cost:TT.bulkCost(b.cost,b.scale,TT.S.buildings.sawmill.lvl,1),base:b.cost,mgrKept:typeof TT.S.mgr==='object'}};}})()''')
    print('replant',r,flush=True)
    ok(r['okp'] and r['lvl']==4 and r['plan']=='low' and r['budget']==.5 and r['off'].get('kiln')==1 and r['st'],f'Replant keeps the yard, its plan/budget/opt-outs and stats ({r})')
    ok(r['jobs0']>=1 and r['jobs']==0,'Replant drops running jobs')
    ok(r['saw']==0 and abs(r['cost']-r['base'])<1e-9,f"Replant still resets buildings and their upgrade cost ({r['saw']}, {r['cost']} == {r['base']})")
    ctx.close()

    # 4) scene: trucks, builders, scaffolding, desktop taps + sheet controls
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg,'scene ')
    pg.goto(URL); pg.wait_for_timeout(1000); pg.evaluate(LATE); pg.wait_for_timeout(600)
    E(pg,'''(()=>{for(let k=0;k<4;k++) TT.buyBuilders();TT.S.coins=1e40;TT.setClock(420*.45);})()''')
    seen=E(pg,'''(()=>new Promise(r=>{let maxCrew=0,maxScf=0,people=0,trucks=0,moved=0;const t0=performance.now();
      const iv=setInterval(()=>{const T=TT.byTrucks();trucks=Math.max(trucks,T.filter(t=>!t.walk).length);for(const t of T){maxCrew=Math.max(maxCrew,t.crew||0);if(t.v>.5) moved++;}
        people=Math.max(people,TT.byPeople().length);for(const t of TT.scene.by.trucks) maxScf=Math.max(maxScf,t.scf||0);
        if(performance.now()-t0>17000){clearInterval(iv);r({maxCrew,maxScf,people,trucks,moved,stats:TT.S.builders.stats.lv});}},200);}))()''')
    print('scene',seen,flush=True)
    ok(seen['trucks']>=2 and seen['moved']>0,f"crew trucks drive out ({seen['trucks']} trucks)")
    ok(seen['maxCrew']>=.99 and seen['people']>=3,f"builders walk to the site ({seen['people']} people)")
    ok(seen['maxScf']>.5,f"scaffolding goes up ({seen['maxScf']:.2f})")
    ok(seen['stats']>0,f"crews finished jobs in the live scene (+{seen['stats']} Lv)")
    cache=E(pg,'''(()=>{let n=0;for(const k of SPR.map.keys()) if(String(k).startsWith('byscf')||String(k).startsWith('byt')) n++;return {n,live:LIVE.has('byard')};})()''')
    ok(cache['n']>=1,f"trucks + scaffolds go through the sprite cache ({cache})")
    # tap the yard → builders sheet
    def tap_xy(pg,pt,touch=None):
        if touch:
            touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':pt[0],'y':pt[1]}]})
            pg.wait_for_timeout(40)
            touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else: pg.mouse.click(pt[0],pt[1])
        pg.wait_for_timeout(600)
    def aim(pg,i,j,z,zoom=2.0):
        E(pg,'TT.closeSheet()')
        pt=E(pg,f'''(()=>{{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3);c.z=c.tz={zoom};c.fly=null;const q=TT.P({i},{j},{z});c.x=c.tx=q[0];c.y=c.ty=q[1];return TT.w2s(q[0],q[1]);}})()''')
        pg.wait_for_timeout(450); return pt
    def tap_yard(pg,tag,touch=None):
        pt=aim(pg,24.9,29.6,4); tap_xy(pg,pt,touch)
        ok(E(pg,'TT.curSheet')=='build',f'{tag}: tap the Builders\' Yard → builders sheet ({E(pg,"TT.curSheet")})')
    def tap_bld(pg,bid,tag,touch=None):
        L=E(pg,f'[TT.LOTS["{bid}"].ci,TT.LOTS["{bid}"].cj]'); pt=aim(pg,L[0],L[1],22); tap_xy(pg,pt,touch)
        ok(E(pg,'TT.curSheet')=='bld' and E(pg,'TT.sheetBld')==bid, f'{tag}: tap {bid} → sheet ({E(pg,"TT.curSheet")}/{E(pg,"TT.sheetBld")})')
    tap_yard(pg,'desktop')
    for bid in ['sawmill','kiln','furniture','paper']: tap_bld(pg,bid,'desktop')
    # bottom bar button + sheet controls
    E(pg,'TT.closeSheet()'); pg.wait_for_timeout(300)
    ok(E(pg,'!document.getElementById("bbBuild").classList.contains("hidden")'),'desktop: Builders button in the bottom bar')
    pg.click('#bbBuild'); pg.wait_for_timeout(700)
    ok(E(pg,'TT.curSheet')=='build','desktop: Builders button opens the sheet')
    pg.click('#byPlan button[data-p="low"]'); pg.wait_for_timeout(300)
    pg.click('#byBud button[data-v="0.5"]'); pg.wait_for_timeout(300)
    pg.click('#byChips .by-chip[data-b="sawmill"]'); pg.wait_for_timeout(300)
    st=E(pg,'({plan:TT.S.builders.plan,budget:TT.S.builders.budget,off:TT.S.builders.off.sawmill||0,crews:document.querySelectorAll("#byCrews .by-crew").length})')
    ok(st['plan']=='low' and st['budget']==.5 and st['off']==1 and st['crews']==3,f'sheet: plan, budget and building chips work ({st})')
    E(pg,"TT.openSheet('bld','sawmill')"); pg.wait_for_timeout(500)
    ok(E(pg,'!document.getElementById("bpBy").classList.contains("hidden") && !document.getElementById("bpByOn").checked'),'building sheet shows the auto-build switch (off for sawmill)')
    pg.click('#bpBy .sw'); pg.wait_for_timeout(400)
    ok(E(pg,'!TT.S.builders.off.sawmill'),'building sheet switch lets the crews back in')
    ok(E(pg,'TT.JUMPS.some(j=>j.id==="build")'),'quick-jump chip for the yard')
    ctx.close()

    # 5) phone taps (yard via touch, buildings, More → Builders)
    for dev in ['iPhone 13','Pixel 7']:
        d=dict(p.devices[dev]); d.pop('default_browser_type',None)
        ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}')
        pg=ctx.new_page(); watch(pg,dev+' '); cdp=ctx.new_cdp_session(pg)
        pg.goto(URL); pg.wait_for_timeout(1200); pg.evaluate(LATE); pg.wait_for_timeout(700)
        E(pg,'(()=>{TT.buyBuilders();TT.buyBuilders();TT.rebuildAll();})()'); pg.wait_for_timeout(500)
        tap_yard(pg,dev,touch=cdp)
        for bid in ['sawmill','furniture']: tap_bld(pg,bid,dev,touch=cdp)
        E(pg,'TT.closeSheet()'); pg.wait_for_timeout(300)
        E(pg,"TT.openSheet('more')"); pg.wait_for_timeout(500)
        ok(E(pg,'!!document.querySelector("#moreGrid .mtile[data-s=build]")'),f'{dev}: Builders tile in More')
        bx=E(pg,'(()=>{const r=document.querySelector("#moreGrid .mtile[data-s=build]").getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()')
        tap_xy(pg,bx,cdp)
        ok(E(pg,'TT.curSheet')=='build',f'{dev}: More → Builders opens the sheet')
        ok(E(pg,'document.getElementById("byBuy").getBoundingClientRect().width>200'),f'{dev}: upgrade button is full width')
        ctx.close()

    # 6) release snapshot (if present)
    if os.path.isdir(ROOT+'/releases/v2.12'):
        ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.12/index.html'); pg.wait_for_timeout(1000)
        ok(E(pg,'TT.VERSION')=='2.12' and E(pg,'TT.scene.fps')>5,'releases/v2.12/ snapshot runs')
        ctx.close()
        vh=open(ROOT+'/versions.html').read()
        ok('v2.12' in vh and vh.index('v2.12')<vh.index('v2.11'),'versions.html lists v2.12 above v2.11')
    else:
        print('NOTE: releases/v2.12 not built yet',flush=True)

    ok(not missing, f'no 404s ({missing[:3]})')
    bad=[e for e in errs if 'favicon' not in e]
    ok(not bad, f'no page errors ({bad[:3]})')
    b.close()

print('ALL PASSED' if not FAILS else f'{len(FAILS)} FAILED: '+'; '.join(FAILS), flush=True)
sys.exit(0 if not FAILS else 1)
