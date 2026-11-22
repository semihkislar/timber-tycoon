# v2.59: phase foremen. A trained hire can run one phase column (+5% speed at skill 5,
# +10% at skill 10, capped). One per phase. The price is the sticker times forest value,
# and after a Replant at least 40 s of income. The first minutes of a fresh run match v2.58.
# Foremen stay with the staff on Replant. Logs stay unsellable.
from playwright.sync_api import sync_playwright
import os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, BASE, ROOT, ver
from _pace import ready, paint, touch_at
from shots import shot_path
FAILS=[]
FM_BASE=80000
def fm_name_ok(r):
    return r.get('one') in ('Baris Kilic','Ada Berg')
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js, arg=None):
    js=js.strip()
    if js.startswith('()=>') or js.startswith('() =>'):
        js='('+js+')()'
    return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def near(a, b, rel=1e-6, abs_=1e-6):
    return abs(a-b)<=abs_+rel*max(abs(a), abs(b), 1)
OLD=BASE+'releases/v2.58/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=256;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;S.orders.offers=[];S.orders.acts=[];}if(S.mish)S.mish.next=1e15;S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx){S.wx.w="clear";S.wx.next=1e15;}if(typeof ntClear==="function")ntClear();window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll(".toast,.modal-bg").forEach(e=>e.remove());}'''
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
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,canSell("logs"),S.res.logs>0];})()'''
HIRE=r'''((o)=>{const st=staffState();st.seq=(st.seq||0)+1;const w={id:"w"+st.seq,name:o.name||"Ada Berg",role:o.role||"mill",skill:o.skill||5,rarity:o.rarity||"R",traits:o.traits||["steady"],assign:o.assign||null,energy:100,brk:false,founding:!!o.founding,train:null,look:STAFF_LOOKS[0],fm:0};st.team.push(w);M=computeMods();return w.id;})'''
GOODS=["planks","chips","veneer","beams","chairs","pellets","paper","furniture","glulam","plywood","panels","houses"]
def shot_clean(pg):
    E(pg, QUIET)
    E(pg, r'''()=>{if(typeof checkAch==="function")checkAch(true);if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.confetti,.modal-bg").forEach(e=>e.remove());const f=document.getElementById("fxLayer");if(f)f.innerHTML="";if(scene.particles)scene.particles.length=0;}''')
    paint(pg, 2)
def tap(pg, sel):
    loc=pg.locator(sel).first
    try:
        loc.scroll_into_view_if_needed(timeout=4000)
        loc.tap(timeout=4000)
        return True
    except Exception:
        box=loc.bounding_box()
        if not box: return False
        touch_at(pg, box['x']+box['width']/2, box['y']+box['height']/2)
        return True
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR, url=URL):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport={'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,59), f"VERSION is 2.59 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    m=re.search(r"timber-tycoon-v([\d.]+)", sw)
    ok(m and ver(m.group(1))>=(2,59), 'service-worker cache is timber-tycoon-v2.59 or newer')
    ok('js/foremen.js' in open(os.path.join(ROOT,'index.html'), encoding='utf-8').read(), 'foremen.js is in the bundle list')
    ok(E(pg,'canSell("logs")') is False and E(pg,'fmOpen()') is False and E(pg,'fmCount()')==0, 'a fresh run has no foreman and the career is still closed')
    # ---- rules ----
    r=E(pg, r'''()=>{const o=[];
      S.buildings.sawmill.lvl=20; S.buildings.carpentry.lvl=9; M=computeMods();
      const id='''+HIRE+r'''({skill:10,name:"Ada Berg"});
      S.coins=1e12; o.push(fmOpen()); o.push(fmPromote(id,1));
      S.buildings.sawmill.lvl=25; o.push(fmOpen()); o.push(fmPromote(id,1));
      o.push(fmOf(1)&&fmOf(1).id); o.push(fmPhase(fmOf(1)));
      const id2='''+HIRE+r'''({skill:10,name:"Baris Kilic",role:"engineer"});
      o.push(fmPromote(id2,1));
      o.push(Math.abs(S.coins-(1e12-fmCost(1)))<1);
      fmDemote(id); o.push(fmOf(1)); o.push(fmPromote(id2,1)); o.push(!!fmOf(1)&&fmOf(1).name);
      const low='''+HIRE+r'''({skill:4,name:"Cemre Arslan"}); o.push(fmPromote(low,2));
      S.mgr.emre=4; staffMigrateFromMgr(); const f=staffState().team.find(w=>w.founding); o.push(f?fmPromote(f.id,2):"nof");
      S.buildings.carpentry.lvl=10; o.push(fmPhaseBuilt(2));
      fmDemote(id2); o.push(fmOf(1)==null);
      const c0=S.coins; o.push(fmPromote(id,2)); o.push(Math.abs(c0-S.coins-fmCost(2))<1); o.push(fmOf(1)); o.push(fmOf(2)&&fmOf(2).id===id);
      o.push(fmAura("sawmill")); o.push(fmAura("carpentry")); o.push(fmAura("lab")); o.push(canSell("logs"));
      return o;}''')
    ok(r[0] is False and r[1] is False, f'closed before Sawmill Lv 25 and before a Phase 2 line at Lv 10 ({r[0]}, {r[1]})')
    ok(r[2] is True and r[3] is True and r[5]==1 and bool(r[4]), f'a skill-10 hire becomes the Phase 1 foreman ({r[3:6]})')
    ok(r[6] is False and r[7] is True, f'a second hire cannot take an occupied phase, and the price is paid once ({r[6]}, {r[7]})')
    ok(r[8] is None and r[9] is True and r[10]=='Baris Kilic', f'demote frees the phase ({r[8:11]})')
    ok(r[11] is False and r[12] is False, f'skill 4 and a founding manager cannot take a column ({r[11]}, {r[12]})')
    ok(r[13] is True and r[14] is True and r[15] is True and r[16] is True and r[17] is None and r[18] is True, f'moving Ada to Phase 2 pays that price and leaves Phase 1 empty')
    ok(abs(r[19]-1)<1e-12 and r[20]>1 and r[21]==1 and r[22] is False, f'the aura is on that phase only, and the lab and logs are untouched ({r[19:23]})')
    # aura curve and cap, and it multiplies managers, workstations and research
    r=E(pg, r'''()=>{const w=fmOf(2); const out=[];
      for(const sk of [5,6,7,8,10,99]){w.skill=sk; out.push(+fmAura("carpentry").toFixed(4));}
      w.skill=10; w.fm=2;
      const other=staffState().team.find(x=>x.name==="Baris Kilic"); other.skill=10; other.fm=2;
      const doubled=fmAura("carpentry");
      fmNorm(S);
      const kept=fmOf(2)&&fmOf(2).name, n2=staffState().team.filter(w=>w.fm===2).length;
      S.research={science:1,blades:1}; S.mgr.emre=4; S.ws.sawmill=[10,10,10]; S.buildings.sawmill.lvl=40;
      for(const w of staffState().team){w.fm=0; w.assign=null;}
      M=computeMods();
      const ada=staffState().team.find(x=>x.name==="Ada Berg"); ada.skill=10; ada.role="mill"; ada.assign="sawmill";
      M=computeMods();
      const mill=staffMillSpd("sawmill"), withMill=bSpeed("sawmill");
      ada.assign=null; M=computeMods();
      const bare=bSpeed("sawmill");
      ada.fm=1; M=computeMods();
      const aura=bSpeed("sawmill");
      return {curve:out, doubled, kept, n2, mill, ratio:aura/bare, dropped:aura/withMill, mgr:mgrSpd("sawmill"), ws:wsSpd("sawmill"), res:bRes("sawmill"), station:staffMillSpd("sawmill")};}''')
    want=[1.05,1.06,1.07,1.08,1.10,1.10]
    ok(all(abs(a-b)<1e-9 for a,b in zip(r['curve'], want)), f"skill 5 is +5%, skill 10 is +10%, and a higher skill stays at the cap ({r['curve']})")
    ok(abs(r['doubled']-1.1)<1e-9 and r['n2']==1 and fm_name_ok({'one':r['kept']}), f"two workers marked for one phase still give one aura, and a repair keeps {r['kept']}")
    ok(r['mill']>1 and r['station']==1 and r['mgr']>1 and r['ws']>1 and r['res']>1 and abs(r['ratio']-1.1)<1e-9 and r['dropped']<1, f"the aura is ×{r['ratio']:.4f} on top of managers ({r['mgr']:.2f}), the master set ({r['ws']:.2f}) and research ({r['res']:.2f}); the old station bonus ({r['mill']:.2f}) stops")
    # ---- price ×1 / ×50 / ×675 ----
    r=E(pg, r'''()=>{const out={};
      function row(cs, inc){S.runCS=cs; coinRate=inc; if(S.run){S.run.inc=0;S.run.incE=0;} M=computeMods();
        return [1,2,3].map(ph=>fmCost(ph));}
      out.x1=row(1, 1e9);
      out.x50base=row(50, 0);
      out.x50inc=row(50, 1e6);
      out.x675base=row(675, 0);
      out.x675inc=row(675, 5e6);
      S.runCS=1; coinRate=0; if(S.run){S.run.inc=0;S.run.incE=0;}
      return out;}''')
    ok(all(near(a, FM_BASE*(1 if ph==1 else 1.5 if ph==2 else 2)) for ph,a in zip((1,2,3), r['x1'])), f"×1 pays the sticker even at a huge income ({r['x1']})")
    ok(all(near(a, b*50) for a,b in zip(r['x50base'], r['x1'])) and all(near(a, 40*1e6) for a in r['x50inc']), f"×50 uses forest value when income is quiet, and 40 s of income when that is larger ({r['x50base']}, {r['x50inc']})")
    ok(all(near(a, b*675) for a,b in zip(r['x675base'], r['x1'])) and all(near(a, 40*5e6) for a in r['x675inc']), f"×675 follows the same rule ({r['x675base'][0]:.4g} sticker side, {r['x675inc'][0]:.4g} income side)")
    # ---- balance: full-speed made/need, then a steady run so a later phase is not starved ----
    bal=E(pg, r'''()=>{function clearFm(){for(const w of staffState().team) w.fm=0; M=computeMods();}
      S.coins=1e18; S.premium.lvl=1; S.runCS=1; coinRate=0; if(S.run){S.run.inc=0;S.run.incE=0;}
      S.research={}; S.mgr={}; S.ws={}; if(S.logi){S.logi.fk=0;S.logi.belt={};S.logi.drone=0;} if(S.power)S.power.lvl=0;
      for(const b of BUILDINGS){S.buildings[b.id].lvl=b.premium||b.tech?16:28; S.buildings[b.id].on=true;}
      S.buildings.lab.lvl=8; for(const c of COLLECTORS) S.collectors[c.id]=80;
      for(const k in S.autosell) S.autosell[k]=true;
      clearFm(); M=computeMods();
      const base=fmBalance();
      function put(ph, skill){let w=staffState().team.find(x=>!x.founding&&!x.fm&&x.skill>=5); if(!w){const id='''+HIRE+r'''({skill:skill,name:"Foreman "+ph,role:"driver"}); w=staffState().team.find(x=>x.id===id);} w.skill=skill; w.fm=ph; w.assign=null;}
      put(1,10); M=computeMods(); const p1=fmBalance();
      clearFm(); put(2,10); M=computeMods(); const p2=fmBalance();
      clearFm(); put(1,10); put(2,10); put(3,10); M=computeMods(); const all=fmBalance();
      const keys='''+json.dumps(GOODS)+r''';
      function pack(g){const o={}; for(const k of keys){const x=g[k]||{made:0,need:0,r:null}; o[k]={m:+x.made.toPrecision(4), n:+(x.need||0).toPrecision(4), r:x.r==null?null:+x.r.toPrecision(4)};} return o;}
      function fed(){for(const k in S.res) if(k!=="logs") S.res[k]=0; S.res.logs=1e12; S.forest.m=1e9;
        for(let i=0;i<50;i++){S.res.logs=1e12;S.forest.m=1e9;tick(.5,false);} const f={};
        for(const b of BUILDINGS) if(S.buildings[b.id].lvl) f[b.id]=+((bstat[b.id]&&bstat[b.id].f)||0).toFixed(3); return f;}
      clearFm(); M=computeMods(); const f0=fed();
      put(1,10); M=computeMods(); const f1=fed();
      clearFm(); put(2,10); M=computeMods(); const f2=fed();
      clearFm(); M=computeMods();
      return {base:pack(base), p1:pack(p1), p2:pack(p2), all:pack(all), f0, f1, f2, logs:canSell("logs")};}''')
    print('   made/need with no foreman:', {k:(bal['base'][k]['m'], bal['base'][k]['n'], bal['base'][k]['r']) for k in GOODS})
    print('   Phase 1 foreman +10%:', {k:(bal['p1'][k]['m'], bal['p1'][k]['n'], bal['p1'][k]['r']) for k in ('planks','chips','veneer','chairs','paper','plywood')})
    print('   Phase 2 foreman +10%:', {k:(bal['p2'][k]['m'], bal['p2'][k]['n'], bal['p2'][k]['r']) for k in ('planks','chairs','paper','plywood','houses')})
    print('   all three +10%:', {k:bal['all'][k]['r'] for k in GOODS})
    worse=[]
    for k in GOODS:
        a,c=bal['base'][k], bal['p1'][k]
        if c['m']+1e-6<a['m']*0.99: worse.append(k+' made')
        if a['r'] and c['r'] and c['r']+1e-6<a['r']*0.99: worse.append(k+' ratio')
    ok(not worse and bal['logs'] is False, f'a Phase 1 foreman does not cut any later good ({worse})')
    down=[]
    for bid,fv in bal['f0'].items():
        t=E(pg, f'BTIER[{bid!r}]') if False else None
    phase=E(pg, 'Object.fromEntries(BUILDINGS.map(b=>[b.id,BTIER[b.id]||0]))')
    for bid,fv in bal['f2'].items():
        if phase.get(bid)==3 and fv+0.02<bal['f0'].get(bid,0): down.append(f'{bid}:{bal["f0"][bid]:.2f}→{fv:.2f}')
    for bid,fv in bal['f1'].items():
        if phase.get(bid) in (2,3) and fv+0.02<bal['f0'].get(bid,0): down.append(f'p1 {bid}:{bal["f0"][bid]:.2f}→{fv:.2f}')
    ok(not down, f'steady run: a foreman does not leave the next phase less fed ({down})')
    flat=[]
    for k in GOODS:
        a,c=bal['base'][k]['r'], bal['all'][k]['r']
        if a and c and abs(c-a)/max(a,1e-6)>0.04: flat.append(f'{k}:{a:.3f}→{c:.3f}')
    ok(not flat, f'with a foreman on every phase, made/need stays within 4% ({flat})')
    # greedy factory, then the same comparison
    SIM=open(os.path.join(ROOT,'test','sim_v218.js'), encoding='utf-8').read()
    E(pg, 'window.mishTick=()=>{};window.fireTick=fireTick=()=>{}')
    hook='{want:()=>false,gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>false,spend:()=>{},hold:()=>false}'
    G=E(pg, '(%s)(%s)'%(SIM, json.dumps({'runs':1,'maxMin':12,'hook':hook})))
    gb=E(pg, r'''()=>{M=computeMods(); const before=fmBalance();
      function put(ph){const st=staffState(); st.seq++; const w={id:"g"+ph,name:"Greedy "+ph,role:"driver",skill:10,rarity:"R",traits:["steady"],assign:null,energy:100,founding:false,train:null,look:STAFF_LOOKS[0],fm:ph}; st.team.push(w);}
      if(S.buildings.sawmill.lvl) put(1);
      if(BUILDINGS.some(b=>BTIER[b.id]===2&&S.buildings[b.id].lvl)) put(2);
      if(S.premium.lvl&&BUILDINGS.some(b=>BTIER[b.id]===3&&S.buildings[b.id].lvl)) put(3);
      M=computeMods(); const after=fmBalance();
      const keys=["planks","chips","veneer","chairs","paper","plywood"];
      const row=g=>{const o={}; for(const k of keys){const x=g[k]||{made:0,need:0,r:null}; o[k]={m:x.made,n:x.need,r:x.r};} return o;};
      return {min:'''+str(0)+r''', saw:S.buildings.sawmill.lvl, before:row(before), after:row(after), n:fmCount(), logs:canSell("logs")};}''')
    print(f"   greedy {G[0]['min']} min, Sawmill Lv {gb['saw']}, foremen {gb['n']}")
    print('   greedy made/need before:', {k:(round(gb['before'][k]['m'],1), round(gb['before'][k]['n'],1), None if gb['before'][k]['r'] is None else round(gb['before'][k]['r'],3)) for k in gb['before']})
    print('   greedy made/need after:', {k:(round(gb['after'][k]['m'],1), round(gb['after'][k]['n'],1), None if gb['after'][k]['r'] is None else round(gb['after'][k]['r'],3)) for k in gb['after']})
    ok(G and G[0]['min']>=10 and gb['logs'] is False, f"greedy run built a factory ({G[0]['min']} min) and logs stayed unsold")
    # ---- replant keeps the foreman with the staff ----
    r=E(pg, r'''()=>{for(const w of staffState().team) w.fm=0;
      S.buildings.sawmill.lvl=Math.max(25,S.buildings.sawmill.lvl); S.coins=1e15; S.totalEarned=Math.max(S.totalEarned,1e8); M=computeMods();
      const id='''+HIRE+r'''({skill:8,name:"Nora Lind",role:"mill",assign:"sawmill"});
      const paid=fmPromote(id,1), w=fmOf(1);
      const sp=fmAura("sawmill");
      doPrestige();
      const kept=staffState().team.find(x=>x.name==="Nora Lind");
      return {paid, fm:kept&&kept.fm, saw:S.buildings.sawmill.lvl, aura:fmAura("sawmill"), sp, pres:S.prestiges, logs:canSell("logs"), open:fmOpen()};}''')
    ok(r['paid'] and r['fm']==1 and r['saw']==0 and abs(r['aura']-r['sp'])<1e-9 and r['pres']>=1 and r['logs'] is False and r['open'] is True, f"Replant keeps the foreman and clears the buildings ({r})")
    # ---- offline ----
    r=E(pg, r'''()=>{S.coins=0; S.runCS=1; for(const w of staffState().team) w.fm=0;
      for(const b of BUILDINGS) S.buildings[b.id].lvl=0;
      S.buildings.sawmill.lvl=12; S.buildings.sawmill.on=true; S.autosell.planks=true; S.res.logs=1e9; S.res.planks=0; S.forest.m=1e9; M=computeMods();
      const a=simulateOffline(40);
      S.coins=1e12; S.buildings.sawmill.lvl=12; const id='''+HIRE+r'''({skill:10,name:"Offline Boss",role:"driver"});
      if(!fmPromote(id,1)) return {a:a.coins,c:0,logs:-1,can:canSell("logs"),ok:false,why:"promote"};
      S.res.logs=1e9; S.res.planks=0; S.coins=0; const c=simulateOffline(40);
      return {a:a.coins, c:c.coins, logs:a.s.logs+c.s.logs, can:canSell("logs"), ok:isFinite(a.coins)&&isFinite(c.coins)};}''')
    ok(r['ok'] and r['c']>r['a']*1.04 and r['c']<r['a']*1.16 and r['logs']==0 and r['can'] is False, f"offline, the aura pays about +10% and no logs are sold ({r['a']:.4g} → {r['c']:.4g})")
    # ---- world: column, cached tag, Low draws none, phone fit hides it ----
    r=E(pg, r'''()=>{gfxSet("high"); S.coins=1e15; S.buildings.sawmill.lvl=30; S.buildings.chipper.lvl=10; S.buildings.carpentry.lvl=12;
      staffState().team=staffState().team.filter(w=>w.founding); const id='''+HIRE+r'''({skill:10,name:"Willa Frost",role:"mill"}); fmPromote(id,1);
      SW.sig=""; swSync(); for(let i=0;i<8;i++) swUpdate(0.4);
      const a=SW.list.find(x=>x.w&&x.w.name==="Willa Frost");
      const spot=fmSpots(1)[0];
      const dist=a?Math.hypot(a.i-spot[0], a.j-spot[1]):99;
      const nearCol=fmSpots(1).some(p=>Math.hypot(a.i-p[0], a.j-p[1])<1.2);
      const L=LOTS.sawmill; const onLot=a && a.i>L.ci-2.2 && a.i<L.ci+2.2 && a.j>L.cj-2.2 && a.j<L.cj+2.2;
      gfxSet("low"); const lowHat=swLook(a.w).hatc;
      gfxSet("high"); const hiHat=swLook(a.w).hatc;
      const cam=scene.cam; const p=P(a.i,a.j,0); cam.fly=null; cam.x=cam.tx=p[0]; cam.y=cam.ty=p[1]; cam.z=cam.tz=Math.min(cam.maxZ, Math.max(cam.fitZ*2.2, 1.2));
      FM.drawn=0; for(let i=0;i<6;i++) stepScene(1/30); const drawn=FM.drawn;
      let calls=0; const raw=pillRaw; pillRaw=function(){calls++; return raw.apply(this,arguments);};
      for(let i=0;i<4;i++) stepScene(1/30); const warm=calls; calls=0; FM.drawn=0;
      for(let i=0;i<12;i++) stepScene(1/30); const redraws=calls, tags=FM.drawn; pillRaw=raw;
      gfxSet("low"); FM.drawn=0; for(let i=0;i<8;i++) stepScene(1/30); const low=FM.drawn; gfxSet("high");
      return {dist, nearCol, onLot, lowHat, hiHat, drawn, warm, redraws, tags, low, n:SW.list.filter(x=>x.w&&x.w.fm).length};}''')
    ok(r['nearCol'] and not r['onLot'] and r['n']==1, f"the foreman stands on the Phase 1 column, outside the building ({r['dist']:.2f} from the first door, on the lot {r['onLot']})")
    ok(r['hiHat']=='#f2d21a' and r['lowHat']!='#f2d21a', f"High uses the yellow hard hat, Low keeps the ordinary colours ({r['hiHat']}, {r['lowHat']})")
    ok(r['drawn']>0 and r['redraws']==0 and r['tags']>0, f"the name tag is a cached pill ({r['redraws']} redraws, {r['tags']} tags)")
    ok(r['low']==0, f"Low draws no name tag ({r['low']})")
    # frame cost: tags on vs tags off, short paired blocks
    r=E(pg, r'''()=>{const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
      const real=fmTagsDraw; let hide=false;
      window.fmTagsDraw=fmTagsDraw=function(){if(!hide) return real.apply(this,arguments);};
      try{gfxSet("high"); for(let k=0;k<40;k++) stepScene(1/30);
        const diffs=[], bases=[];
        for(let p=0;p<9;p++){const order=p%2?[false,true]:[true,false]; const got={};
          for(const h of order){hide=h; const a=[];
            for(let i=0;i<10;i++){const t0=performance.now(); stepScene(1/30); const ms=performance.now()-t0; if(i>=3) a.push(ms);}
            got[h?'z':'d']=med(a);}
          diffs.push(got.d-got.z); bases.push(got.z);}
        const z=med(bases); return [z, z+med(diffs)];
      }finally{hide=false; window.fmTagsDraw=fmTagsDraw=real;}}''')
    ok(r[1]<=r[0]*1.2+1.0, f'flat frame cost: {r[0]:.2f} ms without the tag → {r[1]:.2f} ms with it')
    # ---- saves ----
    pg.close()
    for ver_s, lvl in (('2.58',12),('2.57',12),('2.55',8),('2.39',6),('2.24',2)):
        raw=json.dumps(json.dumps({'version':ver_s,'coins':22000,'legacy':0,'upgrades':{'sharp':1},'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':30,'planks':8}}))
        pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
        r=E(pg, r'''()=>{let s=0;for(let k=0;k<4;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell("logs"),fm:fmCount(),ok:isFinite(S.coins)&&s>0};}''')
        ok(r['ok'] and ver(r['v'])>=(2,59) and r['saw']==lvl and r['logs'] is False and r['fm']==0, f"{ver_s} save loads (saw {r['saw']})")
        pg.close()
    dmg=json.dumps(json.dumps({'version':'2.58','coins':9000,'buildings':{'sawmill':{'lvl':'x','on':True}},'res':{'logs':-3,'planks':'no'},
        'staff':{'team':[
            {'id':'w1','name':'Bad','role':'mill','skill':1,'fm':'boss'},
            {'id':'w2','name':'Kept','role':'mill','skill':8,'fm':1,'traits':['steady']},
            {'id':'w3','name':'Extra','role':'engineer','skill':9,'fm':1},
            {'id':'w4','name':'Boss','role':'mill','skill':6,'fm':2,'founding':True}],
            'candidates':'no','seq':'x'}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg, r'''()=>{const t=staffState().team; const fms=t.map(w=>[w.name,w.fm,!!w.founding]);
      let s=0; for(let k=0;k<3;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}
      return {fms, saw:S.buildings.sawmill.lvl, logs:canSell("logs"), ok:isFinite(S.coins)&&isFinite(fmAura("sawmill"))&&s>0, aura:fmAura("sawmill")};}''')
    ok(r['ok'] and r['logs'] is False and r['saw']==0 and r['aura']>1 and any(x[0]=='Kept' and x[1]==1 for x in r['fms']) and not any(x[0]=='Extra' and x[1]==1 for x in r['fms']) and not any(x[0]=='Boss' and x[1] for x in r['fms']) and not any(x[0]=='Bad' and x[1] for x in r['fms']), f"a damaged save repairs to one trained foreman ({r['fms']}, aura {r['aura']})")
    # ---- early game vs v2.58 ----
    pg.close(); pg=page(); e_new=E(pg, EARLY); pg.close()
    pg=page(url=OLD); e_old=E(pg, EARLY); pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and near(e_new[0], e_old[0], 1e-6), f"opening script matches v2.58 ({e_new[0]:.4f} vs {e_old[0]:.4f})")
    # ---- desktop mouse ----
    pg=page(); E(pg, QUIET)
    E(pg, r'''()=>{S.coins=1e12; S.buildings.sawmill.lvl=30; S.buildings.chipper.lvl=8; S.buildings.carpentry.lvl=12; S.buildings.pellet.lvl=8;
      '''+HIRE+r'''({skill:8,name:"Ada Berg",role:"mill"}); M=computeMods(); TT.render();}''')
    paint(pg, 2)
    pg.locator('#bbStaff').click(); paint(pg, 2)
    ok(E(pg,'TT.curSheet')=='staff', 'desktop click opens the staff sheet')
    pg.locator('[data-fmp]').click(); paint(pg, 1)
    pg.locator('[data-fmg][data-ph="1"]').click(); paint(pg, 2)
    ok(E(pg,'fmOf(1)&&fmOf(1).name')=='Ada Berg', 'desktop click promotes a Phase 1 foreman')
    txt=E(pg, r'''()=>{openSheet("bld","sawmill"); TT.render(); return document.getElementById("bpFm")&&document.getElementById("bpFm").innerText;}''')
    ok(txt and 'Ada Berg' in txt and 'Phase' in txt, f'building sheet names the foreman ({txt})')
    flow=E(pg, r'''()=>{closeSheet(); toggleFlow(true); TT.render(); const e=document.querySelector("#flowLegend .fm-flow"); return e?e.innerText:"";}''')
    ok(flow and 'Ada' in flow and '%' in flow, f'Supply Flow names the foreman ({flow})')
    E(pg, 'closeSheet(); toggleFlow(false);')
    # shots
    E(pg, r'''()=>{S.coins=1e15; for(const id of ["sawmill","chipper","kiln","peeler","beamsaw","carpentry","pellet","paper","furniture","glulam"]) if(S.buildings[id]) S.buildings[id].lvl=Math.max(18,S.buildings[id].lvl);
      S.premium.lvl=1; if(S.buildings.framer) S.buildings.framer.lvl=8; S.collectors.lumberjack=12;
      const w=fmOf(1); if(w){w.energy=100; w.brk=false;} SW.sig=""; swSync();
      for(let i=0;i<10;i++) swUpdate(0.35);
      const a=SW.list.find(x=>x.w&&x.w.fm===1); const c=scene.cam; const p=P(a?a.i:12, a?a.j:8, 0);
      c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]-30; c.z=c.tz=Math.min(c.maxZ, Math.max(c.fitZ*2.4, 1.3));
      gfxSet("high"); TT.setClock&&TT.setClock(10*60); S.wx.w="clear"; TT.render();}''')
    paint(pg, 4); shot_clean(pg)
    pg.screenshot(path=shot_path('foreman.png'))
    E(pg, r'''()=>{fitCamera(true); TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop.png'))
    ok(os.path.getsize(shot_path('foreman.png'))>8000 and os.path.getsize(shot_path('desktop.png'))>8000, 'desktop and foreman shots were written')
    pg.close()
    # ---- phones ----
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg, QUIET)
        E(pg, r'''()=>{S.coins=1e12; S.buildings.sawmill.lvl=30; for(const b of BUILDINGS){if(!S.buildings[b.id].lvl) S.buildings[b.id].lvl=1;}
          S.premium.lvl=1; const id='''+HIRE+r'''({skill:9,name:"Pia Schulz",role:"driver"}); fmPromote(id,1); M=computeMods();
          gfxSet("high"); fitCamera(true); TT.render();}''')
        paint(pg, 2)
        calm=E(pg, r'''()=>{SW.sig=""; swSync(); for(let i=0;i<6;i++){swUpdate(0.3); stepScene(1/30);} FM.drawn=0; stepScene(1/30); return {dc:dcOn(), drawn:FM.drawn, z:scene.cam.z, fit:scene.cam.fitZ};}''')
        ok(calm['dc'] is True and calm['drawn']==0, f'{dev}: the name tag hides at the fit zoom ({calm})')
        E(pg, r'''()=>{const c=scene.cam; c.z=c.tz=Math.min(c.maxZ, c.fitZ*2.2); const a=SW.list.find(x=>x.w&&x.w.fm); if(a){const p=P(a.i,a.j,0); c.x=c.tx=p[0]; c.y=c.ty=p[1];} FM.drawn=0; for(let i=0;i<4;i++) stepScene(1/30); return FM.drawn;}''')
        shown=E(pg,'FM.drawn')
        ok(shown>0 and E(pg,'dcOn()') is False, f'{dev}: zooming in brings the name tag back ({shown})')
        E(pg, r'''()=>{const w=fmOf(1); if(w) fmDemote(w.id); closeSheet(); TT.render();}''')
        paint(pg, 1)
        tap(pg, '#bbMore'); paint(pg, 2)
        if E(pg,'TT.curSheet')!='more':
            tap(pg, '#bbMore'); paint(pg, 2)
        ok(E(pg,'TT.curSheet')=='more', f'{dev}: touch opens More')
        E(pg, "if(TT.setSheetState)TT.setSheetState('full')"); paint(pg, 1)
        tap(pg, '#moreGrid [data-s="staff"]'); paint(pg, 2)
        if E(pg,'TT.curSheet')!='staff':
            tap(pg, '#moreGrid [data-s="staff"]'); paint(pg, 2)
        ok(E(pg,'TT.curSheet')=='staff', f'{dev}: touch opens Staff')
        E(pg, "if(TT.setSheetState)TT.setSheetState('full'); document.querySelector('[data-fmp]')&&document.querySelector('[data-fmp]').scrollIntoView({block:'center'});")
        paint(pg, 1)
        tap(pg, '[data-fmp]'); paint(pg, 2)
        tap(pg, '[data-fmg][data-ph="1"]'); paint(pg, 2)
        ok(E(pg,'fmOf(1)&&fmOf(1).name')=='Pia Schulz', f'{dev}: touch promotes a foreman')
        if dev=='iPhone 13':
            E(pg, 'closeSheet(); fitCamera(true); TT.render();')
            paint(pg, 3); shot_clean(pg)
            pg.screenshot(path=shot_path('mobile.png'))
            ok(os.path.getsize(shot_path('mobile.png'))>8000, 'mobile shot was written')
        pg.close()
    ok(not errs, 'no console errors: '+'; '.join(errs[:4]))
    ok(not missing, 'no missing files: '+'; '.join(missing[:4]))
    b.close()

sys.exit(1 if FAILS else 0)
