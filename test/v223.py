# v2.23: staff training rework — training / wages / hiring scale with forest value (cs) and this run's income, per-level
# effects are meaningful (+5%/skill for mill workers …) and shown as "next level: +X% … ≈ +🪙/s", and "Train all" trains every
# affordable staff member cheapest first after a confirm that shows the total. Old saves, several Replants, desktop + touch.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;"
MID=("(()=>{S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,20);"
     "S.coins=1e12;"+QUIET+"TT.rebuildAll();})()")
# put a worker straight on the team: {role,skill,rarity,assign,traits}
ADD='''((o)=>{const st=TT.staffState();st.seq++;const w={id:'w'+st.seq,name:o.name||('Test '+st.seq),role:o.role,skill:o.skill||1,rarity:o.rarity||'C',
  traits:o.traits||['steady'],assign:o.assign!==undefined?o.assign:(STAFF_ROLES[o.role].auto?STAFF_ROLES[o.role].area:null),energy:100,brk:false,founding:false,train:null,look:STAFF_LOOKS[st.seq%STAFF_LOOKS.length]};
  st.team.push(w);M=computeMods();staffSig='';return w.id;})'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page(); watch(pg,tag); pg.goto(URL); pg.wait_for_timeout(1300); return ctx,pg

    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,23),f"VERSION >= 2.23 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,23),'sw cache bumped to >= v2.23')
    # ---------------- price formulas ----------------
    r=E(pg,"""(()=>{const w={skill:3,rarity:'R'},rm=1.3;S.runCS=4;S.run.inc=0;
      const a={t:staffTrainCost(w),wg:staffWageOf(w),h:staffHireCostOf(w)};S.run.inc=1e6;const c={t:staffTrainCost(w),wg:staffWageOf(w),h:staffHireCostOf(w)};
      S.runCS=1;S.run.inc=0;const z={t:staffTrainCost(w),wg:staffWageOf(w)};return {a,c,z,rm};})()""")
    rm=r['rm']
    ok(abs(r['z']['t']-40*3*rm)<1e-6 and abs(r['z']['wg']-.35*3*rm)<1e-9,f"fresh game: same prices as before (train {r['z']['t']:.0f}, wage {r['z']['wg']:.3f}/s)")
    ok(abs(r['a']['t']-40*3*rm*4)<1e-6 and abs(r['a']['wg']-.35*3*rm*4)<1e-9,f"forest value ×4 (Replant): training and wages ×4 at the start of a run ({r['a']['t']:.0f}, {r['a']['wg']:.2f}/s)")
    ok(abs(r['c']['t']/1e6-20*3*rm)<1e-6,f"🪙1M/s income: training skill 3→4 ≈ {r['c']['t']/1e6:.0f} s of income ({r['c']['t']:.3g})")
    ok(abs(r['c']['wg']/1e6-.001*3*rm)<1e-9,f"🪙1M/s income: wage ≈ {r['c']['wg']/1e6*100:.2f}% of income ({r['c']['wg']:.4g}/s)")
    ok(abs(r['c']['h']/1e6-6.25*3*rm)<1e-6,f"🪙1M/s income: hiring ≈ {r['c']['h']/1e6:.0f} s of income")
    # ---------------- run income reference ----------------
    E(pg,MID)
    r=E(pg,"(()=>{S.run.inc=0;S.run.incE=0;TT.simulate(240);const a=S.run.inc,e=S.run.incE;const cr=coinRate;S.coins=0;for(const b of BUILDINGS) S.buildings[b.id].on=false;TT.simulate(120);const b2=S.run.inc;for(const b of BUILDINGS) S.buildings[b.id].on=true;return {a,e,cr,b:b2,eb:S.run.incE}})()")
    ok(r['a']>0 and r['a']>=r['e']*0.999 and r['a']<=r['cr']*1.5,f"run income reference follows income (ref {r['a']:.3g}, now {r['cr']:.3g}/s)")
    ok(r['b']>=r['a'] and r['eb']<r['a'],f"…and never drops within a run (smoothed {r['eb']:.3g} fell, ref stays {r['b']:.3g})")
    r=E(pg,"(()=>{S.run.inc=5e6;S.totalEarned=1e15;S.coins=1e15;doPrestige(true);return {inc:S.run.inc||0,cs:cs(),t:staffTrainCost({skill:2,rarity:'C'})}})()")
    ok(r['inc']==0 and abs(r['t']-80*r['cs'])<1e-6,f"Replant resets the income reference; prices restart at the forest-value floor (cs {r['cs']:.2f}, train {r['t']:.1f})")
    ctx.close()
    # ---------------- effects per level ----------------
    ctx,pg=page(); E(pg,MID)
    wid=E(pg,ADD,{'role':'mill','skill':4,'assign':'sawmill'})
    r=E(pg,f"(()=>{{const w=TT.staffState().team.find(x=>x.id==='{wid}');return {{s:staffMillSpd('sawmill'),e:STAFF_ROLES.mill.effect(4),g:staffTrainGain(w)}}}})()")
    ok(abs(r['s']-1.2)<1e-9 and r['e']=='+20% building speed',f"mill worker skill 4: +20% speed (+5% per level, was +3%) ({r['s']:.3f}, '{r['e']}')")
    ok(abs(r['g']['delta']-.05)<1e-9 and '+5% Sawmill speed' in r['g']['txt'] and r['g']['own']=='20% → 25%',f"next level shown: '{r['g']['txt']}' ({r['g']['own']})")
    ok('≈ +🪙' in r['g']['txt'],'next level shows its coin value')
    lj=[E(pg,ADD,{'role':'lumberjack','skill':10}) for _ in range(2)]+[E(pg,ADD,{'role':'lumberjack','skill':3})]
    r=E(pg,f"(()=>{{const w=TT.staffState().team.find(x=>x.id==='{lj[2]}');return {{b:staffChopBonus(),g:staffTrainGain(w)}}}})()")
    ok(abs(r['b']-.6)<1e-9 and r['g']['capped'] and 'cap' in r['g']['txt'],f"team at its +60% cap: training says so instead of a fake gain ('{r['g']['txt']}')")
    un=E(pg,ADD,{'role':'engineer','skill':2,'assign':None})
    g=E(pg,f"staffTrainGain(TT.staffState().team.find(x=>x.id==='{un}')).txt"); ok('once assigned' in g,f"unassigned engineer: '{g}'")
    ctx.close()
    # ---------------- Train all (desktop) ----------------
    ctx,pg=page(); E(pg,QUIET)   # fresh game: no income, so the coins only move by what we do (and a few coins of wages)
    ids=[E(pg,ADD,{'role':'lumberjack','skill':s,'rarity':rr}) for s,rr in [(1,'C'),(2,'C'),(3,'R'),(6,'E')]]
    E(pg,"S.run.inc=0;S.runCS=1")
    costs=E(pg,"TT.staffState().team.map(w=>staffTrainCost(w))")
    srt=sorted(costs); E(pg,f"S.coins={srt[0]+srt[1]+srt[2]*0.5}")
    P=E(pg,"(()=>{const P=staffTrainAllPlan();return {n:P.n,cost:P.cost,all:P.all,ids:P.list.map(x=>x.w.id)}})()")
    ok(P['n']==2 and abs(P['cost']-(srt[0]+srt[1]))<1e-6 and P['all']==4,f"plan: the 2 cheapest of 4 fit the coins (🪙{P['cost']:.0f})")
    E(pg,"openSheet('staff');staffTab='train';staffSig='';render()"); pg.wait_for_timeout(400)
    t=E(pg,"document.getElementById('trAll').innerText"); ok('Train all 2 of 4' in t.replace('\n',' ') and E(pg,"fmt(staffTrainAllPlan().cost)") in t,f"Train all button shows how many and the total before paying ({t!r})")
    c0=E(pg,'S.coins'); tol=E(pg,'staffWageTotal()*3+1e-6'); pg.click('#trAll'); pg.wait_for_timeout(300)
    ok(c0-E(pg,'S.coins')<=tol,'tapping Train all only opens the confirm sheet (nothing paid yet)')
    t=E(pg,"(document.querySelector('#assignOverlay')||{}).innerText||''")
    ok('Train 2 staff for' in t and t.count('skill ')>=2,'confirm sheet: total, count and who gets trained')
    pg.click('#trAllGo'); pg.wait_for_timeout(300)
    r=E(pg,"({c:S.coins,tr:TT.staffState().team.filter(w=>w.train).map(w=>w.id),ov:!!document.getElementById('assignOverlay')})")
    ok(sorted(r['tr'])==sorted(P['ids']) and abs((c0-r['c'])-P['cost'])<=tol and not r['ov'],f"confirm trains exactly the cheapest {len(r['tr'])} and charges the shown total")
    E(pg,"TT.simulate(400)"); sk=E(pg,"TT.staffState().team.map(w=>w.skill)")
    ok(sk[:2]==[2,3],f'training finishes (skills {sk})')
    E(pg,"S.coins=0;staffSig='';render()"); pg.wait_for_timeout(300)
    ok(E(pg,"document.getElementById('trAll').disabled"),'Train all disabled when nothing is affordable')
    E(pg,"staffTab='team';staffSig='';S.coins=1e12;render()"); pg.wait_for_timeout(300)
    ok(E(pg,"!!document.querySelector('#staffTabBody #trAll')&&!!document.querySelector('.staff-card .mg-tg')"),'Team tab: Train all + "next level" line on worker cards')
    pg.screenshot(path='/tmp/v223-desktop-team.png'); ctx.close()
    # ---------------- several Replants: no silly tiny numbers ----------------
    ctx,pg=page()
    sim=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'sim_v218.js')).read()
    E(pg,ADD,{'role':'lumberjack','skill':3}); E(pg,ADD,{'role':'driver','skill':3,'rarity':'R'})
    X=("({cs:cs(),inc:S.run.inc||0,rate:coinRate,t:staffTrainCost({skill:3,rarity:'C'}),w:staffWageOf({skill:3,rarity:'C'}),h:staffHireCostOf({skill:3,rarity:'C'}),"
       "lvl:bulkCost(BMAP.sawmill.cost,BMAP.sawmill.scale,S.buildings.sawmill.lvl,1),wt:staffWageTotal(),unp:staffState().unpaid,team:staffState().team.length})")
    R=E(pg,f"({sim})({{runs:4,maxMin:40,extra:{json.dumps(X)}}})")
    for x in R: print('   run',x['run'],x['min'],'min',{k:(round(v,3) if isinstance(v,float) else v) for k,v in x['x'].items()})
    ok(len(R)==4 and all(x['x']['team']==2 for x in R),'staff stay through 3 Replants')
    ok(all(x['x']['t']>=10*x['x']['inc'] and x['x']['t']>=120*x['x']['cs']*0.999 for x in R),'every run: training skill 3→4 costs ≥ 10 s of the run income and ≥ the forest-value floor')
    ok(all(x['x']['t']>=x['x']['lvl']*0.5 for x in R),'every run: a training level costs at least half a Sawmill level (was ~1/1000)')
    ok(all(.0005<=x['x']['w']/max(1,x['x']['inc'])<=.01 for x in R),'every run: a skill-3 wage is 0.05–1% of income (was ~0.003%)')
    ok(all(x['x']['wt']>0 and not x['x']['unp'] for x in R),'wages are paid every run (never unpaid)')
    ok(all(x['x']['t']>1000 for x in R[1:]),f"after a Replant no tiny training prices (min {min(x['x']['t'] for x in R):.3g})")
    ctx.close()
    # ---------------- old save ----------------
    ctx,pg=page(); E(pg,MID)
    E(pg,ADD,{'role':'mill','skill':2,'assign':'sawmill'})
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.22.1';delete o.run.inc;delete o.run.incE;o.staff.team[o.staff.team.length-1].train={left:30,total:49,to:3};return JSON.stringify(o)})()")
    ctx.close()
    ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    r=E(pg,"(()=>{const w=TT.staffState().team.slice(-1)[0];const t=w.train&&w.train.left;TT.simulate(60);return {t,sk:w.skill,inc:S.run.inc,c:staffTrainCost(w)}})()")
    ok(r['t'] and r['sk']==3,f"v2.22.1 save: training in progress carries on and finishes ({r})")
    ok(r['inc']>0,'old save: income reference starts tracking')
    ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); E(pg,MID)
        for s,rr in [(1,'C'),(2,'R'),(4,'C')]: E(pg,ADD,{'role':'lumberjack','skill':s,'rarity':rr})
        E(pg,ADD,{'role':'mill','skill':3,'assign':'sawmill'})
        E(pg,"S.run.inc=1e9;S.run.incE=0;S.coins=1e15;openSheet('staff');staffTab='train';staffSig='';render();if(typeof setSheetState==='function') setSheetState('full')"); pg.wait_for_timeout(600)
        E(pg,"document.getElementById('trAll').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        bb=pg.locator('#trAll').bounding_box(); vh=E(pg,'innerHeight')
        ok(bb and bb['height']>=44 and 0<=bb['y'] and bb['y']+bb['height']<=vh,f'{dev}: Train all button ≥44px and on screen')
        pg.tap('#trAll'); pg.wait_for_timeout(400)
        o=E(pg,"(()=>{const e=document.querySelector('#assignOverlay .assign-sheet');if(!e) return null;const r=e.getBoundingClientRect(),g=document.getElementById('trAllGo').getBoundingClientRect();return {y:r.y,b:r.bottom,gy:g.bottom,vh:innerHeight,w:r.width,vw:innerWidth}})()")
        ok(o and o['y']>=0 and o['gy']<=o['vh']+1,f'{dev}: confirm sheet and its button are on screen ({o})')
        if dev=='iPhone 13': pg.screenshot(path='/tmp/v223-iphone-confirm.png')
        shown=E(pg,"staffTrainAllPlan().cost"); c0=E(pg,'S.coins')
        if dev=='Pixel 7':   # prices rise while the sheet is open → nothing charged, sheet re-shows the new total
            E(pg,"S.run.inc=1e10"); pg.tap('#trAllGo'); pg.wait_for_timeout(400)
            t=E(pg,"(document.querySelector('#assignOverlay')||{}).innerText||''")
            ok('Prices went up' in t and E(pg,"TT.staffState().team.filter(w=>w.train).length")==0,f'{dev}: prices rose while open → nothing charged, new totals shown')
            shown=E(pg,"staffTrainAllPlan().cost"); c0=E(pg,'S.coins')
        pg.tap('#trAllGo'); pg.wait_for_timeout(400)
        ok(abs((c0-E(pg,'S.coins'))-shown)<=shown*1e-6+E(pg,'staffWageTotal()*2'),f'{dev}: charged exactly the total shown on the confirm button')
        n=E(pg,"TT.staffState().team.filter(w=>w.train).length"); ok(n==4,f'{dev}: tap-confirm trains all 4')
        tx=E(pg,"document.getElementById('staffTabBody').innerText"); ok('left' in tx and 'In training' in tx,f'{dev}: Training tab shows time left')
        if dev=='iPhone 13': pg.screenshot(path='/tmp/v223-iphone-training.png')
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})'); ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): '+'; '.join(FAILS)))
sys.exit(1 if FAILS else 0)
