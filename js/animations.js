/**
 * Animations et effets visuels pour PBA Lecteur
 * Gère les animations et effets visuels dynamiques de l'interface
 */

// Stockage des valeurs précédentes pour détecter les changements
let previousStatsValues = {};
let previousPossession = null;

/**
 * Initialisation des animations
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Animations initialized');
    
    // Initialiser le stockage des valeurs précédentes
    initPreviousValues();
});

/**
 * Initialise le stockage des valeurs précédentes des statistiques
 */
function initPreviousValues() {
    // Récupérer toutes les cellules de statistiques
    const statCells = document.querySelectorAll('#stats-table .team-a td:not(.player-name):not(.team-label), #stats-table .team-b td:not(.player-name):not(.team-label)');
    
    // Initialiser les valeurs précédentes à 0
    statCells.forEach(cell => {
        const rowIndex = cell.parentElement.rowIndex;
        const cellIndex = cell.cellIndex;
        const key = `${rowIndex}-${cellIndex}`;
        previousStatsValues[key] = cell.textContent || '0';
    });
    
    console.log('Previous values initialized');
}

/**
 * Met en évidence les cellules dont la valeur a changé
 * @param {HTMLElement} cell - La cellule à vérifier
 */
function highlightChangedCell(cell) {
    const rowIndex = cell.parentElement.rowIndex;
    const cellIndex = cell.cellIndex;
    const key = `${rowIndex}-${cellIndex}`;
    const currentValue = cell.textContent || '0';
    
    // Vérifier si la valeur a changé
    if (previousStatsValues[key] !== currentValue) {
        // Appliquer l'animation de highlight
        cell.classList.add('stat-highlight');
        
        // Retirer la classe après l'animation
        setTimeout(() => {
            cell.classList.remove('stat-highlight');
        }, 1000);
        
        // Mettre à jour la valeur précédente
        previousStatsValues[key] = currentValue;
    }
}

/**
 * Vérifie et applique le style pour les valeurs TO négatives
 * @param {HTMLElement} cell - La cellule à vérifier
 */
function checkTOValue(cell) {
    // Vérifier si c'est une cellule TO (8ème colonne de stats)
    const cellIndex = cell.cellIndex;
    const headerRow = document.querySelector('#stats-table tr.stats-row');
    
    if (headerRow) {
        const headers = headerRow.querySelectorAll('td');
        
        // Parcourir les en-têtes pour trouver la colonne TO
        headers.forEach((header, index) => {
            if (header.textContent === 'TO' && cellIndex === index) {
                // C'est une cellule TO, vérifier sa valeur
                const value = parseInt(cell.textContent || '0');
                
                if (value < 0) {
                    cell.classList.add('negative-to');
                } else {
                    cell.classList.remove('negative-to');
                }
            }
        });
    }
}

/**
 * Met à jour l'indicateur de possession
 * @param {string} possession - 'Home' ou 'Away'
 */
function updatePossessionIndicator(possession) {
    if (previousPossession === possession) return;
    
    // Créer ou récupérer l'indicateur de possession
    let possessionIndicator = document.getElementById('possession-indicator');
    
    if (!possessionIndicator) {
        possessionIndicator = document.createElement('div');
        possessionIndicator.id = 'possession-indicator';
        possessionIndicator.className = 'possession-ball';
        
        // Ajouter l'indicateur à la section de commentaire
        const commentaryBox = document.querySelector('.commentary-box');
        if (commentaryBox) {
            commentaryBox.appendChild(possessionIndicator);
        }
    }
    
    // Mettre à jour la position de l'indicateur
    if (possession === 'Home') {
        possessionIndicator.classList.remove('away');
        possessionIndicator.classList.add('home');
    } else if (possession === 'Away') {
        possessionIndicator.classList.remove('home');
        possessionIndicator.classList.add('away');
    }
    
    // Animer l'apparition
    possessionIndicator.classList.add('animate');
    setTimeout(() => {
        possessionIndicator.classList.remove('animate');
    }, 500);
    
    // Mettre à jour la valeur précédente
    previousPossession = possession;
}

/**
 * Applique toutes les animations et effets visuels
 * Cette fonction est appelée après chaque mise à jour des données
 * @param {Object} currentRow - Les données JSON de l'étape actuelle
 */
function applyVisualEffects(currentRow) {
    // Mettre en évidence les cellules modifiées
    const statCells = document.querySelectorAll('#stats-table .team-a td:not(.player-name):not(.team-label), #stats-table .team-b td:not(.player-name):not(.team-label)');
    statCells.forEach(cell => {
        highlightChangedCell(cell);
        checkTOValue(cell);
    });
    
    // Mettre à jour l'indicateur de possession
    // La possession est indiquée par la clé "commentaire-Equipe" dans le JSON
    if (currentRow && currentRow.length > 109) {
        const possession = currentRow[109];
        if (possession === 'Home' || possession === 'Away') {
            updatePossessionIndicator(possession);
        }
    }
}

// Exporter les fonctions pour utilisation dans d'autres scripts
window.Animations = {
    applyVisualEffects,
    initPreviousValues
};
