# v2.45: Fire Station prices follow forest value and income (early game unchanged), and the checked-in
# four-worker test runner keeps load-sensitive suites serial. Desktop mouse + iPhone/Pixel touch, old and
# damaged saves, no console errors / 404s. Release shots go through test/shots.py.
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
SETUP='''(()=>{if(S.ob)S.ob.st='skip';S.coins=1e12;S.totalEarned=1e12;S.playTime=4000;S.time=1000;S.prefs.autoFocus=false;
 TT.buyBuilding('kiln',5);S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;
 if(S.mish)S.mish.next=S.time+1e6;M=computeMods();for(let i=0;i<30;i++)tick(.5,false);if(typeof ntClear==='function')ntClear();TT.render();})()'''
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
    ok(ver(E(pg,'TT.VERSION'))>=(2,45),f"VERSION >= 2.45 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read());ok(m and ver(m.group(1))>=(2,45),'service-worker cache bumped')
    r=E(pg,"(()=>{S.runCS=1;const o=[];for(const inc of [0,10,500,3000]){coinRate=inc;if(S.staff)S.staff.incRef=0;o.push([0,1,2,3,4].map(l=>stationCost(l)));}return [o,cs()];})()")
    base=[60000*6**i for i in range(5)]
    ok(r[1]==1 and all(x==base for x in r[0]),f'early game: exact old 60K ×6 ladder at low income ({r[0][0]})')
    r=E(pg,"(()=>{S.runCS=1;coinRate=1e8;return [0,1,2,3,4].map(l=>stationCost(l));})()")
    ok(all(r[i]>=[15,45,120,300,600][i]*1e8*.999 for i in range(5)),f'late run: each level has its income floor ({r})')
    ok(all(r[i]<r[i+1] for i in range(4)),'scaled levels stay ordered')
    for csv in (50,675,1e6,1e12):
        r=E(pg,f"(()=>{{S.runCS={csv};coinRate=0;return [cs(),[0,1,2,3,4].map(l=>stationCost(l))];}})()")
        ok(all(abs(r[1][i]/(base[i]*r[0])-1)<1e-9 for i in range(5)),f'forest value ×{csv:g}: no tiny post-Replant prices')
    r=E(pg,"(()=>{const o=[];for(const [c,i] of [[1,NaN],[0,0],[1e300,1e300]]){S.runCS=c;coinRate=i;o.push(stationCost(0),stationCost(4));}S.runCS=1;coinRate=0;return [o.every(x=>isFinite(x)&&x>0),stationCost(99)===stationCost(4)];})()")
    ok(r==[True,True],'odd states stay finite and positive; max-level price clamps safely')
    r=E(pg,"(()=>{S.runCS=1000;coinRate=0;S.station.lvl=0;S.coins=1e7;const poor=buyStation(),c=stationCost();S.coins=c*2;const yes=buyStation();return [poor,yes,S.coins,c,S.station.lvl];})()")
    ok(r[0] is False and r[1] and abs(r[2]-r[3])<1e-5*r[3] and r[4]==1,f'buy refuses too little, then charges the scaled price ({r[3]:.3g})')
    # Old saves retain their station level; only the next price changes.
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.44';o.station={lvl:3};o.runCS=40;return JSON.stringify(o);})()");pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    ok(E(pg,'[S.station.lvl,cs(),stationCost()>=60000*Math.pow(6,3)*40*.999]')==[3,40,True],'v2.44 save loads with its level and scaled next price');pg.close()
    dmg=json.dumps(json.dumps({'version':'2.44','coins':100,'station':{'lvl':'bad'},'runCS':'bad'}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    ok(E(pg,'isFinite(stationCost())&&stationCost()>0'),'damaged save still gets a sane station price');pg.close()
    # Desktop: visible explanation and real click purchase.
    pg=page();E(pg,SETUP);E(pg,"S.runCS=500;coinRate=0;S.coins=stationCost()*2;openSheet('staff');TT.render()");pg.wait_for_timeout(400)
    want=E(pg,'fmt(stationCost())');text=pg.locator('#stnBuy').inner_text()
    ok(want in text,f'desktop: button shows scaled price {want}')
    ok('forest value and income' in pg.locator('#stnEco').inner_text(),'desktop: price rule explained')
    c0=E(pg,'[stationCost(),S.coins]');pg.locator('#stnBuy').click();pg.wait_for_timeout(200)
    ok(E(pg,'S.station.lvl')==1 and E(pg,'S.coins')<c0[1]-c0[0]*.99,'desktop: click buys and charges the scaled price')
    E(pg,"S.runCS=500;coinRate=0;S.coins=stationCost()*1.2;TT.render()");pg.wait_for_timeout(200)
    E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()");pg.wait_for_timeout(150);pg.locator('#sheet').screenshot(path=shot_path('fire-station-pricing.png'));pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev);E(pg,SETUP);E(pg,"S.runCS=500;coinRate=0;S.coins=stationCost()*1.2;openSheet('staff');TT.render()");pg.wait_for_timeout(400)
        bx=pg.locator('#stnBuy').bounding_box();vw=pg.viewport_size['width']
        ok(bx and bx['height']>=44 and bx['x']>=0 and bx['x']+bx['width']<=vw+1,f'{dev}: price button fits and is a touch target')
        if dev=='iPhone 13':
            E(pg,"document.querySelectorAll('#fxLayer,.toast').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()");pg.wait_for_timeout(150);pg.locator('#sheet').screenshot(path=shot_path('mobile-fire-station.png'))
        pg.locator('#stnBuy').tap();pg.wait_for_timeout(200);ok(E(pg,'S.station.lvl')==1,f'{dev}: tap builds at the scaled price');pg.close()
    ok(not errs,'no console errors '+str(errs[:3]));ok(not missing,'no 404s '+str(missing[:3]));b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED');sys.exit(1 if FAILS else 0)
