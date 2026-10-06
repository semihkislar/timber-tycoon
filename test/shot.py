from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    jobs=[
        ('screenshot-early.png', {'width':1600,'height':1150}, 50),
        ('screenshot.png', {'width':1600,'height':1150}, 1400),
        ('screenshot-mobile.png', {'width':390,'height':1400}, 800),
    ]
    for name,vp,sec in jobs:
        ctx=b.new_context(viewport=vp, device_scale_factor=1); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(URL); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
        pg.evaluate(f'runBot({sec},3,{min(300,sec)})')
        pg.evaluate('TT.S.events=[]; TT.S.nextEvent=TT.S.time+999')
        pg.wait_for_timeout(2500)
        pg.evaluate('for(let i=0;i<3;i++) TT.chop(); TT.render(); window.scrollTo(0,0)')
        pg.wait_for_timeout(800)
        pg.screenshot(path='/workspace/lumber-idle/'+name, full_page=False)
        print(name, pg.evaluate('JSON.stringify({c:TT.S.coins,tree:TT.S.tree,b:Object.fromEntries(Object.entries(TT.bstat).map(([k,v])=>[k,+v.f.toFixed(2)]))})'))
        ctx.close()
    print('errs',errs); b.close()
