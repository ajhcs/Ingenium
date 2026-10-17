#!/usr/bin/env python3
"""Explicit bounded official package acquisition; data extraction only, no install hooks.

Usage: python3 tools/acquire-npm-package.py PACKAGE EXACT_VERSION NEW_DIRECTORY
The caller must authorize this network operation. No denied API request is retried.
"""
import base64
import datetime
import hashlib
import io
import gzip
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request

MAX_PACKAGE = 16_000_000

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def fetch(url, limit, receipt):
    item = {'url': url, 'startedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    receipt.setdefault('requests', []).append(item)
    try:
        with urllib.request.build_opener(NoRedirect()).open(url, timeout=30) as response:
            item['status'] = response.status
            item['headers'] = {k: response.headers[k] for k in ['Content-Type', 'Content-Length', 'Server', 'Via', 'ETag'] if k in response.headers}
            body = response.read(limit + 1)
            if len(body) > limit:
                raise ValueError('Response byte bound exceeded')
            item.update(bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
            return body
    except urllib.error.HTTPError as error:
        body = error.read(65537)
        item.update(exception='HTTPError', status=error.code, bodyCapturedBytes=len(body), bodySHA256=hashlib.sha256(body).hexdigest(), bodyTruncated=len(body) > 65536)
        item['headers'] = {k: error.headers[k] for k in ['Content-Type', 'Content-Length', 'Server', 'Via', 'Retry-After'] if k in error.headers}
        raise ValueError('HTTP refusal; no retry or redirect fallback') from None
    finally:
        item['completedUTC'] = datetime.datetime.now(datetime.timezone.utc).isoformat()

def unpack(body, destination, *, collection_json=False):
    files, seen, total = [], set(), 0
    with gzip.GzipFile(fileobj=io.BytesIO(body)) as compressed:
        expanded = compressed.read(MAX_PACKAGE + 2_000_001)
    if len(expanded) > MAX_PACKAGE + 2_000_000:
        raise ValueError('Archive expansion bound exceeded')
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
        for member in archive:
            name = PurePosixPath(member.name)
            if len(seen) >= 1000 or name.is_absolute() or not name.parts or name.parts[0] != 'package' or '..' in name.parts or '\\' in member.name or str(name) in seen:
                raise ValueError('Unsafe, duplicate or excessive archive paths')
            seen.add(str(name))
            member_limit = 5_000_000 if collection_json and str(name) == 'package/icons.json' else 2_000_000
            if not (member.isfile() or member.isdir()) or member.size > member_limit:
                raise ValueError('Unsupported archive member type/size')
            total += member.size
            if total > MAX_PACKAGE:
                raise ValueError('Unpacked byte bound exceeded')
            path = destination.joinpath(*name.parts)
            if member.isdir():
                path.mkdir(parents=True, exist_ok=True)
                continue
            content = archive.extractfile(member).read(member.size + 1)
            if len(content) != member.size:
                raise ValueError('Truncated archive member')
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as handle:
                handle.write(content)
            files.append({'file': str(name), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
    return files

def main(args):
    if len(args) != 3:
        raise ValueError('Expected PACKAGE EXACT_VERSION NEW_DIRECTORY')
    name, version, output = args
    if not re.fullmatch(r'@(?:fontsource(?:-variable)?|iconify-json)/[a-z0-9-]+|@iconify/utils|bulma|open-props|@radix-ui/colors', name) or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', version):
        raise ValueError('Expected one supported package and exact pinned version, never latest/range')
    target = Path(output).absolute()
    if target.parent.resolve() != target.parent:
        raise ValueError('Output parent must be canonical and already exist')
    target.mkdir()
    receipt = {'name': name, 'packageVersion': version, 'mode': 'official-registry-package', 'scriptsExecuted': False, 'signatureVerification': 'not-run; registry SHA512 integrity is consistency evidence, not signature verification'}
    try:
        url = 'https://registry.npmjs.org/' + urllib.parse.quote(name, safe='@') + '/' + version
        raw = fetch(url, 262144, receipt); metadata = json.loads(raw)
        if metadata.get('name') != name or metadata.get('version') != version:
            raise ValueError('Metadata identity mismatch')
        dist = metadata['dist']
        expected = f'https://registry.npmjs.org/{name}/-/{name.split("/")[-1]}-{version}.tgz'
        if dist['tarball'] != expected or dist.get('unpackedSize', MAX_PACKAGE + 1) > MAX_PACKAGE or dist.get('fileCount', 1001) > 1000:
            raise ValueError('Unsupported distribution URL or size')
        integrity = dist.get('integrity')
        if not isinstance(integrity, str) or not re.fullmatch(r'sha512-[A-Za-z0-9+/]+={0,2}', integrity):
            raise ValueError('Expected registry SHA512 integrity before acquisition')
        expected_digest = base64.b64decode(integrity[7:], validate=True)
        if len(expected_digest) != 64:
            raise ValueError('Expected full SHA512 digest before acquisition')
        (target / 'registry-metadata.json').write_bytes(raw)
        archive = fetch(expected, MAX_PACKAGE, receipt)
        if hashlib.sha512(archive).digest() != expected_digest:
            raise ValueError('Distribution SHA512 mismatch')
        receipt.update(integrity=dist['integrity'], integrityVerified=True, archiveSHA256=hashlib.sha256(archive).hexdigest(), metadataSHA256=hashlib.sha256(raw).hexdigest())
        (target / 'source.tgz').write_bytes(archive)
        receipt['files'] = unpack(archive, target, collection_json=name.startswith('@iconify-json/'))
        manifest = json.loads((target / 'package/package.json').read_text())
        if manifest.get('name') != name or manifest.get('version') != version:
            raise ValueError('Extracted package identity mismatch')
        receipt['status'] = 'acquired-data-only'
    except Exception as error:
        receipt.update(status='error', errorType=type(error).__name__)
        raise
    finally:
        (target / 'ACQUISITION.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'status': receipt['status'], 'name': name, 'version': version, 'archiveSHA256': receipt['archiveSHA256'], 'files': len(receipt['files'])}))

if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except Exception as error:
        print(json.dumps({'status': 'error', 'type': type(error).__name__, 'message': str(error) if isinstance(error, ValueError) else 'Operation failed; inspect retained receipt, no automatic retry'}))
        sys.exit(1)
