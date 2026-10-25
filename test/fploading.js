/* Loading actions retain the actual 2D slots, placements, strap invalidation and original final evaluator. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m6_loading.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/fploading.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpLoading,C=c.OTR_DATA.loading.m6_load,plain=x=>JSON.parse(JSON.stringify(x));c.BaseScenarioScene=class{};O.registerScene=P=>{O.LoadingReference=P;};
O.audio={play(){}};const shape={setDepth(){return this;},destroy(){}};O.tex={liveShape(){return shape;},shape(){return shape;}};O.ui={toast(){}};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m6/LoadingScene.js','utf8'),c);
const P=O.LoadingReference.prototype,cats=['safety','efficiency'];
function image(){return {width:1,height:1,x:0,y:0,scale:1,setScale(k){this.scale=k;return this;},setPosition(x,y){this.x=x;this.y=y;return this;}};}
function ref(){const r=Object.create(P);Object.assign(r,{content:C,mode:'load',cats,pkgs:C.packages.map(p=>({...p})),cart:[],sprites:{},elapsed:0,strapped:false,finished:false,reporting:false,extraLessons:[],log:new O.ScoreLog(),drawSlots(){},layoutCart(){},checkPlacement(){},floatAt(){},hideCard(){},loadReport(right,total,high){this.reporting=true;this.report={right,total,high:high.map(p=>p.id)};},finish(result){this.finished=true;this.result=result;}});r.cart=r.pkgs.slice();for(const p of r.pkgs)r.sprites[p.id]=image();const button={setLabel(){return this;},setEnabled(){return this;}};r.strapBtn=button;r.buildSlots();return r;}
function state(r){return plain({cart:r.cart.map(p=>p.id),slots:r.slots.map(s=>[s.id,s.pkg?.id||null]),parcels:r.pkgs.map(p=>[p.id,p.slotRef?.id||null]),strapped:r.strapped});}
function drop(r,id,slotId){const p=r.pkgs.find(p=>p.id===id),img=r.sprites[id],slot=r.slots.find(s=>s.id===slotId);p.from={slot:p.slotRef,x:img.x,y:img.y,scale:img.scale};r.dropPackage(p,img,slot?{x:slot.x+slot.w/2,y:slot.y+slot.h/2}:{x:-100,y:-100});}
function fixture(){const s=K.create('m6-load',C,cats);K.begin(s);return s;}
const good={l1:'A-mid-0',l2:'A-top-0',l3:'A-bottom-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l7:'C-mid-0',l8:'C-bottom-0',l9:'haz',l10:'A-mid-1',l11:'B-top-1',l12:'C-top-0'};
function load(s,r,plan=good){for(const [id,slot]of Object.entries(plan)){assert.ok(K.take(s,id));assert.ok(K.place(s,slot));drop(r,id,slot);assert.deepEqual(state(s),state(r));}}
test('all 252 authored package/slot placements match actual 2D drops, rules and slot metadata',()=>{
 const before=JSON.stringify(C),base=ref(),model=fixture();assert.equal(model.slots.length,21);assert.deepEqual(plain(model.slots),plain(base.slots));let count=0;
 for(const pkg of C.packages)for(const slot of base.slots){const s=fixture(),r=ref();K.take(s,pkg.id);K.place(s,slot.id);drop(r,pkg.id,slot.id);assert.deepEqual(state(s),state(r));assert.deepEqual(plain(K.problems(s,pkg.id,slot.id)),plain(r.problemsFor(r.pkgs.find(p=>p.id===pkg.id),r.slots.find(x=>x.id===slot.id))));count++;}
 assert.equal(JSON.stringify(C),before);assert.equal(count,252);console.log(JSON.stringify({placementComparisons:count,slots:base.slots.length}));
});
test('occupied destinations restore the original load and floor changes alone invalidate a strap',()=>{
 const s=fixture(),r=ref();load(s,r);assert.ok(K.strap(s));r.strapLoad();assert.deepEqual(state(s),state(r));
 K.take(s,'l1');assert.equal(K.place(s,'A-top-0'),false);drop(r,'l1','A-top-0');assert.deepEqual(state(s),state(r));assert.equal(s.held,null);
 K.take(s,'l1');K.returnToCart(s);drop(r,'l1');assert.deepEqual(state(s),state(r));assert.equal(s.strapped,true);
 K.take(s,'l1');K.place(s,'A-mid-0');drop(r,'l1','A-mid-0');assert.deepEqual(state(s),state(r));
 K.take(s,'l9');K.returnToCart(s);drop(r,'l9');assert.deepEqual(state(s),state(r));assert.equal(s.strapped,false);assert.equal(K.strap(s),false);
 K.take(s,'l9');K.place(s,'haz');drop(r,'l9','haz');assert.ok(K.strap(s));r.strapLoad();assert.deepEqual(state(s),state(r));
});
test('safe and unsafe complete loads retain original checks, summary, score, ratios, lessons and placement',()=>{
 let count=0;for(const changed of [null,'heavy','fragile','hazmat','section'])for(const strapped of [false,true])for(const seconds of [0,210,210.1,315,315.1]){
  const s=fixture(),r=ref(),plan={...good};if(changed==='heavy')plan.l3='A-top-1';if(changed==='fragile')plan.l6='floor-0';if(changed==='hazmat')plan.l9='C-mid-1';if(changed==='section')plan.l1='C-mid-1';load(s,r,plan);if(strapped){K.strap(s);r.strapLoad();}s.elapsed=r.elapsed=seconds;
  assert.ok(K.review(s));r.finishLoad();assert.deepEqual(plain(s.report),plain(r.report));assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.equal(K.review(s),false);assert.ok(K.complete(s));r.endScenario();assert.deepEqual(plain(K.result(s)),plain(r.result));if(!changed&&strapped&&seconds<=210){assert.equal(s.result.score,2100);assert.deepEqual(plain(s.result.ratios),{safety:1,efficiency:1});}assert.equal(K.result(s),s.result);assert.equal(K.complete(s),false);count++;
 }assert.equal(count,50);console.log(JSON.stringify({completeLoadComparisons:count}));
});
test('incomplete, held, paused, invalid and terminal actions cannot finish a load or alter the workday',()=>{
 O.workday={report(){throw Error('Unexpected workday event');},events:[{type:'brief.read',key:'suspended'}]};O.save={data:{workday:{day:4}}};const outside=JSON.stringify([O.workday.events,O.save.data]),s=K.create('m6-load',C,cats);
 assert.equal(K.take(s,'l1'),false);assert.equal(K.review(s),false);assert.ok(K.begin(s));assert.equal(K.begin(s),false);assert.equal(K.strap(s),false);assert.equal(K.review(s),false);assert.equal(K.take(s,'invented'),false);assert.equal(K.place(s,'invented'),false);assert.equal(K.problems(s,'l1','invented'),null);assert.equal(K.step(s,1,false),false);assert.equal(s.elapsed,0);assert.ok(K.step(s,1));assert.equal(s.elapsed,.05);
 const r=ref();load(s,r);assert.ok(K.take(s,'l1'));assert.equal(K.review(s),false);assert.equal(K.strap(s),false);assert.equal(K.take(s,'l2'),false);assert.equal(K.place(s,'invented'),false);assert.equal(s.held,'l1');assert.ok(K.place(s,'A-mid-0'));assert.ok(K.strap(s));assert.ok(K.review(s));assert.equal(K.take(s,'l2'),false);assert.equal(K.step(s,1),false);assert.ok(K.complete(s));const done=JSON.stringify(plain(s.result));for(const action of [()=>K.take(s,'l1'),()=>K.place(s,'A-mid-0'),()=>K.returnToCart(s),()=>K.strap(s),()=>K.review(s),()=>K.complete(s),()=>K.step(s,1)])assert.equal(action(),false);assert.equal(JSON.stringify(plain(s.result)),done);assert.equal(JSON.stringify([O.workday.events,O.save.data]),outside);assert.throws(()=>K.create('m6-invented',C,cats),/Invalid/);
});
