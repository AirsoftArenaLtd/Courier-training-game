const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='/workspace/c35-walkaround',noop=()=>{},test=Object.assign(noop,{beforeEach:noop,afterEach:noop});
const h=new Function('require','__dirname',fs.readFileSync(root+'/test/savesize.js','utf8')+'\nreturn {context,OTR,W,SAVE,lms,asScorm,heavy,stored,reload,richerDay,play,summary};')(id=>id==='node:test'?test:require(id),root+'/test');
for(const f of ['src/core/fpdamage.js','src/core/fpwalkaround.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),h.context);
const D=h.OTR.fpDamage,A=h.OTR.fpWalkaround,d=D.create(8,4),s=A.create(d),list=[];
for(const z of A.zones){const q=A.inspect(s,d,'pretrip',z);A.record(s,d,'pretrip',z,q.level);}
list.push(...A.depart(s,d));
for(const z of A.zones){A.inspect(s,d,'posttrip',z);const e=A.record(s,d,'posttrip',z,3).event;if(e)list.push(e);}
for(const z of A.zones){D.release(d);const e=D.contact(d,z,'solid',3);list.push({...e,where:{x:44.2,z:-128.7,mph:6.7,t:900}});const q=A.inspect(s,d,'posttrip',z);A.record(s,d,'posttrip',z,q.level);}
list.push(...A.finish(s,d));
const base=h.richerDay().filter(([t])=>!t.startsWith('van.damage-')&&!['inspect.damage','trip.damage-report','trip.damage-false'].includes(t));
h.asScorm(false);h.heavy({runs:2,scenarios:4});h.W.start(null);h.play(base);h.play(list.map(({type,...detail})=>[type,detail]));
const live=h.summary(h.W.log),stored=h.stored(),raw=JSON.stringify(stored),current=stored.workday&&stored.workday.current;h.reload();h.W.resume(null);const after=h.summary(h.W.log);
const out={addedEvents:list.length,baseEvents:base.length,length:raw.length,room:4000-raw.length,refused:h.lms.refused,live,after,current,currentTypes:typeof current};
fs.writeFileSync(root+'/test/out/fp-review/c35-save-stress.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({addedEvents:out.addedEvents,length:out.length,room:out.room,refused:out.refused,live,after}));assert.deepEqual(after,live);
