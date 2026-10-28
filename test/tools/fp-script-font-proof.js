/* Read-only glyph-family proof using an actual Phaser text's font, without a theme override. */
const assert=require('node:assert/strict');
module.exports=async(page,sceneKey='FirstPersonScenarioScene')=>{
 const proof=await page.evaluate(key=>{const s=OTR.game.scene.getScene(key),text=s.panel?.root.list.find(o=>o.type==='Text');return {lang:OTR.i18n.lang,family:text?.style.fontFamily,themeFamily:OTR.theme.font,override:OTR.theme.fontOverride||null};},sceneKey);
 assert.equal(proof.override,null,'The native review uses the shipped language font selection.');assert.ok(proof.family,'Read the actual displayed Phaser font.');
 if(proof.lang!=='ta')return proof;
 const id='otr-script-font-proof',session=await page.createCDPSession();
 try{
  await page.evaluate(({id,family})=>{const el=document.createElement('span');el.id=id;el.textContent='பாதுகாப்பு வாசல்கள் முக்கியப் பாடங்கள்';Object.assign(el.style,{fontFamily:family,fontWeight:'900',fontSize:'34px',position:'fixed',left:'-10000px',top:'-10000px'});document.body.appendChild(el);},{id,family:proof.family});
  await session.send('DOM.enable');await session.send('CSS.enable');const doc=await session.send('DOM.getDocument'),node=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#'+id});const result=await session.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});proof.platformFonts=result.fonts;
  assert.ok(proof.platformFonts.some(f=>/Noto.*Tamil/i.test(f.familyName)&&f.glyphCount>0),'Tamil glyphs resolve through the actual game text font.');return proof;
 }finally{await page.evaluate(id=>document.getElementById(id)?.remove(),id);await session.detach();}
};
