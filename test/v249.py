# v2.49: the two checks that used to flake, pinned down.
# Log Yard: a tap on a full yard goes on as overflow, and with no sink it chops nothing. The live loop is frozen
# (test/_pace.py) so a tick cannot drain the yard between the setup and the tap.
# HUD: after step 1 of a project, the order card's progress row is one line, and the timer stays clear of 🔗.
# Desktop click, iPhone 13 / Pixel 7 touch. v2.39, v2.33, v2.24 and a damaged save still load.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ROOT,ver
from _pace import HOLD,ready,paint,HUD_LINE,FOREST
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};window.checkAch=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e9;S.fires={};S.fireCool=S.time+1e9;S.orders.next=S.time+1e9;S.orders.chNext=S.time+1e9;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.next=1e15;if(window.TT&&TT.obSkip)TT.obSkip();M=computeMods();})()"
# full yard, Chipper + plant present, forest stocked. Returns the tap result without depending on earlier levels.
CHOP=r'''(()=>{S.buildings.chipper.lvl=30;S.buildings.chipper.on=true;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';
  for(const [id,l] of [['sawmill',40],['kiln',25],['peeler',20],['pellet',22]]) if(S.buildings[id].lvl<l) S.buildings[id].lvl=l;
  M=computeMods();S.forest.m=1e9;S.forest.eff=1;S.res.chips=0;S.res.logs=logCap();ovfTap=0;chopOvf=false;scene.floats.length=0;
  const room=logCap()-S.res.logs,sink=ovfSinks();
  const n=chop(),f=!!chopOvf,t=ovfTap;tick(.5,false);
  const used=ovfLast.chip+ovfLast.pow,w=ovfLast.w;
  S.buildings.chipper.lvl=0;S.power.lvl=0;M=computeMods();S.forest.m=1e9;S.res.logs=logCap();const logs=S.res.logs;ovfTap=0;
  const n2=chop(),f2=!!chopOvf;
  S.buildings.chipper.lvl=30;S.buildings.chipper.on=true;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';M=computeMods();
  S.forest.m=1e9;S.forest.eff=1;S.res.logs=logCap();ovfTap=0;chopOvf=false;scene.floats.length=0;
  return {n,f,t,used,w,room,sink,n2,f2,logsSame:S.res.logs===logCap()};})()'''
ARM=r'''(()=>{S.buildings.chipper.lvl=30;S.buildings.chipper.on=true;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';M=computeMods();
  S.forest.m=1e9;S.forest.eff=1;S.res.logs=logCap();ovfTap=0;chopOvf=false;scene.floats.length=0;if(typeof closeSheet==='function') closeSheet();})()'''
READ=r'''(()=>{const fl=scene.floats.filter(x=>x.text&&String(x.text).indexOf('\u21aa')>=0);
  return {ovf:!!chopOvf,text:fl.length?String(fl[fl.length-1].text):'',room:Math.max(0,logCap()-S.res.logs)};})()'''
SETUP='''(()=>{S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",20);
  for(const [b,n] of [["sawmill",40],["chipper",20],["kiln",15],["peeler",15],["carpentry",20],["paper",12],["furniture",8]]) TT.buyBuilding(b,n);
  S.premium.lvl=1;S.coins=1e13;M=computeMods();for(let k=0;k<30;k++){S.forest.m=1e9;tick(1,false);}S.orders.done=Math.max(S.orders.done,3);S.orders.next=S.time+1e9;S.orders.chNext=S.time+1e9;if(S.ob) S.ob.st='skip';})()'''
CHAIN=r'''(()=>{S.orders.chNext=0;S.orders.offers=[];if(!(offerChain('library')||offerChain())) return null;acceptChain();
  const ch=S.orders.chain;let o=S.orders.acts.find(x=>x.ch===ch.id);S.autosell[o.item]=false;S.res[o.item]=o.amt*1.3;deliverFromStock(o.id);
  o=S.orders.acts.find(x=>x.ch===ch.id);o.got=o.amt*.45;S.res[o.item]=0;closeSheet();ordCardSig='';return {item:o.item,step:ch.step};})()'''
LONG=r'''(()=>{const o=S.orders.active;o.got=1.2345e7;o.amt=8.7654e7;o.ends=S.time+26*3600;ordCardSig='';})()'''
def line_ok(h,where,allow_clip=False):
    ok(h and '🔗2/3' in h['txt'] and h['one'] and h['h']<=20 and h['ws']=='nowrap' and h['fit'] and not h['tmClip'] and h['gap']>=-0.5 and (h['badge'] is None or h['badge']>=-0.5) and (h['fab'] is None or h['fab']>=-0.5) and (allow_clip or not h['gotClip']),
       f'{where}: HUD order line ({h})')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR,vp=None):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        elif vp: ctx=b.new_context(viewport=vp,service_workers='block',has_touch=True,is_mobile=True)
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(HOLD+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL,wait_until='domcontentloaded'); ready(pg); return pg
    pg=page(); E(pg,QUIET)
    ok(ver(E(pg,'TT.VERSION'))==(2,49),f"VERSION is 2.49 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and m.group(1)=='2.49','sw cache is v2.49')
    css=open(ROOT+'/css/style.css').read()
    ok('line-height:16px' in css and '#orderCard.active.chain{width:calc(100vw - 92px)' in css,'the order line is locked to one row, and the phone chain card keeps the FAB clearance')
    # ---------- rules, in one turn, then a real tap with the yard still full ----------
    r=E(pg,CHOP)
    ok(abs(r['room'])<1e-6 and r['sink']['chip'] and r['sink']['pow'],f"desktop tap setup: yard full and both sinks ({r['sink']})")
    ok(r['n']>0 and r['f'] and r['t']>=r['n']-1e-9 and r['used']>0 and r['used']+r['w']+1e-6>=r['n'],
       f"a tap on a full yard goes on as overflow ({r['n']:.1f} logs, next tick uses {r['used']:.1f})")
    ok(r['n2']==0 and r['f2'] is False, '…and with no sink a tap still finds the yard full (nothing chopped)')
    E(pg,ARM); xy=E(pg,FOREST); ok(bool(xy),'desktop: a forest cell is on screen')
    if xy: E(pg,"(xy)=>TT.sceneTapAt(xy[0],xy[1])",xy)
    tap=E(pg,READ)
    ok(tap['ovf'] and '\u21aa' in tap['text'] and tap['room']<1,f"desktop: a tap on the forest with a full yard still chops, and goes on as overflow ({tap})")
    # ---------- HUD line ----------
    E(pg,SETUP); paint(pg); ch=E(pg,CHAIN)
    ok(ch and ch['step']==1,f"desktop: step 2 of the project is the running order ({ch})")
    line_ok(E(pg,HUD_LINE),'desktop')
    E(pg,"(()=>{const f=document.getElementById('fxLayer');if(f)f.innerHTML='';if(scene.particles)scene.particles.length=0;if(scene.floats)scene.floats.length=0;})()")
    E(pg,'fitCamera(true)'); paint(pg); pg.screenshot(path=shot_path('desktop.png'))
    pg.locator('#orderCard').screenshot(path=shot_path('desktop-order.png'))
    E(pg,LONG); line_ok(E(pg,HUD_LINE),'desktop long amount',allow_clip=True)
    pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg,QUIET); E(pg,CHOP)
        ok(E(pg,"(()=>{S.buildings.chipper.lvl=30;S.power.lvl=3;S.power.on=true;S.power.logs='surplus';M=computeMods();S.forest.m=1e9;S.res.logs=logCap();return ovfSinks();})()")['chip'],f'{dev}: sinks restored')
        E(pg,ARM); xy=E(pg,FOREST); ok(bool(xy),f'{dev}: a forest cell is on screen')
        if xy: E(pg,"(xy)=>TT.sceneTapAt(xy[0],xy[1])",xy)
        tap=E(pg,READ)
        ok(tap['ovf'] and '\u21aa' in tap['text'],f'{dev}: a tap on the forest with a full yard still chops, and goes on as overflow ({tap})')
        E(pg,SETUP); paint(pg); ch=E(pg,CHAIN)
        ok(ch and ch['step']==1,f'{dev}: project step 2 ({ch})')
        h=E(pg,HUD_LINE); line_ok(h,dev)
        if dev=='iPhone 13':
            E(pg,"(()=>{const f=document.getElementById('fxLayer');if(f)f.innerHTML='';if(scene.particles)scene.particles.length=0;if(scene.floats)scene.floats.length=0;})()")
            E(pg,'fitCamera(true)'); paint(pg)
            pg.screenshot(path=shot_path('mobile.png')); pg.locator('#orderCard').screenshot(path=shot_path('mobile-order.png'))
        E(pg,LONG); line_ok(E(pg,HUD_LINE),dev+' long amount',allow_clip=True)
        pg.close()
    # landscape phone: the chain card follows the wide-layout width and the line still holds
    pg=page(vp={'width':844,'height':390}); E(pg,QUIET); E(pg,SETUP); paint(pg); E(pg,CHAIN)
    line_ok(E(pg,HUD_LINE),'landscape')
    pg.close()
    # ---------- older saves ----------
    pg=page(); E(pg,QUIET); E(pg,SETUP)
    E(pg,"(()=>{S.orders.chNext=0;offerChain();acceptChain();S.orders.chDone=2;})()")
    base=E(pg,"JSON.stringify(S)"); pg.close()
    cases=[
        ('v2.39 save','o.version="2.39";',lambda r: r['saw']>=40 and r['ok']),
        ('v2.33 save','o.version="2.33";for(const k of ["chain","chNext","chDone","chFailed","chEarned","chHist"]) delete o.orders[k];',lambda r: r['chain'] is None and r['cd']==0 and r['ok']),
        ('v2.24 save','o.version="2.24";const a=o.orders.acts[0];delete a.ch;o.orders={offer:null,active:a,next:(o.time||0)+50,done:7,failed:2,hist:[]};',lambda r: r['chain'] is None and r['plain']==1 and r['done']==7 and r['ok']),
        ('damaged','o.orders.chain={steps:"x",state:"run",step:9};o.orders.chDone="y";o.yardRun="x";o.power.logs="?";o.power.burn=null;',lambda r: r['chain'] is None and r['cd']==0 and r['ok'] and r['yard']==1),
    ]
    for name,mut,exp in cases:
        raw='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut)
        pg=page(init=raw); E(pg,QUIET)
        r=E(pg,"(()=>{const O=ordNorm();return {ok:isFinite(S.coins)&&isFinite(S.res.logs)&&isFinite(logCap()),saw:S.buildings.sawmill.lvl,chain:O.chain&&O.chain.state,cd:O.chDone,plain:O.acts.filter(x=>x.ch===undefined).length,done:O.done,yard:yardRun()};})()")
        ok(exp(r),f'{name}: loads ({r})')
        E(pg,"(()=>{S.forest.m=1e9;tick(1,false);TT.render();})()")
        ok(E(pg,"isFinite(S.coins)&&!!document.getElementById('hCoins')"),f'{name}: a tick still runs')
        pg.close()
    ok(not errs,'no console errors '+str(errs[:4])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
sys.exit(1 if FAILS else 0)
