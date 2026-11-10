import React, { useMemo, useState } from 'react';
import { Archive, FolderPlus, Hash, Inbox, Star, Trash2, X, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { countByTag } from '../lib/tags';
import { Section } from '../types';

const FOLDER_COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57'];

export const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { notes, folders, section, setSection, addFolder, renameFolder, deleteFolder } = useStore();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const tagCounts = useMemo(() => countByTag(notes), [notes]);
  const allCount = useMemo(() => notes.filter((n) => n.deletedAt === null && !n.archived).length, [notes]);
  const trashCount = useMemo(() => notes.filter((n) => n.deletedAt !== null).length, [notes]);
  const archiveCount = useMemo(
    () => notes.filter((n) => n.deletedAt === null && n.archived).length,
    [notes]
  );
  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) {
      if (n.deletedAt !== null || !n.folderId || n.archived) continue;
      m.set(n.folderId, (m.get(n.folderId) ?? 0) + 1);
    }
    return m;
  }, [notes]);

  // Сортировка папок: по количеству активных заметок (убывание), затем по названию
  const sortedFolders = useMemo(
    () =>
      [...folders].sort((a, b) => {
        const diff = (folderCounts.get(b.id) ?? 0) - (folderCounts.get(a.id) ?? 0);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'ru');
      }),
    [folders, folderCounts]
  );

  // Сортировка тегов: по количеству активных заметок (убывание), затем по названию
  const sortedTags = useMemo(
    () =>
      Array.from(tagCounts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], 'ru');
      }),
    [tagCounts]
  );

  const same = (a: Section, b: Section): boolean => JSON.stringify(a) === JSON.stringify(b);

  const go = (s: Section) => {
    setSection(s);
    onClose();
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addFolder(newName, FOLDER_COLORS[folders.length % FOLDER_COLORS.length]);
    setNewName('');
    setAdding(false);
  };

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <span>Разделы</span>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list">
          <button className={`nav-item ${same(section, { kind: 'all' }) ? 'active' : ''}`} onClick={() => go({ kind: 'all' })}>
            <Inbox size={17} /> Все заметки <span className="nav-count">{allCount}</span>
          </button>
          <button
            className={`nav-item ${same(section, { kind: 'favorites' }) ? 'active' : ''}`}
            onClick={() => go({ kind: 'favorites' })}
          >
            <Star size={17} /> Избранное{' '}
            <span className="nav-count">
              {notes.filter((n) => n.favorite && n.deletedAt === null && !n.archived).length}
            </span>
          </button>
          <button
            className={`nav-item ${same(section, { kind: 'archive' }) ? 'active' : ''}`}
            onClick={() => go({ kind: 'archive' })}
          >
            <Archive size={17} /> Архив <span className="nav-count">{archiveCount}</span>
          </button>
          <button className={`nav-item ${same(section, { kind: 'trash' }) ? 'active' : ''}`} onClick={() => go({ kind: 'trash' })}>
            <Trash2 size={17} /> Корзина <span className="nav-count">{trashCount}</span>
          </button>
        </nav>

        <div className="sidebar-section-head">
          <span>Папки</span>
          <button className="icon-btn" onClick={() => setAdding((v) => !v)} aria-label="Новая папка">
            <FolderPlus size={16} />
          </button>
        </div>
        {adding && (
          <div className="folder-add-row">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Название папки"
              className="folder-add-input"
            />
            <button className="primary-btn small" onClick={handleAdd}>ОК</button>
          </div>
        )}
        <div className="nav-list">
          {sortedFolders.map((f) => (
            <div key={f.id} className="folder-row">
              {renamingId === f.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameFolder(f.id, renameValue);
                      setRenamingId(null);
                    }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => {
                    renameFolder(f.id, renameValue);
                    setRenamingId(null);
                  }}
                  className="folder-add-input"
                />
              ) : (
                <button
                  className={`nav-item ${same(section, { kind: 'folder', folderId: f.id }) ? 'active' : ''}`}
                  onClick={() => go({ kind: 'folder', folderId: f.id })}
                >
                  <span className="folder-dot" style={{ background: f.color }} />
                  {f.name}
                  <span className="nav-count">{folderCounts.get(f.id) ?? 0}</span>
                </button>
              )}
              {renamingId !== f.id && (
                <span className="folder-actions">
                  <button
                    className="icon-btn tiny"
                    aria-label="Переименовать папку"
                    onClick={() => {
                      setRenamingId(f.id);
                      setRenameValue(f.name);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-btn tiny"
                    aria-label="Удалить папку"
                    onClick={() => {
                      if (confirm(`Удалить папку «${f.name}»? Заметки переместятся в «Без папки».`)) {
                        deleteFolder(f.id);
                      }
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
              )}
            </div>
          ))}
          {folders.length === 0 && <div className="sidebar-hint">Папок пока нет</div>}
        </div>

        <div className="sidebar-section-head">
          <span>Теги</span>
        </div>
        <div className="tag-cloud">
          {sortedTags.map(([tag, count]) => (
            <button
              key={tag}
              className={`tag-chip ${same(section, { kind: 'tag', tag }) ? 'active' : ''}`}
              onClick={() => go({ kind: 'tag', tag })}
            >
              <Hash size={12} /> {tag} <span className="tag-chip-count">{count}</span>
            </button>
          ))}
          {tagCounts.size === 0 && <div className="sidebar-hint">Тегов пока нет — пишите #тег в тексте заметки</div>}
        </div>
      </aside>
    </>
  );
};
