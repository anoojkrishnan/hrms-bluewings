import type { WeekendPolicy } from './leave.types';

/**
 * Pure function — no DB calls. Takes pre-fetched holidays and weekend policy.
 * Returns the number of working days between startDate and endDate (inclusive).
 */
export function calcWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: Date[],
  weekendPolicy: WeekendPolicy | null,
): number {
  const defaultWorkingDays = [1, 2, 3, 4, 5]; // Mon-Fri
  const workingDays = weekendPolicy?.workingDays ?? defaultWorkingDays;

  const holidayStrings = new Set(holidays.map((d) => toDateString(d)));

  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
    const dateStr = toDateString(current);

    if (workingDays.includes(dayOfWeek)) {
      if (isSaturdayWorking(current, weekendPolicy)) {
        if (!holidayStrings.has(dateStr)) count++;
      } else {
        if (!holidayStrings.has(dateStr)) count++;
      }
    } else if (dayOfWeek === 6 && weekendPolicy) {
      // Saturday — check if this specific Saturday is working
      if (isSaturdayWorking(current, weekendPolicy) && !holidayStrings.has(dateStr)) {
        count++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSaturdayWorking(date: Date, policy: WeekendPolicy | null): boolean {
  if (!policy) return false;
  if (date.getDay() !== 6) return false;

  // Find which Saturday of the month this is
  const dayOfMonth = date.getDate();
  const saturdayNumber = Math.ceil(dayOfMonth / 7);

  switch (saturdayNumber) {
    case 1: return policy.firstSaturdayOff ? false : true;
    case 2: return policy.secondSaturdayOff ? false : true;
    case 3: return policy.thirdSaturdayOff ? false : true;
    case 4: return policy.fourthSaturdayOff ? false : true;
    default: return false;
  }
}
