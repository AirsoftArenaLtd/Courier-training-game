/* Ambient presentation cannot occupy trainee paths or change the mission. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpambient.js','utf8'),c);const F=c.OTR.fpAmbient;
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(seed=7){
 const m={kind:'campaign',seed,elapsed:0,stops:[{lotId:'delivery'}],town:{lots:[]}},footprints=[];
 for(let i=0;i<12;i++){
  const side=i%2?1:-1,lot={id:i===0?'delivery':'lot'+i,side,x:Math.floor(i/3)*18,z:i%3*15,w:6+seed%5*.5,d:8+seed%3};m.town.lots.push(lot);
  footprints.push({kind:'house',lotId:lot.id,x:lot.x+side*lot.w*.13,z:lot.z,w:lot.w*.72,d:lot.d,h:4});
 }
 return {m,footprints};
}
function safe(site,lot,footprints){
 for(const at of [site.z-site.span,site.z,site.z+site.span]){
  assert.ok(site.x-site.radius>lot.x-lot.w/2&&site.x+site.radius<lot.x+lot.w/2,'Body leaves the existing solid lot');
  assert.ok(at-site.radius>lot.z-lot.d/2&&at+site.radius<lot.z+lot.d/2,'Path enters public walking space');
 }
 for(const b of footprints)if((b.minY??0)<=1.8&&(b.maxY??b.h??3)>=.05){
  const separated=site.x+site.radius<b.x-b.w/2||site.x-site.radius>b.x+b.w/2||site.z+site.span+site.radius<b.z-b.d/2||site.z-site.span-site.radius>b.z+b.d/2;
  assert.ok(separated,'The swept body intersects a rendered house or prop');
 }
}
test('whole walk paths stay in non-delivery solids and outside rendered footprints',()=>{
 for(let seed=1;seed<=100;seed++){
  const {m,footprints}=fixture(seed),before=JSON.stringify(m),plans=F.plan(m,footprints);assert.ok(plans.length>=8);
  for(const p of plans){assert.notEqual(p.lotId,'delivery');safe(p,m.town.lots.find(l=>l.id===p.lotId),footprints);}
  assert.equal(JSON.stringify(m),before);
 }
});
test('occupied yards, missing bounds and depot space produce no ambient site',()=>{
 const {m,footprints}=fixture();m.town.lots[1].kind='depot';
 for(const l of m.town.lots)footprints.push({kind:'prop',x:l.x,z:l.z,w:l.w,d:l.d,h:2});
 assert.equal(F.plan(m,footprints).length,0);assert.equal(F.plan(m,[]).length,0);assert.equal(F.plan(m,[{x:NaN,z:0,w:2,d:2}]).length,0);
 assert.equal(F.plan({...m,kind:'practice'},footprints).length,0);
});
test('overhead bounds leave ground space usable while a ground prop blocks it',()=>{
 const {m,footprints}=fixture();const target=m.town.lots[1];
 footprints.push({x:target.x,z:target.z,w:target.w,d:target.d,minY:2.5,maxY:4});
 assert.ok(F.plan(m,footprints).some(s=>s.lotId===target.id));
 footprints[footprints.length-1].minY=0;assert.ok(!F.plan(m,footprints).some(s=>s.lotId===target.id));
});
test('quality limits, distance and a later delivery update apply immediately, using reused slots',()=>{
 const {m,footprints}=fixture(),before=JSON.stringify(m);
 for(const high of [false,true]){
  const a=F.create(m,footprints,high),slots=a.slots,first=a.sites[0];a.select(m,first.x,first.z);assert.equal(a.slots,slots);assert.equal(slots.length,high?2:1);assert.ok(slots.filter(s=>s.visible).length<=slots.length);
  const picked=slots[0].site;assert.ok(picked);const updated={...m,stops:[...m.stops,{lotId:picked.lotId}]};a.select(updated,first.x,first.z);assert.ok(slots.every(s=>!s.visible||s.site.lotId!==picked.lotId));
  a.select(m,10000,10000);assert.ok(slots.every(s=>!s.visible));a.dispose();a.select(m,first.x,first.z);assert.ok(slots.every(s=>!s.visible));
 }
 assert.equal(JSON.stringify(m),before);
});
test('resuming the same model and time gives identical choices and poses',()=>{
 const {m,footprints}=fixture(),a=F.create(m,footprints,true),restored=clone(m),b=F.create(restored,clone(footprints),true),p=a.sites[0];
 for(const time of [0,1.5,8,49.25,10000]){m.elapsed=restored.elapsed=time;assert.deepEqual(clone(a.select(m,p.x,p.z)),clone(b.select(restored,p.x,p.z)));}
});
test('loops remain bounded and continuous; reduced motion holds the same idle pose',()=>{
 const {m,footprints}=fixture(),p=F.plan(m,footprints)[0],out={};let previous=null;
 for(let n=0;n<=1600;n++){
  F.sample(p,n/100,false,out);assert.ok(Math.abs(out.z-p.z)<=p.span+1e-10);assert.equal(out.x,p.x);assert.ok([out.x,out.y,out.z,out.yaw].every(Number.isFinite));
  if(previous!==null)assert.ok(Math.abs(out.z-previous)<.02);previous=out.z;
 }
 F.sample(p,0,true,out);const still=clone(out);for(const time of [1,5,50,10000]){F.sample(p,time,true,out);assert.deepEqual(clone(out),still);assert.equal(out.walking,false);}
});
