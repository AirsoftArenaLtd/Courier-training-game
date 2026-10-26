/* Whole mission, original mirrors and injected unloaded safety art. No production registry/default change. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=()=>{
 const ctx=require('./fp-scanner-context')(),{c,O}=ctx;
 for(const f of ['data/m8_stops.js','src/core/scenery.js','src/core/fpwellnessstop.js','src/core/fpwellnessstage.js','src/core/fpwellnessstopworld.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',f),'utf8'),c);
 vm.runInContext('('+require('./fp-wellness-fixture').toString()+')({start:false})',c);
 function fixture(id='m8-steps',index=0,{bank=null}={}){
  const scene=ctx.fixture('m5-pod',{bank}),m=scene.model,spec=c.OTR_DATA.modules.find(mod=>mod.id==='m8').scenarios.find(s=>s.id===id),content=c.OTR_DATA.stopSets[spec.dataKey.split('.')[1]];
  m.customerStop=O.fpWellnessStop.create(id,content,spec.categories,{coaching:true});const d=m.customerStop;d.index=index;O.fpCustomerStop.prepare(d);O.fpWellnessStop.prepare(d);ctx.A.configure(scene.scenarioSession,m);O.fpWellnessStage.create(m);m.solids.push(...O.fpWellnessStage.solids(m));O.fpCustomerStop.begin(d);scene.rebuildWorld();scene.sync();return scene;
 }
 return {...ctx,fixture};
};
