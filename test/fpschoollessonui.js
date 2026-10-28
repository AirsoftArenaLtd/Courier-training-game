/* Optional school adapter input, completion and local assessment-report routing. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js','src/core/fpscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.fpAccess={key:code=>'Mapped '+code,lookKeys:()=> 'Mapped arrows'};O.workday={report(){throw Error('The school adapter wrote into the suspended workday.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpdrivinglessonui.js','src/core/fpschoollesson.js','src/core/fpschoollessonui.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const S=O.fpSchoolLesson,U=O.fpSchoolLessonUI,def=O.fpScenario.definitions.get('school-zone-drive');
function setup(){
 const run={id:'m1-school',definition:def,scenario:{categories:['safety']},phase:'active',log:new O.ScoreLog(),seen:new Set()};O.fpScenario.model(run);const m=run.model;m.paused=false;
 const scene={scenarioSession:run,model:m,messages:[],panels:[],finished:0,message(t){this.messages.push(t);},showPanel(title,body,options){this.panels.push({title,body,options});m.paused=true;},closePanel(){m.paused=false;},finishScenario(){this.finished++;},handheld:{show(page){this.page=page;m.paused=true;},close(){m.paused=false;}}};return {run,m,scene};
}
function parkAfterEncounters(m){const s=m.schoolLesson;s.busSeen=s.crossingSeen=true;m.driving.bus.state='done';m.crossing.state='resolved';Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});}
test('the registered school adapter restores the actual town and routes only its four types to the local log',()=>{
 const {run,m}=setup();assert.equal(m.mode,'cab');assert.equal(m.trainingArea,null);assert.deepEqual(m.bounds,m.schoolLesson.bounds);assert.equal(m.van.z,m.schoolLesson.start.z);assert.equal(m.routePlan.signs,1);assert.equal(m.routePlan.traffic,1);assert.equal(m.routePlan.navigation,1);assert.equal(m.drivingLesson,undefined);assert.equal(m.driving.siren.state,'done');
 O.fpMission.emit(m,'drive.school-bus-pass',{key:'bus',ok:false});O.fpMission.emit(m,'drive.school-bus-pass',{key:'bus',ok:false});O.fpMission.emit(m,'drive.route',{key:'not-in-this-contract',ok:true});assert.equal(run.log.items.length,1);assert.equal(run.log.items[0].critical,true);assert.equal(run.log.items[0].got,-4);assert.equal(m.snapshot().schoolLesson,undefined);
});
test('the physical screen and mapped finish key share the same encounter and whole-van parking gate',()=>{
 const {run,m,scene}=setup();U.show(scene);assert.equal(m.paused,true);scene.handheld.page.options[0].onPick();assert.equal(m.paused,false);assert.equal(scene.finished,0);assert.ok(scene.messages.at(-1).endsWith('.'));
 parkAfterEncounters(m);m.van.z+=20;assert.equal(def.key(run,scene,'KeyF'),true);assert.equal(scene.finished,0);assert.match(scene.messages.at(-1),/parking brake\./);
 Object.assign(m.van,m.stops[0].park);U.show(scene);scene.handheld.page.options[0].onPick();assert.equal(scene.finished,1);run.phase='finished';assert.equal(U.finish(scene),false);assert.equal(scene.finished,1);assert.equal(def.key(run,scene,'KeyP'),false);
});
test('the mounted screen leaves reverse-camera and other physical cab controls available',()=>{
 const {run,m,scene}=setup();assert.equal(def.interact(run,scene,'cab-camera'),true);assert.ok(def.hint(run,'cab-camera','Mapped E').includes('Mapped E'));m.van.gear=-1;assert.equal(def.interact(run,scene,'cab-camera'),false);assert.equal(def.hint(run,'cab-camera','Mapped E'),null);
 for(const id of ['driver','cab-exit','cab-belt','mirror-left'])assert.equal(def.interact(run,scene,id),false);assert.equal(def.interact(run,scene,'cargo'),true);
});
test('brief and paged controls name actual remaps and preserve physical mirrors and automatic reversing',()=>{
 const {run,scene}=setup(),brief=def.brief(run);assert.equal(brief.length,3);assert.ok(brief.every(x=>x.endsWith('.')));assert.ok(brief[2].includes('Mapped KeyF'));U.controls(scene);assert.ok(scene.panels.at(-1).body.includes('Mapped KeyP'));scene.panels.at(-1).options[0].action();assert.ok(scene.panels.at(-1).body.includes('Mapped KeyR'));scene.panels.at(-1).options[0].action();const body=scene.panels.at(-1).body;assert.ok(body.includes('Mapped KeyF'));assert.ok(body.includes('Mapped Tab'));assert.ok(body.includes('automatic in reverse'));assert.ok(body.includes('physical mirrors'));
});
