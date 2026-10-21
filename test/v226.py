# v2.26: bad-luck events (storm damage, Log Yard flood, night theft, machine breakdown, lightning, tax audit, market crash).
# Grace periods, online-only, loss caps, insurance / Fire Station / workstations / Repair now, Safety sheet + event log,
# scene tags, multi-Replant sim (frequency, loss size, no soft-lock), old saves, desktop + touch.
from playwright.sync_api import sync_playwright
import sys,os,re,json,time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;})()"
# a mid-game factory past every grace period
SETUP='''(()=>{S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture']) TT.buyBuilding(b,15);S.coins=1e9;S.playTime=5000;S.time=5000;
  S.nextEvent=S.time+1e9;S.orders.next=S.time+1e9;M=computeMods();TT.simulate(20);for(const k of ['planks','chips','charcoal','pellets','chairs','paper','veneer','furniture']) S.res[k]=Math.max(S.res[k],5000);S.res.logs=Math.max(S.res.logs,1e5);})()'''
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
INSTR='''(()=>{window._ms=[];const A=mishApply;window.mishApply=function(id){const r0=Object.assign({},S.res),c0=S.coins,inc=mishInc(),use=pwLogUse(),nb=Object.keys(S.mish.broke).length;const ok=A(id);
  let worst=0;for(const k in r0){if(k==='logs') continue;if(r0[k]>1&&S.res[k]<r0[k]) worst=Math.max(worst,(r0[k]-S.res[k])/r0[k]);}
  const lg=r0.logs>1?(r0.logs-S.res.logs)/r0.logs:0,e=S.mish.log[0]||{};
  window._ms.push({id,ok,t:S.time,run:S.prestiges,stock:worst,logs:lg,logsLeftOk:S.res.logs>=Math.min(r0.logs,30*use)-1e-6||lg<=0,coin:c0>0?Math.max(0,(c0-S.coins)/c0):0,sec:(e.v||0)/Math.max(1e-9,inc),nb:Object.keys(S.mish.broke).length,nb0:nb,
    dur:Math.max(0,...Object.values(S.mish.broke).map(b=>b.dur))});return ok;};})()'''
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),spend:()=>{window._T0=S.time;},want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=1800}'''
EXTRA='''(()=>{const L=window._ms.filter(x=>x.run===S.prestiges);return {n:L.length,ids:L.map(x=>x.id),first:L.length?L[0].t:null,stock:Math.max(0,...L.map(x=>x.stock)),logs:Math.max(0,...L.map(x=>x.logs)),
  coin:Math.max(0,...L.map(x=>x.coin)),sec:Math.max(0,...L.map(x=>x.sec)),left:L.every(x=>x.logsLeftOk),two:L.some(x=>x.nb>1),dur:Math.max(0,...L.map(x=>x.dur)),coins:S.coins};})()'''
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
    ok(ver(E(pg,'TT.VERSION'))>=(2,26),f"VERSION >= 2.26 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,26),'sw cache bumped to >= v2.26')
    ok(E(pg,"Object.keys(MISH_DEF).join()")=='gale,flood,theft,breakdown,lightning,audit,crash','seven setbacks defined')
    ok(E(pg,"[S.mish.ins,S.mish.log.length,mishActive()]")==[0,0,False],'new game: no insurance, empty log, setbacks off until 3 buildings run')
    # ---------------- grace periods + online only ----------------
    E(pg,SETUP); E(pg,"window.toast=()=>{};S.fires={};")
    r=E(pg,"""(()=>{const o={};S.playTime=100;S.time=5000;S.mish.next=1;for(let k=0;k<600;k++) tick(1,false);o.game=S.mish.log.length;
      S.playTime=5000;S.time=0;S.mish.next=1;for(let k=0;k<290;k++) tick(1,false);o.run=S.mish.log.length;o.gr=mishGrace();
      S.time=4000;S.mish.next=S.time+5;const r=simulateOffline(3*3600);o.off=S.mish.log.length;return o;})()""")
    ok(r['game']==0,'no setbacks in the first 15 min of a game')
    ok(r['run']==0 and r['gr']>0,'no setbacks in the first 5 min of a run')
    ok(r['off']==0,'offline: 3 h away rolls no setbacks')
    # ---------------- frequency (4 h of online play) ----------------
    r=E(pg,"""(()=>{S.mish.log=[];S.mish.stats={n:0,dodged:0,lost:0,repairs:0};S.mish.next=0;const t0=S.time,ts=[];let n0=0;
      for(let k=0;k<4*3600;k++){S.coins=Math.max(S.coins,1e9);S.fires={};tick(1,false);const n=S.mish.stats.n+S.mish.stats.dodged;if(n>n0){ts.push(S.time);n0=n;}}
      const gaps=ts.slice(1).map((t,i)=>t-ts[i]);return {n:n0,minGap:Math.min(...gaps),ids:S.mish.log.map(x=>x.id)};})()""")
    ok(12<=r['n']<=30,f"about one setback every 8–15 min: {r['n']} in 4 h of play")
    ok(r['minGap']>=479,f"never two within 8 min (shortest gap {r['minGap']:.0f}s)")
    ok(len(set(r['ids']))>=4,f"a mix of setbacks ({sorted(set(r['ids']))})")
    # ---------------- loss caps (forced, 60 rolls each) ----------------
    r=E(pg,"""(()=>{const out={};const reset=()=>{for(const k in S.mish.broke) delete S.mish.broke[k];S.fires={};S.events=S.events.filter(e=>e.id!=='crash'&&e.id!=='mud');S.coins=1e9;
        for(const k of ['planks','chips','charcoal','pellets','chairs','paper','veneer','furniture']) S.res[k]=2e3+Math.random()*1e6;S.res.logs=Math.random()<.3?50*pwLogUse():1e6*Math.random();M=computeMods();};
      for(const id of ['gale','flood','theft','audit','breakdown','crash']){const o=out[id]={stock:0,logs:0,coin:0,sec:0,dur:0,left:true,slow:0,crash:1};
        for(let i=0;i<60;i++){reset();const r0=Object.assign({},S.res),c0=S.coins,inc=mishInc(),use=pwLogUse();const v0=S.mish.stats.lost;mishApply(id);
          for(const k in r0) if(k!=='logs'&&r0[k]>1) o.stock=Math.max(o.stock,(r0[k]-S.res[k])/r0[k]);
          o.logs=Math.max(o.logs,(r0.logs-S.res.logs)/r0.logs);if(S.res.logs<Math.min(r0.logs,30*use)-1e-6&&S.res.logs<r0.logs) o.left=false;
          o.coin=Math.max(o.coin,(c0-S.coins)/c0);o.sec=Math.max(o.sec,(S.mish.stats.lost-v0)/inc);
          for(const b of Object.values(S.mish.broke)){o.dur=Math.max(o.dur,b.dur);o.slow=b.slow||0;}
          if(id==='crash'){o.crash=mishCrashMult();o.ev=S.events.find(e=>e.id==='crash').ends-S.time;}}}
      reset();return out;})()""")
    g=r['gale']; ok(g['stock']<=.08+1e-9 and g['sec']<=60.01 and g['slow']==.5 and 0<g['dur']<=90,f"storm: half speed ≤ 90 s, ≤ 8 % of a good, ≤ 1 min of income ({g})")
    f=r['flood']; ok(f['logs']<=.1+1e-9 and f['left'] and f['coin']==0,f"flood: ≤ 10 % of the logs, always leaves 30 s of mill use ({f['logs']:.3f})")
    t=r['theft']; ok(t['logs']<=.06+1e-9 and t['stock']<=.05+1e-9 and t['sec']<=45.01 and t['left'],f"theft: ≤ 6 % logs, ≤ 5 % of a good, ≤ 45 s of income ({t['logs']:.3f}/{t['stock']:.3f}/{t['sec']:.1f}s)")
    a=r['audit']; ok(0<a['coin']<=.02+1e-9 and a['sec']<=90.01,f"tax audit: ≤ 2 % of coins and ≤ 90 s of income ({a['coin']:.4f}, {a['sec']:.1f}s)")
    d=r['breakdown']; ok(0<d['dur']<=100 and d['slow']==0,f"breakdown: one building pauses ≤ 100 s ({d['dur']}s)")
    c=r['crash']; ok(abs(c['crash']-.7)<1e-9 and abs(c['ev']-60)<1e-6,'market crash: prices ×0.7 for 60 s')
    # ---------------- breakdown / storm effects, one at a time, repair ----------------
    r=E(pg,"""(()=>{S.coins=1e9;mishApply('breakdown');const bid=Object.keys(S.mish.broke)[0];tick(1,false);const o={bid,f:bstat[bid].f,broke:bstat[bid].broke};
      const w=mishWeights();o.w=[w.breakdown,w.gale];o.st=statusOf(BMAP[bid]).txt;
      const c=mishRepairCost(bid);S.coins=c*.5;o.poor=mishRepair(bid);S.coins=Math.max(1e9,c*10);const c0=S.coins;o.fix=mishRepair(bid);o.paid=c0-S.coins;o.cost=c;tick(1,false);o.f2=bstat[bid].f;
      mishApply('gale');const g=Object.keys(S.mish.broke)[0];const s0=bSpeed(g);delete S.mish.broke[g];o.half=s0/bSpeed(g);return o;})()""")
    ok(r['f']==0 and r['broke'],f"a broken-down {r['bid']} makes nothing")
    ok(r['w']==[0,0],'only one damaged building at a time')
    ok('Broken down' in r['st'],f"building status says so ({r['st']})")
    ok(r['poor'] is False and r['fix'] and abs(r['paid']-r['cost'])<1e-6*r['cost'] and r['f2']>0,f"Repair now: refused without coins, then paid 🪙{r['cost']:.3g} and it runs again")
    ok(abs(r['half']-.5)<1e-9,'storm damage halves the building\'s speed')
    # ---------------- counter-play ----------------
    r=E(pg,"""(()=>{const o={};S.coins=1e12;o.c=[insCost(0),insCost(1),insCost(2)];o.b=[buyInsurance(),buyInsurance()];o.lvl=insLvl();o.cut=insCut();
      const inc=mishInc();S.coins=1e9;const c0=S.coins;mishApply('audit');o.audit=(c0-S.coins)/Math.min(c0*.02,90*inc);o.crash=mishCrashMult();
      S.wx.clock=Math.floor(S.wx.clock/DAY_LEN)*DAY_LEN+DAY_LEN*.05;let d=0;for(let i=0;i<200;i++){const r=mishRoll('theft');} 
      o.dodgeTheft=null;return o;})()""")
    ok(r['b']==[True,True] and r['lvl']==2 and abs(r['cut']-.5)<1e-9 and r['c'][1]==r['c'][0]*10,f"insurance: Lv 2 pays back 50 % (cost {r['c'][0]:.3g} → {r['c'][1]:.3g})")
    ok(abs(r['audit']-.5)<1e-6 and abs(r['crash']-.85)<1e-9,f"insured: a tax fine is halved, a crash is −15 % instead of −30 % ({r['audit']:.2f})")
    r=E(pg,"""(()=>{const o={};S.mish.log=[];S.mish.stats.dodged=0;let n=0;for(let i=0;i<300;i++){for(const k in S.mish.broke) delete S.mish.broke[k];const x=mishDodge('theft');if(x[0]>0&&Math.random()<x[0]) n++;}o.theft=n/300;
      S.station.lvl=5;o.st=mishDodge('flood')[0];o.light=mishDodge('lightning')[0];S.station.lvl=0;o.st0=mishDodge('gale')[0];
      // a forced roll through the real path: dodged rolls are logged as stopped
      S.station.lvl=5;let dd=0;for(let i=0;i<60;i++){S.fires={};const r=mishRoll(null);for(const k in S.mish.broke) delete S.mish.broke[k];}o.logged=S.mish.log.some(x=>x.d);S.station.lvl=0;return o;})()""")
    ok(.4<r['theft']<.6,f"night guard (Insurance Lv 2) stops about half of all thefts ({r['theft']:.2f})")
    ok(r['st']==.5 and r['light']==.5 and r['st0']==0,'Fire Station Lv 5 stops 50 % of storms, floods and lightning')
    ok(r['logged'],'stopped setbacks show in the log as 🛡️')
    r=E(pg,"""(()=>{const id='sawmill';S.ws[id]=[0,0,0];const a=mishBldMult(id);S.ws[id]=[6,6,6];const b=mishBldMult(id);S.ws[id]=[0,0,0];return [a,b];})()""")
    ok(r[0]==1 and abs(r[1]-.46)<1e-9,f"workstations cut a building's breakdown odds and repair time (18 levels → ×{r[1]:.2f})")
    r=E(pg,"""(()=>{S.fires={};S.fireCool=0;S.wx.clock=DAY_LEN*SEASON_DAYS*1+10;const w=mishWeights().lightning;const ok=mishApply('lightning');return {w,ok,fire:Object.keys(S.fires)};})()""")
    ok(r['w']>0 and r['ok'] and len(r['fire'])==1,f"lightning (summer) starts a fire through the fire system ({r['fire']})")
    r=E(pg,"""(()=>{S.fires={};S.fireCool=S.time+1e6;const o={};S.wx.w='clear';o.c=mishWeights();S.wx.w='rain';o.r=mishWeights();S.wx.w='clear';return [o.r.flood/o.c.flood,o.r.gale/o.c.gale];})()""")
    ok(abs(r[0]-3)<1e-9 and abs(r[1]-2.5)<1e-9,f'rain: floods ×3, storms ×2.5 ({r})')
    # ---------------- Replant: insurance + log kept, breakdowns cleared, grace again ----------------
    r=E(pg,"""(()=>{mishApply('breakdown');const n=S.mish.log.length;S.totalEarned=1e15;S.seeds=0;doPrestige();return {ins:insLvl(),log:S.mish.log.length,n,broke:Object.keys(S.mish.broke).length,gr:mishGrace()};})()""")
    ok(r['ins']==2 and r['log']==min(20,r['n']) and r['broke']==0 and r['gr']>=299,f'Replant keeps insurance + log, clears repairs, 5 min grace ({r})')
    ctx.close()
    # ---------------- greedy play over several Replants ----------------
    ctx,pg=page(); E(pg,"window.toast=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{};window.save=()=>{}"); E(pg,INSTR)
    t0=time.time(); R=E(pg,f"({SIM})({{runs:5,maxMin:60,hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})")
    print('   runs:',[(x['run'],x['min'],x['gain'],x['x']['n'],x['x']['ids']) for x in R],f'{time.time()-t0:.0f}s')
    ok(len(R)==5 and all(x['gain']>=1 for x in R) and not any(x.get('note') for x in R),'5 runs, every one reaches a Replant (no soft-lock)')
    ok(all(x['min']<=50 for x in R),f"runs are not dragged out ({[x['min'] for x in R]} min)")
    ok(sum(x['x']['n'] for x in R)>=4 and all(x['x']['n']<=6 for x in R),f"setbacks per run: {[x['x']['n'] for x in R]}")
    ok(all(x['x']['first'] is None or x['x']['first']>=300+479 for x in R),f"first setback of a run comes after the grace + one gap ({[x['x']['first'] and round(x['x']['first']) for x in R]})")
    ok(all(x['x']['stock']<=.08+1e-9 and x['x']['logs']<=.1+1e-9 and x['x']['coin']<=.02+1e-9 and x['x']['sec']<=90.01 and x['x']['left'] for x in R),
       f"every loss within its cap (max good {max(x['x']['stock'] for x in R):.3f}, logs {max(x['x']['logs'] for x in R):.3f}, coins {max(x['x']['coin'] for x in R):.4f}, {max(x['x']['sec'] for x in R):.1f}s income)")
    ok(all(not x['x']['two'] and x['x']['dur']<=100 and x['x']['coins']>=0 for x in R),'never two damaged buildings, repairs ≤ 100 s, coins never negative')
    ctx.close()
    # ---------------- old saves ----------------
    ctx,pg=page(); E(pg,SETUP)
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.25';delete o.mish;return JSON.stringify(o)})()")
    sv2=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.26';o.mish={ins:'x',broke:5,log:{},stats:null,next:'?'};return JSON.stringify(o)})()")
    ctx.close()
    for tag,s in [('v2.25',sv),('broken v2.26',sv2)]:
        ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(s))
        r=E(pg,"[S.mish.ins,Array.isArray(S.mish.log),typeof S.mish.broke,!!S.mish.stats,isFinite(S.mish.next)]")
        ok(r==[0,True,'object',True,True],f'{tag} save loads with clean setback state ({r})')
        E(pg,'TT.simulate(30)'); ok(E(pg,"isFinite(S.coins)&&S.coins>0"),f'{tag} save: game runs on')
        ctx.close()
    # welcome back: explains that bad luck skips offline time
    ctx,pg=page(); E(pg,SETUP)
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.lastSave=Date.now()-3600e3;o.mish.broke={sawmill:{left:50,dur:80}};return JSON.stringify(o)})()")
    ctx.close()
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); ctx.add_init_script('if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    pg=ctx.new_page(); watch(pg,'wb '); pg.goto(URL); pg.wait_for_timeout(1500)
    txt=E(pg,"document.getElementById('modalRoot').innerText")
    ok('No bad luck while you were away' in txt and 'finished 1 repair' in txt,'welcome back: "No bad luck while you were away" + finished repairs')
    ok(E(pg,"Object.keys(S.mish.broke).length")==0,'repairs carry on offline')
    ok(E(pg,"S.mish.next-S.time")>=110 and E(pg,"S.mish.log.length")==0,'no setback right on your return (next one ≥ 2 min away)')
    ctx.close()
    # ---------------- desktop UI ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,"window.toast=()=>{};"); E(pg,"TT.render()"); pg.wait_for_timeout(400)
    ok(E(pg,"!document.getElementById('bbRisk').classList.contains('hidden')"),'Safety button appears once 3 buildings run')
    E(pg,"(()=>{S.coins=1e9;mishApply('theft');mishApply('audit');mishApply('breakdown');TT.render();})()"); pg.wait_for_timeout(300)
    pg.click('#bbRisk'); pg.wait_for_timeout(600)
    txt=E(pg,"document.getElementById('riskBody').innerText").lower()
    ok(E(pg,'TT.curSheet')=='risk' and 'bad luck happens' in txt and 'insurance' in txt and 'what can happen' in txt and 'what happened' in txt,'Safety sheet: summary, insurance, risks, event log')
    ok(E(pg,"document.querySelectorAll('.risk-log>div').length")>=3 and ('tax audit' in txt or 'tax office' in txt),'event log lists what happened')
    ok(E(pg,"document.querySelectorAll('#riskBody .risk-row').length")>=8,'every setback listed with its cap and counter-play')
    c0=E(pg,'S.coins'); pg.click('#riskBody [data-repair]'); pg.wait_for_timeout(300); ok(E(pg,"Object.keys(S.mish.broke).length")==0 and E(pg,'S.coins')<c0,'Repair now from the Safety sheet')
    pg.click('#insBuy'); pg.wait_for_timeout(300); ok(E(pg,'insLvl()')==1,'insurance button works')
    pg.screenshot(path='/tmp/v226_desk_risk.png')
    # scene tag → building sheet → repair
    E(pg,"(()=>{TT.closeSheet();mishApply('breakdown');TT.render();})()"); bid=E(pg,"Object.keys(S.mish.broke)[0]")
    E(pg,f"TT.focusLot('{bid}',true)"); pg.wait_for_timeout(1600)
    pt=E(pg,f"(()=>{{const L=LOTS['{bid}'];const p=w2s(L.top[0],L.top[1]-26);return [p[0],p[1]+4]}})()")
    E(pg,f"TT.sceneTapAt({pt[0]},{pt[1]})"); pg.wait_for_timeout(500)
    ok(E(pg,'TT.curSheet')=='bld' and E(pg,'sheetBld')==bid,f'tapping the 🔧 tag on the scene opens the {bid} sheet')
    ok('Broken down' in E(pg,"document.getElementById('bpRepair').innerText"),'building sheet shows the repair panel')
    ok(E(pg,"(()=>{const a=document.getElementById('bpBuy').parentElement,b=document.getElementById('bpRepair');return !!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)})()"),'repair panel sits below the buy row (buttons never shift)')
    pg.click('#bpRepairGo'); pg.wait_for_timeout(300); ok(E(pg,"Object.keys(S.mish.broke).length")==0,'Repair now on the building sheet')
    E(pg,"(()=>{mishApply('crash');TT.render();})()"); pg.wait_for_timeout(300)
    ok(E(pg,"!!document.querySelector('#events .event.bad[data-id=crash]')"),'market crash shows in the event bar')
    ctx.close()
    # ---------------- phones ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+' '); E(pg,SETUP); E(pg,"(()=>{window.toast=()=>{};S.coins=1e9;mishApply('breakdown');mishApply('flood');TT.render();})()"); pg.wait_for_timeout(300)
        E(pg,"TT.openSheet('more')"); pg.wait_for_timeout(400)
        ok(E(pg,'!!document.querySelector("#moreGrid .mtile[data-s=risk]")'),f'{dev}: More has a Safety tile')
        pg.tap('#moreGrid .mtile[data-s=risk]'); pg.wait_for_timeout(600); ok(E(pg,'TT.curSheet')=='risk',f'{dev}: tap opens Safety')
        ok(E(pg,'(()=>{const e=document.getElementById("riskBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll')
        hs=E(pg,'[...document.querySelectorAll("#insBuy,#riskBody [data-repair]")].map(b=>b.getBoundingClientRect().height)')
        ok(len(hs)==2 and min(hs)>=40,f'{dev}: buttons are touch-sized ({hs})')
        pg.screenshot(path=f'/tmp/v226_{dev.split()[0].lower()}_risk.png')
        pg.tap('#riskBody [data-repair]'); pg.wait_for_timeout(300); ok(E(pg,"Object.keys(S.mish.broke).length")==0,f'{dev}: tap Repair now')
        E(pg,"(()=>{mishApply('breakdown');TT.openSheet('bld',Object.keys(S.mish.broke)[0]);})()"); pg.wait_for_timeout(600)
        pg.locator('#bpRepairGo').scroll_into_view_if_needed(); hb=E(pg,'document.getElementById("bpRepairGo").getBoundingClientRect().height')
        ok(hb>=44,f'{dev}: repair button on the building sheet is touch-sized ({hb})')
        pg.tap('#bpRepairGo'); pg.wait_for_timeout(300); ok(E(pg,"Object.keys(S.mish.broke).length")==0,f'{dev}: tap repair on the building sheet')
        pg.tap('#shClose') if E(pg,"!!document.getElementById('shClose')") else E(pg,'TT.closeSheet()')
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('FAILS',FAILS)
sys.exit(1 if FAILS else 0)
