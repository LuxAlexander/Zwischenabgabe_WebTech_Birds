# Zwischenabgabe: WebTech Birds (BirdSound Analytics)
---

## Funktionalität

Das **Vogelstimmen Dashboard** bietet eine benutzerfreundliche Oberfläche zur filterbasierten Erkundung ornithologischer Audioaufnahmen:

* **Suche:** Dynamische Abfrage der eigenen Datenbank über die Express.js-API (z. B. nach Ländern mit `cnt:austria`, Gattung mit `gen:turdus` oder Audio-Qualität).
* **Interaktive Daten-Visualisierung (Chart.js):**
  * **Top 5 Aufnehmer:** Ein vertikales Balkendiagramm zeigt die aktivsten Recordists des aktuellen Suchergebnisses.
  * **Ruf-Typen-Verteilung:** Ein modernes Doughnut-Diagramm schlüsselt die Verteilung der Audio-Kategorien (z. B. Gesang, Ruf, Alarm) visuell auf.
* **Detailansicht (Bootstrap Modals):** Per Klick auf ein Suchergebnis öffnet sich ein Pop-up-Fenster mit detaillierten Metadaten (Aufnehmer, 
exakter Ort, Ruf-Typ) und einem voll funktionsfähigen HTML5 **Audio-Player** zum Anhören der Vogelstimme.
* **Login und Registrierung:** Über ein Form, dass dem Benutzer erlaubt einen Account zu erstellen und sich einzuloggen, kann der Benutzer mehr funktionen freischalten. Die Session wird über Cookies gemanaged.

Ausgangs API:https://xeno-canto.org/explore/api
## Installations- und Startanleitung

Befolge diese Schritte, um das Projekt lokal auf deinem Computer einzurichten und zu starten.

### Vorraussetzungen
Stelle sicher, dass [Node.js](https://nodejs.org/) (inklusive `npm`) auf deinem System installiert ist.

### 1. Repository vorbereiten & Abhängigkeiten installieren
Navigiere im Terminal in deinen Projektordner und installiere die benötigten Node-Module (`express` & `axios`):

```bash
npm install
```

Danach kann das Projekt mit folgendem Befehl ausgeführt werden:
```bash
npm start
```