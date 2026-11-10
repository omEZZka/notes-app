import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Download, FileText, Folder as FolderIcon, Pin, Star, Trash2, X, Hash } from 'lucide-react';
import { NOTE_COLORS, NoteColor } from '../types';
import { useStore } from '../store';
import { extractTags, normalizeTag, splitAutoAndManual, splitByTags } from '../lib/tags';
import { exportMarkdown, exportText } from '../lib/export';
import { countChars, countWords } from '../lib/text';

export const Editor: React.FC<{ noteId: string; onClose: () => void }> = ({ noteId, onClose }) => {
  const { notes, folders, settings, softDelete, toggleFavorite, togglePin, toggleArchived, showToast } =
    useStore();
  const note = notes.find((n) => n.id === noteId);

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [folderId, setFolderId] = useState<string | null>(note?.folderId ?? null);
  const [color, setColor] = useState<NoteColor>((note?.color as NoteColor) ?? '#ffffff');
  const [manualTags, setManualTags] = useState<string[]>(() =>
    note ? splitAutoAndManual(note.content, note.tags).manual : []
  );
  const [tagInput, setTagInput] = useState('');
  const [saved, setSaved] = useState(true);
  const [highlightTags, setHighlightTags] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = React.useCallback((ta: HTMLTextAreaElement) => {
    const ov = overlayRef.current;
    if (!ov) return;
    ov.scrollTop = ta.scrollTop;
    ov.scrollLeft = ta.scrollLeft;
  }, []);

  const saveNow = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const tags = extractTags(content, manualTags);
    useStore.getState().updateNote(noteId, { title: title.trim(), content, folderId, color, tags });
    setSaved(true);
  }, [noteId, title, content, folderId, color, manualTags]);

  useEffect(() => {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const tags = extractTags(content, manualTags);
      useStore.getState().updateNote(noteId, { title: title.trim(), content, folderId, color, tags });
      setSaved(true);
    }, settings.autosaveDelayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, folderId, color, manualTags, settings.autosaveDelayMs]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) syncScroll(ta);
  }, [content, syncScroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveRef = useRef(saveNow);
  saveRef.current = saveNow;

  useEffect(() => {
    const onSaveNow = () => {
      saveRef.current();
      showToast('Заметка сохранена');
    };
    window.addEventListener('notes:save-now', onSaveNow);
    return () => window.removeEventListener('notes:save-now', onSaveNow);
  }, [showToast]);

  useEffect(() => {
    return () => {
      saveRef.current();
    };
  }, []);

  if (!note) return null;

  const addManualTag = () => {
    const t = normalizeTag(tagInput);
    if (t && !manualTags.includes(t)) setManualTags([...manualTags, t]);
    setTagInput('');
  };

  const allTags = extractTags(content, manualTags);
  const autoOnly = new Set(splitAutoAndManual(content, note.tags).auto);
  const isAutoTag = (t: string): boolean => autoOnly.has(t) && !manualTags.includes(t);

  const onTagClick = (tag: string) => {
    useStore.getState().setSection({ kind: 'tag', tag });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="editor-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--note-color' as string]: color === '#ffffff' ? undefined : color }}
      >
        <div className="editor-head">
          <input
            className="editor-title"
            placeholder="Заголовок"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="editor-head-actions">
            <span className={`save-status ${saved ? 'ok' : ''}`}>{saved ? 'Сохранено' : 'Сохраняется…'}</span>
            <button
              className={`icon-btn ${note.favorite ? 'starred' : ''}`}
              title="Избранное"
              onClick={() => toggleFavorite(note.id)}
            >
              <Star size={17} fill={note.favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              className={`icon-btn ${note.pinned ? 'pinned-icon' : ''}`}
              title="Закрепить"
              onClick={() => togglePin(note.id)}
            >
              <Pin size={17} />
            </button>
            <button
              className="icon-btn"
              title="Экспорт в Markdown"
              onClick={() => {
                exportMarkdown({ ...note, title, content, tags: allTags, folderId, color }, folders);
                showToast('Markdown экспортирован');
              }}
            >
              <Download size={17} />
            </button>
            <button
              className="icon-btn"
              title="Экспорт в TXT"
              onClick={() => {
                exportText({ ...note, title, content, tags: allTags, folderId, color }, folders);
                showToast('TXT экспортирован');
              }}
            >
              <FileText size={17} />
            </button>
            <button
              className="icon-btn"
              title={note.archived ? 'Вернуть из архива' : 'В архив'}
              onClick={() => toggleArchived(note.id)}
            >
              {note.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
            </button>
            <button className="icon-btn" title="Закрыть" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="editor-body">
          {highlightTags && (
            <div className="editor-highlight" ref={overlayRef}>
              {splitByTags(content + '\n').map((seg, i) =>
                seg.tag ? (
                  <span
                    key={i}
                    className="tag-inline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTagClick(seg.tag as string);
                    }}
                    title={`Перейти к тегу #${seg.tag}`}
                  >
                    {seg.text}
                  </span>
                ) : (
                  <React.Fragment key={i}>{seg.text}</React.Fragment>
                )
              )}
            </div>
          )}
          <textarea
            ref={textareaRef}
            className={`editor-content ${highlightTags ? 'highlighted' : ''}`}
            placeholder="Текст заметки… (#теги подхватываются автоматически)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={(e) => syncScroll(e.currentTarget)}
          />
        </div>

        <div className="editor-props">
          <div className="prop-group">
            <label className="prop-label"><FolderIcon size={14} /> Папка</label>
            <select
              className="prop-select"
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">Без папки</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="prop-group">
            <label className="prop-label">Цвет</label>
            <div className="color-palette">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-btn ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="prop-group grow">
            <label className="prop-label">Теги</label>
            <div className="tag-editor">
              {allTags.map((t) => (
                <span key={t} className="tag-chip">
                  #{t}
                  <button
                    className="tag-remove"
                    onClick={() => {
                      if (isAutoTag(t)) {
                        showToast('Тег из текста удаляется вместе с #хэштегом');
                      } else {
                        setManualTags(manualTags.filter((x) => x !== t));
                      }
                    }}
                    aria-label={`Удалить тег ${t}`}
                    title={isAutoTag(t) ? 'Автотег из текста' : 'Удалить ручной тег'}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="tag-input"
                placeholder="+ тег"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addManualTag();
                  }
                  if (e.key === 'Backspace' && !tagInput && manualTags.length) {
                    setManualTags(manualTags.slice(0, -1));
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="editor-foot">
          <span className="editor-meta">
            Создана: {new Date(note.createdAt).toLocaleString('ru-RU')}
          </span>
          <span className="editor-counter" title="Слов / символов">
            {countWords(content)} сл · {countChars(content)} симв
          </span>
          <button
            className={`ghost-btn ${highlightTags ? 'active' : ''}`}
            onClick={() => setHighlightTags((v) => !v)}
            title="Подсветить хэштеги в тексте"
          >
            <Hash size={14} /> {highlightTags ? 'Подсветка вкл' : 'Подсветка выкл'}
          </button>
          <button
            className="danger-btn"
            onClick={() => {
              softDelete(note.id);
              onClose();
            }}
          >
            <Trash2 size={15} /> Удалить
          </button>
        </div>
      </div>
    </div>
  );
};
