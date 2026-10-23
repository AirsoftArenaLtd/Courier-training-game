/* Package inspection content, live-clock guards and direct comparison with the original 2D Label Check scorer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_labels.js','src/core/theme.js','src/core/scorelog.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.audio={play(){}};O.fx={burst(){},shake(){},stamp(){}};O.W=1280;
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m2/LabelScene.js','utf8'),c);const original=vm.runInContext('LabelScene.prototype',c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fppackagelabels.js','utf8'),c);
const A=O.fpPackageLabels,C=c.OTR_DATA.labels,clean=v=>JSON.parse(JSON.stringify(v)),items=log=>clean(log.items.map(({at,...v})=>v));
const fresh=()=>A.create(C,{shuffle:values=>values});
function reference(s){
 const none=()=>{},bays=Object.fromEntries(Object.keys(C.stations).map(id=>[id,{c:{x:0,y:0},paint:none}]));
 return Object.assign(Object.create(original),{content:C,item:s.item,itemIndex:s.index,itemTime:s.itemTime,seen:{...s.seen},FACE_NAMES:A.faceNames,
  log:new O.ScoreLog(),score:0,stats:{correct:0,total:0,blind:0,speed:[],wrong:[],slow:0},timerBar:{setVisible:none},blindWarn:{setText:none},boxImg:{disableInteractive:none},
  tweens:{add:none},time:{delayedCall:none},bays,BOX:{x:424,y:348},progressText:{setText:none},faceLabel:{setText:none},
  finish(result){result.score=this.score;this.result=result;}});
}
test('nine fresh items keep the original three-tier selection without changing shared content',()=>{
 const before=JSON.stringify(C),a=fresh(),b=fresh();assert.equal(a.queue.length,9);assert.equal(new Set(a.queue).size,9);
 assert.deepEqual(clean(a.queue.map(x=>x.tier)),[1,1,1,2,2,2,3,3,3]);assert.notEqual(a.queue,b.queue);assert.notEqual(a.log,b.log);assert.notEqual(a.seen,b.seen);
 A.next(a);A.see(a,'back');assert.equal(b.index,-1);assert.equal(JSON.stringify(C),before);
 assert.equal(a.item,C.items[0]);assert.equal(A.next(a),false,'an unresolved package cannot be skipped');
});
test('532 label decisions match the actual 2D scorer, including all marks, damage, blind calls and timeouts',()=>{
 let comparisons=0;
 for(const item of C.items)for(const allFaces of [false,true])for(const station of [...Object.keys(C.stations),null])for(const time of station?[4,13,22]:[22]){
  const s=fresh();s.queue=[item];A.next(s);s.itemTime=time;if(allFaces)for(const face of A.faces)A.see(s,face);
  const ref=reference(s);original.resolve.call(ref,station);if(station)A.answer(s,station);else A.advance(s,0);
  assert.equal(s.score,ref.score);assert.deepEqual(items(s.log),items(ref.log));assert.deepEqual(clean(s.stats),clean(ref.stats));comparisons++;
 }
 assert.equal(comparisons,532);
});
test('a complete nine-item inspection keeps the original 3150-point scale, ratios, lessons and idempotent result',()=>{
 const s=fresh();A.next(s);
 while(s.phase==='run'){for(const face of A.faces)A.see(s,face);s.itemTime=4;assert.ok(A.answer(s,s.item.answer));A.next(s);}
 const result=A.result(s),ref=reference(s);ref.score=s.score;ref.stats=s.stats;ref.log=s.log;original.endRun.call(ref);
 assert.equal(result.score,3150);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.deepEqual(clean(result.ratios),clean(ref.result.ratios));
 assert.deepEqual(clean(result.lessons),clean(ref.result.lessons));assert.ok(result.summary.endsWith('You checked all six sides of 9 packages.'));assert.equal(result.stats.total,9);assert.equal(s.log.items.length,18);
 assert.equal(A.result(s),result);assert.equal(A.next(s),false);assert.equal(A.answer(s,'belt'),false);assert.equal(A.see(s,'back'),false);assert.equal(s.log.items.length,18);
});
test('menus, the guide and verdicts freeze the clock while a live timeout grades exactly once',()=>{
 const s=fresh();assert.equal(A.advance(s,1),false);A.next(s);A.advance(s,10);assert.equal(s.itemTime,.05);A.advance(s,1,false);assert.equal(s.itemTime,.05);
 s.guideOpen=true;A.advance(s,1);assert.equal(A.see(s,'top'),false);assert.equal(A.answer(s,'belt'),false);assert.equal(s.itemTime,.05);
 s.guideOpen=false;A.advance(s,-1);A.advance(s,NaN);assert.equal(s.itemTime,.05);assert.equal(A.grade(s,null),false);
 s.itemTime=21.98;assert.ok(A.advance(s,.05));assert.equal(s.stats.total,1);assert.equal(s.stats.slow,1);assert.equal(s.stats.blind,0);assert.equal(s.log.items.length,2);
 A.advance(s,1);assert.equal(s.stats.total,1);assert.equal(A.answer(s,'belt'),false);assert.equal(A.next(s),true);assert.equal(s.itemTime,0);
});
test('even an unmarked package requires all six sides; invalid targets and duplicate calls earn nothing',()=>{
 const s=fresh();s.queue=[C.items.find(i=>i.answer==='belt'&&!Object.keys(i.marks).length)];A.next(s);for(let n=0;n<20;n++)A.see(s,'front');
 assert.equal(A.see(s,'inside'),false);assert.equal(A.answer(s,'unknown'),false);assert.equal(A.grade(s,'unknown'),false);assert.equal(A.answer(s,null),false);assert.equal(s.log.items.length,0);
 const outcome=A.answer(s,'belt');assert.equal(outcome.blind,true);assert.equal(outcome.unseen.length,5);assert.equal(s.stats.blind,1);assert.equal(s.log.ratio('safety'),.5);assert.equal(s.score,250);
 assert.equal(A.answer(s,'belt'),false);assert.equal(s.log.items.length,3);
});
test('whole-scenario expiry includes every uncompleted item, preserves earned points and never writes a workday',()=>{
 O.workday={report(){throw Error('A label module wrote to a workday.');}};const before=JSON.stringify(C),s=fresh();A.next(s);for(const face of A.faces)A.see(s,face);s.itemTime=4;A.answer(s,s.item.answer);
 const result=A.result(s);assert.equal(result.score,350);assert.equal(result.stats.total,9);assert.equal(result.stats.slow,8);assert.equal(result.log.items.length,18);assert.equal(result.ratios.safety,1/9);assert.equal(result.ratios.efficiency,1/9);assert.ok(result.summary.endsWith('You checked all six sides of 1 package.'));
 const empty=A.result(fresh());assert.equal(empty.score,0);assert.equal(empty.ratios.safety,0);assert.equal(empty.ratios.efficiency,0);assert.equal(empty.stats.total,9);assert.ok(empty.summary.endsWith('You checked all six sides of 0 packages.'));assert.equal(JSON.stringify(C),before);
});
