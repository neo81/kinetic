import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, X } from 'lucide-react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
};

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm rounded-[2rem] border border-white/10 bg-surface-container-low p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start gap-4">
              <div className={`flex shrink-0 h-12 w-12 items-center justify-center rounded-2xl ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                {variant === 'danger' ? <Trash2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <h3 className="font-headline text-xl font-bold uppercase italic leading-tight text-on-surface pb-1">{title}</h3>
            </div>
            
            <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
              {message}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl bg-surface-container-highest py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-white/10 active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 rounded-xl py-3 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  variant === 'danger' 
                  ? 'bg-red-500 text-white shadow-red-500/20'
                  : 'bg-primary text-black shadow-primary/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
