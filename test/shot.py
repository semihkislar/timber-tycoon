# screenshots: early / mid-game desktop / mobile / building sheet / v2.1 zoomed forest crew + trucks / v2.2 premium, order, storage
# v2.3: night, winter, autumn, rain (every shot pins the world clock + weather so results are deterministic)
# v2.4: fire + fire brigade, managers panel (desktop + mobile)
# v2.5: research tree, trade map, harbour (ship + train), R&D campus, mobile research
# v2.6: daily contracts sheet, contract office, mobile daily
# v2.7: planting crew among saplings/stumps + nursery greenhouse, depleted forest with warning
# v2.10: biomass power plant (day + night close-ups, phone with the power sheet)
import sys
from playwright.sync_api import sync_playwright
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/lumber-idle/'
CLEAN='document.querySelectorAll(".toast,#fxLayer *").forEach(t=>t.remove());'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    jobs=[
        ('screenshot-early.png', {'width':1280,'height':800}, 45, None),
        ('screenshot.png', {'width':1280,'height':800}, 2400, None),
        ('screenshot-sheet.png', {'width':430,'height':900}, 1100, 'sawmill'),
        ('screenshot-sheet-desktop.png', {'width':1280,'height':800}, 1500, 'kiln'),
        ('screenshot-forest.png', {'width':1280,'height':800}, 1500, '@forest'),
        ('screenshot-trucks.png', {'width':1280,'height':800}, 1500, '@trucks'),
        ('screenshot-premium.png', {'width':1280,'height':800}, 3000, '@premium'),
        ('screenshot-order.png', {'width':1280,'height':800}, 3000, '@order'),
        ('screenshot-storage.png', {'width':1280,'height':800}, 2400, '@storage'),
        ('screenshot-night.png', {'width':1280,'height':800}, 2400, '@night'),
        ('screenshot-winter.png', {'width':1280,'height':800}, 2400, '@winter'),
        ('screenshot-autumn.png', {'width':1280,'height':800}, 2400, '@autumn'),
        ('screenshot-rain.png', {'width':1280,'height':800}, 2400, '@rain'),
        ('screenshot-mobile-night.png', {'width':430,'height':900}, 1100, '@mnight'),
        ('screenshot-fire.png', {'width':1280,'height':800}, 2400, '@fire'),
        ('screenshot-fire-night.png', {'width':1280,'height':800}, 2400, '@firenight'),
        ('screenshot-managers.png', {'width':1280,'height':800}, 2400, '@staff'),
        ('screenshot-mobile-staff.png', {'width':430,'height':900}, 1500, '@mstaff'),
        ('screenshot-research.png', {'width':1280,'height':800}, 2400, '@research'),
        ('screenshot-trade.png', {'width':1280,'height':800}, 2400, '@trade'),
        ('screenshot-harbour.png', {'width':1280,'height':800}, 2400, '@harbour'),
        ('screenshot-campus.png', {'width':1280,'height':800}, 2400, '@campus'),
        ('screenshot-mobile-research.png', {'width':430,'height':900}, 2400, '@mres'),
        ('screenshot-daily.png', {'width':1280,'height':800}, 2400, '@daily'),
        ('screenshot-daily-office.png', {'width':1280,'height':800}, 2400, '@office'),
        ('screenshot-mobile-daily.png', {'width':430,'height':900}, 2400, '@mdaily'),
        ('screenshot-planters.png', {'width':1280,'height':800}, 2400, '@planters'),
        ('screenshot-depleted.png', {'width':1280,'height':800}, 1500, '@depleted'),
        ('screenshot-power.png', {'width':1280,'height':800}, 2400, '@power'),
        ('screenshot-power-night.png', {'width':1280,'height':800}, 2400, '@powernight'),
        ('screenshot-mobile-power.png', {'width':430,'height':900}, 2400, '@mpower'),
    ]
    D=420
    # (clock seconds, weather) per shot; default = spring, late morning, fair
    WORLD={'@night':(D*.93,'clear'),'@mnight':(D*.95,'snow',9),'@winter':(D*9+D*.46,'snow'),'@autumn':(D*6+D*.715,'wind'),'@rain':(D*1+D*.56,'rain'),'@firenight':(D*.95,'clear'),'@powernight':(D*.94,'clear')}
    def world(pg,sheet):
        c,w=WORLD.get(sheet,(D*.45,'clear'))[:2]; extra=WORLD.get(sheet,(0,0,0))[2] if len(WORLD.get(sheet,()))>2 else 0
        pg.evaluate(f"(()=>{{TT.setClock({c+extra*D});TT.setWeather('{w}',900);TT.S.wx.next=1e9;const v=TT.scene.wxv;for(const k in v) v[k]=0;if('{w}'!=='clear') v['{w}']=1;TT.scene.wet={1 if w=='rain' else 0};if('{sheet}' in {{'@night':1,'@winter':1,'@autumn':1,'@rain':1,'@mnight':1,'@research':1,'@trade':1,'@harbour':1,'@campus':1,'@mres':1,'@daily':1,'@office':1,'@mdaily':1}}){{TT.S.orders.active=null;TT.S.orders.offer=null;TT.S.orders.next=TT.S.time+999;TT.scene.orderEv=null;}}if(!'{sheet}'.startsWith('@fire')){{TT.S.fires={{}};TT.S.fireCool=TT.S.time+9999;}}}})()")
    FOCUS={
      # zoom on the top forest work zone, centred on the axe/saw crew there
      '@forest':'''(()=>{const fp=TT.forestPeople().filter(q=>q.i+q.j<3&&q.type!=='crew');let i=-1,j=2;if(fp.length){i=fp.reduce((a,q)=>a+q.i,0)/fp.length;j=fp.reduce((a,q)=>a+q.j,0)/fp.length;}
        const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.7;const p=TT.P(i,j);c.x=c.tx=p[0];c.y=c.ty=p[1]+10;})()''',
      # zoom on the shipping dock + road with a truck loading at the bay and the next one queued
      '@trucks':'''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.1;const p=TT.P(28.6,18.6);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
      '@night':'''(()=>{const c=TT.cam;c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.45);const p=TT.P(20,17,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
      '@winter':'''(()=>{TT.fitCamera(true);})()''',
      '@autumn':'''(()=>{const c=TT.cam;c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.3);const p=TT.P(10,10,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
      '@rain':'''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.8;const p=TT.P(16.5,16.5,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
      '@mnight':'''(()=>{TT.fitCamera(true);})()''',
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
    FOCUS['@fire']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.85;const L=TT.LOTS.kiln;const p=TT.P(L.ci+1.6,L.cj+.4,10);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''
    FOCUS['@firenight']=FOCUS['@fire']
    FOCUS['@staff']='''(()=>{TT.openSheet('staff');})()'''
    FOCUS['@mstaff']=FOCUS['@staff']
    MGR_SETUP='''(()=>{const c0=TT.S.coins,s0=TT.S.seeds;TT.S.coins=1e30;TT.S.seeds=1e4;TT.MANAGERS.forEach((m,i)=>{if(TT.hireMgr(m.id)) for(let k=0;k<(i*7)%9;k++) TT.levelMgr(m.id);});while(TT.stationLvl()<2) TT.buyStation();TT.S.coins=c0;TT.S.seeds=s0;TT.S.fireStats={n:7,tap:4};})()'''
    # v2.5: a mid-tree research state, all tech buildings, harbour Lv 3 with a ship + train loading
    TECH_SETUP='''(()=>{const c0=TT.S.coins,s0=TT.S.seeds;TT.S.coins=1e30;TT.S.seeds=1e4;if(TT.S.buildings.lab.lvl<3) TT.buyBuilding('lab',3-TT.S.buildings.lab.lvl);TT.S.rp=1e6;
      for(const id of ['science','blades','tar','pulp','bending','plywood','market','toys','logistics','boats']) TT.doResearch(id);TT.S.rp=740;
      while(TT.harborLvl()<3) TT.buyHarbor();for(const c of ['ist','ham','rot','dxb']) TT.openRoute(c);
      for(const [b,n] of [['plymill',10],['toyshop',2],['boatyard',1]]) if(TT.S.buildings[b].lvl<n) TT.buyBuilding(b,n-TT.S.buildings[b].lvl);
      TT.S.coins=c0;TT.S.seeds=s0;TT.simulate(10);TT.S.trade.fleet=[];TT.S.trade.spike={city:'dxb',good:'furniture',ends:TT.S.time+150};
      TT.dispatch('rot','pellets');TT.dispatch('dxb','furniture');TT.dispatch('ist','toys');TT.simulate(14);
      const sh=TT.S.trade.fleet.find(v=>v.city==='rot');if(sh) sh.got=Math.max(sh.got,sh.cap*.55);
      const sh2=TT.S.trade.fleet.find(v=>v.city==='dxb');if(sh2){sh2.got=Math.max(sh2.got,sh2.cap*.9);TT.departNow(sh2.id);sh2.t=7;}})()'''
    FOCUS['@research']='''(()=>{TT.openResearch();})()'''
    FOCUS['@mres']=FOCUS['@research']
    FOCUS['@trade']='''(()=>{TT.openTrade();})()'''
    FOCUS['@harbour']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.7;const p=TT.P(36.4,15.7,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''
    FOCUS['@campus']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.1;const p=TT.P(16.9,1.1,8);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''

    DAILY_SETUP='''(()=>{const c0=TT.S.coins;TT.S.coins=1e30;TT.S.totalEarned=Math.max(TT.S.totalEarned,5000);
      TT.S.daily={day:TT.dayKey(),offers:[],active:[],doneToday:1,streak:5,bestStreak:5,total:12,hist:[{item:"chairs",amt:40,reward:900,diff:"std",e:"🟡",ok:true,day:TT.dayKey()}],failedToday:0,_made:false};
      TT.makeDailyOffers();const id=TT.S.daily.offers[0].id;TT.acceptDaily(id);
      const a=TT.S.daily.active[0];a.got=a.amt*.45;TT.S.coins=c0;})()'''
    FOCUS['@daily']='''(()=>{TT.openDaily();})()'''
    FOCUS['@mdaily']=FOCUS['@daily']
    FOCUS['@planters']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.3;const p=TT.P(4.9,-4.5,6);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'''
    FOCUS['@depleted']='''(()=>{const c=TT.cam;c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.5);const p=TT.P(3,-1.5,0);c.x=c.tx=p[0];c.y=c.ty=p[1]+40;})()'''
    FOCUS['@office']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.85;const p=TT.P(24.2,24.5,8);c.x=c.tx=p[0];c.y=c.ty=p[1];TT.closeSheet();})()'''
    POWER_SETUP='''(()=>{const c0=TT.S.coins;TT.S.coins=1e30;while(TT.pwLvl()<7) if(!TT.buyPower()) break;TT.S.coins=c0;TT.simulate(12);})()'''
    FOCUS['@power']='''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=1.95;const p=TT.P(23.6,-2.6,24);c.x=c.tx=p[0];c.y=c.ty=p[1];TT.closeSheet();})()'''
    FOCUS['@powernight']=FOCUS['@power']
    FOCUS['@mpower']='''(()=>{TT.openSheet('power');TT.focusLot('power',true);})()'''
    import os
    ONLY=[x for x in os.environ.get('ONLY','').split(',') if x]
    for name,vp,sec,sheet in jobs:
        if ONLY and not any(o in name for o in ONLY): continue
        ctx=b.new_context(viewport=vp, device_scale_factor=1); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(300); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
        pg.evaluate(f'runBot({sec},3,{min(300,sec)})')
        pg.evaluate('TT.S.events=[]; TT.S.nextEvent=TT.S.time+999; TT.checkAch(true); TT.fitCamera(true)'); world(pg,sheet)
        pg.wait_for_timeout(2600)
        pg.evaluate(CLEAN)
        if sec<100: pg.evaluate('for(let i=0;i<4;i++) TT.chop()')
        else: pg.evaluate('TT.spawnGolden()')
        if sheet in ('@premium','@order','@night','@winter','@autumn','@rain'): pg.evaluate(PREM_SETUP); pg.wait_for_timeout(1500)
        if sheet=='@order':
            pg.evaluate("TT.S.orders.active=null;TT.S.orders.offer=null;TT.scene.client=null;TT.offerOrder('luxfurn')")
            for k in range(120):
                if pg.evaluate('!!TT.scene.client&&TT.scene.client.fig>=1'): break
                pg.wait_for_timeout(250)
            pg.evaluate("TT.S.orders.offer.expires=TT.S.time+70")
        if sheet in ('@fire','@firenight','@staff','@mstaff'): pg.evaluate(MGR_SETUP); pg.wait_for_timeout(600)
        if sheet in ('@research','@trade','@harbour','@campus','@mres'): pg.evaluate(TECH_SETUP); pg.wait_for_timeout(2500)
        if sheet in ('@daily','@office','@mdaily'): pg.evaluate(DAILY_SETUP); pg.wait_for_timeout(800)
        if sheet in ('@power','@powernight','@mpower'): pg.evaluate(POWER_SETUP); pg.wait_for_timeout(1500)
        if sheet=='@office': pg.evaluate('TT.closeSheet()')
        if sheet=='@planters':
            pg.evaluate('''(()=>{const c0=TT.S.coins;TT.S.coins=1e30;const need={planter:4,team:3,nursery:1,sdrone:2};for(const k in need) if((TT.S.planters[k]||0)<need[k]) TT.buyPlanter(k,need[k]-(TT.S.planters[k]||0));TT.S.coins=c0;
              let n=0;for(const t of TT.scene.dynTrees){const u=t.i+t.j,v=t.i-t.j;if(u<1&&v>2.5&&v<10.5){const r=(n++)%4;if(r===0){t.stump=1;t.grow=1;t.planted=false;}else if(r===1){t.stump=0;t.grow=.12+((n*37)%10)/40;}else if(r===2){t.stump=0;t.grow=.45+((n*13)%10)/22;}}}
              const st=TT.scene.dynTrees.filter(t=>t.stump>0&&t.i-t.j>5);TT.planterPeople().forEach((p,k)=>{if(p.kind==='nursery') return;const t=st[(k*2)%Math.max(1,st.length)];if(t){p.i=t.i-.9;p.j=t.j+.3;}p.st='find';p.tm=0;});})()''')
            pg.wait_for_timeout(4200); pg.evaluate(CLEAN)
        if sheet=='@depleted':
            pg.evaluate('''(()=>{const F=TT.S.forest;F.st+=F.m+F.y+F.s-3;F.m=1;F.y=1;F.s=1;F.warn=0;TT.S.planters={planter:0,team:0,nursery:0,sdrone:0};TT.S.orders.offer=null;TT.S.orders.next=TT.S.time+999;
              let n=0;for(const t of TT.scene.dynTrees){if(t.claim) continue;if((n++)%11){t.stump=1;t.grow=1;t.planted=false;}else{t.stump=0;t.grow=.16;}}})()''')
            pg.wait_for_timeout(1600)
        if sheet in ('@research','@mres'): pg.evaluate("TT.closeSheet()")
        if sheet=='@trade': pg.evaluate("(()=>{const v=TT.S.trade.fleet.find(v=>v.city==='dxb');if(v){v.state='out';v.t=v.trip*.3;}})()")
        if sheet in ('@fire','@firenight'):
            pg.evaluate("TT.S.fires={};TT.S.fireCool=0;TT.startFire('kiln');TT.S.fires.kiln.t=TT.S.fires.kiln.eta-7.3")
            for k in range(60):
                pg.evaluate("TT.S.fires.kiln&&(TT.S.fires.kiln.hp=11)")
                if pg.evaluate('!!TT.scene.ftruck&&TT.scene.ftruck.crew>=1'): break
                pg.wait_for_timeout(250)
            pg.evaluate("TT.S.fires.kiln.hp=60;TT.S.fires.kiln.t=Math.min(TT.S.fires.kiln.t,20)")
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
            pg.evaluate(FOCUS[sheet]); pg.wait_for_timeout(1400 if sheet in ('@forest','@mpower') else 300)
        elif sheet:
            pt=pg.evaluate(f'TT.lotScreen("{sheet}")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(900)
        else: pg.wait_for_timeout(700)
        pg.evaluate(CLEAN); world(pg,sheet); pg.wait_for_timeout(1200 if sheet in WORLD else 50); pg.evaluate(CLEAN)
        if sheet=='@depleted': pg.evaluate('TT.S.forest.warn=0'); pg.wait_for_timeout(900)
        if sheet in ('@fire','@firenight'): pg.evaluate("TT.S.fires.kiln.hp=12;TT.tapFire('kiln');TT.tapFire('kiln')"); pg.wait_for_timeout(250)
        pg.screenshot(path=OUT+name)
        print(name, pg.evaluate('JSON.stringify({c:Math.round(TT.S.coins),tree:TT.S.tree,sheet:TT.curSheet,b:Object.fromEntries(Object.entries(TT.S.buildings).map(([k,v])=>[k,v.lvl]))})'))
        ctx.close()
    print('errs',errs); b.close()
