"""Prepare the CC0 starter garage's colour-only High GLB and its 16-triangle Low shell.
Pass the upstream garage.glb, colormap.png, and an output directory. Requires Pillow; never runs in the game.
Provenance and exact upstream revisions are in the pack's SOURCE.md.
"""
import json
import math
from pathlib import Path
import struct
import sys
from PIL import Image

source, palette, destination = map(Path, sys.argv[1:])
raw = source.read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
document = json.loads(raw[20:20 + length])
binary = raw[28 + length:]
image = Image.open(palette).convert('RGB')

def accessor(index):
    item = document['accessors'][index]
    view = document['bufferViews'][item['bufferView']]
    fmt = {5123: 'H', 5125: 'I', 5126: 'f'}[item['componentType']]
    count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[item['type']]
    size = struct.calcsize('<' + fmt * count)
    return [struct.unpack_from('<' + fmt * count, binary,
            view.get('byteOffset', 0) + item.get('byteOffset', 0) + i * view.get('byteStride', size))
            for i in range(item['count'])]

def linear(channel):
    channel /= 255
    return channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4

def write(name, positions, normals, colours, indices):
    data = bytearray()
    views, accessors = [], []
    for values, kind, fmt, component in [(positions, 'VEC3', 'f', 5126), (normals, 'VEC3', 'f', 5126),
                                          (colours, 'VEC3', 'f', 5126), ([(i,) for i in indices], 'SCALAR', 'H', 5123)]:
        offset = len(data)
        for value in values:
            data.extend(struct.pack('<' + fmt * len(value), *value))
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(data) - offset})
        accessors.append({'bufferView': len(views) - 1, 'componentType': component, 'count': len(values), 'type': kind})
        if len(views) == 1:
            accessors[-1].update(min=[min(p[i] for p in positions) for i in range(3)],
                                 max=[max(p[i] for p in positions) for i in range(3)])
        while len(data) % 4:
            data.append(0)
    model = {'asset': {'version': '2.0', 'generator': 'On The Route CC0 starter conversion'},
             'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
             'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0}]}],
             'materials': [{'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}],
             'buffers': [{'byteLength': len(data)}], 'bufferViews': views, 'accessors': accessors}
    text = json.dumps(model, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    (destination / name).write_bytes(struct.pack('<III', 0x46546c67, 2, 28 + len(text) + len(data)) +
                                   struct.pack('<II', len(text), 0x4e4f534a) + text +
                                   struct.pack('<II', len(data), 0x004e4942) + data)

destination.mkdir(parents=True, exist_ok=True)
primitive = document['meshes'][0]['primitives'][0]
positions = accessor(primitive['attributes']['POSITION'])
normals = accessor(primitive['attributes']['NORMAL'])
colours = [tuple(linear(c) for c in image.getpixel((min(image.width - 1, int(u * image.width)),
                                                  min(image.height - 1, int(v * image.height)))))
           for u, v in accessor(primitive['attributes']['TEXCOORD_0'])]
write('garage-high.glb', positions, normals, colours, [i[0] for i in accessor(primitive['indices'])])

# A closed shell with the source's flat roof and footprint; the split roof keeps surface colours separate.
vertices = [(-.5, 0, -.5), (.5, 0, -.5), (.5, .55, -.5), (0, .55, -.5), (-.5, .55, -.5),
            (-.5, 0, .5), (.5, 0, .5), (.5, .55, .5), (0, .55, .5), (-.5, .55, .5)]
faces = [(0, 4, 3), (0, 3, 2), (0, 2, 1), (5, 6, 7), (5, 7, 8), (5, 8, 9),
         (0, 1, 6), (0, 6, 5), (0, 5, 9), (0, 9, 4), (1, 2, 7), (1, 7, 6),
         (4, 9, 8), (4, 8, 3), (3, 8, 7), (3, 7, 2)]
p, n, c = [], [], []
wall = colours[0]
roof = next(colour for colour, normal in zip(colours, normals) if normal[1] > .5)
for a, b, z in faces:
    triangle = [vertices[i] for i in (a, b, z)]
    u, v = [[triangle[i][j] - triangle[0][j] for j in range(3)] for i in (1, 2)]
    normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    size = math.sqrt(sum(x * x for x in normal))
    normal = tuple(x / size for x in normal)
    p.extend(triangle);n.extend([normal] * 3);c.extend([roof if normal[1] > .5 else wall] * 3)
write('garage-low.glb', p, n, c, list(range(len(p))))
