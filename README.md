# FoundryDraw - Magic Circle Painter

> Ein Foundry VTT v13 Modul, das allen Spielern und dem GM eine Zeichenflaeche zum Malen von Magiekreisen bereitstellt.

![Version](https://img.shields.io/badge/version-1.6.1-a855f7)
![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v13-0f3460)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Inhalt

- [Features](#features)
- [Installation](#installation)
- [Verwendung](#verwendung)
- [Werkzeuge im Ueberblick](#werkzeuge-im-ueberblick)
- [Symmetrie-Funktion](#symmetrie-funktion)
- [Tastenkuerzel](#tastenkuerzel)
- [Updates](#updates)
- [Release erstellen](#release-erstellen)

---

## Features

| Funktion | Beschreibung |
|---|---|
| **Pinsel** | Freihand malen mit einstellbarer Groesse und Deckkraft |
| **Radiergummi** | Pixel gezielt loeschen |
| **Linie** | Gerade Linien zeichnen |
| **Kreis / Ellipse** | Kreise und Ellipsen zeichnen |
| **Rechteck** | Rechtecke zeichnen |
| **Fuellen** | Flaeche mit Farbe fuellen (Flood-Fill) |
| **Rotationssymmetrie** | 1 / 2 / 4 / 6 / 8 / 12-fach - ideal fuer Magiekreise |
| **Undo / Redo** | Bis zu 50 Schritte rueckgaengig machen |
| **Hintergrund** | Schwarz, Weiss oder Transparent |
| **Als PNG speichern** | Zeichnung direkt als Bilddatei herunterladen |
| **Fuer alle sichtbar** | Button erscheint fuer Spieler und GM |

---

## Installation

### Option A - Manifest-URL (empfohlen)

1. Foundry VTT oeffnen
2. **Add-on Module** -> **Modul installieren**
3. Folgende URL in das Manifest-Feld einfuegen:
   ```
   https://github.com/Gotova/FoundryDraw/releases/latest/download/module.json
   ```
4. **Installieren** klicken
5. Modul in der gewuenschten Welt aktivieren

Foundry prueft ueber diese URL auch automatisch auf Updates.

### Option B - Manuell

1. Neuestes Release herunterladen: [foundrydraw.zip](https://github.com/Gotova/FoundryDraw/releases/latest/download/foundrydraw.zip)
2. ZIP entpacken
3. Ordner `foundrydraw` nach `<Foundry Data>/modules/` kopieren
4. Foundry neu starten und Modul aktivieren

---

## Verwendung

### Button oeffnen

Nach der Aktivierung erscheint in der **linken Seitenleiste** unter den Token-Werkzeugen ein **Zauberstab-Icon**. Dieser Button ist fuer **alle Spieler und den GM** sichtbar.

Ein Klick darauf oeffnet die Zeichenflaeche in einem eigenen, frei positionierbaren Fenster.

### Zeichenflaeche

Die Zeichenflaeche ist **700 x 500 Pixel** gross und kann durch Ziehen am Fensterrand vergroessert werden.

---

## Werkzeuge im Ueberblick

```
[ Pinsel ] [ Radiergummi ] [ Linie ] [ Kreis ] [ Rechteck ] [ Fuellen ]
  | Farbe | Pinselgroesse ----------- | Deckkraft -- | Symmetrie | Hintergrund |
  | Rueckgaengig | Wiederholen | Loeschen | Speichern |
```

### Pinsel
- Freihand zeichnen in beliebiger Farbe
- Groesse: 1-80 px
- Deckkraft: 1-100 %
- Arbeitet mit der eingestellten Symmetrie zusammen

### Radiergummi
- Loescht Pixel transparent (funktioniert auch auf gefaerbtem Hintergrund korrekt)
- Verwendet dieselbe Groesseneinstellung wie der Pinsel

### Linie / Kreis / Rechteck
- Klicken und ziehen, um die Form aufzuspannen
- Live-Vorschau waehrend des Ziehens
- Werden ebenfalls mit Symmetrie gespiegelt

### Fuellen (Flood-Fill)
- Klick auf eine Flaeche fuellt sie mit der gewaehlten Farbe
- Deckkraft wird beruecksichtigt

---

## Symmetrie-Funktion

Die Symmetrie-Funktion ist das Herzstueck des Moduls fuer Magiekreise. Alle Pinselstriche und Formen werden automatisch um den Mittelpunkt der Zeichenflaeche gespiegelt.

| Einstellung | Segmente | Typischer Einsatz |
|---|---|---|
| Keine | 1 | Freies Zeichnen |
| 2-fach | 2 | Einfache Spiegelung |
| 4-fach | 4 | Quadratische Muster |
| **6-fach** | 6 | **Standard fuer Magiekreise** |
| 8-fach | 8 | Oktagramme |
| 12-fach | 12 | Komplexe Runen |

**Tipp:** Starte mit einem schwarzen Hintergrund, stelle die Symmetrie auf 6 oder 8 und zeichne langsam vom Mittelpunkt nach aussen. Schon wenige Striche ergeben ein eindrucksvolles Magiekreis-Muster.

---

## Tastenkuerzel

| Kuerzel | Aktion |
|---|---|
| `Ctrl + Z` | Rueckgaengig (Undo) |
| `Ctrl + Y` | Wiederholen (Redo) |
| `Ctrl + Shift + Z` | Wiederholen (Redo, alternativ) |

---

## Updates

Foundry VTT prueft beim Start automatisch, ob eine neue Version verfuegbar ist, sofern das Modul ueber die Manifest-URL installiert wurde. Ein Update-Banner erscheint dann im Add-on-Module-Bereich.

---

## Release erstellen

Fuer Entwickler oder Selbst-Hoster:

```powershell
# Patch-Version erhoehen und ZIP bauen + GitHub Release erstellen
.\release.ps1

# Minor-Version erhoehen
.\release.ps1 -Minor

# Major-Version erhoehen
.\release.ps1 -Major
```

Das Script macht alles automatisch:
1. Erhoht die Versionsnummer in `module.json` und dem Badge in `README.md`
2. Fuegt einen Eintrag in `CHANGELOG.md` ein
3. Baut `foundrydraw.zip`
4. Git commit + tag + push
5. Erstellt das GitHub Release mit allen Assets

Alle Dateien werden als **UTF-8 ohne BOM** geschrieben, da Foundry VTT kein BOM in `module.json` akzeptiert.

---

## Lizenz

MIT (c) Ibrahim (Gotova)
