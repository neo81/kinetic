import { useState, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, AlertCircle, Loader, ZoomIn, ZoomOut } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLanguage } from '../i18n/LanguageContext';

interface AvatarUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<string>;
  isLoading?: boolean;
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

export const AvatarUploadDialog = ({
  isOpen,
  onClose,
  onUpload,
  isLoading = false,
}: AvatarUploadDialogProps) => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [state, setState] = useState<UploadState>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [scale, setScale] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError(t('avatar.selectValid'));
      setState('error');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('avatar.maxSize'));
      setState('error');
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setSelectedFile(file);
      setError('');
      setState('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setState('uploading');
    try {
      await onUpload(selectedFile);
      setState('success');
      setTimeout(() => {
        onClose();
        setState('idle');
        setPreview(null);
        setSelectedFile(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('avatar.uploadError'));
      setState('error');
    }
  };

  const handleClose = () => {
    if (state !== 'uploading') {
      onClose();
      setState('idle');
      setPreview(null);
      setSelectedFile(null);
      setError('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="theme-overlay fixed inset-0 z-[100] backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2"
          >
            <div className="theme-elevated-surface rounded-2xl p-6 backdrop-blur-xl">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface">
                  {t('avatar.change')}
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={state === 'uploading'}
                  aria-label={t('common.close')}
                  className="liquid-glass-context-button relative flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-[color,transform] hover:text-on-surface active:scale-95 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              {state === 'idle' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-12 transition-colors hover:border-primary/60 hover:bg-primary/10 cursor-pointer"
                  >
                    <Upload size={32} className="mb-3 text-primary" />
                    <p className="text-sm font-semibold text-on-surface">
                      {t('avatar.dragOrSelect')}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {t('avatar.fileHint')}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label={t('avatar.selectImage')}
                  />
                </div>
              )}

              {state === 'preview' && preview && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="theme-dialog-preview relative h-48 w-48 overflow-hidden rounded-full border-4 border-primary/30">
                      <img
                        src={preview}
                        alt={t('avatar.preview')}
                        className="h-full w-full object-cover"
                        style={{ transform: `scale(${scale})` }}
                      />
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                      disabled={scale <= 0.5}
                      className="theme-hairline-border theme-interactive-hover flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
                      title={t('avatar.zoomOut')}
                    >
                      <ZoomOut size={16} />
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <button
                      onClick={() => setScale(Math.min(3, scale + 0.1))}
                      disabled={scale >= 3}
                      className="theme-hairline-border theme-interactive-hover flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-30"
                      title={t('avatar.zoomIn')}
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>

                  <p className="text-center text-xs text-on-surface-variant">
                    {selectedFile?.name} • {(scale * 100).toFixed(0)}%
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setScale(1);
                        fileInputRef.current?.click();
                      }}
                      disabled={isLoading}
                      className="theme-hairline-border theme-interactive-hover flex-1 rounded-lg border bg-transparent py-2.5 text-sm font-bold uppercase tracking-wider text-on-surface transition-colors disabled:opacity-50"
                    >
                      {t('avatar.replace')}
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg transition-all hover:shadow-[0_0_24px_rgba(209,252,0,0.24)] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          {t('avatar.uploading')}
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          {t('common.confirm')}
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label={t('avatar.selectImage')}
                  />
                </div>
              )}

              {state === 'uploading' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader size={32} className="mb-4 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-on-surface">{t('avatar.uploadingAvatar')}</p>
                </div>
              )}

              {state === 'success' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                    <Check size={24} className="text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{t('avatar.updated')}</p>
                </div>
              )}

              {state === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                    <AlertCircle size={20} className="text-red-400" />
                    <p className="text-sm font-semibold text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={() => setState('idle')}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:shadow-[0_0_24px_rgba(209,252,0,0.24)] active:scale-95"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
