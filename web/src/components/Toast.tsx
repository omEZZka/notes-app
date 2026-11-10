import React, { useEffect, useRef } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useStore } from '../store';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(clearToast, toast.undo ? 6000 : 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="toast" role="status" key={toast.message}>
      <CheckCircle2 size={16} className="toast-icon" />
      <span className="toast-text">{toast.message}</span>
      {toast.undo && (
        <button
          className="toast-undo"
          onClick={() => {
            toast.undo?.();
            clearToast();
          }}
        >
          <RotateCcw size={13} /> Отменить
        </button>
      )}
    </div>
  );
};
