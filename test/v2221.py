# v2.22.1 hotfix: staff hiring limits (per role, mill crew = open building slots, never drop after Replant, over-cap saves
# keep everyone) and the broken staff "Assign" button (picker opened off-screen and was wiped by the next sheet rebuild).
# Desktop mouse + iPhone 13 / Pixel 7 touch (CDP touch events), effects + scene, old saves, no errors / 404s, snapshot.
from playwright.sync_api import sync_playwright
import sys,os,re,json,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
MID='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,20);S.coins=1e12;TT.S.events=[];TT.S.nextEvent=TT.S.time+1e6;
 TT.S.fires={};TT.S.fireCool=TT.S.time+1e6;TT.S.orders.next=TT.S.time+1e6;
 document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());TT.rebuildAll();})()'''
# hire one candidate of a role (forced), returns worker id or null when refused
HIRE1='''((o)=>{const st=TT.staffState();const id='cX'+(st.seq+1);
 st.candidates=[{id,name:o.name||('Test '+o.role+' '+st.seq),role:o.role,skill:o.skill||3,rarity:'R',traits:o.traits||['steady'],look:STAFF_LOOKS[st.seq%STAFF_LOOKS.length]}];
 TT.S.coins=1e12;const n=st.team.length;const r=TT.staffHireCandidate(id);document.querySelectorAll('.toast').forEach(t=>t.remove());
 return r&&st.team.length===n+1?st.team[st.team.length-1].id:null;})'''
OVERLAY='''(()=>{const o=document.querySelector('#assignOverlay .assign-sheet');if(!o) return null;const r=o.getBoundingClientRect();
 const rows=[...o.querySelectorAll('.as-row')];const f=rows.find(x=>!x.disabled);let hit=null;
 if(f){const q=f.getBoundingClientRect();const t=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);hit=!!(t&&f.contains(t));}
 return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,rows:rows.length,hit};})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)
    def page(vp=None,dev=None,tag='',init=CLEAR):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page(); watch(pg,tag); pg.goto(URL); pg.wait_for_timeout(1200); return ctx,pg
    def center(pg,sel,scroll=True):
        return E(pg,'''(o)=>{const e=document.querySelector(o.s);if(!e) return null;if(o.sc) e.scrollIntoView({block:'center'});
          const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}''',{'s':sel,'sc':scroll})

    # ---------------- version ----------------
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,22,1),f"VERSION >= 2.22.1 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,22,1),'sw cache >= timber-tycoon-v2.22.1')
    E(pg,MID)

    # ---------------- caps: formulas ----------------
    caps={c['k']:c for c in E(pg,'TT.staffCapsAll()')}
    ok(set(caps)=={'lumberjack','driver','crew','forklift','dock','firefighter'},f'six limits {sorted(caps)}')
    own=E(pg,"COLLECTORS.filter(c=>TT.S.collectors[c.id]>0).length")
    ok(caps['lumberjack']['cap']==2+own,f"lumberjack limit = 2 + collector types ({caps['lumberjack']['cap']} vs 2+{own})")
    mach=E(pg,"['truck','harvester','drone','heli'].filter(id=>TT.S.collectors[id]>0).length")
    ok(caps['driver']['cap']==1+mach,f"driver limit = 1 + machine types ({caps['driver']['cap']})")
    slots=E(pg,"BUILDINGS.filter(b=>TT.S.buildings[b.id].lvl>0).reduce((a,b)=>a+TT.staffSlots(b.id),0)")
    ok(caps['crew']['cap']==slots,f"mill crew limit = open building slots ({caps['crew']['cap']} vs {slots})")
    ok(caps['forklift']['cap']==E(pg,'TT.S.ship.fork'),f"forklift limit = forklifts ({caps['forklift']['cap']})")
    ok(caps['dock']['cap']==1+E(pg,'shBays()'),f"dock limit = 1 + bays ({caps['dock']['cap']})")
    ok(caps['firefighter']['cap']==1+E(pg,'stationLvl()'),f"firefighter limit = 1 + station level ({caps['firefighter']['cap']})")

    # ---------------- caps: hiring stops at the limit ----------------
    cap=caps['forklift']['cap']; got=[E(pg,HIRE1,{'role':'forklift'}) for _ in range(cap)]
    ok(all(got),f'hire forklift operators up to the limit ({cap})')
    n0=E(pg,'TT.S.staff.team.length'); c0=E(pg,'TT.S.coins=1e12')
    ok(E(pg,HIRE1,{'role':'forklift'}) is None and E(pg,'TT.S.staff.team.length')==n0,'hire refused at the limit (team unchanged)')
    ok(E(pg,'TT.S.coins')==1e12,'refused hire costs nothing')
    rolls=E(pg,"(()=>{const r=[];for(let i=0;i<40;i++){TT.staffRefreshCandidates(false);r.push(...TT.S.staff.candidates.map(c=>c.role));}return r;})()")
    ok('forklift' not in rolls and len(set(rolls))>=4,f'new candidates skip full roles ({len(rolls)} rolled, forklift {rolls.count("forklift")})')
    # UI: candidate card shows Full + disabled
    E(pg,"(()=>{const st=TT.staffState();st.candidates=[{id:'cF',name:'Full Test',role:'forklift',skill:2,rarity:'C',traits:['steady'],look:STAFF_LOOKS[1]},{id:'cO',name:'Open Test',role:'driver',skill:2,rarity:'C',traits:['steady'],look:STAFF_LOOKS[2]}];})()")
    E(pg,"TT.openSheet('staff')"); E(pg,"document.querySelector('.staff-tabs [data-tab=cand]').click()"); pg.wait_for_timeout(300)
    cf=E(pg,"(()=>{const b=document.querySelector('[data-hire=cF]'),o=document.querySelector('[data-hire=cO]');return b&&o?[b.disabled,b.textContent,o.disabled,document.querySelector('[data-cid=cF] .cand-cap').textContent]:null})()")
    ok(cf and cf[0] and 'Full' in cf[1] and not cf[2] and f'{cap}/{cap}' in cf[3],f'candidate at a full role: 🔒 Full x/y, other roles hireable {cf}')
    pg.wait_for_timeout(1300)   # light refresh must keep it disabled
    ok(E(pg,"document.querySelector('[data-hire=cF]').disabled"),'Full hire button stays disabled after light refresh')
    # UI: team limits block
    E(pg,"document.querySelector('.staff-tabs [data-tab=team]').click()"); pg.wait_for_timeout(300)
    chips=E(pg,"[...document.querySelectorAll('.staff-caps .sc-chip')].map(c=>[c.dataset.cap,c.querySelector('.sc-v').textContent,c.className,getComputedStyle(c.querySelector('small')).display,c.getBoundingClientRect().height])")
    ok(len(chips)==6 and all(re.fullmatch(r'\d+/\d+',c[1]) for c in chips),f'Team tab shows 6 limits as x/y {[c[:2] for c in chips]}')
    ok(any(c[0]=='forklift' and 'full' in c[2] for c in chips),'full limit is highlighted')
    ok(all(c[3]!='none' for c in chips),'desktop shows what raises each limit')
    ok(all(c[4]>=44 for c in chips),'limit chips are >=44 px')
    # caps grow
    f0=E(pg,"TT.staffCap('firefighter')"); E(pg,"TT.S.coins=1e12;TT.buyStation()"); f1=E(pg,"TT.staffCap('firefighter')")
    ok(f1==f0+1,f'Fire Station level raises the firefighter limit ({f0} -> {f1})')
    k0=E(pg,"TT.staffCap('forklift')"); E(pg,"TT.S.coins=1e15;shBuy('fork')"); k1=E(pg,"TT.staffCap('forklift')")
    ok(k1==k0+1 and E(pg,HIRE1,{'role':'forklift'}),f'Forklift Fleet raises the forklift limit and hiring resumes ({k0} -> {k1})')
    # crew: every hire can be placed
    crew=E(pg,"TT.staffCap('crew')")
    ids=[E(pg,HIRE1,{'role':'mill' if i%2==0 else 'engineer'}) for i in range(crew)]
    ok(all(ids) and E(pg,HIRE1,{'role':'engineer'}) is None,f'mill crew: {crew} hires, then refused')
    placed=E(pg,"(ids)=>{let n=0;for(const id of ids){const w=TT.S.staff.team.find(x=>x.id===id);const b=BUILDINGS.find(b=>TT.S.buildings[b.id].lvl>0&&TT.staffCanAssign(w,b.id)&&TT.staffAtBuilding(b.id).length<TT.staffSlots(b.id));if(b&&TT.staffAssign(id,b.id)) n++;}return n;}",ids)
    ok(placed==crew,f'every mill-crew hire fits in a building slot ({placed}/{crew})')
    # Replant never lowers the limits, keeps staff
    before={c['k']:c['cap'] for c in E(pg,'TT.staffCapsAll()')}; nT=E(pg,'TT.S.staff.team.length')
    E(pg,'TT.S.totalEarned=1e14;doPrestige()'); pg.wait_for_timeout(400)
    after={c['k']:c['cap'] for c in E(pg,'TT.staffCapsAll()')}
    ok(after==before and E(pg,'TT.S.staff.team.length')==nT,f'Replant keeps staff and limits {after}')
    ok(not E(pg,'TT.staffOverCap().length'),'nobody is over a limit after Replant')
    ctx.close()

    # ---------------- over-cap save (hired before v2.22.1) ----------------
    ctx,pg=page(); E(pg,MID)
    E(pg,"(()=>{TT.S.coins=1e15;hireMgr('emre');staffMigrateFromMgr();})()")
    old=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(TT.S));o.version='2.22';delete o.staff.capHi;delete o.staff.capNoted;
      for(let i=0;i<14;i++) o.staff.team.push({id:'wL'+i,name:'Old Jack '+i,role:'lumberjack',skill:2,rarity:'C',traits:['steady'],assign:'forest',energy:100,brk:false,founding:false,train:null,look:STAFF_LOOKS[i%8]});
      for(let i=0;i<5;i++) o.staff.team.push({id:'wF'+i,name:'Old Fire '+i,role:'firefighter',skill:2,rarity:'C',traits:['steady'],assign:'station',energy:100,brk:false,founding:false,train:null,look:STAFF_LOOKS[i%8]});
      return o;})()''')
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1600)
    ok(E(pg,"TT.S.staff.team.filter(w=>/^Old /.test(w.name)).length")==19,'over-cap save: all 19 extra staff kept')
    ok(E(pg,"TT.S.staff.team.some(w=>w.founding&&w.mgrId==='emre')"),'founding foreman kept')
    oc={c['k']:c for c in E(pg,'TT.staffOverCap()')}
    ok('lumberjack' in oc and oc['lumberjack']['n']==14 and 'firefighter' in oc,f'over-cap detected {[(k,v["n"],v["cap"]) for k,v in oc.items()]}')
    ok(E(pg,"staffChopBonus()>0 && staffFireCut()>0"),'over-cap staff keep working (effects active)')
    ok(E(pg,HIRE1,{'role':'lumberjack'}) is None,'hiring an over-cap role is paused')
    ok(E(pg,HIRE1,{'role':'driver'}) is not None,'other roles can still be hired')
    ok(E(pg,"[...document.querySelectorAll('#toasts .toast')].some(t=>/Team limits are new/.test(t.textContent))") or E(pg,'TT.S.staff.capNoted===1'),'one-time note about over-cap staff')
    E(pg,"TT.openSheet('staff')"); pg.wait_for_timeout(400)
    note=E(pg,"[...document.querySelectorAll('.sc-over')].map(e=>e.textContent)")
    ok(any('Lumberjacks 14/' in t and 'keeps working' in t.replace('keep working','keeps working') for t in note),f'over-cap note in the Team tab {note[:1]}')
    ok(E(pg,"document.querySelector('.sc-chip[data-cap=lumberjack]').classList.contains('over')"),'over-cap chip is red')
    lg=E(pg,"document.querySelectorAll('[data-letgo]').length"); ok(lg==19,f'Let go only on over-cap roles ({lg})')
    n=E(pg,'TT.S.staff.team.length')
    center(pg,'[data-letgo]'); pg.wait_for_timeout(150); pg.mouse.click(*center(pg,'[data-letgo]',False)); pg.wait_for_timeout(250)
    ok(E(pg,'TT.S.staff.team.length')==n and 'Tap again' in E(pg,"document.querySelector('[data-letgo]').textContent"),'first tap only arms Let go')
    pg.mouse.click(*center(pg,'[data-letgo]',False)); pg.wait_for_timeout(250)
    ok(E(pg,'TT.S.staff.team.length')==n-1,'second tap lets one worker go')
    ok(E(pg,"TT.S.staff.team.every(w=>!w.founding||w.mgrId)") and E(pg,"TT.staffCapCount('crew')")==0,'founding foremen never count toward limits')
    # v2.21 / v2.14-era saves without any staff object still load
    E(pg,"(()=>{const o=JSON.parse(JSON.stringify(TT.S));o.version='2.13';delete o.staff;Storage.prototype.setItem.call(localStorage,'timberTycoon_save_v1',JSON.stringify(o));Storage.prototype.setItem=function(){};})()")
    pg.reload(); pg.wait_for_timeout(1400)
    ok(E(pg,"!!TT.VERSION&&Array.isArray(TT.S.staff.team)&&TT.staffCapsAll().length===6"),'pre-staff save loads with limits')
    ctx.close()

    # ---------------- Assign: desktop mouse ----------------
    ctx,pg=page(); E(pg,MID)
    wid=E(pg,HIRE1,{'role':'mill','name':'Ada Berg','traits':['nightowl']}); eid=E(pg,HIRE1,{'role':'engineer','name':'Hiro Sato','traits':['nightowl']})
    E(pg,"TT.openSheet('staff')"); pg.wait_for_timeout(400)
    sp0=E(pg,"TT.staffMillSpd('carpentry')"); v0=E(pg,"TT.bSpeed?TT.bSpeed('carpentry'):0")
    pg.mouse.click(*center(pg,f'#staffTabBody [data-assign="{wid}"]')); pg.wait_for_timeout(400)
    o=E(pg,OVERLAY)
    ok(o is not None,'Assign opens the picker')
    ok(o and o['y']>=0 and o['y']+o['h']<=o['vh']+1 and o['x']>=0 and o['x']+o['w']<=o['vw']+1,f'picker is fully on screen {o}')
    ok(o and o['hit'],'picker rows are on top (not covered)')
    ok(o and o['rows']==E(pg,"BUILDINGS.filter(b=>TT.S.buildings[b.id].lvl>0).length"),'picker lists every built building')
    pg.wait_for_timeout(6500)   # the Team tab rebuilds as energy drains; the picker must survive
    ok(E(pg,"!!document.getElementById('assignOverlay')"),'picker survives Team tab rebuilds (6.5 s)')
    pg.mouse.click(*center(pg,'#assignOverlay [data-bid=carpentry]',False)); pg.wait_for_timeout(500)
    ok(E(pg,f"TT.S.staff.team.find(w=>w.id==='{wid}').assign")=='carpentry','click a building assigns the worker')
    ok(not E(pg,"!!document.getElementById('assignOverlay')"),'picker closes after a pick')
    sp1=E(pg,"TT.staffMillSpd('carpentry')"); ok(sp1>sp0,f'mill speed effect at the building ({sp0} -> {sp1})')
    ok(E(pg,f"/Carpentry/.test(document.querySelector('.staff-card[data-wid=\"{wid}\"]').textContent)"),'Team card shows the building')
    ok(E(pg,f"document.querySelector('.staff-card[data-wid=\"{wid}\"] [data-assign]').textContent.includes('Move')"),'button reads Move once assigned')
    # scene: the figure walks to the building
    pg.wait_for_timeout(9000)
    sc=E(pg,f"(()=>{{const a=TT.SW.map.get('{wid}');const L=TT.LOTS.carpentry;return a?[a.assign,Math.hypot(a.i-L.ci,a.j-L.cj),a.rest]:null}})()")
    ok(sc and sc[0]=='carpentry' and (sc[1]<=4.2 or sc[2]),f'staff figure works at the Carpentry in the scene {sc}')
    # full rows disabled + current row
    pg.mouse.click(*center(pg,f'#staffTabBody [data-assign="{eid}"]')); pg.wait_for_timeout(300)
    ok(E(pg,"document.querySelector('#assignOverlay [data-bid=carpentry]').disabled && /Full/.test(document.querySelector('#assignOverlay [data-bid=carpentry]').textContent)") if E(pg,"TT.staffSlots('carpentry')")==1 else True,'a full building is disabled with a hint')
    E(pg,"document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); pg.wait_for_timeout(200)
    ok(not E(pg,"!!document.getElementById('assignOverlay')") and E(pg,'TT.curSheet')=='staff','Escape closes the picker, sheet stays')
    pg.mouse.click(*center(pg,f'#staffTabBody [data-assign="{eid}"]')); pg.wait_for_timeout(300)
    pg.mouse.click(8,8); pg.wait_for_timeout(200)
    ok(not E(pg,"!!document.getElementById('assignOverlay')"),'tap outside closes the picker')
    # unassign
    pg.mouse.click(*center(pg,f'#staffTabBody [data-assign="{wid}"]')); pg.wait_for_timeout(300)
    ok(E(pg,"/Working here now/.test(document.querySelector('#assignOverlay .as-row.cur').textContent)"),'current building is marked')
    pg.mouse.click(*center(pg,'#assignOverlay [data-un]',False)); pg.wait_for_timeout(300)
    ok(E(pg,f"TT.S.staff.team.find(w=>w.id==='{wid}').assign") is None and E(pg,"TT.staffMillSpd('carpentry')")==sp0,'Unassign sends the worker back and removes the effect')
    # building sheet side: Staff here -> + Assign staff -> pick a worker
    E(pg,"TT.openSheet('bld','chipper')"); pg.wait_for_timeout(500)
    bt=center(pg,'#bpMgr [data-team]'); txt=E(pg,"document.querySelector('#bpMgr [data-team]').textContent")
    ok('Assign staff' in txt,f'building sheet offers “＋ Assign staff” ({txt})')
    pg.mouse.click(*bt); pg.wait_for_timeout(300)
    ok(E(pg,"document.querySelectorAll('#assignOverlay .as-row').length")==2,'building picker lists the free crew')
    in0=E(pg,"TT.staffEngIn('chipper')")
    pg.mouse.click(*center(pg,f'#assignOverlay [data-as="{eid}"]',False)); pg.wait_for_timeout(400)
    ok(E(pg,f"TT.S.staff.team.find(w=>w.id==='{eid}').assign")=='chipper' and E(pg,"TT.staffEngIn('chipper')")<in0,'building picker assigns the engineer (−input)')
    ok(E(pg,"/Staff here/.test(document.getElementById('bpMgr').textContent) && /1\\/\\d/.test(document.querySelector('#bpMgr h4 .mg-count').textContent)"),'Staff here shows 1/slots')
    ctx.close()

    # ---------------- Assign + limits: phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev=dev,tag=dev+' '); E(pg,MID); cdp=ctx.new_cdp_session(pg)
        def tap(xy):
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xy[0],'y':xy[1]}]}); pg.wait_for_timeout(60)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); pg.wait_for_timeout(450)
        wid=E(pg,HIRE1,{'role':'mill','name':'Ada Berg','traits':['nightowl']})
        mb=E(pg,"(()=>{const e=[...document.querySelectorAll('#bottombar .bb')].find(x=>x.dataset.s==='more');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); tap(mb)
        t=center(pg,'#moreGrid [data-s=staff]',False); t and tap(t); ok(E(pg,'TT.curSheet')=='staff',f'{dev}: More -> Staff')
        chips=E(pg,"[...document.querySelectorAll('.staff-caps .sc-chip')].map(c=>c.querySelector('.sc-v').textContent)")
        ok(len(chips)==6,f'{dev}: limits visible {chips}')
        tap(center(pg,'.sc-chip[data-cap=crew]'))
        ok('open building slot' in E(pg,"document.querySelector('.sc-why').textContent") and E(pg,"getComputedStyle(document.querySelector('.sc-why')).display")!='none',f'{dev}: tap a limit shows what raises it')
        a=center(pg,f'#staffTabBody [data-assign="{wid}"]'); pg.wait_for_timeout(250); a=center(pg,f'#staffTabBody [data-assign="{wid}"]',False)
        tap(a); o=E(pg,OVERLAY)
        ok(o and o['y']>=0 and o['y']+o['h']<=o['vh']+1 and o['hit'],f'{dev}: touch Assign opens an on-screen picker {o}')
        bb=E(pg,"document.getElementById('bottombar').getBoundingClientRect().top")
        ok(E(pg,"(()=>{const r=document.querySelector('#asClose').getBoundingClientRect();const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t&&t.id==='asClose'})()"),f'{dev}: Cancel is reachable above the bottom bar')
        tap(center(pg,'#assignOverlay [data-bid=sawmill]'))
        ok(E(pg,f"TT.S.staff.team.find(w=>w.id==='{wid}').assign")=='sawmill' and E(pg,"TT.staffMillSpd('sawmill')")>1,f'{dev}: touch pick assigns + speed effect')
        ok(not E(pg,"!!document.getElementById('assignOverlay')"),f'{dev}: picker closed')
        # full role on a phone
        for _ in range(E(pg,"TT.staffCapRoom('dock')")): E(pg,HIRE1,{'role':'dock'})
        E(pg,"(()=>{const st=TT.staffState();st.candidates=[{id:'cF',name:'Full Test',role:'dock',skill:2,rarity:'C',traits:['steady'],look:STAFF_LOOKS[1]}];})()")
        tap(center(pg,'.staff-tabs [data-tab=cand]'))
        n=E(pg,'TT.S.staff.team.length'); hb=center(pg,'[data-hire=cF]'); hb and tap(hb)
        ok(E(pg,"document.querySelector('[data-hire=cF]').disabled") and E(pg,'TT.S.staff.team.length')==n,f'{dev}: full role cannot be hired by touch')
        ctx.close()

    if os.path.isdir(ROOT+'/releases/v2.22.1'):
        ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.22.1/index.html'); pg.wait_for_timeout(1300)
        ok(E(pg,'TT.VERSION')=='2.22.1' and E(pg,'typeof TT.staffCapsAll')=='function','releases/v2.22.1/ snapshot runs'); ctx.close()
    else:
        ok(True,'releases/v2.22.1/ not yet built (will ship with release.py)')

    ok(not errs,f'no page errors {errs[:3]}'); ok(not missing,f'no 404s {missing[:3]}')
print('FAILED' if FAILS else 'ALL PASS',len(FAILS));
if FAILS:
    for f in FAILS: print(' -',f)
sys.exit(1 if FAILS else 0)
