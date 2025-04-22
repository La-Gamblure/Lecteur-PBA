/* commentary-generator.js
 * Générateur de commentaires aléatoires pour match de basket
 * 
 * Fonctions globales :
 *   - wrapPlayer(name, teamCode) → string HTML
 *   - generateComments(timeline) → Array<{...evt, generatedComment}>
 *   - renderComments(timeline, containerSelector) → injecte dans le DOM + console.log
 */

// Utiliser les données d'équipe déjà chargées dans main.js
// Cette fonction sera utilisée pour récupérer les données d'équipe
function getGlobalTeamsData() {
  return window.teamsData || { teams: [] };
}
/**
 * Vérifie si une valeur est considérée comme vide (null, undefined ou chaîne vide)
 * @param {*} value - Valeur à vérifier
 * @returns {boolean}
 */
function isEmptyValue(value) {
  return value === null || value === undefined || value === "";
}
/**
 * Obtient les informations de couleur pour une équipe donnée
 * @param {string} teamCode - 'A' ou 'B'
 * @returns {Object} Objet contenant primaryColor et secondaryColor
 */
function getTeamColors(teamCode) {
  // Récupérer les données d'équipe depuis la variable globale
  const teamsData = getGlobalTeamsData();
  
  // Si les données d'équipe ne sont pas chargées, utiliser des couleurs par défaut
  if (!teamsData.teams || !window.jsonData) {
    return {
      primaryColor: teamCode === 'A' ? '#706FD6' : '#D65F5F',
      secondaryColor: '#FFFFFF'
    };
  }

  // Récupérer l'index de l'équipe à partir des données du match
  let teamIndex = -1;
  try {
    if (teamCode === 'A' && typeof window.jsonData[0]['TeamA'] !== 'undefined') {
      teamIndex = parseInt(window.jsonData[0]['TeamA']);
    } else if (teamCode === 'B' && typeof window.jsonData[0]['TeamB'] !== 'undefined') {
      teamIndex = parseInt(window.jsonData[0]['TeamB']);
    }
  } catch (e) {
    console.warn('Impossible de déterminer l\'index d\'équipe:', e);
  }

  // Si on a trouvé l'index, récupérer les couleurs correspondantes
  if (teamIndex >= 0 && teamIndex < teamsData.teams.length) {
    return {
      primaryColor: teamsData.teams[teamIndex].primaryColor,
      secondaryColor: teamsData.teams[teamIndex].secondaryColor
    };
  }

  // Couleurs par défaut si l'équipe n'est pas trouvée
  return {
    primaryColor: teamCode === 'A' ? '#706FD6' : '#D65F5F',
    secondaryColor: '#FFFFFF'
  };
}

/**
 * Enrobe le nom du joueur dans un <span> avec style selon l'équipe
 * @param {string} name
 * @param {string} teamCode 'A' ou 'B'
 * @returns {string}
 */
function wrapPlayer(name, teamCode) {
  if (!name) return '';
  
  // Utilisation des classes CSS avec variables CSS au lieu des styles inline
  return `<span class="comment-player team-${teamCode}">${name}</span>`;
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
    'Self': [  // Nouveau template pour l'auto-passe
      '{player} dribble et hésite...',
      '{player} remonte le terrain',
      '{player} temporise',
      '{player} cherche une ouverture',
      '{player} garde la possession'
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
      "C'est réussi pour {player} !  <span class=\"points\">+{pts}PT</span>  pour les <span class=\"teamtag\">{team}</span> !",
      '{player} marque à  <span class=\"points\">{pts}PT</span>  et fait briller les <span class=\"teamtag\">{team}</span> !',
      'Panier de {player} !  <span class=\"points\">+{pts}PT</span>  pour les <span class=\"teamtag\">{team}</span>',
      '{player} fait mouche !  <span class=\"points\">+{pts}PT</span>  pour les <span class=\"teamtag\">{team}</span>',
      'Superbe shoot de {player} et  <span class=\"points\">+{pts}PT</span>  pour les <span class=\"teamtag\">{team}</span> !'
    ],
    'Echec': [
      "C'est raté pour {player}",
      '{player} manque son tir à {pts}PT',
      'Tir manqué de {player}',
      '{player} loupe son shoot à {pts}PT',
      'Le ballon sort du cercle, échec de {player}'
    ],
    'Blocked': [
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

// Variable pour suivre si le premier message a été affiché
let debutMatchAffiche = false;

function buildComment(evt, nextEvt) {
  // DEBUG
  console.log('buildComment - START =====================');
  console.log('commentaire-Equipe:', evt['commentaire-Equipe']);
  console.log('commentaire-Joueur:', evt['commentaire-Joueur']);
  console.log('commentaire-Situation:', evt['commentaire-Situation']);
  console.log('scoreboard-Etape:', evt['scoreboard-Etape']);
  
  // Gestion spéciale pour le coup d'envoi et la fin de match
  if (evt['scoreboard-Etape'] === 0 || evt['scoreboard-Etape'] === '0') {
    // Ne rien afficher de spécial au début du match
    return "Début du match !";
  }
  if (evt['scoreboard-Etape'] === 701) {
    return "Fin du match ! Merci d'avoir suivi cette rencontre.";
  }
  const situation = evt['commentaire-Situation'];
  const result = evt['commentaire-Succes'];
  const templates = COMMENT_TEMPLATES[situation];
  if (!templates) return '';
  
  // Vérifier si c'est une auto-passe (même joueur, possession consécutive)
  const isSelfPass = 
    situation === 'Possession' && 
    result === 'Succès' && 
    nextEvt['commentaire-Situation'] === 'Possession' &&
    evt['commentaire-Joueur'] === nextEvt['commentaire-Joueur'] &&
    evt['commentaire-Equipe'] === nextEvt['commentaire-Equipe'];
  
  // Choisir la liste de templates appropriée
  let list;
  if (isSelfPass) {
    list = templates['Self'];
  } else {
    list = (!isEmptyValue(result) && templates[result]) || templates.default;
  }
  
  if (!list) return '';
  let tpl = pick(list);
  
  // Déterminer le bon nombre de points en regardant aussi l'événement suivant
  let points = detectShotType(evt);
  
  // Vérifier si la situation est une Possession avec statut vide
  if (situation === 'Possession' && isEmptyValue(result) && nextEvt['commentaire-Situation'] === 'Shoot') {
    points = detectShotType(nextEvt);
  }
  
  // DEBUG avant le remplacement final
  console.log('Template avant remplacement:', tpl);
  console.log('Points détectés:', points);
  console.log('getTeamName retourne:', getTeamName(evt['commentaire-Equipe']));
  
  const finalComment = tpl
    .replace('{player}', evt['commentaire-Joueur'] || '')
    .replace('{nextPlayer}', nextEvt['commentaire-Joueur'] || '')
    .replace('{pts}', points)
    .replace('{team}', getTeamName(evt['commentaire-Equipe']));
  
  console.log('Commentaire final:', finalComment);
  console.log('buildComment - END =====================');
  
  return finalComment;
}

// Cette fonction est appelée dans buildComment avec l'événement actuel
function detectShotType(evt) {
  // Vérifier si nous avons accès à la timeline globale
  if (!window.jsonData || !window.jsonData.length) {
    console.log('Données timeline non disponibles, utilisation de la détection par défaut');
    return 2; // Valeur par défaut si les données ne sont pas disponibles
  }
  
  console.log('detectShotType - Analyse du tir', evt);
  
  // Obtenir l'étape actuelle et l'équipe qui a tiré
  const currentStep = parseInt(evt['scoreboard-Etape'] || '0', 10);
  const shootingTeam = evt['commentaire-Equipe'] || '';
  
  if (isNaN(currentStep) || !shootingTeam) {
    console.log('Informations insuffisantes pour déterminer le type de tir');
    return 2;
  }
  
  // Trouver l'événement précédent dans la timeline
  let prevEvent = null;
  for (let i = 0; i < window.jsonData.length; i++) {
    const step = parseInt(window.jsonData[i]['scoreboard-Etape'] || '0', 10);
    if (step === currentStep - 1) {
      prevEvent = window.jsonData[i];
      break;
    }
  }
  
  // Si pas d'événement précédent, on utilise 2 points par défaut
  if (!prevEvent) {
    console.log('Pas d\'\u00e9vénement précédent trouvé');
    return 2;
  }
  
  console.log('detectShotType - Événement précédent trouvé:', prevEvent);
  
  // Chercher les champs de score dans les deux événements
  const scoreFields = {
    'A': ['Score cumulé Equipe A', 'Score-A', 'ScoreA', 'scoreboard-ScoreA', 'A-Score'],
    'B': ['Score cumulé Equipe B', 'Score-B', 'ScoreB', 'scoreboard-ScoreB', 'B-Score']
  };
  
  const teamKey = shootingTeam;
  
  // Parcourir les champs de score possibles pour l'équipe qui a tiré
  let prevScore = 0;
  let currentScore = 0;
  
  for (const field of scoreFields[teamKey]) {
    if (field in evt && field in prevEvent) {
      prevScore = parseInt(prevEvent[field] || '0', 10);
      currentScore = parseInt(evt[field] || '0', 10);
      
      if (!isNaN(prevScore) && !isNaN(currentScore)) {
        break; // On a trouvé des scores valides
      }
    }
  }
  
  // Déterminer le type de tir basé sur la différence de score
  const scoreDiff = currentScore - prevScore;
  
  console.log(`Score de l'équipe ${teamKey}: ${prevScore} -> ${currentScore} (diff: ${scoreDiff})`);
  
  if (scoreDiff === 3) {
    console.log('Tir à 3 points détecté par différence de score');
    return 3;
  } else if (scoreDiff === 2) {
    console.log('Tir à 2 points détecté par différence de score');
    return 2;
  }
  
  // Si la différence n'est pas clairement identifiée, on vérifie aussi les statistiques
  // Chercher les champs de 3 points
  const patterns3pts = ['3[ -]?[Pp]oints', '3PT', '3[ -]?[Pp]ts', 'three'];
  
  for (let key in evt) {
    for (let pattern of patterns3pts) {
      if (new RegExp(pattern, 'i').test(key) && key in prevEvent) {
        const prevVal = parseInt(prevEvent[key] || '0', 10);
        const currentVal = parseInt(evt[key] || '0', 10);
        
        if (currentVal - prevVal === 1) {
          console.log(`Statistique 3pts a augmenté: ${key} (${prevVal} -> ${currentVal})`);
          return 3;
        }
      }
    }
  }
  
  // Vérifier explicitement les statistiques de tirs à 2 points
  const patterns2pts = ['2[ -]?[Pp]oints', '2PT', '2[ -]?[Pp]ts', 'two'];
  
  for (let key in evt) {
    for (let pattern of patterns2pts) {
      if (new RegExp(pattern, 'i').test(key) && key in prevEvent) {
        const prevVal = parseInt(prevEvent[key] || '0', 10);
        const currentVal = parseInt(evt[key] || '0', 10);
        
        if (currentVal - prevVal === 2) {
          console.log(`Statistique 2pts a augmenté: ${key} (${prevVal} -> ${currentVal})`);
          return 2;
        }
      }
    }
  }
  
  // Par défaut, c'est un tir à 2 points
  console.log('Type de tir non déterminé avec précision, utilisation de 2 points par défaut');
  return 2;
}

function getTeamName(code) {
  // Debug
  console.log(`getTeamName appelé avec code: '${code}'`);
  
  // Récupérer les données d'équipe depuis la variable globale
  const teamsData = getGlobalTeamsData();
  
  let teamIndex = -1;
  let teamName = code === 'A' ? 'Hawks' : 'Bears'; // Valeurs par défaut
  
  if (code === 'A' || code === 'B') {
    // D'abord essayer de récupérer l'index depuis les sélecteurs
    const selectElement = document.getElementById(`team-${code.toLowerCase()}-select`);
    if (selectElement && selectElement.selectedIndex > 0) {
      teamIndex = parseInt(selectElement.value);
    }
    // Sinon, essayer depuis les données JSON
    else if (window.jsonData && window.jsonData[0]) {
      try {
        const jsonIndex = code === 'A' ? 'TeamA' : 'TeamB';
        if (typeof window.jsonData[0][jsonIndex] !== 'undefined') {
          teamIndex = parseInt(window.jsonData[0][jsonIndex]);
        }
      } catch (e) {
        console.warn('Impossible de déterminer l\'index d\'équipe depuis JSON:', e);
      }
    }
    
    // Si l'index est valide, récupérer le nom complet de l'équipe
    if (teamIndex >= 0 && teamsData.teams && teamIndex < teamsData.teams.length) {
      teamName = teamsData.teams[teamIndex].name || (code === 'A' ? 'Hawks' : 'Bears');
    }
  }
  
  // Retourner le nom complet de l'équipe
  console.log(`Utilisation du nom d'équipe: '${teamName}'`);
  return teamName;
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
