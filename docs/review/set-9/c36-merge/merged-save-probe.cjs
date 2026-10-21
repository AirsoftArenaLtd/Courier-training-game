const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='/workspace/c36-radio-night',noop=()=>{},test=Object.assign(noop,{beforeEach:noop,afterEach:noop});
const h=new Function('require','__dirname',fs.readFileSync(root+'/test/savesize.js','utf8')+'\nreturn {context,OTR,W,SAVE,lms,asScorm,heavy,stored,reload,c35HeavyDay,play,summary,stage};')(id=>id==='node:test'?test:require(id),root+'/test');
for(const f of ['src/core/fpradio.js','src/core/fpnight.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),h.context);
const results=[];
for(const radioOK of [true,false])for(const lightsOK of [true,false]){
 h.asScorm(false);h.heavy({runs:2,scenarios:4});h.W.start(null);h.play(h.c35HeavyDay().filter(([type,d])=>!(type==='dispatch.update'&&d.key==='r0')&&!(type==='drive.lights'&&d.key===0)));
 const m={kind:'campaign',routePlan:{day:6,radio:1},stops:[{},{},{address:'212 Maple Ave'}],radio:{version:1,sent:true,read:true,accepted:true,result:null,travel:20},nightDrive:{version:1,leg:0,required:true,failed:!lightsOK},phase:'route',activeStop:0,events:{},van:{x:2.84,z:-18,speed:3},log(id){this.events[id]=true;},touch(){}};
 h.OTR.fpRadio.report(m,radioOK);h.OTR.fpNight.report(m,lightsOK);
 const live=h.summary(h.W.log),pins=h.OTR.drive.pins(h.W.log).length,stored=h.stored(),length=JSON.stringify(stored).length,stage=h.stage(stored);h.reload();h.W.resume(null);const after=h.summary(h.W.log),afterPins=h.OTR.drive.pins(h.W.log).length;assert.deepEqual(after,live);assert.equal(h.lms.refused,0);
 results.push({radioOK,lightsOK,length,room:4000-length,stage,pins,afterPins,score:after.score});
}
fs.mkdirSync(root+'/test/out/fp-review',{recursive:true});fs.writeFileSync(root+'/test/out/fp-review/c36-save-probe.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
