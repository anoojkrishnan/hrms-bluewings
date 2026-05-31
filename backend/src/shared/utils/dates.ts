import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

export const toUtc = (d: Date | string): Date => dayjs(d).utc().toDate();
export const toIso = (d: Date): string => d.toISOString();
export const formatDate = (d: Date, fmt = 'YYYY-MM-DD'): string => dayjs(d).format(fmt);
export const addDays = (d: Date, n: number): Date => dayjs(d).add(n, 'day').toDate();
export const addMonths = (d: Date, n: number): Date => dayjs(d).add(n, 'month').toDate();
export const addMinutes = (d: Date, n: number): Date => dayjs(d).add(n, 'minute').toDate();
export const diffDays = (a: Date, b: Date): number => dayjs(b).diff(dayjs(a), 'day');
export const startOfDay = (d: Date): Date => dayjs(d).startOf('day').toDate();
export const endOfDay = (d: Date): Date => dayjs(d).endOf('day').toDate();
export const startOfMonth = (d: Date): Date => dayjs(d).startOf('month').toDate();
export const endOfMonth = (d: Date): Date => dayjs(d).endOf('month').toDate();
export const isAfter = (a: Date, b: Date): boolean => dayjs(a).isAfter(dayjs(b));
export const isBefore = (a: Date, b: Date): boolean => dayjs(a).isBefore(dayjs(b));
export const nowUtc = (): Date => dayjs().utc().toDate();
export const parseDate = (s: string): Date => dayjs(s).toDate();
