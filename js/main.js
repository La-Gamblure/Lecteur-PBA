    /**
     * Main.js - Gestion des équipes et des joueurs pour le lecteur PBA
     */

    // Variables globales
    let teamNames = []; // Liste des noms d'équipes
    let teamLogos = []; // Liste des logos d'équipes
    let teamPlayers = []; // Liste des joueurs par équipe
    let teamsData = {}; // Données complètes des équipes

    // Initialisation de l'application
    document.addEventListener('DOMContentLoaded', function() {
        // Chargement des données des équipes depuis le fichier JSON
        loadTeamsData();
        
        // Écouteurs d'événements pour les sélecteurs d'équipes
        document.getElementById('team-a-select').addEventListener('change', updateTeamA);
        document.getElementById('team-b-select').addEventListener('change', updateTeamB);
        
        // Réinitialiser l'affichage au démarrage
        initializeDisplay();
    });

    // Fonction pour charger les données des équipes depuis teams.json
    function loadTeamsData() {
        console.log('Chargement des données des équipes...');
        
        fetch('teams.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Réponse HTTP non valide: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data || !Array.isArray(data.teams)) {
                    throw new Error('Format JSON invalide: les équipes sont absentes ou mal formatées');
                }
                
                teamsData = data;
                const teamASelect = document.getElementById('team-a-select');
                const teamBSelect = document.getElementById('team-b-select');
                
                // Vider les sélecteurs
                teamASelect.innerHTML = '<option value="">Équipe domicile</option>';
                teamBSelect.innerHTML = '<option value="">Équipe visiteur</option>';
                
                // Traiter les données des équipes
                data.teams.forEach((team, index) => {
                    // Vérifier que les données nécessaires sont présentes
                    if (!team.name || !team.logo || !Array.isArray(team.players)) {
                        console.warn(`Données manquantes pour l'équipe à l'index ${index}`);
                        return; // Sauter cette équipe
                    }
                    
                    // Ajouter aux tableaux pour un accès facile
                    teamNames.push(team.name);
                    teamLogos.push(team.logo);
                    teamPlayers.push(team.players);
                    
                    // Ajouter aux sélecteurs
                    const optionA = document.createElement('option');
                    optionA.value = index; // Index comme valeur
                    optionA.textContent = team.name;
                    teamASelect.appendChild(optionA);
                    
                    const optionB = document.createElement('option');
                    optionB.value = index;
                    optionB.textContent = team.name;
                    teamBSelect.appendChild(optionB);
                });
                
                console.log(`Chargement de ${teamNames.length} équipes terminé avec succès`);
                
                // Présélectionner les équipes par défaut si aucune n'est sélectionnée
                if (teamASelect.value === "" && teamNames.length > 0) {
                    teamASelect.value = "0";
                    updateTeamA();
                }
                
                if (teamBSelect.value === "" && teamNames.length > 1) {
                    teamBSelect.value = "1";
                    updateTeamB();
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement des équipes:', error);
                // Utiliser des données par défaut en cas d'erreur
                useFallbackTeamData();
            });
    }

    // Utiliser des données d'équipes par défaut en cas d'erreur
    function useFallbackTeamData() {
        console.warn('Utilisation des données d\'équipes par défaut');
        
        // Réinitialiser les données
        teamNames = [];
        teamLogos = [];
        teamPlayers = [];
        
        // Définir des équipes par défaut
        const defaultTeams = [
            {
                name: "Gaus Spurs",
                logo: "gaus-spurs-logo.png",
                players: ["ElBoully", "SangoRiley", "Pic", "Simoul", "Ellie"]
            },
            {
                name: "Ocean Demons",
                logo: "ocean-demons-logo.png",
                players: ["BuzzerBeater", "PetiteJuju", "ShaadowStorme", "Locksyn", "Wayk00"]
            }
        ];
        
        const teamASelect = document.getElementById('team-a-select');
        const teamBSelect = document.getElementById('team-b-select');
        
        // Vider les sélecteurs
        teamASelect.innerHTML = '<option value="">Équipe domicile</option>';
        teamBSelect.innerHTML = '<option value="">Équipe visiteur</option>';
        
        // Ajouter les équipes par défaut
        defaultTeams.forEach((team, index) => {
            teamNames.push(team.name);
            teamLogos.push(team.logo);
            teamPlayers.push(team.players);
            
            // Ajouter aux sélecteurs
            const optionA = document.createElement('option');
            optionA.value = index; // Index comme valeur
            optionA.textContent = team.name;
            teamASelect.appendChild(optionA);
            
            const optionB = document.createElement('option');
            optionB.value = index;
            optionB.textContent = team.name;
            teamBSelect.appendChild(optionB);
        });
        
        // Présélectionner les équipes par défaut
        teamASelect.value = "0";
        teamBSelect.value = "1";
        
        // Mettre à jour l'affichage
        updateTeamA();
        updateTeamB();
    }

    // Mise à jour de l'équipe A (domicile)
    function updateTeamA() {
        const selectElement = document.getElementById('team-a-select');
        const teamIndex = parseInt(selectElement.value);
        
        if (!isNaN(teamIndex) && teamIndex >= 0) {
            console.log(`Mise à jour de l'équipe A avec l'index ${teamIndex}:`, teamNames[teamIndex]);
            
            // Mettre à jour le logo avec le chemin complet
            const logoPath = `teams-logo/${teamLogos[teamIndex]}`;
            document.getElementById('team-a-logo').src = logoPath;
            console.log('Logo équipe A mis à jour:', logoPath);
            
            // Mettre à jour le libellé d'équipe dans le tableau des stats avec le logo
            // Maintenant il n'y a qu'une seule cellule d'étiquette d'équipe pour l'équipe A
            const teamLabel = document.querySelector('.team-a .team-label');
            if (teamLabel) {
                // Créer l'image du logo
                const logoPath = `teams-logo/${teamLogos[teamIndex]}`;
                teamLabel.innerHTML = ''; // Vider la cellule
                const logoImg = document.createElement('img');
                logoImg.src = logoPath;
                logoImg.alt = teamNames[teamIndex];
                logoImg.title = teamNames[teamIndex]; // Ajouter un tooltip
                logoImg.className = 'team-logo-small';
                teamLabel.appendChild(logoImg);
            }
            
            // Appliquer les couleurs de l'équipe A à la table de stats
            const teamData = teamsData.teams[teamIndex];
            if (teamData) {
                // Ne rien faire, laisser le CSS gérer les couleurs
                // Les styles sont maintenant définis de manière uniforme dans le CSS
            }
            
            // Mettre à jour les noms des joueurs pour l'équipe A
            const teamARows = document.querySelectorAll('.team-a');
            const players = teamPlayers[teamIndex];
            
            console.log('Joueurs équipe A:', players);
            console.log('Nombre de lignes équipe A:', teamARows.length);
            
            // Assurons-nous que nous avons 5 joueurs, en ajoutant des vides si nécessaire
            const paddedPlayers = [...players];
            while (paddedPlayers.length < 5) {
                paddedPlayers.push('Joueur ' + (paddedPlayers.length + 1));
            }
            
            // On s'assure de récupérer toutes les cellules de noms de joueurs
            const playerNameCells = document.querySelectorAll('.team-a .player-name');
            console.log('Nombre de cellules de noms pour équipe A:', playerNameCells.length);
            
            // Pour chaque cellule de nom de joueur
            for (let i = 0; i < playerNameCells.length; i++) {
                // Assigner le bon joueur en fonction de la position
                if (i < paddedPlayers.length) {
                    playerNameCells[i].textContent = paddedPlayers[i];
                    console.log(`Joueur A${i+1} mis à jour:`, paddedPlayers[i]);
                } else {
                    playerNameCells[i].textContent = `Joueur ${i+1}`;
                    console.log(`Joueur A${i+1} par défaut:`, playerNameCells[i].textContent);
                }
            }
        } else {
            console.warn('Index d\'équipe A invalide ou non sélectionné:', teamIndex);
        }
    }

    // Mise à jour de l'équipe B (visiteur)
    function updateTeamB() {
        const selectElement = document.getElementById('team-b-select');
        const teamIndex = parseInt(selectElement.value);
        
        if (!isNaN(teamIndex) && teamIndex >= 0) {
            console.log(`Mise à jour de l'équipe B avec l'index ${teamIndex}:`, teamNames[teamIndex]);
            
            // Mettre à jour le logo avec le chemin complet
            const logoPath = `teams-logo/${teamLogos[teamIndex]}`;
            document.getElementById('team-b-logo').src = logoPath;
            console.log('Logo équipe B mis à jour:', logoPath);
            
            // Mettre à jour le libellé d'équipe dans le tableau des stats avec le logo
            // Maintenant il n'y a qu'une seule cellule d'étiquette d'équipe pour l'équipe B
            const teamLabel = document.querySelector('.team-b .team-label');
            if (teamLabel) {
                // Créer l'image du logo
                const logoPath = `teams-logo/${teamLogos[teamIndex]}`;
                teamLabel.innerHTML = ''; // Vider la cellule
                const logoImg = document.createElement('img');
                logoImg.src = logoPath;
                logoImg.alt = teamNames[teamIndex];
                logoImg.title = teamNames[teamIndex]; // Ajouter un tooltip
                logoImg.className = 'team-logo-small';
                teamLabel.appendChild(logoImg);
            }
            
            // Appliquer les couleurs de l'équipe B à la table de stats
            const teamData = teamsData.teams[teamIndex];
            if (teamData) {
                // Ne rien faire, laisser le CSS gérer les couleurs
                // Les styles sont maintenant définis de manière uniforme dans le CSS
            }
            
            // Mettre à jour les noms des joueurs pour l'équipe B
            const teamBRows = document.querySelectorAll('.team-b');
            const players = teamPlayers[teamIndex];
            
            console.log('Joueurs équipe B:', players);
            console.log('Nombre de lignes équipe B:', teamBRows.length);
            
            // Assurons-nous que nous avons 5 joueurs, en ajoutant des vides si nécessaire
            const paddedPlayers = [...players];
            while (paddedPlayers.length < 5) {
                paddedPlayers.push('Joueur ' + (paddedPlayers.length + 1));
            }
            
            // On s'assure de récupérer toutes les cellules de noms de joueurs
            const playerNameCells = document.querySelectorAll('.team-b .player-name');
            console.log('Nombre de cellules de noms pour équipe B:', playerNameCells.length);
            
            // Pour chaque cellule de nom de joueur
            for (let i = 0; i < playerNameCells.length; i++) {
                // Assigner le bon joueur en fonction de la position
                if (i < paddedPlayers.length) {
                    playerNameCells[i].textContent = paddedPlayers[i];
                    console.log(`Joueur B${i+1} mis à jour:`, paddedPlayers[i]);
                } else {
                    playerNameCells[i].textContent = `Joueur ${i+1}`;
                    console.log(`Joueur B${i+1} par défaut:`, playerNameCells[i].textContent);
                }
            }
        } else {
            console.warn('Index d\'équipe B invalide ou non sélectionné:', teamIndex);
        }
    }

    /**
     * Initialisation de l'affichage
     * Réinitialise tous les éléments d'affichage (scoreboard, commentaires, statistiques)
     */
    function initializeDisplay() {
        // Réinitialiser le scoreboard
        document.getElementById('quarter').textContent = 'Q1';
        document.getElementById('timer').textContent = '12:00';
        document.getElementById('team-a-score').textContent = '0';
        document.getElementById('team-b-score').textContent = '0';
        
        // Réinitialiser les commentaires
        const actionElement = document.querySelector('.current-action');
        if (actionElement) {
            actionElement.innerHTML = `
                <span class="action-player">-</span>
                <span class="action-type">Début du match</span>
                <span class="action-result">-</span>
            `;
        }
        
        // Réinitialiser les stats (toutes les cellules à 0 sauf les noms)
        const statCells = document.querySelectorAll('.stats-table tr:not(.stats-row) td:not(.team-label):not(.player-name)');
        statCells.forEach(cell => {
            cell.textContent = '0';
        });
    }

