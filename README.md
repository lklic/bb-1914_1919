# Bernard Berenson — Pocket Diaries 1914 & 1919

A static website for reviewing Bernard Berenson's pocket appointment diaries (1914 and 1919):
cleaned & straightened page images in a IIIF page-turner, with a **diplomatic transcription**
beneath every page and a reconstructed **itinerary** for mapping his movements.

👉 **Open `index.html`** (or the GitHub Pages site) to browse. **`itinerary.html`** has the route + mapping data.

## What's here
- **4 diaries** — 1914 Jan–Jun, 1914 Jul–Dec, 1919 Jan–Jun, 1919 Jul–Dec.
- **364 page images** (`images/`) — the open book split into single pages at the gutter, straightened,
  uniform size. A two-page "book" view rejoins them seamlessly.
- **364 transcriptions** (`transcriptions/*.md`) — one Markdown file per page, two printed days each
  where applicable; printed text (dates, liturgical/astronomical notes) is distinguished from
  Berenson's handwriting.
- **IIIF Presentation 3.0 manifests** (`iiif/*.json`) — one per diary; openable in Mirador etc.
- **Itinerary & mapping data** (`data/`) — narrative itineraries (`itinerary_1914.md`,
  `itinerary_1919.md`), a per-spread `itinerary.json`, and a flat `locations.csv`
  (`book, spread, dates, location, country, confidence, activity`) ready for geocoding.

## The viewer
- Tabs switch between the four diaries; ← / → (or the arrows) flip pages; the slider and
  filmstrip jump anywhere; deep-links like `#BB_1919_Jan-Jun/75` address a specific page.
- Single-page or two-page **book** view (toggle, top right). Pan/zoom via OpenSeadragon.
- Each page shows its dates, a **📍 location** badge, the transcription (handwriting in a script
  face, uncertainties as `[?]`/`[illegible]`), and place/person chips.

## About the transcription
Berenson's hand is notoriously difficult. These are **best-effort diplomatic** transcriptions:
spelling is left as written, uncertain words are marked `word[?]`, illegible stretches `[illegible]`,
and mirror-reversed **bleed-through** from the facing leaf was deliberately ignored. A second,
chronological "logic" pass used geographic and date continuity to place each spread and to correct
obvious mis-readings of place names (e.g. `GRAADA → Granada`, `VICH → Vic`). Treat readings of names
and the inferred locations as scholarly hypotheses to verify, not ground truth.

## Editing transcriptions
Every page in the viewer has an **✎ Edit transcription** link that opens that page's Markdown file
directly in GitHub's editor. Edit the text, commit (or open a pull request) — no local setup needed.

The viewer renders from `data.json`, not the `.md` files, so a GitHub Action keeps them in sync:
- `.github/workflows/rebuild-data.yml` runs on any push to `transcriptions/**/*.md`.
- It runs `tools/build_data_from_md.py`, which parses the Markdown back into `data.json` and commits
  the result. The next page load shows the edit.

What you can edit in Markdown: the day headings (`## November 27 — Thursday`), printed notes
(`*(printed: …)*`), handwritten lines (`> …`), loose/non-dated text, and the `places:` / `people:` /
`location:` / `page_type:` frontmatter. Keep the frontmatter list style (one `- item` per line) so
values containing commas survive intact.

To rebuild locally instead of via the Action: `python tools/build_data_from_md.py`.
(Full image/IIIF rebuilds from the source spread JSON still live in `_work/build_site_data.py`.)

## Provenance
Generated from four source PDF scans. Embedded ~400 ppi JPEGs were extracted losslessly, the book
detected/deskewed/cropped, and split at the gutter (no borders trimmed). Transcription and itinerary
reconstruction were performed by Claude (Opus 4.8) vision agents.
