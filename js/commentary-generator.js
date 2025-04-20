/* commentary-generator.js
 * Générateur de commentaires aléatoires pour match de basket
 * 
 * Fonctions globales :
 *   - wrapPlayer(name, teamCode) → string HTML
 *   - generateComments(timeline) → Array<{...evt, generatedComment}>
 *   - renderComments(timeline, containerSelector) → injecte dans le DOM + console.log
 */
/**
 * Vérifie si une valeur est considérée comme vide (null, undefined ou chaîne vide)
 * @param {*} value - Valeur à vérifier
 * @returns {boolean}
 */
function isEmptyValue(value) {
  return value === null || value === undefined || value === "";
}
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
      '{player} trouve {nextPlayer} grâce à une belle passe',
      'Passe réussie de {player} vers {nextPlayer}',
      '{player} sert {nextPlayer} proprement',
      '{player} distribue à {nextPlayer}'
    ],
    'Echec': [
      '{player} fait une passe ratée...',
      '{player} perd le ballon sur la passe',
      'Passe manquée de {player}',
      '{player} échoue dans sa passe',
      'La passe de {player} ne trouve personne'
    ],
    default: [
      'Shoot à {pts}PT de {player}...',
      '{player} tente un shoot à {pts}PT...',
      '{player} prend un tir à {pts}PT',
      '{player} essaie à {pts}PT'
    ]
  },
  'Rebond Global': {
    default: [
      'Rebond pour {nextPlayer}',
      '{nextPlayer} capte le rebond',
      '{nextPlayer} arrache le rebond',
      'Le rebond va à {nextPlayer}',
      '{nextPlayer} récupère le ballon'
    ]
  },
  Steal: {
    default: [
      '{nextPlayer} intercepte la passe de {player}',
      '{player} se fait voler la balle par {nextPlayer}',
      '{nextPlayer} subtilise le ballon à {player}',
      'Interception de {nextPlayer} sur {player}',
      '{nextPlayer} coupe la trajectoire et récupère'
    ]
  },
  Shoot: {
    'Succès': [
      "C'est réussi pour {player} !  <span class=\"points\">+{pts}PT</span>  pour les {team} !",
      '{player} marque à  <span class=\"points\">{pts}PT</span>  et fait briller les {team} !',
      'Panier de {player} !  <span class=\"points\">+{pts}PT</span>  pour les {team}',
      '{player} fait mouche !  <span class=\"points\">+{pts}PT</span>  pour les {team}',
      'Superbe shoot de {player} et  <span class=\"points\">+{pts}PT</span>  pour les {team} !'
    ],
    'Echec': [
      "C'est raté pour {player}",
      '{player} manque son tir à {pts}PT',
      'Tir manqué de {player}',
      '{player} loupe son shoot à {pts}PT',
      'Le ballon sort du cercle, échec de {player}'
    ],
    Blocked: [
      '{player} se fait  <span class="block">contrer !</span>',
      '<span class="block">Contre</span>  sur le tir de {player} à {pts}PT',
      'Tir de {player}  <span class="block"> bloqué net !</span>',
      'Le shoot de {player} est  <span class="block">stoppé</span>'
     
    ]
  },
  Block: {
    default: [
      '{nextPlayer} bloque le shoot de {player}',
      '{player} se fait stopper par {nextPlayer}',
      'Contre de {nextPlayer} sur {player}',
      '{nextPlayer} rejette le tir de {player}',
      'Magnifique block de {nextPlayer} face à {player}'
    ]
  }
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildComment(evt, nextEvt) {
  // Gestion spéciale pour le coup d'envoi et la fin de match
  if (evt['scoreboard-Etape'] === 0) {
    return "Coup d'envoi du match !";
  }
  if (evt['scoreboard-Etape'] === 701) {
    return "Fin du match ! Merci d'avoir suivi cette rencontre.";
  }
  const situation = evt['commentaire-Situation'];
  const result = evt['commentaire-Succes'];
  const templates = COMMENT_TEMPLATES[situation];
  if (!templates) return '';
  
  // Utiliser la fonction utilitaire au lieu de la condition simple
  const list = (!isEmptyValue(result) && templates[result]) || templates.default;
  if (!list) return '';
  let tpl = pick(list);
  
  // Déterminer le bon nombre de points en regardant aussi l'événement suivant
  let points = detectShotType(evt);
  
  // Vérifier si la situation est une Possession avec statut vide
  if (situation === 'Possession' && isEmptyValue(result) && nextEvt['commentaire-Situation'] === 'Shoot') {
    points = detectShotType(nextEvt);
  }
  
  return tpl
    .replace('{player}', evt['commentaire-Joueur'] || '')
    .replace('{nextPlayer}', nextEvt['commentaire-Joueur'] || '')
    .replace('{pts}', points)
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
