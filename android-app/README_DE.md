# RatKing Android-Testprojekt

Dies ist die Vorbereitung für eine installierbare Android-Testversion. Das Browser-Spiel unter `spiele/` bleibt unverändert.

## Erste Debug-APK
1. In diesem GitHub-Repository den Reiter **Actions** öffnen.
2. **RatKing Android Test-APK** auswählen.
3. **Run workflow** anklicken und den Durchlauf starten.
4. Nach erfolgreichem Build im Bereich **Artifacts** die ZIP-Datei **RatKing-Android-Test-APK** herunterladen.
5. Aus dem ZIP `app-debug.apk` entpacken und auf einem Android-Gerät installieren.

Der Build benötigt eine Internetverbindung auf dem GitHub-Runner, aber das Spiel soll seine Inhalte lokal in der App halten. Bitte das Offline-Verhalten auf dem Android-Handy testen.

## Neue Grafiken
Neue Charaktergrafiken zuerst in `spiele/` integrieren. Beim nächsten GitHub-Build werden die aktuellen Spiel-Dateien automatisch kopiert. Spiellogik und Spielstände bei Updates prüfen.

## Wichtig
- Debug-APK nur zum Testen, nicht für den Play Store geeignet.
- Später benötigt der Play Store eine signierte Release-AAB und weitere Vorbereitungen.
- Die App-ID `de.gruetzwurst.ratking` ist vorläufig und muss vor der Veröffentlichung verbindlich gewählt werden.
- Eine automatische Aktualisierung bereits installierter Debug-APKs ist wegen möglicher wechselnder Signaturen nicht garantiert.
- Der Cloud-Build wurde bei Erstellung dieser Dateien noch nicht ausgeführt.
