// src/database.ts
import Database from "better-sqlite3";
import path from "path";
import { Squad, Absence } from "./types";

const dbPath = path.resolve(__dirname, "../data/capacity.db");
const db = new Database(dbPath);

console.log(`Database connected at ${dbPath}`);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      member_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_id INTEGER NOT NULL,
      member_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (squad_id) REFERENCES squads(id)
    );
  `);

  // Insert some sample squads if they don't exist
  const existingSquads = db.prepare("SELECT COUNT(*) FROM squads").get() as {
    "COUNT(*)": number;
  };
  if (existingSquads["COUNT(*)"] === 0) {
    db.prepare("INSERT INTO squads (name, member_count) VALUES (?, ?)").run(
      "Alpha",
      5
    );
    db.prepare("INSERT INTO squads (name, member_count) VALUES (?, ?)").run(
      "Beta",
      6
    );
    db.prepare("INSERT INTO squads (name, member_count) VALUES (?, ?)").run(
      "Gamma",
      4
    );
    console.log("Sample squads inserted.");
  }

  console.log("Database initialized.");
}

export function getAllSquads(): Squad[] {
  return db.prepare("SELECT * FROM squads").all() as Squad[];
}

export function addAbsence(absence: Absence) {
  const info = db
    .prepare(
      "INSERT INTO absences (squad_id, member_name, start_date, end_date) VALUES (?, ?, ?, ?)"
    )
    .run(
      absence.squad_id,
      absence.member_name,
      absence.start_date,
      absence.end_date
    );
  return info.lastInsertRowid;
}

export function getAllAbsences(): Absence[] {
  return db.prepare("SELECT * FROM absences").all() as Absence[];
}

export function getAbsencesBySquadId(squadId: number): Absence[] {
  return db
    .prepare("SELECT * FROM absences WHERE squad_id = ?")
    .all(squadId) as Absence[];
}
