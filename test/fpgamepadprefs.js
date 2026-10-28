/* Persistent user choices, bounded overrides and reset without touching keyboard settings or pad identity. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);for(const f of ['fpgamepad','fpgamepadui'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
const O=c.OTR,G=O.fpGamepad,U=O.fpGamepadUI,clean=o=>JSON.parse(JSON.stringify(o));
function fixture(){let writes=0,saved;const settings={keys:{KeyR:'KeyT'},large:true};O.a11y={settings:()=>settings,save(){writes++;saved=JSON.stringify(settings);}};O.i18n={t:t=>t};const scene={gamepad:{session:null,resets:0,bindings:()=>settings.gamepad,reset(){this.resets++;}},showPanel(title,body,choices,options){this.panel={title,body,choices,options};}};return {scene,settings,writes:()=>writes,saved:()=>saved};}
test('saved overrides contain only valid changed indices and sensitivity, never hardware fields',()=>{
 const p=G.preferences({id:'vendor-controller-123',index:2,timestamp:99,mapping:'standard',deadzone:.3,axes:{steer:0,lookX:5,unknown:2},buttons:{gear:16,back:-1,brake:6,unknown:1}});
 assert.deepEqual(clean(p),{deadzone:.3,axes:{lookX:5},buttons:{back:-1,gear:16}});assert.ok(JSON.stringify(p).length<=300);assert.ok(!JSON.stringify(p).includes('controller'));
 assert.deepEqual(clean(G.preferences({deadzone:Infinity,axes:{steer:-2,lookX:NaN},buttons:{gear:'16',pause:33}})),{});assert.deepEqual(clean(G.preferences(G.defaults)),{});
});
test('remapping saves through the existing writer and survives serialization without keyboard changes',()=>{
 const {scene,settings,writes,saved}=fixture(),keys=settings.keys;assert.equal(U.apply(scene,'buttons','gear',16),true);assert.equal(writes(),1);assert.equal(settings.keys,keys);assert.equal(settings.keys.KeyR,'KeyT');assert.equal(scene.gamepad.session,null);assert.equal(scene.gamepad.resets,1);
 const loaded=JSON.parse(saved()),pad={connected:true,mapping:'standard',id:'transient identity',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0}))},controller=G.create(()=>[pad]);controller.configure(loaded.gamepad);controller.poll();controller.poll();pad.buttons[16].value=1;assert.ok(controller.poll().pressed&G.actions.gear);assert.equal(loaded.keys.KeyR,'KeyT');assert.equal(loaded.large,true);
});
test('disabled axes and sensitivity persist and restoring their defaults removes redundant overrides',()=>{
 const {scene,settings,writes}=fixture();assert.equal(U.apply(scene,'axes','lookX',-1),true);U.deadzone(scene,()=>{});scene.panel.choices[0].action();assert.deepEqual(clean(settings.gamepad),{deadzone:.1,axes:{lookX:-1}});assert.equal(writes(),2);
 assert.equal(U.apply(scene,'axes','lookX',2),true);assert.equal(settings.gamepad.axes,undefined);U.deadzone(scene,()=>{});scene.panel.choices[1].action();assert.equal(settings.gamepad,undefined);assert.equal(settings.keys.KeyR,'KeyT');assert.equal(writes(),4);
});
test('an oversized configuration leaves saved bindings untouched and offers a way back',()=>{
 const {scene,settings,writes}=fixture();settings.gamepad={buttons:{gear:16}};const before=JSON.stringify(settings);let backs=0;const full={deadzone:.45,axes:Object.fromEntries(Object.keys(G.defaults.axes).map(k=>[k,7])),buttons:Object.fromEntries(Object.keys(G.defaults.buttons).map(k=>[k,31]))};assert.ok(JSON.stringify(full).length>300);assert.equal(G.preferences(full),null);assert.equal(U.persist(scene,full,()=>backs++),false);assert.equal(JSON.stringify(settings),before);assert.equal(writes(),0);assert.equal(scene.gamepad.resets,0);assert.match(scene.panel.body,/too large to save/);scene.panel.choices[0].action();assert.equal(backs,1);
});
test('the existing reset confirmation clears only saved gamepad overrides',()=>{
 const {scene,settings,writes}=fixture();settings.gamepad={deadzone:.3,axes:{steer:4},buttons:{gear:16}};U.bindings(scene);scene.panel.choices.find(q=>q.label==='Restore default gamepad controls').action();assert.equal(settings.gamepad.buttons.gear,16);scene.panel.choices.find(q=>q.label==='Restore defaults').action();assert.equal(settings.gamepad,undefined);assert.equal(settings.keys.KeyR,'KeyT');assert.equal(settings.large,true);assert.equal(writes(),1);
});
