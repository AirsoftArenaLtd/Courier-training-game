/* Rebuild the classic-script loader from the matching upstream r158 sources. See lib/GLTFLoader.SOURCE.md. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const [loaderPath,utilsPath]=process.argv.slice(2);
if(!loaderPath||!utilsPath)throw Error('Pass the upstream GLTFLoader.js and BufferGeometryUtils.js paths.');
const loader=fs.readFileSync(loaderPath,'utf8'),utils=fs.readFileSync(utilsPath,'utf8');
for(const [source,expected] of [[loader,'b85db4109434f8eb1d1d51c5d46ce3fa2df01819f141ad395f7be5cc44529151'],[utils,'9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb']])if(crypto.createHash('sha256').update(source).digest('hex')!==expected)throw Error('The upstream source differs from pinned r158.');
const imports=loader.match(/^import \{([\s\S]*?)\} from 'three';/);
if(!imports||!loader.endsWith('export { GLTFLoader };\n'))throw Error('Unexpected upstream loader format.');
const begin=utils.indexOf('function toTrianglesDrawMode('),end=utils.indexOf('\n}\n',begin)+3;
if(begin<0||end<3)throw Error('Missing upstream triangle conversion helper.');
const body=loader.replace(imports[0],'').replace("import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';",'').replace('export { GLTFLoader };','THREE.GLTFLoader = GLTFLoader;');
const source='/*! Three.js r158 GLTFLoader; MIT, see three.LICENSE and GLTFLoader.SOURCE.md. */\n(()=>{const {'+imports[1]+',TrianglesDrawMode}=THREE;\n'+utils.slice(begin,end)+'\n'+body+'\n})();';
const output=cp.execFileSync('npm',['exec','--cache',process.env.OTR_VENDOR_CACHE||'/tmp/otr-vendor-cache','--yes','--package=esbuild@0.25.12','--','esbuild','--minify','--charset=ascii','--legal-comments=inline'],{input:source,stdio:['pipe','pipe','inherit']});
fs.writeFileSync(path.resolve(__dirname,'../../lib/GLTFLoader.min.js'),output);
for(const file of [loaderPath,utilsPath])console.log(path.basename(file),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
