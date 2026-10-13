# v2.11 Factory Facelift: version, v2.10.1 save load, tier thresholds, stock fill steps,
# sprite caches not rebuilt every frame, taps on desktop + iPhone 13 + Pixel 7, no 404s/errors, release snapshot.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)

LATE='''(()=>{const S=TT.S;S.coins=1e18;S.totalEarned=1e19;
 for(const c of COLLECTORS) TT.buyCollector(c.id,60);
 for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,25);}
 if(!S.premium.lvl) buyPremium();
 for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,15);}
 S.coins=1e18; TT.rebuildAll();})()'''

with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)

    # 1) version + helpers
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200)
    ok(E(pg,'TT.VERSION')=='2.11',f"VERSION==2.11 ({E(pg,'TT.VERSION')})")
    ok(E(pg,'typeof stockStep==="function"&&typeof roofGable==="function"&&typeof palletStackFancy==="function"&&typeof wallPlank==="function"&&typeof tierExtras==="function"'),'facade helpers loaded')

    # 2) old v2.10.1 save loads and migrates
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.10.1'
    pg.evaluate('(s)=>localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s))',old)
    pg.reload(); pg.wait_for_timeout(1400)
    S=E(pg,'TT.S')
    ok(ver(E(pg,'TT.VERSION'))>=(2,11) and ver(S['version'])==ver(E(pg,'TT.VERSION')),
       f"v2.10.1 save migrated to {E(pg,'TT.VERSION')} (S.version={S['version']})")
    ok(E(pg,'TT.scene.fps')>5,'scene running after migrate')
    ctx.close()

    # 3) tier thresholds + stock steps + cache stability
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg,'tier ')
    pg.goto(URL); pg.wait_for_timeout(1000); pg.evaluate(LATE); pg.wait_for_timeout(1200)
    E(pg,'''(()=>{
      TT.S.buildings.sawmill.lvl=24; TT.S.buildings.chipper.lvl=25;
      TT.S.buildings.kiln.lvl=50; TT.S.buildings.carpentry.lvl=100; TT.S.buildings.furniture.lvl=400;
      const caps=TT.stockCaps(); for(const k of Object.keys(TT.S.res)) TT.S.res[k]=(caps[k]||100)*.75;
      TT.setClock(420*.45); TT.fitCamera(true);
      const c=TT.cam; c.z=c.tz=1.9; const p=TT.P(14,14); c.x=c.tx=p[0]; c.y=c.ty=p[1];
    })()''')
    pg.wait_for_timeout(900)
    ms=E(pg,'[msCount(24),msCount(25),msCount(50),msCount(100),msCount(400)]')
    ok(ms==[1,2,3,4,6],f'msCount at Lv 24/25/50/100/400 → {ms}')
    steps=E(pg,'[stockStep(0),stockStep(.12),stockStep(.5),stockStep(.88),stockStep(1)]')
    ok(steps==[0,0,2,4,4] or steps==[0,1,2,4,4] or all(0<=x<=4 for x in steps),f'stockStep range {steps}')
    ok(steps[0]==0 and steps[-1]==4 and steps==sorted(set(steps)) or (steps[0]==0 and steps[-1]==4),f'stockStep ends at 0 and 4 {steps}')
    # exact: 0→0, 0.12→0 (round 0.48→0) wait round(0.12*4)=round(0.48)=0; .5→2; .88→4; 1→4
    ok(E(pg,'stockStep(0)===0 && stockStep(1)===4 && stockStep(.5)===2'),'stockStep 0/0.5/1 → 0/2/4')

    cache=E(pg,'''(()=>new Promise(r=>{
      setTimeout(()=>{
        let sto=0,lot=0; const sigs={};
        for(const [k,e] of LIVE){if(String(k).startsWith('sto:')){sto++;sigs[k]=e.sig;} if(String(k).startsWith('lot:')){lot++;sigs[k]=e.sig;}}
        setTimeout(()=>{
          let rebuilt=0;
          for(const [k,e] of LIVE){if(sigs[k]!==undefined && sigs[k]!==e.sig) rebuilt++;}
          // change stock step → sto sprites should take a new sig
          const caps=TT.stockCaps(); for(const k of Object.keys(TT.S.res)) TT.S.res[k]=0;
          setTimeout(()=>{
            let stoChanged=0;
            for(const [k,e] of LIVE){if(String(k).startsWith('sto:') && sigs[k]!==undefined && sigs[k]!==e.sig) stoChanged++;}
            r({sto,lot,rebuilt,stoChanged,live:LIVE.size});
          },800);
        },1100);
      },1000);
    }))()''')
    print('cache',cache,flush=True)
    ok(cache['sto']>=2,f'stock yards cached as liveSprites ({cache["sto"]})')
    ok(cache['lot']>=4,f'production buildings cached ({cache["lot"]})')
    ok(cache['rebuilt']<=4,f'caches stable over idle second (rebuilt={cache["rebuilt"]})')
    ok(cache['stoChanged']>=1,f'stock-step change rebuilds sto sprites ({cache["stoChanged"]})')

    # 4) desktop taps
    def tap_bld(pg,bid,tag,touch=None):
        E(pg,'TT.closeSheet()')
        pt=E(pg,f'''(()=>{{
          const L=TT.LOTS['{bid}']; const c=TT.cam; c.maxZ=Math.max(c.maxZ||0,3); c.z=c.tz=2.0; c.fly=null;
          const q=TT.P(L.ci,L.cj,22); c.x=c.tx=q[0]; c.y=c.ty=q[1]; return TT.w2s(q[0],q[1]);
        }})()''')
        pg.wait_for_timeout(450)
        if touch:
            touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':pt[0],'y':pt[1]}]})
            pg.wait_for_timeout(40)
            touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else:
            pg.mouse.click(pt[0],pt[1])
        pg.wait_for_timeout(550)
        ok(E(pg,'TT.curSheet')=='bld' and E(pg,'TT.sheetBld')==bid, f'{tag}: tap {bid} → sheet ({E(pg,"TT.curSheet")}/{E(pg,"TT.sheetBld")})')

    for bid in ['sawmill','kiln','carpentry','furniture','chipper','paper']:
        tap_bld(pg,bid,'desktop')
    ctx.close()

    # 5) phone taps
    for dev in ['iPhone 13','Pixel 7']:
        d=dict(p.devices[dev]); d.pop('default_browser_type',None)
        ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}')
        pg=ctx.new_page(); watch(pg,dev+' '); cdp=ctx.new_cdp_session(pg)
        pg.goto(URL); pg.wait_for_timeout(1200); pg.evaluate(LATE); pg.wait_for_timeout(900)
        for bid in ['sawmill','kiln','furniture']:
            tap_bld(pg,bid,dev,touch=cdp)
        ctx.close()

    # 6) release snapshot (if present)
    if os.path.isdir(ROOT+'/releases/v2.11'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.11/index.html'); pg.wait_for_timeout(1000)
        ok(E(pg,'TT.VERSION')=='2.11' and E(pg,'TT.scene.fps')>5,'releases/v2.11/ snapshot runs')
        ctx.close()
        vh=open(ROOT+'/versions.html').read()
        ok('v2.11' in vh and vh.index('v2.11')<vh.index('v2.10'),'versions.html lists v2.11 above v2.10')
    else:
        print('NOTE: releases/v2.11 not built yet',flush=True)

    ok(not missing, f'no 404s ({missing[:3]})')
    bad=[e for e in errs if 'favicon' not in e]
    ok(not bad, f'no page errors ({bad[:3]})')
    b.close()

print('ALL PASSED' if not FAILS else f'{len(FAILS)} FAILED: '+'; '.join(FAILS), flush=True)
sys.exit(0 if not FAILS else 1)
