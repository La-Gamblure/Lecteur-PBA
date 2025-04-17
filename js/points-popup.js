// points-popup.js
// Gère l'affichage animé du pop-up de points (+2PTS/+3PTS) dans la section commentary

import { detectShotType } from './commentary-generator.js';

/**
 * Affiche un pop-up animé avec le nombre de points marqués
 * @param {string} shotType - '2PT' ou '3PT'
 */
export function showPointsPopup(shotType) {
    const popup = document.getElementById('points-popup');
    if (!popup) return;
    
    // Déterminer le texte à afficher
    let text = '';
    if (shotType === '2PT') text = '+2PTS';
    else if (shotType === '3PT') text = '+3PTS';
    else return;

    // Mettre à jour le texte
    popup.textContent = text;
    popup.style.display = 'block';
    popup.classList.remove('show');
    // Forcer le reflow pour relancer l'animation
    void popup.offsetWidth;
    popup.classList.add('show');

    // Masquer après l'animation
    setTimeout(() => {
        popup.classList.remove('show');
        popup.style.display = 'none';
    }, 800);
}
