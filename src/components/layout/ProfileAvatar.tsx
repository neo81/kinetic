import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const ProfileAvatar = ({ avatarUrl }: { avatarUrl?: string | null }) => {
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  if (!avatarUrl || hasError) {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
        <User aria-hidden="true" className="h-[55%] w-[55%] text-on-surface-variant" strokeWidth={1.7} />
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={t('header.profilePhoto')}
      className="block h-full w-full rounded-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
};
