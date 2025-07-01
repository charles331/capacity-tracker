// src/capacityCalculator.ts
import { DateTime, Info } from "luxon";
import { Absence, Squad, WeekCapacity } from "./types";

const ABSENCE_THRESHOLD_PERCENT = 50; // Votre seuil de 50%

export function calculateWeeklyCapacity(
  squads: Squad[],
  absences: Absence[],
  numWeeksAhead: number = 26 // Calculer pour les 26 prochaines semaines (6 mois)
): WeekCapacity[] {
  const capacityReport: WeekCapacity[] = [];
  const today = DateTime.local();

  for (let i = 0; i < numWeeksAhead; i++) {
    const currentWeekStart = today.plus({ weeks: i }).startOf("week");
    const currentWeekEnd = currentWeekStart.endOf("week");
    const weekId = currentWeekStart.toFormat("yyyy-W"); // Format ISO week (e.g., 2025-W28)

    for (const squad of squads) {
      let membersAbsentThisWeek = new Set<string>();

      const squadAbsences = absences.filter((abs) => abs.squad_id === squad.id);

      for (const abs of squadAbsences) {
        const absStart = DateTime.fromISO(abs.start_date);
        const absEnd = DateTime.fromISO(abs.end_date);

        // Check if absence overlaps with the current week
        const overlapStart =
          absStart > currentWeekStart ? absStart : currentWeekStart;
        const overlapEnd = absEnd < currentWeekEnd ? absEnd : currentWeekEnd;

        if (overlapStart <= overlapEnd) {
          // Check for at least one workday overlap (simplistic: any day in week is enough for this simple count)
          // For a more precise calculation, you'd iterate each day and check if it's a workday
          // Here, we just mark the member as absent if their absence touches the week.
          membersAbsentThisWeek.add(abs.member_name);
        }
      }

      const percentageAbsence =
        squad.member_count === 0
          ? 0
          : (membersAbsentThisWeek.size / squad.member_count) * 100;

      capacityReport.push({
        squadName: squad.name,
        weekId: weekId,
        percentageAbsence: parseFloat(percentageAbsence.toFixed(1)), // Arrondi à 1 décimale
        alert: percentageAbsence > ABSENCE_THRESHOLD_PERCENT,
      });
    }
  }

  return capacityReport;
}
