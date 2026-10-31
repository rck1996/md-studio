# markEDdown — Editorial Workspace (2026)

## Design intent

markEDdown is a **working Markdown editor**, not a promotional landing page. Its visual identity belongs to the RCK1996 Studio family: technical editorial typography, celestial drafting geometry, warm paper, original engraved-feather motif, and restrained ink/orange accents. No Japanese text or katakana appears in the app branding.

The art direction references the [RCK1996 Studio Style Guide](https://github.com/rck1996/profile-portfolio/blob/main/style-guide.html). Desktop follows a split workspace with explorer, source editor, and rendered document; mobile shows one writing surface at a time.

## Real application flow

1. **Create or select** a folder or document from Explorer. Both original handlers remain unchanged.
2. **Write** in CodeMirror. Markdown shortcuts, slash commands, images, drag-and-drop, and history continue to use the existing runtime.
3. **Review** using Split, Editor, or Vista previa. Split is only offered on large screens; mobile has Editor/Vista previa and keeps the original bottom navigation.
4. **Inspect** validation, assets, and notes via the existing Inspector control.
5. **Export** with the new *Exportar ↗* button. It opens the existing full actions menu, with working Markdown, HTML, assets ZIP, copy, and presentation commands. No new export engine or duplicate storage is introduced.
6. **Search** with the top-bar shortcut; the existing editor search implementation is used.
7. **Change theme** via the original theme action. The workspace is midnight by default for new users; existing preference is honored.

The bottom status strip mirrors the actual save indicator and document statistics; it is not a fabricated saved/sync indicator.

## Visual tokens

The original styles remain modular. `src/styles/studio-theme.css` is the final cascade layer imported after `responsive.css`. It maps the original semantic variables to the studio palette without overriding application data or persisted keys.

| Surface | Dark | Light |
| --- | --- | --- |
| Workspace bg | `#020b1b` | `#e9e4da` |
| Panel | `#041126` | `#f5f1e7` |
| Primary text | `#f1eddf` | `#171919` |
| Active accent | `#ef6330` | `#e34b12` |
| Code and drafting detail | `#5e9eff` (secondary) | `#de4a17` |
| Preview paper | `#f5f1e7` | `#f5f1e7` |

Preview remains paper-toned in both themes for readability. The interface, editor gutters, menus, and surrounding panels change theme.

- Wordmark: `markEDdown`, with **ED** highlighted.
- Display: Cormorant Garamond / Georgia; utility headings: Barlow Condensed; body: DM Sans; code: JetBrains Mono fallback.
- Brand icon: `public/assets/logo/markeddown-studio-icon.svg`, an original feather, solar disk, and technical grid.
- Full vector lockup: `public/assets/logo/markeddown-studio-wordmark.svg`.

## Implementation boundaries

- `src/app/studio-flow.js` wires *New*, *Search*, and *Export* to existing application actions. It updates the visual status strip and browser theme color.
- No storage schema, document IDs, history, serialization, export internals, or Markdown rendering logic is changed by this design pass.
- The only application runtime change is a **dark default for new visitors**. Existing saved `themeKey` values have priority.
- Do not add externally sourced manga artwork as a production asset without verified permission.
- Avoid decorative animation in CodeMirror or over the paper view.

## QA checklist before merge

- [ ] `npm ci` and `npm run build` succeed.
- [ ] Dark and light themes switch correctly and survive reload.
- [ ] Previously saved documents, folders, assets, preferences, and history still load.
- [ ] Creating documents via Explorer and the new top-bar shortcut works.
- [ ] Search opens the existing CodeMirror search interface.
- [ ] Exportar opens the existing menu; download .md, HTML, assets ZIP, and copy options work.
- [ ] Split, Editor, and Vista previa show the expected panels at widths 1440, 1024, 900, 390, and 320 px.
- [ ] Mobile bottom navigation, inspector, slash commands, focus mode, and on-screen keyboard remain usable.
- [ ] Keyboard focus, contrast, reduced-motion behavior, and responsive overflow are checked.
- [ ] No Japanese-language decorative text is present in UI or assets.

## Deployment

This change is intended for review as a pull request. Do not deploy to production until the branch build and manual workflow checks are complete.
