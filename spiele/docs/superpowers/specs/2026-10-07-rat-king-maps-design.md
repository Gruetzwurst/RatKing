# Rat King: Ausbau auf zehn Räume

## Ziel

Rat King wird zunächst in der bestehenden, direkt im Browser testbaren HTML-Version weiterentwickelt. Der nächste Inhaltsmeilenstein erweitert das Haus mit Garten von fünf auf zehn Karten. Das bestehende Sammel-und-Ausweich-Spielprinzip bleibt erhalten. Die Grafiküberarbeitung und die App-Verpackung für Android und iOS folgen später, wenn der Inhalt zufriedenstellend ist.

## Ausgangslage

Die aktuelle HTML-Datei v0.8.0 enthält Wohnzimmer, Küche, Flur, Kammer und Badezimmer. Eine Runde dauert 60 Sekunden. Die Ratte sammelt 20 normale Gegenstände, weicht einer Katze aus und kann vorhandene Sondergegenstände und Rattentunnel nutzen. Karte und Schwierigkeitsgrad werden über die vorhandene Freischaltung gesteuert. Bestwerte und Freischaltungen liegen in `localStorage`. Das Projektbriefing bestätigt Mobile-First, die Fangreichweite 42 und dass die Boost-Wolke rein kosmetisch ist.

Die fünf bestehenden Räume werden derzeit über verstreute Bedingungen in `buildRoom()` und `drawMap()` definiert. Die Raumauswahl wird dynamisch aus `MAP_ORDER` erzeugt, ist aber auf kleinen Displays noch nicht auf zehn Einträge ausgelegt.

## Vereinbarter Umfang

Die zehn Karten werden in dieser Reihenfolge angeboten:

1. Wohnzimmer
2. Küche
3. Flur
4. Kammer
5. Badezimmer
6. Schlafzimmer
7. Esszimmer
8. Dachboden
9. Keller
10. Garten

Die vorhandenen fünf Karten und ihre Spielregeln bleiben erhalten. Die neuen Karten verwenden dieselbe Rundendauer, dasselbe Sammelziel, dieselbe Katze, dieselben Power-ups und dieselben Schwierigkeitsgrade. Sie unterscheiden sich durch eigene Hindernisse, Laufwege und thematische Raumbezeichnungen. Es werden in diesem Schritt keine neuen Gefahren oder Sonderregeln eingeführt.

Für die Raumgestaltung gelten folgende Leitmotive:

- **Schlafzimmer:** Bett, Kleiderschrank und Nachttische.
- **Esszimmer:** Esstisch, Stühle und Anrichte.
- **Dachboden:** Dachschrägen als Raumbegrenzung, Kisten und Truhe.
- **Keller:** Regale, Kisten und Waschmaschine.
- **Garten:** Beete, Gartenmöbel und Schuppen.

Die Darstellung bleibt zunächst im Stil der vorhandenen einfachen Flächen und beschrifteten Hindernisse. Eine ausgearbeitete Grafik wird später gestaltet.

## Aufbau und Daten

Die Kartendaten werden in der HTML-Datei zentral registriert. Jede Karte enthält mindestens eine stabile ID, den deutschen Anzeigenamen, eine Funktion oder Definition für ihr Hindernislayout und einfache Bodeneinstellungen. `buildRoom()`, `drawMap()` und die Kartenauswahl beziehen ihre Kartenauswahl aus dieser Registrierung, anstatt für jede Karte neue verstreute Spezialfälle zu erhalten.

Die Hindernislayouts müssen auf der vorhandenen Weltgröße funktionieren. Sie müssen genügend freie Bereiche für Ratten- und Katzenstart, Leckerbissen und vier Rattentunnel lassen. Die bestehende Kollisions- und Bewegungslogik bleibt gleich.

Die Kartenauswahl wird auf kleinen Bildschirmen scrollbar, damit alle zehn Einträge erreichbar sind. Die Touch-Steuerung, Tastatursteuerung, HUD und Spielablauf werden in diesem Meilenstein nicht grundsätzlich neu gestaltet. Die Fangreichweite der Katze bleibt bei 42; die Boost-Wolke beeinflusst die Katze nicht.

## Freischaltung und gespeicherter Fortschritt

Die fünf neuen Karten werden an die bestehende Reihenfolge angehängt. Wie bisher schaltet ein Ergebnis von mindestens 50 Punkten auf „Normal“ die nächste Karte und „Schwer“ für die aktuelle Karte frei. Garten ist das letzte Element der Folge.

Die `localStorage`-Struktur wird um die neuen Karten-IDs ergänzt. Vorhandene Freischaltungen und Bestwerte für die fünf bisherigen Karten bleiben unverändert erhalten. Neue Karten starten gesperrt und erhalten jeweils einen eigenen Bestwert-Schlüssel. Das lokale Speichern bleibt geräte- und Browser-spezifisch; eine Synchronisierung zwischen Geräten gehört nicht zu diesem Meilenstein.

## Test und Abnahme

Nach der Implementierung wird die HTML-Datei in der vorhandenen Umgebung manuell geöffnet und durchgespielt. Die Prüfung umfasst:

- alle zehn Karten erscheinen in der richtigen Reihenfolge;
- neue Karten bleiben gesperrt, bis die vorherige Freischaltung erreicht ist;
- bestehende gespeicherte Freischaltungen und Bestwerte bleiben erhalten;
- jedes Hindernislayout hat freie Start-, Sammel- und Tunnelbereiche;
- die Kartenauswahl ist auf kleinen und großen Fenstergrößen erreichbar;
- eine Runde verwendet auf allen Karten unverändert die bestehenden Spielregeln.

## Nicht Teil dieses Meilensteins

- Veröffentlichung oder Verpackung als Android- oder iOS-App;
- ausgearbeitete neue Grafik oder Animationen;
- neue Spielmodi, Gefahren, Power-ups oder Raum-spezifische Regeln;
- Zählen und Speichern von Schwer-Siegen; dieses Thema bleibt für einen späteren Schritt vorgemerkt;
- Cloud-Speicherung oder plattformübergreifende Synchronisierung.
