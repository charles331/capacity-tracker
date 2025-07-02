// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  // Récupération des éléments du DOM pour le formulaire d'ajout d'absence
  const addAbsenceForm = document.getElementById("addAbsenceForm");
  const memberSelect = document.getElementById("memberSelect"); // Sélecteur de membre
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const formMessage = document.getElementById("formMessage"); // Message pour le formulaire d'absence

  // Récupération des éléments du DOM pour la modification d'absence
  const modifyAbsenceForm = document.getElementById("modifyAbsenceForm");
  const modifyAbsenceSelect = document.getElementById("modifyAbsenceSelect");
  const modifyStartDateInput = document.getElementById("modifyStartDate");
  const modifyEndDateInput = document.getElementById("modifyEndDate");
  const modifyAbsenceMessage = document.getElementById("modifyAbsenceMessage");

  // Récupération des éléments du DOM pour la gestion des squads
  const addSquadForm = document.getElementById("addSquadForm");
  const newSquadNameInput = document.getElementById("newSquadName");
  const addSquadMessage = document.getElementById("addSquadMessage"); // Message pour le formulaire d'ajout de squad
  const squadList = document.getElementById("squadList"); // Liste des squads existantes
  const squadListMessage = (document =
    document.getElementById("squadListMessage")); // Message pour la liste des squads

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

  // Récupération des éléments du DOM pour la modale de détails d'absence
  const absenceDetailsModal = document.getElementById("absenceDetailsModal");
  const closeButton = absenceDetailsModal.querySelector(".close-button");
  const modalSquadWeekTitle = document.getElementById("modalSquadWeekTitle");
  const modalWeekRange = document.getElementById("modalWeekRange"); // Nouveau: pour la plage de dates de la semaine
  const modalTeamMembers = document.getElementById("modalTeamMembers"); // Nouveau: pour le nombre de membres
  const modalAbsencePercentage = document.getElementById(
    "modalAbsencePercentage"
  ); // NOUVEAU: pour le pourcentage d'absence
  const modalAbsenceList = document.getElementById("modalAbsenceList");
  const modalNoAbsencesMessage = document.getElementById(
    "modalNoAbsencesMessage"
  );

  // Variables pour stocker les données récupérées de l'API
  let squads = [];
  let members = [];
  let allAbsences = []; // Contiendra les AbsenceWithDetails
  let capacityDataGlobal = []; // Stocke les données de capacité pour un accès facile

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
    }, 5000);
  }

  /**
   * Gère la bascule d'affichage/masquage des cartes.
   * @param {HTMLElement} header L'en-tête de la carte cliquée.
   */
  function toggleCard(header) {
    const targetId = header.dataset.target;
    const content = document.getElementById(targetId);
    const icon = header.querySelector(".toggle-icon");

    if (content && icon) {
      content.classList.toggle("hidden");
      const isExpanded = !content.classList.contains("hidden");
      header.setAttribute("aria-expanded", isExpanded.toString());

      if (isExpanded) {
        icon.textContent = "-";
      } else {
        icon.textContent = "+";
      }
    }
  }

  /**
   * Charge toutes les données nécessaires (squads, membres, absences, heatmap) et rafraîchit l'interface.
   * Cette fonction est appelée après chaque modification (ajout/suppression/modification).
   */
  async function loadAllData() {
    await loadSquads();
    await loadAllMembersForAbsenceForm();
    await loadAbsencesForModification();
    await loadMembersForManagement(manageMembersSquadSelect.value);
    generateHeatmap();
  }

  /**
   * Charge toutes les squads depuis l'API et met à jour les sélecteurs et la liste des squads.
   */
  async function loadSquads() {
    try {
      const response = await fetch("/api/squads");
      squads = await response.json();

      // Mise à jour du sélecteur de squad pour la gestion des membres
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
        if (manageMembersSquadSelect.value) {
          loadMembersForManagement(manageMembersSquadSelect.value);
        }
      }

      // Mise à jour de la liste de gestion des squads
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
      showMessage(
        "Erreur lors du chargement des équipes.",
        "error",
        modifyAbsenceMessage
      );
    }
  }

  /**
   * Charge tous les membres pour le sélecteur d'absence.
   */
  async function loadAllMembersForAbsenceForm() {
    memberSelect.innerHTML = "";
    memberSelect.disabled = true;

    try {
      const allSquads = await (await fetch("/api/squads")).json();
      members = [];

      if (allSquads.length === 0) {
        memberSelect.innerHTML =
          '<option value="">Ajoutez d\'abord des équipes et des membres</option>';
        return;
      }

      for (const squad of allSquads) {
        const response = await fetch(`/api/squads/${squad.id}/members`);
        const squadMembers = await response.json();
        squadMembers.forEach((member) => {
          members.push({ ...member, squadName: squad.name });
        });
      }

      if (members.length === 0) {
        memberSelect.innerHTML =
          '<option value="">Aucun membre disponible</option>';
      } else {
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
          option.textContent = `${member.name} (${member.squadName})`;
          memberSelect.appendChild(option);
        });
        memberSelect.disabled = false;
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
   * Charge toutes les absences pour le sélecteur de modification d'absence.
   */
  async function loadAbsencesForModification() {
    modifyAbsenceSelect.innerHTML = "";
    modifyAbsenceSelect.disabled = true;
    modifyStartDateInput.value = "";
    modifyEndDateInput.value = "";

    try {
      const response = await fetch("/api/absences/all");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      allAbsences = await response.json(); // Stocke toutes les absences avec détails

      if (allAbsences.length === 0) {
        modifyAbsenceSelect.innerHTML =
          '<option value="">Aucune absence à modifier</option>';
      } else {
        allAbsences.sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        allAbsences.forEach((abs) => {
          const option = document.createElement("option");
          option.value = abs.id;
          option.textContent = `${abs.member_name} (${abs.squad_name}) du ${abs.start_date} au ${abs.end_date}`;
          modifyAbsenceSelect.appendChild(option);
        });
        modifyAbsenceSelect.disabled = false;
        if (allAbsences.length > 0) {
          modifyStartDateInput.value = allAbsences[0].start_date;
          modifyEndDateInput.value = allAbsences[0].end_date;
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement des absences pour modification:",
        error
      );
      showMessage(
        `Erreur lors du chargement des absences à modifier: ${error.message}`,
        "error",
        modifyAbsenceMessage
      );
      modifyAbsenceSelect.innerHTML =
        '<option value="">Erreur de chargement</option>';
    }
  }

  /**
   * Charge les membres pour la section de gestion des membres d'une squad spécifique.
   * @param {string} squadId L'ID de la squad dont les membres doivent être chargés.
   */
  async function loadMembersForManagement(squadId) {
    memberList.innerHTML = "";
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
    heatmapContainer.innerHTML = "";
    loadingMessage.style.display = "block";

    try {
      const response = await fetch("/api/capacity");
      capacityDataGlobal = await response.json(); // Stocke les données globalement

      loadingMessage.style.display = "none";

      if (capacityDataGlobal.length === 0) {
        heatmapContainer.innerHTML =
          "<p>Aucune donnée de capacité à afficher. Ajoutez des absences ou des équipes/membres !</p>";
        return;
      }

      const weekIds = Array.from(
        new Set(capacityDataGlobal.map((d) => d.weekId))
      ).sort();
      const squadNames = Array.from(
        new Set(capacityDataGlobal.map((d) => d.squadName))
      ).sort();

      heatmapContainer.style.gridTemplateColumns = `auto repeat(${weekIds.length}, 1fr)`;

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

      squadNames.forEach((squadName) => {
        const rowHeader = document.createElement("div");
        rowHeader.className = "heatmap-row-header";
        rowHeader.textContent = squadName;
        heatmapContainer.appendChild(rowHeader);

        const currentSquad = squads.find((s) => s.name === squadName);
        const totalMembersInSquad = members.filter(
          (m) => m.squad_id === currentSquad?.id
        ).length;

        weekIds.forEach((weekId) => {
          const cellData = capacityDataGlobal.find(
            (d) => d.squadName === squadName && d.weekId === weekId
          );
          const cell = document.createElement("div");
          cell.className = "heatmap-cell";
          // Ajouter des data attributes pour récupérer les infos au clic
          cell.dataset.squadName = squadName;
          cell.dataset.weekId = weekId;

          if (cellData) {
            cell.textContent = `${cellData.percentageAbsence}%`;
            if (totalMembersInSquad === 0) {
              cell.classList.add("capacity-unknown");
            } else if (cellData.alert) {
              cell.classList.add("capacity-high");
            } else if (cellData.percentageAbsence > 25) {
              cell.classList.add("capacity-medium");
            } else {
              cell.classList.add("capacity-low");
            }
          } else {
            cell.textContent = "N/A";
            cell.classList.add("capacity-unknown");
          }
          heatmapContainer.appendChild(cell);
        });
      });

      // Ajouter les écouteurs d'événements aux cellules de la heatmap
      document.querySelectorAll(".heatmap-cell").forEach((cell) => {
        cell.addEventListener("click", (event) => {
          console.log("Heatmap cell clicked!"); // Log de débogage
          const clickedCell = event.currentTarget;
          const squadName = clickedCell.dataset.squadName;
          const weekId = clickedCell.dataset.weekId;
          console.log(`Clicked on: Squad - ${squadName}, Week - ${weekId}`); // Log des données cliquées
          showAbsenceDetails(squadName, weekId);
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

  /**
   * Affiche les détails des absences pour une squad et une semaine données dans une modale.
   * @param {string} squadName Le nom de la squad.
   * @param {string} weekId L'ID de la semaine (ex: "2025-W28").
   */
  function showAbsenceDetails(squadName, weekId) {
    console.log("showAbsenceDetails function called."); // Log de débogage
    modalSquadWeekTitle.textContent = `Absences pour ${squadName} - Semaine ${weekId}`;
    modalAbsenceList.innerHTML = ""; // Nettoyer la liste précédente
    modalNoAbsencesMessage.style.display = "none"; // Masquer le message "aucune absence"
    modalWeekRange.textContent = ""; // Réinitialiser la plage de dates
    modalTeamMembers.textContent = ""; // Réinitialiser le nombre de membres
    modalAbsencePercentage.textContent = ""; // NOUVEAU: Réinitialiser le pourcentage d'absence

    // Parser l'année et le numéro de semaine
    const [yearStr, weekNumStr] = weekId.split("-W");
    const weekYear = parseInt(yearStr);
    const weekNumber = parseInt(weekNumStr);

    // Créer l'objet DateTime pour le début de la semaine ISO
    const weekStart = luxon.DateTime.fromObject({
      weekYear: weekYear,
      weekNumber: weekNumber,
    });

    // Vérifier la validité de l'objet DateTime après parsing
    if (!weekStart.isValid) {
      console.error(
        "Invalid weekId format or Luxon parsing issue:",
        weekId,
        weekStart.errors
      );
      showMessage(
        "Erreur: Impossible de parser la semaine pour les détails.",
        "error",
        modifyAbsenceMessage
      );
      absenceDetailsModal.style.display = "flex";
      return;
    }

    // Calculer la fin de la semaine (6 jours après le début)
    const weekEnd = weekStart.plus({ days: 6 });

    // Afficher la plage de dates de la semaine
    modalWeekRange.textContent = `Du ${weekStart.toFormat(
      "dd/MM/yyyy"
    )} au ${weekEnd.toFormat("dd/MM/yyyy")}`;

    // Récupérer le nombre de membres dans la squad
    const currentSquad = squads.find((s) => s.name === squadName);
    const totalMembersInSquad = members.filter(
      (m) => m.squad_id === currentSquad?.id
    ).length;
    modalTeamMembers.textContent = `Membres dans l'équipe : ${totalMembersInSquad}`;

    // NOUVEAU: Récupérer et afficher le pourcentage d'absence
    const cellData = capacityDataGlobal.find(
      (d) => d.squadName === squadName && d.weekId === weekId
    );
    if (cellData) {
      modalAbsencePercentage.textContent = `Pourcentage d'absence : ${cellData.percentageAbsence}%`;
    } else {
      modalAbsencePercentage.textContent = `Pourcentage d'absence : N/A`;
    }

    const weekInterval = luxon.Interval.fromDateTimes(
      weekStart,
      weekEnd.plus({ days: 1 })
    ); // Inclure le dernier jour

    // Filtrer les absences qui appartiennent à cette squad ET chevauchent cette semaine
    const relevantAbsences = allAbsences.filter((abs) => {
      const absSquad = squads.find((s) => s.id === abs.squad_id);
      if (!absSquad || absSquad.name !== squadName) {
        return false;
      }
      const absStart = luxon.DateTime.fromISO(abs.start_date);
      const absEnd = luxon.DateTime.fromISO(abs.end_date);
      // Inclure le jour de fin dans l'intervalle d'absence pour un chevauchement correct
      const absenceInterval = luxon.Interval.fromDateTimes(
        absStart,
        absEnd.plus({ days: 1 })
      );
      return weekInterval.overlaps(absenceInterval);
    });

    if (relevantAbsences.length === 0) {
      modalNoAbsencesMessage.style.display = "block";
    } else {
      relevantAbsences.forEach((abs) => {
        const li = document.createElement("li");
        li.innerHTML = `
                    <strong>${abs.member_name}</strong>: du ${abs.start_date} au ${abs.end_date}
                `;
        modalAbsenceList.appendChild(li);
      });
    }

    absenceDetailsModal.style.display = "flex"; // Afficher la modale (avec flex pour centrage)
  }

  // --- Gestionnaires d'Événements ---

  // Gestionnaires de bascule pour toutes les cartes
  document.querySelectorAll(".card-header").forEach((header) => {
    header.addEventListener("click", () => toggleCard(header));
  });

  // Formulaire d'ajout d'absence
  addAbsenceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const memberId = parseInt(memberSelect.value);
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

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
        addAbsenceForm.reset();
        loadAllData();
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

  // Gestion du changement de sélection dans le formulaire de modification d'absence
  modifyAbsenceSelect.addEventListener("change", (event) => {
    const selectedAbsenceId = parseInt(event.target.value);
    const selectedAbsence = allAbsences.find(
      (abs) => abs.id === selectedAbsenceId
    );
    if (selectedAbsence) {
      modifyStartDateInput.value = selectedAbsence.start_date;
      modifyEndDateInput.value = selectedAbsence.end_date;
    }
  });

  // Formulaire de modification d'absence
  modifyAbsenceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const absenceId = parseInt(modifyAbsenceSelect.value);
    const startDate = modifyStartDateInput.value;
    const endDate = modifyEndDateInput.value;

    if (!absenceId || !startDate || !endDate) {
      showMessage(
        "Veuillez sélectionner une absence et entrer des dates.",
        "error",
        modifyAbsenceMessage
      );
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showMessage(
        "La nouvelle date de fin ne peut pas être antérieure à la nouvelle date de début.",
        "error",
        modifyAbsenceMessage
      );
      return;
    }

    try {
      const response = await fetch(`/api/absences/${absenceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (response.ok) {
        showMessage(
          "Absence modifiée avec succès !",
          "success",
          modifyAbsenceMessage
        );
        loadAllData();
      } else {
        const errorData = await response.text();
        showMessage(
          `Erreur lors de la modification de l'absence: ${errorData}`,
          "error",
          modifyAbsenceMessage
        );
      }
    } catch (error) {
      console.error(
        "Erreur réseau ou du serveur lors de la modification d'absence:",
        error
      );
      showMessage(
        "Erreur de connexion au serveur.",
        "error",
        modifyAbsenceMessage
      );
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
        loadAllData();
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
          loadAllData();
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
    loadMembersForManagement(selectedSquadId);
  });

  // Formulaire d'ajout de membre
  addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const squadId = parseInt(manageMembersSquadSelect.value);
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
        newMemberNameInput.value = "";
        loadAllData();
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
          loadAllData();
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

  // --- Gestion de la modale ---
  closeButton.addEventListener("click", () => {
    absenceDetailsModal.style.display = "none";
  });

  // Fermer la modale si l'utilisateur clique en dehors du contenu
  window.addEventListener("click", (event) => {
    if (event.target === absenceDetailsModal) {
      absenceDetailsModal.style.display = "none";
    }
  });

  // --- Initialisation au Chargement de la Page ---
  loadAllData();
});
