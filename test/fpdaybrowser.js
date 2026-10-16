/* Weather rendering and the actual safe handheld/updated-delivery workflow. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[];let checks=0;
 try{
  const p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  const audit=async()=>{await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld.device;return !h.isOpen||Math.abs(h.root.y-h.Yopen)<1;});const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device,out=[];const texts=h.isOpen?h.screen.list.filter(o=>o.type==='Text'):[s.objective,s.hint];for(const o of texts){if(!o.visible)continue;const r=o.getBounds();if(r.x<0||r.right>1280||r.y<0||r.bottom>720)out.push(o.text);if(h.isOpen&&(r.x<h.root.x+h.sx||r.right>h.root.x+h.sx+h.sw||r.bottom>h.root.y+h.sy+h.sh))out.push('device '+o.text);}return out;});assert.deepEqual(bad,[]);checks++;};
  for(const lang of ['en','ta'])for(const large of [false,true])for(const day of [2,3,4,6]){
   const weather=await p.evaluate(({day,lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.handheld.close();s.closePanel();OTR.i18n.use(lang);OTR.a11y.settings().large=large;const m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(day,7));OTR.fpDay.configure(m);s.model=m;s.area='route';s.rebuildWorld();s.notice='';m.events[m.briefKey]=true;m.mode='cab';m.phase='route';m.departed=true;m.paused=true;Object.assign(m.van,{x:m.town.xs[0]+2,z:m.town.zs[1]+20,yaw:0,speed:2,hand:false,belt:true});s.hint.setFontSize(OTR.a11y.size(18));s.sync();s.refresh();return m.routeDay.weather;},{day,lang,large});
   await audit();if(lang==='en'&&!large)await p.screenshot({path:path.join(OUT,`c11-${weather}.png`)});
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.home()),undefined);assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.isOpen),false);checks++;
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.activeStop=m.routeDay.dispatch.stop;m.routeDay.distance=11;OTR.fpDay.tick(m,.1);Object.assign(m.van,{speed:0,hand:true});s.handheld.home();});await audit();
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(3));await audit();
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(0));await audit();
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.routeDay.dispatch.read),true);checks++;
   if(day===2&&lang==='ta'&&large)await p.screenshot({path:path.join(OUT,'c11-dispatch-ta-large.png')});
   await p.evaluate(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;h.day();h.choose(1);});await audit();
   if(day===3){await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.routeDay.heat=.9;s.handheld.choose(0);});assert.ok(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.routeDay.heat<.5));checks++;}
  }
  // Both actual handheld outcomes, with the parcel physically at the target door.
  for(const kind of ['signature','planter']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();let plan;for(let v=1;v<30;v++){plan=OTR.fpRoute.plan(2,v);if(plan.dispatch.kind===kind)break;}const m=OTR.fpMission.create('campaign',plan.variant,plan);OTR.fpDay.configure(m);s.model=m;s.rebuildWorld();m.phase='route';m.departed=true;m.activeStop=m.routeDay.dispatch.stop;m.mode='cab';m.routeDay.distance=11;m.van.speed=2;OTR.fpDay.tick(m,.1);const stop=m.stops[m.activeStop],p=m.parcels[stop.id];Object.assign(m.van,stop.park,{speed:0,hand:true});m.mode='walk';m.paused=true;Object.assign(m.player,{x:stop.x-stop.side*1.4,z:stop.z});Object.assign(p,{location:'held',scanned:true,stopScanned:true,loaded:true});m.heldId=p.id;m.contact(stop.id);OTR.fpDay.read(m);OTR.workday.begin();s.sync();s.handheld.delivery(stop.id);},kind);
   await audit();await p.evaluate(kind=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(kind==='planter'?3:2),kind);await audit();
   const state=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {ok:OTR.workday.events.find(e=>e.type==='dispatch.update').ok,resolved:m.routeDay.dispatch.resolved,restored:!!OTR.fpMission.restore(m.snapshot())};});assert.deepEqual(state,{ok:true,resolved:true,restored:true});checks+=3;
  }
  assert.deepEqual(errors,[]);checks++;console.log(`${checks} route-day browser checks passed`);
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
