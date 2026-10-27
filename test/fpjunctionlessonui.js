/* Junction key/device routing, round replacement, remapped instructions and independent local course results. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js','src/core/fpscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.fpAccess={key:k=>'Mapped '+k,lookKeys:()=> 'Mapped arrows'};O.audio={play(){}};O.workday={report(){throw Error('A junction adapter wrote into a workday.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpdrivinglessonui.js','src/core/fpjunctionlesson.js','src/core/fpjunctionlessonui.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const J=O.fpJunctionLesson,U=O.fpJunctionLessonUI,def=O.fpScenario.definitions.get('junction-approaches');
function setup(){
 const r={id:'m1-junctions',definition:def,scenario:{categories:['safety','efficiency']},phase:'active',log:new O.ScoreLog(),seen:new Set(),elapsed:19,remaining:881};O.fpScenario.model(r);r.model.paused=false;
 const sc={scenarioSession:r,model:r.model,held:{KeyW:true},target:'cab-camera',notice:'old notice',messages:[],panels:[],rebuilds:0,finished:0,message(t){this.messages.push(t);},showPanel(title,body,choices){this.panels.push({title,body,choices});this.model.paused=true;},closePanel(){this.model.paused=false;},rebuildWorld(){this.rebuilds++;},sync(){},refresh(){},finishScenario(){this.finished++;},handheld:{show(p){this.page=p;},close(){}}};return {r,sc};
}
function park(r){const m=r.model,s=m.junctionLesson;J.report(r,J.rounds[s.index].type,{key:J.controlKey(m),ok:true});s.travel=20;Object.assign(m.van,m.stops[0].park,{hand:true,speed:0});}
test('the mounted screen and mapped finish key use the same actual encounter/whole-bay gate',()=>{
 const {r,sc}=setup();U.show(sc);sc.handheld.page.options[0].onPick();assert.equal(sc.rebuilds,0);assert.equal(sc.finished,0);assert.match(sc.messages.at(-1),/planned approach/);
 park(r);sc.model.van.speed=.2;def.key(r,sc,'KeyF');assert.equal(sc.rebuilds,0);assert.match(sc.messages.at(-1),/Stop fully/);sc.model.van.speed=0;U.show(sc);sc.handheld.page.options[0].onPick();assert.equal(sc.rebuilds,1);assert.equal(r.junctionLesson.index,1);assert.equal(sc.model,r.model);assert.equal(sc.model.paused,true);assert.equal(r.elapsed,19);assert.equal(r.remaining,881);assert.equal(Object.keys(sc.held).length,0);assert.equal(sc.target,null);assert.equal(sc.notice,'');assert.equal(r.log.items.length,3);sc.panels.at(-1).choices[0].action();assert.equal(sc.model.paused,false);
});
test('all three rounds retain one log and finish once instead of rebuilding past the last approach',()=>{
 const {r,sc}=setup(),log=r.log;for(let i=0;i<3;i++){park(r);assert.equal(def.key(r,sc,'KeyF'),true);assert.equal(r.log,log);}
 assert.equal(sc.rebuilds,2);assert.equal(sc.finished,1);assert.equal(U.record(sc),false);assert.equal(sc.finished,1);assert.equal(J.result(r).stats.completed,true);r.phase='finished';assert.equal(U.record(sc),false);
});
test('reverse camera, cab and mirrors remain physical while unrelated parcel interactions are blocked',()=>{
 const {r,sc}=setup();assert.equal(def.interact(r,sc,'cab-camera'),true);assert.match(def.hint(r,'cab-camera','Mapped E'),/Mapped E/);sc.model.van.gear=-1;assert.equal(def.interact(r,sc,'cab-camera'),false);assert.equal(def.hint(r,'cab-camera','Mapped E'),null);
 for(const id of ['driver','cab-exit','cab-belt','mirror-left'])assert.equal(def.interact(r,sc,id),false);assert.equal(def.interact(r,sc,'cargo'),true);assert.equal(def.key(r,sc,'KeyP'),false);
});
test('brief and next-round instructions retain actual key remaps and the shared controls entry',()=>{
 const {r,sc}=setup(),brief=def.brief(r);assert.equal(brief.length,3);assert.ok(brief[0].includes('Mapped KeyW'));assert.ok(brief[2].includes('Mapped KeyF'));assert.ok(brief[2].includes('Mapped Tab'));assert.ok(brief.every(t=>t.endsWith('.')));
 park(r);U.record(sc);let controls=0,old=O.fpDrivingLessonUI.controls;O.fpDrivingLessonUI.controls=()=>controls++;try{sc.panels.at(-1).choices[1].action();def.controls(r,sc);assert.equal(controls,2);}finally{O.fpDrivingLessonUI.controls=old;}
});
