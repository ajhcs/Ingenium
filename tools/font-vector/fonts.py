"""Original limited demonstration sources and established UFO/TTF/shaping tools."""
import json, math, hashlib, re, os
from pathlib import Path

EXAMPLES = Path(__file__).resolve().parents[2] / 'examples' / 'font-vector'

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def rectangle(glyph, x, y, w, h):
    pen = glyph.getPen()
    pen.moveTo((x, y)); pen.lineTo((x, y+h)); pen.lineTo((x+w, y+h)); pen.lineTo((x+w, y)); pen.closePath()

def make_master(destination):
    from ufoLib2 import Font
    from ufoLib2.objects import Anchor, Component
    spec = json.loads((EXAMPLES / 'repertoire.json').read_text())
    patterns = json.loads((EXAMPLES / 'grid-patterns.json').read_text())
    font = Font(); info = font.info
    info.familyName = spec['name']; info.styleName = 'Regular'; info.versionMajor = 1; info.versionMinor = 0
    info.copyright = 'Copyright ajhcs and contributors. Original demonstration outlines, MIT license.'
    info.openTypeNameLicense = 'MIT License; see accompanying project LICENSE.'
    info.openTypeNameLicenseURL = 'https://opensource.org/license/mit'
    info.openTypeNameDesigner = 'ajhcs and contributors'
    for key in ['unitsPerEm', 'ascender', 'descender', 'capHeight', 'xHeight']: setattr(info, key, spec['metrics'][key])
    info.openTypeOS2TypoAscender = 900; info.openTypeOS2TypoDescender = -200; info.openTypeOS2TypoLineGap = 100
    info.openTypeHheaAscender = 900; info.openTypeHheaDescender = -200; info.openTypeHheaLineGap = 100
    info.openTypeOS2WinAscent = 900; info.openTypeOS2WinDescent = 200
    info.openTypeOS2Selection = [7]; info.openTypeOS2WeightClass = 400; info.openTypeOS2WidthClass = 5
    info.openTypeHeadCreated = '2026/01/01 00:00:00'
    g = font.newGlyph('.notdef'); g.width = 620
    for box in [(60,0,80,700),(480,0,80,700),(140,0,340,80),(140,620,340,80)]: rectangle(g,*box)
    for char, pattern in patterns.items():
        name = char if char.isalpha() else 'digit' + char
        g = font.newGlyph(name); g.unicode = ord(char); g.width = 620
        for row, line in enumerate(pattern):
            for col, bit in enumerate(line):
                if bit == '1': rectangle(g,60+col*100,600-row*100,100,100)
    punctuation = {'space':(' ',340,[]),'period':('.',300,[(100,0,100,100)]),'comma':(',',300,[(100,0,100,100),(40,-100,100,100)]),'hyphen':('-',420,[(60,300,300,100)]),'exclam':('!',300,[(100,200,100,500),(100,0,100,100)]),'question':('?',620,[(160,600,300,100),(460,400,100,200),(260,300,200,100),(260,200,100,100),(260,0,100,100)])}
    for name,(char,width,boxes) in punctuation.items():
        g=font.newGlyph(name);g.unicode=ord(char);g.width=width
        for box in boxes: rectangle(g,*box)
    g=font.newGlyph('f');g.unicode=ord('f');g.width=420
    for box in [(140,0,100,600),(240,600,140,100),(40,400,340,100)]:rectangle(g,*box)
    g=font.newGlyph('i');g.unicode=ord('i');g.width=280
    for box in [(90,0,100,500),(90,600,100,100)]:rectangle(g,*box)
    g=font.newGlyph('f_i');g.width=640
    for box in [(140,0,100,600),(240,600,140,100),(40,400,500,100),(440,0,100,400),(440,600,100,100)]:rectangle(g,*box)
    g=font.newGlyph('acutecomb');g.unicode=0x301;g.width=0
    pen=g.getPen();pen.moveTo((-80,0));pen.lineTo((10,140));pen.lineTo((130,140));pen.lineTo((30,0));pen.closePath()
    g.anchors.append(Anchor(0,0,'_top'));font['A'].anchors.append(Anchor(310,740,'top'))
    g=font.newGlyph('Aacute');g.width=620 # editable unencoded component specimen
    g.components.append(Component('A'));g.components.append(Component('acutecomb',(1,0,0,1,310,740)))
    font.groups['public.kern1.A']=['A'];font.groups['public.kern2.V']=['V'];font.kerning[('public.kern1.A','public.kern2.V')]=-80
    font.lib['public.glyphOrder']=list(font.keys())
    font.lib['public.openTypeCategories']={'acutecomb':'mark','f_i':'ligature'}
    font.features.text=(EXAMPLES/'features.fea').read_text()
    font.save(destination,formatVersion=3)
    return spec

def validate_master(font, spec):
    if font.info.unitsPerEm != 1000: raise ValueError('Demonstration requires 1000 UPM')
    expected_metrics={'ascender':900,'descender':-200,'capHeight':700,'xHeight':500,'openTypeHheaAscender':900,'openTypeHheaDescender':-200,'openTypeHheaLineGap':100,'openTypeOS2TypoAscender':900,'openTypeOS2TypoDescender':-200,'openTypeOS2TypoLineGap':100,'openTypeOS2WinAscent':900,'openTypeOS2WinDescent':200}
    if any(getattr(font.info,k)!=v for k,v in expected_metrics.items()):raise ValueError('Declared line/advance metric contract changed')
    if font.info.familyName!=spec['name'] or font.info.styleName!='Regular':raise ValueError('Demonstration family/style identity changed')
    if '.notdef' not in font or len(font)>128: raise ValueError('Required .notdef / glyph count invalid')
    cmap={}
    for g in font:
        if not math.isfinite(g.width) or not 0<=g.width<=2000: raise ValueError('Invalid advance width')
        for code in g.unicodes:
            if code in cmap: raise ValueError('Duplicate Unicode mapping')
            cmap[code]=g.name
        for contour in g.contours:
            if len(contour)<3: raise ValueError('Malformed contour')
            for p in contour:
                if not all(math.isfinite(n) and abs(n)<=4096 for n in (p.x,p.y)):raise ValueError('Invalid outline coordinate')
        for c in g.components:
            if c.baseGlyph not in font or not all(math.isfinite(n) and abs(n)<=4096 for n in c.transformation): raise ValueError('Malformed component')
    def visit(name, trail):
        if name in trail: raise ValueError('Cyclic component')
        for c in font[name].components:visit(c.baseGlyph,trail|{name})
    for name in font.keys():visit(name,set())
    missing=[c for c in spec['characters'] if ord(c) not in cmap]
    if missing:raise ValueError('Missing required Unicode: '+repr(missing))
    if len(font)!=48 or not {'Aacute','f_i','acutecomb'}.issubset(font.keys()):raise ValueError('Required 48-glyph demonstration/composite specimen missing')
    expected_names={ord(c):(c if c.isalpha() else 'digit'+c) for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789fi'}
    expected_names.update({ord(c):name for c,name in [(' ','space'),('.','period'),(',','comma'),('-','hyphen'),('!','exclam'),('?','question'),('\u0301','acutecomb')]})
    if cmap!=expected_names:raise ValueError('Required glyph/Unicode identity changed')
    if [(c.baseGlyph,tuple(c.transformation)) for c in font['Aacute'].components]!=[('A',(1,0,0,1,0,0)),('acutecomb',(1,0,0,1,310,740))]:raise ValueError('Required editable composite specimen changed')
    widths={'space':340,'period':300,'comma':300,'hyphen':420,'exclam':300,'f':420,'i':280,'f_i':640,'acutecomb':0}
    from fontTools.pens.boundsPen import BoundsPen
    for g in font:
        if g.width!=widths.get(g.name,620):raise ValueError('Declared advance metric contract changed')
        pen=BoundsPen(font);g.draw(pen)
        if pen.bounds and (pen.bounds[1]<-200 or pen.bounds[3]>900):raise ValueError('Outline exceeds declared vertical metrics')
    if font['acutecomb'].width!=0 or not any(a.name=='top' and (a.x,a.y)==(310,740) for a in font['A'].anchors) or not any(a.name=='_top' and (a.x,a.y)==(0,0) for a in font['acutecomb'].anchors):raise ValueError('Required compatible mark anchors missing')
    if font.groups.get('public.kern1.A')!=['A'] or font.groups.get('public.kern2.V')!=['V'] or font.kerning.get(('public.kern1.A','public.kern2.V'))!=-80:raise ValueError('Required kerning group/metric contract missing')
    if re.search(r'\binclude\s*\(',font.features.text):raise ValueError('External feature includes unsupported')
    if font.features.text!=(EXAMPLES/'features.fea').read_text():raise ValueError('Demonstration feature sources changed; qualify explicitly before compilation')
    return cmap

def bounded_master(source):
    source=Path(os.path.abspath(source))
    if source.resolve()!=source or not source.is_dir():raise ValueError('Expected owned regular UFO3 directory without symlink ancestors')
    count=size=0
    for file in source.rglob('*'):
        if file.is_symlink():raise ValueError('UFO symlinks unsupported')
        if not file.is_file():continue
        count+=1;size+=file.stat().st_size
        if count>256 or size>1048576 or file.stat().st_size>65536 or file.suffix not in ['.plist','.glif','.fea']:raise ValueError('Unsupported/bounded UFO content')
        if file.suffix=='.glif' and (b'<!DOCTYPE' in file.read_bytes().upper() or b'<!ENTITY' in file.read_bytes().upper()):raise ValueError('GLIF declarations unsupported')
    return source

def compile_master(source, output):
    from ufoLib2 import Font
    from ufo2ft import compileTTF
    from fontTools.ttLib import TTFont
    spec=json.loads((EXAMPLES/'repertoire.json').read_text());source=bounded_master(source)
    font=Font.open(source,lazy=False);cmap=validate_master(font,spec)
    binary=compileTTF(font,removeOverlaps=True,overlapsBackend='pathops',featureWriters=[],filters=[],inplace=False,useProductionNames=False)
    binary.recalcTimestamp=False;binary['head'].created=binary['head'].modified=3850070400
    binary.save(output,reorderTables=True)
    with TTFont(output,checkChecksums=2,recalcTimestamp=False) as t:
        for tag in t.keys():t[tag] # force complete decompile, not sanitation
        if t.getBestCmap()!=cmap:raise ValueError('Compiled cmap differs from required source')
        if not {'GSUB','GPOS','GDEF','glyf','hmtx','OS/2'}.issubset(t.keys()):raise ValueError('Required compiled tables missing')
        metrics={'unitsPerEm':t['head'].unitsPerEm,'ascent':t['hhea'].ascent,'descent':t['hhea'].descent,'lineGap':t['hhea'].lineGap,'advances':dict(t['hmtx'].metrics)}
    return {'sha256':digest(output),'bytes':Path(output).stat().st_size,'cmap':{str(k):v for k,v in cmap.items()},'metrics':metrics,'spec':spec,'qualification':'FontTools full table decompile and source contract only; not OTS/Fontspector sanitation'}

def shape_proof(path):
    import uharfbuzz as hb
    data=Path(path).read_bytes();font=hb.Font(hb.Face(data));font.scale=(1000,1000)
    def shape(text,features):
        b=hb.Buffer();b.add_str(text);b.guess_segment_properties();hb.shape(font,b,features)
        return [{'gid':i.codepoint,'name':font.glyph_to_string(i.codepoint),'cluster':i.cluster,'advance':p.x_advance,'x':p.x_offset,'y':p.y_offset} for i,p in zip(b.glyph_infos,b.glyph_positions)]
    results={'kernOn':shape('AV',{'kern':True}),'kernOff':shape('AV',{'kern':False}),'ligaOn':shape('fi',{'liga':True}),'ligaOff':shape('fi',{'liga':False}),'markOn':shape('A\u0301',{'mark':True,'ccmp':False}),'markOff':shape('A\u0301',{'mark':False,'ccmp':False})}
    results['fontSha256']=hashlib.sha256(data).hexdigest()
    if sum(x['advance'] for x in results['kernOff'])-sum(x['advance'] for x in results['kernOn'])!=80:raise ValueError('Actual kerning behavior failed')
    if len(results['ligaOn'])!=1 or len(results['ligaOff'])!=2:raise ValueError('Actual ligature behavior failed')
    if len(results['markOn'])!=2 or results['markOn'][1]['advance']!=0 or results['markOn']==results['markOff']:raise ValueError('Actual mark attachment failed')
    return {'engine':'uharfbuzz','harfbuzz':hb.version_string(),'results':results}
