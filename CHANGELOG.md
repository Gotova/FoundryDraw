# Changelog

## 1.0.1 – 2026-06-08
- Fix: Button now correctly appears in Foundry VTT v13 scene controls
- v13 Breaking Change: `getSceneControlButtons` hook now receives a keyed object instead of an array
- v13 Breaking Change: button callback is `onChange` instead of `onClick`
- Removed fragile DOM injection fallback (no longer needed)

## 1.0.0 – 2026-06-07
- Initial release
- Brush and eraser tools with adjustable size and opacity
- Line, circle and rectangle shape tools
- Flood-fill tool
- Rotational symmetry (1 / 2 / 4 / 6 / 8 / 12-fold) – perfect for magic circles
- Undo / Redo (up to 50 steps), keyboard shortcuts Ctrl+Z / Ctrl+Y
- Clear canvas with confirmation
- Export drawing as PNG
- Configurable background (black / white / transparent)
- German and English localisation
- Button visible for all players and the GM
