/* Keyboard aim, physical target selection and persisted comfort preferences. No WebGL required. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['firstperson','fpmission','world3d','fpbranding','fpcab','fpworld','fpaccess'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
let settings,queries;const A=c.OTR.fpAccess;
test.beforeEach(()=>{settings={keys:{},large:false,colour:false};queries=0;A.motionQuery=null;c.matchMedia=()=>{queries++;return {matches:true};};c.OTR.a11y={settings:()=>settings,physical:code=>settings.keys[code]||code,label:code=>code};});
test('system reduced motion is read once and an explicit saved choice overrides it',()=>{
 assert.equal(A.reduced(),true);assert.equal(A.reduced(),true);assert.equal(queries,1);settings.reducedMotion=false;assert.equal(A.reduced(),false);settings.reducedMotion=true;assert.equal(A.reduced(),true);
});
test('keyboard look turns without moving, clamps pitch and gives a separate cab look',()=>{
 const m=c.OTR.fpMission.create('campaign',1),s={model:m};const x=m.player.x,z=m.player.z,yaw=m.player.yaw;
 A.look(s,{ArrowRight:true},.05);assert.ok(m.player.yaw>yaw);assert.equal(m.player.x,x);assert.equal(m.player.z,z);
 for(let i=0;i<100;i++)A.look(s,{ArrowUp:true},.05);assert.equal(m.player.pitch,-1.05);
 m.mode='cab';const vanYaw=m.van.yaw;for(let i=0;i<100;i++)A.look(s,{ArrowRight:true},.05);assert.equal(m.van.look,1.5);assert.equal(m.van.yaw,vanYaw);
});
test('3D key hints read the same saved physical map as the shared remapper',()=>{
 settings.keys.KeyP='KeyN';assert.equal(A.key('KeyP'),'KeyN');assert.equal(A.key('KeyE'),'KeyE');
});
test('queued control speech is dropped when the target or visible prompt has gone away',()=>{
 for(const hidden of [false,true]){settings.narrate=true;const said=[],m=c.OTR.fpMission.create('campaign',1);m.mode='cab';
  c.speechSynthesis={speaking:true,pending:false,speak:u=>said.push(u.text)};c.SpeechSynthesisUtterance=function(text){this.text=text;};
  const s={model:m,target:'cab-signal-left',time:{now:0},hint:{visible:true,alpha:1},notice:'',noticeUntil:0};A.voiceTick(s,false);assert.ok(s.cabVoice.hint);
  if(hidden)s.hint.visible=false;else s.target=null;c.speechSynthesis.speaking=false;s.time.now=2000;A.voiceTick(s,false);assert.deepEqual(said,[]);assert.equal(s.cabVoice.hint,null);
 }
});
test('a queued action notice expires and a gear confirmation still uses the current gear',()=>{
 settings.narrate=true;const said=[],m=c.OTR.fpMission.create('campaign',1);m.mode='cab';c.speechSynthesis={speaking:true,pending:false,speak:u=>said.push(u.text)};c.SpeechSynthesisUtterance=function(text){this.text=text;};
 const s={model:m,target:null,time:{now:0},hint:{visible:true,alpha:1},notice:'Read this sign.',noticeUntil:100};A.voiceHint(s,s.notice);s.time.now=200;A.voiceTick(s,false);assert.equal(s.cabVoice.hint,null);
 m.van.gear=1;A.voiceTick(s,false);m.van.gear=-1;A.voiceTick(s,false);c.speechSynthesis.speaking=false;s.time.now=2000;A.voiceTick(s,false);assert.equal(said[0],'The van is in reverse.');assert.ok(!said.includes('The van is in drive.'));
});
test('a shared remap onto a 3D-only look key keeps both actions reachable',()=>{
 c.OTR.a11y.ACTIONS=[{code:'KeyW'}];let saves=0;c.OTR.a11y.save=()=>saves++;settings.keys.KeyW='ArrowUp';A.syncKeys();
 assert.equal(settings.keys.KeyW,'ArrowUp');assert.equal(settings.keys.ArrowUp,'KeyW');assert.equal(saves,1);A.syncKeys();assert.equal(saves,1);
});
test('nearby target selection uses real visibility/raycasting and never changes the player position',()=>{
 c.OTR.gfx={high:()=>false};const T=c.THREE,camera=new T.PerspectiveCamera(68,16/9,.08,180),world=new T.Scene();world.add(camera);
 const m=c.OTR.fpMission.create('campaign',1),s={model:m,target:null,view:{camera,world,mirror:{camera:new T.PerspectiveCamera(),on:false}},message(text){this.notice=text;}};
 s.art=c.OTR.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');Object.assign(m.player,{x:-9.5,z:4.4,yaw:Math.PI,pitch:0});s.sync();const x=m.player.x,z=m.player.z;
 assert.equal(A.focus(s),'parcel0');assert.equal(m.player.x,x);assert.equal(m.player.z,z);assert.equal(s.art.pick(),'parcel0');
 m.parcels[0].location='slot0';m.cargoOpen=false;Object.assign(m.player,{x:-9.5,z:4.4,yaw:0,pitch:0});s.sync();assert.equal(A.focus(s),null);assert.match(s.notice,/No nearby target/);s.art.dispose();
});
test('keyboard target selection reaches tires and lamps from outside the van',()=>{
 c.OTR.gfx={high:()=>false};const T=c.THREE,camera=new T.PerspectiveCamera(68,16/9,.08,180),world=new T.Scene();world.add(camera);
 const m=c.OTR.fpMission.create('campaign',1),s={model:m,target:null,view:{camera,world,mirror:{camera:new T.PerspectiveCamera(),on:false}},message(){}};s.art=c.OTR.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');
 for(const [id,x,z] of [['tyres',1.6,6.4],['lights',4,4]]){Object.assign(m.player,{x,z,yaw:Math.PI,pitch:0});s.target=null;s.sync();let hit;for(let n=0;n<8&&hit!==id;n++)hit=A.focus(s);assert.equal(hit,id);assert.equal(s.art.pick(),id);}s.art.dispose();
});

test('Low text uses native canvases without shrinking fonts or stacking factories on restart',()=>{
 const calls=[],factory=function(x,y,text,style){calls.push({owner:this,x,y,text,style});return style;},scene={add:{text:factory}};let high=false;c.OTR.gfx={high:()=>high};
 A.textResolution(scene);let value=scene.add.text(1,2,'Text',{fontSize:'21px',resolution:2});assert.equal(value.resolution,1);assert.equal(value.fontSize,'21px');assert.equal(calls[0].owner,scene.add);
 A.textResolution(scene);assert.equal(scene.fpTextFactory,factory);high=true;value=scene.add.text(1,2,'Text',{fontSize:'21px',resolution:2});assert.equal(value.resolution,2);assert.equal(calls.length,2);
});

test('Indic cab, briefing and handheld text select the script font while preserving company fallback and English styling',()=>{
 const originalTheme=c.OTR.theme,originalLanguage=c.OTR.i18n;
 try{
  c.OTR.theme={font:'Company Sans, sans-serif'};c.OTR.i18n={lang:'ta'};c.OTR.gfx={high:()=>false};
  const scene={add:{text:(x,y,text,style)=>style}};A.textResolution(scene);
  for(const [lang,font] of Object.entries(c.OTR.fpBrand.scriptFonts)){
   c.OTR.i18n.lang=lang;const style=scene.add.text(0,0,'Text',{fontFamily:'Company Sans',fontSize:'21px'});
   assert.ok(style.fontFamily.includes(font),lang+' selects its script font');assert.ok(style.fontFamily.endsWith('Company Sans'));
   assert.equal(style.fontSize,'21px');assert.equal(style.resolution,1);
  }
  for(const lang of ['en','es','fr']){c.OTR.i18n.lang=lang;assert.equal(scene.add.text(0,0,'Text',{fontFamily:'Company Sans'}).fontFamily,'Company Sans');}
 }finally{c.OTR.theme=originalTheme;c.OTR.i18n=originalLanguage;}
});

test('handheld choices leave room for the full Back control at taller font metrics',()=>{
 settings.reducedMotion=false;
 const focus=A.deviceFocus;A.deviceFocus=()=>{};
 try{
  for(const height of [19,28,44]){
   const back={type:'Text',x:144,y:168,displayHeight:height,originY:.5};
   const button=()=>({label:{height:44,setText(){return this;},setScale(){return this;}},bg:{input:{hitArea:{height:46}},setScale(){}},setSize(){},setY(y){this.y=y;}});
   const buttons=[button(),button(),button()],d={sx:-158,sy:-268,sw:316,sh:452,current:{back(){},options:buttons.map(()=>({label:'Choice'}))},screen:{list:[back]},optionBtns:buttons};
   A.layoutDevice({device:d});
   const last=buttons.at(-1);assert.ok(last.y+last._fpHeight/2<=back.y-back.displayHeight*back.originY-8);
   assert.equal(last._fpHeight,54);assert.equal(back.displayHeight,height);
  }
 }finally{A.deviceFocus=focus;}
});

test('a dense larger-text page keeps both its body and Back clear without shrinking targets',()=>{
 settings.reducedMotion=false;const focus=A.deviceFocus;A.deviceFocus=()=>{};
 try{
  const back={type:'Text',x:144,y:168,displayHeight:19,originY:.5},body={type:'Text',x:-144,y:-181,displayHeight:114,originY:0};
  const buttons=[36,44,44,36].map(height=>({label:{height,setText(){return this;},setScale(){return this;}},bg:{input:{hitArea:{height:46}},setScale(){}},setSize(){},setY(y){this.y=y;}}));
  A.layoutDevice({device:{sx:-158,sy:-268,sw:316,sh:452,current:{back(){},options:buttons.map(()=>({label:'Choice'}))},screen:{list:[body,back]},optionBtns:buttons}});
  assert.ok(buttons[0].y-buttons[0]._fpHeight/2>=body.y+body.displayHeight+8-1e-9);
  for(let i=0;i<buttons.length;i++){assert.ok(buttons[i]._fpHeight>=46);if(i)assert.ok(buttons[i].y-buttons[i]._fpHeight/2>=buttons[i-1].y+buttons[i-1]._fpHeight/2+2);}
  const last=buttons.at(-1);assert.ok(last.y+last._fpHeight/2<=back.y-back.displayHeight*.5-8+1e-9);
 }finally{A.deviceFocus=focus;}
});
