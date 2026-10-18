"""C-28 offline rig/animation compaction. Run: python3 test/fpactorsprepare.py."""
import base64
import importlib.util
import json
from pathlib import Path
import struct
import sys
import unittest
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('actors',Path(__file__).parent/'tools/prepare-actors.py')
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)

class ActorConversion(unittest.TestCase):
    def source(self):
        # Each accessor has its own view; the final view represents unused animation data.
        binary=struct.pack('<12f',*range(12))
        d={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}],
           'nodes':[{'mesh':0,'skin':0,'children':[1]},{'name':'joint'}],
           'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1}]}],
           'skins':[{'joints':[1],'inverseBindMatrices':2}],
           'buffers':[{'byteLength':len(binary),'uri':'data:application/octet-stream;base64,'+base64.b64encode(binary).decode()}],
           'bufferViews':[{'buffer':0,'byteOffset':i*8,'byteLength':8} for i in range(6)],
           'accessors':[{'bufferView':i,'componentType':5126,'type':'SCALAR','count':2} for i in range(6)],
           'animations':[{'name':name,'samplers':[{'input':3,'output':4 if name in A.CLIPS else 5}],
                          'channels':[{'sampler':0,'target':{'node':1,'path':'translation'}}]}
                         for name in ['Idle_Neutral','Walk','Wave','Interact','Unused']]}
        return d,binary

    def decode(self,raw):
        n=struct.unpack_from('<I',raw,12)[0]
        return json.loads(raw[20:20+n]),raw[28+n:]

    def test_keeps_workday_clips_and_rig_references_while_dropping_unused_bytes(self):
        d,binary=self.source();out,data=self.decode(A.worker(json.dumps(d)))
        self.assertEqual({a['name'] for a in out['animations']},A.CLIPS)
        self.assertEqual(len(out['accessors']),5);self.assertEqual(len(out['bufferViews']),5)
        self.assertEqual(data,binary[:40]);self.assertEqual(out['buffers'],[{'byteLength':40}])
        self.assertEqual(out['skins'][0]['joints'],[1]);self.assertEqual(out['skins'][0]['inverseBindMatrices'],2)
        self.assertEqual(out['nodes'],d['nodes'])

    def test_rejects_external_buffers_missing_clips_and_out_of_range_views(self):
        for change in [lambda d:d['buffers'][0].update(uri='https://example.invalid/model.bin'),
                       lambda d:d.update(animations=d['animations'][1:]),
                       lambda d:d['bufferViews'][0].update(byteOffset=999)]:
            d,_=self.source();change(d)
            with self.assertRaises(ValueError):A.worker(json.dumps(d))

    def test_is_deterministic_self_contained_and_four_byte_aligned(self):
        d,_=self.source();raw=A.worker(json.dumps(d));self.assertEqual(raw,A.worker(json.dumps(d)))
        out,data=self.decode(raw);self.assertNotIn('uri',out['buffers'][0]);self.assertEqual(len(raw)%4,0)
        self.assertTrue(all(v['byteOffset']%4==0 for v in out['bufferViews']))
        self.assertEqual(struct.unpack_from('<I',raw,8)[0],len(raw))

if __name__=='__main__':unittest.main()
