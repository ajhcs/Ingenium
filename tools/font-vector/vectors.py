"""Bounded untrusted SVG subset; picosvg normalization and explicit PathOps fills."""
import math, re, json, hashlib
from pathlib import Path

MAX_BYTES=1048576
SVG_NS='http://www.w3.org/2000/svg'
NUM=r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'
NUM_RE=re.compile(NUM)
ELEMENTS={'svg','g','defs','clipPath','path','rect','circle','ellipse','line','polyline','polygon'}
ATTRS={'id','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','transform','fill','fill-rule','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','opacity','fill-opacity','stroke-opacity','clip-path','clipPathUnits'}

def validate_path(d):
    from picosvg.svg_types import SVGPath
    if not isinstance(d,str) or not d or len(d)>32768:raise ValueError('Path size unsupported')
    if re.search(r'^\s*,|[A-Za-z]\s*,|,\s*(?:[,A-Za-z]|$)',d):raise ValueError('Unsupported comma placement')
    token=re.compile('[MmZzLlHhVvCcSsQqTtAa]|'+NUM);tokens=[];offset=0
    while offset<len(d):
        separator=re.match(r'[\s,]+',d[offset:])
        if separator:offset+=separator.end();continue
        m=token.match(d,offset)
        if not m or len(tokens)>=8192:raise ValueError('Malformed/bounded path token')
        tokens.append(m.group());offset=m.end()
    if not tokens or tokens[0] not in ['M','m']:raise ValueError('Initial move required')
    arities={'M':2,'L':2,'H':1,'V':1,'C':6,'S':4,'Q':4,'T':2,'A':7};i=0
    while i<len(tokens):
        cmd=tokens[i].upper();i+=1
        if cmd=='Z':continue
        size=arities.get(cmd)
        if not size:raise ValueError('Expected explicit command')
        start=i
        while i<len(tokens) and not re.fullmatch('[A-Za-z]',tokens[i]):i+=1
        if i==start or (i-start)%size:raise ValueError('Incomplete path command operands')
        for n in range(start,i):
            value=float(tokens[n]);index=(n-start)%size
            if not math.isfinite(value) or abs(value)>8192:raise ValueError('Path operand exceeds finite bounds')
            if cmd=='A' and ((index in [0,1] and value<0) or (index in [3,4] and tokens[n] not in ['0','1'])):raise ValueError('Unsupported arc operands')
    commands=list(SVGPath(d=d).as_cmd_seq())
    if len(commands)>4096 or not commands or commands[0][0].upper()!='M':raise ValueError('Path command budget/initial move invalid')
    for cmd,args in commands:
        if not all(math.isfinite(n) and abs(n)<=8192 for n in args):raise ValueError('Path coordinates exceed finite bounds')
    return d

def guarded_svg(data):
    from lxml import etree
    if not isinstance(data,bytes) or len(data)>MAX_BYTES:raise ValueError('SVG byte limit exceeded')
    parser=etree.XMLParser(resolve_entities=False,no_network=True,load_dtd=False,huge_tree=False,remove_comments=False)
    root=etree.fromstring(data,parser)
    if root.getroottree().docinfo.doctype:raise ValueError('DTD/entities unsupported')
    if root.tag!='{'+SVG_NS+'}svg':raise ValueError('Expected SVG namespace root')
    ids={};refs=[];count=0
    def walk(node,depth):
        nonlocal count
        if not isinstance(node.tag,str):raise ValueError('XML comments/processing instructions unsupported')
        count+=1
        if count>2048 or depth>24:raise ValueError('SVG node/depth budget exceeded')
        tag=etree.QName(node).localname
        if etree.QName(node).namespace!=SVG_NS or tag not in ELEMENTS or (tag=='svg' and depth!=0):raise ValueError('Unsupported SVG structure: '+tag)
        if node.text and node.text.strip() or node.tail and node.tail.strip():raise ValueError('Text unsupported')
        if len(node.attrib)>32:raise ValueError('Attribute budget exceeded')
        for name,value in node.attrib.items():
            if name not in ATTRS or len(value)>32768:raise ValueError('Unsupported SVG attribute: '+name)
            if name=='id':
                if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',value) or value in ids:raise ValueError('Invalid/duplicate ID')
                ids[value]=node
            elif name=='clip-path':
                m=re.fullmatch(r'url\(#([A-Za-z][A-Za-z0-9_-]{0,63})\)',value)
                if not m:raise ValueError('Only local clip references supported')
                refs.append(m.group(1))
            elif name in ['fill','stroke']:
                if not re.fullmatch(r'(?:none|#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|black|white)',value):raise ValueError('Unsupported solid paint')
            elif name=='fill-rule':
                if value not in ['evenodd','nonzero']:raise ValueError('Unsupported fill-rule')
            elif name=='clipPathUnits':
                if value!='userSpaceOnUse':raise ValueError('Only user-space clipping supported')
            elif name in ['stroke-linecap','stroke-linejoin']:
                if value not in ['butt','round','square','miter','bevel']:raise ValueError('Unsupported stroke join/cap')
            elif name=='d':validate_path(value)
            elif name=='transform':
                rest=value
                for m in list(re.finditer(r'(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)',value)):
                    args=m.group(2);nums=NUM_RE.findall(args)
                    if re.sub(NUM,'',args).strip(' ,\t\r\n') or len(nums) not in {'matrix':[6],'translate':[1,2],'scale':[1,2],'rotate':[1,3],'skewX':[1],'skewY':[1]}[m.group(1)] or not all(math.isfinite(float(n)) and abs(float(n))<=8192 for n in nums):raise ValueError('Invalid transform')
                    rest=rest.replace(m.group(0),'',1)
                if rest.strip(' ,\t\r\n') or not value:raise ValueError('Unsupported transform syntax')
            else:
                nums=NUM_RE.findall(value)
                if re.sub(NUM,'',value).strip(' ,\t\r\n') or not nums or not all(math.isfinite(float(n)) and abs(float(n))<=8192 for n in nums):raise ValueError('Unsupported numeric attribute '+name)
                if name=='viewBox' and (len(nums)!=4 or float(nums[2])<=0 or float(nums[3])<=0):raise ValueError('Invalid viewBox')
                if name not in ['viewBox','points'] and len(nums)!=1:raise ValueError('Expected scalar '+name)
                if name in ['width','height','r','rx','ry','stroke-width'] and float(nums[0])<0:raise ValueError('Negative size')
                if name.endswith('opacity') and not 0<=float(nums[0])<=1:raise ValueError('Opacity outside bounds')
                if name=='points' and len(nums)%2:raise ValueError('Odd point coordinates')
        if tag=='clipPath':
            if len(node)!=1 or etree.QName(node[0]).localname!='rect' or node.getparent() is None or etree.QName(node.getparent()).localname!='defs':raise ValueError('Only one rectangular defs clip is qualified')
            if 'clip-path' in node.attrib or 'clip-path' in node[0].attrib:raise ValueError('Nested clip unsupported')
        for child in node:walk(child,depth+1)
    walk(root,0)
    if not root.get('viewBox'):raise ValueError('Explicit bounded viewBox required')
    for ref in refs:
        if ref not in ids or etree.QName(ids[ref]).localname!='clipPath':raise ValueError('Unresolved clip reference')
    # Reject instructions before/after root as well as within it.
    if root.getprevious() is not None or root.getnext() is not None:raise ValueError('Extra XML nodes unsupported')
    return root

def normalize(data):
    from picosvg.svg import SVG
    guarded_svg(data)
    normalized=SVG.fromstring(data).topicosvg(inplace=False,drop_unsupported=False,allow_text=False).tostring().encode('utf8')
    if len(normalized)>MAX_BYTES:raise ValueError('Normalized byte budget exceeded')
    guarded_svg(normalized)
    return normalized

def boolean(record):
    import pathops
    from fontTools.svgLib.path import parse_path
    from fontTools.pens.svgPathPen import SVGPathPen
    if not isinstance(record,dict) or set(record)!={'operation','left','right'} or record['operation'] not in ['union','intersection','difference']:raise ValueError('Expected explicit union/intersection/difference operands')
    paths=[];before=[]
    for item in [record['left'],record['right']]:
        if not isinstance(item,dict) or set(item)!={'d','fillRule'} or item['fillRule'] not in ['nonzero','evenodd']:raise ValueError('Each operand requires d and explicit fillRule')
        d=validate_path(item['d']);p=pathops.Path();parse_path(d,p.getPen());p.fillType=pathops.FillType.EVEN_ODD if item['fillRule']=='evenodd' else pathops.FillType.WINDING
        paths.append(p);before.append(repr(list(p)))
    op={'union':pathops.PathOp.UNION,'intersection':pathops.PathOp.INTERSECTION,'difference':pathops.PathOp.DIFFERENCE}[record['operation']]
    result=pathops.op(paths[0],paths[1],op,fix_winding=True)
    unchanged=[repr(list(p))==value for p,value in zip(paths,before)]
    if not all(unchanged):raise ValueError('Boolean backend mutated input')
    pen=SVGPathPen(None);result.draw(pen)
    return {'operation':record['operation'],'d':pen.getCommands(),'fillRule':'nonzero','area':result.area,'bounds':list(result.bounds),'inputsUnchanged':unchanged,'backend':'skia-pathops','contours':len(list(result.contours))}
