/* Compare the original lifting kernel and scoring, then carry real loads through the finite model. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{},Math:{DegToRad:n=>n*Math.PI/180}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_lifting.js','src/core/theme.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.audio={play(){}};O.fx={floatText(){},shake(){},stamp(){},pop(){},sparkle(){}};O.tex={shape:()=>({setDepth(){return this;},setAlpha(){return this;}})};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m2/LiftingScene.js','utf8'),c);const ref=vm.runInContext('LiftingScene.prototype',c),base=vm.runInContext('BaseScenarioScene.prototype',c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fppackagelift.js','utf8'),c);const A=O.fpPackageLift,C=c.OTR_DATA.lifting,clean=x=>JSON.parse(JSON.stringify(x));
function original(s){const dummy={setValue(){},setText(){},setVisible(){}};return {G:600,PALLET_TOP:582,PALLET_X0:180,PALLET_X1:420,PALLET_X:300,content:C,lift:s.lift,liftIndex:s.index,pose:clean(s.pose),boxState:clean(s.box),health:s.health,score:s.score,qualities:clean(s.qualities),mistakes:clean(s.mistakes),helper:s.helper,phase:s.phase,postureOn:s.postureOn,strain:s.strain,peakLoad:s.peakLoad,gripGap:s.gripGap,gripStoop:s.gripStoop,gripSquat:s.gripSquat,healthBar:dummy,healthText:dummy,banner:dummy,hip:ref.hip,heldBox:ref.heldBox,gripPoint:ref.gripPoint,boxOverPallet:ref.boxOverPallet,backPos:()=>({x:0,y:0}),hurt:ref.hurt,showCoach(){},buildPostureHud(){},clearPostureHud(){this.postureOn=false;},praise(){},time:{delayedCall(){}},tweens:{add(){}}};}
test('2880 physical postures preserve the original reach, spine load, helper relief, accumulated strain and health',()=>{
 let count=0;
 for(let index=0;index<C.lifts.length;index++)for(const x of [420,560,610,640,675,780])for(const squat of [0,.25,.5,1])for(const hold of [false,true])for(const helper of [false,true])for(const gripGap of [0,35])for(const phase of ['approach','carry','set']){
  const s=A.create(C);s.phase='verdict';s.index=index-1;A.next(s);Object.assign(s.pose,{x,squat,hold});s.phase=phase;s.helper=helper;s.gripGap=gripGap;s.gripStoop=.7;s.gripSquat=.8;s.box.mode=hold?'held':'static';const old=original(s),expected=ref.solvePosture.call(old,.05),actual=A.solve(s,.05);
  assert.deepEqual(clean(actual),clean(expected));assert.equal(s.pose.stoop,old.pose.stoop);assert.equal(s.pose.reach,old.pose.reach);assert.equal(s.health,old.health);assert.equal(s.strain,old.strain);assert.equal(s.peakLoad,old.peakLoad);assert.deepEqual(clean(s.mistakes),clean(old.mistakes));assert.deepEqual(clean(A.heldBox(s)),clean(ref.heldBox.call(old)));assert.equal(A.overPallet(s),ref.boxOverPallet.call(old));count++;
 }
 assert.equal(count,2880);
});
test('every original assessment choice preserves its quality, health consequence, effect and equipment score',()=>{
 let comparisons=0;
 C.lifts.forEach((L,index)=>L.options.forEach((option,choice)=>{
  const s=A.create(C);s.index=index-1;s.phase='verdict';A.next(s);const old=original(s);old.addScore=base.addScore;old.coach=(a,b,c,next)=>next();old.applyEffect=ref.applyEffect;old.strainAnim=(amount,mistake,next)=>{ref.hurt.call(old,amount,'',mistake);next();};old.startPosture=ref.startPosture;old.handTruckAnim=()=>ref.finishLift.call(old);
  old.tweens.add=def=>{if(def.elevate!==undefined)def.targets.elevate=def.elevate;if(def.onComplete)def.onComplete();};
  ref.resolveAssess.call(old,option);assert.equal(A.choose(s,choice),true);assert.deepEqual(clean(s.qualities),clean(old.qualities));assert.deepEqual(clean(s.mistakes),clean(old.mistakes));assert.equal(s.health,old.health);assert.equal(s.helper,old.helper);assert.equal(s.pose.elevate,old.pose.elevate);assert.equal(s.score,old.score);assert.equal(A.choose(s,choice),false);comparisons++;
 }));assert.equal(comparisons,13);
});
test('posture qualities, cumulative lift points, lesson priority and final ratios match the original scorer',()=>{
 for(const strain of [0,.3,1,2.2,3])for(const quality of [undefined,.2,.35,.6,.85,1]){
  const s=A.create(C);A.next(s);A.choose(s,0);s.phase='carry';s.strain=strain;s.health=73;s.pose.hold=true;const old=original(s);old.addScore=base.addScore;old.finishPosture=ref.finishPosture;
  ref.finishPosture.call(old,quality,false);ref.finishLift.call(old);A.finishPosture(s,quality);assert.deepEqual(clean(s.qualities),clean(old.qualities));assert.equal(s.score,old.score);const points=s.score;assert.equal(A.finishPosture(s,quality),false);assert.equal(A.finishLift(s),false);assert.equal(s.score,points);
  s.mistakes=['far','stoop','heavy','drop'];old.mistakes=s.mistakes.slice();s.phase='done';let result;O.flow={complete:(scene,id,r)=>{result=r;}};old.finish=base.finish;old.time.delayedCall=(delay,fn)=>{if(delay===1800)fn();};ref.endScenario.call(old);const actual=A.result(s);assert.equal(actual.score,result.score);assert.deepEqual(clean(actual.ratios),clean(result.ratios));assert.deepEqual(clean(actual.lessons),clean(result.lessons));assert.deepEqual(clean(actual.stats),clean(result.stats));assert.equal(A.result(s),actual);
 }
});
test('five planned lifts can actually be completed with smooth leg movement, equipment and a step stool',()=>{
 const s=A.create(C);let steps=0;
 const advance=(input,predicate)=>{while(!predicate()&&steps++<4000)A.advance(s,input,.05);assert.ok(steps<4000,'the physical lift must remain achievable');};
 while(A.next(s)){
  assert.equal(A.choose(s,0),true);if(s.phase==='verdict')continue;
  advance({right:true},()=>s.pose.x>=640);if(!s.lift.high)advance({down:true},()=>s.pose.squat===1);
  assert.equal(A.action(s),true,'hands can reach the actual load');advance({up:true},()=>s.pose.squat===0);
  advance({left:true},()=>A.overPallet(s)&&Math.abs(A.heldBox(s).x-300)<=5);advance({down:true},()=>s.pose.squat===1);assert.equal(A.action(s),true,'whole load is lowered onto the pallet');assert.equal(s.phase,'verdict');
 }
 assert.equal(s.phase,'done');const result=A.result(s);assert.equal(result.score,1000);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.deepEqual(clean(s.mistakes),[]);
});
test('invalid grips and early completion earn nothing; a distant release produces the original twist injury',()=>{
 const s=A.create(C);assert.equal(A.result(s),null);assert.equal(A.choose(s,0),false);A.next(s);assert.equal(A.choose(s,99),false);A.choose(s,0);assert.equal(A.action(s),false);assert.equal(s.pose.hold,false);
 const before=clean(s.pose);A.advance(s,{right:true,down:true},100,false);assert.deepEqual(clean(s.pose),before);A.advance(s,{right:true},100);assert.equal(s.pose.x,before.x+7.5);
 s.pose.x=640;s.pose.squat=1;assert.equal(A.action(s),true);assert.equal(A.action(s),true);assert.equal(s.health,88);assert.ok(s.mistakes.includes('twist'));assert.equal(s.phase,'verdict');assert.equal(s.score,188);
});
