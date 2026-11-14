# Bundle the classic scripts into js/game.js. GitHub Pages serves that file; there is no runtime build.
#   python3 tools/build_js.py
# One script, source order unchanged. Comments and the repeated 'use strict' directives are stripped.
# Names are not mangled: a minifier that folded expressions moved an early-game purchase.
import os, re
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES=['logic_a','logic_b','notify','stations','ui','premium','chains','world','seasonal','staff','staffsys','research','forest','power','mishaps','claims','builders','shipping','flow','advisor','overflow','spec','replant','scene1','sprites','chimney','forestveh','facade','input','scene2','scene3','scene4','scene5','marketfleet','scene6','declutter','scene7','scene8','scene9','scene10','scene11','scene12','scene13','staffworld','mobile','tiers','logistics','belts','drones','blueprint','onboard','main']
def main():
    missing=[s for s in SOURCES if not os.path.isfile(f'{R}/js/{s}.js')]
    if missing: raise SystemExit('missing '+', '.join(missing))
    parts=[]
    for s in SOURCES:
        t=open(f'{R}/js/{s}.js',encoding='utf-8').read()
        if t.startswith("'use strict';"): t=t[len("'use strict';"):]
        parts.append(t.strip())
    body="'use strict';\n"+'\n'.join(parts)+'\n'
    open(f'{R}/js/game.js','w',encoding='utf-8').write(
        '/* Timber Tycoon bundle. Built by tools/build_js.py — edit js/*.js, then rebuild. */\n'+body)
    idx=f'{R}/index.html'
    html=open(idx,encoding='utf-8').read()
    comment='<!-- TT-SOURCES: '+' '.join(f'js/{s}.js' for s in SOURCES)+' -->'
    html2,n=re.subn(r'<!-- TT-SOURCES:.*?-->', comment, html, count=1)
    if n!=1: raise SystemExit('index.html is missing the TT-SOURCES comment')
    if html2!=html: open(idx,'w',encoding='utf-8').write(html2)
    print('wrote js/game.js', len(body), 'bytes from', len(SOURCES), 'files')
if __name__=='__main__': main()
