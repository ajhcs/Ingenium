#!/usr/bin/env python3
"""Explicit optional system-fontconfig candidate probe; stdlib only, inert on import.

Usage: python3 tools/probe-method-fonts.py NEW_OUTPUT.json [--library EXISTING_LIB]
       [--notice FONT_BASENAME=EXISTING_NOTICE ...]

Notice mappings are caller assertions, not package ownership verification. No font
bytes are copied. An interrupted run can leave a newly created incomplete output.
"""

import argparse
import ctypes
import ctypes.util
import hashlib
import json
from pathlib import Path
import sys


PATTERNS = (
    "sans-serif", "sans-serif:weight=bold", "serif", "serif:weight=bold", "monospace",
)


def file_identity(path):
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as source:
        while chunk := source.read(65536):
            size += len(chunk)
            digest.update(chunk)
    return {"basename": path.name, "bytes": size, "sha256": digest.hexdigest()}


def notice_evidence(font_name, mappings):
    path = mappings.get(font_name)
    if path is None:
        return {"status": "not-run", "reason": "no-explicit-notice-mapping"}
    try:
        identity = file_identity(path)
        identity["parentBasename"] = path.parent.name
        if identity["bytes"] > 262144:
            raise ValueError("notice-size-limit")
        contents = path.read_text(encoding="utf-8")
        # Only report a declaration from a Debian machine-readable Files: *
        # stanza. Other notice formats still retain their exact file identity.
        declaration = None
        for stanza in contents.split("\n\n"):
            lines = stanza.splitlines()
            if "Files: *" in lines:
                licenses = [line[9:] for line in lines if line.startswith("License: ")]
                if len(licenses) == 1:
                    declaration = {
                        "files": "*", "licenseLabel": licenses[0],
                        "declaresDejaVuChangesPublicDomain":
                            " DejaVu changes are in public domain." in lines,
                    }
                break
        return {
            "status": "recorded", "notice": identity,
            "mappingBasis": "explicit CLI font-basename-to-notice mapping",
            "declaration": declaration,
            "limit": "Caller mapping is not independently verified package ownership or a rights conclusion.",
        }
    except (OSError, UnicodeError, ValueError) as error:
        return {"status": "error", "reason": type(error).__name__}


def bind_library(library):
    signatures = {
        "FcInit": (ctypes.c_int, []),
        "FcGetVersion": (ctypes.c_int, []),
        "FcNameParse": (ctypes.c_void_p, [ctypes.c_char_p]),
        "FcConfigSubstitute": (ctypes.c_int, [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int]),
        "FcDefaultSubstitute": (None, [ctypes.c_void_p]),
        "FcFontMatch": (ctypes.c_void_p, [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]),
        "FcPatternGetString": (ctypes.c_int, [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int, ctypes.POINTER(ctypes.c_char_p)]),
        "FcPatternDestroy": (None, [ctypes.c_void_p]),
    }
    for name, (restype, argtypes) in signatures.items():
        function = getattr(library, name)
        function.restype = restype
        function.argtypes = argtypes


def match_candidate(library, requested, mappings):
    result = {"requested": requested, "status": "error"}
    pattern = match = None
    try:
        pattern = library.FcNameParse(requested.encode("ascii"))
        if not pattern:
            raise ValueError("pattern-parse-failed")
        if not library.FcConfigSubstitute(None, pattern, 0):
            raise ValueError("config-substitution-failed")
        library.FcDefaultSubstitute(pattern)
        code = ctypes.c_int()
        match = library.FcFontMatch(None, pattern, ctypes.byref(code))
        result["fontconfigResult"] = code.value
        if not match or code.value != 0:
            raise ValueError("font-match-failed")
        fields = {}
        for name in ("family", "style", "file"):
            value = ctypes.c_char_p()
            if library.FcPatternGetString(match, name.encode("ascii"), 0, ctypes.byref(value)) != 0 or not value.value:
                raise ValueError("missing-font-property")
            fields[name] = value.value.decode("utf-8")
        font = file_identity(Path(fields["file"]))
        result.update(status="matched", family=fields["family"], style=fields["style"], font=font,
                      licenseEvidence=notice_evidence(font["basename"], mappings))
    except (OSError, UnicodeError, ValueError) as error:
        # Never publish exception messages: native/OS errors can contain paths.
        result["reason"] = str(error) if isinstance(error, ValueError) else type(error).__name__
    finally:
        if match:
            library.FcPatternDestroy(match)
        if pattern:
            library.FcPatternDestroy(pattern)
    return result


def probe(library_selector=None, mappings=None):
    report = {
        "schema": "ingenium-system-font-candidates/1",
        "scope": "Actual system fontconfig candidate resolution for five finite patterns; no glyph shaping or rendering probe.",
        "fontBytesRedistributed": False,
        "exactSharpPerGlyphBinding": {"status": "unknown", "reason": "System fontconfig may differ from the renderer's fontconfig and fallback environment."},
        "systemFontconfig": {"status": "not-run"},
        "candidates": [{"requested": pattern, "status": "not-run"} for pattern in PATTERNS],
    }
    identity = report["systemFontconfig"]
    try:
        selector = library_selector or ctypes.util.find_library("fontconfig")
        if not selector:
            identity["reason"] = "library-unavailable"
            return report
        identity["libraryBasename"] = Path(selector).name
        try:
            library = ctypes.CDLL(selector)
        except OSError:
            identity["reason"] = "library-unavailable-or-unloadable"
            return report
        bind_library(library)
        if not library.FcInit():
            raise ValueError("fontconfig-init-failed")
        version = library.FcGetVersion()
        identity.update(status="present", versionInteger=version,
                        version=f"{version // 10000}.{version // 100 % 100}.{version % 100}")
        report["candidates"] = [match_candidate(library, pattern, mappings or {}) for pattern in PATTERNS]
    except (AttributeError, OSError, ValueError) as error:
        identity.update(status="error", reason=type(error).__name__)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--library", help="Explicit existing trusted fontconfig shared library; no fallback")
    parser.add_argument("--notice", action="append", default=[], metavar="FONT_BASENAME=EXISTING_NOTICE")
    args = parser.parse_args(argv)
    mappings = {}
    for mapping in args.notice:
        name, separator, value = mapping.partition("=")
        if not separator or not name or Path(name).name != name or not value or name in mappings:
            parser.error("Each notice needs a unique FONT_BASENAME=EXISTING_NOTICE mapping")
        mappings[name] = Path(value)
    try:
        # Refuse an existing regular file or symlink before native probing.
        with args.output.open("x", encoding="utf-8") as destination:
            report = probe(args.library, mappings)
            json.dump(report, destination, indent=2, ensure_ascii=False)
            destination.write("\n")
    except (OSError, ValueError) as error:
        print(f"Font report refused or failed ({type(error).__name__}); no existing output overwritten.", file=sys.stderr)
        return 1
    if report["systemFontconfig"]["status"] == "not-run":
        return 2
    if report["systemFontconfig"]["status"] != "present" or any(
        item["status"] != "matched" or item["licenseEvidence"]["status"] == "error"
        for item in report["candidates"]
    ):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
