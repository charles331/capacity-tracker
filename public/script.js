// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  // Récupération des éléments du DOM pour le formulaire d'ajout d'absence
  const addAbsenceForm = document.getElementById("addAbsenceForm");
  const memberSelect = document.getElementById("memberSelect"); // Sélecteur de membre
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const formMessage = document.getElementById("formMessage"); // Message pour le formulaire d'absence

  // Récupération des éléments du DOM pour la gestion des squads
  const addSquadForm = document.getElementById("addSquadForm");
  const newSquadNameInput = document.getElementById("newSquadName");
  const addSquadMessage = document.getElementById("addSquadMessage"); // Message pour le formulaire d'ajout de squad
  const squadList = document.getElementById("squadList"); // Liste des squads existantes
  const squadListMessage = document.getElementById("squadListMessage"); // Message pour la liste des squads

  // Récupération des éléments du DOM pour la gestion des membres
  const manageMembersSquadSelect = document.getElementById(
    "manageMembersSquadSelect"
  ); // Sélecteur de squad pour la gestion des membres
  const addMemberForm = document.getElementById("addMemberForm");
  const newMemberNameInput = document.getElementById("newMemberName");
  const addMemberMessage = document.getElementById("addMemberMessage"); // Message pour le formulaire d'ajout de membre
  const memberList = document.getElementById("memberList"); // Liste des membres de la squad sélectionnée
  const memberListMessage = document.getElementById("memberListMessage"); // Message pour la liste des membres

  // Récupération des éléments du DOM pour la heatmap
  const heatmapContainer = document.getElementById("heatmap-container");
  const loadingMessage = document.getElementById("loadingMessage");

  // Variables pour stocker les données récupérées de l'API
  let squads = []; // Toutes les squads
  let members = []; // Tous les membres (utilisé pour le sélecteur d'absence et le calcul de capacité)

  // --- Fonctions Utilitaires ---

  /**
   * Affiche un message temporaire dans un élément du DOM.
   * @param {string} message Le texte du message.
   * @param {'success' | 'error'} type Le type de message (pour le style CSS).
   * @param {HTMLElement} targetElement L'élément HTML où afficher le message.
   */
  function showMessage(message, type, targetElement) {
    targetElement.textContent = message;
    targetElement.className = `message ${type}`;
    setTimeout(() => {
      targetElement.textContent = "";
      targetElement.className = "message";
    }, 5000); // Le message disparaît après 5 secondes
  }

  /**
   * Charge toutes les données nécessaires (squads, membres, heatmap) et rafraîchit l'interface.
   * Cette fonction est appelée après chaque modification (ajout/suppression).
   */
  async function loadAllData() {
    await loadSquads(); // Charge les squads pour tous les sélecteurs et listes
    await loadAllMembersForAbsenceForm(); // Charge tous les membres pour le formulaire d'absence
    // Charge les membres pour la section de gestion des membres de la squad actuellement sélectionnée
    await loadMembersForManagement(manageMembersSquadSelect.value);
    generateHeatmap(); // Génère la heatmap
  }

  /**
   * Charge toutes les squads depuis l'API et met à jour les sélecteurs et la liste des squads.
   */
  async function loadSquads() {
    try {
      const response = await fetch("/api/squads");
      squads = await response.json();

      // --- Mise à jour du sélecteur de squad pour la gestion des membres ---
      manageMembersSquadSelect.innerHTML = "";
      if (squads.length === 0) {
        manageMembersSquadSelect.innerHTML =
          '<option value="">Aucune équipe disponible</option>';
      } else {
        squads.forEach((squad) => {
          const option = document.createElement("option");
          option.value = squad.id;
          option.textContent = squad.name;
          manageMembersSquadSelect.appendChild(option);
        });
        // Déclenche le chargement des membres pour la première squad par défaut si elle existe
        if (manageMembersSquadSelect.value) {
          loadMembersForManagement(manageMembersSquadSelect.value);
        }
      }

      // --- Mise à jour de la liste de gestion des squads ---
      squadList.innerHTML = "";
      if (squads.length === 0) {
        squadList.innerHTML = "<li>Aucune équipe enregistrée.</li>";
      } else {
        squads.forEach((squad) => {
          const li = document.createElement("li");
          li.innerHTML = `
                        <span>${squad.name}</span>
                        <button class="delete-squad-btn" data-id="${squad.id}">Supprimer</button>
                    `;
          squadList.appendChild(li);
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des squads:", error);
      showMessage(
        "Erreur lors du chargement des équipes.",
        "error",
        formMessage
      );
      showMessage(
        "Erreur lors du chargement des équipes.",
        "error",
        squadListMessage
      );
      showMessage(
        "Erreur lors du chargement des équipes.",
        "error",
        memberListMessage
      );
    }
  }

  /**
   * Charge tous les membres pour le sélecteur d'absence.
   * Cela permet de sélectionner un membre de n'importe quelle squad pour une absence.
   */
  async function loadAllMembersForAbsenceForm() {
    memberSelect.innerHTML = ""; // Vide les options existantes
    memberSelect.disabled = true; // Désactive le sélecteur pendant le chargement

    try {
      const allSquads = await (await fetch("/api/squads")).json();
      members = []; // Réinitialise la liste globale des membres

      if (allSquads.length === 0) {
        memberSelect.innerHTML =
          '<option value="">Ajoutez d\'abord des équipes et des membres</option>';
        return;
      }

      // Pour chaque squad, récupérer ses membres et les ajouter à la liste globale
      for (const squad of allSquads) {
        const response = await fetch(`/api/squads/${squad.id}/members`);
        const squadMembers = await response.json();
        squadMembers.forEach((member) => {
          // Ajoute le nom de la squad au membre pour un affichage clair dans le sélecteur
          members.push({ ...member, squadName: squad.name });
        });
      }

      if (members.length === 0) {
        memberSelect.innerHTML =
          '<option value="">Aucun membre disponible</option>';
      } else {
        // Trie les membres par nom de squad puis par nom de membre pour un affichage ordonné
        members.sort((a, b) => {
          if (a.squadName < b.squadName) return -1;
          if (a.squadName > b.squadName) return 1;
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        });

        members.forEach((member) => {
          const option = document.createElement("option");
          option.value = member.id;
          option.textContent = `${member.name} (${member.squadName})`; // Ex: "Jean Dupont (Alpha)"
          memberSelect.appendChild(option);
        });
        memberSelect.disabled = false; // Réactive le sélecteur
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement des membres pour le formulaire d'absence:",
        error
      );
      showMessage(
        "Erreur lors du chargement des membres.",
        "error",
        formMessage
      );
      memberSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    }
  }

  /**
   * Charge les membres pour la section de gestion des membres d'une squad spécifique.
   * @param {string} squadId L'ID de la squad dont les membres doivent être chargés.
   */
  async function loadMembersForManagement(squadId) {
    memberList.innerHTML = ""; // Nettoyer la liste des membres
    if (!squadId) {
      memberList.innerHTML =
        "<li>Sélectionnez une équipe pour voir les membres.</li>";
      return;
    }

    try {
      const response = await fetch(`/api/squads/${squadId}/members`);
      const membersInSquad = await response.json();

      if (membersInSquad.length === 0) {
        memberList.innerHTML = "<li>Aucun membre dans cette équipe.</li>";
      } else {
        membersInSquad.forEach((member) => {
          const li = document.createElement("li");
          li.innerHTML = `
                        <span>${member.name}</span>
                        <button class="delete-member-btn" data-id="${member.id}">Supprimer</button>
                    `;
          memberList.appendChild(li);
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement des membres de la squad:",
        error
      );
      showMessage(
        "Erreur lors du chargement des membres de l'équipe.",
        "error",
        memberListMessage
      );
    }
  }

  /**
   * Génère et affiche la heatmap de capacité des équipes.
   */
  async function generateHeatmap() {
    heatmapContainer.innerHTML = ""; // Nettoyer le contenu précédent de la heatmap
    loadingMessage.style.display = "block"; // Afficher le message de chargement

    try {
      const response = await fetch("/api/capacity");
      const capacityData = await response.json();

      loadingMessage.style.display = "none"; // Cacher le message de chargement

      if (capacityData.length === 0) {
        heatmapContainer.innerHTML =
          "<p>Aucune donnée de capacité à afficher. Ajoutez des absences ou des équipes/membres !</p>";
        return;
      }

      // Extraire les identifiants de semaine uniques et les noms de squads uniques
      const weekIds = Array.from(
        new Set(capacityData.map((d) => d.weekId))
      ).sort();
      const squadNames = Array.from(
        new Set(capacityData.map((d) => d.squadName))
      ).sort();

      // Configurer la grille CSS pour la heatmap: une colonne auto pour les noms de squad, puis une colonne pour chaque semaine
      heatmapContainer.style.gridTemplateColumns = `auto repeat(${weekIds.length}, 1fr)`;

      // --- Création des en-têtes de la Heatmap (Semaines) ---
      const cornerHeader = document.createElement("div");
      cornerHeader.className = "heatmap-header";
      cornerHeader.textContent = "Équipe \\ Semaine";
      heatmapContainer.appendChild(cornerHeader);

      weekIds.forEach((weekId) => {
        const header = document.createElement("div");
        header.className = "heatmap-header";
        header.textContent = weekId;
        heatmapContainer.appendChild(header);
      });

      // --- Création des lignes de la Heatmap (Squads) ---
      squadNames.forEach((squadName) => {
        // En-tête de ligne (nom de la squad)
        const rowHeader = document.createElement("div");
        rowHeader.className = "heatmap-row-header";
        rowHeader.textContent = squadName;
        heatmapContainer.appendChild(rowHeader);

        // Trouver la squad pour obtenir son ID et ensuite le nombre total de membres
        const currentSquad = squads.find((s) => s.name === squadName);
        // Filtrer les membres globaux pour obtenir ceux de la squad actuelle
        const totalMembersInSquad = members.filter(
          (m) => m.squad_id === currentSquad?.id
        ).length;

        // Création des cellules pour chaque semaine
        weekIds.forEach((weekId) => {
          const cellData = capacityData.find(
            (d) => d.squadName === squadName && d.weekId === weekId
          );
          const cell = document.createElement("div");
          cell.className = "heatmap-cell";

          if (cellData) {
            cell.textContent = `${cellData.percentageAbsence}%`;
            // Applique la classe CSS appropriée en fonction du pourcentage d'absence
            if (totalMembersInSquad === 0) {
              // Si l'équipe a 0 membre, pas d'alerte pertinente, couleur grise
              cell.classList.add("capacity-unknown");
            } else if (cellData.alert) {
              cell.classList.add("capacity-high"); // Rouge (>50%)
            } else if (cellData.percentageAbsence > 25) {
              cell.classList.add("capacity-medium"); // Jaune (25-50%)
            } else {
              cell.classList.add("capacity-low"); // Vert (0-25%)
            }
          } else {
            cell.textContent = "N/A"; // Si aucune donnée pour cette cellule
            cell.classList.add("capacity-unknown");
          }
          heatmapContainer.appendChild(cell);
        });
      });
    } catch (error) {
      console.error("Erreur lors du chargement de la capacité:", error);
      showMessage(
        "Erreur lors du chargement de la capacité des équipes.",
        "error",
        formMessage
      );
      loadingMessage.style.display = "none";
      heatmapContainer.innerHTML =
        "<p>Impossible de charger les données de capacité. Le serveur est-il démarré ?</p>";
    }
  }

  // --- Gestionnaires d'Événements ---

  // Formulaire d'ajout d'absence
  addAbsenceForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Empêche le rechargement de la page

    const memberId = parseInt(memberSelect.value); // Récupère l'ID du membre sélectionné
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Validation côté client
    if (!memberId || !startDate || !endDate) {
      showMessage("Veuillez remplir tous les champs.", "error", formMessage);
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showMessage(
        "La date de fin ne peut pas être antérieure à la date de début.",
        "error",
        formMessage
      );
      return;
    }

    try {
      const response = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (response.ok) {
        showMessage("Absence ajoutée avec succès !", "success", formMessage);
        addAbsenceForm.reset(); // Réinitialise le formulaire
        loadAllData(); // Recharge toutes les données pour rafraîchir l'interface
      } else {
        const errorData = await response.text();
        showMessage(
          `Erreur lors de l'ajout de l'absence: ${errorData}`,
          "error",
          formMessage
        );
      }
    } catch (error) {
      console.error(
        "Erreur réseau ou du serveur lors de l'ajout d'absence:",
        error
      );
      showMessage("Erreur de connexion au serveur.", "error", formMessage);
    }
  });

  // Formulaire d'ajout de squad
  addSquadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = newSquadNameInput.value.trim();

    if (!name) {
      showMessage("Veuillez entrer un nom d'équipe.", "error", addSquadMessage);
      return;
    }

    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        showMessage("Équipe ajoutée avec succès !", "success", addSquadMessage);
        addSquadForm.reset();
        loadAllData(); // Recharge toutes les données
      } else {
        const errorData = await response.text();
        showMessage(
          `Erreur lors de l'ajout de l'équipe: ${errorData}`,
          "error",
          addSquadMessage
        );
      }
    } catch (error) {
      console.error(
        "Erreur réseau ou du serveur lors de l'ajout de squad:",
        error
      );
      showMessage("Erreur de connexion au serveur.", "error", addSquadMessage);
    }
  });

  // Gestion de la suppression de squad (délégation d'événement)
  squadList.addEventListener("click", async (event) => {
    const target = event.target;
    // Vérifie si le clic provient d'un bouton de suppression de squad
    if (
      target &&
      target instanceof HTMLElement &&
      target.classList.contains("delete-squad-btn")
    ) {
      const squadId = parseInt(target.dataset.id || "");
      if (isNaN(squadId)) {
        showMessage("ID d'équipe invalide.", "error", squadListMessage);
        return;
      }

      // Demande de confirmation avant suppression
      if (
        !confirm(
          `Êtes-vous sûr de vouloir supprimer cette équipe (ID: ${squadId}) ? Tous les membres et absences associés seront également supprimés.`
        )
      ) {
        return;
      }

      try {
        const response = await fetch(`/api/squads/${squadId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          showMessage(
            "Équipe supprimée avec succès !",
            "success",
            squadListMessage
          );
          loadAllData(); // Recharge toutes les données
        } else {
          const errorData = await response.text();
          showMessage(
            `Erreur lors de la suppression de l'équipe: ${errorData}`,
            "error",
            squadListMessage
          );
        }
      } catch (error) {
        console.error(
          "Erreur réseau ou du serveur lors de la suppression de squad:",
          error
        );
        showMessage(
          "Erreur de connexion au serveur.",
          "error",
          squadListMessage
        );
      }
    }
  });

  // Gestion du changement de sélection de squad pour la gestion des membres
  manageMembersSquadSelect.addEventListener("change", (event) => {
    const selectedSquadId = event.target.value;
    loadMembersForManagement(selectedSquadId); // Recharge la liste des membres pour la squad sélectionnée
  });

  // Formulaire d'ajout de membre
  addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const squadId = parseInt(manageMembersSquadSelect.value); // Squad sélectionnée
    const memberName = newMemberNameInput.value.trim();

    if (!squadId || !memberName) {
      showMessage(
        "Veuillez sélectionner une équipe et entrer un nom de membre.",
        "error",
        addMemberMessage
      );
      return;
    }

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad_id: squadId, name: memberName }),
      });

      if (response.ok) {
        showMessage("Membre ajouté avec succès !", "success", addMemberMessage);
        newMemberNameInput.value = ""; // Réinitialise le champ du nom du membre
        loadAllData(); // Recharge toutes les données
      } else {
        const errorData = await response.text();
        showMessage(
          `Erreur lors de l'ajout du membre: ${errorData}`,
          "error",
          addMemberMessage
        );
      }
    } catch (error) {
      console.error(
        "Erreur réseau ou du serveur lors de l'ajout de membre:",
        error
      );
      showMessage("Erreur de connexion au serveur.", "error", addMemberMessage);
    }
  });

  // Gestion de la suppression de membre (délégation d'événement)
  memberList.addEventListener("click", async (event) => {
    const target = event.target;
    // Vérifie si le clic provient d'un bouton de suppression de membre
    if (
      target &&
      target instanceof HTMLElement &&
      target.classList.contains("delete-member-btn")
    ) {
      const memberId = parseInt(target.dataset.id || "");
      if (isNaN(memberId)) {
        showMessage("ID de membre invalide.", "error", memberListMessage);
        return;
      }

      // Demande de confirmation avant suppression
      if (
        !confirm(
          `Êtes-vous sûr de vouloir supprimer ce membre (ID: ${memberId}) ? Toutes les absences associées seront également supprimées.`
        )
      ) {
        return;
      }

      try {
        const response = await fetch(`/api/members/${memberId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          showMessage(
            "Membre supprimé avec succès !",
            "success",
            memberListMessage
          );
          loadAllData(); // Recharge toutes les données
        } else {
          const errorData = await response.text();
          showMessage(
            `Erreur lors de la suppression du membre: ${errorData}`,
            "error",
            memberListMessage
          );
        }
      } catch (error) {
        console.error(
          "Erreur réseau ou du serveur lors de la suppression de membre:",
          error
        );
        showMessage(
          "Erreur de connexion au serveur.",
          "error",
          memberListMessage
        );
      }
    }
  });

  // --- Initialisation au Chargement de la Page ---
  // Charge toutes les données initiales au chargement complet du DOM
  loadAllData();
});
