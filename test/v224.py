# v2.24: (1) the Biomass Power Plant can burn surplus logs (raw use, never a sale) with a priority setting
# (Off / Backup / Logs first) and a yard reserve, and never starves Phase I; (2) veneer/plywood supply chain rebalanced
# (Peeler + Plywood Mill yield curve, leaner recipes, value sharing for veneer/plywood, Veneer Dryer = yield, more pine-tar glue).
# Cost-balanced + greedy multi-Replant sims, old saves, desktop + touch.
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
QUIET="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;window.toast=()=>{};})()"
SETUP='''(()=>{S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  TT.buyPlanter("team",6);TT.buyBuilding("sawmill",10);TT.buyBuilding("chipper",30);TT.buyBuilding("kiln",8);TT.buyBuilding("pellet",6);TT.buyBuilding("peeler",10);S.coins=1e13;TT.buyPower();TT.buyPower();TT.buyPower();S.coins=1e13;M=computeMods();})()'''
BAL='''(B)=>{S.premium.lvl=Math.max(1,S.premium.lvl);for(const n of RNODES) S.research[n.id]=1;if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}
 for(const c of COLLECTORS) S.collectors[c.id]=400;for(const k in S.res) S.res[k]=0;S.forest.m=1e9;S.orders.active=null;if(S.daily) S.daily.active=[];if(S.trade) S.trade.fleet=[];
 M=computeMods();for(let k=0;k<120;k++){tick(1,false);S.forest.m=1e9;}
 const r={};for(const b of BUILDINGS){const st=S.buildings[b.id];if(!st.lvl||!bldUnlocked(b.id)||!(b.inp.veneer||b.inp.plywood)) continue;const bs=bstat[b.id];r[b.id]=[bs.lim||'-',+bs.f.toFixed(2)];}
 return {f:r,vp:rates.veneer.p,vd:rates.veneer.d,pp:rates.plywood.p,pd:rates.plywood.d};}'''
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),
 spend:()=>{for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);
   S.power.lvl=Math.max(S.power.lvl,6);S.power.logs=window._pm;S.power.res=30;M=computeMods();window._cs={};},
 want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=900,
 hold:()=>{const C=window._cs;for(const r of ['veneer','plywood']){const us=BUILDINGS.filter(b=>b.inp[r]&&S.buildings[b.id].lvl&&S.buildings[b.id].on&&bldUnlocked(b.id));if(!us.length) continue;
   const x=C[r]||(C[r]={a:[]});x.a.push(us.some(b=>bstat[b.id].lim===r&&bstat[b.id].f<.95)?1:0);}
   const lg=C.logs||(C.logs={n:0,cf:0,bn:0});lg.n++;const ls=['sawmill','peeler'].some(id=>S.buildings[id].lvl&&bstat[id]&&bstat[id].lim==='logs'&&bstat[id].f<.95);
   if(ls&&pwLastLogs>0) lg.cf++;if(pwLastLogs>0) lg.bn++;return false;}}'''
EXTRA='''(()=>{const C=window._cs,o={};for(const r of ['veneer','plywood']){const a=(C[r]||{a:[]}).a,h=a.slice(a.length>>1);o[r]=h.length?h.reduce((s,v)=>s+v,0)/h.length:0;}
 o.cf=C.logs.cf;o.bn=C.logs.bn/Math.max(1,C.logs.n);o.cs=cs();o.ply=S.buildings.plymill.lvl;return o;})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page(); watch(pg,tag); pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg

    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,24),f"VERSION >= 2.24 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,24),'sw cache bumped to >= v2.24')
    # ---------------- recipes / yield ----------------
    r=E(pg,"""({pe:BMAP.peeler.out.veneer,bark:BMAP.peeler.out.bark,pi:BMAP.peeler.inp.logs,pmv:BMAP.plymill.inp.veneer,pmg:BMAP.plymill.inp.glue,pmo:BMAP.plymill.out.plywood,
      fv:BMAP.furniture.inp.veneer,by:BMAP.boatyard.inp.plywood,tg:TAR_GLUE,dry:wsKind('peeler',2)})""")
    ok(r=={'pe':4,'bark':1,'pi':4,'pmv':4,'pmg':2,'pmo':3,'fv':6,'by':8,'tg':.65,'dry':'yld'},f'v2.24 recipes: peeler 4 logs→4 veneer+1 bark, plymill 4 veneer+2 glue→3 plywood, furniture 6 veneer, boat 8 plywood, glue .65, Veneer Dryer = yield ({r})')
    r=E(pg,"""(()=>{const o={};for(const id of ['sawmill','peeler','plymill','furniture']){o[id]=[];for(const l of [49,60,100]){S.buildings[id].lvl=l;o[id].push(+chainYield(id).toFixed(3));}S.buildings[id].lvl=0;}return o;})()""")
    ok(r['peeler']==r['sawmill'] and r['peeler'][0]==1 and r['peeler'][1]>1.4 and r['peeler'][2]>r['peeler'][1],f"Peeler gets the Sawmill yield curve from Lv 50 ({r['peeler']})")
    ok(all(a>=b for a,b in zip(r['plymill'],r['sawmill'])) and r['plymill'][0]>1,f"Plywood Mill: at least the Sawmill curve, with the v2.29.1 early start ({r['plymill']})")
    ok(r['furniture']==[1,1,1],'consumers get no yield bonus')
    # bark is not multiplied by the peel yield
    r=E(pg,"""(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;}S.buildings.peeler.lvl=60;S.buildings.peeler.on=true;S.res.logs=1e12;S.res.veneer=0;S.res.bark=0;S.autosell.veneer=false;S.autosell.bark=false;
      M=computeMods();tick(1,false);return {v:S.res.veneer,b:S.res.bark,y:chainYield('peeler'),f:bstat.peeler.f};})()""")
    ok(r['f']>.99 and abs(r['v']/r['b']-4*r['y'])/(4*r['y'])<1e-6,f"peel yield makes more veneer, not more bark (veneer/bark {r['v']/max(1e-9,r['b']):.2f} = 4×{r['y']:.2f})")
    ctx.close()
    # ---------------- cost-balanced late game: no veneer / plywood shortage ----------------
    ctx,pg=page()
    for B in [1e8,1e10,1e12,1e14]:
        pg.goto(URL+'?bal='+str(B)); pg.wait_for_timeout(900); E(pg,QUIET); E(pg,"window.save=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{}")
        r=E(pg,f"({BAL})({B})")
        short=[k for k,v in r['f'].items() if v[0] in ('veneer','plywood') and v[1]<.95]
        ok(not short and r['vp']>=r['vd'] and r['pp']>=r['pd'],f"cost-balanced {B:.0e}: veneer {r['vp']:.3g}/{r['vd']:.3g}/s, plywood {r['pp']:.3g}/{r['pd']:.3g}/s, no consumer veneer/plywood-bound ({short})")
    ctx.close()
    # ---------------- greedy play over several Replants, log fuel 'first' ----------------
    # v2.26: random setbacks (a broken Peeler) are tested in v226.py; this sim measures the chain's balance, so they are off here
    # v2.28.1: seeded Math.random so the greedy sim is the same every run (it was flaky at the 10 % plywood threshold)
    ctx,pg=page(init=CLEAR+';(()=>{let s=7;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})()'); E(pg,"window._pm='first';window.mishTick=()=>{}")
    R=E(pg,f"({SIM})({{runs:5,maxMin:25,hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})")
    print('   runs:',[(x['run'],round(x['x']['cs'],1),round(x['x']['veneer'],2),round(x['x']['plywood'],2),x['x']['cf'],round(x['x']['bn'],2)) for x in R])
    ok(len(R)==5 and R[-1]['x']['cs']>5,f'5 runs with 4 Replants (forest value ×{R[-1]["x"]["cs"]:.1f})')
    ok(all(x['x']['veneer']<=.1 for x in R),f"every run: veneer short in ≤10 % of the second half ({[round(x['x']['veneer'],2) for x in R]}, v2.23: 100 %)")
    ok(all(x['x']['plywood']<=.1 for x in R),f"every run: plywood short in ≤10 % of the second half ({[round(x['x']['plywood'],2) for x in R]}, v2.23: 100 %)")
    ok(all(x['x']['cf']==0 for x in R),'log fuel never burns while the Sawmill / Peeler are short of logs')
    ok(sum(x['x']['bn'] for x in R)>0,'the plant did burn surplus logs in the sim')
    ctx.close()
    # ---------------- log fuel logic ----------------
    ctx,pg=page(); E(pg,SETUP)
    ok(E(pg,"[S.power.logs,S.power.res,pwLogMode(),pwReserveSec()]")==['surplus',60,'surplus',60],'new game: log fuel "Backup", 60 s reserve')
    ok(E(pg,"canSell('logs')")==False,'logs are still never sold')
    # surplus: full yard, pellet press + kiln off → logs keep the plant running, Phase I fully fed, reserve kept
    r=E(pg,"""(()=>{for(const c of COLLECTORS) S.collectors[c.id]=Math.max(S.collectors[c.id],300);S.buildings.pellet.on=false;S.buildings.kiln.on=false;S.res.pellets=0;S.res.charcoal=0;
      S.power.logs='surplus';S.power.res=30;M=computeMods();S.res.logs=logCap();let bad=0,burned=0,minLeft=1e99,starve=0,sold=0;
      for(let k=0;k<120;k++){S.forest.m=1e9;const c0=S.coins;tick(1,false);burned+=pwLastLogs;
        for(const id of ['sawmill','peeler','chipper']) if(S.buildings[id].lvl&&bstat[id].lim==='logs'&&bstat[id].f<1-1e-9) starve++;
        if(pwLastLogs>0) minLeft=Math.min(minLeft,S.res.logs/Math.max(1e-9,pwLogReserve()));}
      return {burned,starve,minLeft,eff:pwEff(),st:pwStatus().k,bl:S.power.burn.logs,ls:rates.logs.s};})()""")
    ok(r['burned']>0 and r['eff']>.9 and r['st']=='ok',f"pellet press + kiln off, full yard: surplus logs run the plant (eff {r['eff']:.2f}, {r['bl']:.3g} logs/s)")
    ok(r['starve']==0,'… and the Sawmill, Peeler and Chipper never ran short of logs')
    ok(r['minLeft']>=.999,f"… and the yard never dropped below the reserve after a burn (min {r['minLeft']:.3f}× reserve)")
    ok(r['ls']==0,'… burned logs count as use, never as sales')
    # deficit: collectors can't keep up → no logs burned at all, even with stock above the reserve
    r=E(pg,"""(()=>{for(const c of COLLECTORS) S.collectors[c.id]=0;S.power.logs='first';S.power.res=30;M=computeMods();S.res.logs=1e9;let burned=0;
      for(let k=0;k<20;k++){tick(1,false);burned+=pwLastLogs;}return {burned,eff:pwEff()};})()""")
    ok(r['burned']==0,f'log deficit (collectors below Phase-I use): the plant burns no logs, even "Logs first" with a big stock ({r})')
    # off
    r=E(pg,"""(()=>{for(const c of COLLECTORS) S.collectors[c.id]=300;S.power.logs='off';M=computeMods();S.res.logs=logCap();let burned=0;
      for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);burned+=pwLastLogs;}return {burned,st:pwStatus().k};})()""")
    ok(r['burned']==0 and r['st']=='nofuel',f'log fuel Off: no logs burned, plant reports no fuel ({r})')
    # priority: plenty of pellets/charcoal → 'Backup' burns no logs, 'Logs first' burns logs and saves pellets/charcoal
    r=E(pg,"""(()=>{S.buildings.pellet.on=true;S.buildings.kiln.on=true;M=computeMods();const run=m=>{S.power.logs=m;let lg=0,pc=0;
      for(let k=0;k<30;k++){S.forest.m=1e9;S.res.logs=logCap();S.res.pellets=1e9;S.res.charcoal=1e9;tick(1,false);lg+=pwLastLogs;}return [lg,S.power.burn.pellets+S.power.burn.charcoal,pwEff()];};
      return {gap:run('surplus'),first:run('first')};})()""")
    ok(r['gap'][0]==0 and r['gap'][2]>.9,f"'Backup' with plenty of pellets/charcoal burns no logs ({r['gap']})")
    ok(r['first'][0]>0 and r['first'][1]<r['gap'][1]*.8 and r['first'][2]>.9,f"'Logs first' burns logs and less pellets/charcoal ({r['first']})")
    ok(E(pg,"[setPowerLogs('bogus'),setPowerReserve(7),setPowerLogs('off'),setPowerReserve(120),S.power.logs,S.power.res]")==[False,False,True,True,'off',120],'setters validate input')
    # Replant keeps the plant settings
    r=E(pg,"(()=>{S.power.logs='first';S.power.res=300;S.totalEarned=1e15;S.seeds=0;doPrestige();return [S.power.lvl,S.power.logs,S.power.res];})()")
    ok(r[0]>=3 and r[1:]==['first',300],f'Replant keeps the log fuel mode and reserve ({r})')
    # value sharing now covers veneer and plywood
    r=E(pg,"""(()=>{for(const b of BUILDINGS) S.buildings[b.id].lvl=0;for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=1;S.buildings.furniture.lvl=30;S.buildings.plymill.lvl=30;S.buildings.furniture.on=S.buildings.plymill.on=true;M=computeMods();
      const act=['furniture','plymill'].map(id=>[BMAP[id],bSpeed(id)]),dem={veneer:act.reduce((t,[b,sp])=>t+b.inp.veneer*sp*bInMult(b.id),0)};S.res.veneer=dem.veneer*.4;
      S.prefs.plankMode='fair';const fair=shareAlloc('veneer',act,dem,1);S.prefs.plankMode='value';const val=shareAlloc('veneer',act,dem,1);S.prefs.plankMode='fair';
      const best=shareValue(BMAP.plymill,'veneer')>shareValue(BMAP.furniture,'veneer')?'plymill':'furniture';return {fair,val,best,ok:SHARED_GOODS.join()};})()""")
    o='furniture' if r['best']=='plymill' else 'plymill'
    ok(r['fair'] is None and r['val'] and r['val'][r['best']]>r['val'][o]>0,f"'best value' sharing now also covers veneer ({r['val']}, best {r['best']}) and plywood ({r['ok']})")
    ctx.close()
    # ---------------- old saves ----------------
    ctx,pg=page(); E(pg,SETUP)
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.23';o.power={lvl:2,on:true,fuel:'pellets',eff:.5,burn:{pellets:3}};o.prefs.plankMode='value';return JSON.stringify(o)})()")
    sv2=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.20';o.power={lvl:1,on:false,fuel:'mix',logs:'nonsense',res:5,eff:0,burn:{}};delete o.prefs.plankMode;return JSON.stringify(o)})()")
    ctx.close()
    for tag,s,exp in [('v2.23',sv,[2,True,'pellets','surplus',60,'value']),('v2.20 (bad fields)',sv2,[1,False,'mix','surplus',60,'fair'])]:
        ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(s))
        r=E(pg,"[S.power.lvl,S.power.on,S.power.fuel,S.power.logs,S.power.res,S.prefs.plankMode]")
        ok(r==exp,f'{tag} save loads: plant kept, log fuel defaults to "Backup" / 60 s ({r})')
        E(pg,'TT.simulate(30)'); ok(E(pg,"isFinite(S.coins)&&S.coins>0&&isFinite(S.res.logs)"),f'{tag} save: game runs on')
        ctx.close()
    # ---------------- desktop UI ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,"TT.simulate(10);TT.openSheet('power')"); pg.wait_for_timeout(500)
    txt=E(pg,'document.getElementById("powerBody").innerText')
    ok(E(pg,'document.querySelectorAll("#pwLogs button").length')==3 and 'LOG FUEL' in txt.upper(),'power sheet shows the Log fuel setting (3 choices)')
    ok(E(pg,'document.querySelector("#pwLogs button.on").dataset.m')=='surplus' and E(pg,'!!document.getElementById("pwRes")'),'"Backup" selected, reserve row shown')
    ok('left over' in E(pg,'document.getElementById("pwLogNote").innerText') and 'Logs burned' in E(pg,'document.getElementById("pwKv").innerText'),'note explains logs are only taken when left over + "Logs burned" line')
    pg.click('#pwLogs button[data-m="first"]'); pg.wait_for_timeout(250)
    ok(E(pg,'S.power.logs')=='first' and E(pg,'document.querySelector("#pwLogs button.on").dataset.m')=='first','click "Logs first" works')
    pg.click('#pwRes button[data-r="120"]'); pg.wait_for_timeout(250)
    ok(E(pg,'S.power.res')==120 and '2 min' in E(pg,'document.getElementById("pwLogNote").innerText'),'click reserve 2 min works and the note follows')
    pg.click('#pwLogs button[data-m="off"]'); pg.wait_for_timeout(250)
    ok(E(pg,'S.power.logs')=='off' and not E(pg,'!!document.getElementById("pwRes")'),'Off hides the reserve row')
    pg.screenshot(path='/tmp/v224_desk_power.png')
    # building sheet yield lines
    E(pg,"TT.closeSheet();S.buildings.peeler.lvl=60;S.buildings.plymill.lvl=60;for(const n of RNODES) S.research[n.id]=1;M=computeMods();TT.openSheet('bld','peeler')"); pg.wait_for_timeout(500)
    ok('Peel yield' in E(pg,'document.getElementById("bpIo").innerText'),'Peeler sheet shows its yield')
    E(pg,"TT.openSheet('bld','plymill')"); pg.wait_for_timeout(500)
    ok('Press yield' in E(pg,'document.getElementById("bpIo").innerText'),'Plywood Mill sheet shows its yield')
    # veneer shortage hint offers the sharing toggle
    E(pg,"""(()=>{S.buildings.peeler.lvl=1;S.buildings.furniture.lvl=40;S.buildings.furniture.on=true;S.buildings.sawmill.lvl=80;S.buildings.plymill.lvl=0;M=computeMods();
      for(let k=0;k<30;k++){S.res.planks=1e9;S.forest.m=1e9;tick(1,false);}TT.openSheet('bld','furniture');})()"""); pg.wait_for_timeout(700)
    ok(E(pg,'bstat.furniture.lim')=='veneer' and 'Veneer' in (E(pg,'(document.querySelector("#bpShort .bp-short-mode")||{}).innerText')or''),'veneer shortage hint offers the sharing mode (Veneer: shared fairly ⇄)')
    m0=E(pg,'S.prefs.plankMode'); pg.click('#bpShort .bp-short-mode'); pg.wait_for_timeout(200); ok(E(pg,'S.prefs.plankMode')!=m0,'… and the toggle works')
    ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+' '); E(pg,SETUP); E(pg,"TT.simulate(10);TT.openSheet('power')"); pg.wait_for_timeout(600)
        vw=E(pg,'innerWidth')
        bx=E(pg,'[...document.querySelectorAll("#pwLogs button,#pwRes button")].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.right,r.height]})')
        ok(len(bx)==7 and all(x[0]>=0 and x[1]<=vw+.5 and x[2]>=32 for x in bx),f'{dev}: log fuel + reserve buttons fit the screen and are touch-sized ({[round(x[2]) for x in bx]})')
        ok(E(pg,'(()=>{const e=document.getElementById("powerBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll in the power sheet')
        pg.tap('#pwLogs button[data-m="first"]'); pg.wait_for_timeout(300); ok(E(pg,'S.power.logs')=='first',f'{dev}: tap "Logs first"')
        pg.tap('#pwRes button[data-r="30"]'); pg.wait_for_timeout(300); ok(E(pg,'S.power.res')==30,f'{dev}: tap reserve 30 s')
        E(pg,"document.getElementById('pwLogBox').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        pg.screenshot(path=f'/tmp/v224_{dev.split()[0].lower()}_power.png')
        pg.tap('#pwLogs button[data-m="off"]'); pg.wait_for_timeout(300); ok(E(pg,'S.power.logs')=='off' and not E(pg,'!!document.getElementById("pwRes")'),f'{dev}: tap Off hides the reserve')
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('FAILS',FAILS)
sys.exit(1 if FAILS else 0)
