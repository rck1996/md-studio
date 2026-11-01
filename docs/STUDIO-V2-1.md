# MarkEDdown Studio 2.1 / Pocket

**Branch:** `feat/studio-2-desktop-pocket`  
**PR:** https://github.com/rck1996/mded/pull/4  
**Status:** feature branch for review, **not merged or deployed**.

## Product direction

An editorial writing studio with two cohesive interfaces backed by the **same local Markdown data**:

- **Desktop / Studio:** deep navy editorial header, explorer and project library, focused split-view CodeMirror, reading preview, full graph and composition mode.
- **Pocket / touch:** home, document library, Markdown source, direct visual composition, reading mode, tools sheet, search, backup and sharing.

## Implemented in this iteration

### Visual composition

- Tap a plain heading or paragraph to edit **directly in the rendered sheet**.
- Select text to open a contextual **Bold / Italic / Link** toolbar. Formatting writes native Markdown; links require a user-supplied valid URL.
- Toggle task list checkboxes in a read/edit hybrid view.
- Advanced blocks (code, tables, enriched inline formatting and wiki-link structures) are rendered safely and expose a **source edit** control.
- CodeMirror stays the source of truth, mutations are guarded by matching expected Markdown ranges. No irreversible HTML-to-Markdown round-trip.
- Studio and Pocket use the same editor model and document IDs.

**Limit:** This is a progressive block composer, not full Notion-style WYSIWYG; inline rich-format selection and advanced table editing remain future work.

### Data safety

- Local ZIP of documents, folder structure, version history, image and link token stores, user preferences.
- Import validates manifest format, key names, document shape and size before offering the destructive replacement.
- Explicit confirmation before restoring, best-effort rollback if localStorage writes fail.
- Existing unsaved-state indicator and emergency Markdown export are preserved.

**Limit:** ZIP restoration is local and not equivalent to cloud sync. Quota/storage failure needs additional stress and real-device testing.

### Offline PWA

- Standalone manifest and 192/512px Android install icons.
- Service worker caches built app shell plus recursively referenced production JS/CSS chunks.
- One-time caching of UI media assets; documents stay in localStorage.
- Production offline smoke test verifies CodeMirror and visual composer reload, and Markdown edits persist without network.

**Limit:** A Chromium simulation does not guarantee Samsung Internet, Android keyboard, background lifecycle or all deployment/service-worker cache update scenarios.

### Android share target

- Uses PWA Web Share Target GET parameters for text and web URLs, where supported.
- Prompts the user with an editable review sheet **before** creating a local Markdown document.
- Does not auto-import content or visit shared URLs.
- Rejects unsafe URL protocols in the URL field; saved text remains ordinary local Markdown.

### Connected notes graph

- Searchable graph across documents, zoom controls, filter to directly connected notes.
- Renders at most 100 visible nodes; all documents remain searchable and represented in a list.
- Keyboard operable nodes and routes back to the document editor.
- No server or indexed database required for this iteration.

## QA suite

GitHub Actions workflow `.github/workflows/studio-v2-visual.yml` runs:

1. `npm test`, `npm run build`.
2. `scripts/studio-v2-flows.mjs` — 23 core user journeys.
3. `scripts/studio-v2-crud-audit.mjs` — 16 document lifecycle flows.
4. `scripts/studio-v3-flows.mjs` — 13 visual writing/backup/restore/formatting flows.
5. `scripts/studio-v3-graph.mjs` — 5 graph scaling/search flows.
6. `scripts/studio-v3-share.mjs` — 6 Android share flow scenarios.
7. `scripts/studio-v2-screenshots.mjs` — 21 desktop + mobile real screenshots.
8. `scripts/studio-v3-pwa.mjs` — offline built-app launch and editing test.

Before considering a production merge, require a **successful run on the current head SHA**, the 19 captures inspected on both themes, and manual device checks.

## Still needed to match the long-term vision

- Rich inline visual formatting with a lossless Markdown engine for complex blocks.
- Visual editing of multirow tables and code cells without Markdown corruption.
- Semantic source-to-preview selection and linked scrolling.
- Keyboard-aware toolbar and context menus validated on a real Samsung S25+.
- IndexedDB migration **after** robust backup/recovery and quota testing.
- Accessible color contrast/keyboard/screenreader audit and stress tests for very large documents.
- First-party Mermaid rendering and richer link graph interactions.
- Optional sync, only if the owner elects to add a backend in the future.

**Do not merge or deploy without a new review.**
