// src/server.ts
import express, { Request, Response } from "express";
import path from "path";
import { initDb, getAllSquads, addAbsence, getAllAbsences } from "./database";
import { calculateWeeklyCapacity } from "./capacityCalculator";
import { Absence } from "./types";

const app = express();
const PORT = 3000;

app.use(express.json()); // Middleware pour parser le JSON dans les requêtes

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "../public")));

// Initialise la base de données au démarrage du serveur
initDb();

// Routes API

// Route pour ajouter une absence
app.post("/api/absences", (req, res) => {
  try {
    const newAbsence: Absence = req.body;
    // Basic validation
    if (
      !newAbsence.squad_id ||
      !newAbsence.member_name ||
      !newAbsence.start_date ||
      !newAbsence.end_date
    ) {
      return res.status(400).send("Missing required fields.");
    }
    const id = addAbsence(newAbsence);
    res.status(201).json({ id, message: "Absence added successfully." });
  } catch (error: any) {
    res.status(500).send(`Error adding absence: ${error.message}`);
  }
});

// Route pour obtenir la capacité hebdomadaire
app.get("/api/capacity", (req, res) => {
  try {
    const squads = getAllSquads();
    const absences = getAllAbsences();
    const capacity = calculateWeeklyCapacity(squads, absences);
    res.json(capacity);
  } catch (error: any) {
    res.status(500).send(`Error calculating capacity: ${error.message}`);
  }
});

// Route pour obtenir les squads (utile pour le formulaire)
app.get("/api/squads", (req, res) => {
  try {
    const squads = getAllSquads();
    res.json(squads);
  } catch (error: any) {
    res.status(500).send(`Error fetching squads: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
