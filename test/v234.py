# v2.34 order chains (item 11): client projects of 3 orders for the same client. Only the first order is on offer; each delivery
# unlocks the next, larger one in the same slot, and the last one pays a chain bonus (30 % of the steps). Every step is a v2.25
# client order (ordPlan sizing with a growing difficulty factor, ordPay reward × premium × managers × research) times a small
# loyalty step (×1 / ×1.1 / ×1.2). Generation + unlock flow, failure, reward math, forest-value scaling after Replant
# (multi-Replant sims, no tiny numbers), the board card with progress, old saves, flat frame cost, desktop + iPhone/Pixel touch.
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
  S.premium.lvl=1;S.coins=1e13;TT.buyBuilding("atelier",5);TT.buyBuilding("parquet",5);S.coins=1e13;M=computeMods();for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;S.orders.done=Math.max(S.orders.done,3);})()'''
# step check: amount, value vs income, reward / (goods value × premium × managers × research × loyalty step)
CHECK='''(ch=>{const m=mgrOrders()*(M.orderPay||1),inc=ordInc();return ch.steps.map((s,i)=>{const v=s.amt*price(s.item);return {it:s.item,amt:s.amt,val:v,vs:v/inc,rv:s.reward/v/((RMAP[s.item].premium?1.25:1)*m*CH_STEP[i]),rw:s.reward,dur:s.dur};});})'''
SIMHOOK='''{gain:()=>pendingSeeds(),cur:()=>S.legacy||0,prestige:()=>doPrestige(),
 spend:()=>{for(let g=0;g<50;g++){let b=null,bc=Infinity;for(const u of SHOP){if(!shopAvail(u.id)) continue;const c=shopCost(u.id);if(c<bc){bc=c;b=u.id;}}if(!b||bc>S.seeds||!buyShop(b)) break;}
   if(window._strong){for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);M=computeMods();}
   window._T0=S.time;window._lt=-99;(window._R=window._R||[]).push({s:[],cd0:S.orders.chDone||0,cf0:S.orders.chFailed||0,cs:0,started:0,paid:0,ord:0});S.orders.next=S.time+20;},
 hold:()=>{const R=window._R[window._R.length-1],t=S.time-window._T0,inc=ordInc();
   for(let k=0;k<4;k++){if(!S.orders.offer||!acceptOrder()) break;}
   const ch=S.orders.chain;if(ch&&ch.state==='offer'&&S.orders.acts.length<ordSlots()&&acceptChain()) R.started++;
   if(ch&&ch.state==='run'){const o=S.orders.acts.find(x=>x.ch===ch.id);if(o&&S.res[o.item]>=1) deliverFromStock(o.id);}
   if(t-window._lt>=15){window._lt=t;R.cs=cs();
     if(chainsOpen()) for(let i=0;i<2;i++){const c=makeChain();if(c) c.steps.forEach((s,j)=>R.s.push({j,it:s.item,amt:s.amt,rw:s.reward,val:s.amt*price(s.item),inc,cs:cs(),m:(RMAP[s.item].premium?1.25:1)*mgrOrders()*(M.orderPay||1)*CH_STEP[j],b:c.bonus,sum:c.steps.reduce((a,x)=>a+x.reward,0)}));}
   }
   return false;},
 want:(g,c,T)=>{rpTick();return rpAdvice().k==='now'||(T>=600&&g>=Math.max(3,c*.5));}}'''
SIMX='''(()=>{const R=window._R[window._R.length-1];return {done:(S.orders.chDone||0)-R.cd0,failed:(S.orders.chFailed||0)-R.cf0,started:R.started,cs:cs()};})()'''
def sim(p,strong,runs=5):
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); ctx.add_init_script(CLEAR)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.goto(URL); pg.wait_for_timeout(1300)
    pg.evaluate("(()=>{S.events=[];S.nextEvent=S.time+1e12;S.fires={};S.fireCool=1e12;window._strong=%d;"%strong+
      # every step as it unlocks, recorded right when it is sized (prices can move later, e.g. a VIP Rush ending)
      "const f=chStepOrder;window.chStepOrder=function(ch,i){const o=f(ch,i);const R=window._R&&window._R[window._R.length-1];if(R) R.s.push({j:i,live:1,it:o.item,amt:o.amt,rw:o.reward,val:o.amt*price(o.item),inc:ordInc(),cs:cs(),m:(RMAP[o.item].premium?1.25:1)*mgrOrders()*(M.orderPay||1)*CH_STEP[i]});return o;};})()")
    R=pg.evaluate(f"({open(os.path.join(HERE,'sim_v218.js')).read()})({{runs:{runs},maxMin:30,hook:{json.dumps(SIMHOOK)},extra:{json.dumps(SIMX)}}})")
    Sx=pg.evaluate('window._R'); b.close(); return R,Sx,errs
with sync_playwright() as p:
    SIMS=[(label,)+sim(p,strong) for strong,label in [(1,'late-game player (all research, Premium Area)'),(0,'greedy fresh player')]]
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,34),f"VERSION >= 2.34 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,34),'sw cache bumped to >= v2.34')
    # ---------------- definitions ----------------
    r=E(pg,"[CHAINS.length,CHAINS.every(c=>c.s.length===CH_STEPS&&c.s.every(l=>l.length&&l.every(k=>RMAP[k]&&canSell(k)))),CH_STEPS,CH_MULT,CH_STEP,CH_BONUS,new Set(CHAINS.map(c=>c.k)).size===CHAINS.length,CHAINS.every(c=>CLIENTS.some(x=>x.n===c.c))]")
    ok(r[0]>=6 and r[1] and r[2]==3 and r[6] and r[7],f'{r[0]} client projects of 3 steps, every step a good that can be sold (never logs), clients from the client list')
    ok(r[3]==[1,1.5,2.2] and r[4]==[1,1.1,1.2] and abs(r[5]-.3)<1e-9,f'difficulty ×{r[3]}, loyalty ×{r[4]}, chain bonus {r[5]*100:.0f} %')
    r=E(pg,"(()=>{const a=chainsOpen();return [a,S.orders.chain,S.orders.chDone,S.orders.chNext>=0];})()")
    ok(r[0] is False and r[1] is None and r[2]==0,f'a new game has no project yet (projects start after 2 client orders) ({r})')
    # ---------------- generation + unlock flow ----------------
    E(pg,SETUP)
    r=E(pg,"(()=>{const O=S.orders;O.chNext=S.time;tick(1,false);const ch=O.chain;return {open:chainsOpen(),st:ch&&ch.state,n:ch&&ch.steps.length,acts:O.acts.length,goods:ch&&ch.steps.map(s=>s.item),uniq:ch&&new Set(ch.steps.map(s=>s.item)).size,made:ch&&ch.steps.every(s=>prodRate(s.item)>0.02)};})()")
    ok(r['open'] and r['st']=='offer' and r['n']==3 and r['acts']==0,f"a mid-game factory gets a project offer on the board; it takes no slot until started ({r['goods']})")
    ok(r['uniq']==3 and r['made'],'… three different goods, all made by the factory now')
    r=E(pg,"(()=>{const O=S.orders,ch=O.chain;for(let i=0;i<ordSlots();i++){offerOrder('planks');acceptOrder(O.offers[O.offers.length-1].id);}for(const o of O.acts) o.amt=1e30;const a=acceptChain();const st=ch.state;O.acts=[];return [a,st];})()")
    ok(r==[False,'offer'],f'Start project is refused while every slot is busy ({r})')
    r=E(pg,"""(()=>{const O=S.orders,ch=O.chain;const a=acceptChain();const o=O.acts.find(x=>x.ch===ch.id);const exp=niceNum(ordPay(o.amt,o.item,o.dur,1.5,2.5,.15)*(RMAP[o.item].premium?1.25:1)*mgrOrders()*(M.orderPay||1));
      return {a,st:ch.state,step:ch.step,acts:O.acts.length,item:o.item,chStep:o.chStep,chN:o.chN,rw:o.reward,exp,s0:ch.steps[0].item};})()""")
    ok(r['a'] and r['st']=='run' and r['acts']==1 and r['chStep']==0 and r['chN']==3 and r['item']==r['s0'],f'Start project puts step 1 on the board as a running order ({r})')
    ok(r['rw']==r['exp'],f"step 1 pays exactly what a v2.25 client order for the same goods pays (🪙{r['rw']:.4g} = ordPay × premium × managers × research)")
    flow=E(pg,"""(()=>{const O=S.orders,ch=O.chain,out=[];for(let i=0;i<3;i++){const o=O.acts.find(x=>x.ch===ch.id);if(!o){out.push(null);break;}
       const c0=S.coins,d0=O.done;S.autosell[o.item]=false;S.res[o.item]=o.amt*1.2;deliverFromStock(o.id);const nx=O.acts.find(x=>x.ch===ch.id);
       out.push({step:i,paid:S.coins-c0,rw:o.reward,bonus:ch.bonus,done:O.done-d0,next:nx?[nx.chStep,nx.item,nx.amt,nx.reward,nx.ends-S.time]:null,chain:!!O.chain,cd:O.chDone,acts:O.acts.length,stepsDone:ch.steps.filter(s=>s.done).length});}
       return out;})()""")
    ok(flow[0] and flow[0]['next'] and flow[0]['next'][0]==1 and flow[0]['acts']==1 and flow[0]['stepsDone']==1 and abs(flow[0]['paid']-flow[0]['rw'])<1e-6,f"delivering step 1 pays its reward and unlocks step 2 in the same slot ({flow[0] and flow[0]['next']})")
    ok(flow[1] and flow[1]['next'] and flow[1]['next'][0]==2 and flow[1]['next'][3]>flow[1]['rw']>flow[0]['rw'],f"step 2 → step 3, each one larger: rewards 🪙{flow[0]['rw']:.3g} → {flow[1]['rw']:.3g} → {flow[1]['next'][3]:.3g}")
    ok(flow[2] and not flow[2]['chain'] and flow[2]['cd']==1 and abs(flow[2]['paid']-flow[2]['rw']-flow[2]['bonus'])<1e-6 and flow[2]['acts']==0,f"the last delivery pays its reward + the chain bonus (🪙{flow[2]['bonus']:.3g}) and closes the project")
    ok(all(f and f['done']==1 for f in flow),'every step counts as a completed client order (trophies, order book)')
    E(pg,"window.checkAch&&checkAch()"); ok(E(pg,"!!S.ach.chain1"),'trophy "Project Partner" for the first project')
    r=E(pg,"(()=>{const O=S.orders;return [O.chHist.length,O.chHist[0].ok,O.chNext>S.time,O.hist.slice(-3).map(h=>h.ch)];})()")
    ok(r[0]==1 and r[1] and r[2] and r[3]==['1/3','2/3','3/3'],f'project history + order book show the steps, the next project comes later ({r})')
    # failure, decline, expiry
    r=E(pg,"""(()=>{const O=S.orders;offerChain();const ch=O.chain;acceptChain();const o=O.acts.find(x=>x.ch===ch.id);o.amt=1e30;const c0=S.coins,f0=O.failed;S.time=o.ends+1;tick(.1,false);
      return {chain:O.chain,cf:O.chFailed,failed:O.failed-f0,acts:O.acts.filter(x=>x.ch!==undefined).length,coins:S.coins>=c0};})()""")
    ok(r['chain'] is None and r['cf']==1 and r['failed']==1 and r['acts']==0,f'a step that runs out of time ends the project, no bonus, no penalty ({r})')
    r=E(pg,"(()=>{const O=S.orders;offerChain();const a=declineChain();const b=O.chain;O.chNext=0;offerChain();const ch=O.chain;S.time=ch.expires+1;tick(.1,false);return [a,b,O.chain,O.chNext>S.time];})()")
    ok(r==[True,None,None,True],f'decline and an expired offer clear the board, with a pause before the next project ({r})')
    # ---------------- reward math (v2.25 proportional) ----------------
    r=E(pg,"(()=>{const L=[];for(let i=0;i<250;i++){const c=makeChain();if(c) L.push({st:(%s)(c),b:c.bonus,sum:c.steps.reduce((a,s)=>a+s.reward,0)});}return {L,inc:ordInc(),min:ORD_MIN_PAY*cs()};})()"%CHECK)
    L=r['L']; st=[s for c in L for s in c['st']]
    ok(len(L)==250,f'250 projects drawn on a mid-game factory ({len(L)})')
    ok(min(s['amt'] for s in st)>=20,f"every step asks for ≥ 20 units (min {min(s['amt'] for s in st):.3g})")
    ok(min(s['vs'] for s in st)>=4.5,f"every step is worth ≥ 5 s of income (min {min(s['vs'] for s in st):.1f} s)")
    ok(min(s['rv'] for s in st)>=1.4 and max(s['rv'] for s in st)<=2.65,f"step reward = goods value × 1.5–2.5 (the v2.25 band) × loyalty step, before bonuses (± rounding) ({min(s['rv'] for s in st):.2f}–{max(s['rv'] for s in st):.2f})")
    ok(all(c['st'][i+1]['rw']>c['st'][i]['rw'] for c in L for i in range(2)),'rewards grow step by step in every project')
    gv=[c['st'][i+1]['val']/c['st'][i]['val'] for c in L for i in range(2)]
    ok(min(gv)>=1.3,f'goods value grows step by step in every project (each step ≥ ×{min(gv):.2f} the one before)')
    bo=[c['b']/(.3*c['sum']) for c in L]
    ok(min(bo)>=.94 and max(bo)<=1.06,f'chain bonus = 30 % of the steps\' rewards (± rounding) ({min(bo):.3f}–{max(bo):.3f})')
    tot=[(c['sum']+c['b'])/sum(s['val'] for s in c['st']) for c in L]
    ok(max(tot)<=2.5*1.25*1.2*1.3*1.25+1e-9,f'a whole project pays at most {max(tot):.2f}× its goods (incl. bonus; v2.25 orders up to 2.5× × premium)')
    ctx.close()
    # ---------------- forest value after Replant ----------------
    ctx,pg=page(); E(pg,SETUP)
    r=E(pg,"""(()=>{S.orders.chNext=0;offerChain();const d0=S.orders.chDone=4;S.totalEarned=1e15;S.seeds=0;S.legacy=Math.max(S.legacy||0,2000);doPrestige();window.toast=()=>{};S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;
      const o={cs:cs(),chain:S.orders.chain,done:S.orders.chDone,open0:chainsOpen(),c0:makeChain()};
      buyBuilding('sawmill',1,{logsOnly:true});S.coins=1e9*cs();buyCollector('lumberjack',40);
      for(const [b,n] of [['sawmill',30],['chipper',15],['kiln',10],['peeler',10],['carpentry',8],['pellet',6]]){S.coins=1e30;buyBuilding(b,n);}S.coins=0;M=computeMods();
      for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}S.totalEarned=Math.max(S.totalEarned,3e4*cs());
      const L=[];for(let i=0;i<100;i++){const c=makeChain();if(c) L.push({st:(%s)(c)});}o.L=L;o.inc=ordInc();o.open=chainsOpen();o.min=ORD_MIN_PAY*cs();return o;})()"""%CHECK)
    st=[s for c in r['L'] for s in c['st']]
    ok(r['cs']>5 and r['chain'] is None and r['done']==4,f"Replant (forest value ×{r['cs']:.0f}) clears the project in hand and keeps the project count")
    ok(r['open'] and len(r['L'])>=50,f"projects return once the new run's lines run ({len(r['L'])} of 100 draws)")
    ok(st and min(s['amt'] for s in st)>=20 and min(s['vs'] for s in st)>=4.5 and min(s['rw'] for s in st)>=r['min'],f"after Replant no tiny numbers: ≥ 20 units, ≥ 5 s of income, ≥ 🪙{r['min']:.3g} per step (min {st and min(s['amt'] for s in st):.3g} units, {st and min(s['vs'] for s in st):.1f} s)")
    ok(st and min(s['rv'] for s in st)>=1.4 and max(s['rv'] for s in st)<=2.65,f"… and still proportional to the goods ({st and min(s['rv'] for s in st):.2f}–{st and max(s['rv'] for s in st):.2f})")
    r=E(pg,"(()=>{const c0=coinRate,i0=S.run.inc;coinRate=0;S.run.inc=0;const k=S.runCS;S.runCS=1000;const a=chPlanStep('beams',0,0,0);S.runCS=1;const b=chPlanStep('beams',0,0,0);S.runCS=k;coinRate=c0;S.run.inc=i0;return [a.reward,b.reward,a.amt/b.amt,prodRate('beams')];})()")
    ok(r[3]==0 and r[0]>=50*1000 and r[0]>=r[1]*100 and r[2]>=30,f'with no income yet, the amount floor and the reward floor follow forest value (×1000: {r[2]:.0f}× the units, 🪙{r[0]:.3g} vs 🪙{r[1]:.3g})')
    ctx.close()
    for label,R,Sx,er in SIMS:
        rows=[]
        for i,(x,s) in enumerate(zip(R,Sx)):
            L=s['s']; rows.append({'run':i+1,'cs':x['x']['cs'],'done':x['x']['done'],'failed':x['x']['failed'],'started':x['x']['started'],'n':len(L),
              'minAmt':min([y['amt'] for y in L],default=None),'small':sum(1 for y in L if y['amt']<20),'tiny':sum(1 for y in L if y['val']<y['inc']),
              'rvMin':min([y['rw']/y['val']/y['m'] for y in L],default=1.5),'rvMax':max([y['rw']/y['val']/y['m'] for y in L],default=1.5)})
        print('   ',label,[(r_['run'],round(r_['cs'],1),r_['n'],r_['minAmt'],r_['started'],r_['done'],r_['failed'],round(r_['rvMin'],2),round(r_['rvMax'],2)) for r_ in rows])
        ok(len(rows)==5 and rows[-1]['cs']>1.5,f'{label}: 5 runs with 4 Replants (forest value ×{rows[-1]["cs"]:.3g})')
        ok(sum(r_['n'] for r_ in rows)>100,f"{label}: projects drawn in the runs ({[r_['n'] for r_ in rows]} steps sampled)")
        ok(not any(r_['small'] or r_['tiny'] for r_ in rows),f"{label}: no project step under 20 units or worth < 1 s of income in any run ({[(r_['small'],r_['tiny']) for r_ in rows]})")
        ok(all(1.4<=r_['rvMin'] and r_['rvMax']<=2.65 for r_ in rows),f"{label}: step rewards stay in the v2.25 band × loyalty in every run")
        ok(sum(r_['done'] for r_ in rows)>=3,f"{label}: projects get completed across the runs ({[r_['done'] for r_ in rows]} done, {[r_['failed'] for r_ in rows]} missed)")
        ok(not er,f'{label}: no page errors ({er[:2]})')
    # ---------------- board UI (desktop) ----------------
    ctx,pg=page(); E(pg,SETUP)
    E(pg,"(()=>{S.orders.chNext=0;offerChain('library')||offerChain();offerOrder('chairs');TT.ordTab='clients';window._tk=tick;window.tick=()=>{};})()"); pg.click('#bbOrd'); pg.wait_for_timeout(600)
    r=E(pg,"(()=>{const c=document.getElementById('chCard');return c&&{steps:c.querySelectorAll('.ch-step:not(.bonus)').length,bonus:!!c.querySelector('.ch-step.bonus'),yes:!!c.querySelector('#chYes'),txt:c.innerText,pips:c.querySelectorAll('.ch-pips i').length,first:document.querySelector('#ordBody .ord-card')===c};})()")
    ok(r and r['steps']==3 and r['bonus'] and r['yes'] and r['pips']==4 and r['first'],f'Clients tab: the project card leads the board with 3 steps, the chain bonus, progress pips and Start ({r and r["steps"]})')
    ok(r and '≈' in r['txt'] and 'Chain bonus' in r['txt'] and 'New project' in r['txt'],'… later steps are shown as estimates (≈) until they unlock')
    pg.click('#chYes'); pg.wait_for_timeout(500)
    r=E(pg,"(()=>{const c=document.getElementById('chCard');return {run:S.orders.chain&&S.orders.chain.state,chip:document.getElementById('chChip').innerText,acts:document.querySelectorAll('#ordBody .ord-card.act').length,now:c.querySelectorAll('.ch-step.now').length,del:!!document.getElementById('chDel')};})()")
    ok(r['run']=='run' and 'Step 1/3' in r['chip'] and r['acts']==0 and r['now']==1 and r['del'],f"clicking Start runs the project: progress chip, current step highlighted, Deliver button, no duplicate order card ({r['chip']})")
    E(pg,"(()=>{const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);S.autosell[o.item]=false;S.res[o.item]=o.amt*1.3;})()"); pg.wait_for_timeout(400)
    pg.click('#chDel'); pg.wait_for_timeout(600)
    r=E(pg,"(()=>{const c=document.getElementById('chCard');return {step:S.orders.chain.step,chip:document.getElementById('chChip').innerText,done:c.querySelectorAll('.ch-step.done').length,pips:c.querySelectorAll('.ch-pips i.done').length,bar:parseFloat(document.getElementById('chBar').style.width)};})()")
    ok(r['step']==1 and 'Step 2/3' in r['chip'] and r['done']==1 and r['pips']==1 and 30<=r['bar']<=40,f"Deliver from storage completes step 1; the card moves to step 2 ({r})")
    E(pg,"(()=>{const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);o.got=o.amt*.45;S.res[o.item]=0;})()"); pg.wait_for_timeout(600)
    E(pg,"closeSheet();S.orders.offers=[];"); pg.wait_for_timeout(400); E(pg,"renderOrderCard()")
    ok('🔗2/3' in E(pg,"document.getElementById('orderCard').innerText"),'the HUD order card shows the project step (🔗2/3)')
    hb=E(pg,"(()=>{const c=document.getElementById('orderCard').getBoundingClientRect(),l=document.querySelector('#orderCard .oc-l').getBoundingClientRect();return [c.width,l.height];})()")
    ok(hb[1]<=20,f'… on one line ({hb})')
    E(pg,"TT.ordTab='clients'"); pg.click('#bbOrd'); pg.wait_for_timeout(700)
    ov=E(pg,"""(()=>{const c=document.getElementById('chCard');const els=[...c.querySelectorAll('.ch-tx b,.ch-rw,.ch-n,.oc-ic')];let bad=[];
      for(const r of c.querySelectorAll('.ch-step')){const tx=r.querySelector('.ch-tx').getBoundingClientRect(),rw=r.querySelector('.ch-rw').getBoundingClientRect();if(tx.right>rw.left+1) bad.push('overlap');}
      const W=document.getElementById('ordBody');return {bad,sx:W.scrollWidth<=W.clientWidth+1};})()""")
    ok(not ov['bad'] and ov['sx'],f'no overlapping text in the step rows, no sideways scroll ({ov})')
    E(pg,"document.getElementById('chCard').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(HERE,'v234_desktop.png'))
    # flat frame cost with the project running (scene + live board updates)
    r=E(pg,'''(()=>{const t=on=>{const O=S.orders;const keep=O.chain,acts=O.acts.slice();if(!on){O.chain=null;O.acts=O.acts.filter(x=>x.ch===undefined);}ordSig='';updateOrders();
       for(let k=0;k<60;k++){stepScene(1/30);updateOrders();}const a=[];for(let k=0;k<150;k++){const t0=performance.now();stepScene(1/30);updateOrders();a.push(performance.now()-t0);}O.chain=keep;O.acts=acts;ordSig='';a.sort((x,y)=>x-y);return a[75];};
      const x0=t(0),x1=t(1),x2=t(0),x3=t(1);return [Math.min(x0,x2),Math.min(x1,x3)];})()''')
    ok(r[1]<=r[0]*1.2+1.0,f'flat frame cost: median {r[0]:.2f} ms without a project → {r[1]:.2f} ms with the project card open and updating')
    ctx.close()
    # ---------------- saves ----------------
    ctx,pg=page(); E(pg,SETUP)
    E(pg,"(()=>{S.orders.chNext=0;offerChain();acceptChain();const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);o.amt=1e9;S.orders.chDone=3;})()")
    base=E(pg,"JSON.stringify(S)")
    ctx.close()
    cases=[('round trip (project running)','',lambda r: r['st']=='run' and r['act'] and r['cd']==3),
           ('v2.33 save (no chain fields)','o.version="2.33";for(const k of ["chain","chNext","chDone","chFailed","chEarned","chHist"]) delete o.orders[k];for(const a of o.orders.acts){delete a.ch;delete a.chStep;delete a.chN;}',lambda r: r['st'] is None and r['cd']==0 and r['plain']>=1),
           ('v2.24 save (offer/active only)','o.version="2.24";const a=o.orders.acts[0];delete a.ch;o.orders={offer:null,active:a,next:o.time+50,done:7,failed:2,hist:[]};',lambda r: r['st'] is None and r['plain']==1 and r['done']==7),
           ('damaged chain','o.orders.chain={steps:"x",state:"run",step:9};o.orders.chDone="y";',lambda r: r['st'] is None and r['cd']==0 and r['plain']>=1)]
    for name,mut,exp in cases:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        r=E(pg,"(()=>{const O=ordNorm();const ch=O.chain;return {st:ch&&ch.state,act:!!(ch&&O.acts.find(x=>x.ch===ch.id)),cd:O.chDone,plain:O.acts.filter(x=>x.ch===undefined).length,done:O.done,ver:TT.VERSION};})()")
        ok(exp(r),f'{name}: loads ({r})')
        E(pg,QUIET); E(pg,"(()=>{for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);stepScene(1/30);}TT.ordTab='clients';openSheet('ord');updateOrders();})()"); pg.wait_for_timeout(300)
        ok(E(pg,"isFinite(S.coins)&&!!document.querySelector('#ordBody .ord-board')"),f'{name}: game runs on and the board renders')
        ctx.close()
    # offline progress keeps chains going
    ctx,pg=page(); E(pg,SETUP)
    r=E(pg,"(()=>{S.orders.chNext=0;offerChain();acceptChain();const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);S.autosell[o.item]=false;S.res[o.item]=0;TT.simulateOffline(120);const o2=S.orders.acts.find(x=>x.ch===(S.orders.chain&&S.orders.chain.id));return [!!S.orders.chain,S.orders.chain?S.orders.chain.step:-1,o2?o2.got>0||o2.chStep>0:S.orders.chDone>0];})()")
    ok(r[2] and E(pg,"isFinite(S.coins)"),f'offline time fills the running step like any order ({r})')
    ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); E(pg,SETUP)
        E(pg,"(()=>{S.orders.chNext=0;offerChain('library')||offerChain();TT.ordTab='clients';window._tk=tick;window.tick=()=>{};TT.openSheet('ord');})()"); pg.wait_for_timeout(800)
        vw=E(pg,'innerWidth')
        bb=pg.locator('#chYes').bounding_box()
        ok(bb and bb['height']>=44 and bb['x']>=0 and bb['x']+bb['width']<=vw+.5,f'{dev}: Start project is a full touch target ({bb and round(bb["height"])} px)')
        rows=E(pg,"[...document.querySelectorAll('#chCard .ch-step')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.height]})")
        ok(len(rows)==4 and all(x[0]>=0 and x[1]<=vw+.5 and x[2]>=44 for x in rows),f'{dev}: step rows fit the screen and are ≥ 44 px ({[round(x[2]) for x in rows]})')
        ok(E(pg,'(()=>{const e=document.getElementById("ordBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll')
        E(pg,"document.getElementById('chYes').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        pg.tap('#chYes'); pg.wait_for_timeout(500)
        ok(E(pg,"S.orders.chain&&S.orders.chain.state")=='run',f'{dev}: tap Start project')
        E(pg,"(()=>{const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);S.autosell[o.item]=false;S.res[o.item]=o.amt*1.2;})()"); pg.wait_for_timeout(500)
        E(pg,"document.getElementById('chDel').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        db=pg.locator('#chDel').bounding_box(); ok(db and db['height']>=44,f'{dev}: Deliver button ≥ 44 px')
        pg.tap('#chDel'); pg.wait_for_timeout(600)
        ok(E(pg,"S.orders.chain&&S.orders.chain.step")==1,f'{dev}: tap Deliver completes step 1 and unlocks step 2')
        E(pg,"(()=>{const ch=S.orders.chain;const o=S.orders.acts.find(x=>x.ch===ch.id);o.got=o.amt*.4;S.res[o.item]=0;})()"); pg.wait_for_timeout(600)
        pg.tap('#shSize'); pg.wait_for_timeout(700)   # full-height sheet: the whole project card + progress at once
        E(pg,"document.getElementById('chCard').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        r=E(pg,"(()=>{const c=document.getElementById('chCard').getBoundingClientRect(),b=document.getElementById('chDel').getBoundingClientRect(),bb=document.getElementById('bottombar');const bt=bb?bb.getBoundingClientRect().top:innerHeight;return [Math.round(c.top),Math.round(b.bottom),Math.round(bt),Math.round(innerHeight)];})()")
        ok(r[1]<=r[2] and r[1]<=r[3],f'{dev}: in the full-height sheet the whole project card (steps, bonus, progress, Deliver) is on screen ({r})')
        pg.screenshot(path=os.path.join(HERE,f'v234_{dev.split()[0].lower()}.png'))
        E(pg,"closeSheet()"); pg.wait_for_timeout(500); E(pg,"renderOrderCard()")
        cb=E(pg,"(()=>{const c=document.getElementById('orderCard');const r=c.getBoundingClientRect();return [r.left,r.right,c.innerText.includes('🔗2/3')];})()")
        ok(cb[0]>=0 and cb[1]<=vw+.5 and cb[2],f'{dev}: the HUD order card shows 🔗2/3 and fits the screen ({cb})')
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
