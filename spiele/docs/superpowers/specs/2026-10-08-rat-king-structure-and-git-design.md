# Rat King: Projektstruktur und Git

## Ziel

Die aktuelle Rat-King-Version soll in getrennte HTML-, CSS- und JavaScript-Dateien aufgeteilt werden. Frühere Versionsstände bleiben erhalten. Git soll die weitere Entwicklung nachvollziehbar machen.

## Ausgangslage

Der Projektordner enthält sieben eigenständige HTML-Dateien von v0.10.6 bis v0.10.12. Jede Datei enthält Markup, CSS und JavaScript. v0.10.12 ist der aktuelle Stand. Vorhandene Projektdokumente liegen unter `docs/`. Der Ordner ist noch kein Git-Repository; das vorhandene `.git`-Verzeichnis ist leer und schreibgeschützt.

## Vereinbarter Aufbau

```text
index.html
css/style.css
js/game.js
archive/rat_king_v0_10_6.html
archive/rat_king_v0_10_7.html
archive/rat_king_v0_10_8.html
archive/rat_king_v0_10_9.html
archive/rat_king_v0_10_10.html
archive/rat_king_v0_10_11.html
archive/rat_king_v0_10_12.html
docs/...
README.md
.gitignore
```

`index.html` wird aus v0.10.12 erstellt und bindet `css/style.css` sowie `js/game.js` ein. Die sieben bisherigen Dateien werden unverändert nach `archive/` verschoben. Die Dokumente unter `docs/` bleiben erhalten. `README.md` erklärt den Projektaufbau und wie das Spiel lokal geöffnet wird. `.gitignore` schließt Betriebssystem- und Editorreste aus, aber keine Projektdateien.

## Git-Einrichtung

Git wird im Projektordner initialisiert. Die strukturierte Projektfassung soll den ersten Commit bilden. Es werden keine globalen Git-Einstellungen geändert. Falls für den Commit keine lokale oder globale Commit-Identität konfiguriert ist, wird die Einrichtung ohne erfundene Identität abgeschlossen und die nötige Konfiguration benannt.

## Abnahme

- `index.html` lädt die ausgelagerten CSS- und JavaScript-Dateien.
- Der aktuelle Spielinhalt aus v0.10.12 bleibt erhalten.
- Alle sieben bisherigen Versionsdateien bleiben unverändert im Archiv.
- Bestehende Dokumente bleiben erhalten.
- README und `.gitignore` sind vorhanden.
- Git-Status und erster Commit sind nachvollziehbar, sofern `.git` beschreibbar ist und eine Commit-Identität verfügbar ist.
