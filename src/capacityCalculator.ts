// Liste des jours fériés belges (fixes et mobiles)
function getBelgianHolidays(year: number): string[] {
  // Jours fériés fixes
  const fixed = [
    `${year}-01-01`, // Nouvel An
    `${year}-05-01`, // Fête du Travail
    `${year}-07-21`, // Fête nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // Toussaint
    `${year}-11-11`, // Armistice
    `${year}-12-25`, // Noël
  ];

  // Calcul des jours fériés mobiles (Pâques, Lundi de Pâques, Ascension, Pentecôte)
  // Méthode de calcul de la date de Pâques (algorithme de Meeus/Jones/Butcher)
  function getEasterDate(y: number): DateTime {
    const f = Math.floor,
      G = y % 19,
      C = f(y / 100),
      H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
      I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
      J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7,
      L = I - J,
      month = 3 + f((L + 40) / 44),
      day = L + 28 - 31 * f(month / 4);
    return DateTime.local(y, month, day);
  }

  const easter = getEasterDate(year);
  const holidays = [
    ...fixed,
    easter.toISODate(), // Pâques (dimanche)
    easter.plus({ days: 1 }).toISODate(), // Lundi de Pâques
    easter.plus({ days: 39 }).toISODate(), // Ascension (jeudi)
    easter.plus({ days: 49 }).toISODate(), // Pentecôte (dimanche)
    easter.plus({ days: 50 }).toISODate(), // Lundi de Pentecôte
  ];
  // Filtrer les éventuels null (par sécurité)
  return holidays.filter((d): d is string => !!d);
}
// src/capacityCalculator.ts
import { DateTime, Interval } from "luxon";
import { Squad, Member, AbsenceWithDetails, WeekCapacity } from "./types";

// Extension du type WeekCapacity pour inclure les jours fériés (si ce n'est pas déjà fait)
type WeekCapacityWithHolidays = WeekCapacity & { holidays?: string[] };

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
): WeekCapacityWithHolidays[] {
  const capacityReport: WeekCapacityWithHolidays[] = [];
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

    // Construire manuellement le weekId pour garantir le format "yyyy-WNN"
    // padStart(2, '0') assure que le numéro de semaine a toujours 2 chiffres (ex: W01, W05)
    const weekId = `${currentWeekStart.weekYear}-W${currentWeekStart.weekNumber
      .toString()
      .padStart(2, "0")}`;

    // Créer un intervalle pour la semaine actuelle
    const currentWeekEnd = currentWeekStart.endOf("week"); // Fin de la semaine (dimanche)
    const currentWeekInterval = Interval.fromDateTimes(
      currentWeekStart,
      currentWeekEnd
    );
    // Calculer les jours fériés de la semaine (lundi à dimanche)
    const weekHolidays: string[] = [];
    for (
      let d = currentWeekStart;
      d <= currentWeekEnd;
      d = d.plus({ days: 1 })
    ) {
      const holidays = getBelgianHolidays(d.year);
      if (holidays.includes(d.toISODate())) {
        weekHolidays.push(d.toISODate());
      }
    }

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
          holidays: weekHolidays,
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
            let day = overlapInterval.start!.startOf("day");
            // CORRECTION CLÉ ICI: La boucle doit s'arrêter STRICTEMENT AVANT la fin de l'intervalle
            // Récupérer les jours fériés pour l'année en cours (et l'année suivante si la semaine chevauche)
            const holidays = [
              ...getBelgianHolidays(day.year),
              ...getBelgianHolidays(day.year + 1),
            ];
            while (day < overlapInterval.end!) {
              // Vérifier si le jour est un jour ouvrable (lundi=1, dimanche=7)
              // et n'est pas un jour férié
              if (
                day.weekday >= 1 &&
                day.weekday <= 5 &&
                !holidays.includes(day.toISODate())
              ) {
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

      // Ajouter les jours fériés comme absences pour tous les membres (impacte le % d'absence)
      // Pour chaque jour férié de la semaine, chaque membre est considéré absent ce jour-là
      totalAbsentWorkingDaysThisWeek +=
        weekHolidays.filter((h) => {
          // Ne compter que les jours fériés qui tombent un jour ouvrable (lundi-vendredi)
          const dt = DateTime.fromISO(h);
          return dt.isValid && dt.weekday >= 1 && dt.weekday <= 5;
        }).length * totalSquadMembers;

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
        holidays: weekHolidays,
      });
    }
  }

  return capacityReport;
}
