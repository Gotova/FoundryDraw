# Changelog

## 1.6.35 - 2026-06-11
- (Bitte Aenderungen hier eintragen)


## 1.6.34 - 2026-06-10
- (Bitte Aenderungen hier eintragen)


## 1.6.33 - 2026-06-10
- (Bitte Aenderungen hier eintragen)


## 1.6.34 - 2026-06-11
- Change: Ink counter now sums raw stroke lengths only — stroke width no longer affects the number

## 1.6.33 - 2026-06-11
- Change: The red ✕ delete button on selections is now about half its previous size (hit area unchanged)

## 1.6.32 - 2026-06-10
- Feature: Ink counter in status bar (released as part of 1.6.31/1.6.32)


## 1.6.31 - 2026-06-10
- Feature: Ink counter in status bar — shows the total "ink used" (sum of stroke-length × stroke-width for every drawn element) as a blue number with a pen icon (🖋); hover for tooltip; use it to calibrate how much ink equals one spell point


## 1.6.30 - 2026-06-09
- Feature: Delete selected elements via the Delete key (or Backspace on Mac), or by clicking the red ✕ button that appears at the top-right corner of the selection bounding box; deletion is undoable


## 1.6.29 - 2026-06-09
- Fix: Moving or rotating a selected element no longer leaves it invisible when dragged over a previously-erased area — a white unmask clone of the element is appended to the erase mask at the new position on every commit, overriding any black eraser paths that cover that region


## 1.6.28 - 2026-06-09
- Fix: Alt-grid-snap when moving selected elements now snaps the element's bounding-box corner to the grid rather than the cursor position, so the snap target is consistent regardless of where inside the element the drag was started


## 1.6.27 - 2026-06-09
- Feature: Select tool modifier keys — hold Ctrl while moving to constrain the drag direction to the nearest 45° increment (horizontal, vertical or diagonal); hold Alt while moving to snap the cursor to the 20-unit grid; hold Ctrl while rotating to snap the angle to the nearest 45° step; modifiers work for single-element and multi-element selections alike


## 1.6.26 - 2026-06-09
- Feature: Shift-click in select tool toggles individual elements in/out of the current selection without clearing it; Shift+drag on empty canvas draws an additive marquee that adds to the existing selection instead of replacing it


## 1.6.25 - 2026-06-09
- Feature: Select tool marquee — click and drag on empty canvas to draw a rubber-band selection rectangle; all elements whose bounding box overlaps the rectangle are selected simultaneously; the shared dashed outline and rotation handle appear around the group; drag to move all selected elements together or drag the handle to rotate them around the group centre


## 1.6.24 - 2026-06-09
- Feature: Select tool (mouse-pointer icon) — click any drawn element (path, shape, circle, text) to select it; a dashed blue bounding box appears with a rotation handle (small circle) above it; drag the element body to move it; drag the rotation handle to rotate the element around its visual centre; click empty canvas or press Escape to deselect; moves and rotations are fully undoable

## 1.6.23 - 2026-06-09
- (Bitte Aenderungen hier eintragen)


## 1.6.22 - 2026-06-09
- Feature: Eraser cursor ring — while the eraser tool is active, two concentric circles (dark outer ring + white inner ring, both pixel-constant via vector-effect) show the exact eraser diameter under the cursor; the system cursor is hidden so only the ring is visible; the ring disappears when the pointer leaves the canvas or a different tool is selected


## 1.6.21 - 2026-06-09
- Change: Parchment background now has a procedural paper-grain texture — an SVG feTurbulence fractalNoise filter multiplies warm-toned grain (15 % red / 12 % green / 6 % blue darkening range) onto the base colour; texture is baked into SVG exports, gallery thumbnails, chat images and the live viewer


## 1.6.20 - 2026-06-09
- Feature: Text tool (T / fa-font button) — click anywhere on the canvas to place a floating input; type and press Enter to stamp the text as a vector SVG element; Escape cancels; font size follows the brush-size slider (× 8 world units); respects the current colour, opacity, and symmetry; the cursor changes to a text I-beam while the tool is active


## 1.6.19 - 2026-06-09
- Feature: Live-draw broadcast — GM-only broadcast-tower button toggles a real-time stream of the drawing to all connected players; a live viewer window opens automatically on player clients and updates every stroke (~200 ms throttle during brush, immediate on stroke end); button pulses red while active; clicking again stops the stream and closes player windows


## 1.6.18 - 2026-06-09
- Feature: Gallery folders — create named folders to organise drawings; click a folder header to collapse/expand it; drag drawings onto a folder header or use the folder-icon button per card to move them in; drag folder headers to reorder folders; deleting a folder moves its entries back to Uncategorized


## 1.6.17 - 2026-06-09
- Feature: Gallery drag-and-drop reordering — each gallery card now has a grip handle (≡); drag a card onto another to swap their positions; the new order is persisted immediately


## 1.6.16 - 2026-06-09
- Fix: Drawing over an erased area now works correctly (white unmask paths written in DOM order after black erase paths)


## 1.6.15 - 2026-06-08
- Fix: Drawing over an erased area now works correctly — every brush stroke and shape writes a matching white path into the SVG erase mask alongside the visible stroke, which overrides any earlier black eraser paths in that region (later mask entries win in SVG rendering order)


## 1.6.14 - 2026-06-08
- Fix: Eraser now uses an SVG mask for true erasing — eraser strokes are painted as black paths into a mask applied to the drawing layer (black = transparent in SVG masks), so content is permanently removed rather than painted over; undo/redo and gallery save/load preserve the erase mask correctly


## 1.6.13 - 2026-06-08
- Fix: Eraser now genuinely removes drawing content instead of painting over it with the parchment colour — uses SVG destination-out compositing on an isolated layer so erased areas reveal the real background


## 1.6.12 - 2026-06-08
- Change: "Insert centred circle" button moved to sit directly after the brush button in the toolbar


## 1.6.11 - 2026-06-08
- Feature: New "Send to chat" button (paper-plane icon) — posts the current drawing as an image in the Foundry chat, visible to all players; uses the same tight-crop zoom as the gallery thumbnail


## 1.6.10 - 2026-06-08
- Change: SVG export is now cropped tightly around the drawing content instead of always exporting the full 2000×2000 canvas


## 1.6.9 - 2026-06-08
- Fix: Gallery thumbnails now zoom in tightly on the actual drawing content instead of always showing the full 2000×2000 canvas — small magic circles are now clearly visible in the gallery overview


## 1.6.8 - 2026-06-08
- Fix: Circle and rectangle symmetry copies are no longer distorted at 6/8/12-fold symmetry — shapes are now rotated as a whole around the world centre instead of recomputing an axis-aligned bounding box from rotated corner points (which gave wrong sizes at non-axis-aligned angles)


## 1.6.7 - 2026-06-08
- Change: Gallery is now per-player — each user sees only their own saved magic circles (setting changed from world-scope to client-scope)
- Feature: Hold Alt while drawing a line, circle or rectangle to snap both endpoints to the nearest grid point (20-unit grid, the same grid visible on the canvas)


## 1.6.6 - 2026-06-08
- Fix: ImagePopout deprecation warning in Foundry v13 — title is now passed as options.window.title instead of options.title


## 1.6.5 - 2026-06-08
- Feature: Hold Shift while drawing a circle or rectangle to lock to equal dimensions (perfect circle / square)
- Feature: Hold Ctrl while drawing any shape (line, circle, rectangle) to snap the endpoint to the nearest 45° angle (horizontal, vertical, or diagonal)


## 1.6.4 - 2026-06-08
- Change: Default brush smoothness raised from 0 to 10


## 1.6.3 - 2026-06-08
- Fix: Reference grid is no longer included in exported SVG files, PNG clipboard copies, gallery thumbnails, or "Show to Players" images — it is now strictly an on-screen editing aid


## 1.6.2 - 2026-06-08
- Release of v1.6.0 + v1.6.1 features


## 1.6.1 - 2026-06-08
- Change: "Insert centred circle" is now an interactive radius picker — press the button (it highlights), hover over the canvas to see a live preview circle centred on the symmetry point, then click to place it at that exact radius; press the button again or hit Escape to cancel


## 1.6.0 - 2026-06-08
- Feature: SVG drawing engine — the canvas has been replaced by a live `<svg>` element; every brush stroke, shape and circle is stored as a vector path, so the drawing is infinitely sharp at every zoom level
- Feature: Save as SVG — the download button now exports a true `.svg` file instead of a rasterised PNG; open in Inkscape, Affinity Designer or a browser and the detail is perfect at any size
- Feature: Gallery now saves SVG content so loading a saved circle back into the draw pad is completely lossless — no re-encoding round-trip
- Change: History snapshots are now arrays of cloned SVG nodes (~KB each) instead of 16 MB ImageData objects; undo/redo is far more memory-efficient
- Change: Eraser paints parchment-coloured strokes over drawing content (same behaviour, now fully vector)
- Change: Copy to Clipboard and Show to Players rasterise the SVG to PNG at 2000×2000 for broad compatibility
- Remove: Flood fill tool dropped — it is a fundamentally raster operation and has no meaningful SVG equivalent; the button has been removed from the toolbar

## 1.5.3 - 2026-06-08
- Feature: Reference grid — 20 px world-space cells, warm-brown lines at 80 % opacity, 0.5 screen-pixel width; drawn on the display canvas only (never baked into the drawing); hides automatically when zoomed out so far that cells would be < 4 px on screen


## 1.5.2 - 2026-06-08
- Fix: Gallery edit no longer loses quality — circles are now saved at full 2000×2000 world resolution instead of being downscaled to 800×800 first (the PNG still compresses well due to the large uniform parchment areas)


## 1.5.1 - 2026-06-08
- Feature: Brush smoothness / stabiliser slider (0–10) — uses exponential moving average so small hand jitters are absorbed; the stroke always ends at the exact cursor position (remaining lag is flushed on mouse-up)


## 1.5.0 - 2026-06-08
- Feature: Infinite canvas — all drawing now happens on a fixed 2000×2000 world canvas; the window is a zoomable/pannable viewport into it, so resizing the window never touches the drawing and the symmetry centre can never drift
- Feature: Pan — hold right-click and drag to scroll around the canvas
- Feature: Zoom — scroll wheel zooms in/out centred on the cursor; zoom range 10%–800%
- Feature: Reset View button (fa-compress-arrows-alt) — snaps back to 100% zoom centred on the symmetry point
- Change: Zoom percentage shown in status bar
- Change: Coordinates in status bar are now relative to the symmetry centre (0, 0) rather than absolute canvas pixels
- Change: Canvas height is now flex-driven (fills the window) instead of a fixed 600 px
- Fix: Symmetry centre shift on resize/gallery-load is permanently eliminated — window resize only re-renders the viewport, world canvas is never modified


## 1.4.5 - 2026-06-08
- Fix: Symmetry centre no longer shifts the first time the window is widened after loading a gallery entry — _onResize now calls _syncToBacking() after restoring the canvas so the backing always accurately mirrors the displayed canvas state; every subsequent resize therefore starts from a correctly centred backing. Pre-load history entries are also cleared in _loadFromDataUrl so stale ImageData snapshots from the previous drawing session cannot interfere.


## 1.4.4 - 2026-06-08
- Fix: Symmetry centre no longer shifts after loading a gallery entry and resizing the window — root cause was two separate bugs: (1) openDrawApp() called render(true) even when the draw pad was already open, which re-created all DOM elements and reset the backing canvas via _initCanvas(), destroying the loaded content; (2) _loadFromDataUrl called _onResize() internally, which attempted to restore old backing content before the new image was drawn, corrupting the centering state. Fix: openDrawApp/openGallery now call bringToTop() instead of render(true) when already rendered; _loadFromDataUrl uses _applyCanvasSize() directly instead of _onResize()


## 1.4.3 - 2026-06-08
- Fix: After loading a gallery entry, the symmetry centre no longer drifts when the window is resized — the backing canvas is now reset to the exact loaded canvas size, so stale pixels from earlier (wider) sessions can no longer reappear at the edges


## 1.4.2 - 2026-06-08
- Fix: Loading a gallery entry into the Draw Pad no longer distorts the aspect ratio — the image is now scaled proportionally ("contain") relative to the actual canvas dimensions after resize, preventing stretching caused by minor dimension drift (e.g. scrollbar)


## 1.4.1 - 2026-06-08
- Feature: Gallery — save named magic circles from the Draw Pad (floppy-disk button) and browse them in a new "Magic Circle Gallery" window (fa-images button in the scene controls)
- Feature: Gallery actions — load a saved circle back into the Draw Pad (edit), rename it, show it to all players (GM only), or delete it
- Feature: Gallery is persisted as a world setting so saved circles survive server restarts


## 1.4.0 - 2026-06-08
- Feature: GM-only "Show to all players" button (fa-eye) — converts the canvas to a PNG and displays it as an ImagePopout on every connected client via Foundry's module socket
- module.json: added "socket": true to enable the module socket


## 1.3.9 - 2026-06-08
- Change: Canvas height growth per outer circle reduced from 200 px to 100 px


## 1.3.8 - 2026-06-08
- Feature: Each additional press of the "Insert centred circle" button draws an outer ring 50 px larger than the previous one; the canvas height grows by 200 px each time to make room; circle counter resets when the canvas is cleared


## 1.3.7 - 2026-06-08
- Fix: Undo no longer skips two steps — history is now saved after each completed action instead of before, eliminating the duplicate initial-state entry that caused one undo to undo two strokes


## 1.3.6 - 2026-06-08
- Feature: New "Insert centred circle" button (fa-circle-plus) draws a perfectly centred circle at 85 % of the shorter canvas dimension as an outer boundary for magic circles


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
