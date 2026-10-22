const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root='/workspace/b138-signal-scoring';
function fixtures(file,names){const full=path.join(root,file),real=createRequire(full),req=name=>name==='node:test'?Object.assign(()=>{},{beforeEach(){}}):real(name);return new Function('require','__dirname',fs.readFileSync(full,'utf8')+'\nreturn {'+names+'};')(req,path.dirname(full));}
const a=fixtures('test/savesize.js','asScorm,heavy,W,SAVE,stored,reload,summary,stage,c35HeavyDay,play,OTR');
const b=fixtures('test/fpsignal.js','make,O');const results=[];
for(const wrong of [false,true])for(const count of [6,12,18,24,30]){
 const m=b.make(),reports=[];b.O.workday.report=(type,detail)=>reports.push([type,JSON.parse(JSON.stringify(detail))]);
 for(let n=0;n<count;n++){m.leg=Math.floor(n/5);m.activeStop=Math.min(m.leg,4);m.van.x=2.84+(n%3)*8;m.van.z=-18-(n%6)*18;m.van.speed=2;b.O.fpSignal.report(m,!wrong);}
 a.asScorm(false);a.heavy({runs:2,scenarios:4});a.W.start(null);a.play(a.c35HeavyDay());a.play(reports);const live=a.summary(a.W.log),pins=a.OTR.drive.pins(a.W.log).length,stored=a.stored(),size=JSON.stringify(stored).length,stage=a.stage(stored);a.reload();a.W.resume(null);
 results.push({wrong,count,stage,size,room:a.SAVE.SCORM12_LIMIT-size,scorePreserved:a.W.log.score()===live.score,pins,pinsAfter:a.OTR.drive.pins(a.W.log).length,items:live.items,itemsAfter:a.W.log.items.length});
}
fs.writeFileSync('/tmp/b138-signal-save-probe.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
