# v2.38 Onboarding for new players (maintenance notes item 7): a short first-steps guide for brand-new saves only —
# The live loop is stopped (test/_pace.py). The guide card's flash lasts 700 ms and then the entrance
# animation runs again from fully transparent. A fixed sleep after "accept the order" sometimes measured
# the card in that transparent frame, so rect() reported it missing. We render ourselves and wait until
# the card's opacity has settled. Boot waits for TT.
# tap the forest → hire the free Lumberjack → build the Sawmill with logs → first coins → upgrade the Sawmill → first client
# order → wrap-up. One card (bottom-left on desktop, above the bottom bar on phones) that moves clear of sheets / order card /
# side buttons, a pointer on the scene target, a gold ring on the button to press. Skip, replay from Settings, old saves never
# see it, damaged guide state, Replant / reset, no free resources (same run with or without the guide), desktop + iPhone/Pixel
# touch + landscape phone, no console errors / 404s. Writes the onboarding screenshots to screenshots/history/v<VERSION>/.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from _pace import STOP,ready,paint,until
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
HERE=os.path.dirname(os.path.abspath(__file__))
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
# calm world (no random events / golden logs / weather / camera flights) without touching coins, logs or the guide
CALM="(()=>{window.sfx=()=>{};S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;golden.cur=null;S.wx.clock=300;})()"
def rect(pg,sel): return E(pg,f"(()=>{{const e=document.querySelector('{sel}');if(!e) return null;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return null;const r=e.getBoundingClientRect();return r.width?{{l:r.left,t:r.top,r:r.right,b:r.bottom}}:null}})()")
def hit(a,b): return a and b and a['l']<b['r']-1 and a['r']>b['l']+1 and a['t']<b['b']-1 and a['b']>b['t']+1
def inview(pg,a): W,H=E(pg,"[innerWidth,innerHeight]"); return a and a['l']>=0 and a['t']>=0 and a['r']<=W+.5 and a['b']<=H+.5
def step(pg): E(pg,"TT.render()"); return E(pg,"S.ob.step")
def _until(pg, expr, timeout):
    try: return until(pg, expr, timeout=timeout)
    except TimeoutError: return None
def card_settled(pg, timeout=4000):
    # Opacity passes 0.9 while the entrance animation is still translating the card,
    # and getBoundingClientRect includes that shift, so the card looks like it covers the bar.
    # Wait until the card and the sheet have no running animation and the camera has landed.
    return _until(pg, '''()=>{
      if(typeof TT!=='undefined'&&TT.render) TT.render();
      if(typeof stepScene==='function') stepScene(1/30);
      const e=document.getElementById('obCard');
      if(!e) return (S.ob&&S.ob.st!=='on')?{gone:1,st:S.ob.st}:null;
      const op=+getComputedStyle(e).opacity;
      const busy=el=>el&&el.getAnimations&&el.getAnimations().some(a=>a.playState==='running');
      if(op>0.98 && !busy(e) && !busy(document.getElementById('sheet')) && !(scene.cam&&scene.cam.fly))
        return {op,step:S.ob.step,st:S.ob.st};
      return null;
    }''', timeout)
def pointer_at(pg, kind=None, timeout=4000):
    # Pointer position and the hit test in one turn, after the camera has finished flying.
    kind_js='null' if kind is None else "'%s'"%kind
    return _until(pg, '''()=>{
      if(TT.render) TT.render();
      if(typeof stepScene==='function') stepScene(1/30);
      if(scene.cam&&scene.cam.fly) return null;
      const e=document.getElementById('obCard');
      if(e && +getComputedStyle(e).opacity<0.9) return null;
      const p=TT.obPointer(); if(!p) return null;
      const h=hitTest(p[0],p[1]);
      const t=h&&h.type;
      if(%s && t!==%s) return null;
      return {p:p, type:t};
    }'''%(kind_js, kind_js), timeout)
def card_ok(pg,tag):
    c=rect(pg,'#obCard'); ok(inview(pg,c),f'{tag}: guide card fully on screen ({c})')
    for s in ['#sheet.open','#bottombar','#fabs','#orderCard']:
        o=rect(pg,s); ok(not hit(c,o),f'{tag}: guide card does not cover {s} ({c} vs {o})')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR,vp=None):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(STOP+init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL,wait_until='domcontentloaded'); ready(pg); E(pg,CALM); paint(pg); return ctx,pg
    def tap(pg,x,y,touch):
        if touch:
            cdp=pg.context.new_cdp_session(pg)
            try:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
                pg.wait_for_timeout(35)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            finally: cdp.detach()
        else: pg.mouse.click(x,y)
        pg.wait_for_timeout(40)
    def click(pg,sel,touch):
        # Wait until the control can take the event. A sheet still sliding open used to
        # sit over the button, so a coordinate click landed on the overlay.
        loc=pg.locator(sel).first
        loc.wait_for(state='visible', timeout=5000)
        if touch:
            loc.scroll_into_view_if_needed(); box=loc.bounding_box(); assert box, sel
            tap(pg, box['x']+box['width']/2, box['y']+min(box['height']/2, 22), True)
        else:
            loc.click(timeout=5000)
        E(pg,"TT.render()"); paint(pg)
    def walkthrough(pg,tag,touch,shots=None,dev=None):
        ok(E(pg,"S.ob.st")=='on' and E(pg,"S.ob.step")==0,f"{tag}: a brand-new save starts the guide at step 1 ({E(pg,'JSON.stringify(S.ob)')})")
        card_settled(pg); card_ok(pg,tag+' step 1')
        ok('Tap the forest' in E(pg,"document.getElementById('obCard').innerText"),f'{tag}: step 1 says tap the forest')
        hitp=pointer_at(pg,'forest'); pt=hitp and hitp['p']
        ok(pt is not None,f'{tag}: a pointer shows on the scene ({pt})')
        ok(hitp and hitp['type']=='forest',f'{tag}: the pointer sits on the forest')
        if shots and shots.get(0): pg.screenshot(path=shots[0])
        c0=E(pg,"S.clicks")
        guard=0
        while E(pg,'S.clicks')-c0<5 and guard<12:
            spot=pointer_at(pg,'forest')
            p=(spot and spot['p']) or pt
            if p:
                # A real finger lands at a slightly different spot each time. Chromium's
                # mobile tap recogniser intermittently drops exact-repeat synthetic taps.
                tap(pg,p[0]+(guard%3-1)*2,p[1]+(guard%2)*2,touch)
            guard+=1
            if E(pg,'S.clicks')-c0<min(5,guard):
                print(f'{tag}: synthetic touch {guard} dropped by Chromium; retrying',flush=True)
        ok(E(pg,"S.clicks")-c0>=5,f"{tag}: tapping at the pointer chops ({E(pg,'S.clicks')} chops)")
        ok(step(pg)==1,f'{tag}: 5 chops → step 2 (hire)')
        ok(E(pg,"$('bbCrew').classList.contains('ob-hl')"),f'{tag}: the Crew button is highlighted')
        click(pg,'#bbCrew',touch); card_settled(pg)
        ok(E(pg,"TT.curSheet")=='crew',f'{tag}: Crew sheet opens')
        ok(E(pg,"colEls.lumberjack.btn.classList.contains('ob-hl')"),f'{tag}: the Lumberjack Hire button is highlighted in the sheet')
        c=rect(pg,'#obCard'); sh=rect(pg,'#sheet'); ok(inview(pg,c) and not hit(c,sh),f'{tag}: the card stays clear of the open sheet ({c} vs {sh})')
        ph=E(pg,"(()=>{const p=TT.obPointer();return p?{l:p[0]-15,r:p[0]+15,t:p[1]-15,b:p[1]+15}:null})()")
        ok(ph is None or not hit(ph,sh),f'{tag}: the pointer never draws over the sheet')
        if shots and shots.get(1): pg.screenshot(path=shots[1])
        E(pg,"colEls.lumberjack.btn.scrollIntoView({block:'center'})"); paint(pg,1)
        coins=E(pg,"S.coins"); click(pg,'#pane-crew .ob-hl',touch)
        ok(E(pg,"S.collectors.lumberjack")==1 and abs(E(pg,"S.coins")-coins)<1e-9,f'{tag}: the free Lumberjack is hired (no coins change)')
        ok(step(pg)==2,f'{tag}: → step 3 (Sawmill)')
        click(pg,'#shClose',touch); card_settled(pg)
        ok('40' in E(pg,"document.getElementById('obCard').innerText"),f'{tag}: step 3 shows the log progress')
        E(pg,"S.res.logs=40;TT.render()")
        spot=_until(pg, '''()=>{
          TT.render(); if(typeof stepScene==='function') stepScene(1/30);
          if(scene.cam&&scene.cam.fly) return null;
          const p=TT.obPointer(), ls=TT.lotScreen('sawmill');
          if(!p||!ls) return null;
          if(Math.abs(p[0]-ls[0])<40 && Math.abs(p[1]-ls[1])<60) return {p:p,ls:ls};
          return null;
        }''', 4000)
        pt,ls=(spot or {}).get('p'),(spot or {}).get('ls')
        ok(pt and ls and abs(pt[0]-ls[0])<40 and abs(pt[1]-ls[1])<60,f'{tag}: with 40 logs the pointer moves to the Sawmill lot ({pt} vs {ls})')
        if shots and shots.get(2): pg.screenshot(path=shots[2])
        tap(pg,pt[0],pt[1],touch); E(pg,"TT.render()"); paint(pg)
        ok(E(pg,"S.buildings.sawmill.lvl")==1 and E(pg,"TT.curSheet")=='bld' and E(pg,"TT.sheetBld")=='sawmill',f'{tag}: tapping at the pointer builds the Sawmill from logs and opens it')
        ok(step(pg)==3,f'{tag}: → step 4 (first coins)')
        card_settled(pg); card_ok(pg,tag+' sawmill sheet')
        click(pg,'#shClose',touch)
        # the other way in: open the unbuilt Sawmill first → its Build button gets the ring
        ctx2,pg2=page(dev,tag=tag+' build-btn: ') if True else (None,None)
        E(pg2,"(()=>{S.collectors.lumberjack=1;S.clicks=9;S.res.logs=40;openSheet('bld','sawmill');TT.render();})()"); paint(pg2)
        ok(E(pg2,"S.ob.step")==2 and E(pg2,"$('bpBuy').classList.contains('ob-hl')"),f'{tag}: in the Sawmill sheet the Build button is highlighted')
        click(pg2,'#bpBuy',touch); ok(E(pg2,"S.buildings.sawmill.lvl")==1 and step(pg2)==3,f'{tag}: Build in the sheet also advances')
        ctx2.close()
        E(pg,"for(let i=0;i<120&&S.coins<bldNextCost('sawmill');i++) TT.tick(1,false)"); ok(step(pg)==4,f"{tag}: enough coins for Lv 2 → step 5 (upgrade) ({E(pg,'S.coins'):.0f} coins)")
        E(pg,"openSheet('bld','sawmill');TT.render()"); paint(pg)
        ok(E(pg,"$('bpBuy').classList.contains('ob-hl')"),f'{tag}: the Upgrade button is highlighted')
        click(pg,'#bpBuy',touch); ok(E(pg,"S.buildings.sawmill.lvl")==2 and step(pg)==5,f'{tag}: Sawmill Lv 2 → step 6 (first order)')
        click(pg,'#shClose',touch)
        E(pg,"S.orders.next=S.time;for(let i=0;i<600&&!(S.orders.offers.length&&ordersOpen());i++){TT.tick(1,false);S.events=[];golden.cur=null;}TT.render()"); paint(pg)
        ok(E(pg,"S.orders.offers.length")>0,f'{tag}: a client offer arrives')
        ok(E(pg,"!!document.querySelector('#ocYes.ob-hl')"),f'{tag}: the order card Accept button is highlighted')
        card_settled(pg)
        c=rect(pg,'#obCard'); oc=rect(pg,'#orderCard'); ok(inview(pg,c) and not hit(c,oc),f'{tag}: the guide card stays clear of the order card ({c} vs {oc})')
        if shots and shots.get(3): pg.screenshot(path=shots[3])
        click(pg,'#ocYes',touch); ok(step(pg)==6,f'{tag}: order accepted → wrap-up card')
        card_settled(pg)
        ok(rect(pg,'#obGo') is not None and "Settings" in E(pg,"document.getElementById('obCard').innerText"),f"{tag}: wrap-up mentions replay in Settings and has a Let's go button")
        card_ok(pg,tag+' wrap-up')
        click(pg,'#obGo',touch); E(pg,"TT.render()")
        ok(E(pg,"S.ob.st")=='done' and E(pg,"!document.getElementById('obCard')&&!document.getElementById('obHand')"),f'{tag}: guide finished, card and pointer gone')
    # ---------------- desktop walkthrough ----------------
    ctx,pg=page(tag='desk ')
    ok(ver(E(pg,'TT.VERSION'))>=(2,38),f"VERSION >= 2.38 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,38),'sw cache bumped to >= v2.38')
    ok('js/onboard.js' in open(ROOT+'/index.html').read(),'index.html loads js/onboard.js')
    walkthrough(pg,'desktop',False,{2:shot_path('onboarding.png')})
    pg.reload(wait_until='domcontentloaded'); ready(pg); ok(E(pg,"S.ob.st")=='done' and E(pg,"!document.getElementById('obCard')"),'desktop: a finished guide stays finished after reload')
    # replay from Settings: steps already done wait for Next
    E(pg,"openSheet('set')"); paint(pg); click(pg,'#obReplay',False); card_settled(pg)
    ok(E(pg,"S.ob.st")=='on' and E(pg,"S.ob.rep")==1 and E(pg,"TT.curSheet") is None,'Settings → Replay restarts the guide (and closes Settings)')
    ok(E(pg,"document.querySelector('#obCard .ob-e').textContent")=='✅' and rect(pg,'#obGo') is not None,'replay: a step already done shows ✅ and Next')
    n=0
    while E(pg,"S.ob.st")=='on' and n<10: click(pg,'#obGo',False); E(pg,"TT.render()"); n+=1
    ok(E(pg,"S.ob.st")=='done' and n==7,f'replay: Next walks through all steps to the end ({n} taps)')
    ctx.close()
    # ---------------- no free resources: the guide never writes to the economy ----------------
    src=open(ROOT+'/js/onboard.js',encoding='utf-8').read()
    bad=re.findall(r"S\.(?:coins|res|collectors|buildings|totalEarned|lifetimeEarned|seeds|upgrades|ws|rp|research|legacy|time|playTime)\b(?:\.\w+|\[[^\]]+\])*\s*(?:\+\+|--|[+\-*/]?=(?![=>]))",src)
    ok(not bad,f'js/onboard.js never assigns coins, stock, levels, research or time ({bad[:3]})')
    ctx,pg=page(tag='eco ')
    r=E(pg,"""(()=>{const snap=()=>{const o=JSON.parse(JSON.stringify(S));delete o.ob;delete o.lastSave;return JSON.stringify(o);};const out=[];
      const states=[()=>{},()=>{S.clicks=6;},()=>{S.collectors.lumberjack=1;S.res.logs=40;},()=>{S.buildings.sawmill.lvl=1;S.coins=500;},()=>{S.buildings.sawmill.lvl=2;S.totalEarned=400;}];
      for(const f of states){f();M=computeMods();const a=snap();for(let k=0;k<30;k++){obTick();obFrame();}obNext();obTick();obStart(true);for(let k=0;k<8;k++){obNext();obTick();}obStart(false);obTick();out.push(snap()===a);}
      obSkip();obStart(false);return out;})()""")
    ok(all(r),f'the guide gives nothing: no state outside S.ob changes while it runs, advances, replays or skips ({r})')
    ctx.close()
    # ---------------- skip ----------------
    ctx,pg=page(tag='skip ')
    c0=E(pg,"[S.coins,S.res.logs]"); click(pg,'#obSkip',False); E(pg,"TT.render()")
    ok(E(pg,"S.ob.st")=='skip' and E(pg,"!document.getElementById('obCard')&&!document.getElementById('obHand')"),'skip: ✕ hides the guide and the pointer')
    ok(any('Settings' in t for t in E(pg,"[...document.querySelectorAll('.toast')].map(t=>t.innerText)")),'skip: a toast says it can be replayed in Settings')
    ok(E(pg,"[S.coins,S.res.logs]")==c0,'skip: nothing changes in the economy')
    E(pg,"TT.save(true)"); pg.reload(wait_until='domcontentloaded'); ready(pg); ok(E(pg,"S.ob.st")=='skip' and E(pg,"!document.getElementById('obCard')"),'skip: stays hidden after reload')
    # reset → a brand-new save gets the guide again
    E(pg,"TT.hardReset()"); E(pg,"TT.render()"); card_settled(pg)
    ok(E(pg,"S.ob.st")=='on' and E(pg,"S.ob.step")==0 and E(pg,"!!document.getElementById('obCard')"),'reset: the wiped save shows the guide again')
    # far along without finishing (or after a Replant): ends quietly
    E(pg,"S.totalEarned=2e6;TT.render()"); ok(E(pg,"S.ob.st")=='done' and E(pg,"!document.getElementById('obCard')"),'a run far past the first minutes (🪙1M earned) closes the guide quietly')
    for js,lab in [("S.coins=5e6","🪙5M in hand"),("for(const b of ['sawmill','chipper','kiln','carpentry']) S.buildings[b].lvl=3","4 buildings standing")]:
        E(pg,"TT.hardReset()"); E(pg,"TT.render()"); a=E(pg,"S.ob.st"); E(pg,js+";TT.render()")
        ok(a=='on' and E(pg,"S.ob.st")=='done',f'quiet end also with {lab}')
    E(pg,"TT.hardReset()"); E(pg,"for(const b of ['sawmill','chipper','kiln']) S.buildings[b].lvl=3;TT.render()"); ok(E(pg,"S.ob.st")=='on','3 buildings: the guide keeps going')
    # Replant keeps the state
    E(pg,"(()=>{S.ob={st:'skip',step:2};S.totalEarned=1e9;S.lifetimeEarned=Math.max(S.lifetimeEarned,1e9);TT.doPrestige();TT.render();})()")
    ok(E(pg,"S.prestiges")==1 and E(pg,"S.ob.st")=='skip' and E(pg,"!document.getElementById('obCard')"),f"Replant keeps the guide state and does not restart it ({E(pg,'JSON.stringify(S.ob)')})")
    ctx.close()
    # ---------------- old saves never see it ----------------
    def oldsave(extra):
        return CLEAR+";if(!sessionStorage.getItem('_o')){sessionStorage.setItem('_o','1');localStorage.setItem('timberTycoon_save_v1',JSON.stringify("+json.dumps(extra)+"));}"
    base={'v':1,'version':'2.37','coins':0,'clicks':0,'lastSave':0,'buildings':{'sawmill':{'lvl':0,'on':True}},'collectors':{'lumberjack':0},'res':{'logs':0}}
    cases=[('v2.37 empty save',dict(base)),('v2.37 save with a Sawmill',dict(base,coins=5000,totalEarned=8000,clicks=120,buildings={'sawmill':{'lvl':12,'on':True}},collectors={'lumberjack':4})),
           ('v2.20 save',dict(base,version='2.20',coins=100)),('damaged ob "x"',dict(base,version='2.38',ob='x')),('damaged ob null',dict(base,version='2.38',ob=None)),
           ('damaged ob {st:zzz,step:99}',dict(base,version='2.38',ob={'st':'zzz','step':99})),('ob array',dict(base,version='2.38',ob=[1,2]))]
    for name,sv in cases:
        sv=dict(sv); sv['lastSave']=0 if 'lastSave' not in sv else sv['lastSave']
        ctx,pg=page(tag=f'{name}: ',init=oldsave(sv)); E(pg,"document.querySelectorAll('.modal-bg').forEach(m=>m.remove());TT.render()"); paint(pg)
        r=E(pg,"({st:S.ob.st,step:S.ob.step,card:!!document.getElementById('obCard'),hand:!!document.getElementById('obHand'),ver:S.version})")
        ok(r['st'] in ('old',) and not r['card'] and not r['hand'] and tuple(map(int,r['ver'].split('.')))>=(2,38) and 0<=r['step']<=6,f'{name}: loads, no guide ({r})')
        if name.startswith('v2.37 save with'):
            E(pg,"openSheet('set')"); paint(pg)
            ok(rect(pg,'#obReplay') is not None,'old save: Settings offers 📘 Replay')
            click(pg,'#obReplay',False); E(pg,"TT.render()"); ok(E(pg,"S.ob.st")=='on' and E(pg,"!!document.getElementById('obCard')"),'old save: replay shows the guide on request')
        ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,tag=f'{dev}: ')
        sh={0:shot_path('mobile-onboarding.png'),1:shot_path('mobile-onboarding-sheet.png')} if dev=='iPhone 13' else None
        walkthrough(pg,dev,True,sh,dev)
        ctx.close()
        ctx,pg=page(dev,tag=f'{dev} skip: '); click(pg,'#obSkip',True); E(pg,"TT.render()")
        ok(E(pg,"S.ob.st")=='skip' and E(pg,"!document.getElementById('obCard')"),f'{dev}: Skip works by touch')
        r=rect(pg,'#obSkip'); ok(r is None,f'{dev}: skip button gone')
        ctx.close()
    # touch targets on a phone
    ctx,pg=page('iPhone 13',tag='tt: ')
    r=rect(pg,'#obSkip'); ok(r and r['b']-r['t']>=34,f'phone: Skip button is a comfortable touch target ({r})')
    # a tall sheet: the card shrinks to a slim strip above it, never over it
    E(pg,"openSheet('crew');setSheetState&&setSheetState('full');TT.render()"); card_settled(pg)
    c=rect(pg,'#obCard'); s=rect(pg,'#sheet'); ok(c and not hit(c,s) or E(pg,"document.getElementById('obCard').getBoundingClientRect().bottom")<=s['t']+1 or E(pg,"getComputedStyle(document.getElementById('sheet')).zIndex>getComputedStyle(document.getElementById('obCard')).zIndex"),f'phone full sheet: the card never draws over the sheet ({c} vs {s})')
    ctx.close()
    # landscape phone (left rail + side sheet)
    ctx=b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2,service_workers='block'); ctx.add_init_script(STOP+CLEAR); pg=ctx.new_page()
    pg.on('pageerror',lambda e: errs.append(f'land {e}')); pg.goto(URL,wait_until='domcontentloaded'); ready(pg); E(pg,CALM); card_settled(pg)
    card_ok(pg,'landscape'); bb=rect(pg,'#bottombar'); c=rect(pg,'#obCard'); ok(not hit(c,bb),'landscape: card clear of the rail')
    E(pg,"openSheet('crew');TT.render()"); card_settled(pg); c=rect(pg,'#obCard'); s=rect(pg,'#sheet')
    ok(inview(pg,c) and not hit(c,s),f'landscape: card clear of the side sheet ({c} vs {s})')
    ctx.close()
    ok(not errs,f'no console errors ({errs[:4]})'); ok(not missing,f'no 404s ({missing[:4]})')
    b.close()
print('FAILS',len(FAILS),FAILS); sys.exit(1 if FAILS else 0)
