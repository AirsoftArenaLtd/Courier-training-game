"""Verify C-51 exports against the original owner archives, outside the game.
Usage: python3 test/tools/check-ambient-source.py MINI_ZIP FURNITURE_ZIP ASSET_3D
"""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('ambient', Path(__file__).with_name('prepare-ambient.py'))
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
town = adapter.town


def check(mini, furniture, destination):
    records = []
    with tempfile.TemporaryDirectory(prefix='otr-ambient-source-') as temporary:
        fresh = Path(temporary)
        evidence = adapter.prepare(mini, furniture, fresh)
        for pack in evidence:
            archive = mini if pack['pack'] == 'kenney-mini-characters' else furniture
            with ZipFile(archive) as z:
                assert z.read('License.txt') == (destination/pack['pack']/'LICENSE.txt').read_bytes()
                for rec in pack['models']:
                    shipped = (destination/pack['pack']/rec['output']).read_bytes()
                    assert shipped == (fresh/pack['pack']/rec['output']).read_bytes(), 'The export must reproduce exactly'
                    raw = z.read(rec['source'])
                    if pack['pack'] == 'kenney-furniture':
                        assert raw == shipped, 'The static bench must remain byte-identical'
                        records.append({'model': rec['output'], 'sourceIdentical': True})
                        continue
                    source, source_bytes = town.read_glb(raw)
                    output, output_bytes = town.read_glb(shipped)
                    assert not any(output.get(k) for k in ['images', 'textures', 'samplers'])
                    assert source['nodes'] == output['nodes']
                    assert source['scenes'] == output['scenes']
                    for a, b in zip(source['meshes'], output['meshes'], strict=True):
                        for pa, pb in zip(a['primitives'], b['primitives'], strict=True):
                            for key in ['POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0']:
                                assert town.accessor(source, source_bytes, pa['attributes'][key]) == town.accessor(output, output_bytes, pb['attributes'][key]), key
                            assert town.accessor(source, source_bytes, pa['indices']) == town.accessor(output, output_bytes, pb['indices']), 'Source triangles changed'
                    for a, b in zip(source['skins'], output['skins'], strict=True):
                        assert a['joints'] == b['joints']
                        assert town.accessor(source, source_bytes, a['inverseBindMatrices']) == town.accessor(output, output_bytes, b['inverseBindMatrices'])
                    clips = {'idle': 'Idle_Neutral', 'walk': 'Walk'}
                    for old, new in clips.items():
                        a = next(c for c in source['animations'] if c['name'] == old)
                        b = next(c for c in output['animations'] if c['name'] == new)
                        assert a['channels'] == b['channels']
                        for sa, sb in zip(a['samplers'], b['samplers'], strict=True):
                            assert sa.get('interpolation', 'LINEAR') == sb.get('interpolation', 'LINEAR')
                            for key in ['input', 'output']:
                                assert town.accessor(source, source_bytes, sa[key]) == town.accessor(output, output_bytes, sb[key]), 'Animation samples changed'
                    records.append({'model': rec['output'], 'sourceGeometrySkinAndClipSamplesIdentical': True, 'noRuntimePaletteImage': True, 'reproducible': True})
    return records


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    print(json.dumps(check(*map(Path, sys.argv[1:])), indent=2))
