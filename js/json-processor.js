/**
 * JSON Processor pour le Lecteur PBA
 * Gère le chargement, le traitement et l'affichage des données JSON dans l'interface
 */


// Import du générateur de commentaires (mode module)




// Variables globales pour le stockage des données et l'état du lecteur
let jsonData = []; // Données du match
let currentRowIndex = 0; // Index de la ligne actuelle
let isPlaying = false; // État de lecture (lecture/pause)
let playbackTimer; // Timer pour l'avancement automatique
let playbackSpeed = 1; // Vitesse de lecture (par défaut: x1)

// Constantes pour mapper les clés JSON avec les ID HTML
const COLUMNS = {
    // Propriétés pour le scoreboard
    QUARTER: "scoreboard-QT",
    TIME: "scoreboard-Temps",
    ETAPE: "scoreboard-Etape",
    SCORE_TEAM_A: "Score cumulé Equipe A",
    SCORE_TEAM_B: "Score cumulé Equipe B",
    POSSESSION: "commentaire-Equipe", // Équipe qui a la possession
    
    // Propriétés pour les commentaires
    PLAYER_NAME: "commentaire-Joueur",
    ACTION_TYPE: "commentaire-Situation",
    ACTION_RESULT: "commentaire-Succes"
    
    // Statistiques des joueurs sont directement mappées avec les ID HTML (A1-Points, B2-Rebounds, etc.)
};

// Initialisation du traitement JSON
// Cet event listener a été consolidé avec celui en bas du fichier

/**
 * Configure les contrôles de lecture (play, pause, reset, vitesse)
 */
function setupPlaybackControls() {
    // Affiche le placeholder au chargement
    const commentsBox = document.getElementById('comments');
    if (commentsBox) {
        commentsBox.innerHTML = '<p id="placeholder-comment" class="generated-comment">Le match va bientôt commencer</p>';
    }
    try {
        const playButton = document.getElementById('play-button');
        const pauseButton = document.getElementById('pause-button');
        const resetButton = document.getElementById('reset-button');
        const speedSelector = document.getElementById('playback-speed');
        
        if (playButton) {
            playButton.addEventListener('click', startPlayback);
        } else {
            throw new Error('Bouton play introuvable dans le DOM');
        }
        
        if (pauseButton) {
            pauseButton.addEventListener('click', pausePlayback);
        } else {
            throw new Error('Bouton pause introuvable dans le DOM');
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', resetPlayback);
        } else {
            throw new Error('Bouton reset introuvable dans le DOM');
        }
        
        if (speedSelector) {
            speedSelector.addEventListener('change', function() {
                playbackSpeed = parseFloat(this.value);
                
                // Si la lecture est en cours, redémarrer avec la nouvelle vitesse
                if (isPlaying) {
                    pausePlayback();
                    startPlayback();
                }
            });
        } else {
            throw new Error('Sélecteur de vitesse introuvable dans le DOM');
        }
        
        // Désactiver les boutons au démarrage
        updateControlButtonsState(false);
    } catch (error) {
        console.error('Erreur lors de la configuration des contrôles:', error.message);
    }
}

/**
 * Met à jour l'état d'activation des boutons de contrôle
 * @param {boolean} hasData - Si des données JSON sont disponibles
 */
function updateControlButtonsState(hasData) {
    try {
        const playButton = document.getElementById('play-button');
        const pauseButton = document.getElementById('pause-button');
        const resetButton = document.getElementById('reset-button');
        const speedSelector = document.getElementById('playback-speed');
        
        if (playButton) {
            playButton.disabled = !hasData || isPlaying;
        }
        
        if (pauseButton) {
            pauseButton.disabled = !hasData || !isPlaying;
        }
        
        if (resetButton) {
            resetButton.disabled = !hasData;
        }
        
        if (speedSelector) {
            speedSelector.disabled = !hasData;
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour des contrôles:', error.message);
    }
}

/**
 * Gère le téléchargement et le traitement du fichier JSON
 * @param {Event} event - Événement de changement du champ de fichier
 */
function handleFileUpload(event) {
    try {
        // Vérification de l'événement
        if (!event || !event.target) {
            throw new Error('Événement invalide');
        }
        
        // Vérification des fichiers
        if (!event.target.files || event.target.files.length === 0) {
            throw new Error('Aucun fichier sélectionné');
        }
            
        // Désactiver le lecteur pendant le chargement
        isPlaying = false;
        updateControlButtonsState(false);
        
        // Récupérer le fichier sélectionné
        const file = event.target.files[0];
        
        // Vérification du type MIME pour s'assurer qu'il s'agit d'un JSON
        if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
            throw new Error('Le fichier sélectionné n\'est pas un JSON');
        }
            
            // Créer un FileReader pour lire le fichier
            const reader = new FileReader();
            
            // Définir la fonction de traitement à exécuter une fois le fichier chargé
            reader.onload = function(e) {
                try {
                    // Parser le JSON
                    const rawJsonData = JSON.parse(e.target.result);
                    
                    // Traiter le JSON avec le générateur de commentaires si disponible
                    // IMPORTANT: utiliser la variable globale, pas une variable locale
                    jsonData = rawJsonData;
                    
                    try {
                        // Enrichissement des actions (si enrichPlays existe)
                        if (typeof wrapPlayers === 'function') {
                            jsonData = wrapPlayers(rawJsonData);
                        }
                        // Génération des commentaires enrichis
                        jsonData = generateComments(jsonData);
                    } catch (enrichError) {
                        console.warn('Enrichissement ou génération de commentaires non disponible:', enrichError.message);
                    }
                    
                    // Stocker les données dans window pour compatibilité avec d'autres modules
                    window.jsonData = jsonData;
                    
                    // Le placeholder affiche déjà "Début du match !" par défaut
                    
                    // Mettre à jour les compteurs
                    document.getElementById('current-step').textContent = '1';
                    document.getElementById('total-steps').textContent = jsonData.length;
                    
                    // Réinitialiser l'index de la ligne actuelle
                    currentRowIndex = 0;
                    
                    // Mettre à jour l'affichage avec la première ligne
                    updateDisplay(currentRowIndex);
                    
                    // Activer les boutons de contrôle
                    updateControlButtonsState(true);
                    
                    // Notification à l'utilisateur
                    alert(`Données chargées avec succès! ${jsonData.length} étapes disponibles.`);
                    
                     } catch (error) {
                         throw new Error('Erreur lors du parsing JSON: ' + error.message);
                     }
            };
            
            // Définir la fonction d'erreur
            reader.onerror = function(e) {
                throw new Error('Erreur lors de la lecture du fichier');
            };
            
            // Lancer la lecture du fichier
            reader.readAsText(file);
    } catch (error) {
        console.error('Erreur lors du chargement du fichier JSON:', error.message);
        alert('Erreur lors du chargement du fichier JSON: ' + error.message);
        updateControlButtonsState(false);
    }
}

/**
 * Met à jour l'affichage avec les données de la ligne actuelle
 * @param {number} rowIndex - Index de la ligne dans jsonData
 */
// --- Dans updateDisplay(rowIndex) ---
function updateDisplay(rowIndex) {
    try {
      if (rowIndex < 0 || rowIndex >= jsonData.length) {
        throw new Error(`Index invalide: ${rowIndex}`);
      }
      const row     = jsonData[rowIndex];
      const nextRow = jsonData[rowIndex + 1] || {};
  
      // Mise à jour des compteurs, scoreboard, etc.
      document.getElementById('current-step').textContent = rowIndex + 1;
      updateScoreboard(row);
      updatePossession(row);
  
      // Passe nextRow à updateCommentary
      updateCommentary(row, nextRow);
  
      updatePlayerStats(row);
      computeAndMarkMVP();
    } catch (err) {
      console.error('updateDisplay error:', err);
    }
  }
  
  /**
   * Met à jour les commentaires avec les données de la ligne
   * @param {Object} row     - Ligne actuelle
   * @param {Object} nextRow - Ligne suivante (peut être vide)
   */
  function updateCommentary(row, nextRow) {
    const commentsBox = document.getElementById('comments');
    if (!commentsBox) return;
    commentsBox.innerHTML = '';
  
    if (!row.generatedComment) return;
  
    const p = document.createElement('p');
    p.className = 'generated-comment';
  
    // Appliquer style Succès/Échec si Shoot
    if (row['commentaire-Situation'] === 'Shoot') {
      const res = row['commentaire-Succes'];
      if (res === 'Succès')      p.classList.add('shoot-success');
      else if (res === 'Echec' || res === 'Blocked') p.classList.add('shoot-failure');
    }

    // Les noms des joueurs sont déjà encapsulés dans buildComment
    p.innerHTML = row.generatedComment;
    commentsBox.appendChild(p);
  }
  
  /** Met à jour le scoreboard avec les données de la ligne
 * @param {Object} row - Données de la ligne
 */
function updateScoreboard(row) {
    // Mettre à jour le quart-temps
    const quarter = row[COLUMNS.QUARTER] || "Q1";
    document.getElementById('quarter').textContent = quarter;
    
   

    // Mettre à jour le temps avec transformation du format
    let time = row[COLUMNS.TIME] || "12:00";

    // Transformer le format mm'ss'' en mm:ss
time = time.replace(/(\d+)'(\d+)''/, '$1:$2');

// Dans certains cas, le format peut être uniquement mm' ou mm'ss'
time = time.replace(/(\d+)'(\d*)$/, function(match, minutes, seconds) {
    // Si les secondes ne sont pas spécifiées, mettre 00
    return `${minutes}:${seconds || '00'}`;
});

// S'assurer que les secondes ont toujours 2 chiffres
const parts = time.split(':');
if (parts.length === 2) {
    const minutes = parts[0];
    const seconds = parts[1].padStart(2, '0'); // Ajouter un 0 si nécessaire
    time = `${minutes}:${seconds}`;
}

document.getElementById('timer').textContent = time;


    
    // Mettre à jour le score de l'équipe A
    const scoreA = row[COLUMNS.SCORE_TEAM_A] || 0;
    document.getElementById('team-a-score').textContent = scoreA;
    
    // Mettre à jour le score de l'équipe B
    const scoreB = row[COLUMNS.SCORE_TEAM_B] || 0;
    document.getElementById('team-b-score').textContent = scoreB;
    
    // Mettre en évidence l'équipe qui mène
    try {
        updateScoreHighlight(scoreA, scoreB);
    } catch (error) {
        console.warn('Mise en évidence des scores non disponible:', error.message);
    }
}

/**
 * Met à jour l'indicateur de possession avec emoji
 * @param {Object} row - Données de la ligne
 */
function updatePossession(row) {
    const teamCode = row['commentaire-Equipe'];
    let possession = '';
    
    // Déterminer la possession selon l'équipe et la situation
    const situation = row['commentaire-Situation'];
    if (situation === 'Possession' || (situation && situation.toLowerCase() === "shoot")) {
        possession = row['commentaire-Equipe'];
    }
    
    // Log pour débogage - simplifié
    console.log('Mise à jour de la possession pour équipe:', possession);
    
    updatePossessionIndicator(possession);
}

/**
 * Met à jour l'indicateur de possession (ballon de basketball)
 * @param {string} possession - Valeur de la possession (nom de l'équipe qui a la possession)
 */
function updatePossessionIndicator(possession) {
    // Récupérer les éléments du DOM
    const teamABox = document.getElementById('team-a-box');
    const teamBBox = document.getElementById('team-b-box');
    const teamABall = document.getElementById('team-a-ball');
    const teamBBall = document.getElementById('team-b-ball');
    const possessionA = document.getElementById('possession-a');
    const possessionB = document.getElementById('possession-b');
    
    // Par défaut, masquer les indicateurs de possession
    teamABox.classList.remove('has-possession');
    teamBBox.classList.remove('has-possession');
    
    if (teamABall) teamABall.style.display = 'none';
    if (teamBBall) teamBBall.style.display = 'none';
    
    if (possessionA) possessionA.style.display = 'none';
    if (possessionB) possessionB.style.display = 'none';
    
    // Si pas de possession définie, retourner
    if (!possession) return;
    
    // Récupérer les équipes sélectionnées
    const teamASelect = document.getElementById('team-a-select');
    const teamBSelect = document.getElementById('team-b-select');
    
    let teamAName = '';
    let teamBName = '';
    
    if (teamASelect) teamAName = teamASelect.value;
    if (teamBSelect) teamBName = teamBSelect.value;
    
    // Déterminer quelle équipe a la possession
    if (possession === teamAName) {
        // Équipe A a la possession
        teamABox.classList.add('has-possession');
        if (teamABall) teamABall.style.display = 'block';
        if (possessionA) possessionA.style.display = 'block';
    } else if (possession === teamBName) {
        // Équipe B a la possession
        teamBBox.classList.add('has-possession');
        if (teamBBall) teamBBall.style.display = 'block';
        if (possessionB) possessionB.style.display = 'block';
    }
}

/**
 * Met à jour les statistiques des joueurs avec les données de la ligne
 * @param {Object} row - Données de la ligne
 */
function updatePlayerStats(row) {
    // Mettre à jour les statistiques des joueurs selon leur équipe
    updateTeamStats(row, 'a');
    updateTeamStats(row, 'b');
}

/**
 * Met en évidence l'équipe qui mène au score
 * @param {number} scoreA - Score de l'équipe A
 * @param {number} scoreB - Score de l'équipe B
 */
function updateScoreHighlight(scoreA, scoreB) {
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    
    // Retirer les classes précédentes
    teamAScore.classList.remove('winning-team', 'losing-team');
    teamBScore.classList.remove('winning-team', 'losing-team');
    
    // Appliquer les classes appropriées selon le score
    if (parseFloat(scoreA) > parseFloat(scoreB)) {
        teamAScore.classList.add('winning-team');
        teamBScore.classList.add('losing-team');
    } else if (parseFloat(scoreB) > parseFloat(scoreA)) {
        teamBScore.classList.add('winning-team');
        teamAScore.classList.add('losing-team');
    }
    // Si égalité, aucune classe n'est appliquée
}

/**
 * Met à jour les statistiques d'une équipe spécifique
 * @param {Object} row - Données de la ligne
 * @param {string} team - Identifiant de l'équipe ('a' ou 'b')
 */
function updateTeamStats(row, team) {
    // Identifiants des joueurs de A1 à A5 ou B1 à B5 selon l'équipe
    const teamPrefix = team.toUpperCase();
    console.log(`Début de mise à jour des stats pour l'équipe ${teamPrefix}:`);
    
    // Types de statistiques dans l'ordre où elles apparaissent dans le tableau
    const statTypes = [
        'Points',
        '3-Points',  // Correspond exactement au format des clés JSON
        'Rebounds',
        'Assist',
        'Blocks', 
        'Steals',
        'TurnOvers',
        'DD',
        'TD',
        'Total'
    ];
    
    // Pour afficher les clés JSON disponibles pour cette équipe
    const teamKeys = Object.keys(row).filter(key => key.startsWith(teamPrefix));
    console.log(`Clés disponibles pour l'équipe ${teamPrefix}:`, teamKeys.slice(0, 10));
    
    // Pour chaque joueur de l'équipe (1 à 5)
    for (let playerNum = 1; playerNum <= 5; playerNum++) {
        const playerId = `${teamPrefix}${playerNum}`;
        
        // Pour chaque type de statistique
        for (const statType of statTypes) {
            // Construire l'ID HTML et la clé JSON qui correspondent (ex: A1-Points, B3-Rebounds)
            const idStat = `${playerId}-${statType}`;
            
            // Récupérer l'élément par son ID
            const statElement = document.getElementById(idStat);
            
            if (!statElement) {
                // Log uniquement pour les éléments importants manquants
                if (statType === 'Points' || statType === 'Total') {
                    console.warn(`Élément non trouvé: #${idStat}`);
                }
                continue; // Élément non trouvé, passer au suivant
            }
            
            // Mettre à jour la cellule avec la valeur du JSON si elle existe
            if (row[idStat] !== undefined) {
                // Récupérer la valeur actuelle (convertir en nombre pour la comparaison)
                let currentValue = parseFloat(row[idStat]);
if (!isNaN(currentValue)) {
    // Affiche 1 décimale si ce n'est pas un entier
    currentValue = Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(1);
} else {
    currentValue = 0;
}
                
                // Récupérer la valeur précédente si elle existe
                const previousValue = previousStatsValues[idStat] || 0;
                
                // Mettre à jour le contenu
                statElement.textContent = currentValue;
                // CSS conditionnel pour TO, DD et TD
                if (["TurnOvers", "DD", "TD"].includes(statType)) {
                    if (parseFloat(currentValue) !== 0) {
                        statElement.classList.add('active');
                        // Ajout spécial pour les TurnOvers critiques (<= -9)
                        if (statType === 'TurnOvers' && parseFloat(currentValue) <= -9) {
                            statElement.classList.add('critical');
                        } else {
                            statElement.classList.remove('critical');
                        }
                    } else {
                        statElement.classList.remove('active');
                        statElement.classList.remove('critical');
                    }
                }
                
                // Si la valeur a augmenté, appliquer l'animation de mise en évidence
                if (currentValue > previousValue) {
                    console.log(`Incrémentation détectée pour ${idStat}: ${previousValue} -> ${currentValue}`);
                    
                    // Supprimer l'animation existante si elle est en cours
                    statElement.classList.remove('stat-updated');
                    
                    // Déclencher un reflow pour réinitialiser l'animation
                    void statElement.offsetWidth;
                    
                    // Ajouter la classe pour l'animation
                    statElement.classList.add('stat-updated');
                    
                    // Supprimer la classe après l'animation
                    setTimeout(() => {
                        statElement.classList.remove('stat-updated');
                    }, 1000); // Même durée que l'animation CSS
                }
                
                // Stocker la valeur actuelle pour la prochaine comparaison
                previousStatsValues[idStat] = currentValue;
                
                // Log uniquement pour les valeurs importantes
                if (statType === 'Points' || statType === 'Total') {
                    console.log(`Mise à jour de #${idStat} avec valeur:`, currentValue);
                }
            } else if (statType === 'Points' || statType === 'Total') {
                console.warn(`Aucune valeur trouvée dans le JSON pour la clé ${idStat}`);
            }
        }
    }
    
    console.log(`Statistiques mises à jour pour l'équipe ${teamPrefix}`);
}

/**
 * Cherche le joueur ayant le plus gros score ET qui est dans l'équipe qui mène
 * En cas d'égalité au score entre les équipes, le joueur avec le plus gros score individuel est MVP
 * puis ajoute / retire le tag « MVP ».
 */
function computeAndMarkMVP() {
    // 1. Récupérer le score affiché au tableau
    const scoreA = parseFloat(
        document.getElementById('team-a-score').textContent.replace(',', '.')
    ) || 0;
    const scoreB = parseFloat(
        document.getElementById('team-b-score').textContent.replace(',', '.')
    ) || 0;

    // 2. Déterminer l'équipe qui mène ou s'il y a égalité
    let leadingTeam = null;
    let isTied = false;
    
    if (scoreA > scoreB) {
        leadingTeam = 'a';
    } else if (scoreB > scoreA) {
        leadingTeam = 'b';
    } else {
        // En cas d'égalité, on cherchera le meilleur joueur global
        isTied = true;
    }

    // 3. Parcourir les lignes des joueurs et trouver le meilleur score
    let bestRow = null;
    let bestScore = -Infinity;

    // Sélectionner soit les joueurs de l'équipe qui mène, soit tous les joueurs en cas d'égalité
    const rowSelector = isTied ? '.player-row' : `.team-${leadingTeam}.player-row`;
    const rows = document.querySelectorAll(`#stats-table ${rowSelector}`);
    
    rows.forEach(tr => {
        const totalCell = tr.querySelector('td:last-child');
        const score = parseFloat(totalCell.textContent.replace(',', '.')) || 0;
        if (score > bestScore) {
            bestScore = score;
            bestRow = tr;
        }
    });

    // 4. Retirer l'ancien tag MVP (s'il existe)
    document.querySelectorAll('#stats-table .mvp-tag').forEach(tag => tag.remove());

    // 5. Ajouter le tag sur la nouvelle ligne MVP
    if (bestRow) {
        const nameCell = bestRow.querySelector('.player-name');
        const tag = document.createElement('span');
        tag.className = 'mvp-tag';
        tag.textContent = 'MVP';
        nameCell.appendChild(tag);
        
        // Log pour débogage
        const playerName = nameCell.textContent.replace('MVP', '').trim();
        const playerTeam = bestRow.classList.contains('team-a') ? 'A' : 'B';
        console.log(`MVP attribué à ${playerName} (Équipe ${playerTeam}) avec score: ${bestScore}`);
        
        if (isTied) {
            console.log('MVP attribué au meilleur joueur global en raison d\'une égalité au score');
        }
    }
}

/**
 * Démarre la lecture automatique du match
 */
function startPlayback() {
    const commentsBox = document.getElementById('comments');
    
    // Vérifier si on est au début du match (index 0) ou en cours de match
    if (currentRowIndex === 0) {
        // Début du match - attendre 1,5 secondes exactement pour laisser le temps au message d'entre-deux d'être vu
        setTimeout(() => {
            _startPlaybackReal();
        }, 1500); // Attendre 1,5 secondes comme demandé par l'utilisateur
    } else {
        // Reprise du match - afficher un message de reprise
        if (commentsBox) {
            const quarter = jsonData[currentRowIndex][COLUMNS.QUARTER] || 'Q1';
            const time = jsonData[currentRowIndex][COLUMNS.TIME] || '12:00';
            commentsBox.innerHTML = `<p class="generated-comment">Reprise du match !</p>`;
        }
        setTimeout(() => {
            _startPlaybackReal();
        }, 800); // Délai plus court pour la reprise
    }
}

// Déplace l'ancienne logique de startPlayback ici
function _startPlaybackReal() {
    try {
        if (jsonData.length === 0) {
            throw new Error('Aucune donnée JSON disponible. Veuillez charger un fichier JSON valide.');
        }
        
        if (isPlaying) {
            return; // Déjà en cours de lecture
        }
        
        isPlaying = true;
        
        // Mettre à jour l'état des boutons
        updateControlButtonsState(true);
        
        // Calculer l'intervalle en fonction de la vitesse
        const interval = Math.floor(1000 / playbackSpeed);
        
        // Configurer le timer pour avancer automatiquement
        playbackTimer = setInterval(function() {
            // Avancer à la prochaine ligne
            currentRowIndex++;
            
            // Vérifier si on atteint la fin du match
            if (currentRowIndex >= jsonData.length) {
                pausePlayback();
                return;
            }
            
            // Mettre à jour l'affichage
            updateDisplay(currentRowIndex);
        }, interval);
    } catch (error) {
        console.error('Erreur lors du démarrage de la lecture:', error.message);
        alert(error.message);
        isPlaying = false;
        updateControlButtonsState(true);
    }
}

/**
 * Met en pause la lecture automatique
 */
function pausePlayback() {
    try {
        if (playbackTimer) {
            clearInterval(playbackTimer);
            playbackTimer = null;
        }
        
        isPlaying = false;
        updateControlButtonsState(true);
    } catch (error) {
        console.error('Erreur lors de la mise en pause:', error.message);
    }
}

/**
 * Réinitialise la lecture à la première ligne
 */
function resetPlayback() {
    try {
        // Arrêter la lecture si elle est en cours
        pausePlayback();
        
        // Revenir à la première ligne
        currentRowIndex = 0;
        
        // Mettre à jour l'affichage
        if (jsonData.length > 0) {
            updateDisplay(currentRowIndex);
        }
        
        updateControlButtonsState(true);
    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Écouteur d'événement pour le chargement du fichier JSON
    const jsonUpload = document.getElementById('json-upload');
    if (jsonUpload) {
        jsonUpload.addEventListener('change', handleFileUpload);
    }
    
    // Écouteurs pour les boutons de contrôle
    setupPlaybackControls();
});

// La fonction handleExcelUpload a été déplacée vers la page excel-converter.html

window.JsonProcessor = {
    handleFileUpload,
    startPlayback,
    pausePlayback,
    resetPlayback,
    updateDisplay,
    updateScoreHighlight,
    computeAndMarkMVP
};
