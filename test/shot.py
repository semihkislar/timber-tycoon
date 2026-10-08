# screenshots: early / mid-game desktop / mobile / building sheet / v2.1 zoomed forest crew + trucks
import sys
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/lumber-idle/'
CLEAN='document.querySelectorAll(".toast,#fxLayer *").forEach(t=>t.remove());'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    jobs=[
        ('screenshot-early.png', {'width':1280,'height':800}, 45, None),
        ('screenshot.png', {'width':1280,'height':800}, 1500, None),
        ('screenshot-mobile.png', {'width':430,'height':900}, 1100, None),
        ('screenshot-sheet.png', {'width':430,'height':900}, 1100, 'sawmill'),
        ('screenshot-sheet-desktop.png', {'width':1280,'height':800}, 1500, 'kiln'),
        ('screenshot-forest.png', {'width':1280,'height':800}, 1500, '@forest'),
        ('screenshot-trucks.png', {'width':1280,'height':800}, 1500, '@trucks'),
    ]
    FOCUS={
      # zoom on the top forest work zone, centred on the axe/saw crew there
      '@forest':'''(()=>{const fp=TT.forestPeople().filter(q=>q.i+q.j<3&&q.type!=='crew');let i=-1,j=2;if(fp.length){i=fp.reduce((a,q)=>a+q.i,0)/fp.length;j=fp.reduce((a,q)=>a+q.j,0)/fp.length;}
        const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.7;const p=TT.P(i,j);c.x=c.tx=p[0];c.y=c.ty=p[1]+10;})()''',
      # zoom on the shipping dock + road with a truck loading at the bay and the next one queued
      '@trucks':'''(()=>{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.2);c.z=c.tz=2.1;const p=TT.P(28.6,18.6);c.x=c.tx=p[0];c.y=c.ty=p[1];})()''',
    }
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
