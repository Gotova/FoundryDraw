# Changelog

## 1.3.6 - 2026-06-08
- (Bitte Aenderungen hier eintragen)


## 1.3.5 - 2026-06-08
- Remove: Confirmation dialog before clearing the canvas


## 1.3.4 - 2026-06-08
- Fix: Override Foundry's global `flex: 1` on .window-content children with `flex: none !important` so toolbar/canvas/status use their own defined sizes instead of sharing space equally


## 1.3.3 - 2026-06-08
- Fix: Empty space above toolbar removed — override Foundry's body.game flex:none rule on .window-content children with matching specificity + padding:0 !important
- Change: Default brush size reduced from 8 px to 4 px
- Change: Maximum brush size reduced from 80 px to 20 px
- Remove: Opacity slider removed (opacity is always 100 %)


## 1.3.2 - 2026-06-08
- Change: Canvas area height is now fixed at 600 px instead of dynamic (removed unreliable flex/JS height calculation)


## 1.3.1 - 2026-06-08
- Fix: Canvas height now correctly fills the window — removed display:flex from .window-app (was fighting Foundry's layout) and instead compute .window-content height directly in JS via _syncContentHeight()


## 1.3.0 - 2026-06-08
- Fix: When the window is resized, the existing drawing now stays centred on the symmetry point instead of drifting to the top-left
- Fix: Canvas height now scales correctly when the FoundryDraw window is resized (flex layout fix)
- Fix: Backing canvas content is always centred relative to the symmetry centre; parchment fills new areas when the window is enlarged


## 1.2.1 - 2026-06-08
- Fix: Drawing is no longer lost when the window is made smaller and then enlarged again
- Fix: Backing canvas preserves all content; shrinking the window only clips the view
- Fix: Dropdown menus (Symmetry) are now readable (white-on-white text was invisible)

## 1.1.2 - 2026-06-08
- Fix: Canvas elements not found crash ("Cannot read properties of undefined (reading 'clientWidth')")
- Fix: Use document.getElementById() instead of html.find() for root-level elements

## 1.1.1 - 2026-06-08
- Fix: Canvas coordinates were distorted (very wide but nearly no height)
- Fix: Transparent checkerboard background instead of parchment – now shows correctly
- Fix: Copy to Clipboard crashed on plain HTTP (navigator.clipboard undefined); added window.open() fallback

## 1.1.0 - 2026-06-08
- Canvas fills the entire window (resizes automatically when window is resized)
- Default brush color changed to black
- Default symmetry changed to none
- New background option: Parchment (warm fantasy paper look with subtle vignette), now the default
- New button: Copy to Clipboard (copies canvas as PNG image)
- Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo) now work reliably via capture-phase listener
- Toolbar and UI restyled to match parchment/fantasy theme (warm browns and golds)
- Transparent background now shows a parchment-toned checkerboard

## 1.0.2 - 2026-06-08
- Fix: module.json is now written as UTF-8 without BOM (fixed Foundry update error)
- Fix: release.ps1 writes all files BOM-free

## 1.0.1 - 2026-06-08
- Fix: Button now correctly appears in Foundry VTT v13 scene controls
- v13 Breaking Change: getSceneControlButtons hook receives an object instead of an array
- v13 Breaking Change: button callback is onChange instead of onClick
- Removed fragile DOM injection fallback

## 1.0.0 - 2026-06-07
- Initial release
- Brush and eraser tools with adjustable size and opacity
- Line, circle and rectangle shape tools
- Flood-fill tool
- Rotational symmetry (1 / 2 / 4 / 6 / 8 / 12-fold)
- Undo / Redo (up to 50 steps)
- Clear canvas with confirmation
- Export drawing as PNG
- Configurable background (black / white / transparent)
- German and English localisation
- Button visible for all players and the GM
