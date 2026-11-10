import { describe, it, expect } from 'vitest';
import {
  TAG_RE,
  autoTags,
  countByTag,
  extractTags,
  normalizeTag,
  splitAutoAndManual,
  splitByTags,
} from './tags';

describe('normalizeTag', () => {
  it('убирает решётку, триммит и приводит к нижнему регистру', () => {
    expect(normalizeTag('#Работа')).toBe('работа');
    expect(normalizeTag('##Двойная')).toBe('двойная');
    expect(normalizeTag('  #Trim  ')).toBe('trim');
    expect(normalizeTag('#MiXeD-Case_1')).toBe('mixed-case_1');
  });

  it('возвращает пустую строку для пустого ввода', () => {
    expect(normalizeTag('#')).toBe('');
    expect(normalizeTag('   ')).toBe('');
  });
});

describe('autoTags', () => {
  it('находит хэштеги в тексте', () => {
    expect(autoTags('заметка #работа и #дом')).toEqual(['работа', 'дом']);
  });

  it('не находит хэштегов без решётки', () => {
    expect(autoTags('обычный текст без тегов')).toEqual([]);
  });
});

describe('extractTags', () => {
  it('извлекает теги из текста', () => {
    expect(extractTags('план #проект на #сентябрь')).toEqual(['проект', 'сентябрь']);
  });

  it('объединяет автоматические и ручные теги', () => {
    const result = extractTags('встреча #работа', ['дом', 'urgent']);
    expect(result).toEqual(expect.arrayContaining(['работа', 'дом', 'urgent']));
    expect(result).toHaveLength(3);
  });

  it('убирает дубликаты (регистронезависимо)', () => {
    const result = extractTags('#Работа #работа #Работа', ['работа']);
    expect(result).toEqual(['работа']);
  });

  it('разные теги в разном регистре остаются разными', () => {
    const result = extractTags('#Работа #WORK', ['работа']);
    expect(result).toEqual(['работа', 'work']);
  });

  it('нормализует ручные теги', () => {
    expect(extractTags('', ['#Дом', 'Работа '])).toEqual(['дом', 'работа']);
  });

  it('игнорирует пустые теги', () => {
    expect(extractTags('текст', ['#', '  '])).toEqual([]);
  });

  it('возвращает пустой массив для текста без тегов', () => {
    expect(extractTags('ничего тут нет')).toEqual([]);
  });

  it('поддерживает кириллицу, цифры, дефис и подчёркивание', () => {
    expect(extractTags('#дело_1 #a-b #Тест2')).toEqual(['дело_1', 'a-b', 'тест2']);
  });

  it('REGEX_TAG_RE глобальный и с флагом u', () => {
    expect(TAG_RE.flags).toContain('g');
    expect(TAG_RE.flags).toContain('u');
  });
});

describe('splitAutoAndManual', () => {
  it('разделяет автотеги из текста и ручные', () => {
    const { auto, manual } = splitAutoAndManual('в тексте #авто', ['авто', 'ручной']);
    expect(auto).toEqual(['авто']);
    expect(manual).toEqual(['ручной']);
  });

  it('пустой текст — все теги ручные', () => {
    const { auto, manual } = splitAutoAndManual('', ['а', 'б']);
    expect(auto).toEqual([]);
    expect(manual).toEqual(['а', 'б']);
  });
});

describe('splitByTags', () => {
  it('разбивает текст на сегменты с хэштегами', () => {
    const segs = splitByTags('начало #тег конец');
    expect(segs).toEqual([
      { text: 'начало ', tag: null },
      { text: '#тег', tag: 'тег' },
      { text: ' конец', tag: null },
    ]);
  });

  it('возвращает один сегмент для текста без тегов', () => {
    expect(splitByTags('просто текст')).toEqual([{ text: 'просто текст', tag: null }]);
  });

  it('возвращает пустой массив для пустой строки', () => {
    expect(splitByTags('')).toEqual([]);
  });

  it('обрабатывает несколько хэштегов подряд', () => {
    const segs = splitByTags('#a #b');
    expect(segs.filter((s) => s.tag).map((s) => s.tag)).toEqual(['a', 'b']);
  });

  it('сохраняет исходный текст при склейке сегментов', () => {
    const text = 'a #b c #d e';
    expect(splitByTags(text).map((s) => s.text).join('')).toBe(text);
  });

  it('хэштег в начале строки', () => {
    const segs = splitByTags('#начало\nвторая');
    expect(segs[0]).toEqual({ text: '#начало', tag: 'начало' });
  });
});

describe('countByTag', () => {
  const mk = (tags: string[], deletedAt: number | null = null, archived = false) => ({
    tags,
    deletedAt,
    archived,
  });

  it('считает количество заметок по каждому тегу', () => {
    const counts = countByTag([mk(['a', 'b']), mk(['a']), mk(['b', 'c'])]);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(2);
    expect(counts.get('c')).toBe(1);
  });

  it('не считает заметку с одинаковым тегом дважды', () => {
    const counts = countByTag([mk(['a', 'a'])]);
    expect(counts.get('a')).toBe(1);
  });

  it('исключает заметки из корзины', () => {
    const counts = countByTag([mk(['a']), mk(['a'], Date.now())]);
    expect(counts.get('a')).toBe(1);
  });

  it('исключает архивные заметки', () => {
    const counts = countByTag([mk(['a']), mk(['a'], null, true)]);
    expect(counts.get('a')).toBe(1);
  });

  it('возвращает пустую карту для пустого списка', () => {
    expect(countByTag([]).size).toBe(0);
  });

  it('игнорирует заметки без тегов', () => {
    const counts = countByTag([mk([])]);
    expect(counts.size).toBe(0);
  });
});
