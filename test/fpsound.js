/* Sound is bounded, quiet before interaction, optional, captioned and independent from scoring. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{EventEmitter}=require('node:events');
function setup(ready=true){
 const win=new EventEmitter(),doc=new EventEmitter(),settings={narrate:false},calls=[],saves=[];doc.hidden=false;doc.addEventListener=doc.on.bind(doc);doc.removeEventListener=doc.off.bind(doc);
 const c={document:doc,speechSynthesis:{speaking:false},addEventListener:win.on.bind(win),removeEventListener:win.off.bind(win)};c.window=c;vm.createContext(c);
 const param=()=>({value:0,targets:[],setTargetAtTime(v,t,rate){this.targets.push({v,t,rate});}}),nodes=[];
 const node=type=>{const n={type,frequency:param(),gain:param(),connect(){},disconnect(){this.disconnected=true;}};if(type==='oscillator'||type==='noise'){n.start=()=>{n.started=true;n.startGain=nodes.filter(x=>x.type==='gain').map(x=>x.gain.value);};n.stop=()=>{n.stopped=true;};}nodes.push(n);return n;};
 const ctx={state:'running',currentTime:1,createGain:()=>node('gain'),createOscillator:()=>node('oscillator'),createBufferSource:()=>node('noise'),createBiquadFilter:()=>node('filter')},master={gain:param()};
 c.OTR={audio:{ctx:ready?ctx:null,master,volume:.55,muted:false,_noiseBuf:{},tone(...args){calls.push(['tone',...args]);},noise(...args){calls.push(['noise',...args]);},play(name){calls.push(['play',name]);},setVolume(v){this.volume=Math.max(0,Math.min(1,v));},setMuted(v){this.muted=!!v;}},a11y:{settings:()=>settings},save:{setVolume:v=>saves.push(['volume',v]),setMuted:v=>saves.push(['muted',v])}};
 vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpsound.js','utf8'),c);
 const m={phase:'route',paused:false,mode:'cab',van:{speed:4},signal:-1,dogNearby:false,routeDay:{weather:'rain'},driving:{siren:{state:'idle'}}},scene={model:m,held:{},events:new EventEmitter(),time:{now:0},showPanel(title,body,choices){this.page={title,body,choices};},showSettings(){}},sound=new c.OTR.fpSound(scene),tick=time=>{scene.time.now=time;return sound.tick(time);};
 return {c,m,scene,sound,tick,settings,calls,saves,nodes,master,ctx,win,doc};
}
test('unavailable audio still supplies every active caption and never changes the mission',()=>{
 const x=setup(false);x.m.dogNearby=true;x.m.driving.siren.state='approaching';const before=JSON.stringify(x.m),text=x.tick(0);assert.match(text,/engine/);assert.match(text,/Rain/);assert.match(text,/left turn/);assert.match(text,/dog/);assert.match(text,/emergency/);assert.equal(JSON.stringify(x.m),before);assert.equal(x.nodes.length,0);assert.equal(x.calls.length,0);x.sound.dispose();
});
test('two continuous sources start at zero gain and remain bounded during repeated updates',()=>{
 const x=setup();assert.equal(x.nodes.length,0);x.tick(0);assert.equal(x.nodes.length,6);assert.equal(x.nodes.filter(n=>n.started).length,2);assert.ok(x.nodes.filter(n=>n.started).every(n=>n.startGain.every(v=>v===0)));
 for(let i=1;i<=1000;i++)x.tick(i*100);assert.equal(x.nodes.length,6);assert.equal(x.sound.engine.level,.025);assert.equal(x.sound.rain.level,.025);assert.ok(x.sound.engine.source.frequency.targets.every(a=>a.v>=45&&a.v<=109));x.sound.dispose();
});
test('narration ducks the shared master and suppresses new effects, then restores saved volume',()=>{
 const x=setup();x.tick(0);x.settings.narrate=true;x.c.speechSynthesis.speaking=true;x.tick(1);assert.equal(x.master.gain.targets.at(-1).v,0);const count=x.calls.length;x.sound.effect('door','The cab door opens.');assert.equal(x.calls.length,count);assert.equal(x.c.OTR.audio.volume,.55);
 x.c.speechSynthesis.speaking=false;x.tick(2);assert.equal(x.master.gain.targets.at(-1).v,.55);x.c.OTR.audio.muted=true;x.tick(3);assert.equal(x.master.gain.targets.at(-1).v,0);assert.equal(x.nodes.length,6);x.sound.dispose();assert.equal(x.master.gain.targets.at(-1).v,0);
});
test('pause, hidden tab and shutdown silence and disconnect only the owned voices and listeners',()=>{
 const x=setup();x.tick(0);x.scene.events.emit('pause');assert.equal(x.sound.engine.level,0);assert.equal(x.sound.rain.level,0);x.tick(200);x.doc.hidden=true;x.doc.emit('visibilitychange');assert.equal(x.sound.engine.level,0);assert.equal(x.sound.rain.level,0);x.doc.hidden=false;x.tick(400);assert.equal(x.nodes.length,6);x.scene.events.emit('shutdown');assert.ok(x.nodes.every(n=>n.disconnected));assert.equal(x.nodes.filter(n=>n.stopped).length,2);assert.equal(x.scene.events.listenerCount('pause'),0);assert.equal(x.win.listenerCount('blur'),0);assert.equal(x.doc.listenerCount('visibilitychange'),0);x.sound.dispose();
});
test('muted sound keeps event captions and cannot start a sound source',()=>{
 const x=setup();x.c.OTR.audio.muted=true;x.sound.effect('cargo','The cargo doors open.');assert.match(x.tick(0),/cargo doors open/);assert.equal(x.nodes.length,0);assert.equal(x.calls.length,0);x.sound.dispose();
});
test('braking and indicators use bounded effect rates and have visible sentences',()=>{
 const x=setup();x.scene.held.KeyS=true;const text=x.tick(0);assert.match(text,/brakes/);assert.equal(x.calls.filter(c=>c[0]==='play'&&c[1]==='brake').length,1);
 for(let t=100;t<600;t+=100)x.tick(t);assert.equal(x.calls.filter(c=>c[0]==='tone').length,1);x.tick(600);assert.equal(x.calls.filter(c=>c[0]==='tone').length,2);assert.equal(x.calls.filter(c=>c[0]==='play').length,1);x.sound.dispose();
});
test('Settings changes the existing saved volume and mute with clamped values',()=>{
 const x=setup(false);x.sound.menu();for(let i=0;i<20;i++)x.scene.page.choices[0].action();assert.equal(x.c.OTR.audio.volume,0);for(let i=0;i<20;i++)x.scene.page.choices[1].action();assert.equal(x.c.OTR.audio.volume,1);x.scene.page.choices[2].action();assert.equal(x.c.OTR.audio.muted,true);assert.deepEqual(x.saves.at(-1),['muted',true]);assert.match(x.scene.page.body,/100%/);assert.match(x.scene.page.body,/muted/);assert.equal(x.nodes.length,0);x.sound.dispose();
});
test('engine RPM and road feel reuse the existing voices and keep invalid telemetry silent',()=>{
 const x=setup();x.m.motion={rpm:2800};x.m.cameraMotion={roadImpact:.75};x.tick(0);assert.equal(x.sound.engine.frequency,85);assert.equal(x.sound.engine.cutoff,300);assert.equal(x.nodes.length,6);
 x.m.motion.rpm=3800;x.m.cameraMotion.roadImpact=NaN;x.tick(200);assert.equal(x.sound.engine.frequency,105);assert.equal(x.sound.engine.cutoff,240);assert.equal(x.nodes.length,6);x.sound.dispose();
});
