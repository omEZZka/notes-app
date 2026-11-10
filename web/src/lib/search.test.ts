import { describe, it, expect } from 'vitest';
import { filterNotes, highlight, matchesSection, searchNotes, sortNotes } from './search';
import { Note, Settings } from '../types';

let seq = 0;
function mkNote(p: Partial<Note> = {}): Note {
  seq += 1;
  return {
    id: `n${seq}`,
    title: '',
    content: '',
    createdAt: 1000 + seq,
    updatedAt: 1000 + seq,
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

const settings = (over: Partial<Settings> = {}): Settings => ({
  theme: 'system',
  layout: 'grid',
  sortBy: 'updatedAt',
  sortDir: 'desc',
  autosaveDelayMs: 500,
  ...over,
});

describe('searchNotes', () => {
  const notes = [
    mkNote({ title: 'Планы на лето', content: 'Отпуск и море' }),
    mkNote({ title: 'Работа', content: 'Отчёт по проекту #важное' }),
    mkNote({ title: 'Рецепт', content: 'Борщ с капустой' }),
  ];

  it('пустой запрос возвращает все заметки', () => {
    expect(searchNotes(notes, '')).toHaveLength(3);
    expect(searchNotes(notes, '   ')).toHaveLength(3);
  });

  it('ищет по заголовку', () => {
    const found = searchNotes(notes, 'рецепт');
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Рецепт');
  });

  it('ищет по содержимому', () => {
    expect(searchNotes(notes, 'море')).toHaveLength(1);
  });

  it('ищет по тегам', () => {
    const found = searchNotes(notes, 'важное');
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Работа');
  });

  it('регистронезависимо', () => {
    expect(searchNotes(notes, 'БОРЩ')).toHaveLength(1);
    expect(searchNotes(notes, 'борщ')).toHaveLength(1);
  });

  it('несколько слов — логическое И', () => {
    expect(searchNotes(notes, 'отчёт проект')).toHaveLength(1);
    expect(searchNotes(notes, 'отчёт море')).toHaveLength(0);
  });

  it('пустой список — пустой результат', () => {
    expect(searchNotes([], 'что угодно')).toEqual([]);
  });
});

describe('matchesSection', () => {
  const plain = mkNote({ folderId: 'f1', tags: ['a'] });
  const fav = mkNote({ favorite: true });
  const arch = mkNote({ archived: true });
  const trash = mkNote({ deletedAt: 5 });

  it('all — все заметки', () => {
    expect(matchesSection(plain, { kind: 'all' })).toBe(true);
  });

  it('favorites — только избранные', () => {
    expect(matchesSection(fav, { kind: 'favorites' })).toBe(true);
    expect(matchesSection(plain, { kind: 'favorites' })).toBe(false);
  });

  it('archive — только архивные', () => {
    expect(matchesSection(arch, { kind: 'archive' })).toBe(true);
    expect(matchesSection(plain, { kind: 'archive' })).toBe(false);
  });

  it('trash — только удалённые', () => {
    expect(matchesSection(trash, { kind: 'trash' })).toBe(true);
    expect(matchesSection(plain, { kind: 'trash' })).toBe(false);
  });

  it('folder — по id папки', () => {
    expect(matchesSection(plain, { kind: 'folder', folderId: 'f1' })).toBe(true);
    expect(matchesSection(plain, { kind: 'folder', folderId: 'f2' })).toBe(false);
  });

  it('tag — по наличию тега', () => {
    expect(matchesSection(plain, { kind: 'tag', tag: 'a' })).toBe(true);
    expect(matchesSection(plain, { kind: 'tag', tag: 'b' })).toBe(false);
  });
});

describe('filterNotes', () => {
  const normal = mkNote({ title: 'A' });
  const fav = mkNote({ title: 'B', favorite: true });
  const arch = mkNote({ title: 'C', archived: true });
  const trashed = mkNote({ title: 'D', deletedAt: 100 });
  const inFolder = mkNote({ title: 'E', folderId: 'f1' });
  const tagged = mkNote({ title: 'F', tags: ['t1'] });
  const all = [normal, fav, arch, trashed, inFolder, tagged];

  it('all — исключает корзину и архив', () => {
    const res = filterNotes(all, { kind: 'all' });
    expect(res.map((n) => n.title)).toEqual(['A', 'B', 'E', 'F']);
  });

  it('favorites — только избранные среди активных', () => {
    expect(filterNotes(all, { kind: 'favorites' }).map((n) => n.title)).toEqual(['B']);
  });

  it('archive — только архивные, без корзины', () => {
    expect(filterNotes(all, { kind: 'archive' }).map((n) => n.title)).toEqual(['C']);
  });

  it('trash — только удалённые', () => {
    expect(filterNotes(all, { kind: 'trash' }).map((n) => n.title)).toEqual(['D']);
  });

  it('folder — заметки своей папки, архивные исключены', () => {
    expect(filterNotes(all, { kind: 'folder', folderId: 'f1' }).map((n) => n.title)).toEqual(['E']);
  });

  it('tag — заметки с тегом', () => {
    expect(filterNotes(all, { kind: 'tag', tag: 't1' }).map((n) => n.title)).toEqual(['F']);
  });

  it('includeArchived — архивные видны в разделе all', () => {
    const res = filterNotes(all, { kind: 'all' }, { includeArchived: true });
    expect(res.map((n) => n.title)).toContain('C');
  });

  it('корзина всегда исключает неудалённые', () => {
    const res = filterNotes(all, { kind: 'trash' }, { includeArchived: true });
    expect(res.map((n) => n.title)).toEqual(['D']);
  });
});

describe('sortNotes', () => {
  const a = mkNote({ title: 'Альфа', updatedAt: 300, createdAt: 100, content: 'одно слово' });
  const b = mkNote({ title: 'Бета', updatedAt: 100, createdAt: 300, content: 'два слова тут' });
  const pinned = mkNote({ title: 'Веста', updatedAt: 1, createdAt: 1, pinned: true });

  it('закреплённые всегда сверху', () => {
    const res = sortNotes([a, b, pinned], settings());
    expect(res[0].id).toBe(pinned.id);
  });

  it('по обновлению desc — свежие сверху', () => {
    const res = sortNotes([a, b], settings({ sortBy: 'updatedAt', sortDir: 'desc' }));
    expect(res.map((n) => n.id)).toEqual([a.id, b.id]);
  });

  it('по обновлению asc — старые сверху', () => {
    const res = sortNotes([a, b], settings({ sortBy: 'updatedAt', sortDir: 'asc' }));
    expect(res.map((n) => n.id)).toEqual([b.id, a.id]);
  });

  it('по созданию', () => {
    const res = sortNotes([a, b], settings({ sortBy: 'createdAt', sortDir: 'desc' }));
    expect(res.map((n) => n.id)).toEqual([b.id, a.id]);
  });

  it('по заголовку', () => {
    const res = sortNotes([b, a], settings({ sortBy: 'title', sortDir: 'asc' }));
    expect(res.map((n) => n.title)).toEqual(['Альфа', 'Бета']);
  });

  it('по количеству слов', () => {
    const res = sortNotes([a, b], settings({ sortBy: 'words', sortDir: 'desc' }));
    expect(res.map((n) => n.id)).toEqual([b.id, a.id]);
  });

  it('не мутирует исходный массив', () => {
    const src = [a, b];
    sortNotes(src, settings());
    expect(src.map((n) => n.id)).toEqual([a.id, b.id]);
  });
});

describe('highlight', () => {
  it('пустой запрос — один сегмент без попаданий', () => {
    expect(highlight('текст', '')).toEqual([{ part: 'текст', hit: false }]);
  });

  it('разбивает текст на части и помечает совпадения', () => {
    const res = highlight('Hello world', 'hello');
    expect(res.some((s) => s.hit && s.part === 'Hello')).toBe(true);
    expect(res.map((s) => s.part).join('')).toBe('Hello world');
  });

  it('ищет по всем терминам', () => {
    const res = highlight('one two three', 'one three');
    expect(res.filter((s) => s.hit).map((s) => s.part)).toEqual(['one', 'three']);
  });

  it('экранирует спецсимволы регулярного выражения', () => {
    expect(() => highlight('a.b', '.')).not.toThrow();
    const res = highlight('a.b', '.');
    // точка трактуется буквально, а не как «любой символ»
    expect(res.filter((s) => s.hit).map((s) => s.part)).toEqual(['.']);
    expect(res.map((s) => s.part).join('')).toBe('a.b');
  });

  it('регистронезависимо', () => {
    const res = highlight('Привет Мир', 'мир');
    expect(res.filter((s) => s.hit).map((s) => s.part)).toEqual(['Мир']);
  });
});
