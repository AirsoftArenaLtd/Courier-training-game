/* The shared renderer restores GL objects; this scene keeps the workday and its input still until it is ready. */
window.OTR=window.OTR||{};
OTR.fpContext={
 attach(scene){
  const canvas=scene.sys.game.canvas,waiters=[];
  let disposed=false,wasActive=false,overlay=null,previousFocus=null;
  const clearInput=()=>{
   scene.held=Object.create(null);scene.pointerStart=null;
   if(scene.handheld)scene.handheld.trigger=false;
   if(scene.gamepad)scene.gamepad.suspend();
  };
  const settle=value=>{while(waiters.length)waiters.shift()(value);};
  const removeOverlay=()=>{if(overlay){overlay.remove();overlay=null;}if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;};
  const state={lost:false,restores:0,
   ready(){return disposed?Promise.resolve(false):state.lost?new Promise(resolve=>waiters.push(resolve)):Promise.resolve(true);},
   dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);removeOverlay();settle(false);}
  };
  const lost=event=>{
   event.preventDefault();if(disposed||state.lost)return;
   state.lost=true;wasActive=scene.sys.isActive();clearInput();
   if(wasActive)scene.sys.pause();
   if(scene.progress)scene.checkpoint();
   if(OTR.a11y)OTR.a11y.hush();scene.releaseMouse();
   // Canvas text cannot render during a context loss. Reuse translated, accessible DOM labels without a texture.
   const t=text=>OTR.i18n?OTR.i18n.t(text):text;
   overlay=document.createElement('div');overlay.setAttribute('role','alert');overlay.style.cssText='position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#101a25;color:white;font:24px sans-serif';
   const card=document.createElement('div');card.style.cssText='max-width:calc(100vw - 48px);text-align:center;padding:24px';
   const label=document.createElement('p');label.textContent=t('Paused');label.style.cssText='margin:0 0 24px;overflow-wrap:anywhere';
   const reload=document.createElement('button');reload.textContent=t('Reload');reload.style.cssText='font:inherit;min-height:48px;min-width:148px;max-width:100%;padding:12px 24px;white-space:normal;overflow-wrap:anywhere';reload.onclick=()=>location.reload();
   card.append(label,reload);overlay.append(card);previousFocus=document.activeElement;document.body.append(overlay);reload.focus();
  };
  const restored=()=>{
   // This listener is installed before Three. Its GL caches must finish restoring before we resume the scene.
   Promise.resolve().then(()=>{
    if(disposed||!state.lost||scene.sys.game.renderer.gl.isContextLost())return;
    try{if(scene.view)scene.view.restore();if(scene.art?.lighting)scene.art.lighting.restore();}
    catch(error){console.warn(error);return;}
    clearInput();state.lost=false;state.restores++;scene.lastAim=-1000;
    removeOverlay();
    if(scene.gamepad&&!document.hidden&&(!document.hasFocus||document.hasFocus()))scene.gamepad.resume();
    if(wasActive&&scene.sys.isPaused()){
     // Preserve existing panels, handheld pages and transitions. Active driving resumes only after Continue.
     if(!scene.loading&&!scene.panel&&!scene.handheld?.isOpen&&!scene.external&&!scene.transitioning)scene.showPause(true);
     scene.sys.resume();
    }
    settle(true);
   });
  };
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  scene.events.once('shutdown',()=>state.dispose());
  return state;
 }
};
