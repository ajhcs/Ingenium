import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import json

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('acquire', ROOT / 'tools/acquire-npm-package.py')
acquire = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acquire)

def archive(members):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as handle:
        for name, content, link in members:
            info = tarfile.TarInfo(name)
            if link:
                info.type = tarfile.SYMTYPE
                info.linkname = content
                handle.addfile(info)
            else:
                data = content.encode()
                info.size = len(data)
                handle.addfile(info, io.BytesIO(data))
    return output.getvalue()

class AcquisitionBoundary(unittest.TestCase):
    def destination(self):
        return Path(tempfile.mkdtemp(prefix='acquire-test-', dir=ROOT / 'work'))

    def test_extracts_exact_data_without_executing_scripts(self):
        target = self.destination()
        data = archive([('package/package.json', '{"scripts":{"install":"never run"}}', False), ('package/a.css', 'a{color:red}', False)])
        result = acquire.unpack(data, target)
        self.assertEqual(len(result), 2)
        self.assertEqual((target / 'package/a.css').read_text(), 'a{color:red}')

    def test_refuses_traversal_symlink_duplicate_and_foreign_root(self):
        for members in [[('package/../outside', 'bad', False)], [('package/link', '/etc/passwd', True)], [('package/a', 'x', False), ('package/a', 'y', False)], [('other/a', 'x', False)]]:
            with self.assertRaises(ValueError):
                acquire.unpack(archive(members), self.destination())

    def test_rejects_unpinned_or_unapproved_package_before_network(self):
        for args in [['@fontsource/inter', 'latest', 'unused'], ['@unknown/code', '1.0.0', 'unused']]:
            with self.assertRaises(ValueError):
                acquire.main(args)

    def test_invalid_integrity_refuses_before_tarball_download(self):
        for integrity in ['sha256-AAAA', 'sha512-@@@@', 'sha512-AAAA']:
            metadata = {'name': '@fontsource/inter', 'version': '1.0.0', 'dist': {'tarball': 'https://registry.npmjs.org/@fontsource/inter/-/inter-1.0.0.tgz', 'fileCount': 1, 'unpackedSize': 1, 'integrity': integrity}}
            with patch.object(acquire, 'fetch', return_value=json.dumps(metadata).encode()) as fetch:
                with self.assertRaises(ValueError):
                    acquire.main(['@fontsource/inter', '1.0.0', str(self.destination() / 'new')])
                self.assertEqual(fetch.call_count, 1)

if __name__ == '__main__':
    unittest.main()
