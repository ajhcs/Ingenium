"""Explicit optional Python qualification; all sources are original synthetic fixtures."""
import copy, json, math, os, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools/font-vector'))
from fonts import make_master,compile_master,shape_proof,validate_master,bounded_master
from vectors import normalize,boolean,guarded_svg
from ufoLib2 import Font
from ufoLib2.objects import Component

class FontVectorTests(unittest.TestCase):
    def setUp(self):self.root=Path(tempfile.mkdtemp(prefix='fv-python-',dir=ROOT/'work'))
    def master(self):
        path=self.root/'Master.ufo';spec=make_master(path);return path,spec
    def test_editable_ufo_roundtrip_and_deterministic_compile(self):
        path,spec=self.master();f=Font.open(path,lazy=False);validate_master(f,spec);f.save(self.root/'Roundtrip.ufo')
        a=compile_master(path,self.root/'a.ttf');b=compile_master(self.root/'Roundtrip.ufo',self.root/'b.ttf')
        self.assertEqual(a['sha256'],b['sha256']);self.assertEqual(len(a['cmap']),45)
        self.assertEqual(a['metrics']['ascent'],900);self.assertEqual(a['metrics']['descent'],-200);self.assertEqual(a['metrics']['lineGap'],100)
        self.assertEqual(a['metrics']['advances']['acutecomb'][0],0)
    def test_exact_binary_actual_shaping(self):
        path,_=self.master();r=compile_master(path,self.root/'a.ttf');s=shape_proof(self.root/'a.ttf')['results']
        self.assertEqual(s['fontSha256'],r['sha256']);self.assertEqual(s['kernOff'][0]['advance']-s['kernOn'][0]['advance'],80)
        self.assertEqual(s['ligaOn'][0]['name'],'f_i');self.assertEqual(len(s['ligaOff']),2)
        self.assertEqual((s['markOn'][1]['advance'],s['markOn'][1]['x'],s['markOn'][1]['y']),(0,-310,740))
        self.assertEqual(s['markOff'][1]['y'],0)
    def test_missing_unicode_and_required_glyph_refuse(self):
        path,spec=self.master();f=Font.open(path);f['A'].unicodes=[]
        with self.assertRaisesRegex(ValueError,'Missing required'):validate_master(f,spec)
        f=Font.open(path);del f['.notdef']
        with self.assertRaisesRegex(ValueError,'notdef'):validate_master(f,spec)
    def test_missing_and_cyclic_components_refuse(self):
        path,spec=self.master();f=Font.open(path);f['A'].components.append(Component('missing'))
        with self.assertRaisesRegex(ValueError,'Malformed component'):validate_master(f,spec)
        f=Font.open(path);f['A'].components.append(Component('Aacute'))
        with self.assertRaisesRegex(ValueError,'Cyclic'):validate_master(f,spec)
    def test_malformed_metrics_features_and_anchors_refuse(self):
        path,spec=self.master()
        for change in [lambda f:setattr(f['A'],'width',float('nan')),lambda f:setattr(f['A'].contours[0].points[0],'x',float('inf')),lambda f:setattr(f.features,'text','include(/private/file);'),lambda f:f['A'].anchors.clear(),lambda f:f.groups.clear()]:
            f=Font.open(path);change(f)
            with self.assertRaises(ValueError):validate_master(f,spec)
    def test_source_symlinks_and_unbounded_content_refuse(self):
        path,_=self.master();(path/'evil.glif').symlink_to(ROOT/'LICENSE')
        with self.assertRaisesRegex(ValueError,'symlinks'):bounded_master(path)
        (path/'evil.glif').unlink();(path/'large.glif').write_bytes(b'x'*65537)
        with self.assertRaisesRegex(ValueError,'bounded'):bounded_master(path)
    def test_review_regressions_metrics_composite_and_symlink_ancestors(self):
        path,spec=self.master()
        for field,value in [('openTypeHheaAscender',100),('openTypeOS2TypoLineGap',0),('descender',-50)]:
            f=Font.open(path);setattr(f.info,field,value)
            with self.assertRaisesRegex(ValueError,'metric contract'):validate_master(f,spec)
        f=Font.open(path);del f['Aacute']
        with self.assertRaisesRegex(ValueError,'composite specimen'):validate_master(f,spec)
        f=Font.open(path);f['A'].width=100
        with self.assertRaisesRegex(ValueError,'advance metric'):validate_master(f,spec)
        link=self.root/'alias';link.symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,'symlink ancestors'):bounded_master(link/'Master.ufo')
    def operand(self,d,fill='nonzero'):return {'d':d,'fillRule':fill}
    def test_boolean_union_intersection_difference_without_input_mutation(self):
        left=self.operand('M0 0H100V100H0Z');right=self.operand('M50 0H150V100H50Z')
        for op,area in [('union',15000),('intersection',5000),('difference',5000)]:
            record={'operation':op,'left':left,'right':right};original=copy.deepcopy(record);r=boolean(record)
            self.assertAlmostEqual(r['area'],area);self.assertEqual(record,original);self.assertEqual(r['inputsUnchanged'],[True,True])
    def test_holes_and_explicit_winding_are_distinct(self):
        d='M0 0H100V100H0Z M20 20H80V80H20Z';right=self.operand('M150 0H160V10H150Z')
        even=boolean({'operation':'union','left':self.operand(d,'evenodd'),'right':right});nonzero=boolean({'operation':'union','left':self.operand(d),'right':right})
        self.assertAlmostEqual(even['area'],6500);self.assertAlmostEqual(nonzero['area'],10100)
        self.assertGreater(even['contours'],nonzero['contours'])
    def test_near_coincident_edges_have_bounded_residual(self):
        left=self.operand('M0 0H100V100H0Z');right=self.operand('M99.9999 0H199.9999V100H99.9999Z')
        for op,area in [('union',19999.99),('intersection',.01),('difference',9999.99)]:self.assertAlmostEqual(boolean({'operation':op,'left':left,'right':right})['area'],area,delta=.02)
    def test_normalization_flattens_transform_clip_and_stroke_separately(self):
        source=(ROOT/'examples/font-vector/vector-source.svg').read_bytes();result=normalize(source)
        self.assertIn(b'<path',result);self.assertNotIn(b'transform=',result);self.assertNotIn(b'clip-path=',result);self.assertNotIn(b'stroke=',result);self.assertNotEqual(source,result);guarded_svg(result)
    def test_unsupported_masks_filters_css_and_nonrectangular_clips_refuse(self):
        for content in ['<mask/>','<filter/>','<image href="https://example.org/a"/>','<path style="fill:red" d="M0 0H10V10Z"/>','<defs><clipPath id="c"><circle r="5"/></clipPath></defs>','<path filter="url(#f)" d="M0 0H10V10Z"/>']:
            source=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{content}</svg>'.encode()
            with self.assertRaises(ValueError):normalize(source)
    def test_unsafe_xml_declarations_namespaces_and_references_refuse(self):
        for source in [b'<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">&x;</svg>',b'<?evil x?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><foreignObject/></svg>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g clip-path="url(https://example.org/a)"/></svg>']:
            with self.assertRaises(ValueError):normalize(source)
    def test_vector_resource_and_nonfinite_coordinates_refuse(self):
        for source in [b'x'*1048577,b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0L1e999 2Z"/></svg>',b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+b'<g>'*25+b'</g>'*25+b'</svg>']:
            with self.assertRaises(ValueError):normalize(source)
    def test_boolean_explicit_fill_and_unsupported_operation_refuse(self):
        for record in [{'operation':'xor','left':{},'right':{}},{'operation':'union','left':{'d':'M0 0H1V1Z'},'right':self.operand('M0 0H1V1Z')}]:
            with self.assertRaises(ValueError):boolean(record)
    def test_review_regression_incomplete_commands_negative_arc_and_nonfinite_refuse(self):
        for d in ['M0 0H10V10Z M','M0 0 A-5 5 0 0 0 10 10','M0 0 A5 5 0 2 0 10 10']:
            source=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="{d}"/></svg>'.encode()
            with self.assertRaises(ValueError):normalize(source)

if __name__=='__main__':unittest.main()
