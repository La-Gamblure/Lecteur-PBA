/**
 * PBA Excel Processor
 * Avec fallback robuste sur la feuille pour transformExcel et workbookToJson
 */

/**
 * Charge un workbook ExcelJS à partir d'un File, Blob ou Workbook.
 * @param {Workbook|File|Blob|String} input
 * @returns {Promise<Workbook>}
 */
async function loadWorkbook(input) {
  // ExcelJS doit être chargé via un script dans le HTML
  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) throw new Error("ExcelJS n'est pas chargé dans la page !");
  if (input instanceof ExcelJS.Workbook) return input;

  const workbook = new ExcelJS.Workbook();
  if (input instanceof File || input instanceof Blob) {
    const arrayBuffer = await input.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    return workbook;
  } else {
    throw new Error("Format d'entrée non pris en charge (doit être File, Blob ou Workbook)");
  }
}

/**
 * Transforme un fichier Excel selon les spécifications PBA
 * @param {Workbook|File|Blob|String} input
 * @param {Object} options
 * @returns {Promise<Workbook>}
 */
async function transformExcel(input, options = {}) {
  try {
    const workbook = await loadWorkbook(input);

    // Sélection de la feuille : par index, nom, ou première instance
    let worksheet = workbook.getWorksheet(1)
      || workbook.getWorksheet('Sheet1')
      || (Array.isArray(workbook.worksheets) && workbook.worksheets[0]);

    if (!worksheet) {
      const names = Array.isArray(workbook.worksheets)
        ? workbook.worksheets.map(ws => ws.name)
        : [];
      throw new Error('Aucune feuille trouvée. Feuilles disponibles : ' + names.join(', '));
    }

    console.log('Feuilles disponibles :', workbook.worksheets.map(ws => ws.name));
    console.log('Feuille utilisée :', worksheet.name);

    // 1) Nettoyer A1:B1
    worksheet.getCell('A1').value = null;
    worksheet.getCell('B1').value = null;

    // 2) Déplacer A2:G2 → A1:G1
    for (let i = 1; i <= 7; i++) {
      const col = String.fromCharCode(64 + i);
      const v = worksheet.getCell(`${col}2`).value;
      worksheet.getCell(`${col}1`).value = v;
      worksheet.getCell(`${col}2`).value = null;
    }

    // 3) Insérer ligne de début
    ['Q1','12:00','0','Debut du match','','',''].forEach((v, i) => {
      const col = String.fromCharCode(65 + i);
      worksheet.getCell(`${col}2`).value = v;
    });

    // 4) Remplacer "{rien}"
    worksheet.eachRow({ includeEmpty: true }, row => row.eachCell({ includeEmpty: true }, cell => {
      if (cell.value === '{rien}') cell.value = '';
    }));

    // 5) Gérer DF2
    const df = worksheet.getCell('DF2');
    if (df && df.value === 0) df.value = '';

    // 6) Mapping standard des en-têtes pour compatibilité lecteur
    // On suppose que les colonnes après les commentaires sont les joueurs (A1...A5, B1...B5, etc.)
    // et que la première ligne contient les types de stats (Points, 3-Points, Rebounds, ...)

    // Exemple d'ordre attendu :
    // [scoreboard-QT, scoreboard-Temps, scoreboard-Etape, commentaire-Situation, commentaire-Joueur, commentaire-Equipe, commentaire-Succes,
    //  A1-Points, A1-3-Points, ..., B5-Total]

    // On définit ici le mapping des en-têtes attendus
    const statTypes = [
      'Points', '3-Points', 'Rebounds', 'Assist', 'Blocks', 'Steals', 'TurnOvers', 'DD', 'TD', 'Total'
    ];
    const playerIds = [];
    for (let t of ['A', 'B']) {
      for (let i = 1; i <= 5; i++) playerIds.push(`${t}${i}`);
    }

    // Construction de la nouvelle ligne d'en-têtes
    const headers = [
      'scoreboard-QT', 'scoreboard-Temps', 'scoreboard-Etape',
      'commentaire-Situation', 'commentaire-Joueur', 'commentaire-Equipe', 'commentaire-Succes'
    ];
    for (const pid of playerIds) {
      for (const stat of statTypes) {
        headers.push(`${pid}-${stat}`);
      }
    }

    // Force le nombre de colonnes à la taille des headers
    worksheet.columns = new Array(headers.length).fill({});
    // Écrase la première ligne avec les bons headers (compatible ExcelJS)
    const row1 = worksheet.getRow(1);
    for (let i = 0; i < headers.length; i++) {
      row1.getCell(i + 1).value = headers[i];
    }
    row1.commit();
    // (Optionnel) Truncate extra colonnes si besoin (inutile car columns est forcé)



    console.log('Transformation terminée sur', worksheet.name);
    return workbook;
  } catch (err) {
    console.error('Erreur transformExcel:', err);
    throw err;
  }
}

/**
 * Normalise une chaîne en identifiant CSS safe (remplace espaces, accents, etc.)
 * @param {string} str
 * @returns {string}
 */
function normalizeCssId(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire accents
    .replace(/[^a-zA-Z0-9_-]/g, '_') // caractères non valides → _
    .replace(/^_+|_+$/g, '') // retire _ en début/fin
    .toLowerCase();
}

/**
 * Convertit un workbook en JSON lignes/dictionnaires
 * @param {Workbook} workbook
 * @returns {Array<Object>}
 */
function workbookToJson(workbook) {
  try {
    // Sélection feuille de même manière
    let worksheet = workbook.getWorksheet(1)
      || workbook.getWorksheet('Sheet1')
      || (Array.isArray(workbook.worksheets) && workbook.worksheets[0]);

    if (!worksheet) {
      throw new Error('Aucune feuille pour la conversion JSON');
    }

    // Extraire en-têtes SANS normalisation (on garde la casse et les tirets)
    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      let h = String(cell.value || '').trim();
      if (!h) h = `Column${col}`;
      headers[col] = h; // pas de normalizeCssId
    });

    const data = [];
    // Parcourir lignes à partir de la 2
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const obj = {};
      let has = false;
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const key = headers[col];
        let val = cell.value;
        if (val && val.richText) val = val.richText.map(t => t.text).join('');
        else if (val && val.formula) val = val.result;
        obj[key] = val == null ? '' : val;
        if (obj[key] !== '') has = true;
      });
      if (has) data.push(obj);
    }

    console.log('Conversion en JSON terminée,', data.length, 'lignes.');
    return data;
  } catch (err) {
    console.error('Erreur workbookToJson:', err);
    throw err;
  }
}

/**
 * Traite un fichier Excel PBA : transformation + conversion en JSON
 * @param {Workbook|File|Blob|String} input
 * @param {Object} options
 * @returns {Promise<Object>} Objet contenant workbook et jsonData
 */
async function processExcel(input, options = {}) {
  const workbook = await transformExcel(input, options);
  let jsonData = workbookToJson(workbook);

  // Ajout automatique de la 701ème étape (copie de la dernière)
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    const lastStep = { ...jsonData[jsonData.length - 1] };
    lastStep["scoreboard-Etape"] = 701;
    lastStep["scoreboard-Temps"] = "0'00''";
    lastStep["commentaire-Situation"] = "Fin du Match !";
    jsonData.push(lastStep);
  }

  return { workbook, jsonData };
}

/**
 * Sauvegarde un workbook ExcelJS côté navigateur (retourne un Blob)
 * @param {Workbook} workbook
 * @returns {Promise<Blob>}
 */
async function saveWorkbook(workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Sauvegarde des données JSON côté navigateur (retourne un Blob)
 * @param {Array|Object} jsonData
 * @returns {Blob}
 */
function saveJson(jsonData) {
  const jsonStr = JSON.stringify(jsonData, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
}

if (typeof window !== 'undefined') {
  window.PBAExcelProcessor = {
    transformExcel,
    workbookToJson,
    processExcel,
    saveWorkbook,
    saveJson
  };
}

