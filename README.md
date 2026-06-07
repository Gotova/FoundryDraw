# FoundryDraw – Magic Circle Painter

> Ein Foundry VTT v13 Modul, das allen Spielern und dem GM eine Zeichenfläche zum Malen von Magiekreisen bereitstellt.

![Version](https://img.shields.io/badge/version-1.0.0-a855f7)
![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v13-0f3460)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Inhalt

- [Features](#features)
- [Installation](#installation)
- [Verwendung](#verwendung)
- [Werkzeuge im Überblick](#werkzeuge-im-überblick)
- [Symmetrie-Funktion](#symmetrie-funktion)
- [Tastenkürzel](#tastenkürzel)
- [Updates](#updates)
- [Release erstellen](#release-erstellen)

---

## Features

| Funktion | Beschreibung |
|---|---|
| **Pinsel** | Freihand malen mit einstellbarer Größe und Deckkraft |
| **Radiergummi** | Pixel gezielt löschen |
| **Linie** | Gerade Linien zeichnen |
| **Kreis / Ellipse** | Kreise und Ellipsen zeichnen |
| **Rechteck** | Rechtecke zeichnen |
| **Füllen** | Fläche mit Farbe füllen (Flood-Fill) |
| **Rotationssymmetrie** | 1 / 2 / 4 / 6 / 8 / 12-fach – ideal für Magiekreise |
| **Undo / Redo** | Bis zu 50 Schritte rückgängig machen |
| **Hintergrund** | Schwarz, Weiß oder Transparent |
| **Als PNG speichern** | Zeichnung direkt als Bilddatei herunterladen |
| **Für alle sichtbar** | Button erscheint für Spieler und GM |

---

## Installation

### Option A – Manifest-URL (empfohlen)

1. Foundry VTT öffnen
2. **Add-on Module** → **Modul installieren**
3. Folgende URL in das Manifest-Feld einfügen:
   ```
   https://github.com/Gotova/FoundryDraw/releases/latest/download/module.json
   ```
4. **Installieren** klicken
5. Modul in der gewünschten Welt aktivieren

Foundry prüft über diese URL auch automatisch auf Updates.

### Option B – Manuell

1. Neuestes Release herunterladen: [foundrydraw.zip](https://github.com/Gotova/FoundryDraw/releases/latest/download/foundrydraw.zip)
2. ZIP entpacken
3. Ordner `foundrydraw` nach `<Foundry Data>/modules/` kopieren
4. Foundry neu starten und Modul aktivieren

---

## Verwendung

### Button öffnen

Nach der Aktivierung erscheint links in der Seitenleiste ein lila **Zauberstab-Icon** (`✦`). Dieser Button ist für **alle Spieler und den GM** sichtbar.

Ein Klick darauf öffnet die Zeichenfläche in einem eigenen, frei positionierbaren Fenster.

### Zeichenfläche

Die Zeichenfläche ist **700 × 500 Pixel** groß und kann durch Ziehen am Fensterrand vergrößert werden.

---

## Werkzeuge im Überblick

```
[ Pinsel ] [ Radiergummi ] [ Linie ] [ Kreis ] [ Rechteck ] [ Füllen ]
  │ Farbe │ Pinselgröße ─────────────┤ Deckkraft ──┤ Symmetrie │ Hintergrund │
  │ Rückgängig │ Wiederholen │ Löschen │ Speichern │
```

### Pinsel
- Freihand zeichnen in beliebiger Farbe
- Größe: 1–80 px
- Deckkraft: 1–100 %
- Arbeitet mit der eingestellten Symmetrie zusammen

### Radiergummi
- Löscht Pixel transparent (funktioniert auch auf gefärbtem Hintergrund korrekt)
- Verwendet dieselbe Größeneinstellung wie der Pinsel

### Linie / Kreis / Rechteck
- Klicken und ziehen, um die Form aufzuspannen
- Live-Vorschau während des Ziehens
- Werden ebenfalls mit Symmetrie gespiegelt

### Füllen (Flood-Fill)
- Klick auf eine Fläche füllt sie mit der gewählten Farbe
- Deckkraft wird berücksichtigt

---

## Symmetrie-Funktion

Die Symmetrie-Funktion ist das Herzstück des Moduls für Magiekreise. Alle Pinselstriche und Formen werden automatisch um den Mittelpunkt der Zeichenfläche gespiegelt.

| Einstellung | Segmente | Typischer Einsatz |
|---|---|---|
| Keine | 1 | Freies Zeichnen |
| 2-fach | 2 | Einfache Spiegelung |
| 4-fach | 4 | Quadratische Muster |
| **6-fach** | 6 | **Standard für Magiekreise** |
| 8-fach | 8 | Oktagramme |
| 12-fach | 12 | Komplexe Runen |

**Tipp:** Starte mit einem schwarzen Hintergrund, stelle die Symmetrie auf 6 oder 8 und zeichne langsam vom Mittelpunkt nach außen. Schon wenige Striche ergeben ein eindrucksvolles Magiekreis-Muster.

---

## Tastenkürzel

| Kürzel | Aktion |
|---|---|
| `Ctrl + Z` | Rückgängig (Undo) |
| `Ctrl + Y` | Wiederholen (Redo) |
| `Ctrl + Shift + Z` | Wiederholen (Redo, alternativ) |

---

## Updates

Foundry VTT prüft beim Start automatisch, ob eine neue Version verfügbar ist, sofern das Modul über die Manifest-URL installiert wurde. Ein Update-Banner erscheint dann im Add-on-Module-Bereich.

---

## Release erstellen

Für Entwickler oder Selbst-Hoster:

```powershell
# Patch-Version erhöhen (1.0.0 → 1.0.1) und ZIP bauen
.\release.ps1

# Minor-Version erhöhen (1.0.0 → 1.1.0)
.\release.ps1 -Minor

# Major-Version erhöhen (1.0.0 → 2.0.0)
.\release.ps1 -Major
```

Das Script:
1. Erhöht die Versionsnummer in `module.json` automatisch
2. Baut `foundrydraw.zip` mit allen nötigen Dateien
3. Zeigt die nächsten Git-Schritte an

Danach auf GitHub ein neues Release mit dem Tag `vX.Y.Z` erstellen und `foundrydraw.zip` + `module.json` als Assets anhängen.

---

## Lizenz

MIT © Ibrahim (Gotova)
