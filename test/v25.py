# v2.5 tests: research lab + RP, research tree (costs, prerequisites, seeds, effects, gating), tech buildings + glue,
# harbour / routes / fleet (load, depart, payout, return, auto-repeat, spikes), prestige + save + offline persistence,
# R&D sheet UI (tree, detail, trade map, city cards), scene hit areas, mobile fit, v2.4 save migration
from playwright.sync_api import sync_playwright
import json
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OLD=BASE+'releases/timber-tycoon-v2.4.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
QUIET='TT.S.orders.next=1e9;TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.S.fireCool=1e9;TT.S.nextEvent=1e12;'
MID='''(()=>{TT.S.coins=1e15;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",30);TT.buyCollector("truck",20);TT.buyCollector("harvester",10);
for(const [b,n] of [["sawmill",70],["chipper",40],["kiln",40],["carpentry",30],["pellet",30],["paper",20],["furniture",12]]) TT.buyBuilding(b,n);TT.S.coins=1e12;TT.S.time=1000;'''+QUIET+'''TT.simulate(3);})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    def fresh(vp=(1280,800)):
        ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400); return ctx,pg
    E=lambda pg,s: pg.evaluate(s)

    # --- v2.4 save migration ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(E(pg,'TT.VERSION')=='2.4','old build is v2.4')
    E(pg,'(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",25);TT.buyBuilding("sawmill",30);TT.buyBuilding("kiln",6);TT.S.golden=4;TT.hireMgr&&TT.S.coins>0;TT.S.mgr={sawmill:3};TT.S.station={lvl:2};TT.save(true);})()')
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=E(pg,'TT.S')
    ok(float(S['version'])>=2.5,'v2.4 save migrated to 2.5+')
    ok(S['collectors']==old['collectors'] and S['buildings']['sawmill']['lvl']==30 and S['golden']==4,'collectors, buildings, golden kept')
    ok(S['mgr']=={'sawmill':3} and S['station']['lvl']==2,'v2.4 managers + fire station kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.02,'coins kept')
    ok(S['research']=={} and S['rp']==0 and S['trade']['lvl']==0 and S['trade']['fleet']==[] and S['trade']['routes']=={},'research / RP / trade state initialised')
    ok(all(S['buildings'][k]['lvl']==0 for k in ('lab','plymill','toyshop','boatyard')),'tech buildings start unbuilt')
    ok(all(k in S['res'] for k in ('glue','plywood','toys','boats')),'new goods in the stock')
    ctx.close()

    # --- fresh game: R&D hidden; lab gated on the paper mill ---
    ctx,pg=fresh()
    ok(E(pg,"document.getElementById('bbRnd').classList.contains('hidden')"),'R&D button hidden in a fresh game')
    E(pg,"TT.S.coins=1e9")
    ok(not E(pg,"TT.buyBuilding('lab',1)") and E(pg,"TT.S.buildings.lab.lvl")==0,'lab cannot be built before a Paper Mill')
    ok(not E(pg,"TT.doResearch('science')"),'no research without a lab')
    ctx.close()

    # --- mid game: lab, RP, research tree ---
    ctx,pg=fresh(); E(pg,MID); 
    try: pg.wait_for_function("!document.getElementById('bbRnd').classList.contains('hidden')",timeout=5000)
    except Exception: pass
    ok(not E(pg,"document.getElementById('bbRnd').classList.contains('hidden')"),'R&D button appears once a Paper Mill exists')
    ok(E(pg,"TT.campusOpen()"),'R&D campus opens with the paper mill')
    d=E(pg,"(()=>{const c0=TT.S.coins;const r=!!TT.buyBuilding('lab',1);return [r,c0-TT.S.coins]})()")
    ok(d[0] and E(pg,"TT.S.buildings.lab.lvl")==1,'lab built')
    ok(abs(d[1]-3e6)<1,'lab costs 3.00M')
    E(pg,"TT.simulate(10,.25)")
    st=E(pg,"({rp:TT.S.rp,rate:TT.labRP(),sp:TT.bstat.lab.speed,f:TT.bstat.lab.f})")
    ok(st['rate']>0 and abs(st['rate']-st['sp']*st['f']*0.015)<1e-9,f"lab RP rate = speed x 0.015 ({st})")
    ok(st['rp']>0 and abs(st['rp']-st['rate']*10)/max(st['rate']*10,1e-9)<0.15,'RP accumulates over time')
    fl=E(pg,"TT.rates.paper.c"); ok(fl>0,'lab consumes paper')
    E(pg,"TT.S.rp=29")
    ok(not E(pg,"TT.doResearch('blades')"),'prerequisite enforced (blades needs Wood Science)')
    d=E(pg,"(()=>{TT.S.rp=29;const r=TT.doResearch('science');return [r,TT.S.rp]})()")
    ok(d[0] and abs(d[1]-24)<1e-6,'Wood Science costs 5 RP')
    ok(not E(pg,"TT.doResearch('science')"),'a node cannot be researched twice')
    ok(not E(pg,"(()=>{TT.S.rp=24;return TT.doResearch('blades')})()"),'not enough RP -> blocked (24 < 30)')
    E(pg,"TT.simulate(.5,.25)"); d=E(pg,"[TT.M.lab,TT.labRP(),TT.bstat.lab.speed*TT.bstat.lab.f*0.015]"); ok(d[0]==1.25 and abs(d[1]/d[2]-1.25)<1e-6,f'Wood Science: lab +25 % RP ({d})')
    E(pg,"TT.S.rp=1e6")
    s0=E(pg,"TT.bSpeed('sawmill')"); E(pg,"TT.doResearch('blades')"); ok(abs(E(pg,"TT.bSpeed('sawmill')")/s0-1.15)<1e-6,'Carbide Blades: sawmill +15 %')
    p0=E(pg,"TT.price('planks')"); E(pg,"TT.doResearch('pulp');TT.doResearch('market')"); ok(abs(E(pg,"TT.price('planks')")/p0-1.05)<1e-6,'Market Research: prices +5 %')
    ok(not E(pg,"TT.buyBuilding('plymill',1)"),'Plywood Mill locked before its research')
    E(pg,"TT.S.autosell.glue=false;TT.doResearch('tar')"); g0=E(pg,"TT.S.res.glue"); E(pg,"TT.simulate(12,.25)")
    ch=E(pg,"TT.rates.charcoal.p"); gl=E(pg,"TT.rates.glue.p")
    ok(E(pg,"TT.S.res.glue")>g0 and abs(gl/ch-0.5)<0.04,f'Pine Tar Glue: kilns distil ½ glue per charcoal ({gl:.1f}/{ch:.1f})')
    E(pg,"TT.doResearch('plywood')"); ok(E(pg,"!!TT.buyBuilding('plymill',2)"),'Plywood Mill unlocked by research')
    E(pg,"TT.S.autosell.plywood=false;TT.simulate(4,.25)"); ok(E(pg,"TT.S.res.plywood")>0,'plywood produced from planks + glue')
    E(pg,"TT.S.seeds=4;TT.doResearch('bending');TT.doResearch('toys')")
    ok(not E(pg,"TT.doResearch('automation')"),'Automation needs 5 seeds')
    E(pg,"TT.S.seeds=6"); ok(E(pg,"TT.doResearch('automation')") and E(pg,"TT.S.seeds")==1,'Automation spends 5 seeds')
    ok(E(pg,"!!TT.buyBuilding('toyshop',1)"),'Toy Workshop unlocked')
    E(pg,"TT.doResearch('boats')"); ok(not E(pg,"TT.buyBuilding('boatyard',1)"),'Boat Yard also needs the harbour')
    ok(E(pg,"TT.S.ach.res1")!=None,'trophy: Eureka! (first research)')

    # --- harbour + trade ---
    ok(E(pg,"TT.harborCost()")==2.5e7,'harbour costs 25.0M')
    ok(E(pg,"TT.buyHarbor()") and E(pg,"TT.harborLvl()")==1,'harbour built')
    ok(E(pg,"TT.harborOpen()") and E(pg,"!!TT.buyBuilding('boatyard',1)"),'Boat Yard buildable with harbour + research')
    ok(not E(pg,"!!TT.dispatch('ist','furniture')"),'cannot ship on a closed route')
    d=E(pg,"(()=>{const c0=TT.S.coins;const r=TT.openRoute('ist');return [r,c0-TT.S.coins]})()")
    ok(d[0] and abs(d[1]-2e7)<1,'Istanbul route opens for 20.0M')
    E(pg,"TT.S.autosell.furniture=true")
    v=E(pg,"(()=>{const v=TT.dispatch('ist','furniture');return v&&{cap:v.cap,mode:v.mode,state:v.state}})()")
    ok(v and v['mode']=='train' and v['state']=='load' and v['cap']>0,f'train loading furniture for Istanbul ({v})')
    ok(not E(pg,"!!TT.dispatch('ist','chairs')"),'only one train at harbour Lv 1')
    E(pg,"TT.simulate(10,.25)"); got=E(pg,"TT.S.trade.fleet[0].got"); ok(got>0,f'train collects goods from production ({got:.0f})')
    E(pg,"TT.S.trade.dem={};TT.S.trade.spike=null;TT.S.trade.nextDrift=1e12;TT.S.trade.nextSpike=1e12")
    mult=E(pg,"TT.tradeMult('ist','furniture')")
    ok(abs(mult-1.38*E(pg,"TT.M?1:1"))<0.5,'Istanbul pays a furniture premium')
    E(pg,"TT.departNow(TT.S.trade.fleet[0].id)"); v=E(pg,"TT.S.trade.fleet[0]")
    ok(v['state']=='out' and abs(v['pay']-v['got']*E(pg,"TT.price('furniture')")*v['mult'])/v['pay']<1e-6,'departure fixes payout = cargo x price x multiplier')
    c0=E(pg,"TT.S.coins"); e0=E(pg,"TT.S.totalEarned"); half=v['trip']/2
    E(pg,f"TT.simulate({half+0.5},.5)")
    st=E(pg,"TT.S.trade.stats"); ok(st['trips']==1 and abs(st['earned']-v['pay'])<1e-6*v['pay'],'payout on arrival, counted in trade stats')
    ok(E(pg,"TT.S.totalEarned")-e0>=v['pay']*0.999,'payout counts as earnings')
    ok(E(pg,"TT.S.trade.fleet[0].state")=='back','vessel heads home after delivery')
    ok(E(pg,"TT.S.ach.trade1")!=None,'trophy: Bon Voyage')
    E(pg,f"TT.simulate({half+0.5},.5)")
    fl=E(pg,"TT.S.trade.fleet"); ok(len(fl)==1 and fl[0]['state']=='load' and fl[0]['good']=='furniture' and fl[0]['id']!=v['id'],'auto-repeat: returning train reloads the same cargo')
    E(pg,"TT.S.trade.repeat=false;TT.departNow(TT.S.trade.fleet[0].id)"); E(pg,f"TT.simulate({v['trip']+1},.5)")
    ok(E(pg,"TT.S.trade.fleet.length")==0,'auto-repeat off: vessel stays home')
    E(pg,"TT.S.trade.repeat=true")
    # spikes
    E(pg,"TT.S.trade.spike={city:'ist',good:'chairs',ends:TT.S.time+100}")
    m1=E(pg,"TT.tradeMult('ist','chairs')"); E(pg,"TT.S.trade.spike.ends=TT.S.time-1"); m0=E(pg,"TT.tradeMult('ist','chairs')")
    ok(abs(m1/m0-2)<1e-9,'demand spike doubles the multiplier')
    # demand drift
    E(pg,"TT.S.trade.nextDrift=0"); E(pg,"TT.simulate(.5,.5)"); d=E(pg,"Object.values(TT.S.trade.dem.ist||{})")
    ok(len(d)>5 and min(d)>=0.8 and max(d)<=1.25,'demand drifts within 0.8-1.25')
    # harbour levels -> slots
    E(pg,"TT.S.coins=1e14;TT.buyHarbor();TT.buyHarbor()")
    ok(E(pg,"TT.harborLvl()")==3,'harbour upgraded to Lv 3')
    E(pg,"TT.openRoute('rot');TT.openRoute('ham')")
    n=E(pg,"[TT.dispatch('rot','pellets'),TT.dispatch('rot','paper'),TT.dispatch('rot','charcoal'),TT.dispatch('ist','chairs'),TT.dispatch('ham','pellets'),TT.dispatch('ham','plywood')].map(x=>!!x)")
    ok(n==[True,True,False,True,True,False],f'Lv 3: 2 ships + 2 trains ({n})')
    # ship visible at berth, train at platform
    pg.wait_for_timeout(300)
    ok(E(pg,"TT.S.trade.fleet.every(v=>!!TT.vesselPose(v))"),'loading vessels have a pose in the scene')

    # --- UI: R&D sheet ---
    E(pg,"TT.openResearch()"); pg.wait_for_timeout(400)
    ok(E(pg,"TT.curSheet")=='rnd','R&D sheet opens')
    ok(E(pg,"document.querySelectorAll('#rndRes .rn').length")>=14,'research tree shows all nodes')
    ok(E(pg,"document.querySelectorAll('#rndRes .rn.done').length")==E(pg,"Object.keys(TT.S.research).length"),'done nodes marked')
    ok(E(pg,"document.querySelectorAll('#rndRes path.re').length")>=15,'tree edges drawn')
    E(pg,"TT.S.rp=1e6"); pg.wait_for_timeout(100)
    E(pg,"document.querySelector('#rndRes .rn[data-id=\"drying\"]').click()"); pg.wait_for_timeout(200)
    ok('Kiln Science' in E(pg,"document.getElementById('resDetail').textContent"),'tapping a node shows its details')
    E(pg,"document.getElementById('resBuy').click()"); pg.wait_for_timeout(200)
    ok(E(pg,"TT.hasRes('drying')"),'Research button researches the node')
    wrap=E(pg,"(()=>{const w=document.querySelector('.rtree-wrap'),t=document.querySelector('.rtree');return [w.clientWidth,t.offsetWidth]})()")
    ok(wrap[1]<=wrap[0]+1,f'tree fits the panel width ({wrap})')
    E(pg,"document.querySelector('#rndTabs button[data-t=\"trade\"]').click()"); pg.wait_for_timeout(400)
    ok(not E(pg,"document.getElementById('rndTrade').classList.contains('hidden')"),'Trade tab switches')
    ok(E(pg,"document.querySelectorAll('#tradeBody .city').length")==6,'six city cards')
    ok(E(pg,"document.querySelectorAll('#tradeBody .vsl').length")==E(pg,"TT.S.trade.fleet.length"),'fleet list shows every vessel')
    px=E(pg,"(()=>{const c=document.getElementById('tradeMap');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4) if(d[i+3]>0) n++;return [n,c.width*c.height]})()")
    ok(px[0]>px[1]*.95,'trade map canvas drawn')
    E(pg,"TT.S.coins=1e14"); pg.wait_for_timeout(200)
    E(pg,"document.querySelector('#tradeBody .cy-open[data-c=\"dxb\"]').click()"); pg.wait_for_timeout(200)
    ok(E(pg,"TT.routeOpen('dxb')"),'city unlock button opens the route')
    E(pg,"TT.S.trade.fleet=[]"); pg.wait_for_timeout(200)
    E(pg,"TT.updateRnd&&0"); pg.wait_for_timeout(300)
    E(pg,"document.querySelector('#tradeBody .gch[data-c=\"dxb\"]:not([disabled])').click()"); pg.wait_for_timeout(200)
    ok(E(pg,"TT.S.trade.fleet.length")==1 and E(pg,"TT.S.trade.fleet[0].city")=='dxb','tapping a good chip loads a ship for that city')
    E(pg,"TT.closeSheet()"); pg.wait_for_timeout(300)
    # scene hit areas
    sp=E(pg,"(()=>{const p=TT.P(17.5,3.0,0);return TT.w2s(p[0],p[1])})()")
    E(pg,"(()=>{const c=TT.cam;c.z=c.tz=1.4;const p=TT.P(17,1.5,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()"); pg.wait_for_timeout(500)
    sp=E(pg,"(()=>{const p=TT.P(19.2,-1.0,0);return TT.w2s(p[0],p[1])})()")
    ok(E(pg,f"TT.hitTest({sp[0]},{sp[1]}).type")=='campus',f'campus pavement hit -> research ({sp})')
    sp=E(pg,"(()=>{const L=TT.LOTS.lab;return TT.w2s(L.top[0],L.top[1]+25)})()")
    h=E(pg,f"TT.hitTest({sp[0]},{sp[1]})"); ok(h.get('id')=='lab','lab building is tappable')
    E(pg,"(()=>{const c=TT.cam;const p=TT.P(35,14.5,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()"); pg.wait_for_timeout(500)
    sp=E(pg,"(()=>{const p=TT.P(36.2,13.0,0);return TT.w2s(p[0],p[1])})()")
    ok(E(pg,f"TT.hitTest({sp[0]},{sp[1]}).type")=='harbor','harbour hit -> trade')
    pg.mouse.click(sp[0],sp[1]); pg.wait_for_timeout(300)
    ok(E(pg,"TT.curSheet")=='rnd' and not E(pg,"document.getElementById('rndTrade').classList.contains('hidden')"),'tapping the harbour opens the Trade tab')
    E(pg,"TT.closeSheet()")
    # frame time with campus + harbour + fleet
    E(pg,"TT.fitCamera(true)"); pg.wait_for_timeout(600)
    ft=E(pg,"new Promise(r=>{let n=0,t0=performance.now();function f(){if(++n>=40) r((performance.now()-t0)/40); else requestAnimationFrame(f);}requestAnimationFrame(f);})")
    ok(ft<45,f'frame time with campus + harbour + fleet {ft:.1f} ms')

    # --- persistence: save/load, prestige, offline ---
    E(pg,"TT.S.trade.fleet=[];TT.dispatch('ist','chairs');TT.simulate(3,.25);TT.save(true)")
    before=E(pg,"JSON.parse(JSON.stringify({r:TT.S.research,rp:TT.S.rp,t:TT.S.trade}))")
    pg.reload(); pg.wait_for_timeout(800)
    after=E(pg,"JSON.parse(JSON.stringify({r:TT.S.research,rp:TT.S.rp,t:TT.S.trade}))")
    ok(after['r']==before['r'] and after['t']['lvl']==3 and after['t']['routes']==before['t']['routes'],'research, harbour and routes survive reload')
    ok(len(after['t']['fleet'])==1 and after['t']['fleet'][0]['city']=='ist','fleet survives reload')
    # offline: fleet completes trips
    E(pg,"TT.S.trade.fleet[0].got=TT.S.trade.fleet[0].cap");E(pg,"TT.S.trade.repeat=false")
    t0=E(pg,"TT.S.trade.stats.trips"); E(pg,"TT.simulateOffline(200)")
    ok(E(pg,"TT.S.trade.stats.trips")==t0+1 and E(pg,"TT.S.trade.fleet.length")==0,'offline: vessel departs, gets paid and returns')
    E(pg,"TT.S.trade.repeat=true;TT.dispatch('ist','chairs');TT.S.totalEarned=1e13")
    rp,nres=E(pg,"(()=>{const r=[TT.S.rp,Object.keys(TT.S.research).length];TT.doPrestige();return r})()"); pg.wait_for_timeout(300)
    S=E(pg,"TT.S")
    ok(len(S['research'])==nres and abs(S['rp']-rp)<1e-6,'Replant keeps research + RP')
    ok(S['trade']['lvl']==3 and len(S['trade']['routes'])==4 and S['trade']['stats']['trips']>=2,'Replant keeps harbour level, routes, trade stats')
    ok(S['trade']['fleet']==[] and all(S['buildings'][k]['lvl']==0 for k in ('lab','plymill','toyshop','boatyard')),'Replant clears fleet + tech buildings')
    ok(not E(pg,"TT.labBuilt()") and E(pg,"TT.hasRes('plywood')"),'research stays, lab must be rebuilt')
    ctx.close()

    # --- mobile ---
    ctx,pg=fresh((390,844)); E(pg,MID); E(pg,"TT.buyBuilding('lab',1);TT.S.rp=50;TT.doResearch('science');TT.buyHarbor();TT.openRoute('ist')"); pg.wait_for_timeout(400)
    bb=E(pg,"[...document.querySelectorAll('button.bb')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.width]})")
    ok(len(bb)==9 and min(x[0] for x in bb)>=0 and max(x[1] for x in bb)<=390 and min(x[2] for x in bb)>=36,f'mobile: {len(bb)} bottom buttons fit')
    lab=E(pg,"[...document.querySelectorAll('button.bb .l')].map(e=>e.scrollWidth<=e.parentElement.clientWidth+1)")
    ok(all(lab),'mobile: bottom labels not clipped')
    E(pg,"TT.openResearch()"); pg.wait_for_timeout(400)
    wrap=E(pg,"(()=>{const w=document.querySelector('.rtree-wrap'),t=document.querySelector('.rtree');return [w.clientWidth,t.offsetWidth]})()")
    ok(wrap[1]<=wrap[0]+1,f'mobile: tree fits ({wrap})')
    ov=E(pg,"document.documentElement.scrollWidth<=innerWidth+1"); ok(ov,'mobile: no horizontal overflow')
    E(pg,"TT.openTrade()"); pg.wait_for_timeout(400)
    cw=E(pg,"(()=>{const c=document.getElementById('tradeMap');return [c.clientWidth,c.parentElement.clientWidth]})()")
    ok(cw[0]<=cw[1]+1 and cw[0]>250,f'mobile: trade map fits ({cw})')
    ctx.close()
    bad=[e for e in errs if 'favicon' not in e]
    ok(not bad,'no console errors/warnings '+json.dumps(bad[:4]))
    b.close()
print('\n%d failures'%len(FAILS)); [print(' -',f) for f in FAILS]
