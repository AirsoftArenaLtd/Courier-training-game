/* Actual module runner, mission walking motor, cargo raycasts and original M6 evaluator. */
module.exports=()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../../lib/three.min.js'),c={THREE,Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m6_loading.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpsignlettering.js','src/core/fpmountedwords.js','src/core/fpactors.js','src/core/fploading.js','src/core/fploadingworld.js','src/core/fpscenario.js','src/core/fpworld.js','src/core/fploadingscenario.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,K=O.fpLoading,A=O.fpLoadingScenario;O.gfx={high:()=>false};O.fpAccess.reduced=()=>true;O.fpAccess.key=k=>k;O.academy={coaching:()=>true,assessing:null,abandons:0,abandon(){this.abandons++;this.assessing=null;}};O.registerScene=()=>{};
for(const f of ['src/scenes/BaseScenarioScene.js','src/scenes/m6/LoadingScene.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
function fixture(id='m6-load',{bank=null,assessment=false}={}){
 const entry={...c.OTR_DATA.modules.find(m=>m.id==='m6').scenarios.find(s=>s.id===id),scene3d:'loading-cargo'};O.registry={get:()=>entry,content:()=>c.OTR_DATA.loading[entry.dataKey.split('.')[1]]};O.academy.assessing=assessment?id:null;O.flow={complete(scene,id,result){scene.completed={id,result};}};
 const run=F.create(id),m=F.model(run),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
 const scene={scenarioSession:run,model:m,assetBank:bank,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,target:null,external:false,transitioning:false,
  handheld:{isOpen:false,show(page){scene.closePanel();this.page=page;this.isOpen=true;m.paused=true;},close(){this.isOpen=false;m.paused=false;}},
  showPanel(title,body,choices,options){this.handheld.close();this.panel={title,body,choices,back:options?.back};m.paused=true;},closePanel(){this.panel=null;m.paused=false;},message(text){this.notice=text;},refresh(){},
  rebuildWorld(){if(this.art)this.art.dispose();this.art=O.fpWorld.build(this,m);},sync(){this.art.sync(m,null,'route');},aimTarget(){this.sync();return this.target=this.art.pick();},finishScenario(){F.finish(run,this);}};
 scene.rebuildWorld();F.begin(run);run.definition.tick(run,scene,0,false);scene.closePanel();scene.sync();return scene;
}
function aim(scene,id){scene.sync();const o=scene.art.interactions.find(o=>o.userData.interaction===id&&o.visible);assert.ok(o,'visible '+id);const target=o.getWorldPosition(new THREE.Vector3()),eye=scene.view.camera.position,p=scene.model.player;p.yaw=Math.atan2(target.x-p.x,-(target.z-p.z));p.pitch=Math.max(-1.05,Math.min(1.05,Math.atan2(eye.y-target.y,Math.hypot(target.x-p.x,target.z-p.z))));scene.sync();assert.equal(scene.art.pick(),id,'actual physical ray '+id);scene.target=id;return id;}
function use(scene,id){scene.closePanel();scene.handheld.close();aim(scene,id);scene.scenarioSession.definition.interact(scene.scenarioSession,scene,id);}
function walk(scene,x,z){scene.closePanel();scene.handheld.close();let n=0;while(Math.hypot(scene.model.player.x-x,scene.model.player.z-z)>.08&&n++<3000){const p=scene.model.player;p.yaw=Math.atan2(x-p.x,-(z-p.z));scene.model.step({forward:true},.025);F.advance(scene.scenarioSession,.025,true);scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.025,true);}assert.ok(n<3000,JSON.stringify({goal:[x,z],actual:scene.model.player}));scene.sync();}
return {c,O,THREE,F,K,A,fixture,aim,use,walk};
};
