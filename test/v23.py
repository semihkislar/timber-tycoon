# v2.3 tests: day/night cycle, seasons, weather (effects, schedule, visuals, HUD widget), v2.2 save migration
from playwright.sync_api import sync_playwright
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OLD=BASE+'releases/timber-tycoon-v2.2.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
D=420
MID='''(()=>{TT.S.coins=1e15;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",30);TT.buyCollector("truck",20);TT.buyCollector("harvester",10);
for(const [b,n] of [["sawmill",70],["chipper",40],["kiln",40],["carpentry",30],["pellet",30],["paper",20],["furniture",12]]) TT.buyBuilding(b,n);TT.S.coins=1e9;TT.simulate(3);})()'''
import io
from PIL import Image
def lum(pg):
    im=Image.open(io.BytesIO(pg.screenshot())).convert('L'); w,h=im.size; im=im.crop((0,int(h*.2),w,int(h*.75))).resize((160,90))
    px=list(im.getdata()); return sum(px)/len(px)
def setw(pg,clock,w,instant=True):
    pg.evaluate(f"(()=>{{TT.setClock({clock});TT.setWeather('{w}',400);TT.S.wx.next=1e9;const v=TT.scene.wxv;for(const k in v) v[k]=0;if('{w}'!=='clear') v['{w}']={1 if instant else 0};document.querySelectorAll('.toast').forEach(t=>t.remove());}})()")
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- v2.2 save migration ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.VERSION')=='2.2','old build is v2.2')
    pg.evaluate('(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",25);TT.buyBuilding("sawmill",30);TT.buyBuilding("kiln",6);TT.S.golden=4;TT.S.orders.done=3;TT.S.storage.sawmill=2;TT.save(true);})()')
    old=pg.evaluate('JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=pg.evaluate('TT.S')
    ok(S['version']>='2.3','v2.2 save migrated to 2.3+')
    ok(S['collectors']==old['collectors'] and S['buildings']['sawmill']['lvl']==30 and S['golden']==4 and S['orders']['done']==3 and S['storage'].get('sawmill')==2,'collectors, buildings, orders, storage kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.02,'coins kept')
    ok(S['wx']['w']=='clear' and pg.evaluate('TT.seasonIdx()')==0 and 6.5<pg.evaluate('TT.dayPhase()*24')<9,'world clock initialised: spring, fair weather, morning')
    ctx.close()
    # --- clock / seasons math ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400)
    ok(pg.evaluate('TT.DAY_LEN')>=360 and pg.evaluate('TT.DAY_LEN')<=480,'a full day lasts 6-8 minutes')
    c0=pg.evaluate('TT.S.wx.clock'); pg.evaluate('TT.simulate(30,.5)'); ok(abs(pg.evaluate('TT.S.wx.clock')-c0-30)<1,'clock advances with game time')
    ss=[pg.evaluate(f'TT.seasonIdx({k*D*3+5})') for k in range(5)]
    ok(ss==[0,1,2,3,0],f'seasons rotate every {3} days ({ss})')
    ok(pg.evaluate(f'TT.clockStr({D*.5})')=='12:00' and pg.evaluate(f'TT.isNight({D*.95})') and not pg.evaluate(f'TT.isNight({D*.5})'),'clock string and night detection')
    # --- gameplay effects ---
    pg.evaluate(MID)
    def mods(clock,w):
        setw(pg,clock,w); return pg.evaluate('(()=>{const M=TT.M;return {colAll:M.colAll,chop:M.chop,bldAll:M.bldAll,kiln:M.bld.kiln,ch:M.price.charcoal,pe:M.price.pellets,fu:M.price.furniture,chairs:M.price.chairs};})()')
    base=mods(D*3+D*.5,'clear')   # summer, fair
    sp=mods(D*.5,'clear'); au=mods(D*6+D*.5,'clear'); wi=mods(D*9+D*.5,'clear')
    ok(abs(sp['colAll']/base['colAll']-1.10/1)<.01 or abs(sp['colAll']-base['colAll']*1.10)<1e-6,'spring: collectors +10% (tree regrowth)')
    ok(abs(base['bldAll']-1.08*sp['bldAll'])<1e-6,'summer: buildings +8%')
    ok(abs(au['fu']/sp['fu']-1.25)<1e-6 and abs(au['chairs']/sp['chairs']-1.25)<1e-6,'autumn: furniture & chairs demand +25%')
    ok(abs(wi['ch']/sp['ch']-1.35)<1e-6 and abs(wi['pe']/sp['pe']-1.35)<1e-6,'winter: charcoal & pellets +35%')
    rn=mods(D*.5,'rain'); ok(abs(rn['colAll']/sp['colAll']-.85)<1e-6 and abs(rn['chop']/sp['chop']-.85)<1e-6,'rain: collectors & chopping -15%')
    su=mods(D*.5,'sunny'); ok(abs(su['colAll']/sp['colAll']-1.15)<1e-6,'sunny: collectors +15%')
    wd=mods(D*.5,'wind'); ok(abs(wd['kiln']/sp['kiln']-1.2)<1e-6,'wind: kiln +20%')
    sn=mods(D*9+D*.5,'snow'); ok(abs(sn['ch']/wi['ch']-1.15)<1e-6 and abs(sn['colAll']/wi['colAll']-.9)<1e-6,'snowfall: collectors -10%, charcoal +15%')
    lr=pg.evaluate('TT.logRate()'); setw(pg,D*.5,'clear'); lr2=pg.evaluate('TT.logRate()'); ok(lr2>lr,'log rate responds to the weather')
    # --- weather schedule (season-appropriate, ends, toasts) ---
    seen=pg.evaluate(f'''(()=>{{TT.S.wx.w='clear';TT.S.wx.next=TT.S.wx.clock;const seen={{}};for(let k=0;k<2*4*3*{D}/5;k++){{TT.simulate(5,5);const s=TT.seasonIdx(),w=TT.weatherId();seen[s+':'+w]=1;}}return Object.keys(seen);}})()''')
    ok(any(s.startswith('0:rain') for s in seen) and any(s.startswith('3:snow') for s in seen),f'rain in spring, snow in winter ({sorted(seen)})')
    ok(not any(s.endswith(':snow') and not s.startswith('3') for s in seen),'snow only falls in winter')
    ok(sum(1 for s in seen if s.endswith(':clear'))>=3,'fair weather between events')
    # --- spring regrowth (scene) ---
    ctx.close()
    # --- visuals: night lighting, readability, lights, weather particles, widget ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400); pg.evaluate(MID); pg.wait_for_timeout(300)
    setw(pg,D*.5,'clear'); pg.wait_for_timeout(700); day=lum(pg); dn=pg.evaluate('TT.scene.dn')
    ok(dn['night']<.01 and pg.evaluate('TT.scene.lightCount')==0,'midday: no tint, lights off')
    setw(pg,D*.95,'clear'); pg.wait_for_timeout(900); night=lum(pg); dn=pg.evaluate('TT.scene.dn')
    ok(dn['night']>.95,'midnight is night')
    ok(night<day*.85,f'night is darker than day ({night:.0f} vs {day:.0f})')
    ok(night>day*.45,f'night stays readable (>45% of day brightness: {night/day*100:.0f}%)')
    ok(pg.evaluate('TT.scene.lightCount')>40,f"lamps, windows & headlights glow at night ({pg.evaluate('TT.scene.lightCount')} lights)")
    amb=pg.evaluate('TT.scene.dn.amb'); ok(amb[2]>amb[0]+40,'night tint is blue')
    setw(pg,D*.785,'clear'); pg.wait_for_timeout(500); amb=pg.evaluate('TT.scene.dn.amb'); ok(amb[0]>amb[2]+60,'dusk tint is orange')
    setw(pg,D*.95,'clear'); pg.wait_for_timeout(300); ok(pg.evaluate("document.getElementById('wxChip').classList.contains('night')"),'widget switches to night style')
    # weather particles
    setw(pg,D*.5,'rain'); pg.wait_for_timeout(600); ok(pg.evaluate('TT.scene.wxParts')>100,'rain streaks drawn'); ok(pg.evaluate('TT.scene.dn.oc')>.9,'rain makes it overcast')
    pg.wait_for_timeout(300); ok('Rain' in pg.inner_text('#wxChip') and '15%' in pg.inner_text('#wxChip'),'widget shows weather + effect')
    setw(pg,D*9+D*.5,'snow'); pg.wait_for_timeout(600); ok(pg.evaluate('TT.scene.wxParts')>100,'snowflakes drawn')
    ok('Winter' in pg.inner_text('#wxChip'),'widget shows season')
    setw(pg,D*6+D*.5,'wind'); pg.wait_for_timeout(600); ok(pg.evaluate('TT.scene.wxParts')>10,'autumn leaves & wind streaks drawn')
    # frame time at night + rain
    setw(pg,D*.95,'rain'); pg.wait_for_timeout(2500); ms=pg.evaluate('TT.scene.frameMs'); ok(ms<20,f'night+rain frame time {ms:.1f}ms')
    # widget popover
    pg.click('#wxChip'); pg.wait_for_timeout(200); ok(pg.is_visible('#wxPop') and 'Spring' in pg.inner_text('#wxPop') and 'Winter' in pg.inner_text('#wxPop'),'widget opens the season calendar')
    pg.mouse.click(640,500); pg.wait_for_timeout(200); ok(not pg.is_visible('#wxPop'),'calendar closes on outside tap')
    # season change toast
    pg.evaluate(f'(()=>{{TT.setClock({D*3}-1);TT.simulate(2,.5);}})()'); pg.wait_for_timeout(200)
    ok('Summer has arrived' in pg.inner_text('body'),'season change is announced')
    ctx.close()
    # --- offline progress keeps the clock moving ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400); pg.evaluate(MID)
    c0=pg.evaluate('TT.S.wx.clock'); r=pg.evaluate('TT.simulateOffline(3600)'); c1=pg.evaluate('TT.S.wx.clock')
    ok(abs(c1-c0-3600)<1 and r['coins']>0,'offline: clock advances, income earned')
    # replant keeps the calendar
    pg.evaluate('TT.S.totalEarned=1e9'); c0=pg.evaluate('TT.S.wx.clock'); pg.evaluate('TT.doPrestige()'); ok(abs(pg.evaluate('TT.S.wx.clock')-c0)<1,'replant keeps the calendar running')
    ctx.close()
    # --- mobile ---
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(600)
    bb=pg.locator('#wxChip').bounding_box(); ok(bb and bb['x']>=0 and bb['x']+bb['width']<=390 and bb['y']<140,'mobile: widget fits under the top bar')
    ctx.close()
    errs=[e for e in errs if 'favicon' not in e]
    print('ERRORS:',errs); ok(not errs,'no console errors')
    b.close()
print('FAILS',FAILS)
import sys; sys.exit(1 if FAILS else 0)
