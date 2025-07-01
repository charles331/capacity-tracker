// src/server.ts
import express, { Request, Response } from "express";
import path from "path";
import {
  initDb,
  getAllSquads,
  addAbsence,
  getAllAbsencesWithDetails,
  addSquad,
  deleteSquad,
  addMember,
  deleteMember,
  getMembersBySquad,
  getMemberById,
} from "./database";
import { calculateWeeklyCapacity } from "./capacityCalculator";
import { Absence, Squad, Member } from "./types"; // Import des types nécessaires

const app = express();
const PORT = 3000; // Port sur lequel le serveur écoutera

// Middleware pour parser les corps de requête JSON
app.use(express.json());

// Servir les fichiers statiques du frontend (HTML, CSS, JS) depuis le dossier 'public'
app.use(express.static(path.join(__dirname, "../public")));

// Initialise la base de données au démarrage du serveur
initDb();

// --- Routes API pour la gestion des Absences ---

/**
 * Route POST pour ajouter une nouvelle absence.
 * Le corps de la requête doit contenir l'ID du membre, la date de début et la date de fin.
 */
app.post("/api/absences", async (req: Request, res: Response) => {
  try {
    const { member_id, start_date, end_date } = req.body;

    // Validation des champs requis
    if (!member_id || !start_date || !end_date) {
      return res
        .status(400)
        .send("Missing required fields: member_id, start_date, end_date.");
    }

    // Vérifier si le membre existe avant d'ajouter l'absence
    const member = getMemberById(member_id);
    if (!member) {
      return res.status(404).send("Member not found.");
    }

    const newAbsence: Omit<Absence, "id"> = { member_id, start_date, end_date };
    const id = addAbsence(newAbsence);
    res.status(201).json({ id, message: "Absence added successfully." });
  } catch (error: any) {
    console.error("Error adding absence:", error);
    res.status(500).send(`Error adding absence: ${error.message}`);
  }
});

// --- Routes API pour la gestion de la Capacité ---

/**
 * Route GET pour obtenir le rapport de capacité hebdomadaire.
 * Calcule le pourcentage d'absence pour chaque squad semaine par semaine.
 */
app.get("/api/capacity", (req: Request, res: Response) => {
  try {
    const squads = getAllSquads(); // Récupère toutes les squads

    // Récupère tous les membres pour le calcul de capacité
    const allMembers: Member[] = [];
    squads.forEach((squad) => {
      const membersInSquad = getMembersBySquad(squad.id);
      allMembers.push(...membersInSquad);
    });

    const absences = getAllAbsencesWithDetails(); // Récupère toutes les absences avec les détails nécessaires

    // Calcule la capacité en passant les squads, tous les membres et les absences
    const capacity = calculateWeeklyCapacity(squads, allMembers, absences);
    res.json(capacity);
  } catch (error: any) {
    console.error("Error calculating capacity:", error);
    res.status(500).send(`Error calculating capacity: ${error.message}`);
  }
});

// --- Routes API pour la gestion des Squads ---

/**
 * Route GET pour obtenir toutes les squads.
 */
app.get("/api/squads", (req: Request, res: Response) => {
  try {
    const squads = getAllSquads();
    res.json(squads);
  } catch (error: any) {
    console.error("Error fetching squads:", error);
    res.status(500).send(`Error fetching squads: ${error.message}`);
  }
});

/**
 * Route POST pour ajouter une nouvelle squad.
 * Le corps de la requête doit contenir le nom de la squad.
 */
app.post("/api/squads", (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).send("Missing squad name.");
    }
    const id = addSquad(name);
    res.status(201).json({ id, name, message: "Squad added successfully." });
  } catch (error: any) {
    console.error("Error adding squad:", error);
    // Gérer l'erreur de contrainte UNIQUE (nom de squad déjà existant)
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(409).send("Squad with this name already exists.");
    }
    res.status(500).send(`Error adding squad: ${error.message}`);
  }
});

/**
 * Route DELETE pour supprimer une squad par son ID.
 * La suppression en cascade des membres et absences est gérée par la base de données.
 */
app.delete("/api/squads/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid squad ID.");
    }
    const changes = deleteSquad(id);
    if (changes === 0) {
      return res.status(404).send("Squad not found.");
    }
    res.status(204).send(); // 204 No Content pour une suppression réussie
  } catch (error: any) {
    console.error("Error deleting squad:", error);
    res.status(500).send(`Error deleting squad: ${error.message}`);
  }
});

// --- Routes API pour la gestion des Membres ---

/**
 * Route POST pour ajouter un nouveau membre à une squad.
 * Le corps de la requête doit contenir l'ID de la squad et le nom du membre.
 */
app.post("/api/members", (req: Request, res: Response) => {
  try {
    const { squad_id, name } = req.body;
    if (!squad_id || !name) {
      return res.status(400).send("Missing squad ID or member name.");
    }
    // Vérifier si la squad existe avant d'ajouter le membre
    const squadExists = getAllSquads().some((s) => s.id === squad_id);
    if (!squadExists) {
      return res.status(404).send("Squad not found.");
    }

    const id = addMember(squad_id, name);
    res
      .status(201)
      .json({ id, squad_id, name, message: "Member added successfully." });
  } catch (error: any) {
    console.error("Error adding member:", error);
    res.status(500).send(`Error adding member: ${error.message}`);
  }
});

/**
 * Route DELETE pour supprimer un membre par son ID.
 * La suppression en cascade des absences est gérée par la base de données.
 */
app.delete("/api/members/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid member ID.");
    }
    const changes = deleteMember(id);
    if (changes === 0) {
      return res.status(404).send("Member not found.");
    }
    res.status(204).send(); // 204 No Content pour une suppression réussie
  } catch (error: any) {
    console.error("Error deleting member:", error);
    res.status(500).send(`Error deleting member: ${error.message}`);
  }
});

/**
 * Route GET pour obtenir tous les membres d'une squad spécifique.
 */
app.get("/api/squads/:squadId/members", (req: Request, res: Response) => {
  try {
    const squadId = parseInt(req.params.squadId);
    if (isNaN(squadId)) {
      return res.status(400).send("Invalid squad ID.");
    }
    const members = getMembersBySquad(squadId);
    res.json(members);
  } catch (error: any) {
    console.error("Error fetching members by squad:", error);
    res.status(500).send(`Error fetching members: ${error.message}`);
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
