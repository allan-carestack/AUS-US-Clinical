import styles from './index.module.css';

/** A keyboard key hint. */
export function Kbd({ children, inverse }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <kbd
      className={[styles.Kbd, inverse ? styles.Inverse : ''].filter(Boolean).join(' ')}
      data-wide={typeof children === 'string' && children.length > 1 ? '' : undefined}
    >
      {children}
    </kbd>
  );
}

/** Keys that are pressed together or in a row, 1px apart. */
export function KbdGroup({ children }: { children: React.ReactNode }) {
  return <span className={styles.Group}>{children}</span>;
}
