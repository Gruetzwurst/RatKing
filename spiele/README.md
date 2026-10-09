# Rat King

Ein browserbasiertes Sammel-und-Ausweich-Spiel. Die aktuelle Spielseite ist `RatKing.html` (v0.10.14).

## Projektdateien

- `RatKing.html` — Spieloberfläche und Einstiegspunkt
- `css/style.css` — Darstellung und Layout
- `js/game.js` — Spielablauf und Steuerung
- `dev_server.py` — lokaler Vorschau-Server mit automatischem Neuladen
- `RatKing_alle_Tiere_freigeschaltet.html` und `testversion_alle_tiere/` — Testvarianten
- `archive/` — unveränderte HTML-Snapshots der Versionen v0.10.6 bis v0.10.12
- `docs/` — Projektspezifikation und Umsetzungspläne

## Tagesherausforderungen

Im klassischen Modus gibt es täglich drei neue Aufgaben. Erfüllungen und verdiente Tagesabzeichen werden lokal im jeweiligen Browser gespeichert. Karnevalsrunden zählen nicht für die Tagesaufgaben.

## Live-Vorschau

Starte im Projektordner:

```bash
python3 dev_server.py
```

Der Server öffnet `RatKing.html` im Browser. Speichere Änderungen an HTML-, CSS- oder JavaScript-Dateien; die Seite lädt automatisch neu. Der Server läuft lokal unter `http://127.0.0.1:8000` und wird mit `Ctrl+C` beendet. Falls Port 8000 belegt ist, nutze zum Beispiel `python3 dev_server.py --port 8001`.
