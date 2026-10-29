/* Local, bounded asset preload. A failed asset always leaves the procedural world available. */
window.OTR=window.OTR||{};
OTR.fpAssets={
  manifest(files,high){
    if(!Array.isArray(files)||files.length>1024)throw Error('Invalid asset manifest');
    const groups=new Map(),paths=new Set();let total=0,low=0;
    for(const f of files){
      if(!f||typeof f.path!=='string'||!/^[-\w]+\/(?:[-\w]+\/)*[-\w.]+\.(glb|png|jpg|jpeg|ogg|mp3)$/.test(f.path)||f.path.includes('..')||paths.has(f.path))throw Error('Invalid asset path');
      const ext=f.path.split('.').pop(),quality=f.quality||'both';
      if(!['low','high','both'].includes(quality)||f.pack!==f.path.split('/')[0]||typeof f.use!=='string'||!f.use||!Number.isSafeInteger(f.bytes)||f.bytes<=0)throw Error('Invalid asset entry');
      if(f.bytes>(ext==='glb'?3:ext==='png'||ext==='jpg'||ext==='jpeg'?2:40)*1024*1024)throw Error('Asset is over budget');
      paths.add(f.path);total+=f.bytes;if(quality!=='high')low+=f.bytes;
      if(!groups.has(f.use))groups.set(f.use,[]);groups.get(f.use).push({...f,quality,ext});
    }
    if(total>40*1024*1024||low>15*1024*1024)throw Error('Asset manifest is over budget');
    const selected=[];
    for(const [use,entries] of groups){
      const order=high?['high','both','low']:['low','both'],candidates=[];
      for(const q of order){const choices=entries.filter(f=>f.quality===q);if(choices.length>1)throw Error('Duplicate asset variant');if(choices[0])candidates.push(choices[0]);}
      if(candidates.length)selected.push({use,candidates});
    }
    return selected;
  },
  imageSize(bytes,mime){
    const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(mime==='image/png'&&bytes.length>=24&&d.getUint32(0)===0x89504e47&&d.getUint32(4)===0x0d0a1a0a)return [d.getUint32(16),d.getUint32(20)];
    if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216){
      let i=2;while(i+8<bytes.length){if(bytes[i++]!==255)throw Error('Invalid JPEG');const marker=bytes[i++];if(marker===216||marker===1||marker>=208&&marker<=215)continue;const n=d.getUint16(i);if(n<2||i+n>bytes.length)break;
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [d.getUint16(i+5),d.getUint16(i+3)];i+=n;}
    }
    throw Error('Unsupported image');
  },
  validateGLB(data,high){
    const d=new DataView(data);if(d.byteLength<28||d.byteLength>3*1024*1024||d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==d.byteLength)throw Error('Invalid GLB');
    const size=d.getUint32(12,true);if(d.getUint32(16,true)!==0x4e4f534a||size%4||size+28>d.byteLength)throw Error('Invalid GLB JSON');
    const json=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,size))),offset=28+size;
    if(d.getUint32(24+size,true)!==0x004e4942||d.getUint32(20+size,true)+offset!==data.byteLength||!json.asset||json.asset.version!=='2.0')throw Error('Invalid GLB buffer');
    if(!Array.isArray(json.buffers)||json.buffers.length!==1||json.buffers[0].uri||json.buffers[0].byteLength>data.byteLength-offset)throw Error('External or invalid buffer');
    if((json.nodes||[]).length>512||(json.meshes||[]).length>128||(json.accessors||[]).length>1024||(json.images||[]).length>16||(json.accessors||[]).some(a=>!Number.isSafeInteger(a.count)||a.count<0||a.count>1000000))throw Error('Asset is too complex');
    let decoded=0;for(const a of json.accessors||[]){
      const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}[a.type],bytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType];if(!n||!bytes)throw Error('Invalid accessor');decoded+=a.count*n*bytes;
      if(a.bufferView!==undefined){const v=(json.bufferViews||[])[a.bufferView],stride=v&&(v.byteStride||n*bytes),at=a.byteOffset||0;
        if(!v||!Number.isSafeInteger(stride)||stride<n*bytes||!Number.isSafeInteger(at)||at<0||at+(a.count?(a.count-1)*stride+n*bytes:0)>v.byteLength)throw Error('Accessor exceeds its buffer view');}
    }
    if((json.extensionsRequired||[]).some(e=>!['KHR_materials_unlit','KHR_texture_transform','KHR_mesh_quantization'].includes(e)))throw Error('Unsupported required extension');
    for(const v of json.bufferViews||[])if(v.buffer!==0||!Number.isSafeInteger(v.byteLength)||v.byteLength<0||!Number.isSafeInteger(v.byteOffset||0)||(v.byteOffset||0)<0||(v.byteOffset||0)+v.byteLength>data.byteLength-offset)throw Error('Invalid buffer view');
    for(const image of json.images||[]){
      if(image.uri||!Number.isInteger(image.bufferView))throw Error('External image');const v=json.bufferViews[image.bufferView];if(!v||v.byteLength>2*1024*1024)throw Error('Missing or oversized image');
      const [w,h]=this.imageSize(new Uint8Array(data,offset+(v.byteOffset||0),v.byteLength),image.mimeType),limit=high?2048:1024;
      if(!w||!h||w>limit||h>limit)throw Error('Image is over budget');
      decoded+=w*h*4;
    }
    if(decoded>(high?64:16)*1024*1024)throw Error('Decoded asset is over budget');return decoded;
  },
  async read(url,limit,signal,fetcher,progress){
    const r=await fetcher(url,{signal,credentials:'same-origin',redirect:'error'});if(!r.ok||Number(r.headers.get('content-length'))>limit)throw Error('Asset could not load');
    if(!r.body||!r.body.getReader){const b=await r.arrayBuffer();if(b.byteLength>limit)throw Error('Asset is over budget');return b;}
    const reader=r.body.getReader(),chunks=[];let size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit)throw Error('Asset is over budget');chunks.push(part.value);if(progress)progress(size);}}
    finally{if(size>limit)await reader.cancel();reader.releaseLock();}
    const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes.buffer;
  },
  loader(){
    if(THREE.GLTFLoader)return Promise.resolve();if(this._loader)return this._loader;
    this._loader=new Promise((resolve,reject)=>{const s=document.createElement('script');let timer;
      const done=error=>{clearTimeout(timer);s.onload=s.onerror=null;if(error){s.remove();this._loader=null;reject(error);}else resolve();};
      s.src='lib/GLTFLoader.min.js';s.onload=()=>done(THREE.GLTFLoader?null:Error('Missing glTF loader'));s.onerror=()=>done(Error('Missing glTF loader'));timer=setTimeout(()=>done(Error('Loader timed out')),4000);document.head.appendChild(s);
    });return this._loader;
  },
  release(gltf){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    if(gltf&&gltf.scene)gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){materials.add(m);for(const t of Object.values(m))if(t&&t.isTexture)textures.add(t);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{if(t.image&&t.image.close)t.image.close();t.dispose();});
  },
  async preload(options={}){
    const F=this,T=THREE,high=!!options.high,controller=new AbortController(),signal=controller.signal,models=new Map(),textures=new Map(),audio=new Map();let closed=false;
    const bank={models,textures,audio,stats:{quality:high?'high':'low',loaded:0,failed:0,fallbacks:0,bytes:0,decodedBytes:0,errors:[]},
      add(parent,use,placements){
        const model=models.get(use);if(closed||!model||model.animated||!placements.length||placements.length>512)return null;
        const group=new T.Group();group.name='asset:'+use;group.userData.batches=[];
        for(const part of model.parts){
          const mesh=new T.InstancedMesh(part.geometry,part.material,placements.length),entries=[];
          for(let i=0;i<placements.length;i++){
            const p=placements[i],matrix=new T.Matrix4().compose(new T.Vector3(p.x,p.y||0,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw||0),new T.Vector3(p.w/model.size.x,p.h/model.size.y,p.d/model.size.z)).multiply(model.origin).multiply(part.matrix);
            mesh.setMatrixAt(i,matrix);entries.push({matrix,x:p.x,z:p.z});
          }
          mesh.userData.fpAsset=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);group.userData.batches.push({mesh,entries});
        }
        parent.add(group);return group;
      },
      cull(group,x,z,radius){for(const {mesh,entries} of group.userData.batches){let count=0;for(const e of entries)if((e.x-x)**2+(e.z-z)**2<radius*radius)mesh.setMatrixAt(count++,e.matrix);mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;}},
      dispose(){if(closed)return;closed=true;for(const m of models.values())F.release(m.gltf);for(const t of textures.values()){if(t.image&&t.image.close)t.image.close();t.dispose();}models.clear();textures.clear();audio.clear();}
    };
    const abort=()=>controller.abort(),timer=setTimeout(abort,options.timeout||6000),fetcher=options.fetch||((url,init)=>fetch(url,init));
    if(options.signal){if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});}
    const fractions=[];let total=1;
    const progress=()=>{if(!closed&&!signal.aborted&&options.progress)options.progress(fractions.reduce((a,b)=>a+b,0)/total);};
    const untilAbort=promise=>new Promise((resolve,reject)=>{const stop=()=>reject(Error('Asset loading cancelled'));signal.addEventListener('abort',stop,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));if(signal.aborted)stop();});
    try{
      progress();const manifest=JSON.parse(new TextDecoder().decode(await F.read('assets/3d/manifest.json',256*1024,signal,fetcher)));
      if(manifest.version!==1)throw Error('Unsupported asset manifest');const jobs=F.manifest(manifest.files,high);total=Math.max(1,jobs.length);fractions.length=jobs.length;fractions.fill(0);progress();let index=0;
      // Overlap the required local script with model transfer; workers keep their normal await and retry.
      if(!signal.aborted&&jobs.some(job=>job.candidates.some(f=>f.ext==='glb')))Promise.resolve().then(()=>F.loader()).catch(()=>{});
      const worker=async()=>{while(index<jobs.length&&!signal.aborted){const at=index++,job=jobs[at];let loaded=false;
        for(const f of job.candidates){try{
          if(signal.aborted)break;
          const data=await F.read('assets/3d/'+f.path,f.bytes,signal,fetcher,n=>{fractions[at]=Math.max(fractions[at],Math.min(.95,n/f.bytes*.95));progress();});if(data.byteLength!==f.bytes)throw Error('Asset byte count changed');bank.stats.bytes+=data.byteLength;
          if(f.ext==='glb'){
            const decoded=F.validateGLB(data,high);if(bank.stats.decodedBytes+decoded>(high?64:16)*1024*1024)throw Error('Decoded assets are over budget');bank.stats.decodedBytes+=decoded;await untilAbort(F.loader());
            const gltf=await untilAbort(new T.GLTFLoader().parseAsync(data,'').then(g=>{if(signal.aborted||closed)F.release(g);return g;}));
            try{gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),parts=[];
              const ambient=['ambient-adult-a','ambient-adult-b'].includes(job.use);
              gltf.scene.traverse(o=>{if(o.isMesh){if(o.isInstancedMesh||Array.isArray(o.material)||o.isSkinnedMesh&&!ambient&&!['worker-men','worker-women','resident-men','resident-women'].includes(job.use))throw Error('Model needs an animated adapter');parts.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone(),name:o.name});}});
              if(!parts.length||parts.length>32||![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>.0001))throw Error('Invalid model bounds');
              if(['worker-men','worker-women','resident-men','resident-women'].includes(job.use)){const clips=new Set(gltf.animations.map(a=>a.name));if(!['Idle_Neutral','Walk','Wave','Interact'].every(n=>clips.has(n))||parts.some(p=>!p.geometry.attributes.skinIndex||!p.geometry.attributes.skinWeight||!p.geometry.attributes.normal||p.material.map))throw Error('Invalid workday rig');let invalid=false;gltf.scene.traverse(o=>{if(o.isSkinnedMesh&&(!o.skeleton||o.skeleton.bones.length>64))invalid=true;});if(invalid)throw Error('Workday rig is over budget');}
              if(ambient){
                const clips=new Set(gltf.animations.map(a=>a.name));let invalid=!high||parts.length!==2||gltf.animations.length!==2||!clips.has('Idle_Neutral')||!clips.has('Walk');
                gltf.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,a=g.attributes,j=a.skinIndex,w=a.skinWeight,n=a.normal,c=a.color,p=a.position,bones=o.skeleton&&o.skeleton.bones.length;
                  if(!o.isSkinnedMesh||!bones||bones>7||!j||j.itemSize!==4||!w||w.itemSize!==4||!n||!c||c.itemSize!==3||o.material.map||p.count>10000||[j,w,n,c].some(v=>v.count!==p.count)){invalid=true;return;}
                  for(let i=0;i<p.count;i++){let sum=0;for(let k=0;k<4;k++){const bone=j.array[i*4+k],weight=w.array[i*4+k];if(!Number.isInteger(bone)||bone<0||bone>=bones||!Number.isFinite(weight)||weight<0||weight>1)invalid=true;sum+=weight;}if(Math.abs(sum-1)>.001)invalid=true;
                    for(let k=0;k<3;k++)if(!Number.isFinite(p.array[i*3+k])||!Number.isFinite(n.array[i*3+k])||!Number.isFinite(c.array[i*3+k])||c.array[i*3+k]<0||c.array[i*3+k]>1)invalid=true;
                  }
                });if(invalid)throw Error('Invalid ambient rig');
              }
              if(job.use==='van-exterior'&&(!['body','door','wheel-front-left','wheel-front-right','wheel-back-left','wheel-back-right'].every(n=>parts.some(p=>p.name===n))||parts.some(p=>p.material.map)))throw Error('Invalid van parts');
              if(signal.aborted||closed)throw Error('Asset loading cancelled');models.set(job.use,{gltf,parts,size,ambient,animated:parts.some(p=>p.geometry.attributes.skinIndex),origin:new T.Matrix4().makeTranslation(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2)});
            }catch(error){F.release(gltf);throw error;}
          }else if(['png','jpg','jpeg'].includes(f.ext)){
            const mime=f.ext==='png'?'image/png':'image/jpeg',[w,h]=F.imageSize(new Uint8Array(data),mime),limit=high?2048:1024;if(!w||!h||w>limit||h>limit)throw Error('Image is over budget');
            if(bank.stats.decodedBytes+w*h*4>(high?64:16)*1024*1024)throw Error('Decoded assets are over budget');bank.stats.decodedBytes+=w*h*4;
            const image=await untilAbort(createImageBitmap(new Blob([data],{type:mime}),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'}).then(i=>{if(signal.aborted||closed)i.close();return i;}));const t=new T.Texture(image);t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;textures.set(job.use,t);
          }else{if(bank.stats.decodedBytes+data.byteLength>(high?64:16)*1024*1024)throw Error('Decoded assets are over budget');bank.stats.decodedBytes+=data.byteLength;audio.set(job.use,data);}
          loaded=true;bank.stats.loaded++;if(f!==job.candidates[0])bank.stats.fallbacks++;break;
        }catch(error){bank.stats.errors.push({path:f.path,reason:String(error.message).slice(0,200)});}}
        if(!loaded)bank.stats.failed++;fractions[at]=1;progress();
      }};
      await Promise.all([worker(),worker()]);
    }catch(error){bank.stats.failed++;bank.stats.errors.push({path:'manifest',reason:String(error.message).slice(0,200)});}
    finally{clearTimeout(timer);if(options.signal)options.signal.removeEventListener('abort',abort);if(options.progress&&!closed&&!options.signal?.aborted)options.progress(1);}
    if(options.signal?.aborted)bank.dispose();return bank;
  }
};
