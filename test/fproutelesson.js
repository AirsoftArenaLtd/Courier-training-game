/* Original real-town graph reuse, native editing guards and direct equivalence with the 2D route scorer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={BaseScenarioScene:class{}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/m1_routes.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpscenario.js','src/core/fphud.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.util={clamp01:x=>Math.min(1,Math.max(0,x))};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m1/RoutePlannerScene.js','utf8'),c);
const prototype=vm.runInContext('RoutePlannerScene.prototype',c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fproutelesson.js','utf8'),c);
const A=O.fpRouteLesson,C=c.OTR_DATA.routes,clean=x=>JSON.parse(JSON.stringify(x));
const fresh=()=>({model:{routeLesson:A.create(C),mode:'cab',parked:()=>true,heldId:null},log:new O.ScoreLog()});
test('all original manifests use the original graph, closure paths, pickup windows and school pricing',()=>{
 const before=JSON.stringify(C),r=fresh(),s=r.model.routeLesson;
 for(let i=0;i<C.rounds.length;i++){
  A.round(s,i);const p=s.planner;assert.equal(Object.getPrototypeOf(p),prototype);assert.equal(p.stops.length,C.rounds[i].stops.length);assert.ok(p.adj.every(x=>x.length));
  assert.deepEqual(clean(p.evaluate(p.optimal.order,true)),clean(prototype.evaluate.call(p,p.optimal.order,true)));
  assert.ok(p.optimal.cost>0);assert.equal(A.plan(s),A.plan(s),'static mounted map reuses its computed plan');
 }
 assert.equal(JSON.stringify(C),before);assert.notEqual(s,fresh().model.routeLesson);
});
test('the route cannot be sequenced remotely, while moving, outside the cab, or with missing/duplicate stops',()=>{
 const r=fresh(),m=r.model,s=m.routeLesson;assert.equal(A.submit(r),false);assert.equal(A.toggle(m,0),false);assert.equal(A.toggle(m,99),false);
 for(const id of [1,2,3])assert.equal(A.toggle(m,id),true);assert.deepEqual(clean(s.order),[1,2,3]);A.toggle(m,2);assert.deepEqual(clean(s.order),[1,3]);
 const plan=A.plan(s);assert.notEqual(plan,A.plan({...s,revision:-1}));
 m.mode='walk';assert.equal(A.toggle(m,4),false);m.mode='cab';m.parked=()=>false;assert.equal(A.clear(m),false);m.parked=()=>true;m.heldId='parcel';assert.equal(A.toggle(m,4),false);m.heldId=null;A.clear(m);assert.deepEqual(clean(s.order),[]);
});
test('36 distinct full plans match the actual 2D round scorer, including critical and avoidable-delay checks',()=>{
 const oldRound=prototype.roundDone;O.audio={play(){}};O.fx={confetti(){}};O.ui={modal(){}};
 for(let round=0;round<3;round++)for(let sample=0;sample<12;sample++){
  const r=fresh(),s=r.model.routeLesson;A.round(s,round);const p=s.planner,n=p.stops.length,base=sample<6?p.optimal.order.slice():Array.from({length:n},(_,i)=>i+1);
  if(sample%2)base.reverse();const shift=sample%n;s.order=base.slice(shift).concat(base.slice(0,shift));s.revision++;const ev=A.plan(s);
  const ref=Object.assign(Object.create(prototype),p,{state:'plan',results:[],log:new O.ScoreLog(),score:0,addScore(x){this.score+=x;}});
  oldRound.call(ref,ev);A.grade(r,ev);
  assert.equal(s.score,ref.score);assert.deepEqual(clean(r.log.items.map(({at,...i})=>i)),clean(ref.log.items.map(({at,...i})=>i)));
  assert.deepEqual(clean(r.log.ratios(['efficiency','service'])),clean(ref.log.ratios(['efficiency','service'])));
 }
});
test('three submitted optimal manifests retain the score scale, categories and bounded same-id result',()=>{
 const r=fresh(),s=r.model.routeLesson;for(let i=0;i<3;i++){s.order=s.planner.optimal.order.slice();s.revision++;assert.equal(A.submit(r),true);}
 const result=A.result(r);assert.equal(result.score,1800);assert.equal(result.ratios.efficiency,1);assert.equal(result.ratios.service,1);assert.equal(result.stats.rounds.length,3);assert.equal(result.ratios.safety,undefined);
 const n=r.log.items.length;assert.equal(A.submit(r),false);assert.equal(A.result(r).score,1800);assert.equal(r.log.items.length,n);
 assert.equal(O.fpScenario.definitions.get('route-satnav').piece,'cab');
});
test('an expired partial plan earns no stars for unsubmitted manifests and preserves critical commitments',()=>{
 const r=fresh();A.toggle(r.model,1);const result=A.result(r);assert.equal(result.score,0);assert.equal(result.ratios.efficiency,0);assert.equal(result.ratios.service,0);assert.ok(r.log.criticals().length);assert.equal(result.stats.rounds.length,3);
 const n=r.log.items.length;A.result(r);assert.equal(r.log.items.length,n);
});
test('registered real mission sessions isolate workday scoring and never put route plans into checkpoints',()=>{
 const scenario={id:'m1-route',scene3d:'route-satnav',scene:'RoutePlannerScene',categories:['efficiency','service']};
 O.registry={get:()=>scenario,content:()=>C};O.workday={report(){throw Error('Module leaked to workday');}};
 const r=O.fpScenario.create(scenario.id),m=O.fpScenario.model(r);assert.equal(m.mode,'cab');assert.equal(m.parked(),true);assert.equal(m.snapshot().routeLesson,undefined);
 O.fpScenario.begin(r);assert.equal(m.moduleReport('drive.contact',{key:'module',ok:false}),false);assert.equal(r.log.items.length,0);
 assert.equal(A.available(m),true);assert.equal(m.van.belt,true);assert.equal(m.parcels.length,0);
});
test('the mounted map caches its geometry and keeps reverse on the live rear camera',()=>{
 const m=fresh().model;m.van={gear:2};let draws=0,clears=0;
 O.fpAccess={settings:()=>({large:false})};O.fpRouteLessonUI={map(){draws++;}};O.fpRear={hint:()=> 'The rear camera is live.'};
 const text={text:'',height:20,setText(v){this.text=v;},setWordWrapWidth(){},setPosition(){}};
 const root={visible:false,setVisible(v){this.visible=v;},setPosition(){}};
 const s={time:{now:100},hud:{navAt:-1000},model:m,art:{cab:{navigation:{}},labelPosition:()=>({x:1000,y:450})},navRoot:root,navBack:{setDisplaySize(){}},navText:text,navMap:{clear(){clears++;}}};
 O.fpHud.navigation(s);assert.equal(draws,1);assert.equal(root.visible,true);s.time.now+=100;O.fpHud.navigation(s);assert.equal(draws,1);assert.equal(clears,1);
 A.toggle(m,1);s.time.now+=100;O.fpHud.navigation(s);assert.equal(draws,2);assert.equal(clears,2);
 m.van.gear=-1;s.time.now+=100;O.fpHud.navigation(s);assert.equal(root.visible,false);assert.equal(O.fpHud.screenHint(m),'The rear camera is live.');
});
