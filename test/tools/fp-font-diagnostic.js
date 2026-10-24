/* Read-only font probes attached to an existing owned QA browser; never launches or closes it. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),pp=require('puppeteer-core');
(async()=>{
 if(!process.env.QA_DEBUG_PROFILE)throw Error('QA_DEBUG_PROFILE must name the owned review browser profile');
 const out=path.resolve(process.env.QA_OUT||path.join(__dirname,'../out/fp-review'));fs.mkdirSync(out,{recursive:true});
 const profile=process.env.QA_DEBUG_PROFILE,[port,endpoint]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split('\n');
 const browser=await pp.connect({browserWSEndpoint:'ws://127.0.0.1:'+port+endpoint,protocolTimeout:90000});let page,session;
 try{
  const pages=(await browser.pages()).filter(p=>p.url().startsWith((process.env.QA_BASE||'http://127.0.0.1:8383')+'/index.html?lab=firstperson'));if(pages.length!==1)throw Error('The owned review page is not unique');page=pages[0];session=await page.createCDPSession();await session.send('DOM.enable');await session.send('CSS.enable');
  const probe=await page.evaluate(()=>{
   const sample='பாதுகாப்பு வாசல்கள் முக்கியப் பாடங்கள்',fonts=[OTR.theme.font,'"Noto Sans Tamil", sans-serif','"Noto Sans Tamil", '+OTR.theme.font],images=[];
   for(let i=0;i<fonts.length;i++){
    const span=document.createElement('span');span.id='c41-font-diagnostic-'+i;span.textContent=sample;Object.assign(span.style,{fontFamily:fonts[i],fontWeight:'900',fontSize:'34px',position:'fixed',left:'-10000px',top:'-10000px'});document.body.appendChild(span);
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=100;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1000,100);ctx.fillStyle='#18232B';ctx.font='900 34px '+fonts[i];ctx.fillText(sample,12,64);images.push({family:fonts[i],font:ctx.font,width:ctx.measureText(sample).width,png:canvas.toDataURL('image/png')});canvas.width=canvas.height=1;
   }
   return {sample,lang:OTR.i18n.lang,images,scope:'Read-only font samples in the existing owned review browser. No game state, keyboard, renderer or scoring changes.'};
  });
  const doc=await session.send('DOM.getDocument');probe.platformFonts=[];
  for(let i=0;i<probe.images.length;i++){
   const {nodeId}=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#c41-font-diagnostic-'+i});const result=await session.send('CSS.getPlatformFontsForNode',{nodeId});probe.platformFonts.push({sample:i,fonts:result.fonts});const im=probe.images[i],bytes=Buffer.from(im.png.split(',')[1],'base64'),file=path.join(out,'c41-font-'+(['system','noto','proposal'][i])+'.png');fs.writeFileSync(file,bytes);delete im.png;im.file=path.basename(file);im.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  }
  fs.writeFileSync(path.join(out,'c41-font-diagnostic.json'),JSON.stringify(probe,null,2)+'\n');console.log(JSON.stringify({lang:probe.lang,images:probe.images,platformFonts:probe.platformFonts},null,2));
 }finally{if(page)try{await page.evaluate(()=>document.querySelectorAll('[id^="c41-font-diagnostic-"]').forEach(e=>e.remove()));}catch(_){}if(session)await session.detach();await browser.disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
