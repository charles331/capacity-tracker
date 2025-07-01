🚀 Capacity TrackerCe projet est une application web légère conçue pour vous aider à suivre et à visualiser la capacité de vos équipes (squads) semaine par semaine, en mettant en évidence les périodes où plus de 50 % des membres d'une équipe sont absents. Il est construit avec Node.js et TypeScript pour le backend, et un frontend simple en HTML, CSS et JavaScript vanilla.✨ Fonctionnalités ClésGestion des Absences : Enregistrez facilement les périodes de congé des membres de vos équipes.Calcul de Capacité Hebdomadaire : Le backend calcule automatiquement le pourcentage d'absence pour chaque équipe, semaine par semaine.Visualisation Intuitive : Une heatmap (carte de chaleur) front-end affiche clairement les semaines critiques où le seuil de 50 % d'absence est dépassé (marquées en rouge).Base de Données Locale : Utilise SQLite pour un stockage des données simple et autonome, sans dépendances externes complexes.Développement en TypeScript : Le projet est entièrement typé pour une meilleure maintenabilité et pour vous aider à monter en compétence sur TypeScript.Indépendance : Fonctionne de manière autonome, sans intégration avec des systèmes RH ou de gestion de projet existants (Jira, Confluence, MyProtime, etc.).🛠 Technologies UtiliséesBackend :Node.js : Environnement d'exécution JavaScript.TypeScript : Langage de programmation typé.Express.js : Framework web minimaliste pour Node.js.better-sqlite3 : Pilote SQLite synchrone et performant.Luxon : Bibliothèque moderne et robuste pour la manipulation des dates et heures.nodemon : Outil pour redémarrer automatiquement le serveur pendant le développement.ts-node : Pour exécuter les fichiers TypeScript directement sans compilation préalable en développement.Frontend :HTML5CSS3JavaScript (Vanilla)🚀 Démarrage RapideCes instructions vous guideront pour configurer et lancer le projet sur votre machine locale, en particulier dans un environnement WSL.PrérequisAssurez-vous d'avoir les éléments suivants installés dans votre environnement WSL :Node.js (version 18 ou supérieure recommandée)npm (généralement inclus avec Node.js)Git (pour cloner le dépôt)Si vous ne les avez pas, ouvrez votre terminal WSL et exécutez :# Mettre à jour les paquets système
sudo apt update && sudo apt upgrade -y

# Installer nvm (Node Version Manager) pour gérer Node.js

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Fermez et rouvrez votre terminal WSL pour que nvm soit chargé

nvm install --lts # Installe la dernière version LTS de Node.js
nvm use --lts
node -v # Vérifiez l'installation (devrait afficher vXX.YY.Z)
npm -v # Vérifiez l'installation (devrait afficher vX.Y.Z)

# Installer TypeScript globalement

npm install -g typescript
tsc -v # Vérifiez l'installation (devrait afficher Version X.X.X)
Installation du ProjetClonez le dépôt Git :git clone https://github.com/votre-utilisateur/capacity-tracker.git

# Remplacez "votre-utilisateur/capacity-tracker.git" par l'URL réelle de votre dépôt si vous en avez un.

Naviguez vers le répertoire du projet :cd capacity-tracker
Installez les dépendances Node.js :Cette commande lira le fichier package.json et installera toutes les bibliothèques nécessaires.npm install
Si vous avez rencontré des problèmes de typage ou de versions précédemment, il est recommandé de faire un nettoyage complet avant de réinstaller :rm -rf node_modules
rm package-lock.json
npm install
Initialisation de la Base de DonnéesAvant de pouvoir utiliser l'application, vous devez initialiser la base de données SQLite. Cette commande va créer le fichier capacity.db dans le dossier data/ et y insérer les schémas de table ainsi que quelques exemples de squads (Alpha, Beta, Gamma).npm run db:init
Vous devriez voir des messages dans votre console confirmant la connexion à la base de données et l'insertion des squads d'exemple.Lancement du ServeurMode Développement (Recommandé)Pour lancer le serveur en mode développement, ce qui permet un rechargement automatique à chaque modification de fichier source :npm run dev
Le serveur sera alors accessible dans votre navigateur à l'adresse : http://localhost:3000Vous devriez voir dans votre console des messages similaires à :[nodemon] starting `ts-node src/server.ts`
Database connected at /home/cme/capacity-tracker/data/capacity.db
Database initialized.
Server running on http://localhost:3000
Mode Production (Compilation et Lancement)Pour simuler un environnement de production, vous devez d'abord compiler le code TypeScript en JavaScript, puis lancer le fichier JavaScript résultant :Compiler le code TypeScript :npm run build
Cela créera un dossier dist/ contenant les fichiers JavaScript compilés.Lancer le serveur compilé :npm run start
📂 Structure du Projetcapacity-tracker/
├── src/
│ ├── database.ts # Initialisation de la DB et opérations CRUD de base (squads, absences)
│ ├── types.ts # Définitions des interfaces TypeScript (Squad, Absence, WeekCapacity)
│ ├── capacityCalculator.ts # Logique de calcul du pourcentage d'absence par semaine et par équipe
│ └── server.ts # Point d'entrée du backend : configuration Express, routes API, liaison avec la DB et les calculs
├── public/ # Contient les fichiers du frontend statique
│ ├── index.html # La page web principale de l'application
│ ├── style.css # Styles CSS pour l'interface utilisateur
│ └── script.js # Logique JavaScript du frontend (formulaire, affichage heatmap, appels API)
├── data/
│ └── capacity.db # Fichier de la base de données SQLite (généré après `npm run db:init`)
├── package.json # Métadonnées du projet, scripts NPM, et liste des dépendances
├── package-lock.json # Verrouille les versions exactes des dépendances
├── tsconfig.json # Configuration du compilateur TypeScript
└── README.md # Ce fichier de documentation
🔌 Points de Terminaison de l'APILe serveur Express expose les points de terminaison API suivants :1. Gestion des AbsencesPOST /api/absencesDescription : Ajoute une nouvelle absence pour un membre d'équipe.Méthode : POSTCorps de la requête (JSON) :{
"squad_id": 1, // ID numérique de la squad (ex: 1 pour Alpha)
"member_name": "Jean Dupont", // Nom du membre absent
"start_date": "2025-07-14", // Date de début du congé (YYYY-MM-DD)
"end_date": "2025-07-18" // Date de fin du congé (YYYY-MM-DD)
}
Réponse (JSON) : { "id": <new_absence_id>, "message": "Absence added successfully." }Codes de statut : 201 Created, 400 Bad Request (champs manquants), 500 Internal Server Error.2. Récupération des SquadsGET /api/squadsDescription : Récupère la liste de toutes les squads configurées dans la base de données.Méthode : GETRéponse (JSON) : Un tableau d'objets Squad.[
{ "id": 1, "name": "Alpha", "member_count": 5 },
{ "id": 2, "name": "Beta", "member_count": 6 }
]
Codes de statut : 200 OK, 500 Internal Server Error.3. Calcul et Visualisation de la CapacitéGET /api/capacityDescription : Calcule et retourne la capacité hebdomadaire de chaque équipe pour les 6 prochains mois, en indiquant le pourcentage d'absence et si le seuil d'alerte (50%) est dépassé.Méthode : GETRéponse (JSON) : Un tableau d'objets WeekCapacity.[
{
"squadName": "Alpha",
"weekId": "2025-W28",
"percentageAbsence": 60.0,
"alert": true
},
{
"squadName": "Beta",
"weekId": "2025-W28",
"percentageAbsence": 20.0,
"alert": false
}
// ... autres semaines et squads
]
Codes de statut : 200 OK, 500 Internal Server Error.🤝 ContributionLes contributions sont les bienvenues ! Si vous souhaitez améliorer ce projet, n'hésitez pas à :Faire un fork du dépôt.Créer une branche pour votre fonctionnalité (git checkout -b feature/nouvelle-fonctionnalite).Committer vos changements (git commit -m 'Ajout d'une nouvelle fonctionnalité géniale').Pousser vers la branche (git push origin feature/nouvelle-fonctionnalite).Ouvrir une Pull Request.📄 LicenceCe projet est distribué sous la licence ISC.
