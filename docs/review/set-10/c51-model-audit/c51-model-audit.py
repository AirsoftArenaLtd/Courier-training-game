from pathlib import Path
import subprocess,zipfile,io,json,struct,hashlib,datetime
root=Path('/workspace/c50-physical-signs');commit='6061a244faafe821da11feb3b041129f60f72b12';report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'uploadCommit':commit,'status':'Read-only preparation for C-51; no asset shipped or actor placed.','packs':[]}
report['runtimeSourceSHA256']={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['src/core/fpassets.js','src/core/fpactors.js','src/core/fptown.js']}
report['implementationConstraints']=[
 'The current loader permits skinned meshes only for the four existing worker/resident roles and requires colour-only materials. A new ambient adapter must preserve those guards, bake the Mini Characters palette to vertex colours offline while retaining skin weights/normals, and validate the ambient rig separately.',
 'The actor presentation initially requests Idle_Neutral, while Mini Characters use lowercase idle/walk/sit. Rename or explicitly alias retained clips before calling the current character helper; an unknown initial clip can leave no active action.',
 'The manifest already supports High-only records. Keep additional imported models out of Low requests, preserve the procedural fallback, and stay at four High GPU textures.',
 'The combined delivery-and-damage Low town bucket is only 60 triangles, not 290. An 88-triangle person cannot be reserved solely from that bucket. Target a closed Low silhouette of at most 48 triangles, or win additional measured triangles elsewhere; prove the combined loaded/fallback CPU sweep and fpbench before review. The old sweep peak 2,492/2,500 is not new-person evidence.',
 'Keep ambient actors off roads, public walking corridors, all delivery approaches and rendered buildings/props, inside existing non-delivery-lot solids. Preserve contacted-resident, crossing, cyclist and courier controllers, scoring, saves and first-day obligations.'
]
for pack in ['kenney_furniture-kit.zip','kenney_mini-characters.zip']:
 blob=subprocess.check_output(['git','show',commit+':assets/_incoming/'+pack],cwd=root);z=zipfile.ZipFile(io.BytesIO(blob));lic=z.read('License.txt');models=[]
 names=[n for n in z.namelist() if n.lower().endswith('.glb') and ('mini-characters' in pack or n.endswith('/bench.glb'))]
 for name in names:
  b=z.read(name);magic,version,length=struct.unpack_from('<III',b);assert magic==0x46546c67 and version==2 and length==len(b);chunk_len,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a;g=json.loads(b[20:20+chunk_len]);tri=0
  for mesh in g.get('meshes',[]):
   for prim in mesh['primitives']:
    count=g['accessors'][prim['indices'] if 'indices' in prim else prim['attributes']['POSITION']]['count'];mode=prim.get('mode',4);tri+=count//3 if mode==4 else max(0,count-2) if mode in [5,6] else 0
  models.append({'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'triangles':tri,'meshes':len(g.get('meshes',[])),'primitives':sum(len(m['primitives']) for m in g.get('meshes',[])),'skins':len(g.get('skins',[])),'maxSkinJoints':max([len(s['joints']) for s in g.get('skins',[])],default=0),'animations':[a.get('name','') for a in g.get('animations',[])],'images':len(g.get('images',[])),'externalImages':[i['uri'] for i in g.get('images',[]) if i.get('uri') and not i['uri'].startswith('data:')]})
 report['packs'].append({'pack':pack,'archiveBytes':len(blob),'archiveSHA256':hashlib.sha256(blob).hexdigest(),'licenceFile':'License.txt','licenceSHA256':hashlib.sha256(lic).hexdigest(),'licenceText':lic.decode('utf-8-sig'),'models':models})
Path('/tmp/c51-model-audit.json').write_text(json.dumps(report,indent=2)+'\n')
for p in report['packs']:
 print(p['pack'],len(p['models']),'models; animation counts',sorted(set(len(m['animations']) for m in p['models'])),'triangle range',min(m['triangles'] for m in p['models']),max(m['triangles'] for m in p['models']))
