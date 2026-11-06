# v2.46: Sharper Axes / Golden Axe keep their flat ×2 / ×5 and add a floor of 1 % / 4 % of logs/s per tap, so chopping
# still matters late (maintenance #4). Early game exact, old and damaged saves, desktop click + iPhone/Pixel touch,
# no console errors / 404s. Release shots go through test/shots.py.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=29;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CALM="S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish)S.mish.next=S.time+1e6;S.prefs.autoFocus=false;"
LATE='''(()=>{if(S.ob)S.ob.st='skip';S.coins=1e15;S.totalEarned=1e15;S.playTime=9000;S.time=1000;'''+CALM+'''
 S.collectors.lumberjack=200;S.collectors.chainsaw=150;S.collectors.truck=120;S.collectors.harvester=80;S.clicks=5000;
 S.upgrades.sharp=1;S.upgrades.goldaxe=1;M=computeMods();if(typeof ntClear==='function')ntClear();TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch();errs=[];missing=[]
    def page(dev=None,init=CLEAR):
        if dev:d=dict(p.devices[dev]);d.pop('default_browser_type',None);ctx=b.new_context(**d,service_workers='block')
        else:ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init);pg=ctx.new_page()
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('response',lambda r:missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL);pg.wait_for_timeout(1300);return pg
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,46),f"VERSION >= 2.46 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read());ok(m and ver(m.group(1))>=(2,46),'service-worker cache bumped')
    # Early game: flat values exactly as before (×1, ×2, ×10), the floor is below them.
    r=E(pg,"(()=>{const o=[];for(const up of [{},{sharp:1},{sharp:1,goldaxe:1}]){S.upgrades=Object.assign({},up);S.collectors.lumberjack=10;M=computeMods();o.push([chopPower()/M.rep,M.chopAxe]);}return o;})()")
    ok([x[0] for x in r]==[1,2,10],f'early game: taps give exactly 1 / 2 / 10 ({r})')
    ok(abs(r[1][1]-.01)<1e-12 and abs(r[2][1]-.05)<1e-12,'axe floors 1 % and 1 + 4 %')
    # Late game: the floor takes over and follows logs/s.
    E(pg,LATE);r=E(pg,"[chopPower()/M.rep,logRate(),M.chopPct]")
    ok(r[1]>1000 and abs(r[0]-(0.05+r[2])*r[1])<1e-6*r[0],f'late: a tap is 5 % (+combo) of logs/s ({r[0]:.4g} of {r[1]:.4g}/s)')
    r=E(pg,"(()=>{const a=chopPower();S.upgrades.goldaxe=5;M=computeMods();const b=chopPower();return [a,b,M.chopAxe,upDesc(UPGRADES.find(u=>u.id==='goldaxe'),5)];})()")
    ok(r[1]>r[0] and abs(r[2]-(0.01+0.04*1.4))<1e-9,f'levels raise the floor ({r[2]:.3f})')
    ok('×6.6' in r[3] and '5.6%' in r[3],f'level text scales both numbers ({r[3]})')
    E(pg,"S.upgrades.goldaxe=1;M=computeMods()")
    # After a Replant (forest value up, collectors reset) numbers stay meaningful, not tiny.
    r=E(pg,"(()=>{S.runCS=1e9;for(const k in S.collectors)S.collectors[k]=0;S.collectors.lumberjack=3;M=computeMods();return [chopPower()/M.rep,logRate()];})()")
    ok(r[0]>=10 and r[0]>=0.05*r[1]-1e-9,f'after Replant: flat ×10 or the floor, whichever is larger ({r})')
    r=E(pg,"(()=>{const o=[];for(const v of [NaN,Infinity,0]){const f=logRate;logRate=()=>v;o.push(chopPower());logRate=f;}return o;})()")
    ok(all(x is not None and x>0 for x in r),f'odd log rates stay finite and positive ({r})')
    # Old (v2.45) and damaged saves.
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.45';return JSON.stringify(o);})()");pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    ok(E(pg,'[upLvl("sharp"),upLvl("goldaxe"),M.chopAxe>0.049,isFinite(chopPower())]')==[1,1,True,True],'v2.45 save loads with its axes and the new floor');pg.close()
    dmg=json.dumps(json.dumps({'version':'2.45','coins':100,'upgrades':{'sharp':'bad','goldaxe':True}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    ok(E(pg,'isFinite(chopPower())&&chopPower()>0'),'damaged save still chops');pg.close()
    # Desktop: real upgrade buy by click, then one late chop.
    pg=page();E(pg,LATE);E(pg,"S.upgrades.goldaxe=0;M=computeMods();S.res.logs=0;openSheet('upg');TT.render()");pg.wait_for_timeout(400)
    card=pg.locator('.upg-card[data-id="goldaxe"]');ok(card.count()==1 and '4%' in card.inner_text(),'desktop: Golden Axe card explains the % floor')
    c0=E(pg,'S.coins');card.locator('button').click();pg.wait_for_timeout(200)
    ok(E(pg,'upLvl("goldaxe")')==1 and E(pg,'S.coins')<c0,'desktop: click buys Golden Axe')
    E(pg,"S.res.logs=0;"+CALM);n=E(pg,'TT.chop()')
    ok(n>500,f'desktop: one late chop (TT.chop) adds {n:.4g} logs')
    E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()");pg.wait_for_timeout(150)
    pg.locator('#sheet').screenshot(path=shot_path('axe-upgrades.png'));pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev);E(pg,LATE);E(pg,"S.upgrades.goldaxe=0;M=computeMods();openSheet('upg');TT.render()");pg.wait_for_timeout(400)
        bt=pg.locator('.upg-card[data-id="goldaxe"] button');bt.scroll_into_view_if_needed();bx=bt.bounding_box();vw=pg.viewport_size['width']
        ok(bx and bx['height']>=40 and bx['x']+bx['width']<=vw+1,f'{dev}: buy button fits and is a touch target ({bx and bx["height"]})')
        cdp=pg.context.new_cdp_session(pg);x,y=bx['x']+bx['width']/2,bx['y']+bx['height']/2
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        pg.wait_for_timeout(500)
        if E(pg,'upLvl("goldaxe")')!=1: bt.tap();pg.wait_for_timeout(300)
        ok(E(pg,'upLvl("goldaxe")')==1,f'{dev}: tap buys Golden Axe')
        if dev=='iPhone 13':
            E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()");E(pg,"document.querySelector('.upg-card[data-id=\"goldaxe\"]').scrollIntoView({block:'center'})");pg.wait_for_timeout(300)
            pg.locator('#sheet').screenshot(path=shot_path('mobile-axe-upgrades.png'))
        pg.close()
    ok(not errs,'no console errors '+str(errs[:3]));ok(not missing,'no 404s '+str(missing[:3]));b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED');sys.exit(1 if FAILS else 0)
