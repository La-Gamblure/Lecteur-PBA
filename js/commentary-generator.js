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
  'AST' : '👋',
  'BLK' : '🛑',
  'STL' : '🦅',
  'TO'  : '❌',
  'DD'  : '👏',
  'TD'  : '💪',
  'POS' : '🏀'
};

export const COMMENT_TEMPLATES = {
  '2PT': {
    success: [
      '{emoji} {player} transperce le filet à 2 pts !',
      '{emoji} Joli jumper de {player} pour 2 points.',
      '{emoji} {player} dégaine à mi‑distance : c’est dedans !'
    ],
    fail: [
      '{emoji} {player} manque son jumper à 2 pts.',
      'Tentative de {player} qui ne trouve pas le fond du panier.'
    ],
    block: [
      '{emoji} {player} se fait contrer !',
      '{emoji} Contre monstrueux sur {player} !'
    ]
  },
  '3PT': {
    success: [
      '{emoji} BANG ! {player} au‑delà de l’arc !',
      '{emoji} Quel shoot à 3 pts de {player} !'
    ],
    fail: [
      '{emoji} {player} trop court derrière l’arc.',
      '{player} de loin, mais ça ne rentre pas.'
    ],
    block: [
      '{emoji} {player} contré à 3 pts !',
      '{emoji} Le tir longue distance de {player} est rejeté !'
    ]
  },
  'RBD': {
    neutral: [
      '{emoji} Rebond capté par {player} !',
      '{player} s’impose au rebond.'
    ]
  },
  'AST': {
    neutral: [
      '{emoji} Caviar servi par {player}.',
      '{player} distribue à merveille !'
    ]
  },
  'BLK': {
    neutral: [
      '{emoji} Contre de {player} !',
      '{player} dit « non, non, non ! »'
    ]
  },
  'STL': {
    neutral: [
      '{emoji} Interception de {player} !',
      '{player} vole la balle !'
    ]
  },
  'TO': {
    neutral: [
      '{emoji} {player} perd la balle.',
      '{player} se fait chiper la gonfle.'
    ]
  },
  'POS': {
    neutral: [
      '{emoji} {team} remonte la balle.',
      '{team} à la manœuvre.'
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

    /* --- Mapping direct ------------------------------------------------ */
    if (sit === 'Possession') {
      cur.actionType = 'POS';
      cur.actionResult = 'neutral';
    } else if (sit === 'Steal') {
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
  const { actionType, actionResult = 'neutral' } = play;
  if (!actionType) return '';

  const tplGroup = COMMENT_TEMPLATES[actionType];
  if (!tplGroup) return '';

  // result key : success | fail | block | neutral
  const templates = tplGroup[actionResult] || tplGroup.neutral;
  if (!templates || !templates.length) return '';

  const emoji = ACTION_EMOJI[actionType] || '';
  const player = play['commentaire-Joueur'] || '';
  const team   = play['commentaire-Equipe'] || '';

  let sentence = pick(templates);
  sentence = sentence
    .replace('{emoji}', emoji)
    .replace('{player}', player)
    .replace('{team}', team);

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
