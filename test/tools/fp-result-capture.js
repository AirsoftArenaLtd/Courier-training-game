/* Wait for the real result animations; close a rank-up card with its actual keyboard shortcut. */
module.exports=async function resultCapture(page){
 const start=await page.evaluate(()=>OTR.game.scene.getScene('ResultsScene').time.now);
 await page.waitForFunction(start=>{
  const s=OTR.game.scene.getScene('ResultsScene');
  return s?.sys.isActive()&&s.time.now>=start+8000&&s.input.enabled;
 },{timeout:180000},start);
 let rankUpDismissed=false;
 const rankUp=await page.evaluate(()=>{
  const s=OTR.game.scene.getScene('ResultsScene'),top=s._modalStack?.at(-1);
  const contains=o=>o.type==='Text'&&OTR.i18n.src(o)==='RANK UP!'||(o.list||[]).some(contains);
  return !!top&&contains(top);
 });
 if(rankUp){await page.keyboard.press('Space');rankUpDismissed=true;await page.waitForFunction(()=>!OTR.game.scene.getScene('ResultsScene')._openModals,{timeout:30000});}
 // current() is intentionally null until a real navigation key shows the focus ring.
 await page.keyboard.press('Tab');
 await page.waitForFunction(()=>OTR.game.scene.getScene('ResultsScene')._screenFocus?.current()?.enabled,{timeout:30000});
 const proof=await page.evaluate(()=>{
  const s=OTR.game.scene.getScene('ResultsScene'),panel=s.children.list.find(o=>o.list?.some(t=>t.type==='Text'&&OTR.i18n.src(t)==='STARS'));
  const counter=panel?.list.find(t=>t.type==='Text'&&/^\d+ \/ \d+$/.test(t.text));
  const cats=OTR.scoring.ordered((s.d.scenario||OTR.registry.get(s.d.scenarioId)).categories).filter(c=>!s.d.verdict?.untested?.includes(c));
  const b=panel?.getBounds();
  return {active:s.sys.isActive(),counter:counter?.text,expected:cats.reduce((n,c)=>n+(s.d.stars[c]||0),0)+' / '+cats.length*3,modals:s._openModals||0,scale:panel?.scaleX,bounds:b&&{left:b.left,top:b.top,right:b.right,bottom:b.bottom},transition:s.children.list.some(o=>o.active&&o.depth===10000)};
 });
 if(!proof.active||proof.counter!==proof.expected||proof.modals||proof.scale!==1||proof.transition)throw Error('The result presentation has not settled: '+JSON.stringify(proof));
 return {...proof,rankUpDismissed};
};
