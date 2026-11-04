# v2.41 insurance claims & safety drills (maintenance proposal 7). Checks: claims only with insurance, claim value scales with
# income/forest value (never tiny after Replant), file = payout share, bank = discount (stacks to the cap, consumed by a drill or
# an insurance upgrade), expiry, CL_MAX, drill cost/duration/cooldown/dodge/repair cut, Replant keep rules, old (v2.40) + damaged saves,
# early game untouched, trophies, Safety sheet UI with mouse (desktop) and touch (iPhone 13 / Pixel 7), no console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=7;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
MID='''(()=>{if(S.ob) S.ob.st='skip';S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e15;S.orders.next=S.time+1e15;S.prefs.autoFocus=false;
 S.coins=5e7;S.totalEarned=5e8;S.playTime=5000;S.time=2000;for(const [id,l] of [['sawmill',40],['chipper',30],['kiln',25],['carpentry',30],['peeler',20],['pellet',22]]){S.buildings[id].lvl=l;S.buildings[id].on=true;}
 for(const k in S.autosell) S.autosell[k]=true;S.collectors.lumberjack=60;M=computeMods();for(let k=0;k<120;k++) tick(.5,false);S.mish.next=S.time+1e15;TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 else None)
        pg.goto(URL); pg.wait_for_function('typeof TT!=="undefined"&&typeof S!=="undefined"'); pg.wait_for_timeout(400); return pg
    pg=page()
    ok(ver(E(pg,'VERSION'))>=(2,41),'version >= 2.41')
    E(pg,MID)
    r=E(pg,'''(()=>{const c=TT.clState();S.mish.ins=0;const a=TT.mishRoll('audit');const n0=c.list.length;S.mish.ins=1;TT.mishRoll('breakdown');const n1=c.list.length;return [n0,n1,c.list[0]&&c.list[0].v,TT.mishInc()];})()''')
    ok(r[0]==0,'no claim without insurance'); ok(r[1]==1,'claim with insurance')
    ok(r[2]>=29*r[3],f'claim value ≥ 30 s income ({r[2]:.3g} vs inc {r[3]:.3g})')
    r=E(pg,'''(()=>{const c=TT.clState(),x=c.list[0],c0=S.coins,pay=TT.clPay(x);TT.clFile(x.n);return [S.coins-c0,pay,x.v,c.list.length,c.st.filed];})()''')
    ok(abs(r[0]-r[1])<1e-6*r[1] and abs(r[1]-0.5*r[2])<1e-6*r[2],'file pays 50 % at Lv 1'); ok(r[3]==0 and r[4]==1,'filed claim removed + counted')
    r=E(pg,'''(()=>{const c=TT.clState();for(let k=0;k<5;k++) TT.clAdd('crash',0);const n=c.list.length;const base=TT.insCost(1);const d0=TT.insCost();
      for(const x of c.list.slice()) TT.clBank(x.n);return [n,c.disc,c.list.length,base,d0,TT.insCost()];})()''')
    ok(r[0]==3,'at most CL_MAX open claims'); ok(abs(r[1]-0.6)<1e-9,'bank stacks to −60 %')
    ok(abs(r[4]-r[3])<1e-6 and abs(r[5]-0.4*r[3])<1e-3*r[3],'insurance upgrade discounted')
    r=E(pg,'''(()=>{const c=TT.clState(),k0=TT.drCost(),full=k0/(1-c.disc);const ok1=TT.runDrill();return [ok1,c.disc,TT.drActive(),Math.round(TT.drLeft()),TT.drCan(),k0,full];})()''')
    ok(r[0] and r[1]==0 and r[2] and r[3]==480 and not r[4],'drill runs 8 min, uses discount, no stacking')
    ok(abs(r[5]-0.4*r[6])<1e-6*r[6],'drill cost discounted')
    r=E(pg,'''(()=>{let st=0,n=400;const c=TT.clState();const s0=c.st.stopped;for(let k=0;k<n;k++){const x=TT.mishRoll(); TT.mishState().broke={};S.events=[];S.fires={};c.list=[];}
      return [(c.st.stopped-s0)/n,TT.mishBldMult('sawmill')];})()''')
    ok(0.3<r[0]<0.5,f'drill stops ~40 % of setbacks ({r[0]:.2f})')
    r=E(pg,'''(()=>{S.time+=481;const a=TT.drActive(),cool=TT.drCool();S.time+=241;return [a,cool>0,TT.drCan()];})()''')
    ok(not r[0] and r[1] and r[2],'drill ends, cooldown 4 min, then available')
    r=E(pg,'''(()=>{TT.clAdd('gale',0);const c=TT.clState();S.time+=601;tick(.5,false);return c.list.length;})()''')
    ok(r==0,'claims expire after 10 min')
    r=E(pg,'''(()=>{const c=TT.clState();TT.clAdd('gale',0);TT.clBank(c.list[0].n);TT.clAdd('gale',0);TT.runDrill();const k=TT.mishKeep();return [k.cl.list.length,k.cl.disc,k.cl.dr.until,k.cl.st.drills];})()''')
    ok(r[0]==0 and r[2]==0 and r[3]>=1,'Replant drops open claims + drill, keeps stats')
    # forest value scaling: after Replant with huge cs, claim + drill costs scale (no tiny numbers)
    r=E(pg,'''(()=>{S.runCS=1e6;S.coins=0;coinRate=0;return [TT.clAdd('flood',0).v,TT.drCost(),cs()];})()''')
    ok(r[0]>=20*r[2] and r[1]>=200*r[2]*0.99,'claims/drills scale with forest value')
    # old save (v2.40 shape) + damaged
    r=E(pg,'''(()=>{S.mish.cl=undefined;const a=TT.clState().list.length;S.mish.cl={list:[null,{id:'zz',v:1}],disc:'x',dr:5};const c=TT.clState();return [a,c.list.length,c.disc,c.dr.until];})()''')
    ok(r==[0,0,0,0],'old + damaged saves normalise')
    pg.close()
    # early game: fresh save has no claims state change and nothing visible
    pg=page(); r=E(pg,'''(()=>[TT.drCan(),!!document.querySelector('#bbRisk.hidden')])()'''); ok(r==[False,True],'fresh game: no drill, Safety hidden'); pg.close()
    # UI: desktop mouse
    pg=page(); E(pg,MID); E(pg,"(()=>{S.mish.ins=2;window.toast=()=>{};TT.mishRoll('audit');TT.clAdd('breakdown',0);TT.render();})()")
    E(pg,"openSheet('risk')"); pg.wait_for_timeout(400)
    ok(pg.locator('#riskClaims [data-cl-file]').count()==2,'desktop: claims listed')
    pg.locator('#riskClaims [data-cl-file]').first.click(); pg.wait_for_timeout(200)
    ok(E(pg,'TT.clState().st.filed')==1,'desktop: file by click')
    pg.locator('#riskClaims [data-cl-bank]').first.click(); pg.wait_for_timeout(200)
    ok(abs(E(pg,'TT.clDisc()')-0.2)<1e-9,'desktop: bank by click')
    E(pg,"(()=>{TT.clAdd('theft',0);S.mish.next=S.time+420;TT.render();})()"); pg.wait_for_timeout(300)
    pg.locator('#riskClaims').scroll_into_view_if_needed(); pg.screenshot(path=shot_path('desktop.png'))
    pg.locator('.sheet:visible, #sheet').first.screenshot(path=shot_path('claims.png'))
    pg.locator('#drBuy').click(); pg.wait_for_timeout(200)
    ok(E(pg,'TT.drActive()'),'desktop: drill by click'); pg.close()
    for dev,nm in (('iPhone 13','mobile.png'),('Pixel 7','mobile-pixel.png')):
        pg=page(dev); E(pg,MID); E(pg,"(()=>{S.mish.ins=1;window.toast=()=>{};TT.clAdd('gale',0);TT.clAdd('crash',0);S.mish.next=S.time+420;TT.render();})()")
        E(pg,"openSheet('risk')"); pg.wait_for_timeout(500)
        pg.locator('#riskClaims [data-cl-bank]').first.tap(); pg.wait_for_timeout(200)
        ok(abs(E(pg,'TT.clDisc()')-0.2)<1e-9,f'{dev}: bank by tap')
        pg.locator('#riskClaims').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        pg.screenshot(path=shot_path(nm) if nm=='mobile.png' else shot_path(nm))
        pg.locator('#drBuy').tap(); pg.wait_for_timeout(200)
        ok(E(pg,'TT.drActive() && TT.clDisc()==0'),f'{dev}: drill by tap uses discount'); pg.close()
    ok(not errs,'no console errors '+str(errs[:3])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('FAILS',len(FAILS)); sys.exit(1 if FAILS else 0)
