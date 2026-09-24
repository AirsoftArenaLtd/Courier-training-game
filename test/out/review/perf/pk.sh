P=localhost:9309
D="/c/Users/Luke Nelson/Desktop/fedex training game/test/out/review/perf"
ev() { curl -s -X POST --data-binary "$1" "$P/eval"; echo; }
evf() { curl -s -X POST --data-binary @"$1" "$P/eval"; echo; }
kits() { evf "$D/perfkit.js"; evf "$D/gpukit.js"; }
op() { curl -s "$P/open?url=index.html%3Fscenario%3D$1%26dev%3D1&ms=${2:-3000}" | head -c 400; echo; }
m() { evf "$D/m.js"; }
rb() { ev "window.__cfg=$1"; evf "$D/reboot.js" | head -c 300; echo; kits >/dev/null; }
gko() { ev "__gk.objects(30,{top:${1:-9}}).then(r=>r.total+' | '+r.rows.map(x=>x.key.replace(/^\w+#\d+ /,'')+' a'+x.area+' '+x.gpuMs).join(' ; '))"; }
ms() { ev "(async()=>{const a=await __pk.measure(${1:-4000}); return a.fps+'fps p50 '+a.ms.p50+' p95 '+a.ms.p95+' max '+a.ms.max+' >33:'+a.long.over33+' upd '+a.cpu.update+'/'+a.cpu.updMax+' ren '+a.cpu.render+' draws '+a.perFrame.draws+' blend '+a.perFrame.blend+' texUp '+a.perFrame.texUp+' txt '+a.perFrame.textUpd+' cref '+a.perFrame.canvasRefresh+' gc '+a.heapMB.gcDrops+' who '+JSON.stringify(a.textWho.slice(0,3))+JSON.stringify(a.refreshWho.slice(0,3))})()"; }
podout() { op ${1:-m5-pod} 3000 >/dev/null; curl -s "$P/press?key=Enter&after=600" >/dev/null; curl -s "$P/clicktext?re=Let's%20go&after=1200" >/dev/null; curl -s "$P/hold?key=KeyD&ms=120&after=200" >/dev/null; curl -s "$P/press?key=KeyE&after=2000" >/dev/null; curl -s "$P/clicktext?re=grab%20handle&after=3500" >/dev/null; curl -s "$P/stage" | grep -o '"inVan":[a-z]*'; }
climb() { curl -s "$P/press?key=Enter&after=600" >/dev/null; curl -s "$P/clicktext?re=Let's%20go&after=1200" >/dev/null; curl -s "$P/hold?key=KeyD&ms=120&after=200" >/dev/null; curl -s "$P/press?key=KeyE&after=2000" >/dev/null; curl -s "$P/clicktext?re=grab%20handle&after=3500" >/dev/null; curl -s "$P/stage" | grep -o '"inVan":[a-z]*'; }
walkm() { curl -s "$P/down?key=KeyA" >/dev/null; ms 2500; curl -s "$P/up?key=KeyA" >/dev/null; curl -s "$P/down?key=KeyD" >/dev/null; ms 2500; curl -s "$P/up?key=KeyD" >/dev/null; }
town() { ev "(async()=>{const m=OTR.game.scene; m.getScenes(true).forEach(s=>m.stop(s.sys.settings.key)); m.start('TownDriveScene',{seed:3,weather:'${1:-clear}',tod:'${2:-midday}',route:[]}); await new Promise(r=>setTimeout(r,2500)); return m.getScenes(true).map(s=>s.sys.settings.key)})()"; curl -s "$P/press?key=Enter&after=500" >/dev/null; }
drivem() { curl -s "$P/down?key=KeyW" >/dev/null; ms 3000; curl -s "$P/up?key=KeyW" >/dev/null; }
