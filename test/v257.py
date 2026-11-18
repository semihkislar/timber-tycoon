# v2.57: supply fixes. The Paper Mill and the Pellet Press get more out of the same chips from
# Lv 25 (+4 % / +2 % per level). A by-product (bark, the Beam Saw's chips) no longer pauses its
# building when its store is full. The Bottleneck Advisor names the vessel, order or contract
# that takes a good ahead of the workshops. The glue text says 0.7 per charcoal.
from playwright.sync_api import sync_playwright
import os, sys, re, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, BASE, ROOT, ver
from _pace import ready, paint, STOP
from shots import shot_path
FAILS=[]
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js, arg=None):
    return pg.evaluate(js, arg)
OLD=BASE+'releases/v2.56/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=257;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{window.toast=()=>{};window.sfx=()=>{};S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;}if(S.mish){S.mish.next=1e15;S.mish.broke={};}S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx)S.wx.next=1e15;if(typeof ntClear==="function")ntClear();}'''
# a factory with every building at the level one more coin budget X buys (same next-level cost everywhere),
# every tech building unlocked, research tier `tier`, upgrades at level `tier`, endless logs; returns each building's feed
BAL=r'''([lv,tier,sec])=>{S=freshState();M=computeMods();window.toast=()=>{};window.sfx=()=>{};
  S.premium.lvl=5;S.trade.lvl=1;for(const r of RES) S.autosell[r.id]=canSell(r.id);
  for(const n of RNODES) if(n.unlock||n.id==='tar'||n.t<=tier) S.research[n.id]=1;
  for(const u of UPGRADES) S.upgrades[u.id]=Math.min(upMax(u),tier);
  for(const b of BUILDINGS){S.buildings[b.id].lvl=lv[b.id]||0;S.buildings[b.id].on=true;}
  S.nextEvent=1e15;M=computeMods();const acc={},lim={};let n=0;
  for(let t=0;t<sec*4;t++){S.res.logs=1e30;S.fires={};if(S.mish)S.mish.broke={};tick(.25,false);
    if(t>=sec*2){n++;for(const b of BUILDINGS){if(!S.buildings[b.id].lvl) continue;acc[b.id]=(acc[b.id]||0)+bstat[b.id].f;if(bstat[b.id].f<.97&&bstat[b.id].lim) lim[b.id]=bstat[b.id].lim;}}}
  const o={};for(const k in acc) o[k]=[+(acc[k]/n).toFixed(3),lim[k]||''];return o;}'''
# every building at Lv L, every non-repeatable research node, Drum Chipper and Chair Line as far as L allows (the setup of test/v250.py)
EQ=r"""(L)=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};window.mishTick=()=>{};window.fireTick=()=>{};
  S=freshState();S.nextEvent=1e12;S.premium.lvl=1;S.coins=1e30;S.trade.lvl=1;
  for(const n of RNODES) if(!n.rep) S.research[n.id]=1;
  for(const b of BUILDINGS){S.buildings[b.id].lvl=L;S.buildings[b.id].on=true;}
  for(const r of RES) S.autosell[r.id]=canSell(r.id);
  if(typeof wsGrandfather==='function') wsGrandfather(S);
  for(const c of COLLECTORS) S.collectors[c.id]=800;
  S.legacy=5000;for(const id of ['drum','chairline']){const u=UPGRADES.find(x=>x.id===id);let lv=0;for(let k=1;k<=upMax(u);k++) if(upReqOk(u,k)) lv=k;S.upgrades[id]=lv;}
  M=computeMods();const ids=['parquet','cabinetry','toyshop','boatyard','atelier','stationer','lab'],a={};let n=0;
  for(let k=0;k<120;k++){S.forest.m=1e12;tick(1,false);if(k<40) continue;n++;for(const id of ids) a[id]=(a[id]||0)+bstat[id].f;}
  for(const id of ids) a[id]=+(a[id]/n).toFixed(3);return a;}"""
# the opening script of test/v255.py: 20 minutes of a fixed buying order
EARLY=r'''(()=>{const __t=Date.now();Date.now=()=>__t;let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};
  S.coins=50;S.totalEarned=0;S.time=0;S.legacy=0;S.runCS=1;S.upgrades={};if(S.ob)S.ob.st="skip";
  if(S.forest){S.forest.m=1200;S.forest.y=0;S.forest.s=0;S.forest.st=0;}
  if(S.res){for(const k in S.res)S.res[k]=0;}
  if(S.wx){S.wx.clock=126;S.wx.w="clear";S.wx.ends=0;S.wx.next=1e15;}
  coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
  for(const c of COLLECTORS) S.collectors[c.id]=0;
  for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
  const want=["sawmill","chipper","kiln","carpentry","peeler","pellet","paper","furniture"];
  for(let k=0;k<2400;k++){if(k%4==0){TT.buyCollector("lumberjack",1);if(S.collectors.lumberjack>=10)TT.buyCollector("chainsaw",1);if(S.collectors.chainsaw>=10)TT.buyCollector("truck",1);
    for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,S.buildings.pellet.lvl];})()'''
# a mid-game factory for the by-product and advisor checks
MID=r'''()=>{S=freshState();M=computeMods();S.premium.lvl=5;S.trade.lvl=2;S.trade.routes={};for(const c of CITIES) S.trade.routes[c.id]=1;
  for(const r of RES) S.autosell[r.id]=canSell(r.id);for(const n of RNODES) if(n.unlock||n.id==='tar') S.research[n.id]=1;
  const lv={sawmill:80,chipper:60,kiln:60,carpentry:70,peeler:60,pellet:50,paper:50,furniture:40,beamsaw:55,glulam:30,plymill:30,showroom:12,cabinetry:12,framer:12};
  for(const b of BUILDINGS){S.buildings[b.id].lvl=lv[b.id]||0;S.buildings[b.id].on=true;}
  S.nextEvent=1e15;S.fireCool=1e15;if(S.mish)S.mish.next=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;}if(S.wx)S.wx.next=1e15;M=computeMods();}'''
RUN=r'''(sec)=>{for(let t=0;t<sec*4;t++){S.res.logs=1e30;S.fires={};tick(.25,false);}}'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR, url=URL):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport={'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init+STOP); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,57), f"VERSION is 2.57 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    ok(ver(re.search(r"timber-tycoon-v([\d.]+)", sw).group(1))>=(2,57), 'service-worker cache is timber-tycoon-v2.57 or newer')
    # ---- yield curves ----
    y=E(pg,'[1,25,26,50,100,200].map(l=>[paperYieldAt(l),pelletYieldAt(l)])')
    ok(y[0]==[1,1] and y[1]==[1,1], 'paper and pellet yield are ×1 through Lv 25')
    ok(abs(y[2][0]-1.04)<1e-9 and abs(y[3][0]-2)<1e-9 and abs(y[4][0]-4)<1e-9 and abs(y[5][0]-8)<1e-9, f'paper yield grows 4 % per level from Lv 25 ({[round(v[0],2) for v in y]})')
    ok(abs(y[2][1]-1.02)<1e-9 and abs(y[3][1]-1.5)<1e-9 and abs(y[4][1]-2.5)<1e-9 and abs(y[5][1]-4.5)<1e-9, f'pellet yield grows 2 % per level from Lv 25 ({[round(v[1],2) for v in y]})')
    io=E(pg,r'''()=>{const out={};for(const [id,g] of [['paper','paper'],['pellet','pellets']]){const r=[];for(const l of [25,75]){
      S=freshState();M=computeMods();S.buildings.chipper.lvl=1;S.buildings[id].lvl=l;S.buildings[id].on=true;S.buildings.chipper.on=false;S.autosell[g]=false;S.autosell.chips=false;S.res.chips=1e30;S.nextEvent=1e15;
      const c0=S.res.chips,sp=bSpeed(id);tick(1,false);r.push([(c0-S.res.chips)/sp,S.res[g]/sp,bstat[id].f,chainYield(id)]);}out[id]=r;}return out;}''')
    pa,pe=io['paper'],io['pellet']
    ok(abs(pa[0][1]-10)<1e-6 and abs(pa[1][1]-30)<1e-6, f'a Lv 75 Paper Mill makes 30 paper per batch, a Lv 25 one 10 ({pa[0][1]:.2f}, {pa[1][1]:.2f})')
    ok(abs(pe[0][1]-8)<1e-6 and abs(pe[1][1]-16)<1e-6, f'a Lv 75 Pellet Press makes 16 pellets per batch, a Lv 25 one 8 ({pe[0][1]:.2f}, {pe[1][1]:.2f})')
    ok(pa[0][2]==1 and pa[1][2]==1 and pe[1][2]==1, 'both run at full speed in that check')
    caps=E(pg,r'''()=>{S=freshState();M=computeMods();S.buildings.paper.lvl=75;S.buildings.pellet.lvl=75;const c=stockCaps();return [c.paper/(10*bSpeed('paper')*stoSec(0)),c.pellets/(8*bSpeed('pellet')*stoSec(0))];}''')
    ok(abs(caps[0]-3)<1e-6 and abs(caps[1]-2)<1e-6, f'the paper and pellet stores grow with the yield ({caps[0]:.2f}×, {caps[1]:.2f}×)')
    # ---- same next-level cost in every building: nobody waits on paper or pellets ----
    B=E(pg,'BUILDINGS.map(b=>({id:b.id,cost:b.cost,scale:b.scale}))')
    def levels(X): return {x['id']:(int(math.floor(math.log(X/x['cost'])/math.log(x['scale'])))+1 if X>=x['cost'] else 0) for x in B}
    USERS=['atelier','parquet','stationer','lab','toyshop']
    worst={}; bad=[]; ply=[]
    for e,t in [(8,2),(9,2),(10,3),(11,3),(12,3),(13,3),(14,3),(15,3),(16,3)]:
        r=E(pg,BAL,[levels(10**e),t,60])
        for u in USERS:
            f,l=r[u]; worst[u]=min(worst.get(u,1),f)
            if l in ('paper','pellets') and f<.95: bad.append((e,u,l,f))
            if l=='plywood' and f<.95: ply.append((e,u,f))
        ok(r['paper'][0]>.99 and r['pellet'][0]>.99, f'1e{e}: the Paper Mill and the Pellet Press are not short of chips ({r["paper"][0]:.2f}, {r["pellet"][0]:.2f})')
    ok(not bad, f'cost-balanced 1e8…1e16: no workshop waits on paper or pellets {bad[:4]} (worst feed {min(worst.values()):.2f})')
    ok(not ply, f'the extra paper does not bring the plywood wait back {ply[:4]}')
    # ---- equal levels ----
    eq={L:E(pg,EQ,L) for L in (50,60,80,100,150)}
    pu=['atelier','stationer','lab','parquet','toyshop']; wu=['parquet','cabinetry','toyshop','boatyard']
    ok(min(eq[50][u] for u in ('atelier','stationer','lab'))>=.75, f"equal levels, Lv 50: the paper users run at {eq[50]['stationer']:.2f} (0.40 in v2.56)")
    ok(all(eq[L][u]>=.9 for L in (60,80,100,150) for u in pu), f"equal levels, Lv 60–150: the paper users are fed ({[min(eq[L][u] for u in pu) for L in (60,80,100,150)]}; 0.44 in v2.56)")
    ok(all(eq[L][u]>=.9 for L in (60,80,100,150) for u in wu), f"equal levels, Lv 60–150: the plywood users stay fed ({[min(eq[L][u] for u in wu) for L in (60,80,100,150)]})")
    # ---- the opening is unchanged ----
    old=page(url=OLD); a=E(old,EARLY); old.context.close()
    new=page(); c=E(new,EARLY); new.context.close()
    ok(a[1:5]==c[1:5] and abs(a[0]-c[0])<=1e-9*max(1,a[0]) and a[5]==c[5], f'20 scripted minutes match the v2.56 snapshot (earned {c[0]:.4g}, Pellet Press Lv {c[5]})')
    # ---- by-products ----
    E(pg,MID); E(pg,QUIET); E(pg,RUN,30)
    r=E(pg,r'''()=>{S.autosell.bark=false;S.res.bark=stockCaps().bark;for(let t=0;t<120;t++){S.res.logs=1e30;tick(.25,false);}
      return {peeler:bstat.peeler.f,full:bstat.peeler.full||'',furn:bstat.furniture.f,ply:bstat.plymill.f,bark:S.res.bark,cap:stockCaps().bark};}''')
    ok(r['peeler']>.99 and r['full']=='' and r['furn']>.9 and r['ply']>.9, f'a full bark store no longer stops the Peeler, the Furniture Factory or the Plywood Mill ({r["peeler"]:.2f}, {r["furn"]:.2f}, {r["ply"]:.2f})')
    ok(r['bark']<=r['cap']*(1+1e-9), 'bark never goes over its store')
    r=E(pg,r'''()=>{S.autosell.bark=true;S.autosell.chips=false;S.buildings.pellet.on=false;S.buildings.paper.on=false;S.res.chips=stockCaps().chips;for(let t=0;t<120;t++){S.res.logs=1e30;tick(.25,false);}
      return {saw:bstat.beamsaw.f,full:bstat.beamsaw.full||'',glulam:bstat.glulam.f,chipper:bstat.chipper.f,cfull:bstat.chipper.full||'',chips:S.res.chips,cap:stockCaps().chips};}''')
    ok(r['saw']>.99 and r['full']=='' and r['glulam']>.9, f'a full chip store no longer stops the Beam Saw or the Glulam Plant ({r["saw"]:.2f}, {r["glulam"]:.2f})')
    ok(r['chipper']<.01 and r['cfull']=='chips', 'the Wood Chipper still pauses on a full chip store (chips are its product)')
    ok(r['chips']<=r['cap']*(1+1e-9), 'chips never go over their store')
    r=E(pg,r'''()=>{S.autosell.chips=true;S.autosell.veneer=false;S.buildings.furniture.on=false;S.buildings.plymill.on=false;S.res.veneer=stockCaps().veneer;for(let t=0;t<40;t++){S.res.logs=1e30;tick(.25,false);}
      return {peeler:bstat.peeler.f,full:bstat.peeler.full||''};}''')
    ok(r['peeler']<.01 and r['full']=='veneer', 'the Peeler still pauses on a full veneer store')
    # ---- advisor: an export that starves the workshops ----
    E(pg,MID); E(pg,QUIET); E(pg,RUN,40)
    a0=E(pg,r'''()=>({fs:[bstat.showroom.fs,bstat.cabinetry.fs],list:advList(true).filter(e=>e.k==='chairs').length,pri:PRI_RATE.chairs||0,ex:advExport('chairs')})''')
    ok(min(a0['fs'])>.95 and a0['list']==0 and a0['ex'] is None, f'without exports the Showroom and Cabinets are fed and nobody waits on chairs ({a0["fs"][0]:.2f}, {a0["fs"][1]:.2f})')
    E(pg,r'''()=>{const c=CITIES.find(c=>c.mode==='ship'),t=CITIES.find(c=>c.mode==='train');dispatch(c.id,'chairs',true);dispatch(t.id,'chairs',true);for(const v of S.trade.fleet) v.cap=1e30;}''')
    E(pg,RUN,40)
    a1=E(pg,r'''()=>{const e=advList(true).find(e=>e.k==='chairs'),f=advFix('chairs');return {fs:[bstat.showroom.fs,bstat.cabinetry.fs],p:rates.chairs.p,d:rates.chairs.d,pri:PRI_RATE.chairs,gap:advGap('chairs'),
      kind:f&&f.kind,id:f&&f.id,label:f&&f.label,row:e&&e.fix&&e.fix.label,users:e?e.users.map(u=>u.id).sort().join(','):'',hint:advHintHtml('showroom')};}''')
    ok(max(a1['fs'])<.6 and a1['p']>=a1['d'], f'two vessels loading chairs starve both workshops although Carpentry makes enough ({a1["fs"][0]:.2f}, {a1["fs"][1]:.2f}; makes {a1["p"]:.0f}/s, wanted {a1["d"]:.0f}/s)')
    ok(a1['pri']>.5*a1['gap']>0, f'PRI_RATE counts what the vessels take ahead of the workshops ({a1["pri"]:.0f}/s of a {a1["gap"]:.0f}/s gap)')
    ok(a1['kind']=='export' and a1['id']=='trade' and 'vessel' in a1['label'] and 'Upgrade' not in a1['label'], f'the advisor names the vessel, not "upgrade Carpentry" ({a1["label"]})')
    ok(a1['row']==a1['label'] and a1['users']=='cabinetry,showroom', 'the Supply Flow row lists both workshops under that fix')
    ok('80 %' in a1['hint'] and 'Depart' in a1['hint'] and 'data-adv="chairs"' in a1['hint'], 'the building sheet explains it and has the jump button')
    E(pg,'()=>{advRun("chairs");}'); paint(pg,2)
    ok(E(pg,'curSheet')=='rnd' and E(pg,'rndTab')=='trade', 'the button opens the Trade tab')
    pg.screenshot(path=shot_path('desktop-advisor-export.png'))
    E(pg,'()=>{closeSheet();openSheet("bld","showroom");}'); paint(pg,3)
    ok(E(pg,'!!document.querySelector("#bpShort .adv-why")&&/vessel/.test($("bpShort").textContent)'), 'the Showroom sheet shows the vessel line')
    pg.locator('#sheet').screenshot(path=shot_path('desktop-showroom-export.png')) if E(pg,'!!$("sheet")') else pg.screenshot(path=shot_path('desktop-showroom-export.png'))
    E(pg,'()=>{closeSheet();S.trade.fleet=[];}'); E(pg,RUN,60)
    a2=E(pg,r'''()=>({fs:[bstat.showroom.fs,bstat.cabinetry.fs],pri:PRI_RATE.chairs,ex:advExport('chairs')})''')
    ok(min(a2['fs'])>.95 and a2['pri']<1 and a2['ex'] is None, f'once the vessels are gone the workshops are fed and the rate falls back ({a2["pri"]:.3f}/s)')
    # a real shortage still says "upgrade"
    r=E(pg,r'''()=>{S.buildings.carpentry.lvl=10;M=computeMods();for(let t=0;t<160;t++){S.res.logs=1e30;tick(.25,false);}const f=advFix('chairs');return [f.kind,f.id,bstat.showroom.fs];}''')
    ok(r[0]=='upg' and r[1]=='carpentry' and r[2]<.6, f'with a small Carpentry and no exports the fix is still "upgrade Carpentry" ({r})')
    # a client order
    r=E(pg,r'''()=>{S.buildings.carpentry.lvl=70;M=computeMods();const O=ordNorm();O.acts.push({id:9e6,item:'chairs',amt:1e30,got:0,reward:1,t:1e9,ends:S.time+1e9,client:'Test',e:'🧪'});
      for(let t=0;t<160;t++){S.res.logs=1e30;tick(.25,false);}const f=advFix('chairs');const o=[f.kind,f.id,f.label,bstat.showroom.fs];
      dispatch(CITIES.find(c=>c.mode==='ship').id,'chairs',true);for(const v of S.trade.fleet) v.cap=1e30;for(let t=0;t<160;t++){S.res.logs=1e30;tick(.25,false);}
      const g=advFix('chairs');o.push(g.id,S.trade.fleet[0].got);O.acts.length=0;for(let t=0;t<160;t++){S.res.logs=1e30;tick(.25,false);}o.push(advFix('chairs').id);S.trade.fleet=[];return o;}''')
    ok(r[0]=='export' and r[1]=='orders' and r[3]<.6, f'a client order that takes the chairs is named too ({r[2]})')
    ok(r[4]=='orders' and r[6]=='trade', f'with an order and a vessel on the same good the order is named (it is served first and uses the shared budget); the vessel is named once the order is gone ({r[4]} → {r[6]})')
    # ---- text ----
    ok(E(pg,'RNMAP.tar.d')=='Charcoal Kilns also distil glue (0.7 per charcoal)' and E(pg,'TAR_GLUE')==.7, 'the Pine Tar Glue node says 0.7 per charcoal, the real rate')
    # ---- building sheet ----
    E(pg,MID); E(pg,QUIET); E(pg,RUN,5)
    E(pg,'()=>openSheet("bld","paper")'); paint(pg,3)
    t=E(pg,'$("bpIo").textContent')
    ok('Paper yield ×2.00' in t and 'Lv 51: ×2.04' in t, 'the Paper Mill sheet shows "Paper yield ×2.00" and the next level')
    pg.screenshot(path=shot_path('desktop-paper-yield.png'))
    E(pg,'()=>openSheet("bld","pellet")'); paint(pg,3)
    t=E(pg,'$("bpIo").textContent')
    ok('Pellet yield ×1.50' in t, 'the Pellet Press sheet shows "Pellet yield ×1.50"')
    E(pg,'()=>{closeSheet();S.buildings.paper.lvl=10;openSheet("bld","paper");}'); paint(pg,3)
    ok('Paper yield' not in E(pg,'$("bpIo").textContent'), 'a Lv 10 Paper Mill shows no yield line yet')
    E(pg,'()=>{closeSheet();S.buildings.paper.lvl=18;openSheet("bld","paper");}'); paint(pg,3)
    ok('grows from Lv 25' in E(pg,'$("bpIo").textContent'), 'from Lv 15 it says the yield grows from Lv 25')
    E(pg,'closeSheet()')
    # ---- saves ----
    r=E(pg,r'''()=>{const s=freshState();s.version='2.56';s.buildings.paper.lvl=60;s.buildings.pellet.lvl=60;s.res.bark=5;const o=migrateSave(JSON.parse(JSON.stringify(s)));return [o.buildings.paper.lvl,o.buildings.pellet.lvl,o.res.bark];}''')
    ok(r==[60,60,5], 'a v2.56 save loads with its levels and stock')
    # ---- phone ----
    ph=page('iPhone 13'); E(ph,MID); E(ph,QUIET); E(ph,RUN,40)
    E(ph,r'''()=>{const c=CITIES.find(c=>c.mode==='ship'),t=CITIES.find(c=>c.mode==='train');dispatch(c.id,'chairs',true);dispatch(t.id,'chairs',true);for(const v of S.trade.fleet) v.cap=1e30;}'''); E(ph,RUN,40)
    E(ph,'()=>openSheet("bld","showroom")'); paint(ph,3)
    box=E(ph,r'''()=>{const b=document.querySelector('#bpShort .adv-go');if(!b) return null;const r=b.getBoundingClientRect();return [r.left,r.right,innerWidth,b.textContent];}''')
    ok(bool(box) and box[0]>=0 and box[1]<=box[2] and 'vessel' in box[3], f'on a phone the Showroom sheet has the vessel button inside the screen ({box})')
    ph.screenshot(path=shot_path('mobile-showroom-export.png'))
    ph.context.close()
    ok(not errs, 'no console errors '+str(errs[:4]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -', f)
sys.exit(1 if FAILS else 0)
