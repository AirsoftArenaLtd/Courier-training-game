/* Rendered town templates, fallback comparison, original mission identity and clean WebGL. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8302',quality=process.env.QA_GFX||'low',OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[],report={quality,fixture:'Day one, seed seven, stationary walking viewpoints. Positions and weather/time are fixtures; no score or mission state is manufactured by rendering. Culling comparisons retain normal sign selection and exclude fading Phaser overlays; screenshots retain UI.',views:[]};let checks=0;
 try{
  const p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));await p.evaluateOnNewDocument(()=>localStorage.clear());
  await p.goto(BASE+'/first-person.html?gfx='+quality);await p.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();const plan=OTR.fpRoute.plan(1,7);plan.timeOfDay='midday';s.area='route';s.model=OTR.fpMission.create('campaign',7,plan);s.model.step=()=>{};s.rebuildWorld();s.closePanel();s.model.paused=false;});
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').assetBank.stats.loaded),quality==='high'?23:14);checks++;
  for(const use of ['town-house','town-house-wide','town-shop','town-tree','town-fence','town-streetlight','town-parked-car','town-road',...(quality==='high'?['town-bench']:[])]){
   const view=await p.evaluate(use=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,c=s.art.townArt.choices.find(c=>c.use===use),x=m.town.xs.reduce((a,b)=>Math.abs(a-c.x)<Math.abs(b-c.x)?a:b),z=c.z+3,d=Math.hypot(c.x-x,c.z-z);m.mode='walk';Object.assign(m.player,{x,z,yaw:Math.atan2(c.x-x,-(c.z-z)),pitch:Math.atan2(1.65-c.height*.4,d)});s.sync();s.refresh();return {selected:c.selected,models:s.art.assetGroups.length,frontGroups:s.art.assetGroups.filter(g=>g===s.art.deliveryFronts?.group).length,selectedFronts:s.art.deliveryFronts?.choices.filter(c=>c.selected).length||0,benchGroups:s.art.assetGroups.filter(g=>g.name==='asset:town-bench').length,snapshot:JSON.stringify(m.snapshot()),reports:JSON.stringify(OTR.workday.events),frame:OTR.game.loop.frame};},use);
   assert.ok(view.selected,use);// High has the original nine groups plus one bounded delivery-facade pool.
   assert.equal(view.models,quality==='high'?10:8);assert.equal(view.frontGroups,quality==='high'?1:0);assert.ok(view.selectedFronts<=2);checks+=2;assert.equal(view.benchGroups,quality==='high'?1:0);checks+=3;
   await p.waitForFunction(frame=>OTR.game.loop.frame>frame+1,{},view.frame);
   await p.screenshot({path:path.join(OUT,`c27-${quality}-${use}.png`)});
   const changed=await p.evaluate(async use=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),gl=OTR.game.renderer.gl,W=gl.drawingBufferWidth,H=gl.drawingBufferHeight;
    const pixels=()=>new Promise(resolve=>OTR.game.events.once('postrender',()=>{const a=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,a);resolve(a);}));
    const group=s.art.assetGroups.find(g=>g.name==='asset:'+use),before=await pixels(),masks=group.children.map(mesh=>mesh.layers.mask);for(const mesh of group.children)mesh.layers.disable(0);const after=await pixels();group.children.forEach((mesh,i)=>mesh.layers.mask=masks[i]);
    let changed=0;for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>10)changed++;
    return {changed,glError:gl.getError(),snapshot:JSON.stringify(s.model.snapshot()),reports:JSON.stringify(OTR.workday.events)};
   },use);
   assert.ok(changed.changed>100,use+' '+changed.changed);assert.equal(changed.glError,0);assert.equal(changed.snapshot,view.snapshot);assert.equal(changed.reports,view.reports);checks+=4;
   let culling=null;if(quality==='low'){
    culling=await p.evaluate(async()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),gl=OTR.game.renderer.gl,atlas=s.view.mirror,original=THREE.Frustum.prototype.intersectsSphere,next=atlas.nextAt,signs=s.art.signs,choose=signs&&signs.choose;atlas.nextAt=Infinity;
      // Keep the bounded sign selection identical. Only geometry culling is under comparison.
      if(signs)signs.choose=function(...args){const active=THREE.Frustum.prototype.intersectsSphere;THREE.Frustum.prototype.intersectsSphere=original;try{return choose.apply(this,args);}finally{THREE.Frustum.prototype.intersectsSphere=active;}};
      if(!s.children.list.some(o=>o.type==='Extern'&&o.visible))throw Error('The 3D compositor must stay visible during the pixel comparison.');
      // Captions fade by wall clock even while mission time is frozen. Keep them out of this geometry proof.
      const overlays=s.children.list.filter(o=>o.type!=='Extern').map(o=>[o,o.visible]),hide=()=>overlays.forEach(([o])=>o.setVisible(false));s.game.events.on('prerender',hide);
      const pixels=()=>new Promise(resolve=>OTR.game.events.once('postrender',()=>{const p=new Uint8Array(1280*720*4);gl.readPixels(0,0,1280,720,gl.RGBA,gl.UNSIGNED_BYTE,p);resolve(p);}));
      try{const before=await pixels(),normal={...s.view.diagnostics};THREE.Frustum.prototype.intersectsSphere=()=>true;const after=await pixels(),unculled={...s.view.diagnostics};let changed=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])changed++;return{changedBytes:changed,normal:normal.triangles,unculled:unculled.triangles};}finally{THREE.Frustum.prototype.intersectsSphere=original;if(signs)signs.choose=choose;atlas.nextAt=next;s.game.events.off('prerender',hide);overlays.forEach(([o,v])=>o.setVisible(v));}
    });assert.equal(culling.changedBytes,0,'Frustum culling must retain every visible pixel: '+use);assert.ok(culling.unculled>=culling.normal);checks+=2;
   }
   report.views.push({use,changedPixels:changed.changed,selected:true,culling});
  }
  assert.deepEqual(errors,[]);checks++;report.checks=checks;report.errors=errors;fs.writeFileSync(path.join(OUT,`c27-${quality}-town.json`),JSON.stringify(report,null,2));console.log(checks+' '+quality+' town browser checks passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
