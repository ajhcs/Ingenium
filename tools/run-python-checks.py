"""Run the dependency-free Python checks. Native font checks are explicitly selected."""
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


def suite():
    result = unittest.TestSuite()
    for path in sorted((ROOT / "tests").glob("*_test.py")):
        if path.name == "font_vector_test.py":
            continue  # Requires the separately locked native font environment.
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        result.addTests(unittest.defaultTestLoader.loadTestsFromModule(module))
    return result


if __name__ == "__main__":
    (ROOT / "work").mkdir(exist_ok=True)
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(suite()).wasSuccessful() else 1)
