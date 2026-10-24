/* CPU integration fixture only. Native browser evidence must use actual remapped keys. */
const fs=require('node:fs'),vm=require('node:vm'),THREE=require('../../lib/three.min.js');
module.exports=()=>{
 const c={THREE};c.window=c;vm.createContext(c);
 for(const f of ['data/theme.js','data/config.js','data/modules.js','data/workday_events.js','data/m4_dialogues.js','data/m4_recover.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpactors.js','src/core/fpsignlettering.js','src/core/fpscenario.js','src/core/fpcustomertalk.js','src/core/fpcustomerstage.js','src/core/fpproblemstage.js','src/core/fpmountedwords.js','src/core/fpcustomerworld.js','src/core/fpworld.js','src/core/fpcustomerscenario.js','src/core/fpproblemscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
 const O=c.OTR,F=O.fpScenario;O.gfx={high:()=>false};O.fpAccess={reduced:()=>true,key:k=>k};O.academy={assessing:null,coaching(){return !this.assessing;},abandon(){this.assessing=null;}};O.flow={complete(){}};
 const specs=c.OTR_DATA.modules.find(m=>m.id==='m4').scenarios;
 function fixture(id,{bank=null,assessment=false}={}){
  const entry=specs.find(s=>s.id===id);O.registry={get:()=>({...entry,scene3d:'problem-conversation'}),content:()=>c.OTR_DATA.dialogues[entry.dataKey.split('.')[1]]};O.academy.assessing=assessment?id:null;
  const run=F.create(id),m=F.model(run),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
  const scene={assetBank:bank,scenarioSession:run,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,loading:false,external:false,transitioning:false,handheld:{isOpen:false,show(p){this.isOpen=true;this.page=p;},close(){this.isOpen=false;}},closePanel(){this.panel=null;m.paused=false;},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back,root:{list:[{type:'Text',y:170,setText(text){this.value=text;}}]}};m.paused=true;},showPause(){this.showPanel('Paused.','The scenario is paused.',[{action:()=>this.closePanel()}]);},sync(){this.art.sync(m,null,'route');},message(t){this.notice=t;},finishScenario(){F.finish(run,this);},toHub(){F.abandon(run);}};
  scene.art=O.fpWorld.build(scene,m);F.begin(run);m.paused=false;scene.sync();return scene;
 }
 return {c,O,THREE,specs,fixture};
};
