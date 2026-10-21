// Read-only adaptation of the owned seeded journey for new radio plans. Original tests stay untouched.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root='/workspace/c36-radio-night',file=path.join(root,'test/fpresume.js');let source=fs.readFileSync(file,'utf8');
source=source.replace("'src/core/fpdamageflow.js'","'src/core/fpdamageflow.js','src/core/fplighting.js','src/core/fpradio.js','src/core/fpnight.js'");
source=source.replace("m=M.create('campaign',seed,plan);", "plan=O.fpRadio.prepare(plan);m=M.create('campaign',seed,plan);");
source=source.replace("damage?'c34-resume-soak.json'", "damage?'c36-radio-resume-soak.json'");
source=source.replace("m.van.belt=true;m.van.hand=true;", "m.van.belt=true;m.van.hand=true;if(m.nightDrive&&O.fpNight.required(m)&&!m.van.headlights)assert.equal(O.fpCab.act(m,'cab-headlights'),'');");
source=source.replace("for(const id of shuffle(m.stops.map(s=>s.id),random)){",`if(m.radio){
   m.radio.travel=19.9;m.van.speed=3;m.van.hand=false;act('radio:arrival',()=>m.step({},.05));assert.equal(m.radio.sent,true);m.van.speed=0;m.van.hand=true;
   act('radio:read',()=>O.fpRadio.read(m));act('radio:accept',()=>O.fpRadio.accept(m));assert.equal(m.radio.accepted,true);
   if(O.fpRadio.descriptor(m).kind==='checkin'){Object.assign(m.van,O.fpRadio.descriptor(m).park);act('radio:checkin',()=>O.fpRadio.arrive(m));assert.equal(m.radio.result,true);}
  }
  const ids=shuffle(m.stops.map(s=>s.id),random),priority=m.radio&&O.fpRadio.descriptor(m).kind==='priority';
  for(const id of priority?[2,...ids.filter(id=>id!==2)]:ids){`);
source=source.replace("assert.equal(m.phase,'debrief');", "assert.equal(m.phase,'debrief');if(m.radio){const r=W.events.filter(e=>e.type==='dispatch.update'&&e.key==='r0');assert.equal(r.length,1);assert.equal(r[0].ok,true);if(O.fpNight.required(m))assert.ok(W.events.some(e=>e.type==='drive.lights'));}");
const adapted=new Module(file,module);adapted.filename=file;adapted.paths=Module._nodeModulePaths(path.dirname(file));adapted._compile(source,file);
