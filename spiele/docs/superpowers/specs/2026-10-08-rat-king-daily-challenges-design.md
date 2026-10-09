# Rat King: Tagesherausforderungen

## Ziel

Drei wechselnde Tagesaufgaben geben normalen Runden zusätzliche Ziele. Abgeschlossene Aufgaben zählen zu einem dauerhaft gespeicherten Abzeichenstand und ergänzen den bestehenden Fortschritt aus Sammelbüchern, Bestwerten und Schwer-Punkten.

## Ausgangslage

Rat King hat einen klassischen 60-Sekunden-Modus und einen separaten fünfminütigen Karnevalsmodus. Der Spielstand liegt lokal in `localStorage`. Das Spiel erfasst bereits Punktzahl, eingesammelte Nahrung, Nahrungskategorien, Boost-Auslösung und die Nutzung von Ratentunneln. Das Hauptmenü und die Ergebnisansicht sind scrollbar und zeigen bereits Fortschritt und Bestenlisten.

## Vereinbarter Umfang

- Im klassischen Modus sind täglich drei Aufgaben aktiv. Der Karnevalsmodus zählt nicht für Tagesaufgaben.
- Die Aufgaben werden für das lokale Kalenderdatum aus einem festen Pool ausgewählt. Die Auswahl ist innerhalb dieses Datums stabil und funktioniert offline.
- Drei Aufgaben werden ohne Duplikate aus diesem Pool ausgewählt:
  1. Mindestens 12 Leckerbissen in einer Runde einsammeln.
  2. Mindestens 4 Süßigkeiten in einer Runde einsammeln.
  3. Mindestens 50 Punkte in einer Runde ohne Boost erzielen.
  4. In einer Runde alle 20 Leckerbissen einsammeln.
  5. In einer Runde mindestens 3 Ratentunnel benutzen.
- Aufgaben dürfen in jeder freigeschalteten Karte und Schwierigkeit erfüllt werden.
- Aufgaben werden am Ende einer klassischen Runde anhand der Werte dieser Runde ausgewertet. Mehrere Aufgaben können in derselben Runde abgeschlossen werden.
- Der Menübildschirm zeigt die drei Tagesaufgaben, ihren Erfüllungsstatus und die Gesamtzahl verdienter Tagesabzeichen. Die Ergebnisansicht nennt neu abgeschlossene Aufgaben.
- Beim Abschluss aller drei Aufgaben eines Tages wird genau ein dauerhaftes Tagesabzeichen vergeben. Der Zähler wird lokal gespeichert und nicht mit Schwer-Punkten oder Figurenkäufen verrechnet.
- Tagesdatum, Erfüllungen und Abzeichen werden in einem eigenen versionierten `localStorage`-Eintrag gespeichert. Fehlerhafte oder fehlende gespeicherte Challenge-Daten dürfen den Spielstart nicht verhindern.

## Außerhalb des Umfangs

Es gibt keine Online-Anmeldung, globale Bestenliste, serverseitige Synchronisierung, neue Spielregeln oder neue käufliche Figuren. Challenge-Fortschritt wird nicht zwischen Browsern oder Geräten synchronisiert.

## Aufbau

Die Aufgabenliste, lokale Tagesauswahl, Erfüllungsauswertung und Speicherung werden in `js/game.js` ergänzt. Das bestehende HTML erhält einen kompakten Challenge-Bereich im Menü und eine Ergebniszeile. `css/style.css` bekommt die dazugehörigen Status- und Layoutregeln. Bestehende Schlüssel und Daten für Bestwerte, Sammlungen, Figuren und Schwer-Punkte bleiben unverändert.

Die Tagesauswahl wird deterministisch aus dem lokalen Datum und einer festen Aufgabenliste abgeleitet. Für Aufgabenauswertung werden nur Daten der aktuellen klassischen Runde verwendet. Boost- und Tunnelnutzung werden in der Runde erfasst; Nahrungskategorien werden über die vorhandenen Sammelbuchdefinitionen erkannt.

## Abnahme

- Das Menü zeigt täglich genau drei unterschiedliche Aufgaben und aktualisiert die Auswahl am nächsten lokalen Kalendertag.
- Wiederholtes Laden am selben Tag zeigt dieselben Aufgaben und bewahrt deren Erfüllungsstatus.
- Nur klassische Runden verändern Tagesaufgaben; Karnevalsrunden verändern sie nicht.
- Eine Runde kann mehrere Aufgaben auf einmal erfüllen.
- Das Tagesabzeichen wird nach Erfüllung aller drei Aufgaben genau einmal für den Tag vergeben und bleibt nach einem Neuladen erhalten.
- Vorhandene Spielstände für andere Fortschrittssysteme bleiben unberührt.
