import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';
import { Folder, Note } from '../types';

const DAY = 24 * 3600 * 1000;

function mkNote(p: Partial<Note>): Note {
  return {
    id: Math.random().toString(36).slice(2),
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

const folders: Folder[] = [
  { id: 'f1', name: 'Работа', color: '#111111', createdAt: 0 },
  { id: 'f2', name: 'Дом', color: '#222222', createdAt: 0 },
];

describe('computeStats', () => {
  it('пустой набор — нули', () => {
    const s = computeStats([], []);
    expect(s.total).toBe(0);
    expect(s.favorites).toBe(0);
    expect(s.pinned).toBe(0);
    expect(s.trashed).toBe(0);
    expect(s.words).toBe(0);
    expect(s.byFolder).toEqual([]);
    expect(s.byTag).toEqual([]);
  });

  it('считает только активные заметки в total', () => {
    const s = computeStats(
      [mkNote({}), mkNote({ deletedAt: Date.now() })],
      []
    );
    expect(s.total).toBe(1);
    expect(s.trashed).toBe(1);
  });

  it('считает избранные и закреплённые среди активных', () => {
    const s = computeStats(
      [
        mkNote({ favorite: true, pinned: true }),
        mkNote({ favorite: true, deletedAt: 10 }),
        mkNote({}),
      ],
      []
    );
    expect(s.favorites).toBe(1);
    expect(s.pinned).toBe(1);
  });

  it('thisWeek — созданные за последние 7 дней', () => {
    const now = Date.now();
    const s = computeStats(
      [mkNote({ createdAt: now - 2 * DAY }), mkNote({ createdAt: now - 20 * DAY })],
      []
    );
    expect(s.thisWeek).toBe(1);
  });

  it('считает слова и символы', () => {
    const s = computeStats([mkNote({ content: 'раз два три' })], []);
    expect(s.words).toBe(3);
    expect(s.chars).toBe('раз два три'.length);
  });

  it('пустой контент не добавляет слов', () => {
    const s = computeStats([mkNote({ content: '   ' })], []);
    expect(s.words).toBe(0);
  });

  it('группирует по папкам, без папки — «Без папки»', () => {
    const s = computeStats(
      [
        mkNote({ folderId: 'f1' }),
        mkNote({ folderId: 'f1' }),
        mkNote({ folderId: 'f2' }),
        mkNote({ folderId: null }),
      ],
      folders
    );
    expect(s.byFolder).toEqual([
      { name: 'Работа', count: 2, color: '#111111' },
      { name: 'Дом', count: 1, color: '#222222' },
      { name: 'Без папки', count: 1, color: '#888' },
    ]);
  });

  it('неизвестный id папки трактуется как «Без папки»', () => {
    const s = computeStats([mkNote({ folderId: 'missing' })], folders);
    expect(s.byFolder[0].name).toBe('Без папки');
  });

  it('группирует по тегам и сортирует по убыванию', () => {
    const s = computeStats(
      [
        mkNote({ tags: ['a', 'b'] }),
        mkNote({ tags: ['a'] }),
        mkNote({ tags: ['c'] }),
      ],
      []
    );
    expect(s.byTag).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 1 },
      { tag: 'c', count: 1 },
    ]);
  });

  it('удалённые заметки не попадают в папки и теги', () => {
    const s = computeStats([mkNote({ tags: ['x'], deletedAt: 1 })], folders);
    expect(s.byTag).toEqual([]);
    expect(s.byFolder).toEqual([]);
  });
});
