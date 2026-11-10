import React from 'react';
import { LayoutGrid, List, Plus, Search, Settings, BarChart3, Moon, Sun, X, ArrowDownAZ, ArrowUpAZ, Star, Pin, RotateCcw, FilterX, NotebookPen } from 'lucide-react';
import { useStore, applyTheme } from './store';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { Editor } from './components/Editor';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { Toast } from './components/Toast';
import { loadFolders, loadNotes, loadSettings } from './lib/db';
import { filterNotes, searchNotes, sortNotes } from './lib/search';
import { exportAllMarkdown, exportAllText, exportJson } from './lib/export';
import { newId } from './lib/id';
import { SortBy } from './types';

const SORT_LABELS: Record<SortBy, string> = {
  updatedAt: 'По обновлению',
  createdAt: 'По созданию',
  title: 'По заголовку',
  words: 'По количеству слов',
};

export default function App(): React.JSX.Element {
  const {
    ready, notes, folders, settings, section, searchQuery, filters,
    editingNoteId, settingsOpen, statsOpen,
    init, setSearchQuery, openEditor, setFilters, resetFilters,
    setSettingsOpen, setStatsOpen, updateSettings, showToast,
  } = useStore();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    Promise.all([loadNotes(), loadFolders(), loadSettings()]).then(([n, f, s]) => {
      init(n, f, s);
      // Автоочистка корзины при запуске: заметки в корзине старше 30 дней удаляются безвозвратно
      useStore.getState().purgeExpired(30);
      if (n.length === 0) {
        const folderId = newId();
        const now = Date.now();
        init(
          [
            {
              id: newId(),
              title: 'Добро пожаловать! 👋',
              content: 'Это приложение заметок.\n\nВозможности:\n— папки и #теги (хэштеги в тексте подхватываются автоматически)\n— мгновенный поиск с подсветкой\n— избранное ⭐ и закрепление 📌\n— тёмная и светлая тема\n— экспорт в Markdown и JSON\n— статистика\n\n#старт #подсказки',
              createdAt: now,
              updatedAt: now,
              color: '#d4edff',
              folderId: null,
              tags: ['старт', 'подсказки'],
              pinned: true,
              favorite: true,
              archived: false,
              deletedAt: null,
            },
          ],
          [{ id: folderId, name: 'Личное', color: '#667eea', createdAt: now }],
          s
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Автоочистка корзины: раз в сутки
    const runPurge = () => {
      try {
        useStore.getState().purgeExpired(30);
      } catch {
        /* ignore */
      }
    };
    const timer = window.setInterval(runPurge, 24 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    applyTheme(settings.theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (useStore.getState().settings.theme === 'system') {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const visible = React.useMemo(() => {
    let filtered = filterNotes(notes, section);
    if (filters.favoritesOnly) filtered = filtered.filter((n) => n.favorite);
    if (filters.pinnedOnly) filtered = filtered.filter((n) => n.pinned);
    const searched = searchNotes(filtered, searchQuery);
    return sortNotes(searched, settings);
  }, [notes, section, searchQuery, settings, filters]);

  const hasFilters = filters.favoritesOnly || filters.pinnedOnly;

  const handleCreate = () => {
    const sectionState = useStore.getState().section;
    const draft: Partial<import('./types').Note> = {};
    if (sectionState.kind === 'folder') draft.folderId = sectionState.folderId;
    const note = useStore.getState().createNote(draft);
    openEditor(note.id);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        handleCreate();
      } else if (key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('notes:save-now'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) {
    return <div className="loading">Загрузка…</div>;
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Меню">
            <LayoutGrid size={20} />
          </button>
          <h1 className="app-title">Мои Заметки</h1>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={16} className="search-box-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Поиск по заметкам…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="icon-btn" onClick={() => setSearchQuery('')} aria-label="Очистить">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="icon-btn"
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            aria-label="Переключить тему"
            title="Переключить тему"
          >
            {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" onClick={() => setStatsOpen(true)} aria-label="Статистика" title="Статистика">
            <BarChart3 size={18} />
          </button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Настройки" title="Настройки">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="layout">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="main">
          <div className="toolbar">
            <span className="toolbar-count">{visible.length} заметок</span>
            <div className="toolbar-right">
              <div className="filter-chips">
                <button
                  className={`filter-chip ${filters.favoritesOnly ? 'active' : ''}`}
                  onClick={() => setFilters({ favoritesOnly: !filters.favoritesOnly })}
                  title="Только избранные"
                >
                  <Star size={13} /> Избранные
                </button>
                <button
                  className={`filter-chip ${filters.pinnedOnly ? 'active' : ''}`}
                  onClick={() => setFilters({ pinnedOnly: !filters.pinnedOnly })}
                  title="Только закреплённые"
                >
                  <Pin size={13} /> Закреплённые
                </button>
                {hasFilters && (
                  <button className="filter-chip reset" onClick={resetFilters} title="Сбросить фильтры">
                    <RotateCcw size={13} /> Сброс
                  </button>
                )}
              </div>
              <div className="sort-control">
                <select
                  className="prop-select sort-select"
                  value={settings.sortBy}
                  onChange={(e) => updateSettings({ sortBy: e.target.value as SortBy })}
                  aria-label="Сортировать по"
                >
                  {(Object.keys(SORT_LABELS) as SortBy[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
                <button
                  className="icon-btn"
                  onClick={() => updateSettings({ sortDir: settings.sortDir === 'asc' ? 'desc' : 'asc' })}
                  title={settings.sortDir === 'asc' ? 'По возрастанию' : 'По убыванию'}
                  aria-label="Направление сортировки"
                >
                  {settings.sortDir === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
                </button>
              </div>
              <button
                className={`icon-btn ${settings.layout === 'grid' ? 'active' : ''}`}
                onClick={() => updateSettings({ layout: 'grid' })}
                aria-label="Плитка"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`icon-btn ${settings.layout === 'list' ? 'active' : ''}`}
                onClick={() => updateSettings({ layout: 'list' })}
                aria-label="Список"
              >
                <List size={16} />
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  exportAllMarkdown(notes, folders);
                  showToast('Markdown экспортирован');
                }}
                title="Экспорт всех заметок в Markdown"
              >
                MD
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  exportAllText(notes, folders);
                  showToast('TXT экспортирован');
                }}
                title="Экспорт всех заметок в TXT"
              >
                TXT
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  exportJson(notes, folders, settings);
                  showToast('JSON-бэкап экспортирован');
                }}
                title="Экспорт в JSON"
              >
                JSON
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              {hasFilters ? (
                <>
                  <FilterX size={44} className="empty-icon" />
                  <p>Нет заметок по активным фильтрам</p>
                  <button className="ghost-btn" onClick={resetFilters}>
                    <RotateCcw size={14} /> Сбросить фильтры
                  </button>
                </>
              ) : (
                <>
                  <NotebookPen size={44} className="empty-icon" />
                  <p>{searchQuery ? 'Заметок не найдено' : 'Пока нет ни одной заметки'}</p>
                  <button className="primary-btn" onClick={handleCreate}>
                    <Plus size={16} /> Создать заметку
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={settings.layout === 'grid' ? 'notes-grid' : 'notes-list'}>
              {visible.map((note) => (
                <NoteCard key={note.id} note={note} query={searchQuery} onOpen={() => openEditor(note.id)} />
              ))}
            </div>
          )}
        </main>
      </div>

      <button className="add-btn" onClick={handleCreate} aria-label="Новая заметка" title="Новая заметка">
        <Plus size={26} />
      </button>

      {editingNoteId && (
        <Editor
          noteId={editingNoteId}
          onClose={() => openEditor(null)}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
      <Toast />
    </div>
  );
}
