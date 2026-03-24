require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
// Lade den Port aus der .env Datei (Fallback auf 3002)
const PORT = process.env.PORT || 3002;

const ENDPOINTS = [
    "https://nina.api.proxy.bund.dev/api31/mowas/mapData.json",
    "https://nina.api.proxy.bund.dev/api31/biwapp/mapData.json",
    "https://nina.api.proxy.bund.dev/api31/katwarn/mapData.json"
];

const STATE_MAPPING = {
    "BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin",
    "BB": "Brandenburg", "HB": "Bremen", "HH": "Hamburg",
    "HE": "Hessen", "MV": "Mecklenburg-Vorpommern", "NI": "Niedersachsen",
    "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz", "SL": "Saarland",
    "SN": "Sachsen", "ST": "Sachsen-Anhalt", "SH": "Schleswig-Holstein",
    "TH": "Thüringen", "DE": "Deutschlandweit"
};

const POLL_INTERVAL = 300 * 1000; 
let currentWarningsData = {};     

app.use(express.static(path.join(__dirname, 'public')));

app.get('/nina_current.json', (req, res) => {
    res.json(currentWarningsData);
});

async function fetchAllGermany() {
    console.log(`[${new Date().toLocaleTimeString('de-DE')}] NINA API Abfrage gestartet...`);
    let newStatus = {};
    Object.values(STATE_MAPPING).forEach(state => newStatus[state] = []);
    newStatus["Unbekanntes Gebiet"] = [];
    let totalWarnings = 0;

    for (const url of ENDPOINTS) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const warnings = await response.json();
                warnings.forEach(warning => {
                    const warn_id = warning.id || "";
                    if (!warn_id) return;

                    let state_name = "Unbekanntes Gebiet";
                    if (warn_id.includes("DE-")) {
                        const parts = warn_id.split("DE-");
                        if (parts.length > 1) {
                            const state_code = parts[1].substring(0, 2);
                            state_name = STATE_MAPPING[state_code] || "Unbekanntes Gebiet";
                        }
                    }

                    const headline = warning.i18nTitle?.de || "Warnung";
                    const severity = warning.severity || "Unknown";

                    newStatus[state_name].push({
                        id: warn_id,
                        payload: { data: { headline, severity, description: "Bitte die NINA-App prüfen." } },
                        info: [{ area: [{ areaDesc: "Ort siehe Karte" }] }]
                    });
                    totalWarnings++;
                });
            }
        } catch (error) {
            console.error(`Fehler (${url}):`, error.message);
        }
    }
    currentWarningsData = newStatus;
    console.log(`[${new Date().toLocaleTimeString('de-DE')}] ${totalWarnings} Warnungen geladen.`);
}

fetchAllGermany();
setInterval(fetchAllGermany, POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`🚨 NINA Leitstelle Backend läuft auf http://localhost:${PORT}`);
});
