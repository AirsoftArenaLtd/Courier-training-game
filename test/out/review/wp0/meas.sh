# WP0 measurement pass: every scene, uncapped frame cost (bench.js) + a half-size screenshot.
#   source meas.sh; meas <tag>        -> test/out/review/wp0/bench-<tag>.txt and shots <tag>-<scene>.png
P=localhost:9310
D="/c/Users/Luke Nelson/Desktop/fedex training game/test/out/review/wp0"
ev() { curl -s -X POST --data-binary "$1" "$P/eval"; echo; }
evw() { curl -s -X POST --data-binary "$1" "$P/eval?wake=1"; echo; }
evf() { curl -s -X POST --data-binary @"$1" "$P/eval"; echo; }
op() { curl -s "$P/open?url=index.html%3Fscenario%3D$1%26dev%3D1&ms=${2:-3000}" > /dev/null; }
k() { curl -s "$P/press?key=$1&after=${2:-400}" > /dev/null; }
ct() { curl -s "$P/clicktext?re=$1&after=${2:-600}" > /dev/null; }
b() { # b <tag> <name>: bench + shot
  evf "$D/bench.js" > /dev/null
  local r; r=$(curl -s -X POST --data-binary "__bench(40).then(x=>x.ms+' ms  '+x.fpsEq+' fps-eq  '+OTR.game.scene.getScenes(true).map(s=>s.sys.settings.key).join(','))" "$P/eval")
  echo "$2  $r" | sed 's/{"ok":true,"value":"//; s/"}$//' | tee -a "$D/bench-$1.txt"
  curl -s "$P/shot?name=$1-$2" > /dev/null
}
outside() { k Enter 600; ct "Let's%20go" 1200; curl -s "$P/hold?key=KeyD&ms=120&after=200" > /dev/null; k KeyE 2000; ct "grab%20handle" 3500; }
meas() {
  local t=$1; : > "$D/bench-$t.txt"
  curl -s "$P/mode?turn=1" > /dev/null
  op m3-missing; k Enter 1800; b $t conv-m3missing
  op m4-storm; k Enter 1800; b $t conv-m4storm
  op m4-damaged; k Enter 1800; b $t conv-m4damaged
  op m8-incident; k Enter 1800; b $t conv-m8incident
  op m5-pod; outside; curl -s "$P/hold?key=KeyD&ms=900&after=300" > /dev/null; b $t stop-m5pod
  op m8-heat; outside; curl -s "$P/hold?key=KeyD&ms=900&after=300" > /dev/null; b $t stop-m8heat
  op m8-dog; outside; b $t stop-m8dog
  op m1-pretrip; k Enter 1200; b $t pretrip
  op m1-driving; k Enter 1200; b $t drill
  op m1-route; k Enter 1200; b $t route
  op m2-sort; k Enter 1500; b $t sort
  op m2-lift; k Enter 1200; b $t lift
  op m2-labels; k Enter 1200; b $t labels
  op m6-load; k Enter 1200; b $t load
  op m7-business; k Enter 1500; b $t pickup
  op m7-dg; k Enter 1500; b $t pickup-dg
  op m5-pod; evw "(async()=>{const m=OTR.game.scene; m.getScenes(true).forEach(s=>m.stop(s.sys.settings.key)); m.start('TownDriveScene',{seed:3,weather:'clear',tod:'midday',route:[]}); await new Promise(r=>setTimeout(r,2500)); return 1})()" > /dev/null; k Enter 800; curl -s "$P/hold?key=KeyW&ms=1500&after=200" > /dev/null; b $t town
  curl -s "$P/open?url=index.html%3Fdev%3D1&ms=3000" > /dev/null; ev "localStorage.clear()" > /dev/null; curl -s "$P/reload?ms=3000" > /dev/null; b $t title
  k Enter 900; curl -s "$P/type?keys=KeyQ,KeyA&after=300" > /dev/null; k Enter 2500; b $t hub
}
R=test/out/review/wp0
sheet() { # sheet <out> <cols> <cellW> files...
  local out=$1 cols=$2 cw=$3; shift 3; local arr; arr=$(printf "'$R/%s'," "$@"); evf "$D/imgtool.js" > /dev/null
  curl -s -X POST --data-binary "__img.sheet([${arr%,}],$cols,$cw)" "$P/eval" | node "$D/save.js" "$D/$out"; }
pdiff() { # pdiff <a> <b> [outdiff]
  evf "$D/imgtool.js" > /dev/null
  if [ -n "$3" ]; then curl -s -X POST --data-binary "__img.diff('$R/$1','$R/$2',{image:true,amp:6})" "$P/eval" | node "$D/save.js" "$D/$3";
  else curl -s -X POST --data-binary "__img.diff('$R/$1','$R/$2')" "$P/eval"; echo; fi; }
PK="/c/Users/Luke Nelson/Desktop/fedex training game/test/out/review/perf"
hitchconv() { # hitchconv <scenario> [old]: 9 s of conversation clicked through in real time; long frames + textures made
  curl -s "$P/mode?turn=0" > /dev/null; op $1 2500
  [ "$2" = old ] && evf "$D/oldmake.js" > /dev/null
  evf "$PK/perfkit.js" > /dev/null; evf "$PK/hitch.js" > /dev/null
  k Enter 900
  ev "(window.__bg = __hk.frames(9000, 12), 1)" > /dev/null
  for i in $(seq 1 12); do curl -s "$P/press?key=Enter&after=300" > /dev/null; curl -s "$P/press?key=Digit1&after=300" > /dev/null; done
  ev "__bg.then(r => ({ fps: r.fps, long: r.long.length, longMs: r.long.map(f => Math.round(Math.max(f.upd, f.ren))), made: r.madeTotal, madeMs: r.madeMs, worst: r.long.slice(0,3).map(f=>f.made.join('|')) }))"
  curl -s "$P/mode?turn=1" > /dev/null
}
quick() { # a subset for per-change checks
  local t=$1; : > "$D/bench-$t.txt"; curl -s "$P/mode?turn=1" > /dev/null
  op m3-missing; k Enter 1800; b $t conv-m3missing
  op m4-storm; k Enter 1800; b $t conv-m4storm
  op m8-heat; outside; curl -s "$P/hold?key=KeyD&ms=900&after=300" > /dev/null; b $t stop-m8heat
  op m2-labels; k Enter 1200; b $t labels
  op m7-business; k Enter 1500; b $t pickup
  op m5-pod; evw "(async()=>{const m=OTR.game.scene; m.getScenes(true).forEach(s=>m.stop(s.sys.settings.key)); m.start('TownDriveScene',{seed:3,weather:'clear',tod:'midday',route:[]}); await new Promise(r=>setTimeout(r,2500)); return 1})()" > /dev/null; k Enter 800; curl -s "$P/hold?key=KeyW&ms=1500&after=200" > /dev/null; b $t town
}
