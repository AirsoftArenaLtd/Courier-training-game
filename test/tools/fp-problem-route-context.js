/* Actual scenario shell/model/world for CPU integration; positions here are geometry fixtures only. */
const fs=require('node:fs'),vm=require('node:vm');
module.exports=()=>{
 const {c,O,THREE}=require('./fp-problem-context')();
 // CPU tests exercise the bounded glyph fallback. Native rendering checks the browser font atlas.
 c.document={createElement:()=>({width:0,height:0,getContext:()=>null})};
 for(const f of ['data/town.js','data/m3_doorsteps.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/fproute.js','src/core/fptown.js','src/core/fpsigns.js','src/core/fpnav.js','src/core/fpstops.js','src/core/fpproblemprotocol.js','src/core/fpproblemroute.js','src/core/fpproblemrouteui.js'])vm.runInContext(fs.readFileSync(__dirname+'/../../'+f,'utf8'),c);
 c.BaseScenarioScene=class{};O.registerScene=C=>{O.StopReference=C;};vm.runInContext(fs.readFileSync(__dirname+'/../../src/scenes/stops/StopScene.js','utf8'),c);
 const scenario={id:'m4-closure',scene3d:'road-closure',categories:['safety','efficiency']};O.registry={get:()=>scenario,content:()=>({})};O.fpAccess.lookKeys=()=> 'the arrow keys';
 function fixture({high=false}={}){
  O.gfx={high:()=>high};const run=O.fpScenario.create(scenario.id),m=O.fpScenario.model(run),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
  const scene={scenarioSession:run,model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null,handheld:{isOpen:false,show(page){this.isOpen=true;this.page=page;},close(){this.isOpen=false;}},closePanel(){this.panel=null;m.paused=false;},showPanel(title,body,choices,options){this.panel={title,body,choices,back:options?.back};m.paused=true;},finishScenario(){return O.fpScenario.finish(run,this);},sync(){this.art.sync(m,null,'route');}};
  scene.art=O.fpWorld.build(scene,m);O.fpScenario.begin(run);m.paused=false;scene.sync();return scene;
 }
 return {c,O,THREE,scenario,fixture};
};
