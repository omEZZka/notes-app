import { describe, it, expect } from 'vitest';
import { mergeById, noteToMarkdown, noteToText, parseImportJson } from './export';
import { Folder, Note } from '../types';

function mkNote(p: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Заметка',
    content: 'Текст заметки',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    color: '#ffffff',
    folderId: null,
    tags: [],
    pinned: false,
    favorite: false,
    archived: false,
    deletedAt: null,
    ...p,
  };
}

const folders: Folder[] = [{ id: 'f1', name: 'Работа', color: '#667eea', createdAt: 0 }];

describe('parseImportJson', () => {
  const valid = JSON.stringify({
    version: 1,
    exportedAt: 1700000000000,
    notes: [mkNote({ id: 'a', tags: ['t1'] })],
    folders: [{ id: 'f1', name: 'Работа', color: '#667eea', createdAt: 0 }],
    settings: { theme: 'dark' },
  });

  it('разбирает валидный JSON', () => {
    const r = parseImportJson(valid);
    expect(r.errors).toEqual([]);
    expect(r.notes).toHaveLength(1);
    expect(r.notes[0].id).toBe('a');
    expect(r.folders).toHaveLength(1);
    expect(r.settings).toEqual({ theme: 'dark' });
  });

  it('битый JSON — ошибка без падения', () => {
    const r = parseImportJson('{ это не json');
    expect(r.errors).toEqual(['Файл не является корректным JSON']);
    expect(r.notes).toEqual([]);
    expect(r.folders).toEqual([]);
    expect(r.settings).toBeNull();
  });

  it('пустая строка — ошибка парсинга', () => {
    expect(parseImportJson('').errors.length).toBe(1);
  });

  it('неверная схема — ошибка', () => {
    const r = parseImportJson(JSON.stringify({ notes: 'не массив' }));
    expect(r.errors).toEqual(['Неверная схема данных']);
    expect(r.notes).toEqual([]);
  });

  it('объект без notes и folders — пустые массивы, без ошибок', () => {
    const r = parseImportJson(JSON.stringify({}));
    expect(r.errors).toEqual([]);
    expect(r.notes).toEqual([]);
    expect(r.folders).toEqual([]);
    expect(r.settings).toBeNull();
  });

  it('подставляет значения по умолчанию для неполных заметок', () => {
    const r = parseImportJson(
      JSON.stringify({ notes: [{ id: 'x', title: 'T', content: 'C', createdAt: 1, updatedAt: 2 }] })
    );
    expect(r.errors).toEqual([]);
    expect(r.notes[0].color).toBe('#ffffff');
    expect(r.notes[0].tags).toEqual([]);
    expect(r.notes[0].pinned).toBe(false);
    expect(r.notes[0].deletedAt).toBeNull();
  });

  it('игнорирует некорректный цвет заметки, а не падает', () => {
    const r = parseImportJson(
      JSON.stringify({
        notes: [{ id: 'x', title: 'T', content: 'C', createdAt: 1, updatedAt: 2, color: '#bad' }],
      })
    );
    expect(r.errors).toEqual([]);
    expect(r.notes[0].color).toBe('#ffffff');
  });
});

describe('noteToMarkdown', () => {
  it('содержит заголовок и содержимое', () => {
    const md = noteToMarkdown(mkNote({ title: 'Мой титул', content: 'Тело' }), []);
    expect(md.startsWith('# Мой титул')).toBe(true);
    expect(md).toContain('Тело');
  });

  it('без заголовка подставляет «Без заголовка»', () => {
    expect(noteToMarkdown(mkNote({ title: '' }), [])).toContain('# Без заголовка');
  });

  it('указывает папку, если она есть', () => {
    const md = noteToMarkdown(mkNote({ folderId: 'f1' }), folders);
    expect(md).toContain('Папка: Работа');
  });

  it('не указывает папку, если её нет', () => {
    expect(noteToMarkdown(mkNote({ folderId: null }), folders)).not.toContain('Папка:');
  });

  it('указывает теги', () => {
    const md = noteToMarkdown(mkNote({ tags: ['a', 'b'] }), []);
    expect(md).toContain('Теги: #a #b');
  });

  it('строка тегов отсутствует, если тегов нет', () => {
    expect(noteToMarkdown(mkNote({ tags: [] }), [])).not.toContain('Теги:');
  });
});

describe('noteToText', () => {
  it('содержит заголовок, разделитель и содержимое', () => {
    const txt = noteToText(mkNote({ title: 'Тест', content: 'C' }), []);
    expect(txt).toContain('Тест');
    expect(txt).toContain('====');
    expect(txt).toContain('C');
  });
});

describe('mergeById', () => {
  it('добавляет новые элементы', () => {
    const res = mergeById([{ id: 'a', updatedAt: 1 }], [{ id: 'b', updatedAt: 1 }]);
    expect(res.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('заменяет, если входящий свежее', () => {
    const res = mergeById(
      [{ id: 'a', updatedAt: 1, v: 'old' } as { id: string; updatedAt: number; v: string }],
      [{ id: 'a', updatedAt: 5, v: 'new' } as { id: string; updatedAt: number; v: string }]
    );
    expect(res).toHaveLength(1);
    expect(res[0].v).toBe('new');
  });

  it('сохраняет существующее, если входящее старше', () => {
    const res = mergeById(
      [{ id: 'a', updatedAt: 9, v: 'old' } as { id: string; updatedAt: number; v: string }],
      [{ id: 'a', updatedAt: 5, v: 'new' } as { id: string; updatedAt: number; v: string }]
    );
    expect(res[0].v).toBe('old');
  });

  it('пустые массивы дают пустой результат', () => {
    expect(mergeById([], [])).toEqual([]);
  });
});
