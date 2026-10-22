/* Company appearance in 3D, using the shared theme without adding a Three.js image map. */
window.OTR=window.OTR||{};
OTR.fpBrand={
  // Canvas stroked text needs a primary face for its script on Linux and Windows.
  scriptFonts:{hi:'Noto Sans Devanagari',mr:'Noto Sans Devanagari',bn:'Noto Sans Bengali',te:'Noto Sans Telugu',ta:'Noto Sans Tamil',gu:'Noto Sans Gujarati',kn:'Noto Sans Kannada',ml:'Noto Sans Malayalam',pa:'Noto Sans Gurmukhi'},
  read(){
    const data=typeof OTR_DATA==='undefined'?{}:OTR_DATA,t=data.theme||{},c=data.config||{};
    const colour=(key,fallback)=>Number.isInteger(t[key])&&t[key]>=0&&t[key]<=0xffffff?t[key]:fallback;
    const name=String(t.companyName||c.brand||'On The Route').trim().slice(0,64)||'On The Route';
    const primary=colour('primary',0x1F4E79),accent=colour('accent',0x0FA3B1);
    return {name,logo:typeof t.logo==='string'?t.logo:'',mark:String(t.logoText||name.split(/\s+/).slice(0,2).map(w=>w[0]).join('')).slice(0,4),
      primary,accent,body:colour('vanBody',colour('paper',0xE9F0F9)),uniform:colour('uniform',primary),
      dark:colour('primaryDark',0x0E2A47),ink:colour('ink',0x0F2030),paper:colour('paper',0xE9F0F9)};
  },
  async loadLogo(scene){
    const source=this.read().logo,key='fp_company_logo';if(!source)return null;
    let url;try{url=new URL(source,location.href);if(url.origin!==location.origin&&!source.startsWith('data:image/'))return null;}catch(_){return null;}
    const existing=scene.textures.exists(key)&&scene.textures.get(key);if(existing&&existing.fpSource===source)return key;
    const img=new Image();const loaded=await new Promise(resolve=>{const timeout=setTimeout(()=>resolve(false),2500);img.onload=()=>{clearTimeout(timeout);resolve(true);};img.onerror=()=>{clearTimeout(timeout);resolve(false);};img.src=url.href;});
    if(!loaded||!scene.sys.isActive())return null;
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d'),scale=Math.min(256/img.naturalWidth,64/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(256-w)/2,(64-h)/2,w,h);
    if(existing)scene.textures.remove(key);const texture=scene.textures.addCanvas(key,canvas);texture.fpSource=source;return key;
  },
  labels(scene){
    const brand=this.read(),script=this.scriptFonts[OTR.i18n&&OTR.i18n.lang];return scene.art.labels.map(label=>{
      let object;if(label.brand){object=scene.add.container(0,0).setDepth(9).setVisible(false);
        if(scene.companyLogo)object.add(scene.add.image(0,-14,scene.companyLogo).setDisplaySize(112,28));
        else object.add(OTR.txt(scene,0,-14,brand.mark,21,'#ffffff',{fit:112,stroke:'#243039',strokeW:4}));
        object.add(OTR.txt(scene,0,17,brand.name,17,'#ffffff',{fit:220,stroke:'#243039',strokeW:4}));
      }else object=OTR.txt(scene,0,0,label.text,17,'#ffffff',{stroke:'#243039',strokeW:5,...(label.wrap?{wrap:label.wrap}:{fit:220})}).setDepth(9).setVisible(false);
      if(script&&!label.brand){object.setFontFamily('\"Nirmala UI\", \"'+script+'\", '+OTR.theme.font);if(!label.wrap)object.setScale(Math.min(1,220/object.width));}
      return {label,object};
    });
  },
  deviceTexture(scene,device){
    const b=this.read(),key='handheld_body',signature='rugged-2|'+JSON.stringify(b);let texture=scene.textures.exists(key)&&scene.textures.get(key);
    if(texture&&texture.fpBrand===signature)return key;
    if(!texture)texture=scene.textures.createCanvas(key,device.W+40,device.H+40);
    const ctx=texture.getContext(),cv=OTR.cv,W=device.W,H=device.H,css=n=>'#'+n.toString(16).padStart(6,'0');ctx.clearRect(0,0,W+40,H+40);
    cv.shadow(ctx,24,10,.5);cv.rr(ctx,20,20,W,H,44);ctx.fillStyle=css(b.dark);ctx.fill();cv.noShadow(ctx);
    cv.rr(ctx,25,25,W-10,H-10,39);ctx.strokeStyle='#687780';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=css(b.accent);for(const x of [20,W+8]){cv.rr(ctx,x,70,12,160,6);ctx.fill();}
    ctx.fillStyle='#101B23';for(const x of [22,W+6])for(let y=86;y<218;y+=12)ctx.fillRect(x,y,12,4);
    cv.rr(ctx,20+W/2-60,30,120,18,9);ctx.fillStyle='#8A1A20';ctx.fill();ctx.fillStyle='#F26B73';ctx.fillRect(20+W/2-50,36,100,6);
    cv.rr(ctx,44,64,W-48,470,16);ctx.fillStyle='#101B23';ctx.fill();ctx.strokeStyle='#71818A';ctx.lineWidth=1;ctx.stroke();
    // Speaker slots and fasteners are case details, not nonfunctional button drawings.
    ctx.fillStyle='#101B23';for(let i=0;i<5;i++){cv.rr(ctx,W/2-36+i*22,562,12,38,5);ctx.fill();}
    for(const x of [44,W-4])for(const y of [48,H-8]){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#98A6AA';ctx.fill();ctx.fillStyle='#25323A';ctx.fillRect(x-2,y-.6,4,1.2);}
    ctx.fillStyle=css(b.accent);cv.rr(ctx,W/2-14,616,68,4,2);ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.textBaseline='middle';OTR.cv.fitText(ctx,b.name,20+W/2,648,W-44,14,{min:10});
    texture.fpBrand=signature;texture.refresh();return key;
  },
  deviceSkin(device){
    // Low keeps the same case design in vector art, with native-size text and no case canvas.
    const s=device.scene,b=this.read(),g=s.add.graphics(),x=-device.W/2,y=-device.H/2;
    g.fillStyle(0x000000,.2);g.fillRoundedRect(x+6,y+8,device.W,device.H,44);
    g.fillStyle(b.dark);g.fillRoundedRect(x,y,device.W,device.H,44);
    g.lineStyle(2,0x687780);g.strokeRoundedRect(x+5,y+5,device.W-10,device.H-10,39);
    g.fillStyle(b.accent);for(const grip of [x,x+device.W-12])g.fillRoundedRect(grip,y+50,12,160,6);
    g.fillStyle(0x101B23);for(const grip of [x+2,x+device.W-14])for(let row=66;row<198;row+=12)g.fillRect(grip,y+row,12,4);
    g.fillStyle(0x8A1A20);g.fillRoundedRect(-60,y+10,120,18,9);g.fillStyle(0xF26B73);g.fillRect(-50,y+16,100,6);
    g.fillStyle(0x101B23);g.fillRoundedRect(x+24,y+44,device.W-48,470,16);g.lineStyle(1,0x71818A);g.strokeRoundedRect(x+24,y+44,device.W-48,470,16);
    g.fillStyle(0x101B23);for(let i=0;i<5;i++)g.fillRoundedRect(-56+i*22,y+542,12,38,5);
    for(const bx of [x+24,x+device.W-24])for(const by of [y+28,y+device.H-28]){g.fillStyle(0x98A6AA).fillCircle(bx,by,3);g.fillStyle(0x25323A).fillRect(bx-2,by-.6,4,1.2);}
    g.fillStyle(b.accent).fillRoundedRect(-34,y+596,68,4,2);
    this.releaseUnused(s,'handheld_body');return g;
  },
  releaseUnused(scene,key){
    if(!scene.textures.exists(key))return;const uses=o=>!!(o.texture&&o.texture.key===key)||(o.list||[]).some(uses);
    if(!scene.game.scene.scenes.some(s=>s.children&&s.children.list.some(uses)))scene.textures.remove(key);
  },
  deviceBackground(device,def){
    // Generic handheld pages cache a full screen image for every header colour. The 3D adapter needs none.
    const old=device.screen.list[0],texture=old&&old.texture&&old.texture.key;if(old)old.destroy();
    const title=device.screen.list.find(o=>o.type==='Text'&&o.x===device.sx+14&&o.y===device.sy+22);
    if(title)title.setWordWrapWidth(device.sw-28,true);
    const header=Math.max(44,title?title.height+12:44);
    if(title)title.setY(device.sy+header/2);
    if(device.clockText)device.clockText.setY(device.sy+header/2);
    for(const o of device.screen.list)if(o!==title&&o!==device.clockText&&o.y>=device.sy+44&&o.y<device.sy+device.sh-30)o.y+=header-44;
    const g=device.scene.add.graphics(),b=this.read();g.fillStyle(0xF1F5FA);g.fillRoundedRect(device.sx,device.sy,device.sw,device.sh,10);
    g.fillStyle(def.color===undefined?b.primary:def.color);g.fillRoundedRect(device.sx,device.sy,device.sw,header,{tl:10,tr:10,bl:0,br:0});
    g.lineStyle(1,0xB8C7CF).strokeRoundedRect(device.sx+.5,device.sy+.5,device.sw-1,device.sh-1,10);
    g.fillStyle(b.accent).fillRect(device.sx+14,device.sy+header-3,device.sw-28,2);device.screen.addAt(g,0);
    // Final wrapping and hit-area sizes still belong to fpAccess.layoutDevice.
    for(const btn of device.optionBtns||[])btn.label.setOrigin(0,.5).setX(-(device.sw-20)/2+12).setAlign('left');
    if(!texture||!texture.startsWith('gfx_'))return;
    this.releaseUnused(device.scene,texture);
  },
  deviceOptions(device){
    // Reuse each button's input object, handlers and text. The page owns these small vector faces.
    for(const btn of device.optionBtns||[]){
      if(btn._fpSurface)btn._fpSurface.destroy();
      const g=device.scene.add.graphics(),w=device.sw-20,h=btn._fpHeight||btn.height;
      g.fillStyle(0xFFFFFF).fillRoundedRect(-w/2,-h/2,w,h,8);
      g.lineStyle(1,0xA8BBC5).strokeRoundedRect(-w/2+.5,-h/2+.5,w-1,h-1,8);
      g.fillStyle(this.read().accent).fillRoundedRect(-w/2+1,-h/2+8,3,h-16,1);
      // A nonzero alpha keeps Phaser's original hit object eligible for pointer hit testing.
      btn.bg.setAlpha(.001);btn.label.setColor('#18323F').setShadow(0,0,'rgba(0,0,0,0)',0);
      btn._fpSurface=g;btn.addAt(g,0);
    }
  }
};
