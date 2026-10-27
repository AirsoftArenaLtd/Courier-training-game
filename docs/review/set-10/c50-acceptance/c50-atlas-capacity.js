const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root='/workspace/c50-pilot-acceptance',c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpsigns.js','src/core/fpnav.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
c.OTR.save={data:{townSeed:1}};const seen=new Map();let worlds=0;
for(let seed=1;seed<=100;seed++)for(const day of [1,3,4,6]){
 const O=c.OTR,m=O.fpMission.create('campaign',seed,O.fpNav.prepare(O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(day,seed))))),cat=O.fpSigns.catalog(m);worlds++;
 for(const s of [...cat.stops,...cat.streets,...cat.numbers,...cat.regulatory]){const key=JSON.stringify([s.kind,s.name,s.number,s.limit]);if(!seen.has(key))seen.set(key,{kind:s.kind,name:s.name,number:s.number,limit:s.limit});}
}
(async()=>{const pp=require('/workspace/Courier-training-game/test/node_modules/puppeteer-core');const b=await pp.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-gpu']});try{
 const p=await b.newPage();await p.addScriptTag({content:fs.readFileSync(path.join(root,'lib/three.min.js'),'utf8')});await p.addScriptTag({content:fs.readFileSync(path.join(root,'src/core/fpsignlettering.js'),'utf8')});
 const result=await p.evaluate(signs=>{
  OTR.gfx={high:()=>true};const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d'),tiles=[[0,0],[512,0],[1024,0],[1536,0],[0,512]],before=[];
  tiles.forEach(([x,y],i)=>{ctx.fillStyle=['#731122','#125533','#4477aa','#bb8822','#eeffff'][i];ctx.fillRect(x,y,512,512);before.push(ctx.getImageData(x,y,512,512).data);});
  const words=[],native=ctx.fillText.bind(ctx);ctx.fillText=(text,x,y)=>{const width=Math.ceil(ctx.measureText(text).width);words.push({text,x,y,width});return native(text,x,y);};
  const atlas={image:canvas,needsUpdate:false},art=OTR.fpSignLettering.build({entries:signs.map(sign=>({sign}))},{atlas});const intact=tiles.every(([x,y],i)=>ctx.getImageData(x,y,512,512).data.every((v,n)=>v===before[i][n]));
  const bounded=words.every(w=>w.x>=516&&w.x+w.width<=2044&&w.y>=560&&w.y<=1008);art.dispose();return {borrowed:art.borrowed,intact,bounded,canvas:[canvas.width,canvas.height],words,rows:new Set(words.map(w=>w.y)).size};
 },[...seen.values()]);assert.equal(result.borrowed,true);assert.equal(result.intact,true);assert.equal(result.bounded,true);assert.ok(result.rows<=8);const report={worlds,uniqueSignDefinitions:seen.size,...result,scope:'Actual generated sign vocabulary from100seeds xdays1,3,4,6, rasterised together with the runtime High font code and native Canvas2D. Full five512square material cells stay byte-identical. This is a capacity diagnostic, not WebGL/FPS evidence.'};fs.writeFileSync('/tmp/c50-atlas-capacity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({worlds,signDefinitions:seen.size,words:result.words.length,rows:result.rows,intact:result.intact,bounded:result.bounded}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
