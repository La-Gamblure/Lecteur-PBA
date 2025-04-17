/* -----------------------------------------------------------------------
 *  commentary‑generator.js
 *  =======================
 *  •  Parse la timeline JSON du PBA
 *  •  Devine RBD / AST / TO / BLK quand ils n’existent pas
 *  •  Génère une phrase de commentaire riche en emoji
 *  -------------------------------------------------------------------- */

/* ---------- 1.  Dictionnaires (labels, emoji, templates) -------------- */

export const RESULT_LABEL = {
  made   : 'réussi',
  success: 'réussi',
  miss   : 'raté',
  fail   : 'raté',
  failure: 'raté',
  block  : 'contré'
};

export const ACTION_EMOJI = {
  '2PT' : '💥',
  '3PT' : '🎯',
  'RBD' : '✋',
  'AST' : '',
  'BLK' : '🛑',
  'STL' : '🦅',
  'TO'  : '❌',
  'DD'  : '👏',
  'TD'  : '💪',
  'PASS': ''
};
export const COMMENT_TEMPLATES = {
  "2PT": {
    success: [
      "Magnifique ! {player} à mi-distance !",
      "Joli fadeaway de {player} pour 2 points.",
      "BAM ! {player} transperce le filet !",
      "{player} avec l'autorité au cercle !",
      "{player} claque un dunk puissant ! 💥",
      "{player} en suspension, c'est dedans ! 🔥",
      "{player} parfaitement exécuté à 2 pts !",
      "Belle finition de {player} près du cercle !",
      "{player} au dunk ! Spectaculaire ! 💥"
    ],
    fail: [
      "{player} manque son tir à mi-distance.",
      "Tentative de {player} qui rebondit sur le cercle.",
      "Tir très compliqué de {player} ! 🤦",
      "{player} manque l'immanquable ! 😱",
      "{player} rate son lay-up... 😤",
      "Oh {player}, il faut faire mieux que ça !",
      "Raté pour {player} ! Il grimace !",
      "Le tir de {player} rebondit sur l'anneau",
      "Airball complet de {player} ! 💨"
    ],
    block: [
      "{player} se fait contrer sèchement ! 🖐️",
      "Contre autoritaire sur {player} !",
      "{player} repoussé au moment du tir !",
      "{player} voit son tir stoppé net ! 🛑"
    ]
  },
  "3PT": {
    success: [
      "BANG ! {player} ajoute 3 points !",
      "Superbe ! {player} à 3 points !",
      "BANG ! {player} dans le money time ! 💣",
      "{player} fait lever la salle à 3 points ! 🙌",
      "À la manière de Curry pour {player} ! 🎯",
      "{player} en confiance totale de loin ! 🔥",
      "{player} a fermé les yeux et ça rentre... quelle chance ! 🍀"
    ],
    fail: [
      "{player} trop court aux 3 points.",
      "{player} de loin, et c'est manqué.",
      "{player} airball à 3 points, c'est difficile.",
      "{player} dans le money time, mais ça ne rentre pas",
      "La tentative lointaine de {player} sur le cercle",
      "{player} force son tir à 3 points",
      "La tentative lointaine de {player} ricoche",
      "{player} force son tir à 3, sans succès",
      "Raté ! il est temps que {player} dépense des $PAD !",
      "Encore raté ! {player} doit retrouver sa main !",
      "Le triple de {player} ne trouve pas la cible"
    ],
    block: [
      "{player} contré à 3 pts !",
      "Le tir de {player} est rejeté !",
      "{player} se fait contrer ! 🖐️",
      "Le shooteur {player} est neutralisé !",
      "{player} se fait éteindre sur sa tentative !",
      "Grosse contestation sur le tir de {player} !",
      "La défense monte sur {player} !"
    ]
  },
  "RBD": {
    neutral: [
      "Rebond capté par {player} !",
      "{player} s'impose au rebond !",
      "{player} arrache le ballon au rebond !"
    ]
  },
  "BLK": {
    neutral: [
      "Contre magistral de {player} !",
      "{player} dit « pas dans ma raquette ! »",
      "{player} impose sa loi défensive !",
      "{player} refuse le tir !"
    ]
  },
  "STL": {
    neutral: [
      "Interception de {player} !",
      "{player} subtilise le ballon !",
      "{player} avec les mains baladeuses !",
      "c'est parfaitement anticipé par {player} ! 🥷"
    ]
  },
  "POS": {
    self: [
      "{from} temporise... 🤔",
      "{from} feinte et garde le ballon",
      "{from} en pleine hésitation",
      "{from} feinte la passe et se ravise",
      "{from} hésite...",
      "{from} sans solution, faut l'aider !"
    ],
    neutral: [
      "Superbe passe de {from} pour {to}",
      "{from} ➡️ {to}",
      "{from} trouve {to} dans le corner",
      "{from} sert {to}",
      "🏀 {from} pour l'alley-oop de {to} !",
      '{player} de loin, et c\'est manqué.',
      "{player} airball à 3 points, c\'est difficile.",
      "{player} dans le money time, mais ça ne rentre pas",
      "La tentative lointaine de {player} sur le cercle",
      "{player} force son tir à 3 points",
      "La tentative lointaine de {player} ricoche",
      "{player} force son tir à 3, sans succès",
      "Raté ! il est temps que {player} dépense des $PAD !",
      "Encore raté ! {player} doit retrouver sa main !",
      'Le triple de {player} ne trouve pas la cible'
    ],
    block: [
      '{player} contré à 3 pts !',
      'Le tir de {player} est rejeté !',
      '{player} se fait contrer ! 🖐️',
      'Le shooteur {player} est neutralisé !',
      '{player} se fait éteindre sur sa tentative !',
      'Grosse contestation sur le tir de {player} !',
      'La défense monte sur {player} !'
    ]
  },
  'RBD': {
    neutral: [
      'Rebond capté par {player} !',
      '{player} s\'impose au rebond !',
      '{player} arrache le ballon au rebond !',
     ]
  },
   'BLK': {
    neutral: [
      'Contre magistral de {player} !',
      '{player} dit « pas dans ma raquette ! »',
      '{player} impose sa loi défensive !',
      '{player} refuse le tir !'
    ]
  },
  'STL': {
    neutral: [
      'Interception de {player} !',
      '{player} subtilise le ballon !',
      '{player} avec les mains baladeuses !',
      'c\'est parfaitement anticipé par {player} ! 🥷'
    ]
  },
  'POS': {
    self: [
      '{from} temporise... 🤔',
      '{from} feinte et garde le ballon',
      '{from} en pleine hésitation',
      '{from} feinte la passe et se ravise',
      '{from} hésite...',
      '{from} sans solution, faut l\'aider !'
    ],
    neutral: [
      'Superbe passe de {from} pour {to}',
      '{from} ➡️ {to}',
      '{from} trouve {to} dans le corner',
      '{from} sert {to}',
      '🏀 {from} pour l\'alley-oop de {to} !',
      '{from} avec la passe aveugle pour {to}',
      'Caviar de {from} à {to} ✨',
      '{from} parfaitement donné à {to} !'
    ]
  }
};  
/* ---------------------- 2.  Utilitaires ------------------------------- */

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/** Devine s’il s’agit d’un tir à 2 ou 3 points. */
function detectShotType(play) {
  // 1) colonne "3‑Points" (format A4-3-Points, B1 3 Points, etc.)
  const threeKey = Object.keys(play).find(k =>
    k.toLowerCase().includes('3') && k.toLowerCase().includes('points') && +play[k] > 0
  );
  if (threeKey) return '3PT';

  // 2) Points == 3
  const ptsKey = Object.keys(play).find(k =>
    k.toLowerCase().endsWith('points') && +play[k] === 3
  );
  return ptsKey ? '3PT' : '2PT';
}

/* ----------------- 3.  Enrichissement de la timeline ------------------ */

/**
 * Ajoute actionType / actionResult aux lignes brutes + déduit RBD/AST/TO/BLK
 * @param {Array<Object>} rawPlays  Tableau JSON issu du fichier PBA
 * @returns {Array<Object>}         Tableau enrichi
 */
export function enrichPlays(rawPlays) {
  const plays = rawPlays.map(p => ({ ...p, actionType: null, actionResult: null }));

  for (let i = 0; i < plays.length; i++) {
    const cur  = plays[i];
    const prev = plays[i - 1] || {};
    const next = plays[i + 1] || {};

    const sit = (cur['commentaire-Situation'] || '').trim();
    const res = (cur['commentaire-Succes']    || '').trim().toLowerCase();

    // --- Nouveau : transformer Possession en PASS entre prev.Joueur → cur.Joueur ---
    if (sit === 'Possession' && prev['commentaire-Joueur'] && cur['commentaire-Joueur']) {
      // Vérifier que l'action précédente n'était pas un tir et que les équipes sont les mêmes
      const prevSit = (prev['commentaire-Situation'] || '').trim();
      if (prevSit !== 'Shoot' && prev['commentaire-Equipe'] === cur['commentaire-Equipe']) {
        cur.actionType   = 'POS';
        cur.actionResult = 'neutral';
        cur.fromPlayer = prev['commentaire-Joueur'];
        cur.toPlayer   = cur['commentaire-Joueur'];
        cur.fromTeam   = prev['commentaire-Equipe']; // Stocke l'équipe du passeur
        continue; // skip mapping POS
      }
    }

    /* --- Mapping direct ------------------------------------------------ */
    if (sit === 'Steal') {
      cur.actionType = 'STL';
      cur.actionResult = 'neutral';
    } else if (sit === 'Shoot') {
      cur.actionType = detectShotType(cur);
      cur.actionResult = res === 'succès' ? 'success'
                        : res === 'blocked' ? 'block'
                        : 'fail';
    }

    /* --- R1 : Rebond --------------------------------------------------- */
    if (sit === 'Rebond Global' &&
        next?.['commentaire-Situation'] === 'Possession') {
      next.actionType   = 'RBD';
      next.actionResult = 'neutral';
    }

    /* --- R2 : Assist --------------------------------------------------- */
    if (sit === 'Shoot' && res === 'succès' &&
        prev?.['commentaire-Situation'] === 'Possession' &&
        prev['commentaire-Equipe'] === cur['commentaire-Equipe'] &&
        prev['commentaire-Joueur'] !== cur['commentaire-Joueur']) {
      prev.actionType   = 'AST';
      prev.actionResult = 'neutral';
    }

    /* --- R3 : Turnover ------------------------------------------------- */
    if (sit === 'Possession' &&
        prev?.['commentaire-Situation'] === 'Possession' &&
        prev['commentaire-Equipe'] !== cur['commentaire-Equipe']) {
      prev.actionType   = 'TO';
      prev.actionResult = 'neutral';
    }

    /* --- R4 & R5 : Shoot bloqué / ligne "Block" parasite -------------- */
    if (sit === 'Shoot' && res === 'blocked') {
      // Tir bloqué => raté + BLK à premier joueur adverse après le tir
      cur.actionResult = 'block';
      const blocker = plays.slice(i + 1).find(p =>
        p['commentaire-Equipe'] &&
        p['commentaire-Equipe'] !== cur['commentaire-Equipe']
      );
      if (blocker) {
        blocker.actionType   = 'BLK';
        blocker.actionResult = 'neutral';
      }
    }
    if (sit === 'Block' &&
        prev?.['commentaire-Situation'] === 'Shoot' &&
        prev['commentaire-Joueur'] === cur['commentaire-Joueur']) {
      // On ignore cette ligne : déjà traitée ci‑dessus
      cur.actionType = null;
      cur.actionResult = null;
    }
  }
  return plays;
}

/* ---------------------- 4.  Générateur final -------------------------- */

/**
 * Retourne une phrase de commentaire prête à l’affichage
 * @param {Object} play  Ligne enrichie (doit contenir actionType / actionResult)
 * @returns {string}     Commentaire ou chaîne vide
 */
export function generateCommentary(play) {
  // DEBUG LOG
  console.log('[generateCommentary] play:', play);

  const { actionType, actionResult = 'neutral' } = play;
  if (!actionType) {
    console.warn('[generateCommentary] Pas de actionType:', play);
    return '';
  }

  const tplGroup = COMMENT_TEMPLATES[actionType];
  if (!tplGroup) {
    console.warn(`[generateCommentary] Pas de template pour actionType=${actionType}`, play);
    return '';
  }

  // result key : success | fail | block | neutral
  const templates = tplGroup[actionResult] || tplGroup.neutral;
  if (!templates || !templates.length) {
    console.warn(`[generateCommentary] Pas de templates pour actionType=${actionType}, actionResult=${actionResult}`, play);
    return '';
  }

  const emoji = ACTION_EMOJI[actionType] || '';
  const player = play['commentaire-Joueur'] || '';
  const team   = play['commentaire-Equipe'] || '';

  let sentence = pick(templates);

  if (actionType === 'POS') {
    // Retrieve both player names and their teams if possible
    const from = play.fromPlayer || '';
    const to   = play.toPlayer   || '';
    const fromTeam = play.fromTeam || play['fromEquipe'] || '';
    const toTeam   = play.toTeam   || play['commentaire-Equipe'] || '';
    // Determine team class for each
    const fromClass = (fromTeam || '').toUpperCase() === 'A' ? 'team-a'
                     : (fromTeam || '').toUpperCase() === 'B' ? 'team-b'
                     : '';
    const toClass   = (toTeam || '').toUpperCase() === 'A' ? 'team-a'
                     : (toTeam || '').toUpperCase() === 'B' ? 'team-b'
                     : '';
    // passe à soi‑même ?
    const samePlayer = from && to && from === to;
    const chosenTpls = samePlayer
        ? COMMENT_TEMPLATES.POS.self
        : templates;

    sentence = pick(chosenTpls)
      .replace('{from}', `<span class=\"player ${fromClass}\">${from}</span>`)
      .replace('{to}',   `<span class=\"player ${toClass}\">${to}</span>`);
  } else {
    // Determine team class for player
    let teamClass = '';
    if (team) {
      // Normalize team name to class (e.g., 'left', 'right', 'a', 'b')
      if (/left|gauche|a/i.test(team)) teamClass = 'team-a';
      else if (/right|droite|b/i.test(team)) teamClass = 'team-b';
      else teamClass = 'team-' + team.toLowerCase();
    }
    const playerSpan = `<span class=\"player ${teamClass}\">${player}</span>`;
    sentence = sentence
      .replace('{emoji}', emoji)
      .replace('{player}', playerSpan)
      .replace('{team}', team);
  }

  console.log(`[generateCommentary] actionType=${actionType}, actionResult=${actionResult}, sentence=`, sentence);
  return sentence;
}

/* ---------------------- 5.  Exports « namespace » --------------------- */

export const CommentaryGenerator = {
  enrichPlays,
  generateCommentary,
  pick,
  RESULT_LABEL,
  ACTION_EMOJI,
  COMMENT_TEMPLATES
};

/* ---------------------- 6.  Exemple d’utilisation ---------------------

import data from './Data-PBA.json'  assert { type: 'json' };
import { CommentaryGenerator as CG } from './commentary-generator.js';

const plays = CG.enrichPlays(data);

for (const p of plays) {
  const c = CG.generateCommentary(p);
  if (c) console.log(c);
}

------------------------------------------------------------------------ */

// Exposer le générateur comme variable globale pour compatibilité
window.CommentaryGenerator = CommentaryGenerator;
window.detectShotType = detectShotType; // Expose pour compatibilité
