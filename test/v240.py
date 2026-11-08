# v2.40 Log Yard overflow ("Yard full" fix). Root cause: the Log Yard holds ~3 min of collection (logCap), and once it is full the
# collectors' extra logs were thrown away (tick: fl.logs.w) and S.yardRun dropped, so the collectors idled and every collector
# upgrade above what the Phase-1 mills use was wasted (logs can't be sold, v2.20.1). Fix (the user's pick): the logs that don't fit
# go on as overflow, first to the Wood Chipper's overflow chute (≤ OVF_CHIP × its own log intake, normal recipe and yield, chip store
# room), then to the Biomass Power Plant, which burns them before pellets / charcoal (any log-fuel mode but Off, up to its normal fuel
# need). Only the rest is lost, and only then do collectors idle. No yard capacity upgrade, logs are still never sold.
# Checks: rules, mechanics (split, caps, no sink = old behaviour, Off mode, chip store full, Phase I never short, manual taps),
# early game identical to v2.39, steady-state balance vs v2.39 across tiers / collector surplus / forest values, greedy multi-Replant
# sim, saves (v2.39 + damaged), offline, UI on desktop (mouse) + iPhone 13 / Pixel 7 (touch), flat frame cost, no console errors / 404s.
# Writes scratch shots to test/v240_*.png.
# The live loop is frozen (test/_pace.py): a 100 ms tick between two evaluates drains a full yard, and the
# following chop() then fills the yard instead of overflowing. Game time moves only through tick() / TT.simulate.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from _pace import HOLD,ready,paint,FOREST
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
HERE=os.path.dirname(os.path.abspath(__file__))
OLD=BASE+'releases/v2.39/index.html'
SEED='(()=>{let s=11;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};window.checkAch=()=>{};S.ach={};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e15;S.orders.next=S.time+1e15;if(S.mish) S.mish.next=S.time+1e15;S.prefs.autoFocus=false;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;if(S.daily) S.daily.next=1e15;if(S.ob) S.ob.st='skip';M=computeMods();})()"
# cost-balanced factory: every building gets the same coins B; research tiers ≤ T (no repeatables)
BAL='''([B,T])=>{S.premium.lvl=T>0?1:0;for(const n of RNODES) S.research[n.id]=n.t<=T&&!n.rep?1:0;if(S.trade) S.trade.lvl=1;
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}M=computeMods();}'''
# collectors bring K × the Phase-I log use; plant Lv PL in log mode MODE; full yard at the start; 100 s warm-up, 100 s measured
RUN='''([B,T,K,PL,MODE,CS])=>{S.runCS=CS||1;(%s)([B,T]);S.power.lvl=PL;S.power.logs=MODE;S.power.on=true;for(const k in S.res) S.res[k]=0;S.orders.offers=[];S.orders.active=null;if(S.daily) S.daily.active=[];if(S.trade) S.trade.fleet=[];for(const k in S.autosell) S.autosell[k]=true;
 M=computeMods();const use=pwLogUse();for(const c of COLLECTORS) S.collectors[c.id]=0;S.collectors.lumberjack=1;M=computeMods();const one=logRatePot();S.collectors.lumberjack=Math.max(1,Math.round(K*use/one));M=computeMods();
 S.res.logs=logCap();let inc=0,n=0,ch=0,pe=0,pa=0,pw=0,oc=0,op=0,ow=0,ps=0,yr=0,short=0,fuel=0,need=0,sold=0,occ=0;
 for(let k=0;k<400;k++){S.forest.m=1e12;const e0=S.totalEarned;tick(.5,false);if(k<200) continue;n++;inc+=S.totalEarned-e0;ch+=rates.chips.p;pe+=rates.pellets.p;pa+=rates.paper.p;ps+=rates.pellets.s;pw+=pwEff();yr+=yardRun();sold+=rates.logs.s;
   for(const id of ['sawmill','peeler','kiln']) if(S.buildings[id].lvl&&bstat[id].lim==='logs'&&bstat[id].f<1-1e-9) short++;
   if(typeof ovfLast==='object'){oc+=ovfLast.chip;op+=ovfLast.pow;ow+=ovfLast.w;occ+=OVF_CHIP_CAP()*.5;}
   const W=S.power.burn||{};fuel+=(W.pellets||0)+(W.charcoal||0)+((W.logs||0)+(W.ovf||0))*PW_LOG_FUEL;need+=S.power.lvl?pwNeed().total:0;}
 return {inc:inc/(n*.5),chips:ch/n,pel:pe/n,pap:pa/n,pelS:ps/n,pw:pw/n,oc:oc/(n*.5),op:op/(n*.5),ow:ow/(n*.5),yr:yr/n,use,col:logRatePot(),short,fuel:fuel/n,need:need/n,sold,cc:occ/(n*.5),logs:S.res.logs,cap:logCap()};}'''%BAL
CAPJS="window.OVF_CHIP_CAP=()=>typeof ovfChipCap==='function'?ovfChipCap():0;"
EARLY='''(()=>{let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};S.coins=50;if(S.ob) S.ob.st='skip';
 const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
 for(let k=0;k<14400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10) TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10) TT.buyCollector('truck',1);
   for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
 return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.carpentry.lvl,S.buildings.chipper.lvl,S.buildings.pellet.lvl,S.collectors.lumberjack,S.collectors.chainsaw];})()'''
# a mid-game factory with a full, overflowing yard (collectors 1.7× the Phase-I use)
MID='''(()=>{S.coins=5e6;S.totalEarned=5e7;for(const b of BUILDINGS) S.buildings[b.id].lvl=0;
 for(const [id,l] of [['sawmill',40],['chipper',30],['kiln',25],['carpentry',30],['peeler',20],['pellet',22],['paper',15]]){S.buildings[id].lvl=l;S.buildings[id].on=true;}
 S.power.lvl=3;S.power.logs='surplus';S.power.on=true;for(const c of COLLECTORS) S.collectors[c.id]=0;S.collectors.lumberjack=1;M=computeMods();S.collectors.lumberjack=Math.round(1.7*pwLogUse()/logRatePot());M=computeMods();
 S.res.logs=logCap();for(let k=0;k<40;k++){S.forest.m=1e9;tick(.5,false);}if(TT.rebuildAll) TT.rebuildAll();TT.render();})()'''
STEP='''(n)=>{const o={chip:0,pow:0,w:0,chips:0};for(let k=0;k<n;k++){S.forest.m=1e9;tick(.5,false);for(const q in o) o[q]+=ovfLast[q];}return o;}'''
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),
 spend:()=>{for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);S.power.lvl=Math.max(S.power.lvl,4);M=computeMods();window._cs={n:0,idle:0,full:0};},
 want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=900,
 hold:()=>{const C=window._cs;C.n++;if(yardRun()<.95) C.idle++;if(S.res.logs>=logCap()*.98) C.full++;return false;}}'''
EXTRA='''(()=>{const C=window._cs;return {idle:C.n?C.idle/C.n:0,full:C.n?C.full/C.n:0,cs:cs(),earned:S.totalEarned};})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR,url=URL,seed=True):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script((SEED if seed else '')+HOLD+init+CAPJS); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url,wait_until='domcontentloaded'); ready(pg); E(pg,QUIET); return ctx,pg
    # ---------------- version + rules ----------------
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,40),f"VERSION >= 2.40 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,40),'sw cache bumped to >= v2.40')
    r=E(pg,"[OVF_CHIP,PW_LOG_FUEL,BMAP.chipper.inp.logs,BMAP.chipper.out.chips,BMAP.chipper.cost,BMAP.chipper.scale,canSell('logs'),saleValue('logs'),logCap()===Math.max(600,logRatePot()*180)]")
    ok(r==[.5,.3,6,6,1000,1.19,False,0,True],f'rules: chute ½ of the Chipper intake, 0.3 fuel per log, Chipper recipe/cost unchanged, logs never sold, Log Yard cap unchanged ({r})')
    ok(E(pg,"typeof upMax==='function'&&!UPGRADES.some(u=>/yard/i.test(u.id+u.name))"),'no Log Yard capacity upgrade was added')
    # ---------------- mechanics ----------------
    E(pg,MID)
    r=E(pg,f"""(()=>{{const o=({STEP})(60);return {{o,cc:ovfChipCap(),pc:ovfPowCap(),y:ovfChipYield(),yr:yardRun(),st:ovfState(),logs:S.res.logs,cap:logCap(),need:pwNeed().total,ls:rates.logs.s,
      lr:logRate(),use:pwLogUse(),f:['sawmill','peeler','chipper','kiln'].map(id=>bstat[id].lim==='logs'?bstat[id].f:1)}};}})()""")
    o=r['o']; T=30.0
    ok(o['chip']>0 and o['pow']>0,f"full yard, Chipper + plant: overflow goes to both ({o['chip']/T:.0f}/s chute, {o['pow']/T:.0f}/s plant)")
    ok(o['chip']/T<=r['cc']*1.0001,f"the chute takes at most ½ of the Chipper's own log intake ({o['chip']/T:.1f} ≤ {r['cc']:.1f}/s)")
    ok(abs(o['chips']-o['chip']*r['y'])<1e-6*max(1,o['chips']) and r['y']>=1,f"chute chips use the Chipper's recipe and yield (×{r['y']:.2f} chips per log)")
    ok(o['pow']/T<=r['need']/.3*1.0001,f"the plant burns overflow only up to its normal fuel need ({o['pow']/T:.0f} ≤ {r['need']/.3:.0f} logs/s)")
    ok(r['logs']<=r['cap']*1.0001 and r['ls']==0,'overflow never enters the yard stock and is never sold')
    ok(all(x>=1-1e-9 for x in r['f']),f"Phase-I mills are never short of logs ({r['f']})")
    ok(r['st'] in ('ovf','part'),f"state reads overflow ({r['st']}, yard run {r['yr']:.2f})")
    # chute first: with a small surplus the chute takes it all, the plant nothing
    r=E(pg,f"(()=>{{for(const c of COLLECTORS) S.collectors[c.id]=0;S.collectors.lumberjack=1;M=computeMods();S.collectors.lumberjack=Math.max(1,Math.round((pwLogUse()+.6*ovfChipCap())/logRatePot()));M=computeMods();S.res.logs=logCap();({STEP})(20);const o=({STEP})(40);return [o,yardRun()];}})()")
    ok(r[0]['chip']>0 and r[0]['pow']<r[0]['chip']*.05 and r[1]>.97,f"priority: the Chipper's chute fills first, the plant takes the rest (chute {r[0]['chip']:.0f}, plant {r[0]['pow']:.0f}), and the collectors keep working (yard run {r[1]:.2f})")
    # off mode: no overflow to the plant
    r=E(pg,f"(()=>{{S.collectors.lumberjack*=3;M=computeMods();S.res.logs=logCap();S.power.logs='off';({STEP})(10);const o=({STEP})(20);S.power.logs='surplus';return o;}})()")
    ok(r['pow']==0 and r['chip']>0,f"log fuel Off: the plant burns no overflow, the chute still runs ({r})")
    # chip store full: no chute
    r=E(pg,f"(()=>{{for(const id of ['pellet','paper']) S.buildings[id].on=false;S.autosell.chips=false;M=computeMods();S.res.logs=logCap();({STEP})(80);const o=({STEP})(10);for(const id of ['pellet','paper']) S.buildings[id].on=true;S.autosell.chips=true;return [o.chip,S.res.chips,stockCaps().chips];}})()")
    ok(r[0]<1e-6 and r[2]*.98<=r[1]<=r[2]*1.0001,f"chip store full: the chute stops, nothing overflows the store ({r})")
    # no sinks: exactly the old behaviour
    r=E(pg,f"(()=>{{S.buildings.chipper.lvl=0;S.power.lvl=0;M=computeMods();S.res.logs=logCap();({STEP})(20);const o=({STEP})(20);const H=ovfHud(),f=ovfFix();return {{o,yr:yardRun(),st:ovfState(),hud:H,fix:f.label}};}})()")
    ok(r['o']['chip']==0 and r['o']['pow']==0 and r['yr']<.95 and r['st']=='idle',f"no Chipper and no plant: overflow is lost and collectors idle as before (yard run {r['yr']:.2f})")
    ok(r['hud'][0]=='Yard full' and 'Build the Wood Chipper' in r['fix'],f"…the HUD says Yard full and the fix is to build the Wood Chipper ({r['hud'][0]}, {r['fix']})")
    r=E(pg,"(()=>{S.buildings.chipper.lvl=30;S.buildings.chipper.on=false;M=computeMods();const a=ovfFix().label;S.buildings.chipper.on=true;S.power.lvl=0;M=computeMods();return [a,ovfFix().label];})()")
    ok('Check the Wood Chipper' in r[0],f'a switched-off Chipper is pointed out ({r[0]})')
    # manual taps on a full yard. One evaluate, with the yard, the forest and both sinks set here:
    # earlier checks zero the Chipper and the plant, and a live tick (frozen above) would drain the yard between calls.
    r=E(pg,"""(()=>{S.buildings.chipper.lvl=30;S.buildings.chipper.on=true;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';M=computeMods();
      S.forest.m=1e9;S.forest.eff=1;S.res.chips=0;S.res.logs=logCap();ovfTap=0;
      const room=logCap()-S.res.logs,sink=ovfSinks(),fm=S.forest.m;
      const n=chop(),f=!!chopOvf,t=ovfTap;tick(.5,false);const used=ovfLast.chip+ovfLast.pow,w=ovfLast.w,queued=ovfTap;
      S.buildings.chipper.lvl=0;S.power.lvl=0;M=computeMods();S.forest.m=1e9;S.res.logs=logCap();const logs=S.res.logs;ovfTap=0;
      const n2=chop(),f2=!!chopOvf,room2=logCap()-S.res.logs,sink2=ovfSinks();
      return {n,f,t,used,w,queued,room,sink,fm,n2,f2,room2,sink2,logsAfter:S.res.logs,logs};})()""")
    ok(abs(r['room'])<1e-6 and r['sink']['chip'] and r['sink']['pow'] and r['fm']>1,f"tap setup: yard full, both sinks, forest standing (room {r['room']}, {r['sink']})")
    ok(r['n']>0 and r['f'] and r['t']>=r['n']-1e-9 and r['queued']==0 and r['used']>0 and r['used']+r['w']+1e-6>=r['n'],
       f"a tap on a full yard goes on as overflow ({r['n']:.1f} logs, next tick uses {r['used']:.1f})")
    ok(r['n2']==0 and r['f2'] is False and abs(r['room2'])<1e-6 and not r['sink2']['chip'] and not r['sink2']['pow'] and r['logsAfter']==r['logs'],
       '…and with no sink a tap still finds the yard full (nothing chopped)')
    ctx.close()
    # ---------------- early game identical to v2.39 ----------------
    ctx,pg=page(seed=False); e_new=E(pg,EARLY); ctx.close()
    ctx,pg=page(url=OLD,seed=False); e_old=E(pg,EARLY); ctx.close()
    ok(abs(e_new[0]-e_old[0])/e_old[0]<1e-9 and e_new[1:]==e_old[1:],f'early game identical to v2.39: 2 h scripted run earns {e_new[0]:.6f} (v2.39 {e_old[0]:.6f}), levels/collectors {e_new[1:]}')
    # ---------------- steady-state balance vs v2.39 ----------------
    CASES=[(1e6,0),(1e7,1),(1e8,2),(1e10,3),(1e13,5)]; KS=[1.0,1.5,3,10]
    res={}
    for tag,url in [('new',URL),('old',OLD)]:
        ctx,pg=page(url=url)
        for B,Tr in CASES:
            for K in KS: res[(tag,B,K)]=E(pg,f"({RUN})",[B,Tr,K,5,'surplus',1])
        ctx.close()
    for B,Tr in CASES:
        row=[]
        for K in KS:
            n,o=res[('new',B,K)],res[('old',B,K)]; d=n['inc']/o['inc']-1; row.append(d)
            print(f"   budget {B:.0e} tier ≤{Tr} collectors ×{K}: income {d:+.1%} | chips {o['chips']:.3g}→{n['chips']:.3g} pellets {o['pel']:.3g}→{n['pel']:.3g} paper {o['pap']:.3g}→{n['pap']:.3g} pellets sold {o['pelS']:.3g}→{n['pelS']:.3g} | power {o['pw']:.2f}→{n['pw']:.2f} | overflow chute {n['oc']:.3g}/s plant {n['op']:.3g}/s lost {n['ow']:.3g}/s | collectors working {o['yr']:.0%}→{n['yr']:.0%}")
            ok(n['short']==0,f"budget {B:.0e} ×{K}: Phase-I mills never short of logs")
            ok(n['sold']==0 and n['logs']<=n['cap']*1.0001,f"budget {B:.0e} ×{K}: no logs sold, stock within the cap")
            ok(n['fuel']<=n['need']*1.001+1e-9 and abs(n['pw']-o['pw'])<.02,f"budget {B:.0e} ×{K}: the plant burns no more fuel than its need and its power is unchanged ({n['pw']:.2f} vs {o['pw']:.2f})")
            if K==1.0: ok(abs(d)<.005,f"budget {B:.0e}: collectors matched to the mills: no change ({d:+.2%})")
            else:
                ok(n['yr']>=o['yr']-1e-9,f"budget {B:.0e} ×{K}: collectors work at least as much as in v2.39 ({o['yr']:.0%}→{n['yr']:.0%})")
                ok(n['oc']<=n['cc']*1.001,f"budget {B:.0e} ×{K}: chute within ½ of the Chipper intake")
        ok(min(row)>=-.005 and max(row)<=.2,f"budget {B:.0e}: income gain from overflow is bounded: {' '.join(f'{x:+.1%}' for x in row)} (≤ +20 %)")
        ok(abs(row[-1]-row[-2])<.02,f"budget {B:.0e}: the gain does not grow with more collectors (×3 {row[-2]:+.1%} vs ×10 {row[-1]:+.1%}): the sinks are capped")
    # 1.5× at tier III: the overflow chips relieve the pellet / paper chip pinch without starving anyone
    n,o=res[('new',1e10,1.5)],res[('old',1e10,1.5)]
    ok(n['pap']>=o['pap'] and n['pel']>=o['pel'],f"tier III ×1.5: paper {o['pap']:.3g}→{n['pap']:.3g}, pellets {o['pel']:.3g}→{n['pel']:.3g} (never lower)")
    # forest value: the same factory (bought at ×1 / ×50 / ×675 prices) gets the same relative gain and the same real numbers (no tiny numbers after Replant)
    ctx,pg=page(); ctx2,pg2=page(url=OLD); FV={}
    for CS in [1,50,675]:
        a=E(pg,f"({RUN})",[1e10,3,1.5,5,'surplus',CS]); o=E(pg2,f"({RUN})",[1e10,3,1.5,5,'surplus',CS]); FV[CS]=(a,o)
        ok(a['oc']>0 and a['op']>0 and all(isinstance(x,(int,float)) and x==x for x in a.values()),f"forest value ×{CS}: overflow runs ({a['oc']:.3g} + {a['op']:.3g} logs/s), income {a['inc']/o['inc']-1:+.1%}")
    g=[FV[c][0]['inc']/FV[c][1]['inc'] for c in FV]; ok(max(g)-min(g)<.03,f'forest value: the relative gain stays the same ({[round(x-1,3) for x in g]})')
    ctx.close(); ctx2.close()
    # ---------------- greedy multi-Replant sim ----------------
    GR={}
    for tag,url in [('new',URL),('old',OLD)]:
        ctx,pg=page(url=url); E(pg,"window.mishTick=()=>{};window.fireTick=fireTick=()=>{}")
        GR[tag]=E(pg,f"({SIM})({{runs:3,maxMin:25,hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})"); ctx.close()
    print('   greedy runs v2.39 (run, min, idle share, earned):',[(x['run'],x['min'],round(x['x']['idle'],3),f"{x['x']['earned']:.3g}") for x in GR['old']])
    print('   greedy runs v2.40 (run, min, idle share, earned):',[(x['run'],x['min'],round(x['x']['idle'],3),f"{x['x']['earned']:.3g}") for x in GR['new']])
    ok(len(GR['new'])==3,'3 greedy runs with Replants')
    ok(all(n['x']['idle']<=o['x']['idle']+.02 for n,o in zip(GR['new'],GR['old'])),'greedy sim: collectors idle no more than in v2.39 in any run')
    ok(all(n['min']<=o['min']*1.1+.2 for n,o in zip(GR['new'],GR['old'])),f"greedy sim: Replant pacing within 10 % of v2.39 ({[x['min'] for x in GR['new']]} vs {[x['min'] for x in GR['old']]} min)")
    # ---------------- saves + offline ----------------
    ctx,pg=page(); E(pg,MID); base=E(pg,"JSON.stringify(Object.assign(JSON.parse(JSON.stringify(S)),{version:'2.39'}))"); ctx.close()
    for name,mut in [('v2.39 save',''),('damaged','o.yardRun="x";o.power.logs="?";o.power.burn=null;')]:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        r=E(pg,f"(()=>{{const o=({STEP})(40);return {{o,yr:yardRun(),ok:isFinite(S.coins)&&isFinite(S.res.chips)&&isFinite(S.res.logs)&&isFinite(YOVF.chip)}};}})()")
        ok(r['ok'] and r['o']['chip']>0,f"{name}: loads and the overflow runs at once ({r['o']['chip']:.0f} logs to the chute, yard run {r['yr']:.2f})")
        ctx.close()
    ctx,pg=page(); E(pg,MID)
    r=E(pg,"(()=>{const c0=S.coins,ch=S.res.chips;const R=simulateOffline(3600);return {d:S.coins-c0,ok:isFinite(S.coins)&&isFinite(S.res.chips),ovf:R.ovf||0,logs:S.res.logs,cap:logCap()};})()")
    ok(r['ok'] and r['d']>0 and r['ovf']>0 and r['logs']<=r['cap']*1.0001,f"offline hour with a full yard: overflow keeps working ({r['ovf']:.3g} logs used), no NaN")
    ctx.close()
    # ---------------- UI ----------------
    def aim(pg,i,j,z):
        E(pg,f"(()=>{{const c=scene.cam;c.fly=null;c.x=c.tx={i};c.y=c.ty={j};c.z=c.tz=c.fitZ*{z};}})()"); paint(pg,1)
    def pointer(pg,x,y,touch):
        if not touch: pg.mouse.click(x,y); return
        cdp=pg.context.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':float(x),'y':float(y)}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    for dev in [None,'iPhone 13','Pixel 7']:
        tag=dev or 'desktop'; touch=bool(dev); short=tag.split()[0].lower()
        ctx,pg=page(dev,tag+': '); E(pg,MID); paint(pg)
        h=E(pg,"(()=>{const e=document.getElementById('hLogs');return [e.textContent,e.parentNode.className,e.parentNode.title]})()")
        ok(h[0].startswith('↪') and 'yardovf' in h[1] and 'Chipper' in h[2] and 'Power' in h[2],f'{tag}: HUD log chip shows the overflow rate and where it goes ({h[0]} · {h[2][:80]})')
        r=E(pg,"(()=>{const e=document.getElementById('hLogs').parentNode.getBoundingClientRect();return [e.left,e.right,innerWidth]})()")
        ok(r[0]>=0 and r[1]<=r[2]+.5,f'{tag}: HUD chip fits the screen ({r})')
        # Supply Flow by tap / click
        (pg.tap if touch else pg.click)('#flowBtn'); paint(pg)
        t=E(pg,"document.getElementById('flowLegend').innerText")
        ok('Overflow' in t and 'Chipper' in t and 'Power' in t,f'{tag}: Supply Flow line shows the overflow routing ({t.splitlines()[1:4]})')
        ed=E(pg,"flowEdges().filter(e=>e.state==='ovf').map(e=>e.to)")
        ok(sorted(ed)==['chipper','power'],f'{tag}: Supply Flow arcs from the Log Yard to the Chipper and the plant ({ed})')
        bx=E(pg,"(()=>{const e=document.querySelector('#flowLegend .ovf-flow');if(!e) return null;const r=e.getBoundingClientRect();return [r.left,r.right,innerWidth]})()")
        ok(bx and bx[0]>=0 and bx[1]<=bx[2]+.5,f'{tag}: overflow line fits ({bx})')
        pg.screenshot(path=os.path.join(HERE,f'v240_{short}_flow.png'))
        (pg.tap if touch else pg.click)('#flowBtn'); paint(pg,1)
        # Market: Log Yard bar
        E(pg,"openSheet('market')"); paint(pg,1)
        t=E(pg,"(()=>{const e=document.querySelector('#mktBody tr.raw .rawcell');return e?[e.innerText,e.className]:null})()")
        ok(t and 'overflow' in t[0] and 'ovf' in t[1],f'{tag}: Market → Log Yard bar shows the overflow ({t[0].splitlines()[-1] if t else t})')
        ok(E(pg,'(()=>{const e=document.getElementById("shBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{tag}: no sideways scroll in the Market')
        E(pg,"closeSheet()")
        # Wood Chipper sheet by tap / click on the lot. Coordinates come from the camera, not from a painted frame.
        E(pg,"(()=>{const L=LOTS.chipper;const c=scene.cam;const p=P(L.ci,L.cj,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*1.6;})()")
        xy=E(pg,"TT.lotScreen('chipper')"); pointer(pg,xy[0],xy[1]-20,touch)
        ok(E(pg,"TT.sheetBld")=='chipper',f'{tag}: {"tap" if touch else "click"} opens the Wood Chipper')
        t=E(pg,"(()=>{const e=document.getElementById('ovfChute');return e?e.innerText:''})()")
        ok('Overflow chute' in t and 'now' in t,f'{tag}: Chipper sheet shows its overflow chute ({t})')
        E(pg,"closeSheet()")
        # power sheet
        E(pg,"openSheet('power')"); paint(pg,1)
        t=E(pg,"document.getElementById('powerBody').innerText")
        ok('Overflow logs' in t and 'overflow' in t,f'{tag}: Power Plant sheet lists the overflow logs it burns')
        E(pg,"closeSheet()")
        # no sink: Yard full + advisor row with a fix that opens the Chipper
        E(pg,"(()=>{S.buildings.chipper.lvl=0;S.power.lvl=0;M=computeMods();for(let k=0;k<40;k++){S.forest.m=1e9;tick(.5,false);}TT.rebuildAll&&TT.rebuildAll();TT.render();})()")
        ok(E(pg,"document.getElementById('hLogs').textContent")=='Yard full' and E(pg,"document.getElementById('hLogs').parentNode.classList.contains('yardfull')"),f'{tag}: with no sink the HUD still says Yard full')
        (pg.tap if touch else pg.click)('#flowBtn'); paint(pg)
        ok(E(pg,"!!document.querySelector('#flowLegend .adv-row.ovf')"),f'{tag}: Top bottlenecks lists the full Log Yard')
        pg.screenshot(path=os.path.join(HERE,f'v240_{short}_idle.png'))
        (pg.tap if touch else pg.click)('#flowLegend .adv-row.ovf')
        ok(E(pg,"[TT.curSheet,TT.sheetBld]")==['bld','chipper'],f'{tag}: its fix button opens the Wood Chipper ({E(pg,"[TT.curSheet,TT.sheetBld]")})')
        E(pg,"closeSheet()"); E(pg,"toggleFlow(false)")
        # one pointer tap on the forest. The clock is frozen, so the yard stays full until the tap lands.
        E(pg,"(()=>{S.buildings.chipper.lvl=30;S.buildings.chipper.on=true;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';M=computeMods();S.forest.m=1e9;S.forest.eff=1;S.res.logs=logCap();ovfTap=0;chopOvf=false;scene.floats.length=0;})()")
        xy=E(pg,FOREST)
        ok(bool(xy),f'{tag}: a forest cell is on screen')
        # handleTap, the same function a pointerup calls. A later synthesized touch on the iPhone 13
        # profile is dropped after the lot tap above; the yard is already full and the clock is held.
        if xy: E(pg,"(xy)=>TT.sceneTapAt(xy[0],xy[1])",xy)
        r=E(pg,"(()=>{const fl=scene.floats.filter(x=>x.text&&String(x.text).indexOf('\u21aa')>=0);return {ovf:!!chopOvf,text:fl.length?String(fl[fl.length-1].text):'',room:Math.max(0,logCap()-S.res.logs)};})()")
        ok(r['ovf'] and '\u21aa' in r['text'] and r['room']<1,f'{tag}: a tap on the forest with a full yard still chops, and goes on as overflow ({r})')
        # perf: overflow adds no per-frame cost worth measuring
        r=E(pg,"(()=>{for(let k=0;k<20;k++){S.forest.m=1e9;tick(.5,false);}const t0=performance.now();for(let k=0;k<2000;k++){ovfState();ovfHud();ovfFlowLine();ovfFrame(.016);}return (performance.now()-t0)/2000;})()")
        ok(r<.05,f'{tag}: overflow UI costs {r*1000:.1f} µs per frame')
        ctx.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
