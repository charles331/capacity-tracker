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
  getAbsenceByIdWithDetails,
  updateAbsence,
} from "./database";
import { calculateWeeklyCapacity } from "./capacityCalculator";
import { Absence, Squad, Member } from "./types";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

initDb();

// --- Routes API pour la gestion des Absences ---

/**
 * Route POST pour ajouter une nouvelle absence.
 * Le corps de la requête doit contenir l'ID du membre, la date de début et la date de fin.
 */
app.post("/api/absences", async (req: Request, res: Response) => {
  try {
    const { member_id, start_date, end_date } = req.body;
    if (!member_id || !start_date || !end_date) {
      return res
        .status(400)
        .send("Missing required fields: member_id, start_date, end_date.");
    }
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

/**
 * NOUVELLE ROUTE (déplacée) : Route GET pour obtenir toutes les absences avec les détails complets.
 * Cette route doit être définie AVANT les routes avec des paramètres dynamiques comme /:id.
 */
app.get("/api/absences/all", (req: Request, res: Response) => {
  try {
    const absences = getAllAbsencesWithDetails();
    res.json(absences);
  } catch (error: any) {
    console.error("Error fetching all absences with details:", error);
    res.status(500).send(`Error fetching all absences: ${error.message}`);
  }
});

/**
 * Route PUT pour modifier une absence existante.
 * Le corps de la requête doit contenir les nouvelles dates de début et de fin.
 */
app.put("/api/absences/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { start_date, end_date } = req.body;

    if (isNaN(id) || !start_date || !end_date) {
      return res.status(400).send("Invalid absence ID or missing date fields.");
    }

    const changes = updateAbsence(id, start_date, end_date);
    if (changes === 0) {
      return res.status(404).send("Absence not found or no changes made.");
    }
    res.status(200).json({ message: "Absence updated successfully." });
  } catch (error: any) {
    console.error("Error updating absence:", error);
    res.status(500).send(`Error updating absence: ${error.message}`);
  }
});

/**
 * Route GET pour obtenir une absence spécifique avec les détails du membre et de la squad.
 * (Doit être après /api/absences/all)
 */
app.get("/api/absences/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid absence ID.");
    }
    const absence = getAbsenceByIdWithDetails(id);
    if (!absence) {
      return res.status(404).send("Absence not found.");
    }
    res.json(absence);
  } catch (error: any) {
    console.error("Error fetching absence by ID:", error);
    res.status(500).send(`Error fetching absence: ${error.message}`);
  }
});

// --- Routes API pour la gestion de la Capacité ---

app.get("/api/capacity", (req: Request, res: Response) => {
  try {
    const squads = getAllSquads();
    const allMembers: Member[] = [];
    squads.forEach((squad) => {
      const membersInSquad = getMembersBySquad(squad.id);
      allMembers.push(...membersInSquad);
    });

    const absences = getAllAbsencesWithDetails();
    const capacity = calculateWeeklyCapacity(squads, allMembers, absences);
    res.json(capacity);
  } catch (error: any) {
    console.error("Error calculating capacity:", error);
    res.status(500).send(`Error calculating capacity: ${error.message}`);
  }
});

// --- Routes API pour la gestion des Squads ---

app.get("/api/squads", (req: Request, res: Response) => {
  try {
    const squads = getAllSquads();
    res.json(squads);
  } catch (error: any) {
    console.error("Error fetching squads:", error);
    res.status(500).send(`Error fetching squads: ${error.message}`);
  }
});

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
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(409).send("Squad with this name already exists.");
    }
    res.status(500).send(`Error adding squad: ${error.message}`);
  }
});

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
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting squad:", error);
    res.status(500).send(`Error deleting squad: ${error.message}`);
  }
});

// --- Routes API pour la gestion des Membres ---

app.post("/api/members", (req: Request, res: Response) => {
  try {
    const { squad_id, name } = req.body;
    if (!squad_id || !name) {
      return res.status(400).send("Missing squad ID or member name.");
    }
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
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting member:", error);
    res.status(500).send(`Error deleting member: ${error.message}`);
  }
});

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
