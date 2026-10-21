"""Standalone delivery must work without the developer checkout."""
import importlib.util
import pathlib
import re
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
                self.assertTrue(all(name.endswith(".md") or name in allowed_notices for name in names))
                source.extractall(directory / "consumer")
            skill = directory / "consumer/ingenium"
            self.assertEqual((skill / "SKILL.md").read_bytes(),
                             (ROOT / "skills/ingenium/SKILL.md").read_bytes())
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
