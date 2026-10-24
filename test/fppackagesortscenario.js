/* Actual runner/world/score combination. Ray hits operate physical controls; workday reports stay isolated. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','data/m2_sorting.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpsignlettering.js','src/core/fppackagesortworld.js','src/core/fpworld.js','src/core/fpscenario.js','src/core/fppackagesort.js','src/core/fppackagesortscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,S=O.fpPackageSort,A=O.fpPackageSortScenario,W=O.fpPackageSortWorld,scenario={id:'m2-sort',scene:'SortingScene',scene3d:'package-sort-belt',categories:['safety','efficiency']};let results=[];
O.registry={get:id=>id===scenario.id?scenario:null,content:()=>c.OTR_DATA.sorting};O.academy={assessing:null,coaching(){return !this.assessing;}};O.flow={complete:(scene,id,result)=>results.push({id,result})};
function fixture(high=false){
 O.gfx={high:()=>high};const r=F.create(scenario.id),m=F.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),s={scenarioSession:r,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,page:null,closePanel(){this.panel=null;m.paused=false;},showPanel(title,body,choices){this.panel={title,body,choices};m.paused=true;},handheld:{show(p){s.page=p;},close(){s.page=null;}},sync(){this.art.sync(m,null,'route');},finishScenario(){F.finish(r,this);}};world.add(camera);s.art=O.fpWorld.build(s,m);F.begin(r);s.sync();r.definition.update(r,s,0);return s;
}
function aim(s,id){s.sync();const target=s.art.interactions.find(o=>o.visible&&o.userData.interaction===id);assert.ok(target,id+' visible');s.view.camera.lookAt(target.getWorldPosition(new THREE.Vector3()));s.view.camera.updateMatrixWorld(true);assert.equal(s.art.pick(),id,id+' selected by actual nearest ray');return target;}
function parcel(s,props={}){const p=S.spawn(s.model.packageSort);Object.assign(p,{position:556,...props});s.sync();return p;}
function send(s,id){aim(s,'sort-bin-'+id);s.scenarioSession.definition.interact(s.scenarioSession,s,'sort-bin-'+id);const confirm=s.panel.choices[0].action;confirm();return confirm;}
test('the real scan, numbered route and neutral assessment acknowledgement retain the original score',()=>{
 for(const high of [false,true]){O.academy.assessing=scenario.id;const s=fixture(high),r=s.scenarioSession,state=s.model.packageSort,p=parcel(s,{route:2,priority:false,damage:null,dg:false,heavy:false});
  assert.equal(s.model.blocked(s.model.player.x,s.model.player.z),false);aim(s,'sort-parcel-'+p.id);r.definition.interact(r,s,'sort-parcel-'+p.id);assert.equal(p.scanned,true);assert.equal(state.stats.scanned,1);assert.equal(s.page.title,`Read package ${p.id}.`);assert.ok(s.page.lines.includes('The label shows route 2.'));assert.ok(!s.page.options.some(o=>/correct|answer|guide/i.test(o.label)));s.handheld.close();
  send(s,'R2');assert.equal(state.score,100);assert.equal(state.stats.correct,1);assert.equal(state.packages.length,0);assert.equal(s.panel.body,'Your decision has been recorded.');s.panel.choices[0].action();assert.equal(state.selectedId,null);s.art.dispose();}O.academy.assessing=null;
});
test('blind and wrong routes, stale inputs and double confirms cannot create extra credit',()=>{
 const s=fixture(),r=s.scenarioSession,state=s.model.packageSort;
 parcel(s,{route:1,damage:null,dg:false,heavy:false,priority:false});const repeat=send(s,'R1');assert.equal(state.stats.blind,1);assert.equal(state.score,0);repeat();
 const p=parcel(s,{route:1,damage:null,dg:false,heavy:false,priority:false});aim(s,'sort-parcel-'+p.id);r.definition.interact(r,s,'sort-parcel-'+p.id);s.handheld.close();send(s,'R2');assert.equal(state.stats.wrong,1);assert.equal(state.stats.blind,1);assert.equal(state.score,0);
 s.closePanel();r.definition.interact(r,s,'sort-parcel-'+p.id);assert.equal(state.stats.scanned,1);assert.ok(s.panel.body.includes('Look at a nearby'));s.art.dispose();
});
test('wave cards wait until the previous belt clears; jam reset requires a stopped belt and nearby ray',()=>{
 const s=fixture(),r=s.scenarioSession,state=s.model.packageSort,p=parcel(s);state.waveTime=state.wave.duration;state.spawnTimer=100;r.definition.update(r,s,0);assert.equal(state.waveIndex,0);assert.equal(s.panel,null);
 S.scan(state,p);S.sort(state,p,S.correctBin(state,p));r.definition.update(r,s,0);assert.equal(state.waveIndex,1);assert.equal(state.state,'rule');assert.ok(s.panel.title.includes('wave 2.'));s.panel.choices[0].action();assert.equal(state.state,'play');
 parcel(s);S.jam(state);state.beltSpeed=20;Object.assign(s.model.player,{x:-7.4,z:16.4});aim(s,'sort-jam');r.definition.interact(r,s,'sort-jam');assert.ok(s.panel.body.startsWith('Wait for the belt'));assert.ok(state.jammed);s.closePanel();state.beltSpeed=.5;aim(s,'sort-jam');r.definition.interact(r,s,'sort-jam');assert.equal(state.jammed,null);assert.equal(state.stats.jamsCleared,1);s.art.dispose();
});
test('a complete five-wave run keeps m2-sort ratios and never changes the suspended workday',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'suspended-sort'});const before=JSON.stringify(O.workday.events),s=fixture(),r=s.scenarioSession,state=s.model.packageSort;results=[];state.random=()=>.5;
 let ticks=0;while(r.phase==='active'&&ticks++<6000){if(s.panel){s.panel.choices[0].action();continue;}for(const p of [...state.packages]){S.scan(state,p);S.sort(state,p,S.correctBin(state,p));}r.definition.update(r,s,.05);}
 assert.equal(r.phase,'finished');assert.equal(state.waveIndex,4);assert.ok(state.stats.correct>50);assert.equal(results.length,1);assert.equal(results[0].id,'m2-sort');assert.equal(results[0].result.ratios.efficiency,1);assert.equal(results[0].result.ratios.safety,1);assert.equal(JSON.stringify(O.workday.events),before);assert.equal(F.finish(r,s),false);assert.equal(F.resolve(scenario).scene,'SortingScene');assert.equal(F.resolve(scenario,{choice:'3d',webgl:false}).scene,'SortingScene');s.art.dispose();
});
