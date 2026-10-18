/* Cab speech scheduling, ownership and distance bands, with a deterministic speech clock. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let c,A,s,said,settings,speech;
test.beforeEach(()=>{
 said=[];settings={narrate:true};speech={speaking:false,pending:false,cancels:0,speak(u){this.speaking=true;this.current=u;said.push({text:u.text,time:s.time.now});},cancel(){this.cancels++;this.finish();},finish(){this.speaking=false;this.pending=false;const u=this.current;this.current=null;if(u&&u.onend)u.onend();}};
 c={speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text;},OTR:{a11y:{settings:()=>settings,physical:x=>x,label:x=>x},i18n:{t:x=>x,lang:'ta'},fpCab:{hint:(id,m)=>id==='cab-headlights'?`The headlights are ${m.van.headlights?'on':'off'}.`:''},fpMirrors:{hint:(id,m)=>id==='mirror-left'?m.checked?'Your left mirror check is current.':'Look at the left mirror for a moment to check it.':''},fpRear:{hint:m=>`Rear distance ${m.rearSense.distance}`}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpaccess.js','utf8'),c);A=c.OTR.fpAccess;
 s={time:{now:0},target:null,model:{mode:'cab',van:{gear:1,headlights:false},rearSense:{distance:6}}};
});
const tick=(ms=0,blocked=false)=>{s.time.now+=ms;A.voiceTick(s,blocked);};
test('ordinary hints coalesce at 1.5 seconds and a stable sentence is never repeated',()=>{
 A.voiceHint(s,'First control.');tick();speech.finish();A.voiceHint(s,'Second control.');tick(300);A.voiceHint(s,'Third control.');tick(1199);assert.equal(said.length,1);tick(1);assert.equal(said[1].text,'Third control.');speech.finish();A.voiceHint(s,'Third control.');tick(6000);assert.equal(said.length,2);
});
test('a panel or any external speech keeps ownership until it finishes',()=>{
 speech.speaking=true;A.voiceHint(s,'A control.');tick();assert.equal(said.length,0);tick(2000,true);assert.equal(s.cabVoice.hint,null);s.model.van.gear=-1;s.model.rearSense.distance=.2;tick(1);assert.equal(said.length,0);assert.equal(speech.cancels,0);speech.finish();tick(1);assert.match(said[0].text,/^Stop\./);
});
test('a rear stop is immediate and can interrupt only this adapter, then normal spacing resumes',()=>{
 A.voiceHint(s,'A control.');tick();s.model.van.gear=-1;s.model.rearSense.distance=.3;tick(50);assert.equal(speech.cancels,1);assert.equal(said[1].time,50);assert.match(said[1].text,/^Stop\./);speech.finish();tick(1000);assert.equal(said.length,2);tick(500);assert.equal(said.length,3);assert.equal(said[2].text,'The van is in reverse.');
});
test('camera narration changes only at clear, under three, under one and stop bands',()=>{
 s.model.van.gear=-1;tick();assert.match(said[0].text,/no obstacle within three/);speech.finish();
 for(let i=0;i<40;i++){s.model.rearSense.distance=5.9-i*.06;tick(100);}assert.equal(said.length,1);
 for(const [distance,pattern] of [[2.9,/within three/],[.9,/within one/],[.4,/^Stop\./]]){s.model.rearSense.distance=distance;tick(1500);assert.match(said.at(-1).text,pattern);speech.finish();}
 for(let i=0;i<40;i++){s.model.rearSense.distance=.3;tick(100);}assert.equal(said.length,4);
});
test('camera selection never queues a fractional distance and leaving reverse drops a waiting band',()=>{
 s.model.van.gear=-1;s.model.rearSense.distance=2.7;A.voiceHint(s,c.OTR.fpRear.hint(s.model));tick();speech.finish();s.model.rearSense.distance=.8;tick(100);s.model.van.gear=1;tick(1400);assert.equal(said.at(-1).text,'The van is in drive.');assert.equal(s.cabVoice.rear,null);assert.ok(said.every(u=>!u.text.includes('2.7')));
});
test('actual mirror evidence and switch changes are announced once without a new message',()=>{
 s.target='mirror-left';tick();speech.finish();s.model.checked=true;tick(1500);assert.equal(said.at(-1).text,'Your left mirror check is current.');speech.finish();tick(4000);assert.equal(said.length,2);
 s.target='cab-headlights';tick();speech.finish();s.model.van.headlights=true;tick(1500);assert.equal(said.at(-1).text,'The headlights are on.');
});
test('settings off, no speech API and walking need no speech and store nothing on the model',()=>{
 const original=JSON.stringify(s.model);settings.narrate=false;A.voiceHint(s,'Silent.');tick();assert.equal(s.cabVoice,null);settings.narrate=true;c.speechSynthesis=null;tick();assert.equal(s.cabVoice,null);c.speechSynthesis=speech;tick();assert.equal(JSON.stringify(s.model),original);s.model.mode='walk';tick();assert.equal(s.cabVoice,null);assert.equal(said.length,0);
});
test('utterances use the active translation, language and volume',()=>{
 c.OTR.i18n.t=x=>'Translated '+x;c.OTR.audio={volume:.8};A.voiceHint(s,'A control.');tick();assert.equal(said[0].text,'Translated A control.');assert.equal(speech.current.lang,'ta');assert.equal(speech.current.volume,.8);
});
test('a camera selection outside reverse explains activation, and the first stable notice stays deduplicated',()=>{
 const text=c.OTR.fpRear.hint(s.model);A.voiceHint(s,text);tick();speech.finish();A.voiceHint(s,text);tick(2000);assert.equal(said.length,1);assert.equal(said[0].text,text);
});
