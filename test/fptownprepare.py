"""Offline town conversion tests. Run: python3 test/fptownprepare.py."""
import importlib.util
import math
from pathlib import Path
import struct
import sys
import unittest

from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('prepare_town', Path(__file__).parent/'tools/prepare-town.py')
P = importlib.util.module_from_spec(spec);spec.loader.exec_module(P)


class TownConversion(unittest.TestCase):
    def source(self, nodes=None):
        positions = [(0, 0, 0), (1, 0, 0), (0, 1, 0)]
        raw = P.encode(positions, [(0, 0, 1)]*3, [(1, 1, 1)]*3)
        doc, binary = P.read_glb(raw)
        # Replace colour payload with explicit palette UVs, leaving offsets unchanged.
        view = doc['bufferViews'][2];data = bytearray(binary)
        for at, uv in enumerate([(0, 0), (.75, 0), (0, .75)]):
            struct.pack_into('<2f', data, view['byteOffset']+at*8, *uv)
        doc['accessors'][2]['type'] = 'VEC2'
        part = doc['meshes'][0]['primitives'][0]
        part['attributes'].pop('COLOR_0');part['attributes']['TEXCOORD_0'] = 2
        doc['materials'][0]['pbrMetallicRoughness']['baseColorTexture'] = {'index': 0}
        doc['textures'] = [{'source': 0}];doc['images'] = [{'uri': 'Textures/colormap.png'}]
        if nodes is not None:
            doc['nodes'] = nodes
        import json
        text = json.dumps(doc).encode();text += b' '*(-len(text) % 4)
        raw = struct.pack('<5I', 0x46546c67, 2, len(text)+len(data)+28, len(text), 0x4e4f534a)+text+struct.pack('<2I', len(data), 0x004e4942)+data
        image = Image.new('RGB', (2, 2));image.putdata([(128, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 255)])
        return raw, image

    def test_palette_becomes_linear_vertex_colour_without_runtime_image(self):
        raw, image = self.source();positions, normals, colours = P.flatten(raw, image)
        self.assertAlmostEqual(colours[0][0], .21586050011389926)
        self.assertEqual(colours[1], (0, 1, 0));self.assertEqual(colours[2], (0, 0, 1))
        output = P.encode(positions, normals, colours);doc, binary = P.read_glb(output)
        self.assertNotIn('images', doc);self.assertNotIn('textures', doc)
        self.assertEqual(doc['accessors'][3]['count'], 3)
        self.assertEqual(P.accessor(doc, binary, 0), positions)
        self.assertEqual(normals, [(0, 0, 1)]*3)

    def test_nested_nodes_bake_rotation_scale_translation_and_all_mesh_instances(self):
        root = {'translation': [10, 0, 3], 'children': [1, 2]}
        mesh = {'mesh': 0, 'translation': [0, 2, 0], 'scale': [2, 3, 1], 'rotation': [0, 0, math.sqrt(.5), math.sqrt(.5)]}
        raw, image = self.source([root, mesh, {'mesh': 0, 'translation': [-1, 0, 0]}])
        positions, normals, _ = P.flatten(raw, image)
        self.assertEqual(len(positions), 6)
        for point, want in zip(positions[:3], [(10, 2, 3), (10, 4, 3), (7, 2, 3)]):
            for value, expected in zip(point, want):self.assertAlmostEqual(value, expected)
        self.assertEqual(positions[3:], [(9, 0, 3), (10, 0, 3), (9, 1, 3)])
        self.assertTrue(all(abs(n[2]-1)<1e-12 for n in normals))

    def test_deduplication_preserves_hard_edges_and_colour_boundaries(self):
        p = [(0, 0, 0), (1, 0, 0), (0, 1, 0)]*3
        n = [(0, 0, 1)]*6+[(0, 1, 0)]*3
        c = [(1, 0, 0)]*3+[(0, 1, 0)]*6
        doc, _ = P.read_glb(P.encode(p, n, c))
        self.assertEqual(doc['accessors'][0]['count'], 9)
        doc, _ = P.read_glb(P.encode(p, [(0, 0, 1)]*9, [(1, 0, 0)]*9))
        self.assertEqual(doc['accessors'][0]['count'], 3)
        self.assertEqual(doc['accessors'][3]['count'], 9)

    def test_rejects_reflected_singular_and_cyclic_source_transforms(self):
        for nodes in [[{'mesh': 0, 'scale': [-1, 1, 1]}], [{'mesh': 0, 'scale': [0, 1, 1]}], [{'children': [0]}]]:
            raw, image = self.source(nodes)
            with self.assertRaises(ValueError):P.flatten(raw, image)

    def test_export_is_byte_deterministic_and_uint16_aligned(self):
        raw, image = self.source();a = P.encode(*P.flatten(raw, image));b = P.encode(*P.flatten(raw, image))
        self.assertEqual(a, b);self.assertEqual(len(a) % 4, 0)
        doc, binary = P.read_glb(a)
        self.assertEqual(doc['accessors'][3]['componentType'], 5123)
        self.assertTrue(all(v['byteOffset'] % 4 == 0 for v in doc['bufferViews']))
        self.assertEqual(len(binary), doc['buffers'][0]['byteLength'])

    def test_low_silhouettes_keep_finite_normals_source_palette_and_bounded_geometry(self):
        points = [(0,0,0),(1,0,0),(0,0,1),(0,1,0),(1,1,0),(0,1,1)]
        normals = [(0,-1,0)]*3+[(0,1,0)]*3
        colours = [(.9,.9,.9)]*3+[(.1,.6,.2)]*3
        for use in ['town-house','town-house-wide','town-shop','town-fence','town-streetlight','town-parked-car']:
            p,n,c = P.low_detail(use,(points,normals,colours))
            self.assertLessEqual(len(p)//3,44)
            self.assertTrue(all(abs(sum(v*v for v in normal)-1)<1e-10 for normal in n))
            self.assertTrue(all(-.003<=v<=1.003 for point in p for v in point))
            self.assertTrue(set(c).issubset(set(colours)))
        _,_,c = P.low_detail('town-house',(points,normals,colours))
        self.assertIn((.1,.6,.2),c,'The broad roof surface keeps the source roof palette.')


if __name__ == '__main__':
    unittest.main()
