"""Prepare the owner's CC0 Mini Characters and Furniture Kit for C-51.

Usage: python3 test/tools/prepare-ambient.py MINI_ZIP FURNITURE_ZIP OUTPUT_3D
Requires Pillow. Raw archives never enter the shipped folder. Only two adult rigs,
their idle/walk clips, and the static bench are retained. Palette sampling follows
the glTF top-left image convention used by the existing town conversion.
"""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('town', Path(__file__).with_name('prepare-town.py'))
town = importlib.util.module_from_spec(spec)
spec.loader.exec_module(town)


def encode(doc, binary):
    doc['buffers'] = [{'byteLength': len(binary)}]
    text = json.dumps(doc, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return struct.pack('<5I', 0x46546c67, 2, 28+len(text)+len(binary), len(text), 0x4e4f534a)+text+struct.pack('<2I', len(binary), 0x004e4942)+binary


def compact(doc, source):
    """Remove unused clips, UVs and their bytes without altering the retained rig."""
    used = set()
    for mesh in doc['meshes']:
        for part in mesh['primitives']:
            used.update(part['attributes'].values())
            if 'indices' in part:
                used.add(part['indices'])
    for skin in doc['skins']:
        used.add(skin['inverseBindMatrices'])
    for clip in doc['animations']:
        for sampler in clip['samplers']:
            used.update([sampler['input'], sampler['output']])
    remap = {old: new for new, old in enumerate(sorted(used))}
    output = bytearray()
    accessors, views = [], []
    for index in sorted(used):
        item = doc['accessors'][index]
        if item.get('sparse') or item.get('normalized'):
            raise ValueError('Expand sparse/normalised data explicitly')
        values = town.accessor(doc, source, index)
        fmt = '<'+town.COMPONENTS[item['componentType']]*town.WIDTHS[item['type']]
        output.extend(b'\0' * (-len(output) % 4))
        at = len(output)
        for value in values:
            output.extend(struct.pack(fmt, *value))
        views.append({'buffer': 0, 'byteOffset': at, 'byteLength': len(output)-at})
        a = {k: copy.deepcopy(v) for k, v in item.items() if k not in ['bufferView', 'byteOffset']}
        a['bufferView'] = len(views)-1
        accessors.append(a)
    for mesh in doc['meshes']:
        for part in mesh['primitives']:
            part['attributes'] = {k: remap[v] for k, v in part['attributes'].items()}
            if 'indices' in part:
                part['indices'] = remap[part['indices']]
    for skin in doc['skins']:
        skin['inverseBindMatrices'] = remap[skin['inverseBindMatrices']]
    for clip in doc['animations']:
        for sampler in clip['samplers']:
            for key in ['input', 'output']:
                sampler[key] = remap[sampler[key]]
    doc['accessors'], doc['bufferViews'] = accessors, views
    return encode(doc, bytes(output))


def character(raw, image):
    doc, binary = town.read_glb(raw)
    if len(doc.get('skins', [])) != 2 or any(len(s['joints']) > 7 for s in doc['skins']):
        raise ValueError('Expected the supplied two-skin, seven-joint adult')
    names = {'idle': 'Idle_Neutral', 'walk': 'Walk'}
    clips = [c for c in doc.get('animations', []) if c.get('name') in names]
    if len(clips) != 2:
        raise ValueError('The source must contain idle and walk')
    for clip in clips:
        clip['name'] = names[clip['name']]
    doc['animations'] = clips
    pixels = image.convert('RGB')
    output = bytearray(binary)
    for mesh in doc['meshes']:
        for part in mesh['primitives']:
            attrs = part['attributes']
            if part.get('mode', 4) != 4 or not {'POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0', 'TEXCOORD_0'} <= attrs.keys() or part.get('targets'):
                raise ValueError('Unexpected adult primitive')
            material = doc['materials'][part['material']]
            pbr = material['pbrMetallicRoughness']
            texture = pbr['baseColorTexture']
            source_image = doc['images'][doc['textures'][texture['index']]['source']]
            transform = texture.get('extensions', {}).get('KHR_texture_transform', {})
            if source_image.get('uri') != 'Textures/colormap.png' or texture.get('texCoord', 0) != 0 or set(transform)-{'texCoord'} or transform.get('texCoord', 0) != 0 or material.get('alphaMode', 'OPAQUE') != 'OPAQUE':
                raise ValueError('Expected the untransformed, opaque pack palette')
            factor = pbr.get('baseColorFactor', [1, 1, 1, 1])
            if factor != [1, 1, 1, 1]:
                raise ValueError('Bake source material factors explicitly')
            uv = town.accessor(doc, binary, attrs['TEXCOORD_0'])
            output.extend(b'\0' * (-len(output) % 4))
            at = len(output)
            for u, v in uv:
                if not 0 <= u <= 1 or not 0 <= v <= 1:
                    raise ValueError('Expected clamped palette coordinates')
                x, y = min(pixels.width-1, int(u*pixels.width)), min(pixels.height-1, int(v*pixels.height))
                output.extend(struct.pack('<3f', *(town.linear(c) for c in pixels.getpixel((x, y)))))
            doc['bufferViews'].append({'buffer': 0, 'byteOffset': at, 'byteLength': len(output)-at})
            doc['accessors'].append({'bufferView': len(doc['bufferViews'])-1, 'componentType': 5126, 'count': len(uv), 'type': 'VEC3'})
            part['attributes'] = {k: v for k, v in attrs.items() if k in ['POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0']}
            part['attributes']['COLOR_0'] = len(doc['accessors'])-1
            part['material'] = 0
    doc['materials'] = [{'name': 'Baked source palette', 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}]
    for key in ['images', 'textures', 'samplers', 'extensionsUsed', 'extensionsRequired']:
        doc.pop(key, None)
    doc['asset']['generator'] = 'On The Route CC0 ambient conversion'
    return compact(doc, bytes(output))


def prepare(mini, furniture, destination):
    files, evidence = [], []
    for archive, pack, title, url, models in [
        (mini, 'kenney-mini-characters', 'Mini Characters 1.0', 'https://kenney.nl/assets/mini-characters', [('character-male-a', 'ambient-adult-a'), ('character-female-a', 'ambient-adult-b')]),
        (furniture, 'kenney-furniture-kit', 'Furniture Kit 2.0', 'https://kenney.nl/assets/furniture-kit', [('bench', 'town-bench')]),
    ]:
        with ZipFile(archive) as z:
            licence = z.read('License.txt')
            if b'CC0' not in licence:
                raise ValueError('The original licence must state CC0')
            folder = destination/pack
            (folder/'models').mkdir(parents=True, exist_ok=True)
            (folder/'LICENSE.txt').write_bytes(licence)
            records = []
            for name, use in models:
                source_path = ('Models/GLB format/' if pack == 'kenney-mini-characters' else 'Models/GLTF format/')+name+'.glb'
                raw = z.read(source_path)
                if pack == 'kenney-mini-characters':
                    data = character(raw, Image.open(io.BytesIO(z.read('Models/GLB format/Textures/colormap.png'))))
                else:
                    doc, _ = town.read_glb(raw)
                    if doc.get('images') or doc.get('skins') or doc.get('animations'):
                        raise ValueError('Expected the supplied static, colour-only bench')
                    data = raw
                if len(data) > 3*1024*1024:
                    raise ValueError('The prepared model exceeds the policy')
                path = folder/'models'/(name+'-high.glb')
                path.write_bytes(data)
                files.append({'path': str(path.relative_to(destination)), 'bytes': len(data), 'pack': pack, 'quality': 'high', 'use': use})
                records.append({'source': source_path, 'sourceSHA256': town.digest(raw), 'output': str(path.relative_to(folder)), 'outputSHA256': town.digest(data), 'bytes': len(data)})
            text = f'# {title}\n\nAuthor: Kenney. Licence: CC0.\nSource: {url}\nUploaded by the owner on 17 October 2026 in commit `6061a244faafe821da11feb3b041129f60f72b12`; prepared on 22 October 2026.\nOriginal author licence retained byte for byte.\n\n'
            text += 'High only. Adult meshes retain source positions, normals, indices, joints, weights and inverse bind matrices. Palette colours are sampled offline into linear RGB vertices; UVs/images and all clips except idle/walk are removed. The two clips are renamed Idle_Neutral/Walk. No runtime image, bone texture or external fetch. The bench is the unchanged source GLB.\n\nReproduce with `python3 test/tools/prepare-ambient.py MINI_ZIP FURNITURE_ZIP OUTPUT_3D`.\n'
            for rec in records:
                text += f'\nSource `{rec["source"]}` SHA-256: `{rec["sourceSHA256"]}`.\nOutput `{rec["output"]}`: {rec["bytes"]} bytes; SHA-256: `{rec["outputSHA256"]}`.\n'
            source_note = folder/'SOURCE.md'
            if pack == 'kenney-furniture-kit':
                # The desk shares this pack. Retain its provenance when reproducing the bench.
                header = text.split('High only.', 1)[0]
                base = source_note.read_text().split('## Town bench', 1)[0].rstrip() if source_note.exists() else header.rstrip()
                text = base+'\n\n## Town bench\n\nHigh only. The bench is the unchanged static, colour-only source GLB. Both furniture models share the original author licence and pack credit.\n\nReproduce with `python3 test/tools/prepare-ambient.py MINI_ZIP FURNITURE_ZIP OUTPUT_3D`.\n'
                for rec in records:
                    text += f'\nSource `{rec["source"]}` SHA-256: `{rec["sourceSHA256"]}`.\nOutput `{rec["output"]}`: {rec["bytes"]} bytes; SHA-256: `{rec["outputSHA256"]}`.\n'
            source_note.write_text(text)
            evidence.append({'pack': pack, 'archiveSHA256': town.digest(archive.read_bytes()), 'licenceSHA256': town.digest(licence), 'models': records})
    manifest_path = destination/'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version': 1, 'files': []}
    uses = {f['use'] for f in files}
    manifest['files'] = [f for f in manifest['files'] if f['use'] not in uses]+files
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
    return evidence


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    print(json.dumps(prepare(*map(Path, sys.argv[1:])), indent=2))
