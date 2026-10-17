"""Rebuild C-28 assets outside the game. Requires Node, Pillow and test dependencies.
Usage: python3 test/tools/prepare-actors-runtime.py CAR_KIT_ZIP CHARACTER_ZIP_DIRECTORY OUTPUT
"""
import hashlib,importlib.util,json,subprocess,sys
from pathlib import Path
from zipfile import ZipFile
sys.dont_write_bytecode=True
folder=Path(__file__).parent

def module(name,file):
    s=importlib.util.spec_from_file_location(name,folder/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
A=module('actors','prepare-actors.py');V=module('van','prepare-van.py')

def prepare(car,characters,destination):
    A.prepare(car,characters,destination)
    hashes={}
    with ZipFile(car) as z:hashes['van-exterior']=hashlib.sha256(z.read('Models/GLB format/delivery.glb')).hexdigest()
    for archive in characters.glob('*.zip'):
        kind='women' if 'Women' in archive.name else 'men'
        with ZipFile(archive) as z:
            for role,source in [('worker','Worker'),('resident','Casual' if kind=='women' else 'Casual_2')]:
                raw=z.read(next(n for n in z.namelist() if n.endswith('/glTF/'+source+'.gltf')));target=destination/('quaternius-modular-'+kind)/'models'/(role+'-high.glb');target.write_bytes(A.worker(raw));hashes[role+'-'+kind]=hashlib.sha256(raw).hexdigest()
    subprocess.run(['node',str(folder/'prepare-actor-lods.js'),str(destination)],check=True)
    for p in destination.glob('quaternius*/models/*-low.gltf'):p.with_suffix('.glb').write_bytes(A.worker(p.read_bytes()));p.unlink()
    V.prepare(car,destination/'kenney-car-kit/models')
    files=[]
    for pack,names in [('kenney-car-kit',[('delivery','van-exterior')]),('quaternius-modular-men',[('worker','worker-men'),('resident','resident-men')]),('quaternius-modular-women',[('worker','worker-women'),('resident','resident-women')])]:
        source=destination/pack/'SOURCE.md';text='# C-28 converted '+pack+'\n\nAuthor: '+('Kenney' if pack.startswith('kenney') else 'Quaternius')+'. Licence: CC0.\nSource: '+('https://kenney.nl/assets/car-kit' if pack.startswith('kenney') else 'https://quaternius.com/')+'\nDownloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`. Original author licence retained byte for byte.\n\nThe van retains semantic door and wheel parts with baked palette colours. Workers use Worker; residents use Casual (women) and Casual_2 (men). Character Low keeps the source rig and four workday clips with an 88-triangle silhouette. High keeps source geometry. The game CPU-poses one ordinary mesh per visible actor; no bone texture.\n'
        for name,use in names:
            text+=f'\nSource model {use} SHA-256: `{hashes[use]}`.\n'
            for q in ['low','high']:
                p=destination/pack/'models'/(name+'-'+q+'.glb');data=p.read_bytes();files.append({'path':str(p.relative_to(destination)),'bytes':len(data),'pack':pack,'quality':q,'use':use});text+=f'\n`models/{p.name}`: {len(data)} bytes, SHA-256 `{hashlib.sha256(data).hexdigest()}`.\n'
        source.write_text(text)
    (destination/'manifest.json').write_text(json.dumps({'version':1,'files':files},indent=2)+'\n');return files
if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit(__doc__)
    files=prepare(*map(Path,sys.argv[1:]));print(f'Prepared {len(files)} runtime variants, {sum(f["bytes"] for f in files):,} bytes.')
