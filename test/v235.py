# v2.35 Replant Blueprints (item 12): save the factory as a plan (target levels, priorities, crew, upgrades, logistics and the
# settings: power fuel / log mode, plank sharing, auto-sell, staff posts, Builders' Yard picks). After a Replant a planning office
# rebuilds it toward the targets as coins allow: real coins at the normal (forest-value) prices, never more than the budget share,
# one step every 0.6 s, the cheapest (× priority) step first, the same unlocks as the player, a queue that can be paused.
# Unlocked by research (Site Blueprints, Science T1, after 1 Replant; Master Plans T2: 3 slots, faster). Pacing sims against a
# greedy player, no tiny numbers after Replant, UI (sheet tab, HUD chip, Replant confirm, planned lots), saves, offline,
# flat frame cost, desktop + iPhone/Pixel touch.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
HERE=os.path.dirname(os.path.abspath(__file__))
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;})()"
SETUP='''(()=>{S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  TT.buyPlanter("team",6);for(const [b,n] of [["sawmill",60],["chipper",30],["kiln",20],["peeler",20],["carpentry",25],["pellet",20],["paper",15],["furniture",10]]) TT.buyBuilding(b,n);
  S.premium.lvl=1;S.coins=1e13;TT.buyBuilding("atelier",5);TT.buyBuilding("parquet",5);S.coins=1e13;M=computeMods();for(let k=0;k<30;k++){S.forest.m=1e9;tick(1,false);}S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;})()'''
UNLOCK="(()=>{S.research.science=1;S.research.blueprint=1;S.prestiges=Math.max(1,S.prestiges);M=computeMods();})()"
# replant, then play: chop early, tick; returns a log of every blueprint step (cost charged vs normal price, budget)
PLAY='''(sec=>{const L=[];const f=bpDo;window.bpDo=function(s,off){const c0=S.coins,bud=bpBudget(),st=S.buildings[s.id],l0=st?st.lvl:0;const r=f(s,off);
    if(r>=0){let exp=null;if(s.k==='b'&&!s.logs){const b=BMAP[s.id];exp=bulkCost(b.cost,b.scale,l0,st.lvl-l0);}L.push({k:s.k,id:s.id,n:st?st.lvl-l0:1,spent:c0-S.coins,exp,bud,c0,cs:cs(),t:S.time});}return r;};
  for(let k=0;k<sec;k++){S.forest.m=1e9;if(S.totalEarned<2e4) for(let c=0;c<3;c++) chop();tick(1,false);}window.bpDo=f;return L;})'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg
    # ---------------- pacing sims (greedy player vs the blueprint office on the same Replant) ----------------
    SIMS=[]
    for cfg in [{'prevMin':25,'runMin':20,'marks':[2,5,10,20],'modes':['greedy','bp50','bp100','bp25']},
                {'prevMin':30,'runMin':20,'marks':[2,5,10,20],'modes':['greedy','bp50','bp100'],'legacy':400,'shop':{'soil':6,'mills':3,'crews':3,'money':3,'nursery':2},'master':1},
                {'prevMin':30,'runMin':15,'marks':[2,5,10,15],'modes':['greedy','bp50','bp100'],'legacy':3000,'shop':{'soil':12,'mills':6,'crews':6,'money':5,'nursery':4,'market':5},'master':1}]:
        ctx,pg=page(); r=E(pg,f"({open(os.path.join(HERE,'sim_v235.js')).read()})({json.dumps(cfg)})"); ctx.close(); SIMS.append((cfg,r))
    for cfg,r in SIMS:
        Lg=cfg.get('legacy',0); g=r['modes']['greedy']
        print('   legacy',Lg,'plan',r['plan'],'| forest value ×%.3g'%g['cs'])
        for m,R in r['modes'].items(): print('     %-6s'%m,'earned',R['earned'],'lv60',R['lv60'],'cost/income med %.2fs'%R['rMed'],'restored %s s'%R['full'],'steps',R['steps'],'progress',R['prog'])
        ok(r['plan']['n']>=6 and r['plan']['lv']>=80,f"Legacy {Lg}: the previous run's factory becomes a plan ({r['plan']})")
        for m in [k for k in r['modes'] if k!='greedy']:
            R=r['modes'][m]; last=str(cfg['marks'][-1]); mid=str(cfg['marks'][-2])
            ok(R['earned'][last]<=g['earned'][last]*1.15 and R['earned'][mid]<=g['earned'][mid]*1.15,f"Legacy {Lg} {m}: the blueprint is no faster than a greedy player (≤ ×1.15) (earned ×{R['earned'][mid]/g['earned'][mid]:.2f} at {mid} min, ×{R['earned'][last]/g['earned'][last]:.2f} at {last} min)")
            ok(R['lv60']<=g['lv60']+2,f"Legacy {Lg} {m}: first minute stays bounded ({R['lv60']} levels vs {g['lv60']} for the greedy player)")
            ok(R['rMed']>=1.2,f"Legacy {Lg} {m}: the cheapest building still costs ≥ 1 s of income mid-run (median {R['rMed']:.2f} s): Replant 2.0 pacing kept")
            ok(R['minCost']>=20,f"Legacy {Lg} {m}: no tiny numbers: every paid step in the queue costs ≥ 20 × forest value (min {R['minCost']:.0f} ×)")
            ok(R['prog']>=.6,f"Legacy {Lg} {m}: the plan gets rebuilt ({R['prog']*100:.0f} % of the planned levels in {cfg['runMin']} min{', complete at %d s'%R['full'] if R['full'] else ''})")
        ok(r['modes']['bp25']['earned'][str(cfg['marks'][-1])]<=r['modes']['bp50']['earned'][str(cfg['marks'][-1])]*1.05 if 'bp25' in r['modes'] else True,'a smaller budget share is never faster')
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,35),f"VERSION >= 2.35 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,35),'sw cache bumped to >= v2.35')
    # ---------------- unlock (research + progression) ----------------
    r=E(pg,"(()=>{const a=RNMAP.blueprint,b=RNMAP.masterplan;return {a:a&&[a.b,a.t,a.req],b:b&&[b.b,b.t,b.req],un:bpUnlocked(),gate0:gateOk(a),slots:bpSlotsOpen()};})()")
    ok(r['a']==['sci',1,['science']] and r['b']==['sci',2,['blueprint']],f"research nodes: Site Blueprints (Science · Tier I) → Master Plans (Tier II) ({r['a']}, {r['b']})")
    ok(r['un'] is False and r['gate0'] is False,'a new game has no blueprints: Site Blueprints needs 1 Replant first')
    r=E(pg,"(()=>{S.prestiges=1;const g=gateOk(RNMAP.blueprint);S.prestiges=0;return g;})()"); ok(r is True,'… after a Replant the node can be researched')
    E(pg,"openSheet('co');rpTabOpen('bp')"); pg.wait_for_timeout(400)
    r=E(pg,"document.getElementById('rpBlue').innerText")
    ok('Site Blueprints' in r and '🔒' in r and E(pg,"!!document.getElementById('bluGoRes')"),'locked Blueprint tab explains how to unlock it')
    E(pg,"closeSheet()")
    # ---------------- capture ----------------
    E(pg,SETUP); E(pg,UNLOCK)
    E(pg,"(()=>{setPowerFuel('pellets');setPowerLogs('first');S.prefs.plankMode='value';S.autosell.chairs=false;const st=staffState();for(let i=0;i<40&&!st.team.some(w=>w.role==='mill');i++){const c=st.candidates.find(c=>c.role==='mill');if(c){S.coins=1e13;staffHireCandidate(c.id);}else staffRefreshCandidates();}const w=st.team.find(w=>w.role==='mill');if(w) staffAssign(w.id,'carpentry');S.coins=1e13;for(const u of UPGRADES) if(upReqOk(u)) buyUpgrade(u.id);buyWs('sawmill',0,true);buyWs('chipper',1,true);setBuildersAllow('kiln',false);})()")
    r=E(pg,"(()=>{const ok=bpCapture();const p=bpPlan();return {ok,b:p.b,c:p.c,u:Object.keys(p.u).length,prem:p.prem,set:p.set,ws:Object.keys(p.ws).length,mill:(staffState().team.find(w=>w.role==='mill')||{}).id,ach:!!S.ach.bp1};})()")
    ok(r['ok'] and r['b'].get('sawmill')==60 and r['b'].get('furniture')==10 and r['b'].get('atelier')==5 and r['prem']==1,f"📸 Save current layout: target levels = the factory now ({len(r['b'])} buildings)")
    ok(r['c'].get('lumberjack')==60 and r['u']>=1 and r['ws']>=1,f"… with collectors, upgrades and workstations ({r['u']} upgrades, {r['ws']} station sets)")
    s=r['set']; ok(s['power']['fuel']=='pellets' and s['power']['logs']=='first' and s['plank']=='value' and s['autosell'].get('chairs') is False and 'kiln' in s['byOff'],f"… and the settings: power fuel / log mode, plank sharing, auto-sell, Builders' Yard picks ({s['power']})")
    ok(r['mill'] and s['staff'].get(str(r['mill']))=='carpentry',f"… and staff posts ({s['staff']})")
    E(pg,"window.checkAch&&checkAch()"); ok(E(pg,"!!S.ach.bp1"),'trophy "Draughtsman" for the first blueprint')
    # editing: targets ±5, priorities
    r=E(pg,"(()=>{bpBump('kiln',1);const a=bpPlan().b.kiln;bpBump('kiln',-1);bpBump('kiln',-1);const b=bpPlan().b.kiln;bpSetTarget('kiln',20);bpBump('chipper',1);const c=bpPlan().b.chipper;bpSetTarget('chipper',30);bpCyclePri('furniture');const d=bpPlan().pri.furniture;bpCyclePri('furniture');const e=bpPlan().pri.furniture;bpCyclePri('furniture');return [a,b,c,d,e,bpPlan().pri.furniture];})()")
    ok(r==[25,15,35,'hi','lo',None],f'targets step in 5s, priority cycles • → ⏫ → ⏬ → • ({r})')
    # ---------------- Replant: settings applied, queue restores with real coins at normal prices ----------------
    E(pg,"(()=>{setPowerFuel('mix');setPowerLogs('off');S.prefs.plankMode='fair';S.autosell.chairs=true;setBuildersAllow('kiln',true);bpSetPri('furniture','hi');S.totalEarned=1e15;S.legacy=Math.max(S.legacy,2000);doPrestige();})()"); E(pg,QUIET)
    r=E(pg,"(()=>{return {cs:cs(),plan:!!bpPlan(),lv:S.buildings.sawmill.lvl,fuel:S.power.fuel,logs:S.power.logs,plank:S.prefs.plankMode,as:S.autosell.chairs,off:!!S.builders.off.kiln,prog:bpProgress().k,chip:!document.getElementById('bluChip').classList.contains('hidden')};})()")
    E(pg,"render()")
    ok(r['plan'] and r['lv']==0 and r['cs']>5,f"Replant (forest value ×{r['cs']:.0f}) keeps the blueprint; the factory starts empty as before")
    ok(r['fuel']=='pellets' and r['logs']=='first' and r['plank']=='value' and r['as'] is False and r['off'],f"the planned settings are applied at the start of the run ({r})")
    ok(E(pg,"!document.getElementById('bluChip').classList.contains('hidden')"),'HUD chip 📐 shows while the plan is being restored')
    L=E(pg,PLAY+"(400)")
    bs=[x for x in L if x['k']=='b' and x['exp'] is not None]
    ok(len(L)>=40,f"the planning office works through the plan ({len(L)} steps in 400 s)")
    ok(all(abs(x['spent']-x['exp'])<=1e-6*max(1,x['exp']) for x in bs),f"every building step is charged exactly the normal price for its levels ({len(bs)} steps checked)")
    ok(all(x['spent']<=x['bud']*(1+1e-9)+1e-6 for x in L),'no step ever spends more than the budget share (50 %) of the coins held')
    ok(all(x['spent']>0 or x['k']=='c' or x['id']=='sawmill' for x in L),f"only the free first lumberjack and the log-built Sawmill cost no coins ({[x['id'] for x in L if x['spent']<=0][:4]})")
    ts=[x['t'] for x in L]; gaps=[ts[i+1]-ts[i] for i in range(len(ts)-1)]
    ok(min(gaps)>=0.55,f'one step at a time, ≥ 0.6 s apart (min gap {min(gaps):.2f} s)')
    ok({L[0]['id'],L[1]['id']}=={'lumberjack','sawmill'} and L[0]['spent']==0 and L[1]['spent']==0,f"it starts like a player: the free lumberjack and the Sawmill from 🪵 logs ({[x['id'] for x in L[:4]]})")
    r=E(pg,"(()=>{const p=bpPlan();return {atel:S.buildings.atelier.lvl,prem:S.premium.lvl,vis:BUILDINGS.filter(b=>S.buildings[b.id].lvl>0&&!bVisible(b)).length};})()")
    ok(r['vis']==0,'it only builds lots the player could build (revealed, unlocked)')
    r=E(pg,"(()=>{const s=bpSteps();return {n:s.length,ids:s.map(x=>x.id),pre:s.filter(x=>BMAP[x.id]&&BMAP[x.id].premium&&!S.premium.lvl).length};})()")
    ok(r['pre']==0,f'premium workshops wait for the Premium Area ({r["ids"][:5]})')
    # priority: a ⏫ building goes ahead of cheaper steps
    r=E(pg,"(()=>{const s0=bpSteps();const lo=s0.find(x=>x.k==='b'&&x.key>s0[0].key*1.5&&x.key<s0[0].key*3.9);if(!lo) return null;bpSetPri(lo.id,'hi');const s1=bpSteps();const r=[lo.id,s0[0].id,s1[0].id];bpSetPri(lo.id,'no');return r;})()")
    ok(r is None or r[2]==r[0],f'⏫ high priority puts a building ahead of up to 4× cheaper steps ({r})')
    # pause
    r=E(pg,"(()=>{bpSetRun(false);const st=bpB().stats.steps;S.coins+=1e3*cs();for(let k=0;k<30;k++) tick(1,false);const a=bpB().stats.steps-st;const t=bpStatus().k;bpSetRun(true);for(let k=0;k<30;k++){S.coins+=1e2*cs();tick(1,false);}return [a,t,bpB().stats.steps-st];})()")
    ok(r[0]==0 and r[1]=='off' and r[2]>0,f'⏸ pause stops the queue, ▶ resume carries on ({r})')
    # budget share
    r=E(pg,"(()=>{bpSetBudget(.25);const L=("+PLAY+")(60);bpSetBudget(.5);return L.filter(x=>x.spent>x.bud*(1+1e-9)+1e-6).length+'/'+L.length;})()")
    ok(r.startswith('0/'),f'with a 25 % budget no step spends more than a quarter of the coins ({r})')
    # finish the plan: the coins come from the run (normal prices); then the trophy
    r=E(pg,"(()=>{for(let k=0;k<4000&&!bpB().r.done;k++){S.coins+=Math.max(1e3*cs(),coinRate*5);S.forest.m=1e9;tick(1,false);}return {left:bpLeft(),done:bpB().r.done,full:bpB().stats.full,st:bpStatus().k,saw:S.buildings.sawmill.lvl,furn:S.buildings.furniture.lvl,atel:S.buildings.atelier.lvl};})()")
    E(pg,"tick(1,false);tick(1,false);checkAch()")
    ok(r['left']==0 and r['done']==1 and r['saw']>=60 and r['furn']>=10 and r['atel']>=5,f"the whole plan gets rebuilt, the Premium Area and its workshops included ({r})")
    ok(E(pg,"bpB().r.done===1&&bpB().stats.full>=1&&bpStatus().k==='done'&&!!S.ach.bpfull"),'… then the queue stops: "Plan complete", trophy "Back to Plan"')
    E(pg,"render()"); ok(E(pg,"document.getElementById('bluChip').classList.contains('hidden')"),'… and the HUD chip goes away')
    r=E(pg,"(()=>{const st=staffState();const w=st.team.find(w=>w.role==='mill');return w?w.assign:'carpentry';})()")
    ok(r=='carpentry','staff posts from the plan are restored once their building is back')
    ctx.close()
    # ---------------- no tiny numbers at a huge forest value ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,UNLOCK); E(pg,"bpCapture()")
    r=E(pg,"""(()=>{S.totalEarned=1e18;S.legacy=5e4;doPrestige();window.toast=()=>{};const k=cs();const L=[];for(let t=0;t<120;t++){if(t<40) for(let c=0;c<3;c++) chop();S.forest.m=1e9;tick(1,false);if(t%10===0){const s=bpSteps().filter(x=>x.cost>0);if(s.length) L.push(Math.min(...s.map(x=>x.cost))/k);}}
      openSheet('co');rpTabOpen('bp');updateBlueprint(true);const q=document.getElementById('bluQ').innerText;return {k,min:Math.min(...L),q,steps:bpB().stats.steps};})()""")
    nums=[float(a) for a,u in re.findall(r'🪙 ([\d.]+)([KMBTQ]?)',r['q']) if not u]
    ok(r['k']>100 and r['min']>=20 and r['steps']>3,f"forest value ×{r['k']:.0f}: the queue's prices follow it (cheapest paid step = {r['min']:.0f} × forest value)")
    ok(not nums or min(nums)>=100,f"… and the Next up list shows no silly small prices ({r['q'][:80]!r})")
    ctx.close()
    # ---------------- Master Plans: 3 slots, faster ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,UNLOCK)
    r=E(pg,"(()=>{const a=[bpSlotsOpen(),bpSetSlot(1)];S.research.masterplan=1;a.push(bpSlotsOpen(),bpSetSlot(1),bpCapture(),bpB().act,bpTier());bpSetSlot(0);a.push(bpPlan());return a;})()")
    ok(r[:7]==[1,False,3,True,True,1,2] and r[7] is None,f'Master Plans opens slots B and C; slots are independent ({r[:7]})')
    ok(E(pg,"BP_GAP[2]<BP_GAP[1]&&BP_BATCH[2]>BP_BATCH[1]"),'… and makes steps faster and bigger')
    ctx.close()
    # ---------------- UI desktop ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,UNLOCK); E(pg,"bpCapture()")
    E(pg,"(()=>{S.totalEarned=1e15;doPrestige();window.toast=()=>{};})()"); E(pg,QUIET)
    E(pg,"(()=>{for(let k=0;k<120;k++){if(k<60) for(let c=0;c<3;c++) chop();S.forest.m=1e9;tick(1,false);}})()"); pg.wait_for_timeout(400)
    ok(pg.locator('#bluChip').is_visible() and '%' in pg.locator('#bluChip').inner_text(),f"HUD chip after Replant: {pg.locator('#bluChip').inner_text()!r}")
    pg.locator('#bluChip').click(); pg.wait_for_timeout(600)
    ok(E(pg,"TT.curSheet")=='co' and E(pg,"!document.getElementById('rpBlue').classList.contains('hidden')"),'tapping the chip opens the Blueprint tab')
    r=E(pg,"(()=>{const e=document.getElementById('rpBlue');return {rows:e.querySelectorAll('.blu-row').length,plan:Object.keys(bpPlan().b).length,q:e.querySelectorAll('.blu-qi').length,st:document.getElementById('bluSt').innerText,pct:document.getElementById('bluPct').innerText,slots:e.querySelectorAll('#bluSlots button').length,sx:document.getElementById('shBody').scrollWidth<=document.getElementById('shBody').clientWidth+1};})()")
    ok(r['rows']>=r['plan'] and r['q']>=1 and r['slots']==3 and r['sx'],f"tab: slots, status, progress, Next up queue and one row per planned building ({r})")
    pg.locator('#bluRun').click(); pg.wait_for_timeout(300)
    ok(E(pg,"bpB().run")==False and '▶' in pg.locator('#bluRun').inner_text(),'⏸ Pause button')
    pg.locator('#bluRun').click(); pg.wait_for_timeout(300); ok(E(pg,"bpB().run")==True,'▶ Resume button')
    t0=E(pg,"bpPlan().b.kiln"); pg.locator('.blu-row[data-b="kiln"] .blu-st[data-d="1"]').click(); pg.wait_for_timeout(200)
    ok(E(pg,"bpPlan().b.kiln")==t0+5,'+ raises a target by 5')
    pg.locator('.blu-row[data-b="kiln"] .blu-pri').click(); pg.wait_for_timeout(200); ok(E(pg,"bpPlan().pri.kiln")=='hi','priority button → ⏫ High')
    E(pg,"bpSetPri('kiln','no')")
    ov=E(pg,"""(()=>{let bad=[];for(const r of document.querySelectorAll('#rpBlue .blu-row')){const m=r.querySelector('.blu-bm').getBoundingClientRect(),b=r.querySelector('.blu-pri').getBoundingClientRect();if(m.right>b.left+1) bad.push(r.dataset.b);}return bad;})()""")
    ok(not ov,f'no overlapping text in the plan rows ({ov})')
    E(pg,"document.getElementById('bluSt').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(HERE,'v235_desktop.png'))
    # scene: planned lots get a blueprint sheet
    r=E(pg,"(()=>{const ids=BUILDINGS.filter(b=>bpLotPlanned(b.id)).map(b=>b.id);fitCamera(true);for(let k=0;k<20;k++) stepScene(1/30);return ids;})()")
    ok(len(r)>=3,f'empty planned lots are marked on the map ({r})')
    # flat frame cost with the restore running
    r=E(pg,'''(()=>{const t=on=>{bpSetRun(on);const B=bpB();const keep=B.slots[0];if(!on) B.slots[0]=null;for(let k=0;k<60;k++){stepScene(1/30);updateBpChip();}const a=[];for(let k=0;k<150;k++){const t0=performance.now();stepScene(1/30);tick(1/30,false);updateBpChip();a.push(performance.now()-t0);}B.slots[0]=keep;a.sort((x,y)=>x-y);return a[75];};
      const x0=t(false),x1=t(true),x2=t(false),x3=t(true);return [Math.min(x0,x2),Math.min(x1,x3)];})()''')
    ok(r[1]<=r[0]*1.2+1.0,f'flat frame cost: median {r[0]:.2f} ms without a plan → {r[1]:.2f} ms with the queue running')
    # Replant confirm: save first
    E(pg,"closeSheet();bpSetTarget('sawmill',7);S.totalEarned=Math.max(S.totalEarned,1e15);rpConfirm()"); pg.wait_for_timeout(400)
    ok(pg.locator('#rpBpSave').count()==1 and 'Blueprint A' in pg.locator('.modal').inner_text(),'Replant confirm offers "Save this factory as Blueprint A first"')
    pg.locator('#rpBpSave').check(); saw=E(pg,"S.buildings.sawmill.lvl")
    pg.locator('.modal .btn.red').click(); pg.wait_for_timeout(500)
    ok(E(pg,"bpPlan().b.sawmill")==max(saw,1) and E(pg,"S.prestiges")>=2,f"… ticked, the plan is replaced by this run's factory before the Replant (Sawmill target {E(pg,'bpPlan().b.sawmill')})")
    E(pg,QUIET)
    ctx.close()
    # ---------------- saves ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,UNLOCK); E(pg,"(()=>{bpCapture();bpSetPri('furniture','hi');bpSetBudget(1);bpSetRun(false);})()")
    base=E(pg,"JSON.stringify(S)"); ctx.close()
    cases=[('round trip','',lambda r: r['plan'] and r['saw']==60 and r['pri']=='hi' and r['bud']==1 and r['run'] is False),
           ('v2.34 save (no blueprint)','o.version="2.34";delete o.bp;delete o.research.blueprint;',lambda r: not r['plan'] and not r['un'] and r['bud']==.5 and r['run'] is True),
           ('damaged blueprint','o.bp={slots:"x",act:9,budget:7,run:"y",stats:null};',lambda r: not r['plan'] and r['bud']==.5 and r['act']==0),
           ('damaged plan','o.bp.slots[0].b={sawmill:"abc",nope:5,kiln:-3,chipper:1e9};o.bp.slots[0].set={power:{fuel:"x"},staff:{a:"zzz"}};o.bp.slots[0].pri={kiln:"max"};',lambda r: r['plan'] and r['saw'] is None and r['chip']==2000 and r['fuel']=='mix')]
    for name,mut,exp in cases:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        r=E(pg,"(()=>{const B=bpState(),p=bpPlan();return {plan:!!p,saw:p?p.b.sawmill:null,chip:p?p.b.chipper:null,pri:p?p.pri.furniture:null,fuel:p&&p.set&&p.set.power?p.set.power.fuel:null,bud:B.budget,run:B.run,act:B.act,un:bpUnlocked()};})()")
        ok(exp(r),f'{name}: loads ({r})')
        E(pg,QUIET); E(pg,"(()=>{for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);stepScene(1/30);}openSheet('co');rpTabOpen('bp');updateBlueprint(true);})()"); pg.wait_for_timeout(300)
        ok(E(pg,"isFinite(S.coins)&&document.getElementById('rpBlue').innerText.length>20"),f'{name}: game runs on and the tab renders')
        ctx.close()
    # offline: the office keeps working while away
    ctx,pg=page(); E(pg,SETUP); E(pg,UNLOCK)
    r=E(pg,"(()=>{bpCapture();S.totalEarned=1e15;doPrestige();window.toast=()=>{};S.collectors.lumberjack=20;S.buildings.sawmill.lvl=1;S.coins=0;M=computeMods();const a=bpProgress().k;TT.simulateOffline(900);return [a,bpProgress().k,bpB().stats.steps,isFinite(S.coins)&&S.coins>=0];})()")
    ok(r[1]>r[0] and r[2]>5 and r[3],f'offline time: the planning office keeps rebuilding ({r[0]*100:.0f} % → {r[1]*100:.0f} %)')
    ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); E(pg,SETUP); E(pg,UNLOCK); E(pg,"bpCapture()")
        E(pg,"(()=>{S.totalEarned=1e15;doPrestige();window.toast=()=>{};})()"); E(pg,QUIET)
        E(pg,"(()=>{for(let k=0;k<90;k++){if(k<60) for(let c=0;c<3;c++) chop();S.forest.m=1e9;tick(1,false);}})()"); pg.wait_for_timeout(500)
        vw=E(pg,'innerWidth')
        cb=pg.locator('#bluChip').bounding_box(); wx=pg.locator('#wxChip').bounding_box()
        ok(cb and cb['x']>=0 and cb['x']+cb['width']<=vw and (not wx or cb['x']+cb['width']<=wx['x']+1 or cb['y']+cb['height']<=wx['y']+1 or wx['y']+wx['height']<=cb['y']+1),f'{dev}: HUD chip fits the sub bar without covering the weather chip ({cb and [round(cb["x"]),round(cb["width"])]})')
        pg.tap('#bluChip'); pg.wait_for_timeout(800)
        ok(E(pg,"TT.curSheet")=='co' and pg.locator('#rpBlue').is_visible(),f'{dev}: tap the chip → Blueprint tab')
        tabs=E(pg,"[...document.querySelectorAll('#rpTabs button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.right,r.height]})")
        ok(len(tabs)==4 and all(t[0]>=0 and t[1]<=vw+.5 and 44<=t[2]<=50 for t in tabs),f'{dev}: 4 Replant tabs fit on one line, ≥ 44 px ({[round(t[2]) for t in tabs]})')
        E(pg,"document.getElementById('bluRows').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        rows=E(pg,"[...document.querySelectorAll('#bluRows .blu-row')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.height]})")
        btn=E(pg,"[...document.querySelectorAll('#bluRows button')].map(e=>{const r=e.getBoundingClientRect();return Math.min(r.width,r.height)})")
        ok(rows and all(x[0]>=0 and x[1]<=vw+.5 and x[2]>=44 for x in rows) and min(btn)>=44,f'{dev}: plan rows fit the screen, every button ≥ 44 px ({len(rows)} rows, min button {min(btn):.0f} px)')
        ok(E(pg,'(()=>{const e=document.getElementById("shBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll')
        t0=E(pg,"bpPlan().b.chipper"); sel='.blu-row[data-b="chipper"] .blu-st[data-d="1"]'
        E(pg,f"document.querySelector('{sel}').scrollIntoView({{block:'center'}})"); pg.wait_for_timeout(200); pg.tap(sel); pg.wait_for_timeout(300)
        ok(E(pg,"bpPlan().b.chipper")==t0+5,f'{dev}: tap + raises the Chipper target to {t0+5}')
        E(pg,"document.getElementById('bluRun').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        rb=pg.locator('#bluRun').bounding_box(); ok(rb and rb['height']>=44,f'{dev}: Pause button ≥ 44 px')
        pg.tap('#bluRun'); pg.wait_for_timeout(300); ok(E(pg,"bpB().run")==False,f'{dev}: tap ⏸ Pause')
        pg.tap('#bluRun'); pg.wait_for_timeout(300); ok(E(pg,"bpB().run")==True,f'{dev}: tap ▶ Resume')
        pg.tap('#shSize'); pg.wait_for_timeout(700)
        E(pg,"document.getElementById('bluSlots').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(HERE,f'v235_{dev.split()[0].lower()}.png'))
        E(pg,"closeSheet()"); pg.wait_for_timeout(500)
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
