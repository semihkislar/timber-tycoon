# v2.47: leveled ×2 upgrades for the Veneer Peeler, Beam Saw, Plywood Mill and Glulam Plant (maintenance #6).
# Lv 1 is exactly ×2, Lv 5 is ×2.4, prices are 15× the building × forest value. The Plywood Mill's ×2 stacks on
# supply parity; the Panel Press does not inherit the Peeler's upgrade. Early game matches v2.46. Old and damaged
# saves load, logs stay unsellable, desktop click + iPhone/Pixel touch. Release shots go through test/shots.py.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,*a): return pg.evaluate(js,*a)
OLD=BASE+'releases/v2.46/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=47;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CALM="S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish)S.mish.next=S.time+1e6;S.prefs.autoFocus=false;if(S.ob)S.ob.st='skip';"
LINES=[['peelknife','peeler'],['carriage','beamsaw'],['daylight','plymill'],['rfcure','glulam']]
EARLY='''(()=>{let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
 S.coins=50;S.totalEarned=0;S.time=0;S.events=[];S.nextEvent=75;S.clicks=0;if(S.wx){S.wx.next=1e15;S.wx.w='clear';}if(S.ob)S.ob.st='skip';
 if(S.mish)S.mish.next=1e15;S.fires={};if(S.orders)S.orders.next=1e15;S.upgrades={};
 for(const c of COLLECTORS)S.collectors[c.id]=0;for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
 const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
 for(let k=0;k<14400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10)TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10)TT.buyCollector('truck',1);
   for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
 return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.carpentry.lvl,S.buildings.peeler.lvl,S.buildings.pellet.lvl,canSell('logs')];})()'''
SHOW='''(()=>{'''+CALM+'''S.coins=1e16;S.totalEarned=1e16;S.runCS=1;S.upgrades.sharp=5;S.upgrades.conveyor=5;
 for(const id of ['peeler','beamsaw','plymill','glulam']){S.buildings[id].lvl=30;S.buildings[id].on=true;}
 M=computeMods();if(typeof ntClear==='function')ntClear();openSheet('upg');TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch();errs=[];missing=[]
    def page(dev=None,init=CLEAR,url=URL):
        if dev:d=dict(p.devices[dev]);d.pop('default_browser_type',None);ctx=b.new_context(**d,service_workers='block')
        else:ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init);pg=ctx.new_page()
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('response',lambda r:missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url);pg.wait_for_timeout(1300);return pg
    def touch(pg,bt):
        bt.scroll_into_view_if_needed();bx=bt.bounding_box();vw=pg.viewport_size['width']
        ok(bool(bx) and bx['height']>=40 and bx['x']>=-1 and bx['x']+bx['width']<=vw+2,f'touch target fits ({None if not bx else round(bx["height"])}px)')
        if not bx: return
        cdp=pg.context.new_cdp_session(pg);x,y=bx['x']+bx['width']/2,bx['y']+min(bx['height']/2,20)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        pg.wait_for_timeout(450)
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,47),f"VERSION >= 2.47 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read());ok(m and ver(m.group(1))>=(2,47),'service-worker cache bumped')
    # The four lines, priced like Steam Saw (15× the building), with the same level rules. Workstations and research already cover them.
    r=E(pg,"""(()=>{const o=[];for(const [id,bid] of %s){const u=UPGRADES.find(x=>x.id===id);o.push({id,bid,name:u&&u.name,cost:u&&u.cost,base:BMAP[bid].cost,max:u&&upMax(u),ref:(UPG_REF[id]||[]).join(','),
      ws:WS_DEF[bid]&&WS_DEF[bid].length===3&&WS_DEF[bid][1][3]==='spd',line:LINE_UP[bid]});}return {o,mil:['peeler','beamsaw','glulam'].every(id=>MIL.indexOf(id)>=0),
      ply:RNMAP.plywood&&RNMAP.plywood.unlock==='plymill'&&!!RNMAP.coldpress&&!!RNMAP.grading,n:UPGRADES.length,logs:canSell('logs')};})()"""%json.dumps(LINES))
    ok(r['n']==31 and r['logs'] is False and r['mil'] and r['ply'],f"31 upgrades, logs unsellable, mill research + plywood nodes ({r['n']})")
    ok(all(x['line']==x['id'] and x['ws'] and x['max']==5 and x['ref']=='b,'+x['bid'] and x['cost']==x['base']*15 for x in r['o']),f"each line is 15× its building, max 5, gated on that building ({r['o']})")
    # Locked until the building is Lv 2. Lv 1 is exactly ×2. Lv 2 needs Lv 25 and costs ×12. Lv 5 is ×2.4.
    r=E(pg,"""(()=>{const out=[];S.coins=1e18;S.upgrades={};S.runCS=1;for(const [id,bid] of %s){const u=UPGRADES.find(x=>x.id===id);
      S.buildings[bid].lvl=1;S.buildings[bid].on=true;M=computeMods();const locked=upReqOk(u,1)===false&&TT.buyUpgrade(id)===false;
      S.buildings[bid].lvl=30;M=computeMods();const s0=bSpeed(bid),c1=upCost(u,1);const bought=TT.buyUpgrade(id);M=computeMods();const s1=bSpeed(bid);
      S.buildings[bid].lvl=24;const no2=TT.buyUpgrade(id)===false;S.buildings[bid].lvl=30;const c2=upCost(u,2);const yes2=TT.buyUpgrade(id)===true;
      S.upgrades[id]=5;M=computeMods();const s5=bSpeed(bid);S.upgrades[id]=0;M=computeMods();const back=bSpeed(bid);
      out.push({id,locked,bought,no2,yes2,r1:s1/s0,r5:s5/s0,back:Math.abs(back-s0)<1e-6*s0,c:c2/c1,d5:upDesc(u,5),need:upReqTxt(u,3)});
      S.buildings[bid].lvl=0;S.upgrades[id]=0;}M=computeMods();return out;})()"""%json.dumps(LINES))
    ok(all(x['locked'] and x['bought'] and x['no2'] and x['yes2'] for x in r),f'Lv 1 needs the building at Lv 2; Lv 2 needs Lv 25 ({r})')
    ok(all(abs(x['r1']-2)<1e-9 and abs(x['r5']-2.4)<1e-9 and x['back'] and abs(x['c']-12)<1e-9 for x in r),f'Lv 1 ×2, Lv 5 ×2.4, removing it restores speed, Lv 2 costs ×12 ({[(x["id"],round(x["r1"],4),round(x["r5"],4)) for x in r]})')
    ok(all(x['d5'].endswith('×2.4') and 'Lv 50' in x['need'] for x in r),f'level text and the next gate ({[(x["d5"],x["need"]) for x in r]})')
    # Forest value: the price stays 15× the building at every scale, including after a huge Replant, and the charge is exact.
    r=E(pg,"""(()=>{const u=UPGRADES.find(x=>x.id==='rfcure');const o=[];S.upgrades={};S.buildings.glulam.lvl=4;for(const cs of [1,50,675,1e6,1e12]){S.runCS=cs;S.coins=upCost(u)*3;const c0=S.coins;const k=upCost(u);
      const bld=bulkCost(BMAP.glulam.cost,BMAP.glulam.scale,0,1);TT.buyUpgrade('rfcure');o.push([k,u.cost*cs,k/bld,c0-S.coins]);S.upgrades.rfcure=0;}S.runCS=1;M=computeMods();return o;})()""")
    ok(all(abs(a-b)<1e-6*b and abs(ratio-15)<1e-6 and abs(paid-a)<1e-6*a for a,b,ratio,paid in r),f'RF Curing stays 15× the Glulam Plant × forest value and charges that ({r})')
    # Supply parity: Daylight Press still doubles the mill when the workshops' research is ahead. The press ignores Peeler Knives.
    r=E(pg,"""(()=>{S.upgrades={};S.runCS=1;S.premium.lvl=1;if(S.trade)S.trade.lvl=1;for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
      S.buildings.plymill.lvl=20;S.buildings.parquet.lvl=40;S.buildings.toyshop.lvl=30;S.buildings.cabinetry.lvl=10;
      S.research={plywood:1,toys:1,ateliers:1,toyline:1};M=computeMods();const own=resBld('plymill'),par=plyParity(),s0=bSpeed('plymill'),p0=plyRes();
      S.upgrades.daylight=1;M=computeMods();const s1=bSpeed('plymill'),p1=plyRes(),raw=M.bld.plymill;
      S.upgrades.daylight=5;M=computeMods();const s5=bSpeed('plymill');
      S.upgrades={};S.buildings.peeler.lvl=12;S.buildings.panelpress.lvl=8;S.research.robomill=1;S.research.zerowaste=1;M=computeMods();
      const pr0=pressRes(),sp0=bSpeed('peeler'),pe0=resBld('peeler');S.upgrades.peelknife=1;M=computeMods();
      return {own,par,p0,r1:s1/s0,rp:p1/p0,raw,r5:s5/s0,pr:pressRes()/pr0,pe:bSpeed('peeler')/sp0,peRes:resBld('peeler')/pe0};})()""")
    ok(r['par']>r['own']+0.2 and abs(r['p0']-r['par'])<1e-9,f"parity is ahead of the mill's own research ({r['own']:.3f} vs {r['par']:.3f})")
    ok(abs(r['r1']-2)<1e-9 and abs(r['rp']-2)<1e-9 and abs(r['raw']-2)<1e-9 and abs(r['r5']-2.4)<1e-9,f"Daylight Press doubles the mill on top of parity ({r['r1']:.4f} / Lv5 {r['r5']:.4f})")
    ok(abs(r['pr']-1)<1e-9 and abs(r['pe']-2)<1e-9 and abs(r['peRes']-1)<1e-9,f"Peeler Knives doubles the Peeler only; the Panel Press stays on research pace ({r['pr']:.4f}, {r['pe']:.4f})")
    # Early game is the v2.46 run: these lines are not bought, earnings match. Fresh pages, so the checks above cannot leak in.
    pg.close();pg=page();e_new=E(pg,EARLY);pg.close()
    pg=page(url=OLD);e_old=E(pg,EARLY);pg.close()
    ok(e_old[5] is False and e_new[5] is False and e_new[1:]==e_old[1:] and abs(e_new[0]-e_old[0])<=1e-6*e_old[0],f'early game identical to v2.46 ({e_new[0]:.6f} vs {e_old[0]:.6f}, levels {e_new[1:]})')
    # Replant clears the lines. Logs still cannot be sold.
    pg=page();r=E(pg,"""(()=>{S.coins=1e18;S.totalEarned=1e18;S.buildings.peeler.lvl=10;S.upgrades.peelknife=3;S.res.logs=500;const sold=sellAll('logs');const g=doPrestige();
      return {g,sold,logs:S.res.logs,can:canSell('logs'),up:upLvl('peelknife'),lv:S.buildings.peeler.lvl};})()""")
    ok(r['g'] and r['sold']==0 and r['can'] is False and r['up']==0 and r['lv']==0,f'Replant clears the line; logs were not sold ({r})')
    # v2.46 save keeps its upgrades and does not invent the new lines. A damaged save still runs.
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.46';o.coins=250000;o.upgrades={steamsaw:2,sharp:1};o.buildings.sawmill={lvl:40,on:true};o.buildings.peeler={lvl:6,on:true};o.res.logs=80;return JSON.stringify(o);})()")
    pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    r=E(pg,"(()=>{M=computeMods();return {v:S.version,st:upLvl('steamsaw'),sh:upLvl('sharp'),pk:upLvl('peelknife'),dl:upLvl('daylight'),sp:bSpeed('sawmill'),logs:S.res.logs,can:canSell('logs'),coin:S.coins};})()")
    ok(ver(r['v'])>=(2,47) and r['st']==2 and r['sh']==1 and r['pk']==0 and r['dl']==0 and r['sp']>0 and r['can'] is False and r['coin']>2e5 and E(pg,'S.buildings.sawmill.lvl')==40 and E(pg,'S.buildings.peeler.lvl')==6,f'v2.46 save loads, new lines stay unbought ({r})')
    pg.close()
    dmg=json.dumps(json.dumps({'version':'2.46','coins':-20,'upgrades':{'peelknife':'bad','daylight':True,'carriage':9,'rfcure':None},'buildings':{'plymill':{'lvl':'x','on':True},'glulam':{'lvl':3,'on':True}},'res':{'logs':-4}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg,"(()=>{M=computeMods();let s=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);s+=bSpeed('glulam');}return {coin:S.coins,pk:upLvl('peelknife'),dl:upLvl('daylight'),lv:S.buildings.plymill.lvl,logs:S.res.logs,s,ok:isFinite(S.coins)&&isFinite(bSpeed('glulam'))&&isFinite(plyRes())};})()")
    ok(r['ok'] and r['coin']>=0 and r['pk']==0 and r['dl']==1 and r['lv']==0 and r['logs']==0 and r['s']>0,f'damaged save runs ({r})')
    pg.close()
    # Desktop: the four cards, a real click buy, and the building sheet naming the line.
    pg=page();E(pg,SHOW);pg.wait_for_timeout(400)
    ids=E(pg,"[...document.querySelectorAll('.upg-card[data-id]')].map(e=>e.dataset.id)")
    ok(ids==['peelknife','carriage','daylight','rfcure'],f'desktop: only the four new lines are on offer ({ids})')
    card=pg.locator('.upg-card[data-id="peelknife"]');ok('×2' in card.inner_text() and 'Peeler Knives' in card.inner_text(),'desktop: Peeler Knives explains the ×2')
    E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    pg.wait_for_timeout(150)
    pg.locator('#sheet').screenshot(path=shot_path('line-upgrades.png'))
    c0=E(pg,'S.coins');card.locator('button').click();pg.wait_for_timeout(250)
    ok(E(pg,'upLvl("peelknife")')==1 and abs(E(pg,'S.coins')-(c0-9e5))<1,f'desktop: click buys Peeler Knives for 900K')
    for uid,bid in LINES[1:]:
        bt=pg.locator(f'.upg-card[data-id="{uid}"] button');bt.scroll_into_view_if_needed();bt.click();pg.wait_for_timeout(200)
        ok(E(pg,f'upLvl("{uid}")')==1,f'desktop: click buys {uid}')
    E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear();openSheet('bld','peeler');TT.render()");pg.wait_for_timeout(300)
    sheet=E(pg,"document.getElementById('bpIo').innerText")
    ok('Peeler Knives' in sheet and '×2' in sheet and 'Lv 1/5' in sheet,f'Peeler sheet names the line ({sheet[-180:]!r})')
    pg.locator('#sheet').screenshot(path=shot_path('peeler-line.png'))
    pg.close()
    phones={'iPhone 13':'daylight','Pixel 7':'rfcure'}
    for dev,uid in phones.items():
        pg=page(dev);E(pg,SHOW);pg.wait_for_timeout(500)
        bt=pg.locator(f'.upg-card[data-id="{uid}"] button')
        if dev=='iPhone 13':
            bt.scroll_into_view_if_needed();pg.wait_for_timeout(200)
            E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
            pg.locator('#sheet').screenshot(path=shot_path('mobile-line-upgrades.png'))
        touch(pg,bt)
        if E(pg,f'upLvl("{uid}")')!=1: bt.tap();pg.wait_for_timeout(300)
        ok(E(pg,f'upLvl("{uid}")')==1,f'{dev}: tap buys {uid}')
        E(pg,"openSheet('bld','plymill');TT.render()" if uid=='daylight' else "openSheet('bld','glulam');TT.render()")
        pg.wait_for_timeout(300)
        txt=E(pg,"document.getElementById('bpIo').innerText")
        ok(('Daylight Press' if uid=='daylight' else 'RF Curing') in txt,f'{dev}: building sheet names the upgrade')
        pg.close()
    ok(not errs,'no console errors '+str(errs[:3]));ok(not missing,'no 404s '+str(missing[:3]));b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED');sys.exit(1 if FAILS else 0)
