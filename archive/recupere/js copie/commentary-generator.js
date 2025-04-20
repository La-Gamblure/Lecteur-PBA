/* commentary-generator.js
 * Générateur de commentaires aléatoires pour match de basket
 * 
 * Fonctions globales :
 *   - wrapPlayer(name, teamCode) → string HTML
 *   - generateComments(timeline) → Array<{...evt, generatedComment}>
 *   - renderComments(timeline, containerSelector) → injecte dans le DOM + console.log
 */

/**
 * Enrobe le nom du joueur dans un <span> avec classe selon l'équipe
 * @param {string} name
 * @param {string} teamCode 'A' ou 'B'
 * @returns {string}
 */
function wrapPlayer(name, teamCode) {
  if (!name) return '';
  return `<span class="player-name team-${teamCode}">${name}</span>`;
}

/**
 * Pour chaque événement de timeline, génère un commentaire
 * et l'ajoute dans la propriété `generatedComment`.
 * @param {Array<Object>} timeline
 * @returns {Array<Object>}
 */
function generateComments(timeline) {
  return timeline.map((evt, idx) => {
    const nextEvt = timeline[idx + 1] || {};
    const text = buildComment(evt, nextEvt);
    return { ...evt, generatedComment: text };
  });
}

/**
 * Injecte en console et dans le DOM sous forme de <p> les commentaires générés
 * @param {Array<Object>} timeline
 * @param {string} containerSelector
 */
function renderComments(timeline, containerSelector = '#comments') {
  const plays = generateComments(timeline);
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.warn(`Container "${containerSelector}" introuvable.`);
    return;
  }
  container.innerHTML = '';

  plays.forEach((evt, idx) => {
    const text = evt.generatedComment;
    if (!text) return;
    console.log(text);
    const p = document.createElement('p');
    p.className = 'generated-comment';

    // Enrobe les noms de joueurs
    let html = text;
    const playerName = evt['commentaire-Joueur'] || '';
    if (playerName) {
      html = html.replace(
        new RegExp(`\\b${escapeRegExp(playerName)}\\b`, 'g'),
        wrapPlayer(playerName, evt['commentaire-Equipe'])
      );
    }
    const nextName = (plays[idx + 1] || {})['commentaire-Joueur'] || '';
    const nextTeam = (plays[idx + 1] || {})['commentaire-Equipe'] || '';
    if (nextName) {
      html = html.replace(
        new RegExp(`\\b${escapeRegExp(nextName)}\\b`, 'g'),
        wrapPlayer(nextName, nextTeam)
      );
    }
    p.innerHTML = html;

    // Appliquer style succès/échec uniquement sur Shoot
    if (evt['commentaire-Situation'] === 'Shoot') {
      const res = evt['commentaire-Succes'];
      if (res === 'Succès') p.classList.add('shoot-success');
      else if (res === 'Echec' || res === 'Blocked') p.classList.add('shoot-failure');
    }

    container.appendChild(p);
  });
}

// =============================
// Templates et utilitaires
// =============================
const COMMENT_TEMPLATES = {
  Possession: {
    'Succès': [
      '{player} fait la passe à {nextPlayer}',
      '{player} trouve {nextPlayer} grâce à une belle passe'
    ],
    'Echec': [
      '{player} fait une passe ratée...',
      '{player} perd le ballon sur la passe'
    ],
    default: [
      'Shoot à {pts}PT de {player}...',
      '{player} tente un shoot à {pts}PT...'
    ]
  },
  'Rebond Global': {
    default: [
      'Rebond pour {nextPlayer}',
      '{nextPlayer} capte le rebond'
    ]
  },
  Steal: {
    default: [
      '{nextPlayer} intercepte la passe de {player}',
      '{player} se fait voler la balle par {nextPlayer}'
    ]
  },
  Shoot: {
    'Succès': [
      "C'est réussi pour {player} ! +{pts}PT pour les {team} !",
      '{player} marque à {pts}PT et fait briller les {team} !'
    ],
    'Echec': [
      "C'est raté pour {player}",
      '{player} manque son tir à {pts}PT'
    ],
    Blocked: [
      '{player} se fait contrer !',
      'Contre sur le tir de {player} à {pts}PT'
    ]
  },
  Block: {
    default: [
      '{nextPlayer} bloque le shoot de {player}',
      '{player} se fait stopper par {nextPlayer}'
    ]
  }
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildComment(evt, nextEvt) {
  const situation = evt['commentaire-Situation'];
  const result = evt['commentaire-Succes'];
  const templates = COMMENT_TEMPLATES[situation];
  if (!templates) return '';
  const list = (result && templates[result]) || templates.default;
  if (!list) return '';
  let tpl = pick(list);
  return tpl
    .replace('{player}', evt['commentaire-Joueur'] || '')
    .replace('{nextPlayer}', nextEvt['commentaire-Joueur'] || '')
    .replace('{pts}', detectShotType(evt))
    .replace('{team}', getTeamName(evt['commentaire-Equipe']));
}

function detectShotType(evt) {
  for (let key in evt) {
    if (/3[- ]?Points$/i.test(key) && +evt[key] > 0) {
      return 3;
    }
  }
  return 2;
}

function getTeamName(code) {
  return code === 'A' ? 'Gaus-Spurs' : 'Bear Hodlers';
}

/**
 * Échappe les caractères spéciaux pour RegExp
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

// Expose en global
window.wrapPlayer = wrapPlayer;
window.generateComments = generateComments;
window.renderComments = renderComments;
