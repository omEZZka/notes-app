import { Note, Section, Settings } from '../types';
import { countWords } from './text';

export function matchesSection(note: Note, section: Section): boolean {
  switch (section.kind) {
    case 'all':
      return true;
    case 'trash':
      return note.deletedAt !== null;
    case 'favorites':
      return note.favorite;
    case 'archive':
      return note.archived;
    case 'folder':
      return note.folderId === section.folderId;
    case 'tag':
      return note.tags.includes(section.tag);
  }
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  const terms = q.split(/\s+/);
  return notes.filter((n) => {
    const hay = `${n.title}\n${n.content}\n${n.tags.join(' ')}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export function filterNotes(
  notes: Note[],
  section: Section,
  opts: { includeArchived?: boolean } = {}
): Note[] {
  const includeArchived = opts.includeArchived ?? false;
  return notes.filter((n) => {
    if (section.kind === 'trash') return n.deletedAt !== null;
    if (n.deletedAt !== null) return false;
    if (section.kind === 'archive') return n.archived;
    if (n.archived && !includeArchived) return false;
    return matchesSection(n, section);
  });
}

export function sortNotes(notes: Note[], settings: Settings): Note[] {
  const dir = settings.sortDir === 'asc' ? 1 : -1;
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    switch (settings.sortBy) {
      case 'title':
        return a.title.localeCompare(b.title, 'ru') * dir;
      case 'createdAt':
        return (a.createdAt - b.createdAt) * dir;
      case 'words':
        return (countWords(a.content) - countWords(b.content)) * dir;
      default:
        return (a.updatedAt - b.updatedAt) * dir;
    }
  });
}

export function highlight(text: string, query: string): Array<{ part: string; hit: boolean }> {
  const q = query.trim();
  if (!q) return [{ part: text, hit: false }];
  const terms = q
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const testRe = new RegExp(`^(?:${terms})$`, 'iu');
  const re = new RegExp(`(${terms})`, 'giu');
  return text
    .split(re)
    .filter((p) => p !== '')
    .map((p) => ({ part: p, hit: testRe.test(p) }));
}
