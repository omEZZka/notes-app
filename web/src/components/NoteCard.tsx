import React from 'react';
import { Archive, ArchiveRestore, Download, FileText, Pin, RotateCcw, Star, Trash2 } from 'lucide-react';
import { Note } from '../types';
import { useStore } from '../store';
import { highlight } from '../lib/search';
import { exportMarkdown, exportText } from '../lib/export';
import { splitByTags } from '../lib/tags';
import { countChars, countWords } from '../lib/text';

const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {highlight(text, query).map((seg, i) =>
      seg.hit ? (
        <mark key={i}>{seg.part}</mark>
      ) : (
        <React.Fragment key={i}>{seg.part}</React.Fragment>
      )
    )}
  </>
);

/** Текст с подсвеченными хэштегами (#тег → span.tag-inline). */
const TaggedText: React.FC<{ text: string; query: string; onTagClick: (tag: string) => void }> = ({
  text,
  query,
  onTagClick,
}) => {
  const segments = splitByTags(text);
  return (
    <>
      {segments.map((seg, i) => {
        const inner = seg.tag
          ? (
            <span
              className="tag-inline"
              role="button"
              tabIndex={0}
              title={`Перейти к тегу #${seg.tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(seg.tag as string);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(seg.tag as string);
                }
              }}
            >
              {seg.text}
            </span>
          )
          : (
            <Highlighted text={seg.text} query={query} />
          );
        return <React.Fragment key={i}>{inner}</React.Fragment>;
      })}
    </>
  );
};

export const NoteCard: React.FC<{
  note: Note;
  query: string;
  onOpen: () => void;
}> = ({ note, query, onOpen }) => {
  const { folders, toggleFavorite, togglePin, toggleArchived, softDelete, restore, purge, showToast, setSection } =
    useStore();
  const folder = folders.find((f) => f.id === note.folderId);
  const inTrash = note.deletedAt !== null;
  const snippet = note.content.slice(0, 180);
  const words = countWords(note.content);
  const chars = countChars(note.content);

  const goToTag = (tag: string) => {
    setSection({ kind: 'tag', tag });
  };

  return (
    <div
      className={`note-card ${note.pinned ? 'pinned' : ''} ${inTrash ? 'in-trash' : ''}`}
      style={{ ['--note-color' as string]: note.color === '#ffffff' ? undefined : note.color }}
      onClick={() => !inTrash && onOpen()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !inTrash && onOpen()}
    >
      <div className="note-card-head">
        {note.pinned && <Pin size={14} className="note-pin-badge" />}
        <h3 className="note-card-title">
          <Highlighted text={note.title || 'Без заголовка'} query={query} />
        </h3>
        <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
          {inTrash ? (
            <>
              <button className="icon-btn tiny" title="Восстановить" onClick={() => restore(note.id)}>
                <RotateCcw size={14} />
              </button>
              <button
                className="icon-btn tiny danger"
                title="Удалить навсегда"
                onClick={() => {
                  purge(note.id);
                  showToast('Заметка удалена навсегда');
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                className="icon-btn tiny"
                title="Экспорт в Markdown"
                onClick={() => {
                  exportMarkdown(note, folders);
                  showToast('Markdown экспортирован');
                }}
              >
                <Download size={14} />
              </button>
              <button
                className="icon-btn tiny"
                title="Экспорт в TXT"
                onClick={() => {
                  exportText(note, folders);
                  showToast('TXT экспортирован');
                }}
              >
                <FileText size={14} />
              </button>
              <button
                className="icon-btn tiny"
                title={note.archived ? 'Вернуть из архива' : 'В архив'}
                onClick={() => toggleArchived(note.id)}
              >
                {note.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              </button>
              <button
                className={`icon-btn tiny ${note.favorite ? 'starred' : ''}`}
                title={note.favorite ? 'Убрать из избранного' : 'В избранное'}
                onClick={() => toggleFavorite(note.id)}
              >
                <Star size={14} fill={note.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                className={`icon-btn tiny ${note.pinned ? 'pinned-icon' : ''}`}
                title={note.pinned ? 'Открепить' : 'Закрепить'}
                onClick={() => togglePin(note.id)}
              >
                <Pin size={14} />
              </button>
              <button className="icon-btn tiny danger" title="Удалить" onClick={() => softDelete(note.id)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <p className="note-card-content">
        <TaggedText text={snippet} query={query} onTagClick={goToTag} />
        {note.content.length > 180 ? '…' : ''}
      </p>

      <div className="note-card-foot">
        {folder && (
          <span className="folder-badge">
            <span className="folder-dot" style={{ background: folder.color }} /> {folder.name}
          </span>
        )}
        {note.tags.slice(0, 4).map((t) => (
          <button
            key={t}
            className="tag-chip small tag-clickable"
            onClick={(e) => {
              e.stopPropagation();
              goToTag(t);
            }}
            title={`Перейти к тегу #${t}`}
          >
            #{t}
          </button>
        ))}
        <span className="note-card-stats" title="Слов / символов">
          {words} сл · {chars} симв
        </span>
        <span className="note-card-date">{new Date(note.updatedAt).toLocaleDateString('ru-RU')}</span>
      </div>
    </div>
  );
};
