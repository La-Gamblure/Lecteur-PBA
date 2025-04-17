// Gestion de la visibilité des ballons de possession dans les colonnes latérales
// Utilisation : possessionBall('A') ou possessionBall('B')

function possessionBall(team) {
    const ballA = document.getElementById('commentary-ball-a');
    const ballB = document.getElementById('commentary-ball-b');
    if (!ballA || !ballB) return;
    if (team === 'A') {
        ballA.classList.add('visible');
        ballB.classList.remove('visible');
    } else if (team === 'B') {
        ballA.classList.remove('visible');
        ballB.classList.add('visible');
    } else {
        ballA.classList.remove('visible');
        ballB.classList.remove('visible');
    }
}

// Pour debug/démo :
// possessionBall('A'); // Pour afficher le ballon à gauche
// possessionBall('B'); // Pour afficher le ballon à droite
// possessionBall();    // Pour cacher les deux

window.possessionBall = possessionBall; // Expose pour usage global
