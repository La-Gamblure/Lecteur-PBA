// Contrôle la visibilité des indicateurs de possession dans la commentary-box
// Utilisation : possessionIndicator('A'), possessionIndicator('B'), possessionIndicator()

function possessionIndicator(team) {
    const indA = document.getElementById('possession-indicator-a');
    const indB = document.getElementById('possession-indicator-b');
    if (!indA || !indB) return;
    if (team === 'A') {
        indA.classList.add('visible');
        indB.classList.remove('visible');
    } else if (team === 'B') {
        indA.classList.remove('visible');
        indB.classList.add('visible');
    } else {
        indA.classList.remove('visible');
        indB.classList.remove('visible');
    }
}

// Pour debug/démo :
// possessionIndicator('A'); // Affiche l'emoji à gauche
// possessionIndicator('B'); // Affiche l'emoji à droite
// possessionIndicator();    // Cache les deux

window.possessionIndicator = possessionIndicator; // Expose pour usage global
