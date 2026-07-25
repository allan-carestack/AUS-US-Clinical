import { forwardRef } from 'react';
import styles from './index.module.css';

export type TagVariant = 'dot' | 'fill' | 'semi' | 'outline';
export type TagColor = 'green' | 'red' | 'orange' | 'blue' | 'teal' | 'grey' | 'brown' | 'gold' | 'olive' | 'turquoise' | 'purple' | 'pink';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  color?: TagColor;
  children: React.ReactNode;
  className?: string;
}

const colorClass: Record<TagColor, string> = {
  green:      styles.colorGreen,
  red:        styles.colorRed,
  orange:     styles.colorOrange,
  blue:       styles.colorBlue,
  teal:       styles.colorTeal,
  grey:       styles.colorGrey,
  brown:      styles.colorBrown,
  gold:       styles.colorGold,
  olive:      styles.colorOlive,
  turquoise:  styles.colorTurquoise,
  purple:     styles.colorPurple,
  pink:       styles.colorPink,
};

const variantClass: Record<TagVariant, string> = {
  dot:     styles.variantDot,
  fill:    styles.variantFill,
  semi:    styles.variantSemi,
  outline: styles.variantOutline,
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { variant = 'semi', color = 'grey', children, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={[styles.Tag, colorClass[color], variantClass[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {variant === 'dot' && <span className={styles.Dot} aria-hidden="true" />}
      {children}
    </span>
  );
});
