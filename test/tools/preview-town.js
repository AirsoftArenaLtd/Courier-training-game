/* Offline source-detail contact sheet; no game scene, saves or manifest are modified. */
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('../node_modules/puppeteer-core');
const [base,prepared,output]=process.argv.slice(2);
if(!base||!prepared||!output)throw Error('Pass the checkout HTTP URL, prepared asset directory and screenshot path.');
(async()=>{
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage();await page.setViewport({width:1120,height:640,deviceScaleFactor:1});
await page.setContent('<html><body style="margin:0;background:#c0cdd5;font:16px sans-serif"><canvas></canvas><div id="labels"></div></body></html>');
await page.addScriptTag({url:base.replace(/\/$/,'')+'/lib/three.min.js'});await page.addScriptTag({url:base.replace(/\/$/,'')+'/lib/GLTFLoader.min.js'});
const root=path.resolve(prepared),files=JSON.parse(fs.readFileSync(root+'/manifest.json')).files;
const info=await page.evaluate(async files=>{
 const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(1120,640);renderer.setScissorTest(true);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const out=[];
 for(let i=0;i<files.length;i++){
  const file=files[i],bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0)),gltf=await new THREE.GLTFLoader().parseAsync(bytes.buffer,'');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c0cdd5');scene.add(new THREE.AmbientLight(0xffffff,1.5));const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(3,6,4);scene.add(sun);
  const b=new THREE.Box3().setFromObject(gltf.scene),size=b.getSize(new THREE.Vector3()),scale=2/Math.max(size.x,size.y,size.z),center=b.getCenter(new THREE.Vector3());gltf.scene.scale.setScalar(scale);gltf.scene.position.copy(center.multiplyScalar(-scale));scene.add(gltf.scene);
  const camera=new THREE.PerspectiveCamera(35,280/280,.1,30);camera.position.set(3,2.1,3);camera.lookAt(0,0,0);
  const x=i%4*280,y=Math.floor(i/4)*320;
  renderer.setViewport(x,640-y-285,280,280);renderer.setScissor(x,640-y-285,280,280);renderer.render(scene,camera);
  const label=document.createElement('div');label.style.cssText=`position:absolute;left:${x}px;top:${y+286}px;width:280px;text-align:center`;label.textContent=file.use;document.querySelector('#labels').append(label);out.push({use:file.use,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
 }
 return {models:out,glError:renderer.getContext().getError(),textures:renderer.info.memory.textures};
},files.map(f=>({...f,data:fs.readFileSync(root+'/'+f.path).toString('base64')})));
if(info.glError||info.textures)throw Error(JSON.stringify(info));
await page.screenshot({path:output});console.log(JSON.stringify(info));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
