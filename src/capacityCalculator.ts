// src/capacityCalculator.ts
import { DateTime, Interval } from "luxon";
import { Squad, Member, AbsenceWithDetails, WeekCapacity } from "./types";

const ABSENCE_THRESHOLD_PERCENT = 50; // Seuil d'alerte pour le pourcentage d'absence
const WORK_DAYS_PER_WEEK = 5; // Nombre de jours ouvrables par semaine (Lundi-Vendredi)

/**
 * Calcule la capacité hebdomadaire des équipes en fonction des absences des membres.
 * Le calcul est basé sur les "jours-personne" d'absence par rapport aux "jours-personne" ouvrables disponibles.
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

    // CORRECTION CLÉ ICI: Construire manuellement le weekId pour garantir le format "yyyy-WNN"
    const weekId = `${currentWeekStart.weekYear}-W${currentWeekStart.weekNumber
      .toString()
      .padStart(2, "0")}`;

    // Créer un intervalle pour la semaine actuelle
    const currentWeekEnd = currentWeekStart.endOf("week"); // Fin de la semaine (dimanche)
    const currentWeekInterval = Interval.fromDateTimes(
      currentWeekStart,
      currentWeekEnd
    );

    // Pour chaque squad, calculer son pourcentage d'absence pour la semaine courante
    for (const squad of squads) {
      const squadMembers = membersBySquad.get(squad.id) || [];
      const totalSquadMembers = squadMembers.length;

      let totalAbsentWorkingDaysThisWeek = 0; // Compteur des jours ouvrables d'absence pour la squad cette semaine

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

      // Pour chaque membre de la squad, calculer ses jours d'absence dans la semaine
      squadMembers.forEach((member) => {
        const memberAbsences = squadAbsences.filter(
          (abs) => abs.member_id === member.id
        );
        let memberAbsentWorkingDays = 0;

        for (const abs of memberAbsences) {
          const absStart = DateTime.fromISO(abs.start_date);
          const absEnd = DateTime.fromISO(abs.end_date);
          const absenceInterval = Interval.fromDateTimes(
            absStart,
            absEnd.plus({ days: 1 })
          ); // Inclure le jour de fin

          // Calculer le chevauchement entre l'absence et la semaine actuelle
          const overlapInterval =
            currentWeekInterval.intersection(absenceInterval);

          if (overlapInterval) {
            // Utilisation de l'opérateur de non-null assertion (!) car nous avons déjà vérifié que overlapInterval n'est pas null
            let day = overlapInterval.start!.startOf("day");
            while (day <= overlapInterval.end!.startOf("day")) {
              // Vérifier si le jour est un jour ouvrable (lundi=1, dimanche=7)
              if (day.weekday >= 1 && day.weekday <= 5) {
                // Lundi à Vendredi
                memberAbsentWorkingDays++;
              }
              day = day.plus({ days: 1 });
            }
          }
        }
        // Un membre ne peut pas être absent plus de jours ouvrables qu'il n'y en a dans la semaine (5)
        totalAbsentWorkingDaysThisWeek += Math.min(
          memberAbsentWorkingDays,
          WORK_DAYS_PER_WEEK
        );
      });

      // Calculer les jours-personne ouvrables totaux disponibles pour la squad cette semaine
      const totalAvailableWorkingDays = totalSquadMembers * WORK_DAYS_PER_WEEK;

      let percentageAbsence = 0;
      if (totalAvailableWorkingDays > 0) {
        percentageAbsence =
          (totalAbsentWorkingDaysThisWeek / totalAvailableWorkingDays) * 100;
      }

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
