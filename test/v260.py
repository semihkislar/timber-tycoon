# v2.60: Find the village. The south-gate lot is on the jump list from the start, the Market
# line opens it, and stage 0 draws foundations plus a sign. A stage-up toast has Look and
# does not move the camera; offline catch-up does not toast. The fit frame grows only once
# a cottage exists, and a fresh run matches v2.59 (camera and the opening total 668997.9208).
from playwright.sync_api import sync_playwright
import os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, BASE, ROOT, ver
from _pace import ready, paint, touch_at
from shots import shot_path
FAILS=[]
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js, arg=None):
    js=js.strip()
    if js.startswith('()=>') or js.startswith('() =>'):
        js='('+js+')()'
    return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def near(a, b, rel=1e-6, abs_=1e-4):
    return abs(a-b)<=abs_+rel*max(abs(a), abs(b), 1)
OLD=BASE+'releases/v2.59/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=260;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;S.orders.offers=[];S.orders.acts=[];}if(S.mish)S.mish.next=1e15;S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx){S.wx.w="clear";S.wx.next=1e15;}if(typeof ntClear==="function")ntClear();window.save=()=>{};window.sfx=()=>{};document.querySelectorAll(".toast,.modal-bg").forEach(e=>e.remove());}'''
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
CAM=r'''()=>{fitCamera(true);const c=scene.cam;return {x:+c.x.toFixed(4),y:+c.y.toFixed(4),z:+c.z.toFixed(6),fit:+c.fitZ.toFixed(6)};}'''
POSE=r'''()=>{const c=scene.cam;return {x:c.x,y:c.y,z:c.z,tx:c.tx,ty:c.ty,fly:!!c.fly};}'''
CLEAR_VIEW=r'''()=>{fitCamera(true);const c=scene.cam;c.fly=null;c.x=c.tx;c.y=c.ty;c.z=c.tz;TT.render();}'''
HOUSES=r'''()=>{const made=window.__made;S.town.made=made;S.town.stage=-1;S.town.seen=townStage();S.town.best=Math.max(S.town.best||0,S.town.stage);
  S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";TT.setClock(10*60);S.wx.w="clear";S.wx.next=1e15;
  fitCamera(true);for(let i=0;i<2;i++)stepScene(0);
  const bar=document.getElementById("bottombar").getBoundingClientRect();
  const fab=document.getElementById("fabs").getBoundingClientRect();
  const op=+getComputedStyle(document.getElementById("fabs")).opacity;
  const rows=townLive().filter(p=>p.kind==="cot"||p.kind==="church").map(p=>{
    const g=P(p.i,p.j,0), roof=P(p.i,p.j,p.kind==="church"?28:16);
    const s=w2s(g[0],g[1]), t=w2s(roof[0],roof[1]);
    const underBar=s[1]>bar.top-1;
    const underFab=op>0.2&&s[0]>fab.left-2&&s[0]<fab.right+2&&s[1]>fab.top-2&&s[1]<fab.bottom+2;
    const on=t[1]>8&&s[1]<bar.top-1&&s[0]>-30&&s[0]<innerWidth+30;
    return {k:p.kind,x:Math.round(s[0]),y:Math.round(s[1]),top:Math.round(t[1]),underBar,underFab,on};
  });
  return {n:rows.length,bad:rows.filter(r=>r.underBar||r.underFab||!r.on).slice(0,4),bar:Math.round(bar.top),h:innerHeight,w:innerWidth};}'''
GOAL='0 / 1 house kit → Hamlet'
def shot_clean(pg):
    E(pg, QUIET)
    E(pg, r'''()=>{if(typeof checkAch==="function")checkAch(true);if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.confetti,.modal-bg").forEach(e=>e.remove());const f=document.getElementById("fxLayer");if(f)f.innerHTML="";if(scene.particles)scene.particles.length=0;}''')
    paint(pg, 2)
def click_dom(pg, sel, phone=False):
    loc=pg.locator(sel).first
    try:
        loc.scroll_into_view_if_needed(timeout=3000)
    except Exception:
        pass
    box=loc.bounding_box()
    if not box: return False
    x, y=box['x']+box['width']/2, box['y']+box['height']/2
    if phone: touch_at(pg, x, y)
    else: pg.mouse.click(x, y)
    return True
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR, url=URL, vp=None):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport=vp or {'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,60), f"VERSION is 2.60 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    m=re.search(r"timber-tycoon-v([\d.]+)", sw)
    ok(m and ver(m.group(1))>=(2,60), 'service-worker cache is timber-tycoon-v2.60 or newer')
    ok(E(pg,'canSell("logs")') is False, 'logs stay unsellable')
    ok(E(pg,'townStage()')==0 and E(pg,'townFitSpan()') is None and E(pg,'townMult()')==1, 'a fresh run is still an empty lot and the fit frame does not grow')
    ok(abs(E(pg,'townMult()')-1)<1e-12 and E(pg,'BMAP.framer.cost')==6e8, 'town demand and the house workshop price are unchanged at stage 0')
    # bonus curve is the v2.55 curve
    bonus=E(pg, r'''()=>{const o=[]; for(const n of [1,25,250,2500,25000,250000]){S.town.made=n;S.town.stage=-1;o.push(+townMult().toFixed(4));} S.town.made=0;S.town.stage=0;S.town.seen=0;return o;}''')
    ok(bonus==[1.025,1.05,1.075,1.1,1.125,1.15], f'town demand is still +2.5% per stage, capped at +15% ({bonus})')
    # ---- jump chip, there from the start ----
    chip=E(pg, r'''()=>{const j=JUMPS.find(x=>x.id==="town"); buildJumpBar();
      const el=document.querySelector('#jumpBar .jchip[data-j=town]');
      return {l:j&&j.l, ic:j&&j.ic, lock:!!(j&&j.lock), n:JUMPS.filter(x=>x.id==="town").length, shown:!!el, text:el?el.textContent:""};}''')
    ok(chip['l']=='Town' and chip['ic']=='🏘️' and chip['lock'] is False and chip['n']==1 and chip['shown'] and 'Town' in chip['text'], f'Town chip is on the jump list from the start ({chip})')
    before=E(pg, POSE)
    E(pg, 'jumpTo("town")'); paint(pg, 4)
    after=E(pg, POSE)
    ok(E(pg,'TT.curSheet')=='town' and (after['fly'] or abs(after['tx']-before['tx'])>1 or abs(after['ty']-before['ty'])>1), f'jump chip opens the Town sheet and flies ({before["tx"]:.0f},{before["ty"]:.0f} → {after["tx"]:.0f},{after["ty"]:.0f})')
    E(pg, 'closeSheet()')
    # ---- stage 0 plots and the sign ----
    lot=E(pg, r'''()=>{S.town.made=0;S.town.stage=0;S.town.seen=0;townStage();
      const live=townLive(), kinds={};
      for(const q of live) kinds[q.kind]=(kinds[q.kind]||0)+1;
      const board=townPieces().find(q=>q.kind==="board"), sign=townPieces().find(q=>q.kind==="sign");
      const p=P(38.9,33.05,12); const c=scene.cam; c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]; c.z=c.tz=Math.min(c.maxZ, Math.max(c.fitZ*2.2,1.15));
      for(let i=0;i<4;i++) stepScene(1/30);
      const keys=[...SPR.map.keys()].map(String);
      return {kinds, goal:townGoalText(), board:board&&board.wi, sign:sign&&sign.wi, plot:!!keys.find(k=>k.startsWith("tw|plot")), boardArt:!!keys.find(k=>k.startsWith("tw|board")), lifts:{sign:townSplitLift({kind:"sign"}),cot:townSplitLift({kind:"cot"}),church:townSplitLift({kind:"church"})}};}''')
    ok(lot['kinds'].get('plot',0)>=7 and lot['kinds'].get('board',0)==1 and not lot['kinds'].get('cot') and not lot['kinds'].get('sign'), f'stage 0 draws foundations and the big sign, not cottages ({lot["kinds"]})')
    ok(lot['goal']==GOAL and lot['board']>lot['sign'] and lot['plot'] and lot['boardArt'], f'sign reads {lot["goal"]!r} and the art is cached')
    ok(lot['lifts']=={'sign':12,'cot':42,'church':64}, f'v2.58 roof lifts are unchanged ({lot["lifts"]})')
    E(pg, 'openSheet("town")'); paint(pg, 2)
    card=E(pg, 'document.getElementById("townCard")?document.getElementById("townCard").innerText:""')
    ok(GOAL in card and 'Timber-frame Houses' in card and 'workshop' in card and 'Logs' in card, f'stage-0 sheet names the kit source ({card[:220]!r})')
    E(pg, r'''()=>{S.town.made=25;townStage();S.town.seen=2;}''')
    paint(pg, 2)
    card2=E(pg, 'document.getElementById("townCard").innerText')
    ok('25 / 250' in card2 and 'Large village' in card2 and 'Timber-frame Houses' in card2, f'later stages show the next goal ({card2[:180]!r})')
    later=E(pg, r'''()=>{const k={}; for(const q of townLive()) k[q.kind]=(k[q.kind]||0)+1; return k;}''')
    ok(not later.get('plot') and not later.get('board') and later.get('cot',0)>=1, f'foundations leave once a cottage exists ({later})')
    # ---- Market line ----
    E(pg, 'closeSheet(); S.town.made=1; townStage(); S.town.seen=1;')
    E(pg, CLEAR_VIEW)
    mkt=E(pg, r'''()=>{openSheet("market");TT.render();const t=document.getElementById("townMkt");return t?{text:t.textContent,role:t.getAttribute("role")}:null;}''')
    ok(mkt and mkt['text'].strip()=='🏘️ Town demand +2.5%' and mkt['role']=='button', f'Market line is the demand text and a button ({mkt})')
    cam0=E(pg, POSE)
    click_dom(pg, '#townMkt')
    paint(pg, 4)
    cam1=E(pg, POSE)
    ok(E(pg,'TT.curSheet')=='town' and (cam1['fly'] or abs(cam1['tx']-cam0['tx'])>1), f'Market line opens the Town sheet and flies ({cam0["tx"]:.0f} → {cam1["tx"]:.0f})')
    # ---- Look toast: once, no yank, not offline ----
    E(pg, 'closeSheet()'); E(pg, CLEAR_VIEW)
    toast=E(pg, r'''()=>{S.ach.town2=1;S.ach.town6=1;S.town={made:0,stage:0,best:0,seen:0}; if(typeof ntClear==="function")ntClear(); document.querySelectorAll(".toast").forEach(e=>e.remove()); NT.log.length=0; NT.stats.pushed=0;
      const pose=()=>{const c=scene.cam;return {x:c.x,y:c.y,z:c.z,tx:c.tx,ty:c.ty,fly:!!c.fly};};
      const a=pose();
      townCredit(1,false);
      const b=pose();
      const el=document.querySelector(".toast-look");
      const txt=el?el.closest(".toast").innerText:"";
      const n=NT.log.length;
      townCredit(0.2,false);
      const still=NT.log.length;
      townCredit(24,false);
      const c=pose();
      const n2=NT.log.filter(r=>/Look/.test(r.txt)).length;
      S.town={made:0,stage:0,best:6,seen:0}; if(typeof ntClear==="function")ntClear(); NT.log.length=0; const p0=NT.stats.pushed;
      townCredit(250000,true);
      const off={stage:townStage(), pushed:NT.stats.pushed-p0, fly:pose().fly, tx:pose().tx};
      return {a,b,c,txt,has:!!el, n, still, n2, off, moved:Math.hypot(b.tx-a.tx,b.ty-a.ty), moved2:Math.hypot(c.tx-a.tx,c.ty-a.ty)};}''')
    ok('Hamlet' in toast['txt'] and 'Look' in toast['txt'] and toast['has'] and toast['moved']<0.01 and not toast['b']['fly'], f'first kit toasts Look and leaves the camera ({toast["txt"][:80]!r}, move {toast["moved"]:.3f})')
    ok(toast['still']==toast['n'] and toast['n2']>=2 and toast['moved2']<0.01, f'another kit in the same stage is quiet, the next stage toasts again, and the camera stays ({toast["n"]}, {toast["still"]}, {toast["n2"]})')
    ok(toast['off']['stage']==6 and toast['off']['pushed']==0 and toast['off']['fly'] is False, f'offline catch-up does not toast or fly ({toast["off"]})')
    # a fresh online toast, then Look
    E(pg, CLEAR_VIEW)
    E(pg, r'''()=>{S.town={made:0,stage:0,best:0,seen:0}; if(typeof ntClear==="function")ntClear(); NT.log.length=0; townCredit(1,false);}''')
    paint(pg, 2)
    cam_b=E(pg, POSE)
    click_dom(pg, '.toast-look')
    paint(pg, 5)
    cam_a=E(pg, POSE)
    ok(E(pg,'TT.curSheet')=='town' and (cam_a['fly'] or abs(cam_a['tx']-cam_b['tx'])>1), f'Look opens the village ({cam_b["tx"]:.0f} → {cam_a["tx"]:.0f}, sheet {E(pg,"TT.curSheet")})')
    # ---- fit padding: houses above the toolbar on three viewports ----
    def houses(pg, made, label):
        E(pg, f'window.__made={int(made)}')
        r=E(pg, HOUSES)
        ok(r['n']>=1 and not r['bad'], f'{label}: cottages sit on screen above the toolbar ({r})')
    E(pg, 'closeSheet()')
    for made in (1, 250000):
        houses(pg, made, f'desktop 1280×800 stage made={made}')
    pg.close()
    pg=page(vp={'width':1920,'height':1080}); E(pg, QUIET)
    houses(pg, 25, 'desktop 1920×1080')
    houses(pg, 250000, 'desktop 1920×1080 Timber Town')
    pg.close()
    pg=page('iPhone 13'); E(pg, QUIET)
    houses(pg, 1, 'iPhone 13 hamlet')
    houses(pg, 250000, 'iPhone 13 Timber Town')
    # phone name pill stays, and it does not sit on the round buttons
    pill=E(pg, r'''()=>{S.town.made=250000;townStage();S.town.seen=6;
      for(const id of ["sawmill","chipper","kiln","carpentry","peeler","pellet","paper","furniture","beamsaw","glulam","panelpress","framer"]) if(S.buildings[id]) S.buildings[id].lvl=Math.max(4,S.buildings[id].lvl||0);
      S.premium.lvl=1; fitCamera(true); for(let i=0;i<3;i++) stepScene(1/30);
      const fab=document.getElementById("fabs").getBoundingClientRect();
      const pills=scene.townPills||[];
      const hit=pills.filter(r=>r.x<fab.right&&r.x+r.w>fab.left&&r.y<fab.bottom&&r.y+r.h>fab.top);
      return {dc:dcOn(), texts:pills.map(r=>r.t), hit:hit.length, n:pills.length};}''')
    ok(pill['dc'] is True and any('Timber Town' in t for t in pill['texts']) and pill['hit']==0, f'iPhone fit zoom keeps the village name off the action buttons ({pill})')
    # Town chip on the phone, clear of the bar and the buttons
    E(pg, 'toggleJump(true)'); paint(pg, 2)
    E(pg, "document.querySelector('#jumpBar .jchip[data-j=town]').scrollIntoView({inline:'center',block:'nearest'})")
    pg.wait_for_timeout(80)
    geo=E(pg, r'''()=>{const b=document.querySelector('#jumpBar .jchip[data-j=town]').getBoundingClientRect();
      const bar=document.getElementById('bottombar').getBoundingClientRect();
      const fab=document.getElementById('fabs').getBoundingClientRect();
      const op=+getComputedStyle(document.getElementById('fabs')).opacity;
      const overlap=op>0.2&&b.right>fab.left&&b.left<fab.right&&b.bottom>fab.top&&b.top<fab.bottom;
      return {h:b.height,top:b.top,bot:b.bottom,l:b.left,r:b.right,vw:innerWidth,bar:bar.top,overlap,text:document.querySelector('#jumpBar .jchip[data-j=town]').textContent};}''')
    ok(geo['h']>=44 and geo['bot']<=geo['bar']+1 and geo['l']>=-2 and geo['r']<=geo['vw']+2 and not geo['overlap'] and 'Town' in geo['text'], f'iPhone Town chip is a 44px target clear of the bar and the buttons ({geo})')
    click_dom(pg, '#jumpBar .jchip[data-j=town]', phone=True)
    paint(pg, 4)
    if E(pg,'TT.curSheet')!='town':
        click_dom(pg, '#jumpBar .jchip[data-j=town]', phone=True)
        paint(pg, 4)
    ok(E(pg,'TT.curSheet')=='town', 'iPhone Town chip opens the Town sheet')
    # Market line on the phone
    E(pg, 'closeSheet()'); paint(pg, 1)
    click_dom(pg, '#bbMarket', phone=True)
    paint(pg, 2)
    if E(pg,'TT.curSheet')!='market':
        click_dom(pg, '#bbMarket', phone=True); paint(pg, 2)
    ok(E(pg,'TT.curSheet')=='market', 'iPhone Market sheet opens')
    click_dom(pg, '#townMkt', phone=True)
    paint(pg, 4)
    if E(pg,'TT.curSheet')!='town':
        click_dom(pg, '#townMkt', phone=True); paint(pg, 3)
    ok(E(pg,'TT.curSheet')=='town', 'iPhone Market line opens the Town sheet')
    # Look is a real target on the phone
    E(pg, 'closeSheet()')
    E(pg, r'''()=>{S.town={made:0,stage:0,best:0,seen:0}; if(typeof ntClear==="function")ntClear(); townCredit(1,false);}''')
    paint(pg, 2)
    look=E(pg, r'''()=>{const b=document.querySelector(".toast-look"); if(!b) return null; const r=b.getBoundingClientRect(); const t=b.closest(".toast").getBoundingClientRect(); return {h:r.height,w:r.width,top:r.top,bot:r.bottom,clip:r.bottom<=t.bottom+1&&r.top>=t.top-1,vh:innerHeight};}''')
    ok(look and look['h']>=44 and look['clip'] and look['top']>0 and look['bot']<look['vh'], f'iPhone Look button is fully visible ({look})')
    pg.close()
    # ---- opening view and opening script match v2.59 ----
    fresh={}
    for label, kwargs in (('1280', {'vp':{'width':1280,'height':800}}), ('1920', {'vp':{'width':1920,'height':1080}}), ('phone', {'dev':'iPhone 13'})):
        a=page(url=URL, **kwargs); E(a, QUIET); ca=E(a, CAM)
        E(a, 'TT.setClock(21*60+20);S.wx.w="clear";')
        na=E(a, CAM)
        a.close()
        o=page(url=OLD, **kwargs); E(o, QUIET); co=E(o, CAM)
        E(o, 'TT.setClock(21*60+20);S.wx.w="clear";')
        no=E(o, CAM)
        o.close()
        fresh[label]=(ca,co,na,no)
        ok(all(near(ca[k], co[k], 0, 1e-3) for k in ('x','y','z','fit')) and all(near(na[k], no[k], 0, 1e-3) for k in ('x','y','z','fit')),
           f'{label}: fresh day and night fit matches v2.59 ({ca} vs {co}; night {na} vs {no})')
    pg=page(); e_new=E(pg, EARLY); pg.close()
    pg=page(url=OLD); e_old=E(pg, EARLY); pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and near(e_new[0], e_old[0]) and near(e_new[0], 668997.9208),
       f'opening script is 668997.9208 and matches v2.59 ({e_new[0]:.4f} vs {e_old[0]:.4f})')
    # ---- an older save still runs ----
    raw=json.dumps(json.dumps({'version':'2.55','coins':4000,'buildings':{'sawmill':{'lvl':6,'on':True}},'res':{'logs':12,'planks':3}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
    r=E(pg, r'''()=>{let s=0;for(let k=0;k<3;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;} return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell("logs"),town:!!S.town,ok:isFinite(S.coins)&&s>0};}''')
    ok(r['ok'] and ver(r['v'])>=(2,60) and r['saw']==6 and r['logs'] is False and r['town'], f'a v2.55 save loads ({r})')
    pg.close()
    # ---- shots ----
    pg=page(); E(pg, QUIET)
    E(pg, r'''()=>{S.coins=1e12; for(const id of ["sawmill","chipper","kiln","peeler","beamsaw","carpentry","pellet","paper","furniture","glulam"]) if(S.buildings[id]) S.buildings[id].lvl=Math.max(8,S.buildings[id].lvl||0);
      S.premium.lvl=1; if(S.buildings.framer) S.buildings.framer.lvl=4; S.town.made=25; townStage(); S.town.seen=2;
      TT.setClock(10*60); S.wx.w="clear"; fitCamera(true); TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop-houses.png'))
    E(pg, r'''()=>{closeSheet(); S.town.made=0; S.town.stage=0; S.town.seen=0; townStage();
      TT.setClock(10*60); S.wx.w="clear";
      const p=P(38.7,33.4,8); const c=scene.cam; c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]; c.z=c.tz=Math.min(c.maxZ, Math.max(c.fitZ*2.4, 1.2));
      TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('stage0-lot.png'))
    E(pg, r'''()=>{S.town.made=0;townStage();openSheet("town");TT.render();}''')
    paint(pg, 2); shot_clean(pg)
    E(pg, 'openSheet("town")'); paint(pg, 2)
    pg.screenshot(path=shot_path('town-sheet.png'))
    pg.close()
    pg=page('iPhone 13'); E(pg, QUIET)
    E(pg, 'toggleJump(true)'); paint(pg, 2)
    E(pg, "document.querySelector('#jumpBar .jchip[data-j=town]').scrollIntoView({inline:'center',block:'nearest'})")
    pg.wait_for_timeout(100)
    shot_clean(pg)
    E(pg, 'toggleJump(true)'); paint(pg, 1)
    E(pg, "document.querySelector('#jumpBar .jchip[data-j=town]').scrollIntoView({inline:'center',block:'nearest'})")
    pg.wait_for_timeout(80)
    pg.screenshot(path=shot_path('mobile-chip.png'))
    pg.close()
    names=('desktop-houses.png','stage0-lot.png','town-sheet.png','mobile-chip.png')
    ok(all(os.path.getsize(shot_path(n))>8000 for n in names), 'release shots were written')
    ok(not errs, 'no console errors '+str(errs[:4]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -', f)
sys.exit(1 if FAILS else 0)
