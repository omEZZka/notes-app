import { Folder, Note, Settings, exportSchema } from '../types';

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ts = (): string => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export function exportJson(notes: Note[], folders: Folder[], settings?: Settings): void {
  const payload = { version: 1, exportedAt: Date.now(), notes, folders, ...(settings ? { settings } : {}) };
  download(`notes-backup-${ts()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'note';
}

export function noteToMarkdown(note: Note, folders: Folder[]): string {
  const folder = folders.find((f) => f.id === note.folderId)?.name;
  const lines = [`# ${note.title || 'Без заголовка'}`, ''];
  const meta: string[] = [
    `Создана: ${new Date(note.createdAt).toLocaleString('ru-RU')}`,
    `Обновлена: ${new Date(note.updatedAt).toLocaleString('ru-RU')}`,
  ];
  if (folder) meta.push(`Папка: ${folder}`);
  if (note.tags.length) meta.push(`Теги: ${note.tags.map((t) => `#${t}`).join(' ')}`);
  lines.push(`> ${meta.join(' · ')}`, '', note.content, '');
  return lines.join('\n');
}

export function exportMarkdown(note: Note, folders: Folder[]): void {
  download(`${sanitize(note.title || 'note')}.md`, noteToMarkdown(note, folders), 'text/markdown');
}

export function exportAllMarkdown(notes: Note[], folders: Folder[]): void {
  const parts = notes
    .filter((n) => n.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => noteToMarkdown(n, folders))
    .join('\n\n---\n\n');
  download(`notes-${ts()}.md`, parts || '# Заметок нет\n', 'text/markdown');
}

export function noteToText(note: Note, folders: Folder[]): string {
  const folder = folders.find((f) => f.id === note.folderId)?.name;
  const lines: string[] = [note.title || 'Без заголовка', '='.repeat((note.title || 'Без заголовка').length), ''];
  lines.push(`Создана: ${new Date(note.createdAt).toLocaleString('ru-RU')}`);
  lines.push(`Обновлена: ${new Date(note.updatedAt).toLocaleString('ru-RU')}`);
  if (folder) lines.push(`Папка: ${folder}`);
  if (note.tags.length) lines.push(`Теги: ${note.tags.map((t) => `#${t}`).join(' ')}`);
  lines.push('', note.content, '');
  return lines.join('\n');
}

export function exportText(note: Note, folders: Folder[]): void {
  download(`${sanitize(note.title || 'note')}.txt`, noteToText(note, folders), 'text/plain');
}

export function exportAllText(notes: Note[], folders: Folder[]): void {
  const parts = notes
    .filter((n) => n.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((n) => noteToText(n, folders))
    .join('\n\n----------------------------------------\n\n');
  download(`notes-${ts()}.txt`, parts || 'Заметок нет\n', 'text/plain');
}

export interface ImportResult {
  notes: Note[];
  folders: Folder[];
  settings: Partial<Settings> | null;
  errors: string[];
}

export function parseImportJson(raw: string): ImportResult {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { notes: [], folders: [], settings: null, errors: ['Файл не является корректным JSON'] };
  }
  const parsed = exportSchema.safeParse(data);
  if (!parsed.success) {
    return { notes: [], folders: [], settings: null, errors: ['Неверная схема данных'] };
  }
  return { notes: parsed.data.notes, folders: parsed.data.folders, settings: parsed.data.settings ?? null, errors };
}

export function mergeById<T extends { id: string; updatedAt?: number }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((x) => [x.id, x]));
  for (const inc of incoming) {
    const cur = map.get(inc.id);
    if (!cur || (inc.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(inc.id, inc);
  }
  return Array.from(map.values());
}
