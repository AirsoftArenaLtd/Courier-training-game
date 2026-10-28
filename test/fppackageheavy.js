/* Actual bay input checks the posted solo limit, helper/truck interlocks and bounded local result. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_lifting.js','src/core/theme.js','src/core/scorelog.js','src/core/fppackagelift.js','src/core/fppackageliftbay.js','src/core/fppackageheavy.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,H=O.fpPackageHeavy,L=O.fpPackageLift,C=c.OTR_DATA.lifting,clean=v=>JSON.parse(JSON.stringify(v));
function fixture(weight=95){const s=H.create(C);s.content.lifts[0].weight=weight;assert.equal(H.next(s),true);return s;}
function tick(s,input,until){let n=0;while(!until()&&n++<3000)H.step(s,input,.05);assert.ok(n<3000,'real input reaches the requested physical state');}
function grip(s){tick(s,{right:true},()=>s.pose.x>=640);tick(s,{down:true},()=>s.pose.squat===1);assert.equal(H.grip(s),true);}
function place(s){tick(s,{up:true},()=>s.pose.squat===0);tick(s,{left:true},()=>L.overPallet(s)&&Math.abs(L.heldBox(s).x-300)<=5);tick(s,{down:true},()=>s.pose.squat===1);assert.equal(H.grip(s),true);assert.equal(s.heavy.active.recorded,true);}
function truck(s){tick(s,{right:true},()=>s.pose.x>=s.bay.sourceX+55);assert.equal(H.takeHandle(s),true);tick(s,{left:true},()=>s.bay.mode==='unload');assert.equal(H.unload(s),true);}
test('heavy practice copies its two loads without changing the original five-load lesson',()=>{
 const before=JSON.stringify(C),s=fixture();assert.deepEqual(clean(s.content.lifts.map(l=>l.id)),['heavy','awkward']);assert.equal(H.soloLimit,50);assert.equal(JSON.stringify(C),before);assert.equal(s.content.lifts[0].options[2].effect,'normal');assert.equal(s.content.lifts[1].options[1].effect,'normal');
});
test('a solo grip is not critical; actual rising above the posted limit is critical once',()=>{
 const s=fixture();H.choose(s,2);grip(s);assert.equal(L.heldBox(s).bottom,600);assert.equal(s.heavy.log.criticals().length,0);tick(s,{up:true},()=>L.heldBox(s).bottom<600);assert.equal(s.heavy.log.criticals().length,1);assert.equal(s.heavy.active.soloRaised,true);tick(s,{up:true},()=>s.pose.squat===0);for(let i=0;i<50;i++)H.step(s,{},.05);assert.equal(s.heavy.log.criticals().length,1);
});
test('50 lb itself is allowed while any greater physical solo load triggers the policy',()=>{
 for(const [weight,critical] of [[49.99,false],[50,false],[50.001,true]]){const s=fixture(weight);H.choose(s,2);grip(s);tick(s,{up:true},()=>s.pose.squat===0);assert.equal(s.heavy.active.soloRaised,critical);}
});
test('a team lift waits for the actual helper before gripping and records safe physical form',()=>{
 const s=fixture();H.choose(s,1);assert.equal(s.bay.mode,'waiting-helper');assert.equal(H.grip(s),false);const x=s.pose.x;H.step(s,{right:true},.05);assert.equal(s.pose.x,x);assert.equal(H.requestHelper(s),true);grip(s);place(s);assert.equal(s.heavy.log.criticals().length,0);assert.equal(s.heavy.completed,1);assert.equal(s.heavy.log.items.length,5);assert.ok(s.heavy.log.items.every(i=>i.good));
});
test('equipment must be taken, pushed to the pallet and explicitly unloaded before advancing',()=>{
 const s=fixture();H.choose(s,0);assert.equal(s.phase,'verdict','the reused kernel grades a choice but the physical bay is still unfinished');assert.equal(H.next(s),false);assert.equal(H.unload(s),false);assert.equal(H.takeHandle(s),false);assert.equal(s.heavy.completed,0);truck(s);assert.equal(s.heavy.completed,1);assert.equal(s.heavy.log.criticals().length,0);assert.ok(s.heavy.log.items.every(i=>i.good));assert.equal(H.unload(s),false);
});
test('equipment and team completion keep one isolated 1000-point result with bounded observations',()=>{
 let reports=0;O.workday={report(){reports++;}};const s=fixture();H.choose(s,0);truck(s);assert.equal(H.next(s),true);H.choose(s,0);H.requestHelper(s);grip(s);place(s);assert.equal(H.next(s),false);const result=H.result(s);assert.equal(result.score,1000);assert.deepEqual(clean(result.ratios),{safety:1,efficiency:1});assert.equal(result.stats.completed,true);assert.equal(result.log.items.length,10);assert.equal(H.result(s),result);assert.equal(H.next(s),false);assert.equal(H.grip(s),false);assert.equal(reports,0);
});
test('unfinished handling keeps earned observations and criticals but gives no completion result',()=>{
 const s=fixture();H.choose(s,2);grip(s);tick(s,{up:true},()=>s.pose.squat===0);const r=H.result(s,'timeout');assert.equal(r.score,0);assert.deepEqual(clean(r.ratios),{safety:0,efficiency:0});assert.equal(r.stats.completed,false);assert.equal(r.log.criticals().length,1);assert.equal(H.step(s,{left:true},.05),false);assert.equal(H.result(s),r);
});
test('solo awkward handling and uncontrolled release cannot receive full method or placement checks',()=>{
 const s=fixture();H.choose(s,0);truck(s);H.next(s);H.choose(s,1);grip(s);tick(s,{up:true},()=>s.pose.squat===0);assert.equal(H.grip(s),true);assert.equal(s.heavy.completed,2);const rows=s.heavy.log.items.filter(i=>i.group==='awkward');assert.ok(rows.some(i=>i.cat==='efficiency'&&!i.good));assert.ok(rows.some(i=>i.label.includes('under control')&&!i.good));assert.equal(s.heavy.log.criticals().length,0,'awkwardness alone is not the over-limit critical');assert.ok(s.heavy.log.items.length<=12);
});
test('a reachable but distant, partly bent grip loses both close-grip and knee checks',()=>{
 const s=fixture();H.choose(s,1);H.requestHelper(s);tick(s,{right:true},()=>s.pose.x>=605);tick(s,{down:true},()=>s.pose.squat>=.7);assert.equal(H.grip(s),true);place(s);const rows=s.heavy.log.items;assert.equal(rows.find(i=>i.label.includes('knees')).good,false);assert.equal(rows.find(i=>i.label.includes('close grip')).good,false);assert.equal(rows.find(i=>i.label.includes('under control')).good,true);assert.equal(rows.find(i=>i.cat==='efficiency').good,true);
});
test('a later correct team load never removes the earlier over-limit critical',()=>{
 const s=fixture();H.choose(s,2);grip(s);place(s);H.next(s);H.choose(s,0);H.requestHelper(s);grip(s);place(s);H.next(s);const r=H.result(s);assert.equal(r.stats.completed,true);assert.equal(r.log.criticals().length,1);assert.equal(r.log.criticals()[0].group,'heavy');assert.equal(r.log.items.length,11);assert.ok(r.ratios.safety<1);for(let i=0;i<100;i++)H.observe(s);assert.equal(r.log.items.length,11);
});
