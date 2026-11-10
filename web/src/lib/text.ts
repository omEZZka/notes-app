export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function countChars(text: string): number {
  return text.length;
}

export function formatCount(n: number): string {
  return n.toLocaleString('ru-RU');
}
