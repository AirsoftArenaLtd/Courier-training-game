/* Night catalogue, real controllers, pretrip timing, whole-bay gates and isolated results. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.workday={report(){throw Error('A night module wrote a workday report.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpschoollesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);

for(const f of ['src/core/fplighting.js','src/core/fpnight.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpnightlesson.js','utf8'),c);

vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpscenario.js','utf8'),c);O.fpAccess={key:k=>'Mapped '+k,lookKeys:()=> 'Mapped arrows'};O.fpDrivingLessonUI={fitDevice(){}};vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpnightlessonui.js','utf8'),c);
const N=O.fpNightLesson,U=O.fpNightLessonUI,def=O.fpScenario.definitions.get('night-route-drive');
function setup(){const r={phase:'active',model:N.model(),log:new O.ScoreLog()};N.attach(r);const scene={scenarioSession:r,model:r.model,messages:[],finished:0,panels:[],handheld:{show(p){this.page=p;},close(){}},message(t){this.messages.push(t);},finishScenario(){this.finished++;r.phase='finished';},showPanel(title,body,choices){this.panels.push({title,body,choices});},closePanel(){}};return {r,scene};}
test('device and keyboard finish controls cannot complete an unstarted or out-of-bay night route',()=>{
 const {r,scene}=setup();U.show(scene);scene.handheld.page.options[0].onPick();assert.equal(scene.finished,0);assert.equal(def.key(r,scene,'KeyF'),true);assert.equal(scene.finished,0);assert.equal(r.log.items.length,0);assert.ok(scene.messages.length===2);assert.equal(def.key(r,scene,'KeyP'),false);
});
test('the night adapter preserves physical inspection, driver, headlights, mirrors and reversing camera',()=>{
 const {r,scene}=setup();for(const id of ['lights','driver','cab-headlights','mirror-left','cab-exit'])assert.equal(def.interact(r,scene,id),false);assert.equal(def.interact(r,scene,'cargo'),true);assert.equal(def.interact(r,scene,'cab-camera'),true);assert.match(def.hint(r,'cab-camera','Mapped E'),/Mapped E/);r.model.van.gear=-1;assert.equal(def.interact(r,scene,'cab-camera'),false);assert.equal(def.hint(r,'cab-camera','Mapped E'),null);
});
test('the night brief and three control pages use the current remapped keys',()=>{
 const {r,scene}=setup(),brief=def.brief(r);assert.equal(brief.length,3);assert.ok(brief[0].includes('Mapped KeyE'));assert.ok(brief[1].includes('Mapped KeyL'));assert.ok(brief[2].includes('Mapped KeyF'));assert.ok(brief[2].includes('Mapped Tab'));def.controls(r,scene);scene.panels.at(-1).choices[0].action();scene.panels.at(-1).choices[0].action();assert.equal(scene.panels.length,3);assert.ok(scene.panels[0].body.includes('Mapped arrows'));assert.ok(scene.panels[1].body.includes('Mapped KeyB'));assert.ok(scene.panels[2].body.includes('Mapped KeyF'));
});
