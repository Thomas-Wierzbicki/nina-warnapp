# 🚨 NINA Leitstelle Deutschland (Warnapp Dashboard)

Ein ressourcenschonendes, interaktives Live-Dashboard für offizielle Warnmeldungen des Bundesamtes für Bevölkerungsschutz und Katastrophenhilfe (BBK) sowie des Deutschen Wetterdienstes (DWD). 

Perfekt geeignet für den Dauerbetrieb auf einem Raspberry Pi, Kiosk-Monitoren oder als Ergänzung zu Systemen wie **OpenHamClock**.

## ✨ Features

* **Echtzeit-Daten:** Zieht Warnungen aus den offiziellen Systemen (MoWaS, BIWAPP, KATWARN, DWD).
* **Interaktive Live-Karte:** Zeichnet dank Leaflet.js und CAP-Geodatenverarbeitung die exakten Umrisse (Polygone) der betroffenen Gebiete direkt auf eine Dark-Mode Deutschlandkarte.
* **Live-Severity-Filter:** Unwichtige Meldungen (z.B. leichter Frost) lassen sich im Frontend per Dropdown ausblenden. Das Backend filtert die Daten und spart Bandbreite.
* **Pi-Friendly (SD-Karten schonend):** Das Node.js-Backend hält alle Warnungen ausschließlich im RAM. Es gibt keine ständigen Schreibzugriffe auf die Festplatte/SD-Karte.
* **Auto-Refresh UI:** Die Oberfläche aktualisiert sich asynchron alle 60 Sekunden – kein manuelles Neuladen nötig.

## 🛠️ Voraussetzungen

* [Node.js](https://nodejs.org/) (Version 18 oder neuer empfohlen)
* `npm` (Node Package Manager)

## 🚀 Installation & Quick Start

1. **Repository klonen**
   ```bash
   git clone [https://github.com/DEIN_USERNAME/nina-warnapp.git](https://github.com/DEIN_USERNAME/nina-warnapp.git)
   cd nina-warnapp
Abhängigkeiten installieren

Bash
npm install
Konfiguration erstellen
Lege eine .env Datei an, um den Port festzulegen (Standard ist 3002, damit es nicht mit anderen Diensten wie OpenHamClock kollidiert).

Bash
echo "PORT=3002" > .env
Server starten

Bash
# Für den produktiven Dauerbetrieb:
npm start

# Für die Entwicklung (mit automatischem Hot-Reload bei Code-Änderungen):
npm run dev
Dashboard aufrufen
Öffne deinen Browser und rufe http://localhost:3002 (bzw. die IP-Adresse deines Raspberry Pis) auf.

📁 Projektstruktur
server.js - Das Node.js Express Backend. Holt alle 5 Minuten Daten von der NINA API, übersetzt Geodaten-Polygone und filtert Warnstufen für das Frontend.

public/index.html - Das schlanke Frontend. Beinhaltet die Leaflet-Karte, das Styling (Dark Mode) und die Auto-Update-Logik.

.env - (Nicht im Repo) Lokale Konfiguration (z.B. Port).

⚠️ Disclaimer
Dieses Projekt nutzt die inoffizielle, offene NINA-Dashboard-API (warnung.bund.de). Es wird keine Garantie für die ständige Verfügbarkeit, Vollständigkeit oder Richtigkeit der Warnungen übernommen. Verlasse dich in echten Gefahrensituationen niemals ausschließlich auf dieses Dashboard, sondern nutze offizielle Wege wie Sirenen, Radio oder die NINA-App auf deinem Smartphone!

Entwickelt für die Amateurfunk- und Maker-Community.


***

