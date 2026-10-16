/* 3D accessibility layouts with real Tamil glyphs (QA_FONT may select an installed review font). */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let checks=0;const errors=[];
 try{const p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);await p.addScriptTag({url:base+'/data/i18n/ta.js'});
 for(const lang of ['en','ta'])for(const large of [false,true]){
  await p.evaluate(({lang,large,font})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.layoutToken=s.loadingToken;s.keyboardMode=true;OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,reducedMotion:true});if(font)OTR.theme.font=font;s.scene.restart();},{lang,large,font:process.env.QA_FONT||''});await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.loadingToken!==window.layoutToken&&!s.loading;});
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.keyboardMode=true;s.closePanel();s.launch('campaign');});await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());
  for(const page of ['access','controls','scan','inspect','identity','signature']){
   await p.evaluate(page=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.handheld.close();s.closePanel();
    if(page==='access')OTR.fpAccess.menu(s);else if(page==='controls')OTR.fpAccess.keys(s,2);else if(page==='scan'||page==='inspect'){m.parcels[0].location='held';m.heldId='parcel0';if(page==='scan')s.handheld.scan();else s.showParcel('parcel0');}
    else{let seed=1,fixture,id;do{fixture=OTR.fpMission.create('campaign',seed,OTR.fpRoute.plan(2,seed++));OTR.fpDoors.configure(fixture);id=fixture._doorSpecs.findIndex(a=>page==='identity'?a.adult:a.signature&&a.present&&!a.adult&&!a.dog&&!a.wrong);}while(id<0&&seed<100);
     s.model=fixture;s.rebuildWorld();const stop=fixture.stops[id];fixture.activeStop=id;fixture.mode='walk';Object.assign(fixture.van,stop.park,{speed:0,hand:true});Object.assign(fixture.player,{x:stop.x-stop.side*1.5,z:stop.z,yaw:stop.side*Math.PI/2,pitch:0});fixture.contact(id);if(page==='identity')s.showIdentity(id);else s.handheld.signature(id);
    }s.sync();s.refresh();
   },page);
   const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device,out=[];const visit=o=>{if(!o.visible)return;if(o.type==='Text'){const r=o.getBounds();if(r.x<0||r.right>1281||r.y<0||r.bottom>721)out.push(o.text);if(h.isOpen&&(r.x<h.root.x+h.sx-1||r.right>h.root.x+h.sx+h.sw+1||r.bottom>h.root.y+h.sy+h.sh+1))out.push('device '+o.text);}for(const c of o.list||[])visit(c);};if(s.panel){visit(s.panel.root);const body=s.panel.root.list.find(o=>o.type==='Text'&&o.y===170),top=Math.min(...s.panel.buttons.map(b=>b.getBounds().top));if(body.getBounds().bottom>top-8)out.push('panel overlap');for(const b of s.panel.buttons){const label=s.panel.root.list.find(o=>o.type==='Text'&&o.x===b.x&&o.y===b.y);if(label&&(label.width>b.width-12||label.height>b.height-4))out.push('button '+label.text);}}else visit(h.screen);return out;});assert.deepEqual(bad,[],`${lang} large=${large} ${page}`);checks++;
   if(large&&(page==='scan'||page==='identity'||page==='controls'))await p.screenshot({path:path.join(OUT,`c12-${page}-${lang}-large.png`)});
  }
 }
 assert.deepEqual(errors,[]);console.log(checks+' accessibility layout checks passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
