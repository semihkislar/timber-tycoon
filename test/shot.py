# screenshots: early / mid-game desktop / mobile / building sheet / v2.1 zoomed forest crew + trucks / v2.2 premium, order, storage
import sys
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/lumber-idle/'
CLEAN='document.querySelectorAll(".toast,#fxLayer *").forEach(t=>t.remove());'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    jobs=[
        ('screenshot-early.png', {'width':1280,'height':800}, 45, None),
        ('screenshot.png', {'width':1280,'height':800}, 2400, None),
        ('screenshot-mobile.png', {'width':430,'height':900}, 1100, None),
        ('screenshot-sheet.png', {'width':430,'height':900}, 1100, 'sawmill'),
        ('screenshot-sheet-desktop.png', {'width':1280,'height':800}, 1500, 'kiln'),
        ('screenshot-forest.png', {'width':1280,'height':800}, 1500, '@forest'),
        ('screenshot-trucks.png', {'width':1280,'height':800}, 1500, '@trucks'),
        ('screenshot-premium.png', {'width':1280,'height':800}, 3000, '@premium'),
        ('screenshot-order.png', {'width':1280,'height':800}, 3000, '@order'),
        ('screenshot-storage.png', {'width':1280,'height':800}, 2400, '@storage'),
    ]
    FOCUS={
      # zoom on the top forest work zone, centred on the axe/saw crew there
      '@forest':'''(()=>{const fp=TT.forestPeople().filter(q=>q.i+q.j<3&&q.type!=='crew');let i=-1,j=2;if(fp.length){i=fp.reduce((a,q)=>a+q.i,0)/fp.length;j=fp.reduce((a,q)=>a+q.j,0)/fp.length;}
        const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.7;const p=TT.P(i,j);c.x=c.tx=p[0];c.y=c.ty=p[1]+10;})()''',
      # zoom on the shipping dock + road with a truck loading at the bay and the next one queued
      '@trucks':'''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.1;const p=TT.P(28.6,18.6);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
    }
    # v2.2: make sure every luxury workshop exists for the premium close-up
    PREM_SETUP='''(()=>{const c0=TT.S.coins;TT.S.coins=1e30;if(!TT.S.premium.lvl)TT.buyPremium();while(TT.S.premium.lvl<3)TT.buyPremium();for(const b of TT.PREM_BLD) if(TT.S.buildings[b.id].lvl<3) TT.buyBuilding(b.id,3-TT.S.buildings[b.id].lvl);
      TT.simulate(3);const PROD={};for(const b of TT.BUILDINGS) for(const k in b.out) PROD[k]=PROD[k]||b.id;
      for(let it=0;it<60;it++){let any=false;for(const b of TT.BUILDINGS){const bs=TT.bstat[b.id];if(!TT.S.buildings[b.id].lvl||bs.f>.97||!bs.lim) continue;any=true;
          if(bs.lim==='logs') for(const c of ['lumberjack','chainsaw','truck','harvester','drone','heli']) TT.buyCollector(c,2); else TT.buyBuilding(PROD[bs.lim],2);}
        if(!any) break;TT.simulate(2);}
      TT.S.coins=c0;TT.simulate(8);})()'''
    FOCUS['@premium']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.75;const p=TT.P(25.2,5.6,14);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''
    FOCUS['@order']='''(()=>{const c=TT.cam;c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.55);const p=TT.P(25.5,4.2,10);c.x=c.tx=p[0]-60;c.y=c.ty=p[1]+30;})()'''
    FOCUS['@storage']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.9;const L=TT.LOTS.kiln;const p=TT.P(L.ci-.2,L.cj+.6,10);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''
    for name,vp,sec,sheet in jobs:
        ctx=b.new_context(viewport=vp, device_scale_factor=1); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(300); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
        pg.evaluate(f'runBot({sec},3,{min(300,sec)})')
        pg.evaluate('TT.S.events=[]; TT.S.nextEvent=TT.S.time+999; TT.checkAch(true); TT.fitCamera(true)')
        pg.wait_for_timeout(2600)
        pg.evaluate(CLEAN)
        if sec<100: pg.evaluate('for(let i=0;i<4;i++) TT.chop()')
        else: pg.evaluate('TT.spawnGolden()')
        if sheet in ('@premium','@order'): pg.evaluate(PREM_SETUP); pg.wait_for_timeout(1500)
        if sheet=='@order':
            pg.evaluate("TT.S.orders.active=null;TT.S.orders.offer=null;TT.scene.client=null;TT.offerOrder('luxfurn')")
            for k in range(120):
                if pg.evaluate('!!TT.scene.client&&TT.scene.client.fig>=1'): break
                pg.wait_for_timeout(250)
            pg.evaluate("TT.S.orders.offer.expires=TT.S.time+70")
        if sheet=='@storage':
            # stockpile charcoal & chairs (auto-sell off) until the kiln yard is full; bigger racks on a few buildings
            pg.evaluate('''(()=>{const c0=TT.S.coins;TT.S.coins=1e30;for(let k=0;k<3;k++)TT.buyStorage('kiln');for(let k=0;k<5;k++)TT.buyStorage('sawmill');for(let k=0;k<2;k++)TT.buyStorage('chipper');TT.S.coins=c0;
              TT.S.orders.active=null;TT.S.orders.offer=null;TT.S.orders.next=TT.S.time+999;TT.S.autosell.charcoal=false;TT.S.res.charcoal=TT.stockCaps().charcoal;TT.S.autosell.chips=false;TT.S.res.chips=TT.stockCaps().chips*.7;TT.simulate(2);})()''')
            pg.wait_for_timeout(1200)
        if sheet and sheet.startswith('@'):
            if sheet=='@trucks':
                for k in range(80):
                    if pg.evaluate('TT.vehicles().dock.some(d=>d.li===3&&d.load>.35)'): break
                    pg.wait_for_timeout(250)
            pg.evaluate(FOCUS[sheet]); pg.wait_for_timeout(1400 if sheet=='@forest' else 300)
        elif sheet:
            pt=pg.evaluate(f'TT.lotScreen("{sheet}")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(900)
        else: pg.wait_for_timeout(700)
        pg.evaluate(CLEAN)
        pg.screenshot(path=OUT+name)
        print(name, pg.evaluate('JSON.stringify({c:Math.round(TT.S.coins),tree:TT.S.tree,sheet:TT.curSheet,b:Object.fromEntries(Object.entries(TT.S.buildings).map(([k,v])=>[k,v.lvl]))})'))
        ctx.close()
    print('errs',errs); b.close()
