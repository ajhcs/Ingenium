# Original worked studies

Four fictional studies with editable vector or HTML/CSS/JavaScript sources. They demonstrate different deliverables and revisions within a constrained local font pack. They are prototypes for review; they do not establish cross-style range, audience success, production suitability or improvement over a baseline.

Run with Node 22 or newer from the installed package root. Each output directory must be new and its parent must exist:

```sh
node examples/worked/common-ground/build.mjs NEW_COVER_DIRECTORY
node examples/worked/fieldwork/build.mjs NEW_WEB_DIRECTORY
node examples/worked/manyfold/build.mjs NEW_IDENTITY_DIRECTORY
node examples/worked/junction-house/build.mjs NEW_SIGN_DIRECTORY
```

Generators use only Node built-ins and selected local fonts. They do not install software, access the network or modify their source. Keep each generated `FONT-NOTICES.txt` with its artifacts. Existing output directories are refused to preserve earlier work. An interrupted generation can leave a partial directory; choose a new destination for another attempt.

| Study | Editable result | Observed review and limits |
| --- | --- | --- |
| Common Ground | 210×280mm publication cover; text, nested open curves, issue and price | Full-size and 240px-wide previews inspected; small supporting copy has limited thumbnail legibility. Print production and editor import untested. |
| Fieldwork | Responsive page; three original project illustrations; keyboard selector; contact links; standalone embedded-font HTML | Desktop 1440×900 and mobile 390×844 inspected; mobile contact revised to its own 13px row with a 44px-high target. Final 320px and increased text-spacing states retain content without horizontal overflow; stress wrapping splits a long word. Keyboard selection and reduced motion exercised. No audience study or broad browser qualification. |
| Manyfold | 1200×900 identity sheet; A3 poster; three variants; one-ink symbol; native 32px mark; structural alternatives and grammar JSON | Rounded, chamfered and stepped pieces exchange positions within fixed sockets. The poster invitation occupies the open socket. At 32px, profile details weaken. Earlier stacked-chevron study was superseded after critique. No novelty/award/print acceptance claim. |
| Junction House | 800×1200 directory; two 1200×400 directions; four 600×200 destination signs; explicit routes in JSON | Facing north: west LEFT to Workshop A/Toilets; east RIGHT to Event Hall/Cafe; Reception in Lobby. Diagonal tool icon replaced with a nondirectional workbench. Symbols remain paired with words. Visitor comprehension, mounting, distance and regulatory suitability untested. |

SVG generators embed exact selected font bytes for a portable text source. SVG font support varies by client; browser inspection used inline SVG with font readiness checks. Generic image renderers or editor imports may substitute fonts. The optional SVG helper's strict static admission can refuse embedded font styles; it is not a universal renderer for these studies. Use a compatible local browser for a clean preview and verify its actual font behavior. A physical dimension in an SVG is not a print-production qualification.

Fieldwork's `standalone.html` opens without external resources; its separate HTML/CSS/JS and copied fonts remain editable. Contact links use the reserved `.example` domain and do not represent a live organization. Original vector artwork and code use MIT. The three unmodified DejaVu 2.37 files have separate font rights: see [font notices](fonts/FONT-NOTICES.txt) and [exact hashes](fonts/manifest.json). No private brief, benchmark reference, annotation or review receipt is distributed.
