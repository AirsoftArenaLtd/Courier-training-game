/* Original first-person motor and M8 source callbacks; renderer and native input are intentionally absent. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=()=>{
 const context=require('./fp-wellness-context')(),{c,O,K,B,fixture:stopFixture}=context;
 for(const f of ['src/core/firstperson.js','src/core/fpwellnessstage.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',f),'utf8'),c);
 const S=O.fpWellnessStage;
 function fixture(id='m8-steps',index=0){
  const model=O.fp.create();model.customerStop=stopFixture(id,index);Object.assign(model.van,{x:1.7,z:-42,gear:2});
  Object.assign(model.player,{x:7,z:-38.5,yaw:0,pitch:0});model.bounds={x0:-19,x1:19,z0:-54,z1:22};model.paused=false;model.mode='walk';
  const stage=S.create(model);model.solids=[{x:12,z:-47,w:7,d:4},...S.solids(model)];B.exit(model.customerStop,true);return model;
 }
 const input=changes=>Object.assign({forward:false,back:false,left:false,right:false,careful:false},changes);
 function tick(m,keys,seconds=.05,active=true){if(active)m.step(keys,seconds);return S.observe(m,keys,seconds,active);}
 function walk(m,x,z,careful=false){let n=0;while(Math.hypot(m.player.x-x,m.player.z-z)>.04&&n++<2000){m.player.yaw=Math.atan2(x-m.player.x,-(z-m.player.z));tick(m,input({forward:true,careful}),.0125);}return n<2000;}
 return {...context,S,fixture,input,tick,walk};
};
