// CSV-to-JSON.js
// Script extrait de csv-converter.html pour le cloisonnement du convertisseur

function parseCSVManually(csvContent, delimiter, teamA, teamB) {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        console.error("Fichier CSV invalide: moins de 2 lignes");
        return;
    }
    const data = lines.map(line => line.split(delimiter));
    console.log(`CSV parsé: ${data.length} lignes`);
    const matchInfo = {
        teamA: teamA,
        teamB: teamB,
        date: new Date().toISOString().split('T')[0]
    };
    let actions = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < 7) continue;
        try {
            const action = {
                quarter: row[0] || '',
                time: row[1] || '',
                step: parseInt(row[2], 10) || 0,
                situation: row[3] || '',
                player: row[4] || '',
                team: row[5] || '',
                result: row[6] || '',
                scoreA: parseFloat((row[107] || '0').replace(',', '.')) || 0,
                scoreB: parseFloat((row[108] || '0').replace(',', '.')) || 0,
                possession: row[109] || ''
            };
            action.playerStats = { teamA: {}, teamB: {} };
            actions.push(action);
        } catch (err) {
            console.warn(`Erreur ligne ${i+1}: ${err.message}`);
        }
    }
    const jsonOutput = {
        matchInfo,
        actions
    };
    console.log('JSON généré : ' + JSON.stringify(jsonOutput, null, 2));
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('convert-btn').addEventListener('click', function() {
        const file = document.getElementById('csvFileInput').files[0];
        const teamA = document.getElementById('team-a').value || "Equipe A";
        const teamB = document.getElementById('team-b').value || "Equipe B";
        const delimiter = document.getElementById('delimiter').value;
        const jsonOutput = document.getElementById('json-output');
        jsonOutput.textContent = "Chargement et analyse du fichier en cours...\n";
        if (file && file.name.toLowerCase().endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvContent = e.target.result;
                jsonOutput.textContent += `\nAperçu du CSV:\n${csvContent.substring(0, 200)}...\n\n`;
                const originalLog = console.log;
                const originalWarn = console.warn;
                const originalError = console.error;
                console.log = function(message) {
                    jsonOutput.textContent += `LOG: ${message}\n`;
                    if (typeof message === 'string' && message.startsWith('JSON généré :')) {
                        const jsonString = message.replace('JSON généré :', '').trim();
                        if (jsonString && jsonString !== '{}') {
                            jsonOutput.textContent += `\nJSON généré avec succès!\n${jsonString}`;
                            const downloadBtn = document.getElementById('download-btn');
                            downloadBtn.disabled = false;
                            downloadBtn.onclick = function() {
                                downloadJSON(jsonString, 'match-data.json');
                            };
                        } else {
                            jsonOutput.textContent += `\nERREUR: JSON vide généré\n`;
                        }
                    }
                    originalLog.apply(console, arguments);
                };
                parseCSVManually(csvContent, delimiter, teamA, teamB);
                console.log = originalLog;
                console.warn = originalWarn;
                console.error = originalError;
            };
            reader.readAsText(file);
        } else {
            alert("Veuillez sélectionner un fichier CSV valide.");
        }
    });
});

function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
