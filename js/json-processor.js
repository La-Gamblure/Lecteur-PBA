/**
 * JSON Processor pour le Lecteur PBA
 * Gère le chargement, le traitement et l'affichage des données JSON dans l'interface
 */

// Utiliser le générateur de commentaires depuis la variable globale
// Attend que window.CommentaryGenerator soit défini par le script module

// Variables globales pour le stockage des données et l'état du lecteur
let jsonData = []; // Données du match
let currentRowIndex = 0; // Index de la ligne actuelle
let isPlaying = false; // État de lecture (lecture/pause)
let playbackTimer; // Timer pour l'avancement automatique
let playbackSpeed = 1; // Vitesse de lecture (par défaut: x1)
let previousStatsValues = {}; // Pour stocker les valeurs précédentes des statistiques

// Constantes pour mapper les clés JSON avec les ID HTML
const COLUMNS = {
    // Propriétés pour le scoreboard
    QUARTER: "scoreboard-QT",
    TIME: "scoreboard-Temps",
    ETAPE: "scoreboard-Etape",
    SCORE_TEAM_A: "scoreboard-Score-cumule-Equipe-A",
    SCORE_TEAM_B: "scoreboard-Score-cumule-Equipe-B",
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
                        if (window.CommentaryGenerator && typeof window.CommentaryGenerator.enrichPlays === 'function') {
                            jsonData = window.CommentaryGenerator.enrichPlays(rawJsonData);
                        }
                    } catch (enrichError) {
                        console.warn('Enrichissement des données non disponible:', enrichError.message);
                    }
                    
                    // Stocker les données dans window pour compatibilité avec d'autres modules
                    window.jsonData = jsonData;
                    
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
function updateDisplay(rowIndex) {
    try {
        // Vérifier si l'index est valide
        if (rowIndex < 0 || rowIndex >= jsonData.length) {
            throw new Error(`Index de ligne invalide: ${rowIndex} (max: ${jsonData.length - 1})`);
        }
        
        // Récupérer la ligne correspondante
        const row = jsonData[rowIndex];
        
        // Mettre à jour le compteur d'étapes
        document.getElementById('current-step').textContent = rowIndex + 1;
        
        // Mettre à jour le scoreboard
        updateScoreboard(row);
        
        // Mettre à jour l'indicateur de possession
        updatePossession(row);
        
        // COMMENTÉ : Désactivation temporaire des commentaires
        // updateCommentary(row);
        
        // Mettre à jour les statistiques des joueurs
        updatePlayerStats(row);
        
        // Marquer le MVP (on garde cette fonction comme demandé)
        computeAndMarkMVP();
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'affichage:', error.message);
    }
}

/**
 * Met à jour le scoreboard avec les données de la ligne
 * @param {Object} row - Données de la ligne
 */
function updateScoreboard(row) {
    // Mettre à jour le quart-temps
    const quarter = row[COLUMNS.QUARTER] || "Q1";
    document.getElementById('quarter').textContent = quarter;
    
    // Mettre à jour le temps
    const time = row[COLUMNS.TIME] || "12:00";
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
    let possession = '';
    
    // Déterminer la possession selon l'équipe et la situation
    if (row.Situation && (row.Situation.toLowerCase() === "possession" || row.Situation.toLowerCase() === "shoot")) {
        possession = row.Equipe;
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
 * Met à jour les commentaires avec les données de la ligne
 * @param {Object} row - Données de la ligne
 */
function updateCommentary(row) {
    // COMMENTÉ : Désactivation temporaire de la génération de commentaires
    
    // Commentaire de base simple pour le débogage
    const commentaryElement = document.getElementById('commentary-text');
    if (commentaryElement) {
        // Afficher simplement l'étape actuelle pour le débogage
        commentaryElement.textContent = `Étape: ${row['scoreboard-Etape']} | Action: ${row['commentaire-Situation'] || 'N/A'}`;
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
                const currentValue = parseInt(row[idStat]) || 0;
                
                // Récupérer la valeur précédente si elle existe
                const previousValue = previousStatsValues[idStat] || 0;
                
                // Mettre à jour le contenu
                statElement.textContent = currentValue;
                
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
    handleExcelUpload,
    startPlayback,
    pausePlayback,
    resetPlayback,
    updateDisplay,
    updateScoreHighlight,
    computeAndMarkMVP
};
