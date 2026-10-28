/* CPU component context. Menu guards have an explicit pick stub; real world rays are checked separately. */
const fs=require('node:fs'),vm=require('node:vm');
module.exports=()=>{
 const {c,O,THREE}=require('./fp-problem-route-context')();
 for(const f of ['data/scanner.js','src/core/fpproblemblocked.js','src/core/fpproblemblockedworld.js','src/core/fpproblemblockedui.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
 const scenario={id:'m4-blocked',scene3d:'blocked-drive',categories:['safety','service']};O.registry={get:()=>scenario,content:()=>({})};
 function fixture({world=false,high=false}={}){
  O.gfx={high:()=>high};
  const run=O.fpScenario.create(scenario.id),m=O.fpScenario.model(run),scene={scenarioSession:run,model:m,target:null,panel:null,closed:0,
   art:{pick(){return scene.target;}},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back};m.paused=true;},closePanel(){this.panel=null;this.closed++;m.paused=false;},sync(){},finishScenario(){return O.fpScenario.finish(run,this);},handheld:{show(page){this.page=page;},close(){}}};
  if(world){const root=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);root.add(camera);scene.view={world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}};scene.art=O.fpWorld.build(scene,m);scene.sync=()=>scene.art.sync(m,null,'route');}
  O.fpScenario.begin(run);m.paused=false;if(world)scene.sync();return scene;
 }
 return {c,O,THREE,fixture};
};
