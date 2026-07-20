import { Button as BaseButton } from '@base-ui/react/button';
import styles from './index.module.css';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'secondary-destructive' | 'secondary-destructive-ghost' | 'link';

type ButtonBaseProps = React.ComponentPropsWithoutRef<typeof BaseButton> & {
  variant?: Variant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Invert colors for dark surfaces (pairs with `variant="ghost"`). */
  inverse?: boolean;
};

/* When `iconOnly` is set there is no visible text, so an accessible name is
   required. Enforce it at compile time via `aria-label` or `aria-labelledby`. */
type ButtonProps = ButtonBaseProps &
  (
    | { iconOnly?: false }
    | { iconOnly: true; 'aria-label': string }
    | { iconOnly: true; 'aria-labelledby': string }
  );

export default function Button({ variant = 'primary', leftIcon, rightIcon, iconOnly = false, inverse = false, children, className, ...props }: ButtonProps) {
  return (
    <BaseButton
      {...props}
      className={[styles.Button, styles[variant], iconOnly ? styles.iconOnly : '', inverse ? styles.inverse : '', className].filter(Boolean).join(' ')}
    >
      {iconOnly ? (
        leftIcon ?? rightIcon ?? children
      ) : (
        <>
          {leftIcon}
          <span className={styles.Label}>{children}</span>
          {rightIcon}
        </>
      )}
    </BaseButton>
  );
}
