const axios = require('axios');

async function testBBK() {
    console.log("Starte direkten Test-Abruf...");
    try {
        const response = await axios.get("https://warnung.bund.de/api31/mowas/mapData.json", {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        const data = response.data;
        console.log(`\nErfolg! ${data.length} Warnungen geladen.`);

        if (data.length > 0) {
            console.log("\nStruktur des ERSTEN Eintrags (Rohdaten):");
            console.dir(data[0], { depth: null, colors: true });
        } else {
            console.log("\nDie API liefert ein leeres Array [] zurück.");
        }
    } catch (error) {
        console.error("\n[!] FEHLSCHLAG in Node.js:");
        console.error(error.message);
    }
}

testBBK();
