# v2.36 Workstation sets (maintenance proposal 5): all three workstations of a building at Lv 5 → 🧰 Tuned Line (×1.10 speed);
# all three at Lv 10 → 🏅 Master Set (×1.25 speed and the building's manager skill ×2, within the skill caps).
# Effects, buy flow + toast + trophies, Replant reset, costs vs income (no free lunch), sheet UI, scene tag, saves,
# desktop + iPhone/Pixel touch.
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
QUIET="(()=>{window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;})()"
SETUP='''(()=>{S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const [b,n] of [["sawmill",160],["chipper",60],["kiln",40],["peeler",40],["carpentry",120],["pellet",40],["paper",30],["furniture",20]]) TT.buyBuilding(b,n);
  S.coins=1e15;M=computeMods();for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);}})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,36),f"VERSION >= 2.36 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,36),'sw cache bumped to >= v2.36')
    E(pg,SETUP)
    # ---------------- effects ----------------
    r=E(pg,"""(()=>{const sp=()=>bSpeed('sawmill');S.ws.sawmill=[5,5,4];M=computeMods();const a=sp(),t0=wsSetTier('sawmill');
      S.ws.sawmill=[5,5,5];M=computeMods();const b=sp(),t1=wsSetTier('sawmill');const base5=wsMult('sawmill','spd');
      S.ws.sawmill=[10,10,9];M=computeMods();const c=sp(),t1b=wsSetTier('sawmill');S.ws.sawmill=[10,10,10];M=computeMods();const d=sp(),t2=wsSetTier('sawmill');
      // isolate: a → b also adds one yield-station level (Edger) which is not speed, so speed ratio is the set alone
      return {t0,t1,t1b,t2,r1:b/a,r2:d/c,r2b:d/c};})()""")
    ok(r['t0']==0 and r['t1']==1 and r['t1b']==1 and r['t2']==2,f"set tiers: [5,5,4] none · [5,5,5] Tuned Line · [10,10,9] still Tuned · [10,10,10] Master Set ({r})")
    ok(abs(r['r1']-1.10)<1e-6,f"🧰 Tuned Line: ×1.10 building speed ({r['r1']:.4f})")
    ok(abs(r['r2']-1.25/1.10)<1e-6,f"🏅 Master Set: ×1.25 speed in total (step ×{r['r2']:.4f} from Tuned)")
    r=E(pg,"""(()=>{S.mgr=S.mgr||{};S.mgr.emre=5;S.mgr.elif=10;S.ws.sawmill=[9,9,9];S.ws.carpentry=[9,9,9];M=computeMods();
      const a=mgrSkill('sawmill','speed'),c=mgrSkill('carpentry','double');S.ws.sawmill=[10,10,10];S.ws.carpentry=[10,10,10];M=computeMods();
      const b=mgrSkill('sawmill','speed'),d=mgrSkill('carpentry','double');return {a,b,c,d,o:mgrSkill('sawmill','double')};})()""")
    ok(abs(r['b']-2*r['a'])<1e-9,f"Master Set doubles the manager skill (Emre speed {r['a']:.3f} → {r['b']:.3f})")
    ok(r['d']<=.6+1e-9 and r['d']>r['c'],f"… within the skill cap (Elif Lucky Batch {r['c']:.3f} → {r['d']:.3f}, cap 0.60)")
    ok(r['o']==0,'… and never gives a manager a skill they do not have')
    # ---------------- buy flow, toast, trophies ----------------
    r=E(pg,"""(()=>{const T=[];window.toast=(h)=>T.push(h);S.ws.kiln=[5,5,4];S.coins=1e18;M=computeMods();const c0=S.coins,cost=wsCost('kiln',2);
      const okb=buyWs('kiln',2);checkAch(true);return {okb,spent:c0-S.coins,cost,tier:wsSetTier('kiln'),n1:S.wsSets&&S.wsSets.n1,ach:!!S.ach.wsset1};})()""")
    pg.wait_for_timeout(600); toasts=E(pg,"window._t||[]")
    ok(r['okb'] and abs(r['spent']-r['cost'])<1e-6*r['cost'] and r['tier']==1,f"buying the last station level completes the set at the normal price ({r})")
    ok(r['ach'],'trophy "Tuned Line"')
    r=E(pg,"(()=>{S.ws.chipper=[10,10,10];S.ws.peeler=[10,10,10];S.ws.pellet=[10,10,10];S.ws.paper=[10,10,10];checkAch(true);const a=!!S.ach.wsset2,b=!!S.ach.wsset5,n=wsSetCount(2);return [a,b,n];})()")
    ok(r[0] and r[1] and r[2]>=5,f'trophies "Master Set" and "Fully Kitted" (5 Master Sets: {r[2]})')
    r=E(pg,"ACH.filter(a=>['wsset1','wsset2','wsset5'].includes(a.id)).map(a=>a.g)")
    ok(r==['sys','sys','sys'],'the three trophies sit in Factory systems')
    # ---------------- costs vs income: a set is a real purchase ----------------
    r=E(pg,"""(()=>{S.ws={};wsGrandfather();M=computeMods();const id='sawmill';const n=wsSetNeed(id);
      const bl=BMAP[id],lv=S.buildings[id].lvl,lvl=bulkCost(bl.cost,bl.scale,lv,1);return {cost:n.cost,lvl,list:n.list.length,ratio:n.cost/lvl};})()""")
    r2=E(pg,"(()=>{const b=BMAP.sawmill;return b.cost*cs()*Math.pow(b.scale,WS_LV[5]);})()")
    ok(r['cost']>=r2,f"Tuned Line costs at least a Lv 150 building level (priced like the Lv 5 stations it needs: {r['cost']:.3g} ≥ {r2:.3g}; {r['ratio']:.2f} × the next level at Lv 160)")
    r=E(pg,"""(()=>{const id='sawmill',b=BMAP[id];S.ws[id]=[5,5,5];const n=wsSetNeed(id);return n.cost/(b.cost*cs()*Math.pow(b.scale,S.buildings[id].lvl));})()""")
    ok(r>=1,f"Master Set costs more than the building's next level ({r:.3g} ×)")
    # ---------------- Replant ----------------
    r=E(pg,"(()=>{S.ws.sawmill=[10,10,10];const a=wsSetTier('sawmill');window.toast=()=>{};S.totalEarned=Math.max(S.totalEarned,1e16);doPrestige();return [a,wsSetTier('sawmill'),wsSetCount(1),!!S.ach.wsset2];})()")
    ok(r[0]==2 and r[1]==0 and r[2]==0 and r[3],f'Replant resets the stations and their sets (trophies stay) ({r})')
    ctx.close()
    # ---------------- UI (desktop) ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,"(()=>{S.ws.sawmill=[5,5,5];S.ws.carpentry=[9,10,10];M=computeMods();})()")
    E(pg,"openSheet('bld','sawmill');bpTab('ws')"); pg.wait_for_timeout(500)
    r=E(pg,"(()=>{const e=document.getElementById('bpWs');return {sets:e.querySelectorAll('.ws-set').length,on:e.querySelectorAll('.ws-set.on').length,t:e.innerText};})()")
    ok(r['sets']==2 and r['on']==1 and 'Tuned Line' in r['t'] and 'Master Set' in r['t'],f'Workstations tab shows both sets, Tuned Line ✅ ({r["sets"]}, {r["on"]})')
    E(pg,"bpTab('ov');closeSheet();openSheet('bld','carpentry');bpTab('ws')"); pg.wait_for_timeout(500)
    r=E(pg,"document.getElementById('bpWs').innerText")
    ok('1 station level to' in r and 'Master Set' in r,'one level away: "1 station level to 🏅 Master Set · cost" hint')
    ok('manager skill ×2' in r,'Master Set row names the manager perk')
    pg.screenshot(path=os.path.join(HERE,'v236_desktop.png'))
    E(pg,"bpTab('ov');closeSheet()")
    r=E(pg,"(()=>{S.ws.carpentry=[10,10,10];return wsSetTag('carpentry')+'|'+wsSetTag('sawmill')+'|'+wsSetTag('kiln');})()")
    ok(r==' 🏅| 🧰|',f'scene level tag badge ({r!r})')
    ctx.close()
    # ---------------- saves ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,"(()=>{S.ws.sawmill=[10,10,10];S.ws.chipper=[5,6,7];})()"); base=E(pg,"JSON.stringify(S)"); ctx.close()
    cases=[('round trip','',lambda r: r['saw']==2 and r['chip']==1),
           ('v2.35 save','o.version="2.35";delete o.wsSets;',lambda r: r['saw']==2 and r['chip']==1),
           ('no workstations','delete o.ws;delete o.wsSets;',lambda r: r['saw']==0 and r['chip']==0),
           ('damaged','o.ws.sawmill="x";o.wsSets=5;',lambda r: r['saw']==0)]
    for name,mut,exp in cases:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        E(pg,QUIET); r=E(pg,"(()=>{for(let k=0;k<10;k++){S.forest.m=1e9;tick(1,false);}return {saw:wsSetTier('sawmill'),chip:wsSetTier('chipper'),ok:isFinite(S.coins)};})()")
        ok(exp(r) and r['ok'],f'{name}: loads ({r})')
        ctx.close()
    # ---------------- phones ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); E(pg,SETUP); E(pg,"(()=>{S.ws.sawmill=[10,10,9];M=computeMods();S.coins=1e80;window.toast=()=>{};})()")
        E(pg,"openSheet('bld','sawmill')"); pg.wait_for_timeout(700)
        E(pg,"document.getElementById('bpWsGo').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        pg.tap('#bpWsGo'); pg.wait_for_timeout(600)
        vw=E(pg,'innerWidth')
        rows=E(pg,"[...document.querySelectorAll('#bpWs .ws-set')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right]})")
        ok(len(rows)==2 and all(x[0]>=0 and x[1]<=vw+.5 for x in rows),f'{dev}: set rows fit the screen')
        ok(E(pg,'(()=>{const e=document.getElementById("shBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll')
        sel='#bpWs .ws-card[data-k="2"] button'
        E(pg,f"document.querySelector('{sel}').scrollIntoView({{block:'center'}})"); pg.wait_for_timeout(200)
        bb=pg.locator(sel).bounding_box(); ok(bb and bb['height']>=44,f'{dev}: station button ≥ 44 px')
        pg.tap(sel); pg.wait_for_timeout(500)
        ok(E(pg,"bpTabSel")=='ws',f'{dev}: tap 🛠 Stations → Workstations tab')
        ok(E(pg,"wsSetTier('sawmill')")==2,f'{dev}: tap the last station → 🏅 Master Set')
        ok(E(pg,"document.querySelectorAll('#bpWs .ws-set.on').length")==2,f'{dev}: both set rows ticked')
        pg.tap('#shSize'); pg.wait_for_timeout(700)
        E(pg,"document.querySelector('#bpWs .ws-sets').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        E(pg,"document.querySelectorAll('.toast').forEach(t=>t.remove())"); pg.wait_for_timeout(100)
        pg.screenshot(path=os.path.join(HERE,f'v236_{dev.split()[0].lower()}.png'))
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
