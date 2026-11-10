import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, applyTheme } from './store';
import { Note } from './types';

// idb-keyval в jsdom не работает — мокаем слой персистентности
vi.mock('./lib/db', () => ({
  loadNotes: vi.fn(async () => []),
  saveNotes: vi.fn(async () => undefined),
  loadFolders: vi.fn(async () => []),
  saveFolders: vi.fn(async () => undefined),
  loadSettings: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
}));

const state = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    notes: [],
    folders: [],
    section: { kind: 'all' },
    filters: { favoritesOnly: false, pinnedOnly: false },
    searchQuery: '',
    editingNoteId: null,
    settingsOpen: false,
    statsOpen: false,
    toast: null,
    ready: true,
  });
});

describe('создание заметки', () => {
  it('создаёт заметку с дефолтами', () => {
    const note = state().createNote({});
    expect(note.title).toBe('');
    expect(note.deletedAt).toBeNull();
    expect(state().notes).toHaveLength(1);
  });

  it('подхватывает #теги из текста', () => {
    const note = state().createNote({ content: 'план #проект' });
    expect(note.tags).toEqual(['проект']);
  });

  it('сохраняет папку из драфта', () => {
    const note = state().createNote({ folderId: 'f1' });
    expect(note.folderId).toBe('f1');
  });
});

describe('редактирование', () => {
  it('обновляет поля и проставляет updatedAt', () => {
    const note = state().createNote({ title: 'A' });
    state().updateNote(note.id, { title: 'B' });
    const updated = state().notes[0];
    expect(updated.title).toBe('B');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(note.updatedAt);
  });

  it('пересчитывает автотеги при изменении текста', () => {
    const note = state().createNote({ content: '#старый' });
    state().updateNote(note.id, { content: '#новый', tags: [] });
    expect(state().notes[0].tags).toEqual(['новый']);
  });
});

describe('удаление и корзина', () => {
  it('мягкое удаление прячет заметку и даёт undo', () => {
    const note = state().createNote({});
    state().softDelete(note.id);
    expect(state().notes[0].deletedAt).not.toBeNull();
    const undo = state().toast?.undo;
    expect(typeof undo).toBe('function');
    undo?.();
    expect(state().notes[0].deletedAt).toBeNull();
  });

  it('purge удаляет навсегда', () => {
    const note = state().createNote({});
    state().softDelete(note.id);
    state().purge(note.id);
    expect(state().notes).toHaveLength(0);
  });

  it('restore возвращает из корзины', () => {
    const note = state().createNote({});
    state().softDelete(note.id);
    state().restore(note.id);
    expect(state().notes[0].deletedAt).toBeNull();
  });

  it('emptyTrash чистит только корзину', () => {
    const a = state().createNote({});
    const b = state().createNote({});
    state().softDelete(a.id);
    state().emptyTrash();
    expect(state().notes).toHaveLength(1);
    expect(state().notes[0].id).toBe(b.id);
  });

  it('purgeExpired удаляет только заметки старше срока', () => {
    const old = state().createNote({});
    const fresh = state().createNote({});
    state().updateNote(old.id, { deletedAt: Date.now() - 40 * 24 * 3600 * 1000 });
    state().softDelete(fresh.id);
    const removed = state().purgeExpired(30);
    expect(removed).toBe(1);
    expect(state().notes.map((n: Note) => n.id)).toEqual([fresh.id]);
  });
});

describe('избранное, закрепление, архив', () => {
  it('toggleFavorite переключает флаг', () => {
    const note = state().createNote({});
    state().toggleFavorite(note.id);
    expect(state().notes[0].favorite).toBe(true);
    state().toggleFavorite(note.id);
    expect(state().notes[0].favorite).toBe(false);
  });

  it('togglePin переключает закрепление', () => {
    const note = state().createNote({});
    state().togglePin(note.id);
    expect(state().notes[0].pinned).toBe(true);
  });

  it('toggleArchived архивирует и возвращает', () => {
    const note = state().createNote({});
    state().toggleArchived(note.id);
    expect(state().notes[0].archived).toBe(true);
    state().toggleArchived(note.id);
    expect(state().notes[0].archived).toBe(false);
  });
});

describe('папки', () => {
  it('создаёт папку', () => {
    const f = state().addFolder('  Работа  ', '#111');
    expect(f.name).toBe('Работа');
    expect(state().folders).toHaveLength(1);
  });

  it('переименовывает папку', () => {
    const f = state().addFolder('A', '#111');
    state().renameFolder(f.id, 'B');
    expect(state().folders[0].name).toBe('B');
  });

  it('удаление папки не удаляет заметки, а обнуляет folderId', () => {
    const f = state().addFolder('A', '#111');
    state().createNote({ folderId: f.id });
    state().deleteFolder(f.id);
    expect(state().notes).toHaveLength(1);
    expect(state().notes[0].folderId).toBeNull();
  });

  it('удаление текущей папки сбрасывает раздел', () => {
    const f = state().addFolder('A', '#111');
    state().setSection({ kind: 'folder', folderId: f.id });
    state().deleteFolder(f.id);
    expect(state().section).toEqual({ kind: 'all' });
  });
});

describe('настройки и тема', () => {
  it('обновляет настройки', () => {
    state().updateSettings({ theme: 'dark' });
    expect(state().settings.theme).toBe('dark');
  });

  it('applyTheme ставит data-theme', () => {
    state().updateSettings({ theme: 'dark' });
    // applyTheme использует matchMedia — в jsdom его нет, добавляем заглушку
    (window as unknown as { matchMedia?: unknown }).matchMedia = () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    const { applyTheme: apply } = { applyTheme };
    apply('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    apply('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('импорт', () => {
  it('сливает заметки по id, оставляя более новую', () => {
    const note = state().createNote({ title: 'старая' });
    const incoming: Note = { ...note, title: 'новая', updatedAt: note.updatedAt + 1000 };
    state().importData([incoming], []);
    expect(state().notes).toHaveLength(1);
    expect(state().notes[0].title).toBe('новая');
  });

  it('добавляет новые папки, не трогая существующие', () => {
    state().addFolder('A', '#111');
    state().importData([], [{ id: 'f2', name: 'B', color: '#222', createdAt: 0 }]);
    expect(state().folders).toHaveLength(2);
  });
});
