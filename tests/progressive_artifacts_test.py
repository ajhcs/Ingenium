"""Check retained synthetic exercise artifacts, not future model behavior or taste."""
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples/progressive-collaboration"
SVG = "{http://www.w3.org/2000/svg}"


def card_groups(filename):
    root = ET.parse(filename).getroot()
    return [group for group in root.iter(SVG + "g")
            if any(child.tag == SVG + "rect" and child.get("width") == "320"
                   and child.get("height") == "440" for child in group)]


def shape(node, ignored=(), outer=True):
    attributes = {key: value for key, value in node.attrib.items() if key not in ignored}
    if outer:
        attributes.pop("transform", None)  # Board placement, not map geometry.
    return (node.tag, attributes, (node.text or "").strip(),
            [shape(child, ignored, False) for child in node])


class RetainedExerciseArtifacts(unittest.TestCase):
    def test_palette_probe_holds_card_content_geometry_and_type(self):
        cards = card_groups(EXAMPLES / "candidate/palette.svg")
        self.assertGreater(len(cards), 1)
        for card in cards[1:]:
            self.assertEqual(shape(cards[0], {"fill", "stroke"}),
                             shape(card, {"fill", "stroke"}))
        papers = {card.find(SVG + "rect").get("fill") for card in cards}
        self.assertGreater(len(papers), 1)

    def test_lettering_probe_changes_family_with_geometry_and_palette_fixed(self):
        cards = card_groups(EXAMPLES / "candidate/lettering.svg")
        self.assertGreater(len(cards), 1)
        for card in cards[1:]:
            self.assertEqual(shape(cards[0], {"font-family"}),
                             shape(card, {"font-family"}))
        self.assertGreater(len({card.get("font-family") for card in cards}), 1)

    def test_selected_palette_sample_survives_into_lettering_probe(self):
        initial = card_groups(EXAMPLES / "candidate/palette.svg")[0]
        revised = card_groups(EXAMPLES / "candidate/lettering.svg")[0]
        # The first board inherits ink from its parent; the follow-up puts it
        # directly on the card. The complete descendants remain identical.
        self.assertEqual([shape(child) for child in initial],
                         [shape(child) for child in revised])
        self.assertEqual(revised.get("fill"), "#294E40")
        self.assertEqual(revised.find(SVG + "rect").get("fill"), "#F6F3E9")

    def test_settled_edit_changes_only_requested_heading_size(self):
        source = EXAMPLES / "inputs/route.svg"
        expected = source.read_bytes().replace(b'font-size="40"', b'font-size="34"')
        self.assertNotEqual(source.read_bytes(), expected)
        for version in ["baseline", "candidate"]:
            self.assertEqual((EXAMPLES / version / "narrow.svg").read_bytes(), expected)

    def test_all_retained_cards_keep_visible_route_names_and_leg_times(self):
        files = list(EXAMPLES.glob("*/*.svg"))
        self.assertGreaterEqual(len(files), 8)
        for filename in files:
            root = ET.parse(filename).getroot()
            self.assertEqual(root.tag, SVG + "svg")
            visible = " ".join("".join(node.itertext()) for node in root.iter(SVG + "text"))
            for name in ["Library", "Tool Shed", "Greenhouse"]:
                self.assertIn(name, visible, filename)
            for minutes in [12, 8]:
                self.assertRegex(visible, re.compile(rf"\b{minutes}\s+min(?:utes)?\b"))


if __name__ == "__main__":
    unittest.main()
