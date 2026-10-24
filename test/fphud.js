/* Display lifetime and destinations must never become mission or scoring state. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fphud.js','utf8'),c);const H=c.OTR.fpHud;
test('key help follows the actual workday, including later-day resumes',()=>{
 assert.ok(H.firstDay(null));assert.ok(H.firstDay({kind:'practice'}));assert.ok(H.firstDay({kind:'campaign',routePlan:{day:1}}));assert.equal(H.firstDay({kind:'campaign',routePlan:{day:2}}),false);assert.equal(H.firstDay({kind:'campaign',routePlan:{day:30}}),false);
});
test('routine prompts fade after a reading interval and a new target restores them',()=>{
 const state={};assert.equal(H.alpha(state,'a','Press E to interact.',100,false,false),1);assert.equal(H.alpha(state,'a','Press E to interact.',7200,false,false),0);assert.equal(H.alpha(state,'b','Press E to interact.',7300,false,false),1);
});
test('long translated prompts have bounded reading time, without repeat resets',()=>{
 const state={},text='Long translation. '.repeat(100);assert.equal(H.alpha(state,'a',text,0,false,false),1);assert.ok(H.alpha(state,'a',text,15500,false,false)>0);assert.equal(H.alpha(state,'a',text,16000,false,false),0);assert.equal(state.at,0);
});
test('reduced motion never interpolates prompt opacity',()=>{
 const state={};assert.equal(H.alpha(state,'a','Read this sentence.',0,false,true),1);assert.equal(H.alpha(state,'a','Read this sentence.',6900,false,true),1);assert.equal(H.alpha(state,'a','Read this sentence.',7000,false,true),0);
});
test('active warnings remain fully visible after ordinary prompt expiry',()=>{
 const state={};H.alpha(state,'stop','Stop.',0,true,false);assert.equal(H.alpha(state,'stop','Stop.',60000,true,false),1);assert.equal(H.alpha(state,'stop','',60000,true,false),0);
});
test('cab destinations follow the active stop and return phase without writes',()=>{
 const m={kind:'campaign',phase:'route',activeStop:2,stop:id=>({address:['12 Maple Ave','14 Pine Lane','18 Birch Road'][id]})};const before=JSON.stringify(m);assert.equal(H.destination(m),'Drive to 18 Birch Road.');assert.equal(JSON.stringify(m),before);m.phase='return';assert.equal(H.destination(m),'Return to the depot.');m.phase='prepare';assert.equal(H.destination(m),'Prepare the van before departure.');m.kind='parking';assert.equal(H.destination(m),'Reverse into the marked bay.');
});
test('trainer sat-nav off and selecting reverse both hide the route screen',()=>{
 const m={mode:'cab',van:{gear:1},workdayRules:{satnav:'full'}};assert.ok(H.navigationAllowed(m));m.workdayRules.satnav='line';assert.ok(H.navigationAllowed(m));m.workdayRules.satnav='off';assert.equal(H.navigationAllowed(m),false);m.workdayRules.satnav='full';m.van.gear=-1;assert.equal(H.navigationAllowed(m),false);m.van.gear=1;m.mode='walk';assert.equal(H.navigationAllowed(m),false);
});
test('the shared physical screen reads its current navigation or rear-camera content',()=>{
 c.OTR.fpRear={hint:()=> 'The rear camera is live.'};const m={mode:'cab',kind:'campaign',phase:'return',van:{gear:1}};assert.equal(H.screenHint(m),'Return to the depot.');m.van.gear=-1;assert.equal(H.screenHint(m),'The rear camera is live.');
});
test('live safety alerts remain independent of the selected physical control',()=>{
 c.OTR.fpDriving={hint:()=> 'An emergency vehicle is behind you. Signal, pull over to the right and stop.'};c.OTR.fpDay={hint:()=>''};const s={target:'cab-headlights',model:{mode:'cab',kind:'campaign',van:{belt:true}}};assert.match(H.alert(s),/emergency vehicle/);c.OTR.fpDriving.hint=()=>'';s.model.van.belt=false;assert.equal(H.alert(s),'Fasten the seatbelt before moving.');s.model.van.belt=true;c.OTR.fpDay.hint=()=> 'Dispatch has sent a route update.';assert.match(H.alert(s),/Dispatch/);
});
test('a low-clearance alert survives routine camera notices without hiding another safety alert',()=>{
 const warning='The clearance is 8 feet 10 inches. Take another street.';
 c.OTR.fpDamageFlow={warning:m=>m.damage&&m.damage.enabled?warning:''};
 c.OTR.fpDriving={hint:()=> 'An emergency vehicle is behind you.'};c.OTR.fpDay={hint:()=>''};
 const s={notice:'The rear camera is live.',model:{kind:'campaign',mode:'cab',van:{gear:-1,belt:true},damage:{enabled:true}}};
 assert.match(H.alert(s),/8 feet 10 inches/);assert.match(H.alert(s),/emergency vehicle/);
 s.notice='';assert.match(H.alert(s),/8 feet 10 inches/,'the warning survives ordinary notice expiry');
 s.model.damage.enabled=false;assert.equal(H.alert(s),'An emergency vehicle is behind you.');
 delete s.model.damage;assert.equal(H.alert(s),'An emergency vehicle is behind you.');
 s.model.damage={enabled:true};s.model.mode='walk';assert.equal(H.alert(s),'');delete c.OTR.fpDamageFlow;
});

test('cyclist and school warnings reach the live cab caption without opening the handheld',()=>{
 c.OTR.fpDriving={hint:()=>''};c.OTR.fpDay={hint:()=>''};c.OTR.fpTraffic={hint:()=> 'A cyclist is passing on the right. Check the right mirror and wait before turning.'};
 const s={model:{mode:'cab',kind:'campaign',van:{belt:true}}};assert.match(H.alert(s),/cyclist/);
 c.OTR.fpTraffic.hint=()=> 'Children are waiting at the school crossing. Slow down and let them cross.';assert.match(H.alert(s),/Children/);
 c.OTR.fpDriving.hint=()=> 'Stop for the school bus.';assert.equal(H.alert(s),'Stop for the school bus.');delete c.OTR.fpTraffic;
});

test('module-specific physical controls replace the generic walking hint only for that module',()=>{
 c.OTR.fpAccess={key:code=>({KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyP:'O',KeyE:'U'}[code])};
 assert.equal(H.keyHint({},'walk'),'Use W/A/S/D to move. Press O to choose a target and U to interact.');
 assert.match(H.keyHint({},'cab'),/accelerate or brake/);
 const run={definition:{keyHint:r=>r===run?'Bend your knees with S.':''}};
 assert.equal(H.keyHint({scenarioSession:run},'walk'),'Bend your knees with S.');
});
