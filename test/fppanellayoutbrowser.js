/* Static layout audit of the real M8 conversation text, including unchosen replies. No gameplay acceptance. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core'),sample=require('./tools/fp-panel-layout');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8397',TAG=process.env.QA_TAG||'c46-panel-layout',OUT=path.join(__dirname,'out/fp-review');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,protocolTimeout:300000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={checks:0,modes:[],errors:[],scope:'Static actual FirstPersonScene panels using every original M8 situation line, reply and feedback at both text sizes in twelve languages. Does not advance conversations, score, certify native journeys, glyph coverage or translations.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');
 try{
  const page=await browser.newPage();await page.setViewport({width:1280,height:720});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(BASE+'/index.html?lab=firstperson&gfx=low&lang=en',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});
  const langs=await page.evaluate(()=>Object.keys(OTR.i18n.LANGS));
  for(const lang of langs){
   if(lang!=='en')await page.addScriptTag({url:BASE+'/data/i18n/'+lang+'.js'});
   for(const large of [false,true]){
    const mode=await page.evaluate(({lang,large})=>{
     OTR.i18n.use(lang);OTR.a11y.settings().large=large;
     const panels=[];
     for(const id of ['m8_steps','m8_dog','m8_heat']){
      const set=OTR_DATA.stopSets[id],graphs=[...Object.values(set.talks||{}),...set.stops.flatMap(s=>Object.values(s.talks||{}))];
      for(const graph of graphs)for(const [key,node] of Object.entries(graph.nodes)){
       if(node.text)panels.push({id,key,kind:'line',title:'Listen to the customer.',body:node.text,choices:['Read the replies.','Step back from the conversation.']});
       for(const choice of node.choices||[]){
        panels.push({id,key,kind:'reply',title:'Read reply 2 of 3.',body:'Choose this reply or read another reply.',choices:[choice.text,'Read the next reply.','Read the question again.','Step back from the conversation.']});
        if(choice.feedback)panels.push({id,key,kind:'feedback',title:'Review the conversation.',body:choice.feedback,choices:['Continue the conversation.','Step back from the conversation.']});
       }
      }
     }
     window.otrPanelAudit=panels;return {lang,large,panels:panels.length,font:OTR.theme.font};
    },{lang,large});
    report.modes.push(mode);
    for(let i=0;i<mode.panels;i++){
     const panel=await page.evaluate(i=>{const p=window.otrPanelAudit[i];OTR.game.scene.getScene('FirstPersonScene').showPanel(p.title,p.body,p.choices.map(label=>({label,action(){}})),{accessibleText:true});return {id:p.id,key:p.key,kind:p.kind};},i);
     const texts=await page.evaluate(sample);
     for(let n=0;n<texts.length;n++){
      const t=texts[n],where=JSON.stringify({lang,large,...panel,source:t.source});
      assert.equal(t.scale,1,where);assert.ok(t.font>=(large?22:18),where);
      assert.ok(t.left>=120&&t.right<=1160&&t.top>=88&&t.bottom<=632,where+' panel bounds');
      if(t.button)assert.ok(t.left>=t.button.left+10&&t.right<=t.button.right-10&&t.top>=t.button.top+4&&t.bottom<=t.button.bottom-4,where+' choice bounds');
      if(n)assert.ok(t.top>=texts[n-1].bottom+4,where+' separated text');
      report.checks+=t.button?5:4;
     }
     if(lang==='ta'&&panel.id==='m8_dog'&&panel.key==='p1'&&panel.kind==='reply'&&texts[2].source.includes('படிகளின்')){
      const file=TAG+'-ta-'+(large?'large':'normal')+'-dog-p1.png';await page.screenshot({path:path.join(OUT,file)});mode.capture=file;mode.dogReply=texts[2];
     }
    }
    save();
   }
  }
  assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(JSON.stringify({checks:report.checks,modes:report.modes.length,panels:report.modes.reduce((n,m)=>n+m.panels,0)}));
 }catch(error){report.failure={message:error.message,stack:error.stack};save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
