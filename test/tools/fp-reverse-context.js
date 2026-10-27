/* CPU fixture: optional registration only; no changes to the shipped module registry. */
const fs=require('node:fs'),vm=require('node:vm');
module.exports=()=>{
 const {c,O,THREE}=require('./fp-incident-context')();
 for(const f of ['src/core/fpreverselesson.js','src/core/fpreversescenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
 c.Phaser={Scene:class{}};O.registerScene=()=>{};
 for(const f of ['FirstPersonScene','FirstPersonScenarioScene'])vm.runInContext(fs.readFileSync(__dirname+'/../../src/scenes/'+f+'.js','utf8'),c);
 const entry={id:'m8-reverse',title:'Reversing Near-Miss',categories:['safety'],scene3d:'wellness-reverse',optional:true};
 O.registry={get:id=>id===entry.id?entry:null,content:()=>({})};O.fpAccess.lookKeys=()=> 'Arrow keys';
 function fixture({assessment=false,bank=null}={}){
  O.academy.assessing=assessment?entry.id:null;const r=O.fpScenario.create(entry.id),m=O.fpScenario.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
  const scene={scenarioSession:r,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},assetBank:bank,panel:null,
   handheld:{isOpen:false,show(page){this.page=page;this.isOpen=true;m.paused=true;},close(){this.isOpen=false;m.paused=false;}},
   closePanel(){this.panel=null;m.paused=false;},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back};m.paused=true;},
   message(t){this.notice=t;},showPause(){this.showPanel('Paused.','The scenario is paused.',[{action:()=>this.closePanel()}]);},clockSentence(){return 'Time remaining: 300 seconds.';},
   sync(){this.art.sync(m,null,'route');},finishScenario(reason){return O.fpScenario.finish(r,this,reason);}};
  scene.art=O.fpWorld.build(scene,m);O.fpScenario.begin(r);m.paused=false;scene.sync();return scene;
 }
 return {c,O,THREE,entry,fixture};
};
