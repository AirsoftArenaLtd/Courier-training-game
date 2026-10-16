/* Company appearance in 3D, using the shared theme without adding a Three.js image map. */
window.OTR=window.OTR||{};
OTR.fpBrand={
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
    const brand=this.read();return scene.art.labels.map(label=>{
      let object;if(label.brand){object=scene.add.container(0,0).setDepth(9).setVisible(false);
        if(scene.companyLogo)object.add(scene.add.image(0,-14,scene.companyLogo).setDisplaySize(112,28));
        else object.add(OTR.txt(scene,0,-14,brand.mark,21,'#ffffff',{fit:112,stroke:'#243039',strokeW:4}));
        object.add(OTR.txt(scene,0,17,brand.name,17,'#ffffff',{fit:220,stroke:'#243039',strokeW:4}));
      }else object=OTR.txt(scene,0,0,label.text,17,'#ffffff',{stroke:'#243039',strokeW:5,...(label.wrap?{wrap:label.wrap}:{fit:220})}).setDepth(9).setVisible(false);
      return {label,object};
    });
  },
  deviceTexture(scene,device){
    const b=this.read(),key='handheld_body',signature=JSON.stringify(b);let texture=scene.textures.exists(key)&&scene.textures.get(key);
    if(texture&&texture.fpBrand===signature)return key;
    if(!texture)texture=scene.textures.createCanvas(key,device.W+40,device.H+40);
    const ctx=texture.getContext(),cv=OTR.cv,W=device.W,H=device.H,css=n=>'#'+n.toString(16).padStart(6,'0');ctx.clearRect(0,0,W+40,H+40);
    cv.shadow(ctx,24,10,.5);cv.rr(ctx,20,20,W,H,44);ctx.fillStyle=css(b.dark);ctx.fill();cv.noShadow(ctx);
    ctx.fillStyle=css(b.accent);for(const x of [20,W+8]){cv.rr(ctx,x,70,12,160,6);ctx.fill();}
    cv.rr(ctx,20+W/2-60,30,120,18,9);ctx.fillStyle='#8A1A20';ctx.fill();ctx.fillStyle='#F26B73';ctx.fillRect(20+W/2-50,36,100,6);
    cv.rr(ctx,44,64,W-48,470,16);ctx.fillStyle=css(b.ink);ctx.fill();
    for(let r=0;r<2;r++)for(let c=0;c<4;c++){cv.rr(ctx,60+c*80,550+r*44,64,34,10);ctx.fillStyle=css(c===0&&r===0?b.accent:b.primary);ctx.fill();}
    ctx.fillStyle='#FFFFFF';ctx.textAlign='center';ctx.textBaseline='middle';OTR.cv.fitText(ctx,b.name,20+W/2,648,W-44,14,{min:10});
    texture.fpBrand=signature;texture.refresh();return key;
  },
  deviceSkin(device){
    // On Low, the case is flat vector art; keep all screen text at its native size without a large canvas.
    const s=device.scene,b=this.read(),g=s.add.graphics(),x=-device.W/2,y=-device.H/2;
    g.fillStyle(0x000000,.2);g.fillRoundedRect(x+6,y+8,device.W,device.H,44);
    g.fillStyle(b.dark);g.fillRoundedRect(x,y,device.W,device.H,44);
    g.fillStyle(b.accent);for(const grip of [x,x+device.W-12])g.fillRoundedRect(grip,y+50,12,160,6);
    g.fillStyle(0x8A1A20);g.fillRoundedRect(-60,y+10,120,18,9);g.fillStyle(0xF26B73);g.fillRect(-50,y+16,100,6);
    g.fillStyle(b.ink);g.fillRoundedRect(x+24,y+44,device.W-48,470,16);
    for(let row=0;row<2;row++)for(let col=0;col<4;col++){g.fillStyle(col===0&&row===0?b.accent:b.primary);g.fillRoundedRect(x+40+col*80,y+530+row*44,64,34,10);}
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
    g.fillStyle(def.color===undefined?b.primary:def.color);g.fillRoundedRect(device.sx,device.sy,device.sw,header,{tl:10,tr:10,bl:0,br:0});device.screen.addAt(g,0);
    if(!texture||!texture.startsWith('gfx_'))return;
    this.releaseUnused(device.scene,texture);
  }
};
