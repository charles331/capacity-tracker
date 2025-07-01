// src/capacityCalculator.ts
import { DateTime } from "luxon";
import { Squad, Member, AbsenceWithDetails, WeekCapacity } from "./types";

const ABSENCE_THRESHOLD_PERCENT = 50; // Seuil d'alerte pour le pourcentage d'absence

/**
 * Calcule la capacité hebdomadaire des équipes en fonction des absences des membres.
 * @param squads Un tableau de toutes les squads.
 * @param members Un tableau de tous les membres.
 * @param absences Un tableau de toutes les absences (avec détails du membre/squad).
 * @param numWeeksAhead Le nombre de semaines à calculer à l'avance (par défaut 26, soit 6 mois).
 * @returns Un tableau d'objets WeekCapacity, indiquant le pourcentage d'absence par squad et par semaine.
 */
export function calculateWeeklyCapacity(
  squads: Squad[],
  members: Member[],
  absences: AbsenceWithDetails[],
  numWeeksAhead: number = 26
): WeekCapacity[] {
  const capacityReport: WeekCapacity[] = [];
  const today = DateTime.local(); // Date actuelle

  // Créer une map pour un accès rapide aux membres par squad_id
  const membersBySquad = new Map<number, Member[]>();
  members.forEach((member) => {
    if (!membersBySquad.has(member.squad_id)) {
      membersBySquad.set(member.squad_id, []);
    }
    membersBySquad.get(member.squad_id)?.push(member);
  });

  // Itérer sur chaque semaine pour la période définie
  for (let i = 0; i < numWeeksAhead; i++) {
    const currentWeekStart = today.plus({ weeks: i }).startOf("week"); // Début de la semaine (lundi)
    const currentWeekEnd = currentWeekStart.endOf("week"); // Fin de la semaine (dimanche)
    const weekId = currentWeekStart.toFormat("yyyy-W"); // Format de l'ID de semaine (ex: "2025-W28")

    // Pour chaque squad, calculer son pourcentage d'absence pour la semaine courante
    for (const squad of squads) {
      const squadMembers = membersBySquad.get(squad.id) || [];
      const totalSquadMembers = squadMembers.length;
      // Utilise un Set pour stocker les IDs des membres absents afin d'assurer l'unicité
      let membersAbsentThisWeek = new Set<number>();

      // Si la squad n'a pas de membres, son pourcentage d'absence est 0
      if (totalSquadMembers === 0) {
        capacityReport.push({
          squadName: squad.name,
          weekId: weekId,
          percentageAbsence: 0,
          alert: false,
        });
        continue; // Passe à la squad suivante
      }

      // Filtrer les absences qui appartiennent à la squad courante
      const squadAbsences = absences.filter((abs) => abs.squad_id === squad.id);

      // Vérifier chaque absence pour voir si elle chevauche la semaine courante
      for (const abs of squadAbsences) {
        const absStart = DateTime.fromISO(abs.start_date);
        const absEnd = DateTime.fromISO(abs.end_date);

        // Déterminer le chevauchement entre la période d'absence et la semaine
        const overlapStart =
          absStart > currentWeekStart ? absStart : currentWeekStart;
        const overlapEnd = absEnd < currentWeekEnd ? absEnd : currentWeekEnd;

        // Si il y a un chevauchement (overlapStart <= overlapEnd), le membre est absent cette semaine
        if (overlapStart <= overlapEnd) {
          membersAbsentThisWeek.add(abs.member_id); // Ajoute l'ID du membre au set
        }
      }

      // Calculer le pourcentage d'absence
      const percentageAbsence =
        (membersAbsentThisWeek.size / totalSquadMembers) * 100;

      // Ajouter le rapport de capacité pour cette squad et cette semaine
      capacityReport.push({
        squadName: squad.name,
        weekId: weekId,
        percentageAbsence: parseFloat(percentageAbsence.toFixed(1)), // Arrondi à 1 décimale
        alert: percentageAbsence > ABSENCE_THRESHOLD_PERCENT, // Vérifie si le seuil est dépassé
      });
    }
  }

  return capacityReport;
}
