/**
 * PBA Excel Processor  –  v2
 * - Indépendant du sheetId interne
 * - Supprime la colonne « DG / commentaire »
 */

const PBAExcelProcessor = (function () {
  /* ---------- Dépendances ---------- */
  let excelJS, fs, path;
  const isNode = typeof window === 'undefined' && typeof process !== 'undefined';
  if (isNode) {
    excelJS = require('exceljs');
    fs = require('fs');
    path = require('path');
  } else {
    excelJS = window.ExcelJS;
    if (!excelJS) console.error("ExcelJS non chargé dans la page.");
  }

  /* ---------- Helpers ---------- */
  function normalizeCssId(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // accents
      .replace(/\s+/g, "-")             // espaces → tirets
      .replace(/[^\w\-]/g, "");         // caractères non valides
  }

  /* ---------- Étape 1 : transformation Excel ---------- */
  async function transformExcel(input) {
    const workbook = await loadWorkbook(input);

    if (!workbook.worksheets.length)
      throw new Error("Le classeur ne contient aucune feuille.");

    const ws = workbook.worksheets[0];          // 1ʳᵉ feuille quel que soit le sheetId

    /* 1. vider A1:B1 ----------------------------------------------------- */
    ws.getCell('A1').value = null;
    ws.getCell('B1').value = null;

    /* 2. déplacer A2:G2 → A1:G1 ------------------------------------------ */
    for (let i = 1; i <= 7; i++) {
      const L = String.fromCharCode(64 + i);
      ws.getCell(`${L}1`).value = ws.getCell(`${L}2`).value;
      ws.getCell(`${L}2`).value = null;
    }

    /* 3. nouvelle ligne A2:G2 -------------------------------------------- */
    ["Q1", "12:00", 0, "Debut du match", "", "", ""]
      .forEach((v, i) => ws.getCell(2, i + 1).value = v);

    /* 4. remplacer {rien} et DF2 ----------------------------------------- */
    ws.eachRow({ includeEmpty: true }, row =>
      row.eachCell({ includeEmpty: true }, c => {
        if (c.value === "{rien}") c.value = "";
      })
    );
    if (ws.getCell('DF2').value === 0) ws.getCell('DF2').value = "";

    /* 5. préfix scoreboard / commentaire sur A1:G1 ----------------------- */
    const headCells = Array.from({ length: 7 }, (_, i) => ws.getCell(1, i + 1));
    headCells.slice(0, 3).forEach(c => { if (c.value) c.value = `scoreboard ${c.value}`; });
    headCells.slice(3).forEach(c =>    { if (c.value) c.value = `commentaire ${c.value}`; });

    /* 6. renommage des joueurs → A1… B5 ---------------------------------- */
    const playerMap = {}, order = [], totals = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      const v = cell.value;
      if (v === "Total") totals.push(col);
      if (typeof v === 'string' && v.includes('-')) {
        const [name, stat] = v.split('-', 2);
        if (!playerMap[name]) playerMap[name] = { cols: [], team: null };
        playerMap[name].cols.push({ col, stat });
        if (!order.includes(name)) order.push(name);
      }
    });
    order.forEach((name, idx) => {
      const team = idx < 5 ? 'A' : 'B';
      const num = (idx % 5) + 1;
      playerMap[name].team = team;
      playerMap[name].cols.forEach(({ col, stat }) =>
        ws.getCell(1, col).value = `${team}${num} ${stat}`);
      if (totals[idx] != null)
        ws.getCell(1, totals[idx]).value = `${team}${num} Total`;
    });

    /* 7. scoreboard Score cumulé + format Temps + colonne Equipe ---------- */
    let colEquipe, colComment = null;
    ws.getRow(1).eachCell((cell, col) => {
      if (typeof cell.value === 'string') {
        if (cell.value.includes("Score cumulé"))
          cell.value = `scoreboard ${cell.value}`;
        if (cell.value.toLowerCase() === "commentaire") colComment = col;
      }
      if (cell.value === "Equipe") colEquipe = col;
    });
    // format Temps
    ws.eachRow((row, r) => {
      if (r === 1) return;
      const cell = row.getCell(2);
      if (typeof cell.value === 'string')
        cell.value = cell.value.replace(/(\d+)'(\d+)''/, "$1:$2");
    });
    // supprimer colonnes Equipe et Commentaire (DG)
    if (colEquipe)   ws.spliceColumns(colEquipe, 1);
    if (colComment)  ws.spliceColumns(colComment, 1);    // ← DG ou autre position
    else if (ws.columnCount >= 111) ws.spliceColumns(111, 1); // filet de sécurité

    console.log("Transformation terminée");
    return workbook;
  }

  /* ---------- Étape 2 : conversion JSON ---------- */
  function workbookToJson(workbook) {
    const ws = workbook.worksheets[0];
    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      let h = String(cell.value || `Column_${col}`);
      headers[col - 1] = normalizeCssId(h);
    });

    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r), obj = {};
      let keep = false;
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        const h = headers[c - 1];
        let v = cell.value;
        if (v && v.richText) v = v.richText.map(t => t.text).join('');
        if (v && v.formula) v = v.result;
        if (v && v.text)    v = v.text;
        if (v == null) v = "";
        if (v !== "") keep = true;
        obj[h] = v;
      });
      if (keep) rows.push(obj);
    }
    return rows;
  }

  /* ---------- Utilitaires ---------- */
  async function loadWorkbook(input) {
    if (input instanceof excelJS.Workbook) return input;
    const wb = new excelJS.Workbook();
    if (isNode && typeof input === 'string') {
      return await wb.xlsx.readFile(input);
    }
    if (!isNode && (input instanceof File || input instanceof Blob)) {
      return await wb.xlsx.load(await input.arrayBuffer());
    }
    throw new Error("Format d'entrée non pris en charge");
  }

  async function saveWorkbook(wb, out) {
    if (isNode && out) {
      if (!fs.existsSync(path.dirname(out))) fs.mkdirSync(path.dirname(out), { recursive: true });
      await wb.xlsx.writeFile(out);
      return out;
    }
    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async function saveJson(js, out) {
    const str = JSON.stringify(js, null, 2);
    if (isNode && out) {
      if (!fs.existsSync(path.dirname(out))) fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, str);
      return out;
    }
    return new Blob([str], { type: 'application/json' });
  }

  /* ---------- API publique ---------- */
  return {
    processExcel: async (input) => {
      const wb  = await transformExcel(input);
      const js  = workbookToJson(wb);
      return { workbook: wb, jsonData: js };
    },
    transformExcel, workbookToJson, saveWorkbook, saveJson,

    /* usage Node : ligne de commande ------------------------------------ */
    nodeProcessFiles: isNode ? async (inF, outX, outJ) => {
      const wb = await transformExcel(inF);
      await saveWorkbook(wb, outX);
      const js = workbookToJson(wb);
      await saveJson(js, outJ);
      console.log("✓ Terminé");
    } : null
  };
})();

/* ---------- Export & exécution CLI ---------- */
// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PBAExcelProcessor;
}
// Exposer le module au navigateur
if (typeof window !== 'undefined') {
  window.PBAExcelProcessor = PBAExcelProcessor;
}

// Si le script est exécuté directement en mode Node.js
if (typeof require !== 'undefined' && require.main === module) {
  PBAExcelProcessor.nodeProcessFiles(
    "input/Match4.xlsx",
    "output/Match4-transformé.xlsx",
    "output/Match4.json"
  ).catch(err => console.error(err));
}
