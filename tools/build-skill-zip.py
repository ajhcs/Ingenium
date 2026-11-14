"""Build a deterministic guidance-only ZIP; never installs or deploys anything."""
import pathlib
import hashlib
import json
import subprocess
import sys
import zipfile


def build(destination, *, repository=None, identity=None):
    repository = pathlib.Path(repository or pathlib.Path(__file__).resolve().parents[1])
    skill = repository / "skills" / "ingenium"
    files = [(skill / "SKILL.md", "ingenium/SKILL.md")]
    files.extend((source, "ingenium/" + source.relative_to(skill).as_posix())
                 for source in sorted((skill / "references").rglob("*.md")))
    for notice in ("LICENSE", "LICENSE-IMPECCABLE", "NOTICE-IMPECCABLE"):
        files.append((skill / notice, "ingenium/" + notice))
    # Ignore rules are a packaging boundary, not permission to bundle private notes.
    visible = set(subprocess.check_output(["git", "-C", str(repository), "ls-files", "--cached", "--others", "--exclude-standard", "-z"], text=True).split("\0"))
    for source, _ in files:
        relative = source.relative_to(repository).as_posix()
        if relative not in visible:
            raise ValueError("Guidance source is not Git-visible: " + relative)
        current = source
        while current != repository:
            if current.is_symlink():
                raise ValueError("Symlink guidance source refused: " + relative)
            current = current.parent
    # Read before creating the output. No private files, helpers or dependencies.
    contents = [(name, source.read_bytes()) for source, name in files]
    if identity is None:
        version = json.loads((repository / "package.json").read_text())["version"]
        # This public source ZIP is checked into the tree it describes. A commit/tree
        # stamp would be circular and make the unchanged ZIP stale after every commit.
        source_files = [{"path": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
                        for name, content in contents]
        content_hash = hashlib.sha256(json.dumps(source_files, sort_keys=True).encode()).hexdigest()
        build_id = hashlib.sha256(json.dumps({"version": version, "sourceContentSHA256": content_hash}, sort_keys=True).encode()).hexdigest()
        identity = {"schema": "ingenium-guidance-source/1", "version": version,
                    "sourceRevision": "not-stamped", "sourceTree": "not-stamped",
                    "sourceContentSHA256": content_hash, "buildId": build_id,
                    "artifactFlavor": "guidance", "prepared": False, "development": True}
    text = "# Release identity\n\n" + "\n".join(f"{key}: {value}" for key, value in identity.items()) + "\n"
    contents.append(("ingenium/RELEASE.md", text.encode()))
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in contents:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, content)
    if pathlib.Path(destination).stat().st_size > 512 * 1024:
        raise ValueError("Guidance compressed budget exceeded; request reviewed adjustment")
    return len(contents)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 4):
        sys.exit("Usage: python3 tools/build-skill-zip.py NEW_OUTPUT.zip [SOURCE_ROOT IDENTITY.json]")
    options = {} if len(sys.argv) == 2 else {"repository": sys.argv[2], "identity": json.loads(pathlib.Path(sys.argv[3]).read_text())}
    count = build(pathlib.Path(sys.argv[1]), **options)
    print(f"Created guidance ZIP: {count} files; no helper runtime included.")
