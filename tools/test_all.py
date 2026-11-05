#!/usr/bin/env python3
"""Run every gameplay suite with a reproducible, load-aware schedule.

Four workers keep independent suites parallel. Browser/performance suites that have
flaked under CPU contention (including the 5-minute v28 long-session check) run one
at a time. Use --workers N to tune only the independent pool; --quick keeps the v28
checks but shortens its soak to 60 seconds. Logs and a JSON summary go to test/results/.
"""
import argparse,concurrent.futures,glob,json,os,subprocess,sys,time
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERIAL={'v20.py','v28.py','v224.py','v226.py','v231.py','v25.py','v2151.py','v2201.py','v232.py','v238.py','v239.py','v240.py','v245.py'}
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--workers',type=int,default=int(os.environ.get('TT_TEST_WORKERS','4')))
    ap.add_argument('--quick',action='store_true',help='60-second v28 soak instead of the full 300 seconds')
    ap.add_argument('--out',default=os.environ.get('TT_TEST_RESULTS',os.path.join(ROOT,'test','results')))
    a=ap.parse_args();os.makedirs(a.out,exist_ok=True)
    files=sorted(glob.glob(os.path.join(ROOT,'test','v*.py')))+[os.path.join(ROOT,'test','functional.py'),os.path.join(ROOT,'test','balance.py')]
    parallel=[f for f in files if os.path.basename(f) not in SERIAL]
    serial=[f for f in files if os.path.basename(f) in SERIAL]
    env=dict(os.environ)
    if a.quick:env['V28_LONG_SEC']='60'
    def run(f):
        t=time.monotonic();p=subprocess.run([sys.executable,f],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        name=os.path.basename(f);open(os.path.join(a.out,name+'.log'),'w').write(p.stdout)
        return {'file':name,'seconds':round(time.monotonic()-t,2),'code':p.returncode}
    started=time.monotonic();rows=[]
    print(f'{len(files)} suites: {len(parallel)} independent on {a.workers} workers, then {len(serial)} load-sensitive serially.',flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,a.workers)) as pool:
        futures=[pool.submit(run,f) for f in parallel]
        for f in concurrent.futures.as_completed(futures):
            r=f.result();rows.append(r);print(f"{r['file']:16} {r['seconds']:7.1f}s {'PASS' if r['code']==0 else 'FAIL'}",flush=True)
    print('Parallel pool finished; load-sensitive suites now run alone.',flush=True)
    for f in serial:
        r=run(f);rows.append(r);print(f"{r['file']:16} {r['seconds']:7.1f}s {'PASS' if r['code']==0 else 'FAIL'}",flush=True)
    rows.sort(key=lambda r:r['file']);wall=round(time.monotonic()-started,2);failed=[r['file'] for r in rows if r['code']]
    json.dump({'wallSeconds':wall,'workers':a.workers,'quick':a.quick,'serial':sorted(SERIAL),'suites':rows},open(os.path.join(a.out,'summary.json'),'w'),indent=2)
    print(f'\n{len(rows)-len(failed)}/{len(rows)} suites passed in {wall/60:.1f} min. Logs: {a.out}',flush=True)
    if failed:print('FAILED: '+', '.join(failed),flush=True)
    return 1 if failed else 0
if __name__=='__main__':sys.exit(main())
