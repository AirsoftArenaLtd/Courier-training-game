/* Actual framebuffer photos, bounded transient thumbnails and a clean delivery camera. Nothing is saved. */
window.OTR=window.OTR||{};
OTR.fpScannerPhoto={
  bounds(){return {x:Math.round(OTR.W*.14),y:Math.round(OTR.H*.14),width:Math.round(OTR.W*.72),height:Math.round(OTR.H*.72)};},
  framing(scene){return !!(scene.model?.customerStop?.photoMode&&scene.scenarioSession.phase==='active'&&!scene.panel&&!scene.handheld?.isOpen&&!scene.external&&!scene.transitioning);},
  hide(scene){if(scene.scannerPhotoView){scene.scannerPhotoView.destroy();scene.scannerPhotoView=null;}},
  restore(map){if(!map)return;for(const [object,visible] of map)if(object.active!==false)object.setVisible(visible);map.clear();},
  mask(scene,map,keep=[]){for(const object of scene.children.list){if(object===scene.view.extern||keep.includes(object))continue;if(object.visible&&!map.has(object))map.set(object,true);object.setVisible(false);}},
  beforeRefresh(scene){if(!this.framing(scene)&&scene.scannerFramingHidden){this.restore(scene.scannerFramingHidden);scene.scannerFramingHidden=null;}},
  overlay(scene){
    const d=scene.model?.customerStop;if(!d)return;const framing=this.framing(scene),capture=d.captureToken;
    if(framing){const source=`Press ${OTR.fpAccess.key('KeyE')} to take the photo.`,size=OTR.fpAccess.settings().large?26:22;if(!scene.scannerCaption)scene.scannerCaption=OTR.txt(scene,OTR.W/2,18,source,size,'#ffffff',{oy:0,wrap:OTR.W-48,align:'center',stroke:'#14232C',strokeW:4}).setDepth(23);if(scene.scannerCaptionSource!==source){scene.scannerCaption.setText(source);scene.scannerCaptionSource=source;}if(scene.scannerCaptionSize!==size){scene.scannerCaption.setFontSize(size);scene.scannerCaptionSize=size;}}
    if(scene.scannerFrame)scene.scannerFrame.setVisible(framing&&!capture);if(scene.scannerCaption)scene.scannerCaption.setVisible(framing&&!capture);
    if(capture)this.mask(scene,capture.hidden);
    else if(framing){if(!scene.scannerFramingHidden)scene.scannerFramingHidden=new Map();this.mask(scene,scene.scannerFramingHidden,[scene.scannerFrame,scene.scannerCaption]);}
  },
  clear(scene){const d=scene.model?.customerStop;this.hide(scene);if(d?.captureToken)d.captureToken.finish(false);if(d?.photoPreview){const key=d.photoPreview;d.photoPreview=null;OTR.fpBrand.releaseUnused(scene,key);}this.restore(scene.scannerFramingHidden);scene.scannerFramingHidden=null;},
  capture(scene){
    const d=scene.model.customerStop,K=OTR.fpScannerStop;if(d.captureToken||!d.photoMode||!OTR.fpCustomerStop.active(d))return Promise.resolve(false);
    scene.sync();const photo=scene.art.customerStop.photo(scene.view.camera),index=d.index,paused=scene.model.paused,transitioning=scene.transitioning,bounds=this.bounds();
    return new Promise(resolve=>{
      const token={hidden:new Map(),done:false,finish:ok=>{if(token.done)return;token.done=true;clearTimeout(token.timer);if(d.captureToken===token)d.captureToken=null;this.restore(token.hidden);if(scene.model.customerStop===d){scene.model.paused=paused;if(scene.scenarioSession.phase==='active')scene.transitioning=transitioning;}resolve(ok);}};d.captureToken=token;token.timer=setTimeout(()=>token.finish(false),8000);scene.model.paused=true;scene.transitioning=true;this.mask(scene,token.hidden);
      try{scene.game.renderer.snapshotArea(bounds.x,bounds.y,bounds.width,bounds.height,image=>{
        if(token.done)return;
        const current=scene.model.customerStop===d&&d.index===index&&scene.scenarioSession.phase==='active'&&d.captureToken===token;
        if(!current||!image?.width){token.finish(false);return;}
        try{
          const canvas=document.createElement('canvas');canvas.width=OTR.gfx.high()?640:320;canvas.height=canvas.width*9/16;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('The delivery photo canvas is unavailable');ctx.drawImage(image,0,0,canvas.width,canvas.height);
          this.hide(scene);if(d.photoPreview)OTR.fpBrand.releaseUnused(scene,d.photoPreview);const key='scanner_photo_'+scene.scenarioSession.id+'_'+index;scene.textures.addCanvas(key,canvas);d.photoPreview=key;
          if(!K.capture(d,photo)){OTR.fpBrand.releaseUnused(scene,key);d.photoPreview=null;token.finish(false);return;}
          token.finish(true);
        }catch(_){token.finish(false);}
      });}catch(_){token.finish(false);}
    });
  },
  show(scene,body){
    this.hide(scene);const d=scene.model.customerStop;if(!d.photoPreview||!scene.textures.exists(d.photoPreview))return false;const size=OTR.fpAccess.settings().large?26:22,root=scene.add.container(20,120).setDepth(115);
    root.add(scene.add.rectangle(0,0,800,490,0x14232C,.98).setOrigin(0).setStrokeStyle(2,0x83969E,1));
    const title=OTR.txt(scene,24,18,'Review the captured delivery photo.',size,'#ffffff',{ox:0,oy:0,wrap:752}),caption=OTR.txt(scene,24,0,body,size,'#ffffff',{ox:0,oy:0,wrap:752});caption.setY(470-caption.height);
    const top=Math.max(85,title.y+title.height+14),height=Math.max(1,Math.min(342,caption.y-14-top));root.add(title);root.add(scene.add.image(400,top+height/2,d.photoPreview).setDisplaySize(height*16/9,height));root.add(caption);scene.scannerPhotoView=root;return true;
  }
};
