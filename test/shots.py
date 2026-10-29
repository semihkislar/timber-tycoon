# Screenshot output paths. Every screenshot lives under screenshots/ (never in the repo root):
#   screenshots/history/v<X.Y>/<name>.png   release shots (desktop.png, mobile.png, <feature>.png, desktop-<feature>.png ...)
#   screenshots/highlights/<name>.png       curated shots used by README.md (refresh with test/shot_highlights.py)
# Usage:  from shots import shot_dir, shot_path
#         shot_path('desktop.png')            -> <repo>/screenshots/history/v<current VERSION>/desktop.png
#         shot_dir('2.31')                    -> <repo>/screenshots/history/v2.31/  (created, trailing slash)
import os,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS=os.path.join(ROOT,'screenshots')
def version():
    src=open(os.path.join(ROOT,'js','logic_a.js'),encoding='utf-8').read()
    return re.search(r"VERSION\s*=\s*['\"]([^'\"]+)",src).group(1)
def shot_dir(ver=None):
    ver=(ver or version()).lstrip('v')
    d=os.path.join(SHOTS,'history','v'+ver); os.makedirs(d,exist_ok=True); return d+'/'
def shot_path(name,ver=None): return shot_dir(ver)+name
def highlight_path(name):
    d=os.path.join(SHOTS,'highlights'); os.makedirs(d,exist_ok=True); return os.path.join(d,name)
if __name__=='__main__': print(version(), shot_dir())
