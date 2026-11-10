import React, { useMemo } from 'react';
import { BarChart3, X } from 'lucide-react';
import { useStore } from '../store';
import { computeStats } from '../lib/stats';
import { formatCount } from '../lib/text';

export const StatsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notes, folders } = useStore();
  const stats = useMemo(() => computeStats(notes, folders), [notes, folders]);
  const maxFolder = stats.byFolder[0]?.count ?? 1;
  const maxTag = stats.byTag[0]?.count ?? 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2><BarChart3 size={18} className="inline-icon" /> Статистика</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="stats-cards">
            <div className="stat-card"><span className="stat-num">{formatCount(stats.total)}</span><span>всего</span></div>
            <div className="stat-card"><span className="stat-num">{formatCount(stats.favorites)}</span><span>избранных</span></div>
            <div className="stat-card"><span className="stat-num">{formatCount(stats.pinned)}</span><span>закреплено</span></div>
            <div className="stat-card"><span className="stat-num">{formatCount(stats.thisWeek)}</span><span>за неделю</span></div>
            <div className="stat-card"><span className="stat-num">{formatCount(stats.words)}</span><span>слов</span></div>
            <div className="stat-card"><span className="stat-num">{formatCount(stats.trashed)}</span><span>в корзине</span></div>
          </div>

          <h3 className="stats-section-title">По папкам</h3>
          {stats.byFolder.length === 0 && <p className="sidebar-hint">Нет данных</p>}
          {stats.byFolder.map((f) => (
            <div key={f.name} className="bar-row">
              <span className="bar-label">{f.name}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(f.count / maxFolder) * 100}%`, background: f.color }} />
              </div>
              <span className="bar-value">{f.count}</span>
            </div>
          ))}

          <h3 className="stats-section-title">По тегам</h3>
          {stats.byTag.length === 0 && <p className="sidebar-hint">Нет тегов</p>}
          {stats.byTag.slice(0, 10).map((t) => (
            <div key={t.tag} className="bar-row">
              <span className="bar-label">#{t.tag}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(t.count / maxTag) * 100}%` }} />
              </div>
              <span className="bar-value">{t.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
