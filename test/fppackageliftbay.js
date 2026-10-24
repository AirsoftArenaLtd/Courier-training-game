/* Physical projection/input adapter: achievable original scores, real helper/trolley interlocks and finite poses. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_lifting.js','src/core/theme.js','src/core/firstperson.js','src/core/fppackagelift.js','src/core/fppackageliftbay.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const B=c.OTR.fpPackageLiftBay,A=c.OTR.fpPackageLift,C=c.OTR_DATA.lifting;
function until(s,input,predicate){let n=0;while(!predicate()&&n++<4000)B.step(s,input,.05);assert.ok(n<4000,'the physical action remains achievable');}
test('five real bay workflows preserve the original 1000 points and perfect safety/technique',()=>{
 const s=B.create(C);while(B.next(s)){
  assert.equal(B.choose(s,0),true);if(s.bay.mode==='waiting-helper'){assert.equal(B.grip(s),false);assert.equal(B.requestHelper(s),true);assert.equal(B.requestHelper(s),false);}
  if(s.bay.mode==='equipment'){
   assert.equal(B.takeHandle(s),false);until(s,{right:true},()=>s.pose.x>=s.bay.sourceX+55);assert.equal(B.takeHandle(s),true);assert.equal(B.takeHandle(s),false);until(s,{left:true},()=>s.bay.mode==='unload');assert.equal(B.unload(s),true);assert.equal(B.unload(s),false);assert.ok(s.bay.parcel.x-s.bay.parcel.w/2>=B.x(180));assert.ok(s.bay.parcel.x+s.bay.parcel.w/2<=B.x(420));continue;
  }
  until(s,{right:true},()=>s.pose.x>=640);if(!s.lift.high)until(s,{down:true},()=>s.pose.squat===1);
  assert.equal(B.grip(s),true);until(s,{up:true},()=>s.pose.squat===0&&s.pose.elevate===0);
  until(s,{left:true},()=>A.overPallet(s)&&Math.abs(A.heldBox(s).x-300)<=5);until(s,{down:true},()=>s.pose.squat===1);assert.equal(B.grip(s),true);assert.equal(s.bay.mode,'verdict');
  assert.ok(Math.abs(s.bay.parcel.z-B.loadZ)<1e-9);assert.ok(Math.abs(s.bay.parcel.y-s.bay.parcel.h/2-.18)<1e-9);
 }
 const r=A.result(s);assert.equal(r.score,1000);assert.equal(r.ratios.safety,1);assert.equal(r.ratios.efficiency,1);assert.deepEqual(Array.from(s.mistakes),[]);
});
test('all 13 original choices retain their health, quality, equipment points and helper requirement',()=>{
 let count=0;C.lifts.forEach((L,index)=>L.options.forEach((option,n)=>{const a=A.create(C),s=B.create(C);a.index=s.index=index-1;a.phase=s.phase='verdict';A.next(a);B.next(s);A.choose(a,n);B.choose(s,n);assert.equal(s.score,a.score);assert.equal(s.health,a.health);assert.equal(JSON.stringify(s.qualities),JSON.stringify(a.qualities));assert.equal(s.helper,a.helper);assert.equal(s.pose.elevate,a.pose.elevate);if(s.helper)assert.equal(s.bay.mode,'waiting-helper');count++;}));assert.equal(count,13);
});
test('the platform prevents floating sideways; only an explicit carrying step requests a foot pivot',()=>{
 const s=B.create(C);s.index=3;s.phase='verdict';B.next(s);B.choose(s,0);const x=s.pose.x;B.step(s,{left:true},.05);assert.equal(s.pose.x,x);assert.equal(s.pose.elevate,60);assert.equal(s.bay.body.y,.6);assert.equal(B.grip(s),true);
 until(s,{up:true},()=>s.pose.elevate===0);B.step(s,{left:true},.05);assert.equal(s.bay.pivoted,true);assert.equal(s.pose.dir,-1);assert.ok(s.bay.body.z>=B.rowZ);assert.ok(s.bay.body.eye>0);
});
test('projection reuses fixed objects and stays finite through stance, platform, helper and trolley states',()=>{
 const s=B.create(C),body=s.bay.body,parcel=s.bay.parcel,truck=s.bay.truck;for(let i=0;i<1000;i++){s.index=i%5-1;s.phase='verdict';B.next(s);B.choose(s,0);if(s.bay.mode==='waiting-helper')B.requestHelper(s);for(let j=0;j<20;j++)B.step(s,{right:true,down:true},.05);assert.equal(s.bay.body,body);assert.equal(s.bay.parcel,parcel);assert.equal(s.bay.truck,truck);for(const p of [body,parcel,truck])assert.ok(Object.values(p).every(Number.isFinite));assert.ok(body.x>=B.x(160)&&body.x<=B.x(900));assert.ok(body.eye>=.8);}
});
