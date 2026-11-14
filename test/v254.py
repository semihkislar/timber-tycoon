# v2.54: the shipped bundle matches the sources. tools/build_js.py --check passes on a clean
# tree and writes nothing. In a temporary copy of the tree, the same check fails when a source
# changes, and again when only the TT-SOURCES comment changes. The real tree is not modified.
import os, shutil, subprocess, sys, tempfile
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def run_check(root):
    return subprocess.run([sys.executable, os.path.join(root,'tools','build_js.py'), '--check'],
        cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
def read(path):
    return open(path,encoding='utf-8').read()
def snapshot(root):
    return read(os.path.join(root,'js','game.js')), read(os.path.join(root,'index.html'))
logic=read(os.path.join(ROOT,'js','logic_a.js'))
sw=read(os.path.join(ROOT,'sw.js'))
ok("const VERSION='2.54'" in logic, 'VERSION is 2.54')
ok("timber-tycoon-v2.54" in sw, 'service-worker cache is timber-tycoon-v2.54')
before=snapshot(ROOT)
r=run_check(ROOT)
ok(r.returncode==0, f'clean tree: --check passes ({r.stdout.strip()[:160]})')
ok(snapshot(ROOT)==before, '--check writes nothing on the clean tree')
# A temporary copy, not the working tree. releases/ and screenshots/ are not inputs of the build.
tmp=tempfile.mkdtemp(prefix='tt-v254-')
try:
    def ignore(dir, names):
        base=os.path.basename(dir)
        if dir==ROOT: return [n for n in names if n in ('.git','releases','screenshots')]
        if base=='test' and 'results' in names: return ['results']
        return [n for n in names if n=='__pycache__' or n.endswith('.pyc')]
    copy=os.path.join(tmp,'repo')
    shutil.copytree(ROOT, copy, ignore=ignore)
    ok(os.path.isfile(os.path.join(copy,'tools','build_js.py')) and os.path.isfile(os.path.join(copy,'js','drones.js')),
       'temporary copy has the build and the sources')
    cr=run_check(copy)
    ok(cr.returncode==0, 'temporary copy: --check passes before any edit')
    src=os.path.join(copy,'js','drones.js')
    game=os.path.join(copy,'js','game.js')
    idx=os.path.join(copy,'index.html')
    src_bytes, game_bytes, idx_bytes=read(src), read(game), read(idx)
    with open(src,'a',encoding='utf-8') as f: f.write('\n/* bundle-sync probe */\n')
    fr=run_check(copy)
    msg=fr.stdout
    ok(fr.returncode!=0 and 'js/game.js' in msg, f'changed source: --check fails and names js/game.js (exit {fr.returncode})')
    ok(read(game)==game_bytes and read(idx)==idx_bytes and read(src)!=src_bytes,
       'changed source: --check did not rewrite the bundle or the page')
    open(src,'w',encoding='utf-8').write(src_bytes)
    open(idx,'w',encoding='utf-8').write(idx_bytes.replace('js/drones.js','js/drones-stale.js',1))
    gr=run_check(copy)
    ok(gr.returncode!=0 and 'TT-SOURCES' in gr.stdout, f'TT-SOURCES comment: --check fails and names it (exit {gr.returncode})')
    ok(read(game)==game_bytes and 'js/drones-stale.js' in read(idx),
       'TT-SOURCES comment: --check left the edited page in place')
    # release.py rebuilds, then refuses to snapshot if the bundle still differs.
    # The stand-in build leaves the sources and the bundle apart on purpose.
    for rel in ('js/drones.js','js/game.js','index.html','js/logic_b.js'):
        shutil.copy(os.path.join(ROOT,rel), os.path.join(copy,rel))
    real=os.path.join(copy,'tools','build_js.py')
    os.rename(real, os.path.join(copy,'tools','build_js_real.py'))
    open(real,'w',encoding='utf-8').write(
        'import os,runpy,sys\n'
        'here=os.path.dirname(os.path.abspath(__file__))\n'
        'real=os.path.join(here,"build_js_real.py")\n'
        'if "--check" in sys.argv[1:]:\n'
        '    sys.argv=[real]+sys.argv[1:]\n'
        '    runpy.run_path(real, run_name="__main__")\n'
        'else:\n'
        '    p=os.path.join(here,"..","js","logic_b.js")\n'
        '    t=open(p,encoding="utf-8").read()\n'
        '    if "/* release-sync probe */" not in t:\n'
        '        open(p,"a",encoding="utf-8").write("\\n/* release-sync probe */\\n")\n'
        '    print("build left the bundle stale on purpose")\n')
    versions=os.path.join(copy,'versions.html')
    versions_before=read(versions) if os.path.isfile(versions) else None
    rel=subprocess.run([sys.executable, os.path.join(copy,'tools','release.py')],
        cwd=copy, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    ok(rel.returncode!=0 and 'refusing to snapshot' in rel.stdout,
       f'release.py refuses a bundle that still differs (exit {rel.returncode})')
    ok(not os.path.isdir(os.path.join(copy,'releases')),
       'refusing to snapshot wrote no releases/ directory')
    ok((read(versions) if os.path.isfile(versions) else None)==versions_before,
       'refusing to snapshot left versions.html alone')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
ok(snapshot(ROOT)==before, 'the working tree is unchanged')
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
sys.exit(1 if FAILS else 0)
