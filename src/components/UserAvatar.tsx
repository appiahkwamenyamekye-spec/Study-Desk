import { useEffect, useState } from 'react';

interface UserAvatarProps {
  name: string;
  photoURL?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-base',
};

/**
 * Displays a user's Google profile picture with `referrerPolicy="no-referrer"`
 * and falls back gracefully to clean initials if the photo URL is missing or fails to load.
 */
export function UserAvatar({ name, photoURL, size = 'sm', className = '' }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoURL]);

  const trimmed = (name || 'Student').trim();
  const initials = trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClass = SIZE_CLASSES[size];

  if (photoURL && !hasError) {
    return (
      <img
        src={photoURL}
        alt={trimmed}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 ring-2 ring-slate-100 shrink-0 bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={trimmed}
      className={`${sizeClass} rounded-full bg-blue-50 border border-blue-200 ring-2 ring-slate-100 flex items-center justify-center font-semibold text-blue-700 shrink-0 ${className}`}
    >
      {initials || 'S'}
    </div>
  );
}
