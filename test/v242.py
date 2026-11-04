# v2.42 insurance prices scale with the game. Checks: early game pays the exact v2.26 ladder (150K / 1.5M / 15M), the ladder
# follows forest value cs() after a Replant (never tiny), and is at least INS_SEC seconds of this run's income late in a run;
# levels stay ordered, the no-claims discount still applies, insurance is kept through Replant, old (v2.41) + damaged saves load,
# the Safety sheet shows and charges the scaled price with mouse (desktop) and touch (iPhone 13 / Pixel 7), and the v2.26
# "Repair now ... runs again" root cause (a repaired building idle for want of inputs) is covered for every building.
# No console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=11;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
MID='''(()=>{if(S.ob) S.ob.st='skip';S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e15;S.orders.next=S.time+1e15;S.prefs.autoFocus=false;
 S.coins=5e7;S.totalEarned=5e8;S.playTime=5000;S.time=2000;for(const [id,l] of [['sawmill',40],['chipper',30],['kiln',25],['carpentry',30],['peeler',20],['pellet',22],['furniture',15],['paper',15]]){S.buildings[id].lvl=l;S.buildings[id].on=true;}
 for(const k in S.autosell) S.autosell[k]=true;S.collectors.lumberjack=60;M=computeMods();for(let k=0;k<120;k++) tick(.5,false);S.mish.next=S.time+1e15;TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); pg.wait_for_timeout(1300); return pg
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,42),f"VERSION >= 2.42 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,42),'sw cache bumped (>= v2.42)')
    # early game: exact v2.26 ladder
    r=E(pg,'''(()=>{const o=[];for(const inc of [0,50,800,7000]){coinRate=inc;o.push([0,1,2].map(l=>TT.insCost(l)));}return [o,cs()];})()''')
    ok(r[1]==1 and all(x==[150000,1500000,15000000] for x in r[0]),f'early game (income ≤ 7K/s): same prices as v2.26 {r[0][-1]}')
    # late in run 1: income floor
    r=E(pg,'''(()=>{coinRate=1e9;return [0,1,2].map(l=>TT.insCost(l));})()''')
    ok(r[0]>=20e9*0.999 and r[1]>=60e9*0.999 and r[2]>=180e9*0.999,f'late run: ≥ 20 s / 1 min / 3 min of income ({r})')
    ok(r[0]<r[1]<r[2],'levels stay ordered')
    # after Replant: forest value, income tiny right after the reset
    for csv in (50,675,1e6,1e12):
        r=E(pg,f'''(()=>{{S.runCS={csv};coinRate=0;return [cs(),[0,1,2].map(l=>TT.insCost(l)),TT.drCost()];}})()''')
        ok(all(abs(c/(150000*10**l*r[0])-1)<1e-9 for l,c in enumerate(r[1])),f'forest value ×{csv:g}: ladder ×cs ({r[1][0]:.3g} / {r[1][1]:.3g} / {r[1][2]:.3g})')
        ok(r[1][0]>=r[2],f'forest value ×{csv:g}: insurance never cheaper than a drill (no tiny numbers)')
    # every price is a finite positive number, also on weird states
    r=E(pg,'''(()=>{const o=[];for(const [c,i] of [[1,NaN],[0,0],[1e300,1e300]]){S.runCS=c;coinRate=i;o.push(TT.insCost(0),TT.insCost(2));}S.runCS=1;coinRate=0;return o.every(x=>isFinite(x)&&x>0);})()''')
    ok(r,'prices stay finite and positive on odd states')
    # discount still applies on top
    r=E(pg,'''(()=>{S.runCS=100;coinRate=0;S.mish.ins=1;const c=TT.clState();c.disc=.4;const a=TT.insCost(),bb=TT.insCost(1);c.disc=0;return [a,bb];})()''')
    ok(abs(r[0]-r[1]*0.6)<1e-6*r[1],'no-claims discount applies to the scaled price')
    # buying charges the scaled price; kept through Replant
    r=E(pg,'''(()=>{S.runCS=1000;coinRate=0;S.mish.ins=0;S.coins=1e8;const poor=TT.buyInsurance();const c=TT.insCost();S.coins=c*2;const y=TT.buyInsurance();return [poor,y,S.coins,c,TT.mishKeep().ins];})()''')
    ok(r[0] is False and r[1] and abs(r[2]-r[3])<1e-6*r[3] and r[4]==1,f'buy: refused at 1e8 with forest value ×1000, then pays {r[3]:.3g}; kept through Replant')
    # old v2.41 save + damaged mish state load
    E(pg,'''(()=>{S.runCS=1;coinRate=0;})()''')
    sv=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.41';o.mish.ins=2;o.runCS=40;return JSON.stringify(o);})()''')
    pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    r=E(pg,'''[S.mish.ins,cs(),TT.insCost(),TT.insCost()>=1.5e7*40*0.999]''')
    ok(r[0]==2 and r[1]==40 and r[3],f'v2.41 save loads: Lv 2 kept, next level priced with its forest value ({r[2]:.3g})')
    pg.close()
    dmg=json.dumps(json.dumps({'version':'2.41','coins':100,'mish':{'ins':'x','broke':None},'runCS':'abc'}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg,'''[S.mish.ins,isFinite(TT.insCost())&&TT.insCost()>0]'''); ok(r==[0,True],'damaged save: price still sane')
    pg.close()
    # flaky v2.26 root cause: Repair now makes the building run again whatever it is, once its inputs are there
    pg=page(); E(pg,MID)
    r=E(pg,'''(()=>{window.toast=()=>{};const bad=[];const ids=TT.mishBdCands?TT.mishBdCands().map(b=>b.id):mishBdCands().map(b=>b.id);
      for(const bid of ids){for(let i=0;i<3;i++){for(const k in S.mish.broke) delete S.mish.broke[k];
        for(const k in S.res) S.res[k]=(i===0&&k!=='logs')?0:S.res[k];   // first pass: starve inputs like the old test did
        S.mish.broke[bid]={left:80,dur:80};M=computeMods();tick(1,false);const f0=bstat[bid].f;S.coins=1e15;TT.mishRepair(bid);
        for(const k in BMAP[bid].inp) S.res[k]=Math.max(S.res[k],1e5);for(const k in BMAP[bid].out) S.res[k]=0;tick(1,false);
        if(f0!==0||!(bstat[bid].f>0)||S.mish.broke[bid]) bad.push([bid,i,f0,bstat[bid].f,bstat[bid].lim,JSON.stringify(BMAP[bid].in)]);}}return [ids.length,bad];})()''')
    ok(r[0]>=6 and not r[1],f'repaired buildings run again once fed ({r[0]} buildings × 3, bad {r[1][:3]})')
    pg.close()
    # UI: desktop mouse
    pg=page(); E(pg,MID); E(pg,"(()=>{window.toast=()=>{};S.runCS=500;coinRate=0;S.mish.ins=0;S.mish.next=S.time+420;S.coins=TT.insCost()*1.5;TT.render();})()")
    E(pg,"openSheet('risk')"); pg.wait_for_timeout(400)
    t=pg.locator('#insBuy').inner_text(); want=E(pg,'fmt(TT.insCost())')
    ok(want in t,f'desktop: button shows the scaled price {want} ({t.strip()[:60]})')
    pg.locator('#insBuy').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    pg.locator('.sheet:visible, #sheet').first.screenshot(path=shot_path('insurance.png'))
    c0=E(pg,'[TT.insCost(),S.coins]'); pg.locator('#insBuy').click(); pg.wait_for_timeout(200)
    r=E(pg,'[S.mish.ins,S.coins,S.mish.log.length]'); ok(r[0]==1 and r[1]<c0[1]-c0[0]*0.99+c0[0]*0.05,'desktop: buy by click charges the scaled price')
    E(pg,"TT.render()"); pg.wait_for_timeout(300); pg.screenshot(path=shot_path('desktop.png')); pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg,MID); E(pg,"(()=>{window.toast=()=>{};S.runCS=500;coinRate=0;S.mish.ins=1;S.mish.next=S.time+420;S.coins=TT.insCost()*1.2;TT.render();})()")
        E(pg,"openSheet('risk')"); pg.wait_for_timeout(500)
        pg.locator('#insBuy').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        bx=pg.locator('#insBuy').bounding_box(); vw=pg.viewport_size['width']
        ok(bx and bx['height']>=40 and bx['x']>=0 and bx['x']+bx['width']<=vw+1,f'{dev}: insurance button fits and is a touch target ({bx and round(bx["height"])} px)')
        if dev=='iPhone 13': pg.screenshot(path=shot_path('mobile.png'))
        c0=E(pg,'TT.insCost()'); pg.locator('#insBuy').tap(); pg.wait_for_timeout(200)
        r=E(pg,'S.mish.ins'); ok(r==2,f'{dev}: buy Lv 2 by tap'); pg.close()
    ok(not errs,'no console errors '+str(errs[:3])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED'); sys.exit(1 if FAILS else 0)
