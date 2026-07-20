import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import styles from './index.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: AvatarSize;
  alt?: string;
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeClass: Record<AvatarSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export function Avatar({ src, name, size = 'md', alt, className }: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={[styles.Root, sizeClass[size], className].filter(Boolean).join(' ')}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt={alt ?? name ?? ''}
          className={styles.Image}
        />
      )}
      <BaseAvatar.Fallback className={styles.Fallback}>
        {getInitials(name)}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
