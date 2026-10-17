"""Convert the owner's CC0 Kenney town packs to self-contained, colour-only GLB.

Usage: python3 test/tools/prepare-town.py INCOMING_DIRECTORY OUTPUT_DIRECTORY
Raw zip files stay outside the game. Requires Pillow, as does prepare-garage.py.
This foundation preserves source triangles and flattens static node transforms;
Low geometry selection and the runtime town replacements are the next C-27 slice.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

from PIL import Image

PACKS = [
    ('kenney_city-kit-suburban_20.zip', 'kenney-city-suburban', 'City Kit Suburban 2.0',
     'https://kenney.nl/assets/city-kit-suburban',
     [('building-type-a', 'town-house'), ('building-type-c', 'town-house-wide'),
      ('tree-small', 'town-tree'), ('fence', 'town-fence')]),
    ('kenney_city-kit-commercial_2.1.zip', 'kenney-city-commercial', 'City Kit Commercial 2.1',
     'https://kenney.nl/assets/city-kit-commercial',
     [('building-a', 'town-shop')]),
    ('kenney_city-kit-roads.zip', 'kenney-city-roads', 'City Kit Roads',
     'https://kenney.nl/assets/city-kit-roads',
     [('road-straight', 'town-road'), ('light-curved', 'town-streetlight')]),
    ('kenney_car-kit.zip', 'kenney-car-kit', 'Car Kit 3.1',
     'https://kenney.nl/assets/car-kit', [('sedan', 'town-parked-car')]),
]
COMPONENTS = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
IDENTITY = (1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def matrix(node):
    if 'matrix' in node:
        return node['matrix']
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    a, b, c = node.get('scale', [1, 1, 1])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    return [(1-2*(y*y+z*z))*a, 2*(x*y+z*w)*a, 2*(x*z-y*w)*a, 0,
            2*(x*y-z*w)*b, (1-2*(x*x+z*z))*b, 2*(y*z+x*w)*b, 0,
            2*(x*z+y*w)*c, 2*(y*z-x*w)*c, (1-2*(x*x+y*y))*c, 0,
            tx, ty, tz, 1]


def multiply(a, b):
    return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]


def point(m, p):
    return tuple(sum(m[k*4+r]*p[k] for k in range(3))+m[12+r] for r in range(3))


def linear(channel):
    c = channel/255
    return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4


def read_glb(raw):
    magic, version, total, length, kind = struct.unpack_from('<5I', raw)
    if magic != 0x46546c67 or version != 2 or total != len(raw) or kind != 0x4e4f534a:
        raise ValueError('Invalid source GLB')
    return json.loads(raw[20:20+length]), raw[28+length:]


def accessor(doc, binary, index):
    item = doc['accessors'][index]
    if item.get('sparse') or item.get('normalized'):
        raise ValueError('Convert sparse/normalised source accessors explicitly')
    view = doc['bufferViews'][item['bufferView']]
    fmt = '<'+COMPONENTS[item['componentType']]*WIDTHS[item['type']]
    size = struct.calcsize(fmt)
    return [struct.unpack_from(fmt, binary, view.get('byteOffset', 0)+item.get('byteOffset', 0)+i*view.get('byteStride', size)) for i in range(item['count'])]


def flatten(raw, palette):
    doc, binary = read_glb(raw)
    if doc.get('animations') or doc.get('skins'):
        raise ValueError('Animated models need the C-28 adapter')
    pixels = palette.convert('RGB')
    positions, normals, colours = [], [], []

    def visit(index, parent, ancestors):
        if index in ancestors:
            raise ValueError('Cyclic source nodes')
        node = doc['nodes'][index]
        world = multiply(parent, matrix(node))
        # These owner packs have positive scales. Reject reflection explicitly rather than reversing winding silently.
        determinant = (world[0]*(world[5]*world[10]-world[9]*world[6])
                       -world[4]*(world[1]*world[10]-world[9]*world[2])
                       +world[8]*(world[1]*world[6]-world[5]*world[2]))
        if determinant <= 0:
            raise ValueError('Reflected or singular source transform')
        if 'mesh' in node:
            for part in doc['meshes'][node['mesh']]['primitives']:
                if part.get('mode', 4) != 4:
                    raise ValueError('Only triangle primitives are supported')
                attrs = part['attributes']
                p = accessor(doc, binary, attrs['POSITION'])
                uv = accessor(doc, binary, attrs['TEXCOORD_0'])
                source_material = doc.get('materials', [])[part.get('material', 0)]
                pbr = source_material.get('pbrMetallicRoughness', {})
                texture = pbr.get('baseColorTexture')
                if not texture or texture.get('texCoord', 0) != 0:
                    raise ValueError('Expected a source palette on UV0')
                source_texture = doc['textures'][texture['index']]
                source_image = doc['images'][source_texture['source']]
                if source_image.get('uri') != 'Textures/colormap.png':
                    raise ValueError('Expected the exact pack palette image')
                transform = texture.get('extensions', {}).get('KHR_texture_transform', {})
                if set(transform)-{'texCoord'} or transform.get('texCoord', 0) != 0:
                    raise ValueError('Bake the palette UV transform explicitly')
                factor = pbr.get('baseColorFactor', [1, 1, 1, 1])
                if factor[3] != 1 or source_material.get('alphaMode', 'OPAQUE') != 'OPAQUE':
                    raise ValueError('Transparent source parts need an explicit adapter')
                indices = [v[0] for v in accessor(doc, binary, part['indices'])] if 'indices' in part else list(range(len(p)))
                if len(indices) % 3:
                    raise ValueError('Incomplete source triangle')
                for at in range(0, len(indices), 3):
                    ids = indices[at:at+3]
                    triangle = [point(world, p[i]) for i in ids]
                    u = [triangle[1][i]-triangle[0][i] for i in range(3)]
                    v = [triangle[2][i]-triangle[0][i] for i in range(3)]
                    cross = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
                    length = math.sqrt(sum(x*x for x in cross))
                    if length < 1e-12:
                        continue
                    normal = tuple(x/length for x in cross)
                    for i, position in zip(ids, triangle):
                        x = min(pixels.width-1, max(0, int(uv[i][0]*pixels.width)))
                        y = min(pixels.height-1, max(0, int(uv[i][1]*pixels.height)))
                        colour = tuple(linear(c)*f for c, f in zip(pixels.getpixel((x, y)), factor))
                        positions.append(position);normals.append(normal);colours.append(colour)
        for child in node.get('children', []):
            visit(child, world, ancestors | {index})

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        visit(root, IDENTITY, set())
    if not positions:
        raise ValueError('Source contains no drawable triangles')
    return positions, normals, colours


def encode(positions, normals, colours):
    # Deduplicate only identical position/normal/colour tuples, preserving hard edges and palette borders.
    vertices, indices, lookup = [], [], {}
    for p, n, c in zip(positions, normals, colours):
        key = tuple(p)+tuple(n)+tuple(c)
        if key not in lookup:
            lookup[key] = len(vertices);vertices.append(key)
        indices.append(lookup[key])
    if len(vertices) > 65535:
        raise ValueError('Split the model before its index buffer exceeds uint16')
    binary = bytearray();views = [];accessors = []
    for values, kind, component, fmt in [([v[:3] for v in vertices], 'VEC3', 5126, 'f'),
                                       ([v[3:6] for v in vertices], 'VEC3', 5126, 'f'),
                                       ([v[6:] for v in vertices], 'VEC3', 5126, 'f'),
                                       ([(i,) for i in indices], 'SCALAR', 5123, 'H')]:
        offset = len(binary)
        for value in values:
            binary.extend(struct.pack('<'+fmt*len(value), *value))
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(binary)-offset})
        a = {'bufferView': len(views)-1, 'componentType': component, 'count': len(values), 'type': kind}
        if len(views) == 1:
            a.update(min=[min(p[i] for p in positions) for i in range(3)], max=[max(p[i] for p in positions) for i in range(3)])
        accessors.append(a)
        binary.extend(b'\0'*(-len(binary) % 4))
    doc = {'asset': {'version': '2.0', 'generator': 'On The Route CC0 town conversion'},
           'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
           'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0}]}],
           'materials': [{'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}],
           'buffers': [{'byteLength': len(binary)}], 'bufferViews': views, 'accessors': accessors}
    text = json.dumps(doc, separators=(',', ':')).encode();text += b' '*(-len(text) % 4)
    return struct.pack('<5I', 0x46546c67, 2, 28+len(text)+len(binary), len(text), 0x4e4f534a)+text+struct.pack('<2I', len(binary), 0x004e4942)+binary


def prepare(incoming, output):
    manifest = {'version': 1, 'files': []}
    for filename, pack, title, url, models in PACKS:
        raw_zip = (incoming/filename).read_bytes()
        with ZipFile(io.BytesIO(raw_zip)) as archive:
            licence = archive.read('License.txt')
            if b'CC0' not in licence and b'Creative Commons Zero' not in licence:
                raise ValueError('Source pack must explicitly permit CC0 use')
            palette = archive.read('Models/GLB format/Textures/colormap.png')
            image = Image.open(io.BytesIO(palette))
            folder = output/pack;folder.mkdir(parents=True, exist_ok=True)
            (folder/'LICENSE.txt').write_bytes(licence)
            notes = [f'# {title}', '', 'Author: Kenney. Licence: CC0.', f'Source: {url}',
                     'Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.',
                     f'Incoming archive: `{filename}`. SHA-256: `{digest(raw_zip)}`.',
                     f'Palette SHA-256: `{digest(palette)}`.', '',
                     'Converted with `python3 test/tools/prepare-town.py INCOMING OUTPUT` (Pillow required).',
                     'Static node transforms are baked, palette sRGB becomes linear vertex colour,',
                     'source winding yields flat normals, and identical vertices are deduplicated.',
                     'No external URI, image, decoder or additional GPU texture is retained.',
                     'These source-detail exports are preparation for C-27; Low selection/runtime integration remain pending.', '',
                     '| Source model | Source SHA-256 | Converted triangles | Bytes | Output SHA-256 |',
                     '| --- | --- | ---: | ---: | --- |']
            for name, use in models:
                raw = archive.read('Models/GLB format/'+name+'.glb')
                p, n, c = flatten(raw, image);converted = encode(p, n, c)
                target = folder/'models'/(name+'-high.glb');target.parent.mkdir(exist_ok=True)
                target.write_bytes(converted)
                manifest['files'].append({'path': str(target.relative_to(output)), 'bytes': len(converted), 'pack': pack, 'quality': 'high', 'use': use})
                notes.append(f'| {name} | `{digest(raw)}` | {len(p)//3} | {len(converted)} | `{digest(converted)}` |')
            (folder/'SOURCE.md').write_text('\n'.join(notes)+'\n')
    output.mkdir(parents=True, exist_ok=True)
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    result = prepare(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"Prepared {len(result['files'])} source-detail models; {sum(f['bytes'] for f in result['files']):,} bytes. Low/runtime integration remains pending.")
