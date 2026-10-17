"""Optional subprocess entrypoint. No installation, network or import-time tool probing."""
import argparse, base64, hashlib, importlib, importlib.metadata, json, os, shutil, sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))

TOOLS={'ufoLib2':('ufoLib2','0.19.1'),'ufo2ft':('ufo2ft','3.9.1'),'fonttools':('fontTools','4.67.0'),'skia-pathops':('pathops','0.9.2'),'picosvg':('picosvg','0.23.0'),'uharfbuzz':('uharfbuzz','0.56.3')}

def tools():
    result={}
    for name,(module,expected) in TOOLS.items():
        version=importlib.metadata.version(name)
        if version!=expected:raise RuntimeError(f'Unsupported {name} {version}; qualified version is {expected}')
        importlib.import_module(module);result[name]=version
    return result

def bounded_file(path,maximum=1048576):
    p=Path(os.path.abspath(path))
    if p.resolve()!=p or not p.is_file() or p.stat().st_nlink!=1 or p.stat().st_size>maximum:raise ValueError('Expected bounded nonsymlink regular source')
    b=p.read_bytes()
    if len(b)>maximum:raise ValueError('Input changed beyond bound')
    return b

def new_output(path):
    p=Path(os.path.abspath(path))
    if p.parent.resolve()!=p.parent or not p.parent.is_dir():raise ValueError('Output parent must exist without symlink ancestors')
    p.mkdir();return p

def put(path,data):
    with open(path,'xb') as f:f.write(data)

def dump(path,data):put(path,(json.dumps(data,indent=2,sort_keys=True)+'\n').encode())

def main():
    parser=argparse.ArgumentParser();parser.add_argument('operation',choices=['capabilities','font-demo','compile-font','normalize','boolean']);parser.add_argument('--source');parser.add_argument('--output');a=parser.parse_args()
    # Bounded subprocess for native parsers/geometry. Not a full security sandbox.
    import resource
    resource.setrlimit(resource.RLIMIT_AS,(536870912,536870912));resource.setrlimit(resource.RLIMIT_CPU,(15,15));resource.setrlimit(resource.RLIMIT_FSIZE,(4194304,4194304))
    versions=tools()
    if a.operation=='capabilities':return {'status':'pass','versions':versions,'limits':{'memoryBytes':536870912,'cpuSeconds':15,'fileBytes':4194304},'optionalValidators':{x:('available' if shutil.which(x) else 'not-run: executable absent') for x in ['ots-sanitize','fontspector','hb-shape','hb-view']}}
    if not a.output:raise ValueError('New output directory required')
    if a.operation in ['font-demo','compile-font']:
        from fonts import make_master,compile_master,shape_proof,digest
        # Validate owned UFO before creating output; no optional filters/includes loaded.
        if a.operation=='compile-font':
            if not a.source:raise ValueError('Owned UFO source required')
            from fonts import bounded_master,validate_master,EXAMPLES
            from ufoLib2 import Font
            spec=json.loads((EXAMPLES/'repertoire.json').read_text());validate_master(Font.open(bounded_master(a.source),lazy=False),spec)
        out=new_output(a.output)
        if a.operation=='font-demo':make_master(out/'GridProof.ufo');source=out/'GridProof.ufo'
        else:source=Path(a.source)
        info=compile_master(source,out/'GridProof.ttf');shaping=shape_proof(out/'GridProof.ttf')
        dump(out/'font.json',info);dump(out/'shaping.json',shaping)
        put(out/'features.fea',(source/'features.fea').read_bytes())
        put(out/'LICENSE', (Path(__file__).resolve().parents[2]/'LICENSE').read_bytes())
        encoded=base64.b64encode((out/'GridProof.ttf').read_bytes()).decode('ascii'); proof='AVATAR OFFICE fi A\u0301'
        rows=''.join(f'<p class="label">{n} CSS px</p><div class="proof" id="proof{n}" style="font-size:{n}px">{proof}</div>' for n in [16,24,48,96])
        html=f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Original limited font proof</title><style>@font-face{{font-family:GridProof;src:url(data:font/ttf;base64,{encoded}) format("truetype");font-weight:400}}*{{box-sizing:border-box}}body{{margin:0;padding:32px;background:#f5f2eb;color:#152e31;font:16px/1.5 system-ui}}main{{max-width:1200px;margin:auto}}h1{{font-size:28px}}.label{{font-size:14px;color:#465b60;margin:24px 0 4px}}.proof{{font-family:GridProof;font-weight:400;line-height:1.2;white-space:nowrap;font-feature-settings:"kern" 1,"liga" 1,"mark" 1}}.specimen{{overflow-x:auto;padding:20px;background:white;border:1px solid #b9c7c1;border-radius:12px}}code{{overflow-wrap:anywhere}}</style><main><h1>Ingenium Grid Proof Regular</h1><p>Original limited demonstration font · MIT · ajhcs and contributors. Technical proof, not production typography or a worked design example.</p><p>Supported: uppercase A–Z, digits, space and . , - ! ?, lowercase f/i, combining acute for A. No general lowercase or language coverage. An unencoded composite remains editable in the UFO.</p><div class="specimen">{rows}<p class="label">Complete supported character sample</p><div class="proof" id="charset" style="font-size:24px">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,-!? fi A\u0301</div></div><p>Exact embedded TTF SHA-256: <code>{info['sha256']}</code></p><p>16px is a deliberately small inspection size. No hinting, audience reading study, OTS or Fontspector qualification is claimed. Horizontal scrolling preserves the largest proof.</p></main></html>'''
        put(out/'proof.html',html.encode())
        manifest={str(p.relative_to(out)):{'sha256':digest(p),'bytes':p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()}
        receipt={'status':'pass','operation':a.operation,'versions':versions,'font':info,'shaping':shaping,'artifacts':manifest,'validators':{'fontTools':'full tables decompiled; not sanitation','harfbuzz':'actual delivered binary shaped','OTS':'not-run: executable absent','Fontspector':'not-run: executable absent'},'limits':['Owned limited UFO/compiler only; not arbitrary-font sanitation','No fontmake, family or variable pipeline','Visual quality and fallback require actual rendered/CDP inspection']};dump(out/'receipt.json',receipt);return receipt
    if not a.source:raise ValueError('Bounded source file required')
    data=bounded_file(a.source)
    from vectors import normalize,boolean
    result=normalize(data) if a.operation=='normalize' else boolean(json.loads(data))
    out=new_output(a.output);put(out/'original.svg' if a.operation=='normalize' else out/'original.json',data)
    if a.operation=='normalize':put(out/'normalized.svg',result);detail={'outputSha256':hashlib.sha256(result).hexdigest(),'bytes':len(result),'backend':'picosvg','roundingDecimalPlaces':3}
    else:
        dump(out/'result.json',result);detail=result
        x0,y0,x1,y1=result['bounds'];padding=10
        viewbox=[x0-padding,y0-padding,max(1,x1-x0)+2*padding,max(1,y1-y0)+2*padding]
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(str(n) for n in viewbox)}"><path fill="#28645b" fill-rule="nonzero" d="{result["d"]}"/></svg>';put(out/'result.svg',svg.encode());detail['exportViewBox']=viewbox
    receipt={'status':'pass','operation':a.operation,'versions':versions,'sourceSha256':hashlib.sha256(data).hexdigest(),'result':detail,'limits':['Bounded static vector subset only; unsupported semantics refused','Picosvg decimal rounding is explicit, not exact geometric equivalence','No Canvas/library-bug inference from difference output']};dump(out/'receipt.json',receipt);return receipt

if __name__=='__main__':
    try:print(json.dumps(main(),sort_keys=True))
    except (ModuleNotFoundError,importlib.metadata.PackageNotFoundError) as e:print(json.dumps({'status':'not-run','reason':str(e)}));sys.exit(2)
    except Exception as e:print(json.dumps({'status':'error','reason':str(e)}));sys.exit(1)
