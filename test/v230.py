# v2.30 logistics tiers, part 1 (item 8): calm forklifts (one readable speed at every upgrade level, easing, rounded corners,
# load/unload stops, turn-rate limit) on all three fleets, the Forklift Depot (logistics tier 1: Phase II–III output +5 %/level,
# forest-value costs, reset on Replant, more forklifts / double loads in the scene), the Logistics ladder in the Shipping sheet,
# the Supply Flow line, trophies, old/damaged saves. Desktop + iPhone 13 touch.
from playwright.sync_api import sync_playwright
import sys,os,re,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;})()"
# Phase I + II + III running, rich enough to buy things
WORLD='''(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
 for(const id of ['sawmill','chipper','kiln','peeler','carpentry','pellet','paper','furniture']) S.buildings[id].lvl=30;
 S.premium.lvl=1;S.buildings.atelier.lvl=10;S.buildings.cabinetry.lvl=10;for(const c of COLLECTORS) S.collectors[c.id]=60;
 S.coins=1e15;M=computeMods();for(let k=0;k<30;k++){S.res.logs=1e9;tick(1,false);}scene._fsig='';scene._tsig='';scene._pfsig='';return true;})()'''
# drive the real scene update for N steps and measure every forklift of every fleet
MOTION='''(N)=>{const dt=1/30,fleets=()=>[['dock',scene.forklifts||[]],['tier',scene.tierLifts||[]],['prem',scene.plifts||[]]];
 const st={};let prev=new Map();
 for(let n=0;n<N;n++){scene.t+=dt;syncEntities();premSync();updateEntities(dt);premUpdate(dt);S.res.logs=1e9;
  for(const [k,L] of fleets()){const s=st[k]||(st[k]={n:0,vmax:0,dvmax:0,dyaw:0,stops:0,loadOut:0,loadIn:0,samp:0});s.n=Math.max(s.n,L.length);
   for(const f of L){const p=prev.get(f);if(p&&p.path===f.path){const v=Math.hypot(f.i-p.i,f.j-p.j)/dt;s.vmax=Math.max(s.vmax,v);
     if(f.wait>0&&!(p.w>0)) s.arr=Math.max(s.arr||0,p.v); else s.dvmax=Math.max(s.dvmax,Math.abs((f.v||0)-p.v)/dt);let d=Math.abs(f.yaw-p.yaw);while(d>Math.PI) d=Math.abs(d-2*Math.PI);s.dyaw=Math.max(s.dyaw,d/dt);
     if(f.wait>0&&!(p.w>0)) s.stops++;
     if(f.wait<=0&&f.v>.05){s.samp++;if(fkLoaded(f)===(f.dir>0)) s.loadOut++;}}
    prev.set(f,{i:f.i,j:f.j,v:f.v||0,yaw:f.yaw,path:f.path,w:f.wait});}}}
 return st;}'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate(QUIET); return ctx,pg
    E=lambda pg,js: pg.evaluate(js)
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,30),f"VERSION >= 2.30 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,30),'sw cache bumped')
    ok(E(pg,"S.logi&&S.logi.fk===0&&!logiUnlocked()"),'fresh game: Forklift Depot Lv 0, locked until a Phase II building')
    ok(E(pg,"(()=>{S.coins=1e12;return logiBuy()===false&&S.logi.fk===0;})()"),'buying while locked does nothing')
    # ---- the multiplier ----
    r=E(pg,"(()=>{S.logi.fk=6;const o=BUILDINGS.map(b=>[b.id,BTIER[b.id]||0,logiOut(b.id)]);S.logi.fk=0;return o;})()")
    ok(all((abs(x[2]-1.3)<1e-9) if x[1]>=2 else x[2]==1 for x in r),'Lv 6: Phase II and III ×1.30, Phase I / lab untouched')
    r=E(pg,'''(()=>{for(const b of BUILDINGS) S.buildings[b.id].lvl=0;S.buildings.carpentry.lvl=40;S.buildings.carpentry.on=true;S.autosell.chairs=false;S.autosell.planks=false;
      const run=L=>{S.logi.fk=L;S.res.planks=1e12;S.res.chairs=0;M=computeMods();const p0=S.res.planks;tick(1,false);return [S.res.chairs,p0-S.res.planks];};
      const a=run(0),c=run(10);S.logi.fk=0;return {a,c};})()''')
    ok(abs(r['a'][1]-r['c'][1])/r['a'][1]<1e-9 and abs(r['c'][0]/r['a'][0]-1.5)<1e-6,f"Depot Lv 10: same planks in, ×1.5 chairs out ({r})")
    # ---- costs / unlock / buy / Replant ----
    E(pg,WORLD)
    ok(E(pg,"logiUnlocked()"),'unlocked once a Phase II building is built')
    r=E(pg,"(()=>{const c1=logiCost(0);S.runCS=100;const c2=logiCost(0);S.runCS=1;return [c1,c2,logiCost(9),logiCost(10)];})()")
    ok(abs(r[1]/r[0]-100)<1e-6 and r[2]>r[0]*1e5 and r[3] is None or (r[3] is not None and r[3]>1e300),f'costs scale with forest value and level, MAX at Lv 10 ({r[:3]})')
    r=E(pg,"(()=>{const c=logiCost(),c0=S.coins;const a=logiBuy();return [a,S.logi.fk,c0-S.coins,c];})()")
    ok(r[0] and r[1]==1 and abs(r[2]-r[3])/r[3]<1e-9,f'buying Lv 1 spends the cost ({r})')
    r=E(pg,"(()=>{for(let k=0;k<20;k++) logiBuy();return [S.logi.fk,!!S.ach.depot5,!!S.ach.depot10];})()")
    ok(r==[10,True,True],f'caps at Lv 10; Pallet Pro + Depot Master trophies ({r})')
    r=E(pg,"(()=>{S.totalEarned=1e20;const ok=doPrestige();return [ok,S.logi&&S.logi.fk];})()")
    ok(r==[True,0],f'Replant: the depot is rebuilt at the new run prices ({r})')
    ctx.close()
    # ---- old / damaged saves ----
    for name,mut in [('no logi (v2.29.1 save)','delete o.logi'),('logi null','o.logi=null'),('fk text','o.logi={fk:"x"}'),('fk 99','o.logi={fk:99}'),('fk -3','o.logi={fk:-3}')]:
        ctx,pg=page(tag=name+': ')
        E(pg,f"(()=>{{const o=JSON.parse(JSON.stringify(S));o.version='2.29.1';{mut};localStorage.setItem(SAVE_KEY,JSON.stringify(o));sessionStorage.setItem('_c','1');}})()")
        pg.reload(); pg.wait_for_timeout(1300)
        r=E(pg,"[S.logi&&S.logi.fk, TT.VERSION]")
        ok(r[0] in (0,10) and (r[0]==10)==(name=='fk 99'),f'{name}: loads with a sane depot level ({r})')
        ctx.close()
    # ---- calm motion in the real scene ----
    ctx,pg=page(); E(pg,WORLD)
    base=E(pg,f"({MOTION})(900)")
    E(pg,"S.ship.fspd=5;S.ship.crane=3;S.ship.fork=6;S.logi.fk=10;scene._fsig='';scene._tsig='';scene._pfsig='';")
    up=E(pg,f"({MOTION})(900)")
    for k in ['dock','tier','prem']:
        a,c=base.get(k,{}),up.get(k,{})
        ok(a.get('n',0)>0,f'{k} forklifts present ({a.get("n")})')
        ok(a.get('vmax',9)<=1.06*1.05 and c.get('vmax',9)<=1.06*1.05,f'{k}: top speed {a.get("vmax",0):.2f} / {c.get("vmax",0):.2f} tiles/s — calm, and the same after every speed upgrade (v2.29.1 was up to ~11)')
        ok(a.get('dvmax',9)<=.9*1.6+.05,f'{k}: smooth acceleration/braking (max |dv/dt| {a.get("dvmax",0):.2f})')
        ok(a.get('dyaw',9)<=2.6*1.05,f'{k}: turns are rate-limited (max {a.get("dyaw",0):.2f} rad/s)')
        ok(a.get('arr',9)<=.2,f'{k}: rolls into each stop slowly (≤ {a.get("arr",0):.2f} tiles/s just before stopping)')
        ok(a.get('stops',0)>=1,f'{k}: stops to load / unload ({a.get("stops")})')
        ok(a.get('samp',0)>0 and a['loadOut']==a['samp'],f'{k}: loaded on the way out, empty on the way back')
    ok(up['tier']['n']>base['tier']['n'],f"Depot Lv 4+: more forklifts on the cross-lane links ({base['tier']['n']} → {up['tier']['n']})")
    ok(up['tier']['n']<=3*max(1,E(pg,"tierLinks().length")),'never more than 3 per link (sprite cache stays warm)')
    # drawing with double loads renders without errors and stays in the sprite cache
    E(pg,"for(let k=0;k<60;k++) stepScene(1/30)")
    ok(E(pg,"logiBig()&&scene.tierLifts.length>0"),'double loads at Depot Lv 7+')
    # ---- Shipping sheet + Supply Flow, desktop ----
    E(pg,"S.logi.fk=2;S.coins=1e15;TT.openSheet('ship')"); pg.wait_for_timeout(700)
    t=pg.locator('#lgBox').inner_text()
    ok('Forklift Depot' in t and 'Lv 2/10' in t and 'Conveyor belts' in t and 'Cargo drones' in t,'Shipping sheet shows the logistics ladder (Depot, belts, drones)')
    ok(not re.search(r'NaN|undefined|Infinity',pg.locator('#shipBody').inner_text()),'no NaN / undefined in the sheet')
    ok('Forklift Loads' in pg.locator('#shipBody').inner_text() and 'faster forklifts' not in pg.locator('#shipBody').inner_text(),'"Forklift Speed" is now "Forklift Loads" (capacity, not speed)')
    pg.locator('#lgBuy').click(); pg.wait_for_timeout(300)
    ok(E(pg,"S.logi.fk")==3,'clicking ⬆ buys a level')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
    ok('Forklifts' in pg.locator('#flowLegend').inner_text() and '×1.15' in pg.locator('#flowLegend').inner_text(),'Supply Flow shows the logistics tier and its boost')
    pg.locator('#lgFlowGo').click(); pg.wait_for_timeout(800)
    ok(E(pg,"TT.curSheet")=='ship' and pg.locator('#lgBox').is_visible(),'its button opens Logistics in the Shipping sheet')
    E(pg,"closeSheet();toggleFlow(false)")
    ctx.close()
    # ---- phone touch ----
    ctx,pg=page('iPhone 13','iPhone: '); E(pg,WORLD)
    E(pg,"S.logi.fk=0;TT.openSheet('ship')"); pg.wait_for_timeout(800)
    pg.locator('#lgBuy').scroll_into_view_if_needed(); bb=pg.locator('#lgBuy').bounding_box()
    ok(bb and bb['height']>=40 and bb['x']+bb['width']<=390+1,f'iPhone: the depot button is a full touch target on screen ({bb})')
    pg.locator('#lgBuy').tap(); pg.wait_for_timeout(400)
    ok(E(pg,"S.logi.fk")==1,'iPhone: tapping ⬆ buys a level')
    w=E(pg,"Math.max(...[...document.querySelectorAll('#shipBody *')].map(e=>e.getBoundingClientRect().right))")
    ok(w<=391,f'iPhone: nothing in the sheet runs off the screen ({w:.0f}px)')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
    g=pg.locator('#lgFlowGo'); bb=g.bounding_box()
    ok(bb and bb['height']>=34,f'iPhone: Logistics button in Supply Flow is tappable ({bb})')
    g.tap(); pg.wait_for_timeout(900)
    ok(E(pg,"TT.curSheet")=='ship','iPhone: tapping it opens Logistics')
    E(pg,"closeSheet();toggleFlow(false)")
    m=E(pg,f"({MOTION})(600)")
    ok(all(m[k]['vmax']<=1.06*1.05 for k in m if m[k]['n']),'iPhone: forklifts stay calm')
    ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
print('\nALL PASS' if not FAILS else f'\n{len(FAILS)} FAIL(S): {FAILS}')
sys.exit(1 if FAILS else 0)
