# Nibblecrown – Play Console Startplan (04.11.2026)

Entwicklername: GruetzwurstGames
Kontakt: gruetzwurst.games@gmail.com
App-Name: Nibblecrown
Paketkennung (NICHT ändern): de.gruetzwurst.ratking

## Bereits vorbereitet
- GitHub Actions erzeugt signierte APK und signierte Play-AAB.
- Android-Launcher-Icon wird aus android-app/icon/nibblecrown.png erzeugt.
- Store-Beschreibungen: play-store/Nibblecrown_Storetexte_DE.md
- Datenschutzhinweise als ENTWURF: docs/privacy.html und spiele/privacy.html (in der App abrufbar).
- Neues Logo sowie Feature-Grafik können manuell in die Play Console hochgeladen werden.

## Vor Freigabe unbedingt prüfen
- [ ] Identitäts- und Android-Geräteprüfung abschließen.
- [ ] Rechtliche Einordnung (gewerblicher Anbieter / Impressum) klären, bevor private Adresse öffentlich wird.
- [ ] Vollständige Datenschutzhinweise erstellen: Verantwortlicher, Kontakt, Android-SDK-Datenflüsse, eventuell Systemdiagnosen, Löschung; Entwurfsmarkierungen entfernen.
- [ ] Nach Freigabe die Datenschutzerklärung öffentlich ohne Anmeldung hosten; z. B. GitHub Pages aus /docs, sofern die rechtlichen Pflichtangaben komplett sind.
- [ ] Aktuelle Android-AAB nach letzter Codeänderung mit GitHub Actions neu erzeugen.
- [ ] App in Play Console anlegen: Spiel, kostenlos, Anzeigen: nein (solange ohne Werbung).
- [ ] Play App Signing, vorgeschlagen: Google verwaltet den App-Signaturschlüssel; bestehender eigener JKS ist Upload-Schlüssel.
- [ ] Im Haupt-Store-Eintrag Name/Beschreibungen, 512×512 Icon, 1024×500 Feature-Grafik ergänzen.
- [ ] Mindestens zwei echte Screenshots des laufenden Spiels hochladen; keine erfundenen Gameplay-Bilder.
- [ ] In Play Console: App-Inhalte, Zielgruppe, Inhaltsbewertung, Datensicherheit, Datenschutz-URL und Kontakt ausfüllen; Angaben der tatsächlichen App anpassen.
- [ ] Auf Android testen: Touch-Steuerung, Pause, Figurenauswahl, lokale Spielstände, Dateiexport/-import, App-Update und Offline-Verhalten.
- [ ] Geschlossenen Test starten; bei privaten Konten nach 13.11.2023 mindestens 12 durchgehend angemeldete Testpersonen für 14 Tage, danach Produktionszugang beantragen.

## Achtung
Diese Liste bedeutet NICHT, dass die App bereits veröffentlicht werden darf. Die öffentlichen rechtlichen Angaben und die Android-Verifizierung sind offene Voraussetzungen.

Quellen:
- https://support.google.com/googleplay/android-developer/answer/9866151?hl=de
- https://support.google.com/googleplay/android-developer/answer/10144311?hl=de
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=de
