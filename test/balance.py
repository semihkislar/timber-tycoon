import json,sys
from playwright.sync_api import sync_playwright
import os
URL=os.environ.get("URL","file:///workspace/lumber-idle/lumber-idle.html")
dur=int(sys.argv[1]) if len(sys.argv)>1 else 2400
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    errs=[]; pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
    r=pg.evaluate(f'runBot({dur},3,300)')
    for l in r['log']: print(l)
    for s in r['snaps']: print(json.dumps(s))
    print('errors',errs); b.close()
