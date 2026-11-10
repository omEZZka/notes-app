import { z } from 'zod';

export type NoteColor =
  | '#ffffff'
  | '#ffebd4'
  | '#d4edff'
  | '#e6d6ff'
  | '#ffe6f0'
  | '#fff3cd';

export const NOTE_COLORS: NoteColor[] = [
  '#ffffff',
  '#ffebd4',
  '#d4edff',
  '#e6d6ff',
  '#ffe6f0',
  '#fff3cd',
];

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  color: NoteColor;
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  deletedAt: number | null;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type Layout = 'grid' | 'list';
export type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'words';
export type SortDir = 'asc' | 'desc';

export interface Settings {
  theme: ThemeMode;
  layout: Layout;
  sortBy: SortBy;
  sortDir: SortDir;
  autosaveDelayMs: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  layout: 'grid',
  sortBy: 'updatedAt',
  sortDir: 'desc',
  autosaveDelayMs: 500,
};

export type Section =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'archive' }
  | { kind: 'trash' }
  | { kind: 'folder'; folderId: string }
  | { kind: 'tag'; tag: string };

export const noteColorSchema = z.enum([
  '#ffffff',
  '#ffebd4',
  '#d4edff',
  '#e6d6ff',
  '#ffe6f0',
  '#fff3cd',
]);

export const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  color: noteColorSchema.catch('#ffffff'),
  folderId: z.string().nullable().catch(null),
  tags: z.array(z.string()).catch([]),
  pinned: z.boolean().catch(false),
  favorite: z.boolean().catch(false),
  archived: z.boolean().catch(false),
  deletedAt: z.number().nullable().catch(null),
});

export const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().catch('#667eea'),
  createdAt: z.number().catch(() => Date.now()),
});

export const exportSchema = z.object({
  version: z.number().catch(1),
  exportedAt: z.number().optional(),
  // notes/folders должны быть массивами (default [] — если ключа нет);
  // иначе импорт «съедает» файл молча, а .catch() делал бы ветку ошибки мёртвой
  notes: z.array(noteSchema).default([]),
  folders: z.array(folderSchema).default([]),
  settings: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      layout: z.enum(['grid', 'list']).optional(),
      sortBy: z.enum(['updatedAt', 'createdAt', 'title', 'words']).optional(),
      sortDir: z.enum(['asc', 'desc']).optional(),
      autosaveDelayMs: z.number().int().min(100).max(10000).optional(),
    })
    .optional(),
});

export type ExportPayload = z.infer<typeof exportSchema>;
