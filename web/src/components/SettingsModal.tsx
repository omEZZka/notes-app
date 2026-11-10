import React, { useRef } from 'react';
import { Download, FileText, Upload, X, Star, Pin, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { Layout, SortBy, SortDir, ThemeMode } from '../types';
import { exportJson, exportAllText, parseImportJson } from '../lib/export';

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, updateSettings, notes, folders, importData, importSettings, showToast, filters, setFilters, resetFilters } =
    useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    const raw = await file.text();
    const result = parseImportJson(raw);
    if (result.errors.length) {
      showToast(result.errors[0]);
      return;
    }
    if (!result.notes.length && !result.folders.length && !result.settings) {
      showToast('В файле нет заметок');
      return;
    }
    if (result.notes.length || result.folders.length) {
      importData(result.notes, result.folders);
    }
    if (result.settings) {
      importSettings(result.settings);
    }
    const parts: string[] = [];
    if (result.notes.length || result.folders.length) {
      parts.push(`Импортировано: ${result.notes.length} заметок, ${result.folders.length} папок`);
    }
    if (result.settings) parts.push('Настройки применены');
    showToast(parts.join(' · ') || 'Импорт завершён');
  };

  const setAutosave = (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    updateSettings({ autosaveDelayMs: Math.min(10000, Math.max(100, Math.round(n))) });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Настройки</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="settings-field">
            <label>Тема</label>
            <div className="segmented">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  className={`segment ${settings.theme === t ? 'active' : ''}`}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {t === 'light' ? 'Светлая' : t === 'dark' ? 'Тёмная' : 'Системная'}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <label>Вид списка</label>
            <div className="segmented">
              {(['grid', 'list'] as Layout[]).map((l) => (
                <button
                  key={l}
                  className={`segment ${settings.layout === l ? 'active' : ''}`}
                  onClick={() => updateSettings({ layout: l })}
                >
                  {l === 'grid' ? 'Плитка' : 'Список'}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <label>Сортировка</label>
            <div className="settings-row">
              <select
                className="prop-select"
                value={settings.sortBy}
                onChange={(e) => updateSettings({ sortBy: e.target.value as SortBy })}
              >
                <option value="updatedAt">По обновлению</option>
                <option value="createdAt">По созданию</option>
                <option value="title">По заголовку</option>
                <option value="words">По количеству слов</option>
              </select>
              <button
                className="ghost-btn"
                onClick={() => updateSettings({ sortDir: settings.sortDir === 'asc' ? 'desc' : 'asc' as SortDir })}
              >
                {settings.sortDir === 'asc' ? '↑ По возрастанию' : '↓ По убыванию'}
              </button>
            </div>
          </div>

          <div className="settings-field">
            <label>Фильтры по умолчанию</label>
            <div className="settings-row wrap">
              <button
                className={`ghost-btn ${filters.favoritesOnly ? 'active' : ''}`}
                onClick={() => setFilters({ favoritesOnly: !filters.favoritesOnly })}
              >
                <Star size={14} /> Только избранные
              </button>
              <button
                className={`ghost-btn ${filters.pinnedOnly ? 'active' : ''}`}
                onClick={() => setFilters({ pinnedOnly: !filters.pinnedOnly })}
              >
                <Pin size={14} /> Только закреплённые
              </button>
              <button className="ghost-btn" onClick={resetFilters}>
                <RotateCcw size={14} /> Сбросить
              </button>
            </div>
            <div className="settings-hint">Фильтры применяются к текущему списку и видны чипами в тулбаре.</div>
          </div>

          <div className="settings-field">
            <label>Автосохранение</label>
            <div className="settings-row">
              <input
                className="prop-input"
                type="number"
                min={100}
                max={10000}
                step={100}
                value={settings.autosaveDelayMs}
                onChange={(e) => setAutosave(e.target.value)}
              />
              <span className="settings-hint">мс — задержка перед сохранением правки</span>
            </div>
          </div>

          <div className="settings-field">
            <label>Данные</label>
            <div className="settings-row wrap">
              <button
                className="primary-btn"
                onClick={() => {
                  exportJson(notes, folders, settings);
                  showToast('JSON-бэкап экспортирован');
                }}
              >
                <Download size={15} /> Экспорт JSON
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  exportAllText(notes, folders);
                  showToast('TXT экспортирован');
                }}
              >
                <FileText size={15} /> Экспорт TXT
              </button>
              <button className="primary-btn" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> Импорт JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
