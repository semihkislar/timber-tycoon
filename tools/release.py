# Release helper for the multi-file layout (v2.8+).
#   python3 tools/release.py           -> snapshot the current game into releases/v<VERSION>/ and regenerate versions.html
# The snapshot is a full, self-contained copy (index.html + css/ + js/ + assets/), so every release stays playable.
# Releases up to v2.7 are single files (releases/timber-tycoon-vX.Y.html) and are left untouched.
import os,re,shutil
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver=re.search(r"const VERSION='([\d.]+)'",open(R+'/js/logic_a.js').read()).group(1)
dst=f'{R}/releases/v{ver}'
shutil.rmtree(dst,ignore_errors=True); os.makedirs(dst)
shutil.copy(R+'/index.html',dst+'/index.html')
for d in ('css','js','assets'): shutil.copytree(f'{R}/{d}',f'{dst}/{d}')
# versions.html: every release, newest first
rel={}
for f in os.listdir(R+'/releases'):
    m=re.fullmatch(r'timber-tycoon-v([\d.]+)\.html',f)
    if m: rel[m.group(1)]=f'releases/{f}'
    m=re.fullmatch(r'v([\d.]+)',f)
    if m and os.path.isfile(f'{R}/releases/{f}/index.html'): rel[m.group(1)]=f'releases/{f}/'
key=lambda v: tuple(int(x) for x in v.split('.'))
items='\n'.join(f'<li><a href="{rel[v]}">v{v}</a></li>' for v in sorted(rel,key=key,reverse=True))
html=open(R+'/versions.html').read()
html=re.sub(r'(<ul>\n).*?(\n</ul>)',lambda m: m.group(1)+items+m.group(2),html,flags=re.S)
open(R+'/versions.html','w').write(html)
print('snapshot',dst,'| versions:',', '.join(sorted(rel,key=key,reverse=True)[:4]),'...')
