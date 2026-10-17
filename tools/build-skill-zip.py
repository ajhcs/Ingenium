"""Build a deterministic guidance-only ZIP; never installs or deploys anything."""
import pathlib
import sys
import zipfile


def build(destination):
    repository = pathlib.Path(__file__).resolve().parents[1]
    skill = repository / "skills" / "ingenium"
    files = [(skill / "SKILL.md", "ingenium/SKILL.md")]
    files.extend((source, "ingenium/" + source.relative_to(skill).as_posix())
                 for source in sorted((skill / "references").glob("*.md")))
    files.append((skill / "LICENSE", "ingenium/LICENSE"))
    # Read before creating the output. No private files, helpers or dependencies.
    contents = [(name, source.read_bytes()) for source, name in files]
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in contents:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, content)
    return len(contents)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 tools/build-skill-zip.py NEW_OUTPUT.zip")
    count = build(pathlib.Path(sys.argv[1]))
    print(f"Created guidance ZIP: {count} files; no helper runtime included.")
