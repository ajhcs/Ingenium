"""Deterministic local data archiver. Never executes packaged code."""
import gzip
import hashlib
import json
import io
import pathlib
import sys
import tarfile
import zipfile


def archive(source, destination, kind):
    source, destination = pathlib.Path(source), pathlib.Path(destination)
    entries = []
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError('symlink member refused')
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError('nonregular member refused')
        entries.append((path.relative_to(source).as_posix(), path.read_bytes()))
    with destination.open('xb') as output:
        if kind == 'tgz':
            with gzip.GzipFile(filename='', fileobj=output, mode='wb', mtime=0, compresslevel=9) as compressed:
                with tarfile.open(fileobj=compressed, mode='w|', format=tarfile.USTAR_FORMAT) as packed:
                    for name, content in entries:
                        info = tarfile.TarInfo('package/' + name)
                        info.size, info.mtime = len(content), 0
                        info.mode = 0o755 if name.startswith('bin/') else 0o644
                        packed.addfile(info, io.BytesIO(content))
        elif kind == 'zip':
            with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as packed:
                for name, content in entries:
                    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                    info.compress_type, info.create_system = zipfile.ZIP_DEFLATED, 3
                    info.external_attr = 0o100644 << 16
                    packed.writestr(info, content)
        else:
            raise ValueError('unsupported archive kind')


def inspect_archive(file, kind):
    entries = []
    def append(name, content):
        if name.startswith('/') or '\\' in name or any(p in ('', '.', '..') for p in name.split('/')):
            raise ValueError('unsafe archive member')
        if any(e['path'] == name for e in entries):
            raise ValueError('duplicate archive member')
        entries.append({'path': name, 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
    if kind == 'tgz':
        with tarfile.open(file, 'r:gz') as packed:
            for member in packed:
                if not member.isfile() or not member.name.startswith('package/'):
                    raise ValueError('nonregular package member')
                append(member.name, packed.extractfile(member).read())
    else:
        with zipfile.ZipFile(file) as packed:
            for member in packed.infolist():
                append(member.filename, packed.read(member))
    return sorted(entries, key=lambda e: e['path'])


if __name__ == '__main__':
    if sys.argv[1] == '--inspect':
        print(json.dumps(inspect_archive(*sys.argv[2:])))
    else:
        archive(*sys.argv[1:])
