"""Audit the O-3 archives without shipping them: python3 test/tools/audit-owner-assets.py INCOMING OUTPUT_JSON."""
import datetime,hashlib,json,re,struct,subprocess,sys
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
from io import BytesIO
ROOT=Path(__file__).resolve().parents[2]
def digest(raw):return hashlib.sha256(raw).hexdigest()
def glb(raw):return json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
def audit(incoming):
 manifest=json.loads((ROOT/'assets/3d/manifest.json').read_text());files=manifest['files'];rows=[]
 mapping={'kenney_car-kit.zip':'kenney-car-kit','kenney_city-kit-commercial_2.1.zip':'kenney-city-commercial','kenney_city-kit-roads.zip':'kenney-city-roads','kenney_city-kit-suburban_20.zip':'kenney-city-suburban','kenney_furniture-kit.zip':'kenney-furniture-kit','kenney_mini-characters.zip':None,'asphalt_pit_lane_1k.zip':'polyhaven-asphalt-pit-lane','concrete_pavement_1k.zip':'polyhaven-concrete-pavement','grass_ground_1k.zip':'polyhaven-grass-ground','plastered_wall_1k.zip':'polyhaven-plastered-wall','red_brick_03_1k.zip':'polyhaven-red-brick-03'}
 consumers={'kenney-car-kit':['src/core/fptown.js','src/core/fpactors.js'],'kenney-city-commercial':['src/core/fptown.js'],'kenney-city-roads':['src/core/fptown.js'],'kenney-city-suburban':['src/core/fptown.js'],'kenney-furniture-kit':['src/core/fpworld.js'],'quaternius-modular-men':['src/core/fpactors.js'],'quaternius-modular-women':['src/core/fpactors.js']}
 for archive in sorted(incoming.glob('*.zip')):
  pack=('quaternius-modular-men' if archive.name.startswith('Ultimate Modular Men') else 'quaternius-modular-women') if archive.name.startswith('Ultimate Modular') else mapping[archive.name]
  raw=archive.read_bytes();row={'archive':archive.name,'bytes':len(raw),'sha256':digest(raw),'pack':pack}
  with ZipFile(BytesIO(raw)) as z:
   row['members']=len(z.namelist());licences=[n for n in z.namelist() if n.lower().endswith(('license.txt','licence.txt'))];row['archiveLicences']=[{'path':n,'sha256':digest(z.read(n))} for n in licences]
   if pack:
    folder=Path('assets/3d')/pack;source=(ROOT/folder/'SOURCE.md').read_text();licence=(ROOT/folder/'LICENSE.txt').read_bytes();row.update(status='used',sourceNote=str(folder/'SOURCE.md'),sourceNoteSha256=digest(source.encode()),licenceSha256=digest(licence),licenceMatchesArchive=any(a['sha256']==digest(licence) for a in row['archiveLicences']),manifestUses=sorted({f['use'] for f in files if f['pack']==pack}),shippedFiles=[f['path'] for f in files if f['pack']==pack],consumers=consumers.get(pack,['src/core/fpmaterials.js']),archiveHashInSourceNote=row['sha256'] in source)
    if licences:assert row['licenceMatchesArchive'],archive.name
    else:assert pack.startswith('polyhaven-') and 'CC0' in licence.decode() and 'polyhaven.com/license' in source,archive.name
    if pack.startswith('quaternius-'):
     recorded=set(re.findall(r'`([0-9a-f]{64})`',source));matches=[]
     for n in z.namelist():
      if n.lower().endswith('.gltf'):
       h=digest(z.read(n))
       if h in recorded:matches.append({'path':n,'sha256':h})
     row['sourceModelMatches']=matches;assert len(matches)>=2,pack
   else:
    models=[]
    for n in z.namelist():
     if n.startswith('Models/GLB format/') and n.endswith('.glb'):
      b=z.read(n);d=glb(b);models.append({'path':n,'bytes':len(b),'sha256':digest(b),'skins':len(d.get('skins',[])),'animations':[a.get('name') for a in d.get('animations',[])]})
    row.update(status='deferred',reason='The current workday roles use the uploaded Quaternius workers/residents and their four validated interaction clips. Mini Characters contains12 animated bodies with two skins and32 clips each, plus14 separate aids/accessories. A new body/clip adapter and a concrete interaction consumer need their own performance/visibility proof; no duplicate body or unused accessory is shipped by this import.',models=models)
    assert len(models)==26 and sum(bool(m['animations']) for m in models)==12
  rows.append(row)
 assets=[]
 for f in files:
  p=ROOT/'assets/3d'/f['path'];raw=p.read_bytes();assert len(raw)==f['bytes'];a={**f,'sha256':digest(raw)}
  if p.suffix=='.glb':
   d=glb(raw);a.update(primitives=sum(len(m['primitives']) for m in d['meshes']),triangles=sum(d['accessors'][q['indices'] if 'indices' in q else q['attributes']['POSITION']]['count']//3 for m in d['meshes'] for q in m['primitives']),externalUris=[o['uri'] for k in ['buffers','images'] for o in d.get(k,[]) if o.get('uri') and not o['uri'].startswith('data:')]);assert not a['externalUris'],f['path']
  elif p.suffix in ['.jpg','.png']:a['dimensions']=list(Image.open(BytesIO(raw)).size)
  assets.append(a)
 report={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'incomingRef':'origin/owner/o3-assets','incomingCommit':subprocess.check_output(['git','rev-parse','origin/owner/o3-assets'],cwd=ROOT).decode().strip(),'baseBranch':'origin/codex/c49-materials','baseCommit':'8d2b096a','archiveCount':len(rows),'usedOwnerPacks':sum(r['status']=='used' for r in rows),'deferredOwnerPacks':sum(r['status']=='deferred' for r in rows),'additionalPreviouslyBundledPack':'kenney-city-starter from its official GitHub source, outside the13 owner archives','manifestSha256':digest((ROOT/'assets/3d/manifest.json').read_bytes()),'manifestFiles':len(files),'manifestPacks':len({f['pack'] for f in files}),'totalShippedBytes':sum(f['bytes'] for f in files),'lowSelectedBytes':sum(f['bytes'] for f in files if f['quality'] in ['low','both']),'ceilingsBytes':{'total':40*1024**2,'low':15*1024**2,'oneModel':3*1024**2,'oneTexture':2*1024**2},'archives':rows,'assets':assets,'consumerSources':{p:digest((ROOT/p).read_bytes()) for p in sorted({p for r in rows for p in r.get('consumers',[])})},'deploymentScope':'This branch stacks on unmerged C49. It does not certify that pilot or the existing owner preview contains these materials/desks.','rawArchivesShipped':False}
 assert report['archiveCount']==13 and report['usedOwnerPacks']==12 and report['deferredOwnerPacks']==1
 return report
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit(__doc__)
 result=audit(Path(sys.argv[1]));Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print({k:result[k] for k in ['archiveCount','usedOwnerPacks','deferredOwnerPacks','manifestFiles','manifestPacks','totalShippedBytes','lowSelectedBytes']})
