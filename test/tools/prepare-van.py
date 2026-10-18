"""C-28: preserve source van parts and generate a bounded Low exterior (no maps)."""
import importlib.util,io,json,struct,sys,math
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('a',Path(__file__).with_name('prepare-actors.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
P=a.town

def combine(parts):
    out={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1}}],'accessors':[],'bufferViews':[]};binary=bytearray()
    for name,data in parts:
        doc,blob=P.read_glb(data);ac=len(out['accessors']);vw=len(out['bufferViews']);offset=len(binary);binary.extend(blob)
        for v in doc['bufferViews']:out['bufferViews'].append({**v,'byteOffset':v.get('byteOffset',0)+offset})
        for v in doc['accessors']:out['accessors'].append({**v,'bufferView':v['bufferView']+vw})
        prim=doc['meshes'][0]['primitives'][0];prim['attributes']={k:v+ac for k,v in prim['attributes'].items()};prim['indices']+=ac;prim['material']=0
        out['scenes'][0]['nodes'].append(len(out['nodes']));out['nodes'].append({'name':name,'mesh':len(out['meshes'])});out['meshes'].append({'primitives':[prim]})
    out['buffers']=[{'byteLength':len(binary)}];return a.glb(out,bytes(binary))

def shape(vertices,faces,colour):
    p=[];n=[];c=[]
    for face in faces:
        v=[vertices[i] for i in face];u=[v[1][i]-v[0][i] for i in range(3)];w=[v[2][i]-v[0][i] for i in range(3)];cross=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];length=math.sqrt(sum(t*t for t in cross))
        p.extend(v);n.extend([tuple(t/length for t in cross)]*3);c.extend([colour]*3)
    return p,n,c

FACES=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(3,7,6),(3,6,2),(0,4,7),(0,7,3),(1,2,6),(1,6,5)]
def box(x,y,z,w,h,d,colour):
    return shape([(x+sx*w/2,y+sy*h/2,z+sz*d/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],FACES,colour)

def prepare(car,out):
    with ZipFile(car) as z:
        raw=z.read('Models/GLB format/delivery.glb');doc,blob=P.read_glb(raw);palette=Image.open(io.BytesIO(z.read('Models/GLB format/Textures/colormap.png')));high=[]
        for i,node in enumerate(doc['nodes']):
            only={**doc,'scenes':[{'nodes':[i]}],'scene':0};high.append((node['name'],P.encode(*P.flatten(a.glb(only,blob),palette))))
        (out/'delivery-high.glb').write_bytes(combine(high))
        # Same source orientation (+Z front). Open-sided cargo shell retains the physical aisle.
        white=(.58,.64,.74);dark=(.035,.035,.04);glass=(.14,.22,.29);parts=[];body=[[],[],[]]
        def add(data):
            for dst,src in zip(body,data):dst.extend(src)
        add(box(0,.24,0,1.4,.16,3.2,dark));add(box(0,1.61,-.4,1.46,.08,2.25,white))
        for x in [-.7,.7]:add(box(x,1,-.4,.06,1.2,2.25,white))
        add(box(0,.5,1.01,1.4,.4,1.1,white))
        # Sloped cab front and its inset windshield (closed prism).
        verts=[(-.7,.7,.5),(.7,.7,.5),(.7,1.5,.5),(-.7,1.5,.5),(-.7,.7,1.55),(.7,.7,1.55),(.7,1.1,1.55),(-.7,1.1,1.55)]
        add(shape(verts,FACES,white));add(shape([(-.61,1.13,1.5),(.61,1.13,1.5),(.61,1.43,.58),(-.61,1.43,.58)],[(0,1,2),(0,2,3)],glass))
        for x in [-.707,.707]:add(box(x,1.15,.8,.01,.35,.5,glass))
        parts.append(('body',P.encode(*body)));parts.append(('door',P.encode(*box(0,1,-1.5,1.37,1.2,.05,white))))
        for x in [-.65,.65]:
            for z,name in [(1.01,'front'),(-.61,'back')]:
                # Hexagonal tire, twelve side triangles plus eight cap triangles.
                vertices=[(x+dx*.1,.3+math.cos(i*math.pi/3)*.3,z+math.sin(i*math.pi/3)*.3) for dx in [-1,1] for i in range(6)];faces=[]
                for i in range(6):j=(i+1)%6;faces.extend([(i,j,j+6),(i,j+6,i+6)])
                for i in range(1,5):faces.extend([(0,i+1,i),(6,6+i,6+i+1)])
                parts.append(('wheel-'+name+('-left' if x>0 else '-right'),P.encode(*shape(vertices,faces,dark))))
        (out/'delivery-low.glb').write_bytes(combine(parts))

if __name__=='__main__':prepare(Path(sys.argv[1]),Path(sys.argv[2]))
