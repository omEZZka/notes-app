import { create } from 'zustand';
import { Folder, Note, Section, Settings, DEFAULT_SETTINGS } from './types';
import { saveNotes, saveFolders, saveSettings } from './lib/db';
import { newId } from './lib/id';
import { extractTags } from './lib/tags';
import { mergeById } from './lib/export';

export interface NoteFilters {
  favoritesOnly: boolean;
  pinnedOnly: boolean;
}

export const DEFAULT_FILTERS: NoteFilters = {
  favoritesOnly: false,
  pinnedOnly: false,
};

interface StoreState {
  ready: boolean;
  notes: Note[];
  folders: Folder[];
  settings: Settings;
  section: Section;
  filters: NoteFilters;
  searchQuery: string;
  editingNoteId: string | null;
  settingsOpen: boolean;
  statsOpen: boolean;
  toast: { message: string; undo?: () => void } | null;

  init: (notes: Note[], folders: Folder[], settings: Settings) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  setSection: (section: Section) => void;
  setFilters: (patch: Partial<NoteFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (q: string) => void;
  openEditor: (id: string | null) => void;
  setSettingsOpen: (v: boolean) => void;
  setStatsOpen: (v: boolean) => void;
  showToast: (message: string, undo?: () => void) => void;
  clearToast: () => void;

  createNote: (draft: Partial<Note>) => Note;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  toggleArchived: (id: string) => void;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  purge: (id: string) => void;
  emptyTrash: () => void;
  purgeExpired: (maxAgeDays?: number) => number;

  addFolder: (name: string, color: string) => Folder;
  renameFolder: (id: string, name: string) => void;
  setFolderColor: (id: string, color: string) => void;
  deleteFolder: (id: string) => void;

  importData: (notes: Note[], folders: Folder[]) => void;
  importSettings: (settings: Partial<Settings>) => void;
}

function commitNotes(_get: () => StoreState, set: (p: Partial<StoreState>) => void, notes: Note[]): void {
  set({ notes });
  void saveNotes(notes);
}

function commitFolders(_get: () => StoreState, set: (p: Partial<StoreState>) => void, folders: Folder[]): void {
  set({ folders });
  void saveFolders(folders);
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  notes: [],
  folders: [],
  settings: DEFAULT_SETTINGS,
  section: { kind: 'all' },
  filters: { ...DEFAULT_FILTERS },
  searchQuery: '',
  editingNoteId: null,
  settingsOpen: false,
  statsOpen: false,
  toast: null,

  init: (notes, folders, settings) => set({ notes, folders, settings, ready: true }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void saveSettings(settings);
  },

  setSection: (section) => set({ section, editingNoteId: null }),
  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  openEditor: (id) => set({ editingNoteId: id }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setStatsOpen: (v) => set({ statsOpen: v }),

  showToast: (message, undo) => set({ toast: { message, undo } }),
  clearToast: () => set({ toast: null }),

  createNote: (draft) => {
    const now = Date.now();
    const note: Note = {
      id: newId(),
      title: draft.title ?? '',
      content: draft.content ?? '',
      createdAt: now,
      updatedAt: now,
      color: draft.color ?? '#ffffff',
      folderId: draft.folderId ?? null,
      tags: extractTags(draft.content ?? '', draft.tags ?? []),
      pinned: draft.pinned ?? false,
      favorite: draft.favorite ?? false,
      archived: false,
      deletedAt: null,
    };
    commitNotes(get, set, [note, ...get().notes]);
    return note;
  },

  updateNote: (id, patch) => {
    commitNotes(
      get,
      set,
      get().notes.map((n) => {
        if (n.id !== id) return n;
        const merged = { ...n, ...patch, updatedAt: Date.now() };
        // patch.tags содержит только ручные теги; автоматические пересчитываются из текста
        merged.tags = extractTags(merged.content, patch.tags ?? n.tags);
        return merged;
      })
    );
  },

  toggleFavorite: (id) =>
    commitNotes(get, set, get().notes.map((n) => (n.id === id ? { ...n, favorite: !n.favorite, updatedAt: Date.now() } : n))),

  togglePin: (id) =>
    commitNotes(get, set, get().notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n))),

  setArchived: (id, archived) =>
    commitNotes(get, set, get().notes.map((n) => (n.id === id ? { ...n, archived, updatedAt: Date.now() } : n))),

  toggleArchived: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    get().setArchived(id, !note.archived);
    get().showToast(note.archived ? 'Заметка возвращена из архива' : 'Заметка отправлена в архив');
  },

  softDelete: (id) => {
    const prev = get().notes;
    commitNotes(get, set, prev.map((n) => (n.id === id ? { ...n, deletedAt: Date.now() } : n)));
    set({ editingNoteId: null });
    get().showToast('Заметка удалена в корзину', () => {
      commitNotes(get, set, get().notes.map((n) => (n.id === id ? { ...n, deletedAt: null } : n)));
    });
  },

  restore: (id) => commitNotes(get, set, get().notes.map((n) => (n.id === id ? { ...n, deletedAt: null } : n))),

  purge: (id) => commitNotes(get, set, get().notes.filter((n) => n.id !== id)),

  emptyTrash: () => {
    const removed = get().notes.filter((n) => n.deletedAt !== null);
    commitNotes(get, set, get().notes.filter((n) => n.deletedAt === null));
    get().showToast(`Удалено безвозвратно: ${removed.length}`);
  },

  purgeExpired: (maxAgeDays = 30) => {
    const threshold = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const expired = get().notes.filter((n) => n.deletedAt !== null && n.deletedAt <= threshold);
    if (expired.length === 0) return 0;
    const expiredIds = new Set(expired.map((n) => n.id));
    commitNotes(get, set, get().notes.filter((n) => !expiredIds.has(n.id)));
    get().showToast(`Корзина очищена: удалено ${expired.length} старых заметок`);
    return expired.length;
  },

  addFolder: (name, color) => {
    const folder: Folder = { id: newId(), name: name.trim(), color, createdAt: Date.now() };
    commitFolders(get, set, [...get().folders, folder]);
    return folder;
  },

  renameFolder: (id, name) =>
    commitFolders(get, set, get().folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f))),

  setFolderColor: (id, color) =>
    commitFolders(get, set, get().folders.map((f) => (f.id === id ? { ...f, color } : f))),

  deleteFolder: (id) => {
    commitFolders(get, set, get().folders.filter((f) => f.id !== id));
    commitNotes(get, set, get().notes.map((n) => (n.folderId === id ? { ...n, folderId: null, updatedAt: Date.now() } : n)));
    const s = get().section;
    if (s.kind === 'folder' && s.folderId === id) set({ section: { kind: 'all' } });
  },

  importData: (notes, folders) => {
    commitNotes(get, set, mergeById(get().notes, notes));
    commitFolders(get, set, mergeById(get().folders, folders));
  },

  importSettings: (patch) => {
    get().updateSettings(patch);
  },
}));

export function applyTheme(theme: Settings['theme']): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
