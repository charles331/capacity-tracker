// src/database.ts
import Database from "better-sqlite3";
import path from "path";
import { Squad, Member, Absence, AbsenceWithDetails } from "./types";

// Chemin vers le fichier de base de données SQLite
const dbPath = path.resolve(__dirname, "../data/capacity.db");
// Initialisation de la connexion à la base de données
const db = new Database(dbPath);

console.log(`Database connected at ${dbPath}`);

/**
 * Initialise la base de données en créant les tables si elles n'existent pas.
 * Insère également des données d'exemple (squads et membres) si la DB est vide.
 */
export function initDb() {
  // Active les clés étrangères pour assurer l'intégrité référentielle
  db.exec(`PRAGMA foreign_keys = ON;`);

  // Création de la table 'squads'
  db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Création de la table 'members'
  // ON DELETE CASCADE: si une squad est supprimée, tous ses membres sont aussi supprimés
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE
    );
  `);

  // Création de la table 'absences'
  // ON DELETE CASCADE: si un membre est supprimé, toutes ses absences sont aussi supprimées
  db.exec(`
    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  // Insertion de données d'exemple si aucune squad n'existe
  const existingSquads = db.prepare("SELECT COUNT(*) FROM squads").get() as {
    "COUNT(*)": number;
  };
  if (existingSquads["COUNT(*)"] === 0) {
    console.log("Inserting sample squads and members...");
    // Insertion des squads
    const alphaId = db
      .prepare("INSERT INTO squads (name) VALUES (?)")
      .run("Alpha").lastInsertRowid as number;
    const betaId = db
      .prepare("INSERT INTO squads (name) VALUES (?)")
      .run("Beta").lastInsertRowid as number;
    const gammaId = db
      .prepare("INSERT INTO squads (name) VALUES (?)")
      .run("Gamma").lastInsertRowid as number;

    // Insertion des membres pour la squad Alpha
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      alphaId,
      "Jean Dupont"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      alphaId,
      "Marie Curie"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      alphaId,
      "Pierre Martin"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      alphaId,
      "Sophie Dubois"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      alphaId,
      "Lucas Bernard"
    );

    // Insertion des membres pour la squad Beta
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      betaId,
      "Alice Durand"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      betaId,
      "Bob Lambert"
    );
    db.prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)").run(
      betaId,
      "Carole Petit"
    );

    console.log("Sample data (squads and members) inserted.");
  }

  console.log("Database initialized.");
}

/**
 * Récupère toutes les squads de la base de données.
 * @returns Un tableau d'objets Squad.
 */
export function getAllSquads(): Squad[] {
  return db.prepare("SELECT * FROM squads").all() as Squad[];
}

/**
 * Ajoute une nouvelle squad à la base de données.
 * @param name Le nom de la squad.
 * @returns L'ID de la nouvelle squad insérée.
 */
export function addSquad(name: string): number {
  const info = db.prepare("INSERT INTO squads (name) VALUES (?)").run(name);
  return info.lastInsertRowid as number;
}

/**
 * Supprime une squad de la base de données par son ID.
 * Les membres et absences associés seront supprimés en cascade grâce à PRAGMA foreign_keys = ON;
 * @param id L'ID de la squad à supprimer.
 * @returns Le nombre de lignes supprimées.
 */
export function deleteSquad(id: number): number {
  const info = db.prepare("DELETE FROM squads WHERE id = ?").run(id);
  return info.changes;
}

/**
 * Ajoute un nouveau membre à une squad spécifique.
 * @param squad_id L'ID de la squad à laquelle le membre appartient.
 * @param name Le nom du membre.
 * @returns L'ID du nouveau membre inséré.
 */
export function addMember(squad_id: number, name: string): number {
  const info = db
    .prepare("INSERT INTO members (squad_id, name) VALUES (?, ?)")
    .run(squad_id, name);
  return info.lastInsertRowid as number;
}

/**
 * Supprime un membre de la base de données par son ID.
 * Les absences associées à ce membre seront supprimées en cascade.
 * @param id L'ID du membre à supprimer.
 * @returns Le nombre de lignes supprimées.
 */
export function deleteMember(id: number): number {
  const info = db.prepare("DELETE FROM members WHERE id = ?").run(id);
  return info.changes;
}

/**
 * Récupère tous les membres appartenant à une squad spécifique.
 * @param squadId L'ID de la squad.
 * @returns Un tableau d'objets Member.
 */
export function getMembersBySquad(squadId: number): Member[] {
  return db
    .prepare("SELECT * FROM members WHERE squad_id = ?")
    .all(squadId) as Member[];
}

/**
 * Récupère un membre de la base de données par son ID.
 * @param memberId L'ID du membre.
 * @returns L'objet Member ou undefined si non trouvé.
 */
export function getMemberById(memberId: number): Member | undefined {
  return db.prepare("SELECT * FROM members WHERE id = ?").get(memberId) as
    | Member
    | undefined;
}

/**
 * Ajoute une nouvelle absence à la base de données.
 * @param absence L'objet absence (sans l'ID, car il est auto-généré).
 * @returns L'ID de la nouvelle absence insérée.
 */
export function addAbsence(absence: Omit<Absence, "id">) {
  const info = db
    .prepare(
      "INSERT INTO absences (member_id, start_date, end_date) VALUES (?, ?, ?)"
    )
    .run(absence.member_id, absence.start_date, absence.end_date);
  return info.lastInsertRowid;
}

/**
 * Récupère toutes les absences avec les détails des membres et des squads associés.
 * Effectue des jointures pour enrichir les données d'absence.
 * @returns Un tableau d'objets AbsenceWithDetails.
 */
export function getAllAbsencesWithDetails(): AbsenceWithDetails[] {
  return db
    .prepare(
      `
    SELECT
      a.id,
      a.member_id,
      a.start_date,
      a.end_date,
      m.name AS member_name,
      s.id AS squad_id,
      s.name AS squad_name
    FROM absences a
    JOIN members m ON a.member_id = m.id
    JOIN squads s ON m.squad_id = s.id
  `
    )
    .all() as AbsenceWithDetails[];
}
