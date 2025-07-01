// src/types.ts

/**
 * Interface pour une équipe (squad).
 * Le nombre de membres est maintenant déterminé par les membres réels associés.
 */
export interface Squad {
  id: number;
  name: string;
}

/**
 * Interface pour un membre d'équipe.
 * Chaque membre est associé à une squad.
 */
export interface Member {
  id?: number; // L'ID est optionnel car il est auto-généré par la DB lors de l'ajout
  squad_id: number; // Clé étrangère vers l'ID de la squad
  name: string;
}

/**
 * Interface pour une absence.
 * Une absence est maintenant liée à un membre spécifique.
 */
export interface Absence {
  id?: number; // L'ID est optionnel car il est auto-généré par la DB lors de l'ajout
  member_id: number; // Clé étrangère vers l'ID du membre
  start_date: string; // Date de début de l'absence au format YYYY-MM-DD
  end_date: string; // Date de fin de l'absence au format YYYY-MM-DD
}

/**
 * Interface pour une absence avec des détails supplémentaires (nom du membre, nom de la squad).
 * Utilisée pour les jointures lors de la récupération des absences pour le calcul de capacité.
 */
export interface AbsenceWithDetails {
  id: number;
  member_id: number;
  member_name: string; // Nom du membre pour affichage
  squad_id: number; // ID de la squad du membre
  squad_name: string; // Nom de la squad pour affichage
  start_date: string;
  end_date: string;
}

/**
 * Interface pour le rapport de capacité hebdomadaire.
 * Contient le pourcentage d'absence pour une squad durant une semaine donnée.
 */
export interface WeekCapacity {
  squadName: string;
  weekId: string; // ID de la semaine au format ISO (ex: "2025-W28")
  percentageAbsence: number; // Pourcentage d'absence pour cette semaine et cette squad
  alert: boolean; // Indique si le pourcentage d'absence dépasse le seuil d'alerte
}
