/* First-time guidance state, saved migrations and hints that do not change the mission. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const storage=new Map(),c={};c.window=c;c.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))};vm.createContext(c);for(const f of ['firstperson','fpmission','fpguide'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
const O=c.OTR,G=O.fpGuide;O.fpAccess={key:code=>({KeyE:'O',KeyP:'N',Tab:'U',Space:'L',KeyH:'H'}[code]||code[3]),lookKeys:()=> '←/→/↑/↓'};
const scene=()=>({progress:O.fpStore.empty(),model:{kind:'campaign',phase:'prepare',departed:false},time:{now:0},showPanel(title,body,choices){this.panel={title,body,choices};},checkpoint(){this.saves=(this.saves||0)+1;},closePanel(){this.panel=null;},write(){this.saves=(this.saves||0)+1;},toHub(){},showPause(){}});
test('first morning uses physical controls, marks the card only when begun, and stays reopenable',()=>{
 const s=scene();assert.equal(G.opening(s,false),true);assert.equal(s.progress.guidance.intro,false);assert.match(s.panel.body,/Press N.*Press O/);assert.match(s.panel.body,/hold L/);assert.ok(s.panel.body.split(/\s+/).length<100);s.panel.choices[0].action();assert.equal(s.progress.guidance.intro,true);assert.equal(s.saves,1);assert.equal(G.opening(s,false),false);G.open(s);assert.equal(s.panel.title,'Controls and guidance');
});
test('context hints are once per action type, yield to notices/panels and never change mission state',()=>{
 const s=scene();s.progress.guidance.intro=true;const before=JSON.stringify(s.model);assert.match(G.hint(s,'parcel0'),/Match the label/);assert.equal(s.saves,1);s.time.now=7000;assert.equal(G.hint(s,'parcel1'),null);s.notice='A safety notice.';s.noticeUntil=9000;assert.equal(G.hint(s,'driver'),null);s.time.now=10000;assert.match(G.hint(s,'driver'),/seatbelt/);s.panel={};assert.equal(G.hint(s,'returns'),null);assert.equal(JSON.stringify(s.model),before);
});
test('old checkpoints default safely, and guidance flags survive a local profile round trip',()=>{
 const p=O.fpStore.empty();p.guidance={intro:true,seen:['parcel','driver','parcel','bad key',7]};O.fpStore.write(p);const r=O.fpStore.read();assert.deepEqual(JSON.parse(JSON.stringify(r.guidance)),{intro:true,seen:['parcel','driver']});delete p.guidance;O.fpStore.write(p);assert.equal(O.fpStore.read().guidance.intro,false);
});

test('module runs never reuse or narrate saved workday coaching, while workdays retain it',()=>{
 const spoken=[];O.a11y={say:text=>spoken.push(text)};
 try{
  for(const assessment of [false,true]){
   const s=scene();s.progress.guidance.intro=true;s.scenarioSession={assessment};const before=JSON.stringify(s.progress);
   assert.equal(G.hint(s,'driver'),null);assert.equal(G.hint(s,'tyres'),null);assert.deepEqual(spoken,[]);assert.equal(JSON.stringify(s.progress),before);assert.equal(s.saves,undefined);
  }
  const s=scene();s.progress.guidance.intro=true;assert.match(G.hint(s,'tyres'),/Inspect the tires/);assert.equal(spoken.length,1);assert.equal(s.saves,1);
 }finally{delete O.a11y;}
});
