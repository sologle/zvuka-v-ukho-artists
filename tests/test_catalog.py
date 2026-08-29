from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ArtistCatalogPageTests(unittest.TestCase):
    def test_categories_overlap_without_duplicate_names_inside_each_category(self) -> None:
        catalog = json.loads((ROOT / "data" / "artists.json").read_text(encoding="utf-8"))

        popular = catalog["popular"]
        cis = catalog["cis"]
        world = catalog["world"]
        self.assertEqual(len(popular), 298)
        self.assertEqual(len(cis), 476)
        self.assertEqual(len(world), 1291)
        self.assertEqual(len(popular), len(set(popular)))
        self.assertEqual(len(cis), len(set(cis)))
        self.assertEqual(len(world), len(set(world)))
        self.assertTrue(set(popular) <= (set(cis) | set(world)))
        self.assertFalse(set(cis) & set(world))

    def test_page_loads_external_assets_and_accessible_category_controls(self) -> None:
        page = (ROOT / "index.html").read_text(encoding="utf-8")

        self.assertIn('href="styles.css"', page)
        self.assertIn('src="app.js"', page)
        self.assertIn('data-category="popular"', page)
        self.assertIn('data-category="cis"', page)
        self.assertIn('data-category="world"', page)
        self.assertIn('aria-expanded="true"', page)
        self.assertGreaterEqual(page.count('aria-expanded="false"'), 2)

    def test_styles_pin_open_category_and_prevent_mobile_overflow(self) -> None:
        styles = (ROOT / "styles.css").read_text(encoding="utf-8")

        self.assertIn("position: sticky", styles)
        self.assertIn("min-width: 0", styles)
        self.assertIn("max-width: 100%", styles)
        self.assertIn("overflow-x: clip", styles)

    def test_search_result_status_resynchronizes_sticky_header_offset(self) -> None:
        script = (ROOT / "app.js").read_text(encoding="utf-8")
        filter_body = script.split("function filterArtists", 1)[1].split(
            "function clearSearch",
            1,
        )[0]

        self.assertIn("syncSearchHeight();", filter_body)


if __name__ == "__main__":
    unittest.main()
