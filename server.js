require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
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

// Gewichtung für die Sortierung im Backend
const SEVERITY_WEIGHTS = {
    "Extreme": 4, "Severe": 3, "Moderate": 2, "Minor": 1, "Unknown": 0
};

const POLL_INTERVAL = 300 * 1000; 
let currentWarningsData = {};     

app.use(express.static(path.join(__dirname, 'public')));

app.get('/nina_current.json', (req, res) => {
    res.json(currentWarningsData);
});

async function fetchAllGermany() {
    console.log(`[${new Date().toLocaleTimeString('de-DE')}] NINA API Abfrage gestartet...`);
    let rawStatus = {};
    Object.values(STATE_MAPPING).forEach(state => rawStatus[state] = []);
    rawStatus["Unbekanntes Gebiet"] = [];
    let totalWarnings = 0;

    for (const url of ENDPOINTS) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const warnings = await response.json();
            
            for (const warning of warnings) {
                const warn_id = warning.id || "";
                if (!warn_id) continue;

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

                let realDescription = "Keine detaillierte Beschreibung verfügbar.";
                let realInstruction = "";
                let areasText = "Gesamtes Gebiet / Siehe Karte";

                try {
                    const detailRes = await fetch(`https://nina.api.proxy.bund.dev/api31/warnings/${warn_id}.json`);
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        const info = detailData.info && detailData.info[0] ? detailData.info[0] : {};
                        if (info.description) realDescription = info.description;
                        if (info.instruction) realInstruction = info.instruction;
                        if (info.area && info.area.length > 0) {
                            const areaNames = info.area.map(a => a.areaDesc);
                            areasText = areaNames.slice(0, 3).join(', ');
                            if (areaNames.length > 3) areasText += ` und ${areaNames.length - 3} weitere`;
                        }
                    }
                } catch (err) {
                    console.error(`Detailabfrage für ${warn_id} fehlgeschlagen.`);
                }

                let fullText = realDescription;
                if (realInstruction) fullText += `<br><br><strong>Handlungsempfehlung:</strong><br>${realInstruction}`;

                rawStatus[state_name].push({
                    id: warn_id,
                    headline: headline,
                    severity: severity,
                    description: fullText,
                    areas: areasText
                });
                totalWarnings++;
            }
        } catch (error) {
            console.error(`Fehler beim Abruf (${url}):`, error.message);
        }
    }

    // --- NEU: Daten im Backend intelligent aufbereiten und sortieren ---
    let processedData = {
        total: totalWarnings,
        states: {}
    };

    for (const [state, warnings] of Object.entries(rawStatus)) {
        if (warnings.length > 0) {
            // Warnungen nach Wichtigkeit sortieren (Extreme zuerst)
            warnings.sort((a, b) => {
                const weightA = SEVERITY_WEIGHTS[a.severity] || 0;
                const weightB = SEVERITY_WEIGHTS[b.severity] || 0;
                return weightB - weightA;
            });

            // Da sortiert ist, steht die höchste Warnstufe automatisch ganz oben an Stelle [0]
            processedData.states[state] = {
                highestSeverity: warnings[0].severity,
                count: warnings.length,
                warnings: warnings
            };
        }
    }

    currentWarningsData = processedData;
    console.log(`[${new Date().toLocaleTimeString('de-DE')}] ${totalWarnings} Warnungen verarbeitet und sortiert.`);
}

fetchAllGermany();
setInterval(fetchAllGermany, POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`🚨 NINA Leitstelle Backend läuft auf Port ${PORT}`);
});
