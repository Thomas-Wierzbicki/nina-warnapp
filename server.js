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
            if (!response.ok) continue;
            
            const warnings = await response.json();
            
            // Wir gehen jede gefundene Warnung einzeln durch
            for (const warning of warnings) {
                const warn_id = warning.id || "";
                if (!warn_id) continue;

                // Bundesland ermitteln
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

                // --- NEU: Detailabfrage für jede einzelne Warnung ---
                let realDescription = "Keine detaillierte Beschreibung verfügbar.";
                let realInstruction = "";
                let areasText = "Gesamtes Gebiet / Siehe Karte";

                try {
                    // Wir holen uns das vollständige Dossier zu dieser spezifischen Warnungs-ID
                    const detailRes = await fetch(`https://nina.api.proxy.bund.dev/api31/warnings/${warn_id}.json`);
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        const info = detailData.info && detailData.info[0] ? detailData.info[0] : {};

                        if (info.description) realDescription = info.description;
                        if (info.instruction) realInstruction = info.instruction;

                        // Betroffene Gebiete als Textliste auslesen
                        if (info.area && info.area.length > 0) {
                            const areaNames = info.area.map(a => a.areaDesc);
                            areasText = areaNames.slice(0, 3).join(', ');
                            if (areaNames.length > 3) areasText += ` und ${areaNames.length - 3} weitere`;
                        }
                    }
                } catch (err) {
                    console.error(`Detailabfrage für ${warn_id} fehlgeschlagen.`);
                }

                // Beschreibung und Handlungsempfehlung (falls vorhanden) sauber zusammenbauen
                let fullText = realDescription;
                if (realInstruction) {
                    // HTML-Zeilenumbrüche, damit es auf dem Dashboard gut lesbar bleibt
                    fullText += `<br><br><strong>Handlungsempfehlung:</strong><br>${realInstruction}`;
                }

                // Warnung in unseren Zwischenspeicher packen
                newStatus[state_name].push({
                    id: warn_id,
                    payload: { data: { headline, severity, description: fullText } },
                    info: [{ area: [{ areaDesc: areasText }] }]
                });
                totalWarnings++;
            }
        } catch (error) {
            console.error(`Fehler beim Abruf der Hauptliste (${url}):`, error.message);
        }
    }
    currentWarningsData = newStatus;
    console.log(`[${new Date().toLocaleTimeString('de-DE')}] ${totalWarnings} Warnungen (inkl. Details) geladen.`);
}

// Erster Start
fetchAllGermany();
setInterval(fetchAllGermany, POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`🚨 NINA Leitstelle Backend läuft auf Port ${PORT}`);
});
