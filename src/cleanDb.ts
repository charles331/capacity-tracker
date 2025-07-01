// src/cleanDb.ts
import fs from "fs";
import path from "path";

// Chemin vers le fichier de base de données
const dbPath = path.resolve(__dirname, "../data/capacity.db");

console.log(`Attempting to clean database file: ${dbPath}`);

try {
  // Vérifie si le fichier existe avant de tenter de le supprimer
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath); // Supprime le fichier de manière synchrone
    console.log("Existing database file removed successfully.");
  } else {
    console.log("No existing database file found to remove.");
  }
} catch (error: any) {
  console.error(`Error removing database file: ${error.message}`);
  // En cas d'erreur (ex: permissions), le processus s'arrêtera ici.
  // Vous pouvez choisir de continuer ou de sortir selon la criticité.
  process.exit(1); // Quitte avec un code d'erreur
}
