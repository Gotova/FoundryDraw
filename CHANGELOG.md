# Changelog

## 1.0.2 - 2026-06-08
- Fix: module.json wird jetzt als UTF-8 ohne BOM geschrieben (Foundry Update-Fehler behoben)
- Fix: release.ps1 schreibt alle Dateien BOM-frei

## 1.0.1 - 2026-06-08
- Fix: Button erscheint jetzt korrekt in der Seitenleiste unter Foundry VTT v13
- v13 Breaking Change: getSceneControlButtons hook erhaelt ein Objekt statt Array
- v13 Breaking Change: Button-Callback heisst onChange statt onClick
- Fragile DOM-Injection entfernt

## 1.0.0 - 2026-06-07
- Initial release
- Brush and eraser tools with adjustable size and opacity
- Line, circle and rectangle shape tools
- Flood-fill tool
- Rotational symmetry (1 / 2 / 4 / 6 / 8 / 12-fold) - perfect for magic circles
- Undo / Redo (up to 50 steps), keyboard shortcuts Ctrl+Z / Ctrl+Y
- Clear canvas with confirmation
- Export drawing as PNG
- Configurable background (black / white / transparent)
- German and English localisation
- Button visible for all players and the GM
