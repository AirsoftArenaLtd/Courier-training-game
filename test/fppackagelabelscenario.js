/* The real runner/model/world combination: collision clearance, visible evidence, local completion and fallback. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','data/m2_labels.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpsignlettering.js','src/core/fppackagelabelworld.js','src/core/fpworld.js','src/core/fpscenario.js','src/core/fppackagelabels.js','src/core/fppackagelabelscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,A=O.fpPackageLabels,W=O.fpPackageLabelWorld;
const scenario={id:'m2-labels',scene:'LabelScene',scene3d:'package-label-station',categories:['safety','efficiency']};let results=[];
O.registry={get:id=>id===scenario.id?scenario:null,content:()=>c.OTR_DATA.labels};O.academy={assessing:null,coaching(){return !this.assessing;}};O.flow={complete:(scene,id,result)=>results.push({id,result})};
function fixture(high=false){
 O.gfx={high:()=>high};const run=F.create(scenario.id),m=F.model(run),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),scene={scenarioSession:run,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,closePanel(){m.paused=false;},sync(){this.art.sync(m,null,'route');},finishScenario(){F.finish(run,this);}};world.add(camera);scene.art=O.fpWorld.build(scene,m);scene.sync();F.begin(run);return scene;
}
test('the station and every input position lie inside the real depot, with no wall or prop overlap',()=>{
 for(const high of [false,true]){const s=fixture(high),m=s.model,a=s.art.packageLabels;assert.equal(m.blocked(m.player.x,m.player.z),false,'initial player is inside the depot wall');
  O.fpPackageLabelScenario.next(s);assert.equal(a.visible('front',s.view.camera),true,'initial physical face is unobstructed');assert.deepEqual(Object.keys(m.packageLabels.seen),[],'creating a package never grants inspection credit');
  for(const id of W.stations){const p=W.stationPoint(id);Object.assign(m.player,{x:p.x,z:p.z+1.7});assert.equal(m.blocked(m.player.x,m.player.z),false,id+' access is not inside a solid');s.sync();const target=a.targets.find(o=>o.userData.interaction==='label-station-'+id);s.view.camera.lookAt(target.getWorldPosition(new THREE.Vector3()));s.view.camera.updateMatrixWorld(true);assert.equal(s.art.pick(),'label-station-'+id,id+' reachable by real rays');}
  for(const solid of W.solids()){assert.equal(m.blocked(solid.x,solid.z),true,'new furniture blocks walking');const overlaps=m.solids.slice(0,-7).filter(p=>Math.abs(p.x-solid.x)<(p.w+solid.w)/2&&Math.abs(p.z-solid.z)<(p.d+solid.d)/2);assert.equal(overlaps.length,0,'no existing depot prop intersects new furniture');}s.art.dispose();}
});
test('physical orientation alone never grants evidence; the real active update observes a clear face',()=>{
 const s=fixture(),r=s.scenarioSession,m=s.model;O.fpPackageLabelScenario.next(s);s.view.camera.lookAt(new THREE.Vector3(-5,1.65,16.6));s.view.camera.updateMatrixWorld(true);r.definition.update(r,s,.05);assert.deepEqual(Object.keys(m.packageLabels.seen),[]);
 s.sync();r.definition.update(r,s,.05);assert.equal(m.packageLabels.seen.front,true);
 m.packageLabels.presentationFace='base';s.sync();r.definition.update(r,s,.05);assert.equal(m.packageLabels.seen.base,true);assert.equal(Object.keys(m.packageLabels.seen).length,2);
 assert.ok(O.fpPackageLabelScenario.read(s).startsWith('You are looking at the base.'));s.art.dispose();
});
test('module completion preserves the original identity, full score scale, local log and suspended workday',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'suspended'});const before=JSON.stringify(O.workday.events),s=fixture(),r=s.scenarioSession,state=s.model.packageLabels;results=[];
 O.fpPackageLabelScenario.next(s);
 for(let item=0;item<9;item++){
  for(const face of A.faces){state.presentationFace=face;s.sync();r.definition.update(r,s,0);assert.equal(state.seen[face],true,face+' actually exposed');}
  A.answer(state,state.item.answer);if(item<8)O.fpPackageLabelScenario.next(s);
 }
 assert.equal(F.finish(r,s),true);assert.equal(results.length,1);assert.equal(results[0].id,'m2-labels');assert.equal(results[0].result.score,3150);assert.equal(results[0].result.ratios.safety,1);assert.equal(results[0].result.ratios.efficiency,1);assert.equal(results[0].result.log,r.log);assert.equal(JSON.stringify(O.workday.events),before);assert.equal(F.finish(r,s),false);s.art.dispose();
});
test('assessment omits the guide and feedback; the original 2D scenario remains the default and fallback',()=>{
 assert.equal(F.resolve(scenario).scene,'LabelScene');assert.equal(F.resolve(scenario,{choice:'3d',webgl:false}).scene,'LabelScene');
 O.academy.assessing='m2-labels';const s=fixture();O.fpPackageLabelScenario.next(s);let page,closed=0;s.handheld={show(p){page=p;},close(){closed++;}};
 O.fpPackageLabelScenario.inspect(s);assert.ok(page);assert.equal(page.options.some(o=>o.label==='Read the handling guide.'),false);O.fpPackageLabelScenario.guide(s);assert.equal(closed,1);
 s.showPanel=(title,body)=>{assert.equal(body,'Your decision has been recorded.');};O.fpPackageLabelScenario.verdict(s,{ok:false,station:'belt'});s.art.dispose();O.academy.assessing=null;
});
test('turn controls require the front operator position and acknowledge unavailable inputs without grading',()=>{
 const s=fixture();O.fpPackageLabelScenario.next(s);let panel=null,page=null;
 s.message=()=>{};s.showPanel=(title,body,choices)=>{panel={title,body,choices};};s.handheld={show(p){page=p;},close(){}};
 for(const position of [{x:-6,z:9,yaw:0},{x:-10,z:13.2,yaw:Math.PI}]){
  Object.assign(s.model.player,position);s.sync();panel=null;O.fpPackageLabelScenario.inspect(s);
  assert.ok(panel,'assessment-independent neutral feedback is visible');assert.equal(panel.body,'Stand in front of the inspection table and look at the package before turning it.');assert.equal(s.model.packageLabels.stats.total,0);assert.equal(page,null);
 }
 Object.assign(s.model.player,{x:-10,z:16.6,yaw:0});s.sync();O.fpPackageLabelScenario.inspect(s);assert.equal(page.title,'Inspect package 1 of 9.');s.art.dispose();
});
