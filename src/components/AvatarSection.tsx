import { User, Edit2, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import type { UserProfile } from '../types';

interface AvatarSectionProps {
  profile: UserProfile | null;
  isEditing?: boolean;
  onEditClick?: () => void;
  onUploadClick?: () => void;
}

export const AvatarSection = ({
  profile,
  isEditing = false,
  onEditClick,
  onUploadClick,
}: AvatarSectionProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="h-32 w-32 rounded-full bg-[conic-gradient(from_210deg,#ff7439,#d1fc00,#ff7439)] p-1 shadow-[0_0_30px_rgba(209,252,0,0.16)]">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-on-surface overflow-hidden">
            {profile?.avatarUrl ? (
              <motion.img
                src={profile.avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <User size={44} strokeWidth={1.8} />
            )}
          </div>
        </div>

        {isEditing && (
          <motion.button
            type="button"
            onClick={onUploadClick}
            className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-black shadow-xl transition-all hover:scale-110 active:scale-95"
            title="Cambiar avatar"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Edit2 size={16} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      <p className="mt-4 text-[0.75rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
        {profile?.avatarUrl ? 'Avatar sincronizado con tu cuenta' : 'Sin avatar personalizado'}
      </p>
    </div>
  );
};
