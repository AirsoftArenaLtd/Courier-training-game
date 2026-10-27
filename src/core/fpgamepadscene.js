/* Scene-local input merge and context routing; shared settings are read without writes. */
window.OTR=window.OTR||{};
OTR.fpGamepadScene={
 create(scene,reader){
  const controller=OTR.fpGamepad.create(reader),A=OTR.fpGamepad.actions;
  const controls={forward:false,back:false,left:false,right:false,careful:false};let focused=true,lastContext;
  const context=()=>scene.panel||scene.handheld?.isOpen&&(scene.handheld.aiming?scene.handheld:scene.handheld.device?.current||scene.handheld)||scene.model?.mode||scene.area;
  const state={controller,controls,look:null,scanHeld:false,inspectTurn:0,
   reset(){controller.reset();state.look=null;state.scanHeld=false;state.inspectTurn=0;},
   suspend(){focused=false;state.reset();},resume(){focused=true;state.reset();},
   dispose(){controller.dispose();state.look=null;state.scanHeld=false;state.inspectTurn=0;},
   tick(){
    const before=context();if(before!==lastContext){state.reset();lastContext=before;}
    controller.configure(OTR.fpAccess.settings().gamepad);
    const enabled=focused&&!(typeof document!=='undefined'&&document.hidden)&&!scene.loading&&!scene.external&&!scene.transitioning,f=controller.poll(enabled);
    state.look=null;state.scanHeld=false;state.inspectTurn=0;
    if(f.active){
     const pressed=f.pressed,hh=scene.handheld,menu=!!scene.panel||hh?.isOpen&&!hh.aiming;let code='';
     if(pressed&A.pause)code=hh?.isOpen?'KeyH':'Escape';
     else if(pressed&A.back)code='Escape';
     else if(pressed&A.handheld)code='Tab';
     else if(menu){
      if(pressed&A.interact)code=scene.panel?.type==='inspect'?'Space':'Enter';
      else if(pressed&A.menuUp)code='ArrowUp';else if(pressed&A.menuDown)code='ArrowDown';
      else if(pressed&A.menuLeft)code='ArrowLeft';else if(pressed&A.menuRight)code='ArrowRight';
     }else if(hh?.isOpen){if(pressed&A.focus)code='KeyP';}
     else if(pressed&A.interact)code='Enter';else if(pressed&A.focus)code='KeyP';else if(pressed&A.gear)code='KeyR';
     else if(pressed&A.handbrake)code='Space';else if(pressed&A.belt)code='KeyB';
     else if(pressed&A.signalLeft)code='KeyQ';else if(pressed&A.signalRight)code='KeyC';else if(pressed&A.lookForward)code='KeyV';
     if(code){scene.keyboardMode=true;scene.inputAction(code);}
     const after=context();if(after!==before){state.reset();lastContext=after;}
     else if(scene.panel?.type==='inspect')state.inspectTurn=f.held&(A.menuLeft|A.menuRight)?Number(!!(f.held&A.menuRight))-Number(!!(f.held&A.menuLeft)):f.moveX;
     else if(!scene.panel){state.look=f;state.scanHeld=!!(hh?.isOpen&&hh.aiming&&(f.held&A.interact));}
    }
    const h=scene.held;controls.forward=!!h.KeyW;controls.back=!!h.KeyS;controls.left=!!h.KeyA;controls.right=!!h.KeyD;controls.careful=!!(h.ShiftLeft||h.ShiftRight);
    if(f.active&&!scene.panel&&!scene.handheld?.isOpen){
     const cab=scene.model?.mode==='cab';controls.forward=Math.max(Number(controls.forward),cab?f.throttle:Math.max(0,f.moveY));controls.back=Math.max(Number(controls.back),cab?f.brake:Math.max(0,-f.moveY));
     if(!h.KeyA&&!h.KeyD){controls.left=Math.max(0,-f.moveX);controls.right=Math.max(0,f.moveX);}controls.careful=controls.careful||f.careful;
     if(f.throttle||f.brake||f.moveX||f.moveY||f.lookX||f.lookY)scene.keyboardMode=true;
    }
    return controls;
   }
  };
  return state;
 }
};
