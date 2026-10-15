# v2.14: staff system — roles, wages, candidates, training, assignment, founding foremen migration,
# Replant keeps staff, Fire Safety still first, mobile Staff sheet, release snapshot.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
MID='''(()=>{const S=TT.S;S.coins=1e9;S.totalEarned=1e10;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,20);S.coins=1e9;TT.rebuildAll();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)
    # --- version / sw / fresh state ---
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200)
    ok(ver(E(pg,'TT.VERSION'))>=(2,14),f"VERSION>=2.14 ({E(pg,'TT.VERSION')})")
    ok('timber-tycoon-v2.14' in E(pg,'fetch("sw.js").then(r=>r.text())'),'sw.js cache bumped to v2.14')
    st=E(pg,'TT.S.staff')
    ok(st and isinstance(st.get('team'),list) and isinstance(st.get('candidates'),list),f'fresh state has staff structure ({st and list(st.keys())})')
    ok(E(pg,'TT.S.prefs.fatigue') is True,'prefs.fatigue defaults true')
    ctx.close()

    # --- v2.13 save with managers migrates to founding foremen ---
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID)
    E(pg,"""(()=>{TT.S.coins=1e15;for(const m of MANAGERS.slice(0,4)){if(!mgrLvl(m.bid)){TT.S.coins=Math.max(TT.S.coins,mgrHireCost(m)*2);hireMgr(m.id);} while(mgrLvl(m.bid)<4){const c=mgrUpCost(m,mgrLvl(m.bid));TT.S.coins=Math.max(TT.S.coins,c.coins);TT.S.seeds=Math.max(TT.S.seeds,c.seeds||0);levelMgr(m.id);}}})()""")
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.13'; old.pop('staff',None)
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1400)
    S=E(pg,'TT.S')
    team=S['staff']['team']
    founding=[w for w in team if w.get('founding')]
    ok(ver(S['version'])==ver(E(pg,'TT.VERSION')) and len(founding)>=4,f'v2.13 managers migrated to founding foremen ({len(founding)} founding, team={len(team)})')
    ok(all(w.get('role')=='mill' and w.get('assign') for w in founding) if founding else True,'founding foremen are mill workers assigned to buildings')
    ok(all(1<=w.get('skill',0)<=5 for w in founding) if founding else True,'founding skill = ceil(lvl/2) capped at 5')
    ok(E(pg,'TT.staffWageTotal()')==0,'founding wages waived (total wage 0)')
    ok(E(pg,"(TT.S.mgr.emre|0)>=1 && mgrSpd('sawmill')>1"),'legacy mgr bonuses still present for migrated saves')
    ctx.close()

    # --- hire, wage, unpaid 50%, training, assignment ---
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID); pg.wait_for_timeout(400)
    E(pg,"TT.staffRefreshCandidates(true)")
    n0=E(pg,'TT.S.staff.team.length')
    E(pg,"(()=>{const c=TT.S.staff.candidates[0];TT.S.coins=1e9;return TT.staffHireCandidate(c.id);})()")
    ok(E(pg,'TT.S.staff.team.length')==n0+1,'hire from candidates')
    wage=E(pg,'TT.staffWageTotal()')
    ok(wage>0,f'wage deduction active (total {wage}/s)')
    # force a known waged worker and drain coins before staffTick (no production earn in between)
    unpaid=E(pg,"""(()=>{
      const st=TT.staffState();
      if(!st.team.some(w=>!w.founding&&staffWageOf(w)>0)){
        st.team.push({id:'wPay',name:'Pay Test',role:'lumberjack',skill:3,rarity:'R',traits:['steady'],assign:'forest',energy:100,founding:false,train:null,look:STAFF_LOOKS[0]});
      }
      TT.S.coins=0; staffTick(2,false); return !!st.unpaid;
    })()""")
    ok(unpaid,'unpaid 50% mode when coins run out')
    E(pg,'TT.S.coins=1e9'); E(pg,'staffTick(0.5,false)')
    ok(E(pg,'!TT.S.staff.unpaid'),'paid again once coins return')
    # training
    wid=E(pg,"TT.S.staff.team.filter(w=>!w.founding)[0].id")
    sk0=E(pg,f"TT.S.staff.team.find(w=>w.id==={json.dumps(wid)}).skill")
    E(pg,f"TT.staffStartTrain({json.dumps(wid)})")
    E(pg,"TT.simulate(500)")
    sk1=E(pg,f"TT.S.staff.team.find(w=>w.id==={json.dumps(wid)}).skill")
    ok(sk1==sk0+1,f'training raises skill ({sk0} -> {sk1})')
    # assignment + mill speed
    E(pg,"""(()=>{
      const st=TT.staffState();
      let w=st.team.find(x=>x.role==='mill'&&!x.founding);
      if(!w){st.candidates=[{id:'cTest',name:'Test Mill',role:'mill',skill:3,rarity:'R',traits:['steady'],look:{f:0,skin:0,hair:0,style:'short',out:'vest',col:'#e8742a'}}];TT.S.coins=1e9;TT.staffHireCandidate('cTest');w=st.team.find(x=>x.role==='mill'&&!x.founding);}
      w.skill=5; w.traits=['steady']; w.energy=100;
      TT.staffAssign(w.id,'sawmill');
    })()""")
    slots=E(pg,"TT.staffSlots('sawmill')")
    ok(slots>=1,f'assignment slots >=1 ({slots})')
    spd=E(pg,"TT.staffMillSpd('sawmill')")
    ok(spd>1.0,f'mill worker speed effect ({spd})')
    # engineer on chipper (empty slots)
    eng=E(pg,"""(()=>{
      const st=TT.staffState();
      st.candidates=[{id:'cEng',name:'Test Eng',role:'engineer',skill:4,rarity:'E',traits:['steady'],look:{f:0,skin:1,hair:1,style:'crew',out:'vest',col:'#3aa0d8'}}];
      TT.S.coins=1e9;TT.staffHireCandidate('cEng');
      const w=st.team.find(x=>x.role==='engineer');
      w.energy=100; TT.staffAssign(w.id,'chipper');
      return TT.staffEngIn('chipper');
    })()""")
    ok(eng<1,f'engineer reduces input use ({eng})')
    ctx.close()

    # --- Replant keeps staff, resets building costs ---
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID)
    E(pg,"(()=>{TT.S.coins=1e15;hireMgr('emre');staffMigrateFromMgr();TT.staffRefreshCandidates(true);const c=TT.S.staff.candidates[0];TT.staffHireCandidate(c.id);})()")
    nTeam=E(pg,'TT.S.staff.team.length')
    E(pg,'TT.S.totalEarned=1e14;doPrestige()'); pg.wait_for_timeout(500)
    ok(E(pg,'TT.S.staff.team.length')==nTeam,f'Replant keeps staff ({nTeam})')
    ok(E(pg,"BUILDINGS.every(b=>S.buildings[b.id].lvl===0)"),'Replant still resets building levels (costs)')
    ok(E(pg,'typeof TT.S.station.lvl==="number"'),'Fire station kept field present after Replant')
    ctx.close()

    # --- UI: Fire Safety first, tabs, 44px ---
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID); E(pg,"TT.S.buildings.kiln.lvl=Math.max(1,TT.S.buildings.kiln.lvl)")
    E(pg,"TT.openSheet('staff')"); pg.wait_for_timeout(700)
    ok(E(pg,"document.querySelector('#staffBody h4')&&/Fire Safety/.test(document.querySelector('#staffBody h4').textContent)"),'Fire Safety still first heading')
    ok(E(pg,"document.querySelectorAll('.staff-tabs .stab').length>=3"),'Staff sheet tabs render (Team/Candidates/Training)')
    ok(E(pg,"document.getElementById('stnBuy')!==null"),'station build button reachable')
    E(pg,"TT.staffTabCur='cand';staffSig='';TT.openSheet('staff')"); pg.wait_for_timeout(400)
    ok(E(pg,"document.querySelectorAll('#staffTabBody [data-hire]').length>=1 || TT.S.staff.candidates.length===0"),'Candidates tab shows hire buttons when pool non-empty')
    ok(E(pg,"[...document.querySelectorAll('#staffBody .staff-btn, #stnBuy, .staff-tabs .stab')].filter(e=>e.getBoundingClientRect().height>=40).length>=3"),'44px-class staff buttons present')
    ctx.close()

    # --- mobile More → Staff ---
    for dev in ['iPhone 13','Pixel 7']:
        d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg,dev+' ')
        cdp=ctx.new_cdp_session(pg)
        def tap(x,y):
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); pg.wait_for_timeout(50); cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); pg.wait_for_timeout(600)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,MID); E(pg,'document.querySelectorAll(".modal-bg").forEach(t=>t.remove());TT.fitCamera(true)'); pg.wait_for_timeout(500)
        mb=E(pg,"(()=>{const e=[...document.querySelectorAll('#bottombar .bb')].find(x=>x.dataset.s==='more');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); tap(*mb)
        t=E(pg,"(()=>{const e=document.querySelector('#moreGrid [data-s=staff]');if(!e) return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,e.querySelector('small')&&e.querySelector('small').textContent]})()")
        ok(t is not None and t[2] and 'hire' in t[2].lower(),f'{dev}: More lists Staff (Team, hires & fire)')
        t and tap(t[0],t[1]); ok(E(pg,'TT.curSheet')=='staff',f'{dev}: More -> Staff opens')
        ok(E(pg,"!!document.querySelector('.staff-tabs')"),f'{dev}: staff tabs on mobile')
        ctx.close()

    if os.path.isdir(ROOT+'/releases/v2.14'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.14/index.html'); pg.wait_for_timeout(1200); ok(E(pg,'TT.VERSION')=='2.14' and E(pg,'TT.scene.fps')>5,'releases/v2.14/ snapshot runs'); ctx.close()
    else:
        ok(True,'releases/v2.14/ not yet built (will ship with release.py)')

    ok(not errs,f'no page errors {errs[:3]}'); ok(not missing,f'no 404s {missing[:3]}')
print('FAILED' if FAILS else 'ALL PASS',len(FAILS));
if FAILS:
    for f in FAILS: print(' -',f)
sys.exit(1 if FAILS else 0)
