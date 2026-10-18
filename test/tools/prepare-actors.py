"""Prepare the owner's CC0 delivery van and two rigged workers outside the game.
Usage: python3 test/tools/prepare-actors.py CAR_KIT_ZIP CHARACTER_ZIP_DIRECTORY OUTPUT
The C-28 runtime/Low adapter is deliberately separate; these are source-detail exports.
"""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('town', Path(__file__).with_name('prepare-town.py'))
town = importlib.util.module_from_spec(spec);spec.loader.exec_module(town)
CLIPS = {'Idle_Neutral', 'Walk', 'Wave', 'Interact'}


def glb(document, binary):
    text = json.dumps(document, separators=(',', ':')).encode();text += b' '*(-len(text) % 4)
    binary += b'\0'*(-len(binary) % 4)
    return struct.pack('<5I', 0x46546c67, 2, 28+len(text)+len(binary), len(text), 0x4e4f534a)+text+struct.pack('<2I', len(binary), 0x004e4942)+binary


def worker(raw):
    doc = json.loads(raw)
    if len(doc.get('buffers', [])) != 1 or doc.get('images') or doc.get('textures'):
        raise ValueError('Worker preparation expects one embedded buffer and colour-only materials')
    uri = doc['buffers'][0].get('uri', '')
    prefix = 'data:application/octet-stream;base64,'
    if not uri.startswith(prefix):
        raise ValueError('External source buffers are not permitted')
    source = base64.b64decode(uri[len(prefix):], validate=True)
    if len(source) != doc['buffers'][0]['byteLength']:
        raise ValueError('Source buffer byte count changed')
    doc['animations'] = [a for a in doc.get('animations', []) if a.get('name') in CLIPS]
    if {a['name'] for a in doc['animations']} != CLIPS:
        raise ValueError('The source must supply all four workday clips')
    used = set()
    for mesh in doc.get('meshes', []):
        for part in mesh['primitives']:
            used.update(part['attributes'].values())
            if 'indices' in part:used.add(part['indices'])
            for target in part.get('targets', []):used.update(target.values())
    for skin in doc.get('skins', []):
        if 'inverseBindMatrices' in skin:used.add(skin['inverseBindMatrices'])
    for animation in doc['animations']:
        for sampler in animation['samplers']:used.update([sampler['input'], sampler['output']])
    accessors = [doc['accessors'][i] for i in sorted(used)]
    if any(a.get('sparse') for a in accessors):
        raise ValueError('Expand sparse accessors before conversion')
    remap = {old:new for new,old in enumerate(sorted(used))}
    views = sorted({a['bufferView'] for a in accessors})
    view_remap = {old:new for new,old in enumerate(views)}
    output = bytearray();new_views = []
    for index in views:
        view = dict(doc['bufferViews'][index]);at = view.get('byteOffset', 0);length = view['byteLength']
        if view.get('buffer', 0) != 0 or at < 0 or at+length > len(source):
            raise ValueError('Source buffer view is out of range')
        output.extend(b'\0'*(-len(output) % 4));view['byteOffset'] = len(output);view['buffer'] = 0
        output.extend(source[at:at+length]);new_views.append(view)
    for a in accessors:a['bufferView'] = view_remap[a['bufferView']]
    for mesh in doc.get('meshes', []):
        for part in mesh['primitives']:
            part['attributes'] = {key:remap[value] for key,value in part['attributes'].items()}
            if 'indices' in part:part['indices'] = remap[part['indices']]
            for target in part.get('targets', []):
                for key in target:target[key] = remap[target[key]]
    for skin in doc.get('skins', []):
        if 'inverseBindMatrices' in skin:skin['inverseBindMatrices'] = remap[skin['inverseBindMatrices']]
    for animation in doc['animations']:
        for sampler in animation['samplers']:
            for key in ['input','output']:sampler[key] = remap[sampler[key]]
    doc['accessors'] = accessors;doc['bufferViews'] = new_views;doc['buffers'] = [{'byteLength': len(output)}]
    return glb(doc, bytes(output))


def prepare(car, characters, destination):
    from PIL import Image
    import io
    files = []
    with ZipFile(car) as z:
        raw = z.read('Models/GLB format/delivery.glb');palette = z.read('Models/GLB format/Textures/colormap.png')
        data = town.encode(*town.flatten(raw, Image.open(io.BytesIO(palette))))
        records = [('kenney-car-kit','delivery-high.glb','van-exterior',data,z.read('License.txt'),raw,'https://kenney.nl/assets/car-kit',[]) ]
    for archive in sorted(characters.glob('*.zip')):
        with ZipFile(archive) as z:
            name = next(n for n in z.namelist() if n.endswith('/glTF/Worker.gltf'))
            raw = z.read(name);licence = z.read(next(n for n in z.namelist() if n.endswith('/License.txt')))
            kind = 'women' if 'Women' in archive.name else 'men'
            records.append(('quaternius-modular-'+kind,'worker-high.glb','worker-'+kind,worker(raw),licence,raw,'https://quaternius.com/',sorted(CLIPS)))
    for pack,name,use,data,licence,raw,url,clips in records:
        if b'CC0' not in licence and b'Creative Commons Zero' not in licence:
            raise ValueError('The original author licence must explicitly state CC0')
        if len(data)>3*1024*1024:
            raise ValueError('The prepared model exceeds the asset policy')
        folder = destination/pack;target = folder/'models'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        (folder/'LICENSE.txt').write_bytes(licence)
        (folder/'SOURCE.md').write_text(f'# C-28 source preparation: {use}\n\nAuthor: '+('Kenney' if pack.startswith('kenney') else 'Quaternius')+f'. Licence: CC0.\nSource: {url}\nDownloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.\nSource model SHA-256: `{hashlib.sha256(raw).hexdigest()}`.\nOutput SHA-256: `{hashlib.sha256(data).hexdigest()}`.\nClips retained: '+(', '.join(clips) if clips else 'static van; original wheel transforms baked')+'.\n\nThese source-detail outputs are temporary preparation. The Low/runtime adapter, theme/livery, physical control/inspection integration and animation budget remain pending. Do not overwrite the shipped town pack source record with this preparation note.\n')
        files.append({'path': str(target.relative_to(destination)), 'bytes':len(data),'pack':pack,'quality':'high','use':use})
    (destination/'manifest.json').write_text(json.dumps({'version':1,'files':files},indent=2)+'\n')
    return files


if __name__ == '__main__':
    if len(sys.argv)!=4:raise SystemExit(__doc__)
    files = prepare(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]))
    print(f"Prepared {len(files)} source-detail models, {sum(f['bytes'] for f in files):,} bytes. C-28 remains in progress.")
