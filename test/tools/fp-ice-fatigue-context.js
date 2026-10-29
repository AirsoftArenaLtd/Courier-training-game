/* Prepared optional entries and CPU poses only; browser protocols must use actual keys after setup. */
const fs=require('node:fs'),vm=require('node:vm');
module.exports=()=>{
 const {c,O,THREE}=require('./fp-problem-route-context')();
 for(const f of ['src/core/fpicefatigue.js','src/core/fpicefatiguestage.js','src/core/fpicefatigueworld.js','src/core/fpicefatiguescenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
 const entries=['ice','fatigue'].map(kind=>({id:'m8-'+kind,module:'m8',title:kind==='ice'?'Slips on Ice':'Tired at the Wheel',scene3d:'wellness-'+kind,categories:kind==='ice'?['safety']:['safety','efficiency'],optional:true}));
 O.registry={get:id=>entries.find(s=>s.id===id),content:()=>({})};O.workday.report=()=>{throw Error('A local lesson wrote into a suspended workday');};
 function fixture(kind,{high=false,world=false,bank=null}={}){
  O.gfx={high:()=>high};const run=O.fpScenario.create('m8-'+kind),m=O.fpScenario.model(run),scene={scenarioSession:run,model:m,panel:null,target:null,loading:false,external:false,transitioning:false,
   clockSentence:()=> 'Time remaining: 300 seconds.',showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back};m.paused=true;},closePanel(){this.panel=null;m.paused=false;},
   finishScenario(){this.result=O.fpIceFatigueStage.result(run,'complete');run.phase='finished';m.paused=true;},handheld:{isOpen:false,show(page){this.isOpen=true;this.page=page;},close(){this.isOpen=false;}},art:{pick:()=>scene.target},sync(){}};
  if(world){const root=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);root.add(camera);scene.assetBank=bank;scene.view={world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}};scene.art=O.fpWorld.build(scene,m);scene.sync=()=>scene.art.sync(m,null,'route');}
  O.fpScenario.begin(run);m.paused=false;scene.sync();return scene;
 }
 return {c,O,THREE,entries,fixture};
};
