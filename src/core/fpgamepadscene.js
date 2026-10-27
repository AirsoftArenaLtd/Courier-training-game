/* Scene-local input merge and context routing; shared settings are read without writes. */
window.OTR=window.OTR||{};
OTR.fpGamepadScene={
 create(scene,reader){
  const controller=OTR.fpGamepad.create(reader),A=OTR.fpGamepad.actions;
  const controls={forward:false,back:false,left:false,right:false,careful:false};let focused=true,lastContext,capture=null;
  const context=()=>scene.panel||scene.handheld?.isOpen&&(scene.handheld.aiming?scene.handheld:scene.handheld.device?.current||scene.handheld)||scene.model?.mode||scene.area;
  const state={controller,controls,look:null,scanHeld:false,inspectTurn:0,session:null,
   bindings(){return state.session||OTR.fpAccess.settings().gamepad;},
   startCapture(group,done){
    if(capture)capture.reader.dispose();
    capture={panel:scene.panel,reader:OTR.fpGamepadCapture.create(group,controller.frame.device,reader),done};state.reset();
   },
   reset(){controller.reset();if(capture)capture.reader.reset();state.look=null;state.scanHeld=false;state.inspectTurn=0;},
   suspend(){focused=false;state.reset();},resume(){focused=true;state.reset();},
   dispose(){if(capture)capture.reader.dispose();capture=null;state.session=null;controller.dispose();state.look=null;state.scanHeld=false;state.inspectTurn=0;},
   tick(){
    const before=context();if(before!==lastContext){state.reset();lastContext=before;}
    controller.configure(state.bindings());
    const enabled=focused&&!(typeof document!=='undefined'&&document.hidden)&&!scene.loading&&!scene.external&&!scene.transitioning;
    if(capture&&capture.panel!==scene.panel){capture.reader.dispose();capture=null;state.reset();}
    const capturing=!!capture;
    if(capture){
     const result=capture.reader.poll(enabled);
     if(result.stage==='complete'){const done=capture.done,value=result.value;capture.reader.dispose();capture=null;state.reset();done(value);lastContext=context();}
    }
    const f=controller.poll(enabled&&!capturing);
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
