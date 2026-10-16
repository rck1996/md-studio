# Mobile UI verification

Use this check after changing the main workspace, side panel, or responsive CSS.

## How to view it locally

1. Run the app:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

2. Open `http://127.0.0.1:5174/` in Chrome.
3. Open DevTools.
4. Toggle the device toolbar.
5. Test the viewport matrix below.
6. Reload the page while the mobile viewport is active.

## Required viewports

- Phone: `390 x 844`
- Small phone: `360 x 800`
- Tablet portrait: `768 x 1024`
- Compact notebook: `1024 x 768`
- Standard notebook: `1366 x 768`
- Desktop control: `1440 x 900`
- Device emulation: enabled for phone and tablet

The compact workspace breakpoint is `900px`. JavaScript and CSS must use the same value so the `Dividido` control is never visible when split view is unavailable.

## Critical checks

- `.side-tabs` must be a bottom navigation bar, not a full-screen layer.
- `.side-tabs` height must match `--mobile-nav-height` (`68px` by default).
- Phone navigation must show short labels under its icons; hover-only tooltips are not sufficient on touch screens.
- At `600px` or less the header must use three compact rows: brand/actions, view selector, and document status.
- From `601px` to `900px` the tablet header must remain a wider two-row layout instead of copying the phone layout.
- `.editor-panel` must be visible on first load when `data-view="editor"`.
- No side sheet must open automatically on phone or tablet load.
- `.preview-panel` must be visible after tapping `Vista previa`.
- `.documents-panel`, `.toolbox`, and `.outline-panel` must open as bottom sheets above the bottom navigation.
- The bottom navigation must not cover the editor content except for the reserved bottom padding.
- Switching between `Editor` and `Vista previa` on mobile must close any open side sheet.
- Closing a side sheet on mobile must not change the persisted desktop side-panel preference.
- Explorer, Insert, Outline, and More sheets must scroll independently without moving their navigation controls off-screen.
- Insert must keep its search field visible while its compact two-column block grid scrolls.
- Preferences and Help must scroll inside the dialog; their headers and close controls must remain visible.
- Copy and export actions must announce their result above the bottom navigation without covering it.

## Notebook checks

- From `901px` to `1180px`, keep the desktop three-column model while reducing the explorer width.
- The page itself must not scroll at `1024 x 768` or `1366 x 768`; editor, preview, and explorer own their scroll.
- The left panel must collapse to the activity rail and reopen from either the collapse control or a panel icon.
- Compact explorer actions and filters must keep an accessible label and a visible selected state.
- Editor and preview headers must not show clipped helper text at compact notebook widths.

## Regression that caused a blank mobile screen

Desktop styles set `.side-tabs` to `height: 100%` so the activity rail fills the left column. Mobile must explicitly override that with:

```css
.side-tabs {
  height: var(--mobile-nav-height);
  max-height: var(--mobile-nav-height);
}
```

If this override is missing, the mobile bottom navigation can expand to the full viewport height and visually cover the app.
