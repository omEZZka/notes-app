export const TAG_RE = /#[\p{L}\p{N}_-]+/gu;

export interface TextSegment {
  text: string;
  tag: string | null;
}

/** Разбивает текст на сегменты, выделяя хэштеги (#тег). */
export function splitByTags(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  const re = new RegExp(TAG_RE.source, 'gu');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), tag: null });
    segments.push({ text: m[0], tag: normalizeTag(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), tag: null });
  return segments;
}

export const normalizeTag = (tag: string): string =>
  tag.trim().replace(/^#+/, '').trim().toLowerCase();

/** Только теги, найденные в тексте (без ручных). */
export function autoTags(content: string): string[] {
  return Array.from(content.match(TAG_RE) ?? []).map(normalizeTag).filter((t) => t.length > 0);
}

/** Разделяет набор тегов заметки на «автоматические» (из текста) и «ручные». */
export function splitAutoAndManual(content: string, tags: string[]): { auto: string[]; manual: string[] } {
  const auto = new Set(autoTags(content));
  const manual = tags.filter((t) => !auto.has(normalizeTag(t)));
  return { auto: Array.from(auto), manual };
}

export function extractTags(content: string, manual: string[] = []): string[] {
  const auto = autoTags(content);
  const all = [...auto, ...manual.map(normalizeTag)];
  return Array.from(new Set(all.filter((t) => t.length > 0)));
}

export function countByTag(
  notes: { tags: string[]; deletedAt: number | null; archived?: boolean }[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const n of notes) {
    if (n.deletedAt !== null) continue;
    if (n.archived) continue;
    for (const t of new Set(n.tags)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return counts;
}
