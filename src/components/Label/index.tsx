import styles from './index.module.css';

export type LabelSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LabelProps {
  size?: LabelSize;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

const sizeClass: Record<LabelSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

export function Label({ size = 'md', required, children, htmlFor, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={[styles.Label, sizeClass[size], className].filter(Boolean).join(' ')}
    >
      <span className={styles.Text}>
        {children}
        {required && <span className={styles.Required} aria-hidden="true"> *</span>}
      </span>
      <span className={styles.Colon} aria-hidden="true">:</span>
    </label>
  );
}
