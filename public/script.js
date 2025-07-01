// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const addAbsenceForm = document.getElementById("addAbsenceForm");
  const squadSelect = document.getElementById("squadSelect");
  const memberNameInput = document.getElementById("memberName");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const formMessage = document.getElementById("formMessage");
  const heatmapContainer = document.getElementById("heatmap-container");
  const loadingMessage = document.getElementById("loadingMessage");

  let squads = []; // Pour stocker les squads récupérées de l'API

  // --- Fonctions Utilitaires ---
  function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `message ${type}`;
    setTimeout(() => {
      formMessage.textContent = "";
      formMessage.className = "message";
    }, 5000); // Message disparaît après 5 secondes
  }

  // --- Remplir le Select des Squads ---
  async function loadSquads() {
    try {
      const response = await fetch("/api/squads");
      squads = await response.json();
      squadSelect.innerHTML = ""; // Vide les options existantes
      squads.forEach((squad) => {
        const option = document.createElement("option");
        option.value = squad.id;
        option.textContent = squad.name;
        squadSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Erreur lors du chargement des squads:", error);
      showMessage("Erreur lors du chargement des équipes.", "error");
    }
  }

  // --- Générer la Heatmap ---
  async function generateHeatmap() {
    heatmapContainer.innerHTML = ""; // Nettoyer le contenu précédent
    loadingMessage.style.display = "block"; // Afficher le message de chargement

    try {
      const response = await fetch("/api/capacity");
      const capacityData = await response.json();

      loadingMessage.style.display = "none"; // Cacher le message de chargement

      if (capacityData.length === 0) {
        heatmapContainer.innerHTML =
          "<p>Aucune donnée de capacité à afficher. Ajoutez des absences !</p>";
        return;
      }

      // Extraire les semaines uniques et les noms de squads
      const weekIds = Array.from(
        new Set(capacityData.map((d) => d.weekId))
      ).sort();
      const squadNames = Array.from(
        new Set(capacityData.map((d) => d.squadName))
      ).sort();

      // Créer la grille CSS pour la heatmap
      // +1 pour les en-têtes de colonnes (Squads)
      heatmapContainer.style.gridTemplateColumns = `auto repeat(${weekIds.length}, 1fr)`;

      // --- En-têtes de la Heatmap (Semaines) ---
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

      // --- Lignes de la Heatmap (Squads) ---
      squadNames.forEach((squadName) => {
        const rowHeader = document.createElement("div");
        rowHeader.className = "heatmap-row-header";
        rowHeader.textContent = squadName;
        heatmapContainer.appendChild(rowHeader);

        weekIds.forEach((weekId) => {
          const cellData = capacityData.find(
            (d) => d.squadName === squadName && d.weekId === weekId
          );
          const cell = document.createElement("div");
          cell.className = "heatmap-cell";

          if (cellData) {
            cell.textContent = `${cellData.percentageAbsence}%`;
            if (
              squads.find((s) => s.name === squadName && s.member_count === 0)
            ) {
              // Si l'équipe a 0 membre, pas d'alerte pertinente
              cell.classList.add("capacity-unknown");
            } else if (cellData.alert) {
              cell.classList.add("capacity-high"); // Rouge
            } else if (cellData.percentageAbsence > 25) {
              // Ajout d'un seuil jaune
              cell.classList.add("capacity-medium"); // Jaune
            } else {
              cell.classList.add("capacity-low"); // Vert
            }
          } else {
            cell.textContent = "N/A"; // Ou 0% si pas de données
            cell.classList.add("capacity-unknown");
          }
          heatmapContainer.appendChild(cell);
        });
      });
    } catch (error) {
      console.error("Erreur lors du chargement de la capacité:", error);
      showMessage(
        "Erreur lors du chargement de la capacité des équipes.",
        "error"
      );
      loadingMessage.style.display = "none";
      heatmapContainer.innerHTML =
        "<p>Impossible de charger les données de capacité. Le serveur est-il démarré ?</p>";
    }
  }

  // --- Gestion du Formulaire d'Absence ---
  addAbsenceForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Empêche le rechargement de la page

    const squadId = parseInt(squadSelect.value);
    const memberName = memberNameInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!squadId || !memberName || !startDate || !endDate) {
      showMessage("Veuillez remplir tous les champs.", "error");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showMessage(
        "La date de fin ne peut pas être antérieure à la date de début.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch("/api/absences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          squad_id: squadId,
          member_name: memberName,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (response.ok) {
        showMessage("Absence ajoutée avec succès !", "success");
        addAbsenceForm.reset(); // Réinitialise le formulaire
        generateHeatmap(); // Recharge la heatmap
      } else {
        const errorData = await response.text();
        showMessage(
          `Erreur lors de l'ajout de l'absence: ${errorData}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Erreur réseau ou du serveur:", error);
      showMessage("Erreur de connexion au serveur.", "error");
    }
  });

  // --- Initialisation au Chargement de la Page ---
  loadSquads();
  generateHeatmap();
});
