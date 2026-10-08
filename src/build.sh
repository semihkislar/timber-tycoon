#!/bin/bash
# Concatenates the source parts into the single self-contained game file.
# lumber-idle.html is a build artifact: edit src/* and re-run this script.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
cd "$D"
cat head.html logic_a.js logic_b.js ui.js premium.js scene1.js scene2.js scene3.js scene4.js scene5.js scene6.js scene7.js main.js > ../lumber-idle.html
wc -c ../lumber-idle.html
