# 🚨 NINA Leitstelle Deutschland & MeshCom Gateway

Ein ressourcenschonendes, interaktives Live-Dashboard für offizielle Warnmeldungen des Bundesamtes für Bevölkerungsschutz und Katastrophenhilfe (BBK) sowie des Deutschen Wetterdienstes (DWD). 

**Neu:** Mit integrierter MQTT-Schnittstelle zur vollautomatischen Weiterleitung von Extremwetter-Ereignissen an dezentrale Amateurfunk-Netzwerke (MeshCom / LoRa APRS) im Katastrophenfall (EMCOM).

Perfekt geeignet für den Dauerbetrieb auf einem Raspberry Pi, Kiosk-Monitoren oder als Ergänzung zu Systemen wie OpenHamClock.

## ✨ Features

* **Echtzeit-Daten:** Zieht Warnungen aus den offiziellen Systemen (MoWaS, BIWAPP, KATWARN, DWD).
* **Interaktive Live-Karte:** Zeichnet dank Leaflet.js und CAP-Geodatenverarbeitung die exakten Umrisse (Polygone) der betroffenen Gebiete direkt auf eine Dark-Mode Deutschlandkarte.
* **Intelligente Bündelung:** Das Backend filtert doppelte Landkreis-Warnungen des DWD automatisch heraus und fasst sie zu übersichtlichen Karten zusammen.
* **📡 MeshCom / MQTT Gateway:** Leitet kritische Unwetter- und Katastrophenwarnungen (z.B. ab Stufe ROT) vollautomatisch über einen MQTT-Broker an lokale MeshCom-Knoten weiter (APRS-optimiert). Inklusive intelligentem Spam-Schutz (kein Fluten des Funknetzes bei Server-Neustarts).
* **Live-Severity-Filter:** Meldungen lassen sich im Frontend per Dropdown nach Warnstufe filtern.
* **Pi-Friendly (SD-Karten schonend):** Das Node.js-Backend hält alle Warnungen ausschließlich im RAM. Keine ständigen Schreibzugriffe, vollautomatisches Aufräumen abgelaufener Warnungen.
* **Auto-Refresh UI:** Die Oberfläche aktualisiert sich asynchron jede Minute – kein manuelles Neuladen nötig.

## 🛠️ Voraussetzungen

* [Node.js](https://nodejs.org/) (Version 18 oder neuer empfohlen)
* `npm` (Node Package Manager)
* *(Optional für Funk-Anbindung)*: Ein laufender MQTT-Broker (z.B. Mosquitto) und ein MeshCom-Node.

## 🚀 Installation & Quick Start

**1. Repository klonen**
```bash
git clone [https://github.com/DEIN_USERNAME/nina-warnapp.git](https://github.com/DEIN_USERNAME/nina-warnapp.git)
cd nina-warnapp
2. Abhängigkeiten installieren
(Installiert Express.js, dotenv und den MQTT-Client)

Bash
npm install
3. Konfiguration erstellen
Lege im Hauptverzeichnis eine .env Datei an. Hier kannst du den Port und deine Funk-Schnittstelle konfigurieren.

Kopiere folgenden Block in deine .env:

Code-Snippet
# Server Port für das Dashboard
PORT=3002

# --- MESHCOM / MQTT KONFIGURATION ---
# Adresse des MQTT Brokers (z.B. mqtt://192.168.188.50 oder mqtt://127.0.0.1)
MQTT_BROKER=mqtt://127.0.0.1

# Das Topic, auf dem dein MeshCom-Node neue Nachrichten erwartet
MQTT_TOPIC=meshcom/tx

# Ab welcher Warnstufe soll gefunkt werden?
# 1 = Ab GELB (Minor / Gering) -> Achtung: Spam-Gefahr!
# 2 = Ab ORANGE (Moderate / Mittel)
# 3 = Ab ROT (Severe / Hoch) -> Standard für Unwetter/MoWaS
# 4 = Nur LILA (Extreme) -> Nur bei absoluten Katastrophen
MQTT_MIN_LEVEL=3
4. Server starten

Bash
# Für den produktiven Dauerbetrieb (oder per PM2/Systemd):
npm start

# Für die Entwicklung (mit automatischem Neustart bei Code-Änderungen):
npm run dev
5. Dashboard aufrufen
Öffne deinen Browser und rufe http://localhost:3002 (bzw. die IP-Adresse deines Raspberry Pis, z.B. http://192.168.188.xx:3002) auf.

📁 Projektstruktur
server.js - Das Node.js Backend. Holt Daten von der NINA API, übersetzt Geodaten-Polygone, fasst Warnungen zusammen und betreibt den MQTT-Client für das MeshCom-Gateway.

public/index.html - Das schlanke Frontend. Beinhaltet die Leaflet-Karte, das Live-Regenradar, das Styling (Dark Mode) und die Auto-Update-Logik.

.env - Lokale Konfigurationsdatei für Ports und MQTT-Zugangsdaten (wird nicht ins Git-Repo hochgeladen).

📄 Lizenz

Dieses Projekt ist unter der **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** lizenziert. 
Du darfst den Code für private, edukative und Amateurfunk-Zwecke frei verwenden, verändern und teilen. **Eine kommerzielle Nutzung oder der Verkauf (auch von abgewandelten Versionen) ist strengstens untersagt.**

⚠️ Disclaimer
Dieses Projekt nutzt die inoffizielle, offene NINA-Dashboard-API (warnung.bund.de). Es wird keine Garantie für die ständige Verfügbarkeit, Vollständigkeit oder Richtigkeit der Warnungen übernommen. Verlasse dich in echten Gefahrensituationen immer auf die offiziellen Warnmittel (Sirenen, Cell Broadcast, NINA-App, Radio).

Entwickelt für die Amateurfunk- und Maker-Community.
