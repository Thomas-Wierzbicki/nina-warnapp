require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3002;

/**
 * --- KONFIGURATION AUS .ENV ---
 */
const isTest = process.env.TEST_MODE === 'true';
const UPDATE_INTERVAL_MS = isTest ? 60000 : 3600000; // 1 Min im Test, sonst 60 Min
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://127.0.0.1";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "meshcom/tx";
const MQTT_MIN_LEVEL = parseInt(process.env.MQTT_MIN_LEVEL) || 1;
const CALL_DST = process.env.CALL_DST || "9";

// Heimat-Regionen Logik
const HOME_ARS_RAW = process.env.HOME_ARS || "";
const homeArsList = HOME_ARS_RAW ? HOME_ARS_RAW.split(',').map(s => s.trim()) : [];

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * --- MQTT CLIENT ---
 */
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    console.log(`✅ MQTT: Verbunden mit Broker (${MQTT_BROKER})`);
});

mqttClient.on('error', (err) => {
    console.error(`❌ MQTT Fehler: ${err.message}`);
});

/**
 * --- GPS-DATENBANK LADEN ---
 * Lädt die regionalschluessel_gps_liste.txt in eine Map für schnellen Zugriff.
 */
let ARS_DATABASE = new Map();

function loadGpsDatabase() {
    console.log("\n" + "=".repeat(70));
    try {
        const filePath = path.join(__dirname, 'regionalschluessel_gps_liste.txt');
        if (!fs.existsSync(filePath)) {
            console.error("⚠️  DATEI FEHLT: regionalschluessel_gps_liste.txt nicht gefunden!");
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        let count = 0;

        lines.forEach((line, i) => {
            if (i === 0 || !line.trim()) return; // Header überspringen
            const p = line.split(';');
            if (p.length >= 4) {
                const ars = p[0].trim();
                const lat = parseFloat(p[2].replace(',', '.'));
                const lon = parseFloat(p[3].replace(',', '.'));
                if (!isNaN(lat)) {
                    ARS_DATABASE.set(ars, { name: p[1].trim(), lat, lon });
                    count++;
                }
            }
        });
        console.log(`✅ GPS-Daten: ${count} Orte erfolgreich geladen.`);
        
        if (homeArsList.length > 0) {
            console.log(`🏠 Heimat-Filter aktiv für ARS: ${homeArsList.join(', ')}`);
        } else {
            console.log(`🌍 Globaler Modus: Alle Warnungen werden gefunkt.`);
        }
    } catch (err) {
        console.error("❌ Fehler beim Laden der GPS-Liste:", err.message);
    }
    console.log("=".repeat(70));
}

loadGpsDatabase();

/**
 * --- DATEN-CACHE & NINA LOGIK ---
 */
let currentWarningsData = {};
let warningDetailsCache = {};

const ENDPOINTS = [
    "https://warnung.bund.de/api31/mowas/mapData.json",
    "https://warnung.bund.de/api31/katwarn/mapData.json",
    "https://warnung.bund.de/api31/biwapp/mapData.json",
    "https://warnung.bund.de/api31/dwd/mapData.json"
];

const severityMap = { "Extreme": 4, "Severe": 3, "Moderate": 2, "Minor": 1 };

async function fetchNinaData() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🔄 NINA Update-Zyklus gestartet...`);
    let newWarnings = {};
    let currentKeys = new Set();

    for (const url of ENDPOINTS) {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            if (!Array.isArray(response.data)) continue;

            for (const warning of response.data) {
                const id = warning.id || warning.identifier;
                currentKeys.add(id);

                let title = warning.i18nTitle?.de || warning.headline || "Warnung";
                let severity = warning.severity || "Minor";
                let regionName = "Überregional / Unbekannt";
                let coords = null;
                let description = title;
                let rawArsString = "";
                let warningArsList = [];

                // Falls Details schon im Cache sind
                if (warningDetailsCache[id]) {
                    const cached = warningDetailsCache[id];
                    regionName = cached.regionName;
                    coords = cached.coords;
                    description = cached.description;
                    rawArsString = cached.rawArsString;
                    warningArsList = cached.warningArsList;
                } else {
                    // Details von API laden
                    try {
                        const dRes = await axios.get(`https://warnung.bund.de/api31/warnings/${id}.json`, { timeout: 5000 });
                        const info = dRes.data.info[0] || {};
                        description = info.description || title;
                        const arsParam = info.parameter?.find(p => p.valueName === "warnVerwaltungsbereiche");
                        
                        if (arsParam) {
                            rawArsString = arsParam.value;
                            warningArsList = rawArsString.split(",").map(s => s.trim());
                            
                            let sumLat = 0, sumLon = 0, matchCount = 0, firstMatchName = "";

                            // Schwerpunkt-Berechnung (Centroid)
                            warningArsList.forEach(ars => {
                                const kId = ars.substring(0, 5) + "0000000"; // Fallback auf Kreisebene
                                const match = ARS_DATABASE.get(ars) || ARS_DATABASE.get(kId);
                                if (match) {
                                    sumLat += match.lat;
                                    sumLon += match.lon;
                                    matchCount++;
                                    if (!firstMatchName) firstMatchName = match.name;
                                }
                            });

                            if (matchCount > 0) {
                                regionName = matchCount > 1 ? `${firstMatchName} (+${matchCount - 1})` : firstMatchName;
                                coords = { lat: sumLat / matchCount, lon: sumLon / matchCount };
                            }
                        }
                    } catch (e) {
                        // Bei Fehlern bleibt regionName "Überregional"
                    }
                    // In Cache speichern
                    warningDetailsCache[id] = { regionName, coords, description, rawArsString, warningArsList };
                }

                /**
                 * --- FUNK-FILTER LOGIK ---
                 */
                const level = severityMap[severity] || 0;
                let shouldBroadcast = false;

                if (level >= MQTT_MIN_LEVEL) {
                    if (homeArsList.length === 0) {
                        shouldBroadcast = true; // Sende alles
                    } else {
                        // Prüfe ob Heimat-ARS in der Warnung vorkommt
                        shouldBroadcast = warningArsList.some(wArs => {
                            const wArsKreis = wArs.substring(0, 5);
                            return homeArsList.some(hArs => hArs === wArs || hArs.startsWith(wArsKreis));
                        });
                    }
                }

                if (shouldBroadcast) {
                    console.log(`📻 FUNK-TX: [${regionName}] ${title}`);
                    const payload = {
                        type: "msg",
                        dst: CALL_DST,
                        msg: `NINA (${severity}): ${title}`.substring(0, 140)
                    };
                    mqttClient.publish(MQTT_TOPIC, JSON.stringify(payload));
                }

                // Für Web-Dashboard speichern (ALLE Warnungen)
                if (!newWarnings[regionName]) newWarnings[regionName] = [];
                newWarnings[regionName].push({ 
                    id, 
                    severity, 
                    title, 
                    description, 
                    rawArsString, // Wichtig für Frontend-Status
                    date: new Date(warning.sent || Date.now()).toLocaleString('de-DE') + " Uhr", 
                    coords 
                });
            }
        } catch (err) {
            console.error(`⚠️  API Fehler bei Endpunkt ${url.split('/')[4]}`);
        }
    }

    // Cache-Bereinigung für abgelaufene IDs
    for (const key in warningDetailsCache) {
        if (!currentKeys.has(key)) delete warningDetailsCache[key];
    }

    currentWarningsData = newWarnings;
    console.log(`✅ Update beendet. Nächster Check in ${UPDATE_INTERVAL_MS / 1000}s.`);
}

/**
 * --- API ENDPUNKTE ---
 */

// Haupt-Daten für das Frontend
app.get('/nina_current.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(currentWarningsData);
});

// Config-Status für das Hover-Menü
app.get('/api/config', (req, res) => {
    res.json({
        STATION: process.env.STATION || "DA1TWD",
        BROKER: MQTT_BROKER,
        MIN_LEVEL: MQTT_MIN_LEVEL,
        TEST: isTest,
        CALL: CALL_DST,
        HOME_ARS_RAW: HOME_ARS_RAW
    });
});

/**
 * --- SERVER START ---
 */
setInterval(fetchNinaData, UPDATE_INTERVAL_MS);
fetchNinaData(); // Sofort-Start beim Booten

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NINA-MeshCom Server online auf Port ${PORT}`);
    console.log(`📡 Überwachung läuft...`);
});
