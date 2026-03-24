# 🚨 NINA Warnapp Dashboard

Ein leichtgewichtiges, lokales Node.js-Dashboard für den Raspberry Pi. Es ruft in Echtzeit die offiziellen Gefahrenmeldungen des Bundesamts für Bevölkerungsschutz (BBK) ab und visualisiert sie auf einer interaktiven Deutschlandkarte im Dark Mode.

Perfekt geeignet, um als Leitstellen-Monitor auf einem separaten Bildschirm oder im Hintergrund neben Software wie **OpenHamClock** zu laufen!

## ✨ Features
* **Echtzeit-Daten:** Zieht Warnungen der drei großen Systeme (MoWaS, BIWAPP, KATWARN) direkt über die offizielle NINA-API.
* **Interaktive Karte:** Geografische Darstellung der Hotspots via Leaflet.js mit farbcodierten Warnstufen.
* **Ressourcenschonend:** Die abgerufenen JSON-Daten werden ausschließlich im Arbeitsspeicher (RAM) des Node-Servers gehalten. Das schont die SD-Karte des Raspberry Pi enorm.
* **Auto-Refresh:** Das Dashboard im Browser aktualisiert sich automatisch jede Minute (ohne Page-Reload).
* **Port-Konflikt-frei:** Läuft standardmäßig auf Port `3002`, um sich nicht mit HamClock (`3000`/`8081`) in die Quere zu kommen.

---

## 🚀 Quick Start (Installation)

Voraussetzungen: Node.js und npm müssen auf dem System installiert sein.

```bash
# 1. Repository klonen
git clone [https://github.com/DEIN_USERNAME/nina-warnapp.git](https://github.com/DEIN_USERNAME/nina-warnapp.git)
cd nina-warnapp

# 2. Abhängigkeiten installieren
npm install

# .env
PORT=3002

npm start

npm run dev




[Unit]
Description=NINA Warnapp Dashboard (Node.js)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/nina-warnapp
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target



sudo systemctl daemon-reload
sudo systemctl enable nina-warnapp
sudo systemctl start nina-warnapp
