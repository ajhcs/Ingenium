"""Standalone delivery must work without the developer checkout."""
import importlib.util
import json
import pathlib
import re
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("bundle", ROOT / "tools/build-skill-zip.py")
bundle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundle)


class GuidanceBundleTest(unittest.TestCase):
    def test_extracted_guidance_has_unchanged_entrypoint_and_resolving_references(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as directory:
            directory = pathlib.Path(directory)
            archive = directory / "skill.zip"
            bundle.build(archive)
            self.assertEqual(archive.read_bytes(),
                             (ROOT / "site/assets/downloads/ingenium-skill.zip").read_bytes())
            with zipfile.ZipFile(archive) as source:
                names = source.namelist()
                self.assertTrue(all(name.startswith("ingenium/") for name in names))
                notices = ("LICENSE", "LICENSE-IMPECCABLE", "NOTICE-IMPECCABLE")
                allowed_notices = {"ingenium/" + name for name in notices}
                self.assertTrue(allowed_notices.issubset(names))
                editable_examples = {"ingenium/assets/responsive-starter.html"}
                self.assertTrue(editable_examples.issubset(names))
                self.assertTrue(all(name.endswith(".md") or name in allowed_notices or
                                    name in editable_examples for name in names))
                source.extractall(directory / "consumer")
            skill = directory / "consumer/ingenium"
            self.assertEqual((skill / "SKILL.md").read_bytes(),
                             (ROOT / "skills/ingenium/SKILL.md").read_bytes())
            self.assertEqual((skill / "assets/responsive-starter.html").read_bytes(),
                             (ROOT / "skills/ingenium/assets/responsive-starter.html").read_bytes())
            self.assertEqual((skill / "LICENSE").read_bytes(), (ROOT / "LICENSE").read_bytes())
            for notice in notices:
                self.assertEqual((skill / notice).read_bytes(),
                                 (ROOT / "skills/ingenium" / notice).read_bytes())
            for document in skill.rglob("*.md"):
                for target in re.findall(r"\]\(([^)]+)\)", document.read_text(encoding="utf-8")):
                    if re.match(r"https?://|#", target):
                        continue
                    resolved = (document.parent / target.split("#")[0]).resolve()
                    self.assertTrue(resolved.is_relative_to(skill), (document, target))
                    self.assertTrue(resolved.is_file(), (document, target))

    def test_guidance_release_identity_is_markdown_only_and_preserves_shared_build(self):
        version = json.loads((ROOT / "package.json").read_text())["version"]
        identity = {"schema": "ingenium-release/1", "version": version,
                    "sourceRevision": "a" * 40, "sourceTree": "b" * 40,
                    "buildId": "c" * 64, "artifactFlavor": "guidance"}
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as directory:
            archive = pathlib.Path(directory) / "prepared.zip"
            bundle.build(archive, identity=identity)
            self.assertLessEqual(archive.stat().st_size, 512 * 1024)
            with zipfile.ZipFile(archive) as source:
                release = source.read("ingenium/RELEASE.md").decode()
                self.assertIn("version: " + version, release)
                self.assertIn("buildId: " + "c" * 64, release)
                self.assertFalse(any(name.endswith((".mjs", ".js", ".json", ".py")) for name in source.namelist()))

    def test_source_zip_content_identity_does_not_depend_on_checkout_commit(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as directory:
            directory = pathlib.Path(directory)
            source = directory / "source"
            source.mkdir()
            shutil.copytree(ROOT / "skills", source / "skills")
            shutil.copyfile(ROOT / "package.json", source / "package.json")
            subprocess.run(["git", "init", "-q", str(source)], check=True)
            subprocess.run(["git", "-C", str(source), "add", "."], check=True)
            bundle.build(directory / "first.zip", repository=source)
            subprocess.run(["git", "-C", str(source), "-c", "user.name=Synthetic test", "-c", "user.email=synthetic@example.invalid", "commit", "-qm", "Synthetic guidance fixture"], check=True)
            bundle.build(directory / "second.zip", repository=source)
            self.assertEqual((directory / "first.zip").read_bytes(), (directory / "second.zip").read_bytes())
            with zipfile.ZipFile(directory / "second.zip") as archive:
                release = archive.read("ingenium/RELEASE.md").decode()
                self.assertIn("sourceRevision: not-stamped", release)
                self.assertIn("prepared: False", release)

    def test_reproducible_archive_refuses_existing_output(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "work") as directory:
            first, second = (pathlib.Path(directory) / name for name in ("a.zip", "b.zip"))
            bundle.build(first)
            bundle.build(second)
            original = first.read_bytes()
            self.assertEqual(original, second.read_bytes())
            with self.assertRaises(FileExistsError):
                bundle.build(first)
            self.assertEqual(original, first.read_bytes())


if __name__ == "__main__":
    unittest.main()
