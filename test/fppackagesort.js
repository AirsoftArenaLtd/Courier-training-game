/* Compare decisions and final ratios with the actual 2D scene, then exercise bounded conveyor play. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{},Math:{Between:()=>0}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_sorting.js','src/core/theme.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.audio={play(){}};O.fx={floatText(){},shake(){},stamp(){},ring(){}};O.ui={toast(){}};O.W=1280;
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m2/SortingScene.js','utf8'),c);const ref=vm.runInContext('SortingScene.prototype',c),base=vm.runInContext('BaseScenarioScene.prototype',c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fppackagesort.js','utf8'),c);const A=O.fpPackageSort,C=c.OTR_DATA.sorting,clean=x=>JSON.parse(JSON.stringify(x));
function original(s,p){const q={...p,img:{x:p.position,y:0,disableInteractive(){}}};return {content:C,wave:s.wave,activeBins:s.wave.bins,packages:[q],score:s.score,stats:clean(s.stats),streak:s.streak,bestStreak:s.bestStreak,correctBin:ref.correctBin,updateCombo(){},addScore:base.addScore,tweens:{add(){}},time:{delayedCall(){}},bins:Object.fromEntries(Object.entries(C.bins).map(([id,def])=>[id,{x:0,c:{},def}])),p:q};}
test('7040 original sorting decisions preserve precedence, blind penalties, score clamping, combo boundaries and error counts',()=>{
 let count=0;
 for(const wave of C.waves)for(const damage of [null,'leak'])for(const dg of [false,true])for(const heavy of [false,true])for(const priority of [false,true])for(const route of [1,2])for(const scanned of [false,true])for(const bin of wave.bins)for(const streak of [0,4,9,19,24]){
  const s=A.create(C),p={id:1,route,damage,dg,heavy,priority,scanned,done:false,jammed:false,weight:60,position:0};s.state='play';s.wave=wave;s.packages=[p];s.streak=streak;s.bestStreak=streak;s.score=streak?500:0;const old=original(s,p);
  ref.sortPackage.call(old,old.p,bin);const outcome=A.sort(s,p,bin);assert.equal(outcome.correct,ref.correctBin.call(old,old.p));assert.equal(s.score,old.score);assert.equal(s.streak,old.streak);assert.equal(s.bestStreak,old.bestStreak);assert.deepEqual(clean(s.stats),clean(old.stats));assert.equal(s.packages.length,0);assert.equal(A.sort(s,p,bin),false);count++;
 }
 assert.equal(count,7040);
});
test('missed special parcels, lessons and final ratios use the existing 2D result contract',()=>{
 const s=A.create(C);s.state='play';s.wave=C.waves[4];s.score=500;
 for(const kind of ['damage','dg','heavy','ordinary']){const p={id:s.serial++,route:1,damage:kind==='damage'?'leak':null,dg:kind==='dg',heavy:kind==='heavy',priority:false,scanned:false,done:false,position:1200};s.packages.push(p);const old=original(s,p);ref.missPackage.call(old,old.p);A.miss(s,p);assert.deepEqual(clean(s.stats),clean(old.stats));assert.equal(s.score,old.score);}
 s.state='done';const old={...original(s,{}),packages:[],indicator:{setVisible(){}},bestStreak:s.bestStreak,finish:base.finish,scenarioId:'m2-sort'};old.time.delayedCall=(delay,fn)=>{if(delay===1600)fn();};let result;O.flow={complete:(scene,id,r)=>{assert.equal(id,'m2-sort');result=r;}};ref.endShift.call(old);const actual=A.result(s);assert.equal(actual.score,result.score);assert.deepEqual(clean(actual.ratios),clean(result.ratios));assert.deepEqual(clean(actual.lessons),clean(result.lessons));assert.equal(actual.mistakes,result.mistakes);assert.deepEqual(clean(actual.stats),clean(result.stats));assert.equal(A.result(s),actual);
});
test('wave transitions retain the old bins until every physical parcel is resolved and keep stable bin numbers',()=>{
 const s=A.create(C,{random:()=>.5});assert.equal(A.result(s),null);A.begin(s);assert.equal(s.waveIndex,0);assert.equal(s.binKeys.DG,6);assert.equal(s.binKeys.HVY,7);
 s.packages=[];A.wave(s,3);A.begin(s);const p=A.spawn(s);p.dg=true;p.damage=null;s.waveTime=s.wave.duration-.01;s.spawnTimer=100;A.advance(s,.05);assert.equal(s.waveIndex,3);assert.equal(A.correctBin(s,p),'DG');assert.equal(A.wave(s,4),false);A.scan(s,p);A.sort(s,p,'DG');A.advance(s,.05);assert.equal(s.state,'rule');assert.equal(s.waveIndex,4);assert.equal(A.sort(s,p,'DG'),false);const time=s.elapsed;A.advance(s,100);assert.equal(s.elapsed,time);A.begin(s);assert.equal(s.state,'play');assert.equal(s.binKeys.DG,6);
});
test('the live clock caps long frames, pauses, deduplicates scanning and resolves each jam once',()=>{
 const s=A.create(C,{random:()=>.5});A.begin(s);A.advance(s,100);assert.equal(s.elapsed,.05);const before=s.elapsed;A.advance(s,100,false);assert.equal(s.elapsed,before);const p=A.spawn(s);assert.equal(A.scan(s,p),true);assert.equal(A.scan(s,p),false);assert.equal(s.stats.scanned,1);assert.equal(A.jam(s),true);assert.equal(A.jam(s),false);s.score=100;
 for(let i=0;i<101;i++)A.advance(s,.05);assert.equal(s.jammed,null);assert.equal(s.stats.jams,1);assert.equal(s.stats.jamsCleared,0);assert.equal(s.score,60);assert.equal(A.clearJam(s,true),false);
 assert.equal(A.jam(s),true);assert.equal(A.clearJam(s,true),true);assert.equal(s.stats.jamsCleared,1);assert.equal(A.clearJam(s,true),false);
});
test('all five waves finish in bounded memory without input, and invalid actions cannot manufacture credit',()=>{
 const s=A.create(C,{random:()=>.5});A.begin(s);let peak=0,steps=0;
 while(s.state!=='done'&&steps++<8000){if(s.state==='rule')A.begin(s);A.advance(s,.05);peak=Math.max(peak,s.packages.length);}
 assert.equal(s.state,'done');assert.equal(s.waveIndex,4);assert.ok(s.elapsed>154&&s.elapsed<240);assert.ok(peak>0&&peak<=A.capacity);assert.ok(s.stats.missed>80);const result=A.result(s);assert.equal(result.ratios.efficiency,0);assert.equal(result.score,0);
 const full=A.create(C);A.begin(full);for(let i=0;i<30;i++)A.spawn(full);assert.equal(full.packages.length,A.capacity);const p=full.packages[0];assert.equal(A.sort(full,p,'DG'),false);assert.equal(A.scan(full,{}),false);assert.equal(A.miss(full,{}),false);assert.equal(full.stats.correct,0);assert.equal(full.stats.scanned,0);
});
