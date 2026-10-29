import i18n, { deviceLocale } from '../i18n';

const DAY = 86_400_000;

export function relativeDay(ms: number, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (ms >= start.getTime()) {
    return new Date(ms).toLocaleTimeString(deviceLocale, { hour: '2-digit', minute: '2-digit' });
  }
  if (ms >= start.getTime() - DAY) return i18n.t('common.yesterday');
  const sameYear = new Date(ms).getFullYear() === new Date(now).getFullYear();
  return new Date(ms).toLocaleDateString(deviceLocale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function noteTitle(note: { title: string; body: string }): string {
  if (note.title.trim()) return note.title.trim();
  const firstLine = note.body.trim().split('\n')[0] ?? '';
  return firstLine.slice(0, 80) || i18n.t('common.untitled');
}

export function noteExcerpt(note: { title: string; body: string; summary: string | null }): string {
  if (note.summary) return note.summary;
  const body = note.body.trim();
  // Skip the first line when it's already used as the title.
  if (!note.title.trim()) return body.split('\n').slice(1).join(' ').trim();
  return body.replace(/\s+/g, ' ');
}
