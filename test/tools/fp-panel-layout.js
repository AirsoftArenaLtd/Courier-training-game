/* Read the actual panel and choice rectangles without changing input or game state. */
module.exports=()=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene');
 const panel=scene?.sys.isActive()?scene.panel:OTR.game.scene.getScene('FirstPersonScene').panel;
 let index=0;
 return panel.root.list.filter(o=>o.type==='Text').map((o,n)=>{
  const b=o.getBounds(),button=n>=2?panel.buttons[index++]?.getBounds():null;
  return {source:OTR.i18n.src(o),scale:o.scaleY,font:parseFloat(o.style.fontSize),left:b.left,right:b.right,top:b.top,bottom:b.bottom,
   button:button?{left:button.left,right:button.right,top:button.top,bottom:button.bottom}:null};
 });
};
