import { Folder, Note } from '../types';

export interface Stats {
  total: number;
  favorites: number;
  pinned: number;
  trashed: number;
  thisWeek: number;
  words: number;
  chars: number;
  byFolder: Array<{ name: string; count: number; color: string }>;
  byTag: Array<{ tag: string; count: number }>;
}

export function computeStats(notes: Note[], folders: Folder[]): Stats {
  const active = notes.filter((n) => n.deletedAt === null);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const folderNames = new Map(folders.map((f) => [f.id, f]));
  const byFolderMap = new Map<string, number>();
  const byTagMap = new Map<string, number>();
  let words = 0;
  let chars = 0;

  for (const n of active) {
    const key = n.folderId ? (folderNames.get(n.folderId)?.name ?? 'Без папки') : 'Без папки';
    byFolderMap.set(key, (byFolderMap.get(key) ?? 0) + 1);
    for (const t of n.tags) byTagMap.set(t, (byTagMap.get(t) ?? 0) + 1);
    words += n.content.trim() ? n.content.trim().split(/\s+/).length : 0;
    chars += n.content.length;
  }

  return {
    total: active.length,
    favorites: active.filter((n) => n.favorite).length,
    pinned: active.filter((n) => n.pinned).length,
    trashed: notes.length - active.length,
    thisWeek: active.filter((n) => n.createdAt >= weekAgo).length,
    words,
    chars,
    byFolder: Array.from(byFolderMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        color: folders.find((f) => f.name === name)?.color ?? '#888',
      }))
      .sort((a, b) => b.count - a.count),
    byTag: Array.from(byTagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}
