import { get, set } from 'idb-keyval';
import { DEFAULT_SETTINGS, Folder, Note, Settings } from '../types';

const K_NOTES = 'notes-app:notes';
const K_FOLDERS = 'notes-app:folders';
const K_SETTINGS = 'notes-app:settings';

export async function loadNotes(): Promise<Note[]> {
  return (await get<Note[]>(K_NOTES)) ?? [];
}
export async function saveNotes(notes: Note[]): Promise<void> {
  await set(K_NOTES, notes);
}
export async function loadFolders(): Promise<Folder[]> {
  return (await get<Folder[]>(K_FOLDERS)) ?? [];
}
export async function saveFolders(folders: Folder[]): Promise<void> {
  await set(K_FOLDERS, folders);
}
export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await get<Partial<Settings>>(K_SETTINGS)) ?? {}) };
}
export async function saveSettings(settings: Settings): Promise<void> {
  await set(K_SETTINGS, settings);
}
